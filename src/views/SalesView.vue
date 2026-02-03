<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import axios from 'axios'

// --- CONFIG & STATE ---
const API_URL = "https://api.inventorycafe.space"
const activeTab = ref('manual') 
const menus = ref([])
const cart = ref([])
const searchQuery = ref("")
const isProcessing = ref(false)
const customerName = ref("")
const discountPercent = ref(0)
const paymentMethod = ref('cash')
const cashAmount = ref(0) 

// --- STATE KAMERA & AI SCAN ---
const videoRef = ref(null)
const canvasRef = ref(null)
const isCameraOpen = ref(false)
const scanPreview = ref(null)
const scanBlob = ref(null)
const isScanning = ref(false)

// --- DATA FETCHING ---
const fetchMenus = async () => {
    try {
        const res = await axios.get(`${API_URL}/menu/`)
        menus.value = res.data
    } catch (e) { console.error("Gagal sinkronisasi menu") }
}

// --- CAMERA LOGIC ---
const startCamera = async () => {
    isCameraOpen.value = true
    scanPreview.value = null
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (videoRef.value) videoRef.value.srcObject = stream
    } catch (err) { 
        alert("Kamera gagal: " + err.message)
        isCameraOpen.value = false 
    }
}

const stopCamera = () => {
    if (videoRef.value?.srcObject) {
        videoRef.value.srcObject.getTracks().forEach(track => track.stop())
        videoRef.value.srcObject = null
    }
    isCameraOpen.value = false
}

const takePhoto = () => {
    const context = canvasRef.value.getContext('2d')
    canvasRef.value.width = videoRef.value.videoWidth
    canvasRef.value.height = videoRef.value.videoHeight
    context.drawImage(videoRef.value, 0, 0)
    canvasRef.value.toBlob((blob) => {
        scanBlob.value = blob
        scanPreview.value = URL.createObjectURL(blob)
        stopCamera()
    }, 'image/jpeg', 0.8)
}

const processScan = async () => {
    if(!scanBlob.value) return
    isScanning.value = true
    try {
        const formData = new FormData()
        formData.append('file', scanBlob.value, 'scan.jpg')
        const res = await axios.post(`${API_URL}/sales/scan-image`, formData)
        res.data.forEach(item => {
            addToCart({ id: item.menu_id, name: item.name, price: item.price, qty: item.qty, note: item.note })
        })
        scanPreview.value = null
        activeTab.value = 'manual'
    } catch (e) { alert("AI gagal membaca gambar.") } 
    finally { isScanning.value = false }
}

// --- CART LOGIC ---
const addToCart = (menu) => {
    const mid = menu.id || menu.menu_id
    const item = cart.value.find(i => i.menu_id === mid)
    if (item) {
        item.qty += (menu.qty || 1)
    } else {
        cart.value.push({ menu_id: mid, name: menu.name, price: menu.price, qty: menu.qty || 1, note: menu.note || "" })
    }
}

// --- SMART CALCULATIONS ---
const cartTotal = computed(() => cart.value.reduce((t, i) => t + (i.price * i.qty), 0))
const discountAmount = computed(() => (discountPercent.value / 100) * cartTotal.value)
const finalTotal = computed(() => cartTotal.value - discountAmount.value)

// Smart Auto-Sync Cash (Penting untuk efisiensi)
watch(finalTotal, (newVal) => {
    if (paymentMethod.value === 'cash') cashAmount.value = newVal
}, { immediate: true })

const changeAmount = computed(() => cashAmount.value >= finalTotal.value ? cashAmount.value - finalTotal.value : 0)

const cashShortcuts = computed(() => {
    const total = finalTotal.value
    const suggestions = [total] 
    const common = [20000, 50000, 100000]
    common.forEach(val => { if (val > total) suggestions.push(val) })
    return [...new Set(suggestions)].sort((a,b) => a - b)
})

// --- ACTIONS ---
const checkout = async () => {
    if (paymentMethod.value === 'cash' && cashAmount.value < finalTotal.value) return alert("Uang kurang!")
    isProcessing.value = true
    try {
        const payload = {
            customer_name: customerName.value || "Guest",
            payment_method: paymentMethod.value.toUpperCase(),
            items: cart.value.map(i => ({ menu_item_id: i.menu_id, quantity: i.qty, note: i.note }))
        }
        await axios.post(`${API_URL}/sales/`, payload)
        alert("✅ Berhasil!")
        resetPOS()
    } catch (e) { alert("❌ Gagal Checkout") } 
    finally { isProcessing.value = false }
}

const saveAsDebt = async () => {
    if (!customerName.value) return alert("Nama pelanggan wajib!")
    isProcessing.value = true
    try {
        const payload = {
            customer_name: customerName.value,
            items: cart.value.map(item => ({ menu_item_id: item.menu_id, menu_name: item.name, quantity: item.qty, price_at_moment: item.price, note: item.note || "" }))
        }
        await axios.post(`${API_URL}/debts/`, payload)
        alert("📝 Hutang dicatat!")
        resetPOS()
    } catch (e) { alert("❌ Gagal") }
    finally { isProcessing.value = false }
}

const resetPOS = () => {
    cart.value = []; customerName.value = ""; cashAmount.value = 0; discountPercent.value = 0
}

onMounted(fetchMenus)
onUnmounted(stopCamera)
</script>

<template>
  <div class="pos-screen p-4">
    <div class="row g-4 main-layout">
        <div class="col-lg-8 d-flex flex-column h-100">
            <div class="elegant-card flex-grow-1 d-flex flex-column shadow-sm border-0">
                <header class="p-4 d-flex justify-content-between align-items-center bg-white border-bottom">
                    <div>
                        <h2 class="fw-bold m-0 text-dark">Degentong <span class="text-sage">POS</span> 🌿</h2>
                        <p class="text-muted extra-small m-0 uppercase-spaced fw-800">Operational Dashboard</p>
                    </div>
                    
                    <div class="tab-pill-box shadow-xs">
                        <button :class="{ active: activeTab === 'manual' }" @click="activeTab = 'manual'; stopCamera()">
                            <i class="fa-solid fa-utensils me-2"></i>Menu
                        </button>
                        <button :class="{ active: activeTab === 'scan' }" @click="activeTab = 'scan'; startCamera()">
                            <i class="fa-solid fa-qrcode me-2"></i>AI Scan
                        </button>
                    </div>
                </header>

                <div class="content-viewport flex-grow-1 p-4 custom-scroll">
                    <div v-if="activeTab === 'manual'" class="animate-fade">
                        <div class="search-input-group mb-4 shadow-xs">
                            <div class="icon-wrap"><i class="fas fa-search text-sage"></i></div>
                            <input v-model="searchQuery" class="search-input" placeholder="Cari menu...">
                        </div>
                        <div class="row g-3">
                            <div v-for="menu in menus.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))" :key="menu.id" class="col-md-4 col-sm-6">
                                <div class="product-item shadow-sm" @click="addToCart(menu)">
                                    <span class="price-pill shadow-xs">Rp {{ menu.price.toLocaleString() }}</span>
                                    <h6 class="fw-bold m-0 text-truncate pe-4">{{ menu.name }}</h6>
                                    <p class="text-muted extra-small m-0 uppercase-spaced">{{ menu.division }}</p>
                                    <div class="add-indicator"><i class="fa-solid fa-plus"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="activeTab === 'scan'" class="animate-fade h-100 d-flex flex-column align-items-center justify-content-center">
                        <div class="camera-container shadow-lg border-0 mb-4">
                            <video v-show="isCameraOpen && !scanPreview" ref="videoRef" autoplay playsinline class="camera-stream"></video>
                            <img v-if="scanPreview" :src="scanPreview" class="camera-stream">
                            <canvas ref="canvasRef" style="display: none;"></canvas>
                            <div v-if="isScanning" class="scan-overlay">
                                <div class="scan-line"></div>
                                <span class="mt-3 fw-bold text-white uppercase-spaced">AI Processing...</span>
                            </div>
                        </div>
                        <div class="d-flex gap-3">
                            <button v-if="isCameraOpen" class="btn-checkout px-5 shadow-lg" @click="takePhoto">AMBIL FOTO</button>
                            <button v-if="scanPreview" class="btn-debt px-4" @click="startCamera">ULANG</button>
                            <button v-if="scanPreview" class="btn-checkout px-5 shadow-lg" @click="processScan" :disabled="isScanning">PROSES AI</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-lg-4 d-flex flex-column h-100">
            <div class="elegant-card cart-panel shadow-lg flex-grow-1 d-flex flex-column border-0">
                <div class="p-4 border-bottom bg-white">
                    <h5 class="fw-bold mb-3 text-dark">Rincian Pesanan</h5>
                    <div class="customer-input-group shadow-xs">
                        <div class="icon-wrap"><i class="fa-solid fa-circle-user text-sage"></i></div>
                        <input v-model="customerName" class="customer-input" placeholder="Nama Pelanggan...">
                    </div>
                </div>

                <div class="cart-scroll-area flex-grow-1 custom-scroll p-3">
                    <div v-for="(item, idx) in cart" :key="item.menu_id" class="cart-item-clean mb-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1 pe-2">
                                <p class="m-0 fw-bold text-dark small">{{ item.name }}</p>
                                <span class="text-sage small fw-bold">Rp {{ (item.price * item.qty).toLocaleString() }}</span>
                            </div>
                            <div class="qty-stepper shadow-sm border-0 bg-sage-soft">
                                <button @click="item.qty > 1 ? item.qty-- : cart.splice(idx,1)">-</button>
                                <span>{{ item.qty }}</span>
                                <button @click="item.qty++">+</button>
                            </div>
                        </div>
                        <div class="note-container-elegant mt-2 shadow-xs">
                            <i class="fas fa-quote-left quote-icon"></i>
                            <input v-model="item.note" placeholder="Catatan khusus..." class="note-input-field">
                        </div>
                    </div>
                </div>

                <div class="payment-box p-4 bg-light-sage rounded-top-40 shadow-top">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="text-muted extra-small fw-bold uppercase-spaced">Diskon (%)</span>
                        <input v-model.number="discountPercent" type="number" class="disc-input shadow-sm border-0" min="0" max="100">
                    </div>
                    
                    <div class="total-row d-flex justify-content-between align-items-end mb-4">
                        <span class="text-muted fw-bold">TOTAL</span>
                        <h2 class="m-0 fw-black text-dark-green ls-tight">Rp {{ finalTotal.toLocaleString() }}</h2>
                    </div>

                    <div class="payment-toggle mb-3 shadow-sm p-1 bg-white rounded-pill">
                        <button :class="{active: paymentMethod === 'cash'}" @click="paymentMethod = 'cash'">TUNAI</button>
                        <button :class="{active: paymentMethod === 'qris'}" @click="paymentMethod = 'qris'">QRIS</button>
                    </div>

                    <div v-if="paymentMethod === 'cash'" class="cash-ui animate-fade">
                        <div class="shortcut-row mb-3">
                            <button v-for="amt in cashShortcuts" :key="amt" @click="cashAmount = amt" class="btn-amt shadow-sm border-0">
                                {{ amt === finalTotal ? 'Pas' : (amt/1000) + 'k' }}
                            </button>
                        </div>
                        <div class="input-pay-wrap shadow-sm bg-white border-0">
                            <span class="currency text-sage">Rp</span>
                            <input v-model.number="cashAmount" type="number" class="input-pay text-dark-green" placeholder="0">
                        </div>
                        <div class="d-flex justify-content-between mt-3 px-2">
                            <span class="fw-bold text-muted extra-small uppercase-spaced">KEMBALIAN</span>
                            <span class="fw-black text-sage">Rp {{ changeAmount.toLocaleString() }}</span>
                        </div>
                    </div>

                    <div class="d-flex gap-2 mt-4">
                        <button class="btn-debt flex-grow-1 border-0 shadow-sm" @click="saveAsDebt" :disabled="isProcessing || cart.length === 0">HUTANG</button>
                        <button class="btn-checkout flex-grow-2 shadow-lg border-0" @click="checkout" :disabled="isProcessing || cart.length === 0">
                            <i v-if="isProcessing" class="fas fa-circle-notch fa-spin me-2"></i> BAYAR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* --- LAYOUT CONFIG --- */
.pos-screen { height: 100vh; overflow: hidden; background: #f8fafc; font-family: 'Plus Jakarta Sans', sans-serif; }
.main-layout { height: calc(100vh - 40px); }
.text-sage { color: #84a548; }
.bg-sage-soft { background: #f7fee7; }
.text-dark-green { color: #1a2e24; }
.fw-black { font-weight: 800; }
.ls-tight { letter-spacing: -1px; }
.uppercase-spaced { text-transform: uppercase; letter-spacing: 1.5px; font-size: 0.65rem; }
.extra-small { font-size: 0.6rem; }

/* --- CONTAINERS --- */
.elegant-card { background: white; border-radius: 40px; overflow: hidden; }
.rounded-top-40 { border-radius: 40px 40px 0 0; }
.custom-scroll { overflow-y: auto; scrollbar-width: none; }
.custom-scroll::-webkit-scrollbar { display: none; }

/* 💊 FIXED TAB PILL BOX CSS */
.tab-pill-box {
    background: #f1f5f9;
    padding: 6px;
    border-radius: 100px;
    display: flex;
    gap: 5px;
}
.tab-pill-box button {
    border: none;
    background: transparent;
    padding: 10px 24px;
    border-radius: 100px;
    font-weight: 800;
    font-size: 0.8rem;
    color: #64748b;
    transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
}
.tab-pill-box button.active {
    background: white;
    color: #1a2e24;
    box-shadow: 0 4px 15px rgba(0,0,0,0.08);
}

/* --- INPUT GROUPS --- */
.customer-input-group, .search-input-group {
    display: flex;
    align-items: center;
    background: #f1f5f9;
    border-radius: 20px;
    padding: 10px 20px;
    border: 2px solid transparent;
    transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.customer-input-group:focus-within, .search-input-group:focus-within {
    background: white;
    border-color: #84a548;
    box-shadow: 0 10px 25px -10px rgba(132, 165, 72, 0.25);
}
.icon-wrap { font-size: 1.1rem; margin-right: 15px; display: flex; align-items: center; }
.customer-input, .search-input {
    border: none; background: transparent; width: 100%; font-weight: 700; font-size: 0.9rem; color: #1a2e24; outline: none;
}

/* --- MENU ITEMS --- */
.product-item { 
    background: white; padding: 25px 22px; border-radius: 30px; border: 1.5px solid #f1f5f9; 
    cursor: pointer; transition: all 0.3s ease; position: relative; overflow: hidden;
}
.product-item:hover { border-color: #84a548; transform: translateY(-5px); box-shadow: 0 15px 30px -10px rgba(0,0,0,0.05); }
.price-pill { position: absolute; top: 12px; right: 12px; background: #f7fee7; color: #84a548; font-size: 0.7rem; font-weight: 800; padding: 5px 12px; border-radius: 50px; }
.add-indicator { position: absolute; bottom: -20px; right: -20px; background: #1a2e24; color: white; width: 40px; height: 40px; border-radius: 15px; display: flex; align-items: center; justify-content: center; transition: 0.3s; opacity: 0; }
.product-item:hover .add-indicator { bottom: 10px; right: 10px; opacity: 1; }

/* --- CAMERA UI --- */
.camera-container { width: 100%; max-width: 500px; height: 350px; background: #000; border-radius: 35px; overflow: hidden; position: relative; }
.camera-stream { width: 100%; height: 100%; object-fit: cover; }
.scan-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; }
.scan-line { width: 85%; height: 3px; background: #84a548; box-shadow: 0 0 20px #84a548; animation: scanning 2s infinite linear; }
@keyframes scanning { 0% { transform: translateY(-120px); } 100% { transform: translateY(120px); } }

/* --- CART & PAYMENT --- */
.note-container-elegant { background-color: #fffce8; border: 2px dashed #facc15; border-radius: 18px; padding: 10px 15px; display: flex; align-items: center; gap: 10px; }
.quote-icon { color: #eab308; font-size: 0.75rem; }
.note-input-field { background: transparent; border: none; outline: none; width: 100%; font-size: 0.8rem; font-weight: 700; color: #854d0e; font-style: italic; }

.bg-light-sage { background: #f1f5f2; }
.payment-toggle button { flex: 1; border: none; background: transparent; padding: 12px; border-radius: 50px; font-weight: 800; font-size: 0.75rem; color: #94a3b8; transition: 0.3s; }
.payment-toggle button.active { background: #1a2e24; color: white; box-shadow: 0 5px 15px rgba(26, 46, 36, 0.2); }

.shortcut-row { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0; }
.btn-amt { flex: 1; background: white; border-radius: 15px; padding: 10px; font-size: 0.75rem; font-weight: 800; color: #475569; min-width: 75px; transition: 0.2s; }
.btn-amt:hover { background: #84a548; color: white; transform: translateY(-2px); }

.input-pay-wrap { position: relative; border-radius: 20px; overflow: hidden; padding: 5px; }
.input-pay { width: 100%; border: none; padding: 15px 20px 15px 50px; font-size: 1.8rem; font-weight: 800; text-align: right; outline: none; background: transparent; }
.currency { position: absolute; left: 20px; top: 50%; transform: translateY(-50%); font-weight: 800; font-size: 1.2rem; }

.btn-checkout { padding: 20px; border-radius: 25px; background: #1a2e24; color: white; font-weight: 800; letter-spacing: 1px; transition: 0.3s; border: none; }
.btn-debt { padding: 20px; border-radius: 25px; background: white; color: #1a2e24; font-weight: 800; transition: 0.3s; border: 2px solid #1a2e24; }
.btn-checkout:hover:not(:disabled) { background: #000; transform: scale(1.02); }

.qty-stepper { display: flex; align-items: center; border-radius: 50px; background: white; padding: 2px; }
.qty-stepper button { border: none; background: transparent; padding: 5px 15px; font-weight: 800; color: #84a548; font-size: 1.2rem; }
.qty-stepper span { font-weight: 800; font-size: 1rem; min-width: 30px; text-align: center; color: #1a2e24; }

.disc-input { width: 70px; padding: 10px; border-radius: 15px; font-weight: 800; text-align: center; color: #84a548; outline: none; background: #fff; }

.animate-fade { animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>