<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import axios from 'axios'
import printJS from 'print-js'

// --- STATE UMUM ---
const activeTab = ref('manual')
const menus = ref([])
const cart = ref([])
const searchQuery = ref("")
// const API_URL = "http://127.0.0.1:8000"
const API_URL = "https://api.inventorycafe.space"
const isProcessing = ref(false)
const customerName = ref("")

// --- STATE PEMBAYARAN ---
const paymentMethod = ref('cash')
const cashAmount = ref(0)

// HANYA SATU DEKLARASI changeAmount DI SINI
const changeAmount = computed(() => {
    if (paymentMethod.value === 'qris') return 0
    return cashAmount.value > 0 ? cashAmount.value - cartTotal.value : 0
})

// --- STATE PRINT & MODAL ---
const showSuccessModal = ref(false)
const lastTransaction = ref(null)

// --- STATE KAMERA & SCAN ---
const videoRef = ref(null)
const canvasRef = ref(null)
const isCameraOpen = ref(false)
const scanPreview = ref(null)
const scanBlob = ref(null)
const isScanning = ref(false)

// --- FETCH MENU ---
const fetchMenus = async () => {
    try {
        const res = await axios.get(`${API_URL}/menu/`)
        menus.value = res.data
    } catch (e) { console.error("Gagal load menu:", e) }
}

// --- CART LOGIC ---
const addToCart = (itemData) => {
    const existingItem = cart.value.find(item => item.menu_id === itemData.menu_id)
    if (existingItem) {
        existingItem.qty += itemData.qty
    } else {
        cart.value.push({
            menu_id: itemData.menu_id,
            name: itemData.name,
            price: itemData.price,
            qty: itemData.qty,
            note: itemData.note || ""
        })
    }
}

const decreaseQty = (index) => {
    if(cart.value[index].qty > 1) {
        cart.value[index].qty--
    } else {
        cart.value.splice(index, 1)
    }
}

const cartTotal = computed(() => {
    return cart.value.reduce((total, item) => total + (item.price * item.qty), 0)
})

const filteredMenus = computed(() => {
    if (!searchQuery.value) return menus.value
    return menus.value.filter(m => m.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

// --- CAMERA & SCAN LOGIC ---
const startCamera = async () => {
    isCameraOpen.value = true
    scanPreview.value = null
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (videoRef.value) videoRef.value.srcObject = stream
    } catch (err) { alert("Kamera gagal: " + err.message); isCameraOpen.value = false }
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
        res.data.forEach(item => addToCart(item))
        scanPreview.value = null; activeTab.value = 'manual'
    } catch (e) { alert("AI gagal membaca") } finally { isScanning.value = false }
}

// --- CHECKOUT ---
const checkout = async () => {
    if (paymentMethod.value === 'cash' && cashAmount.value < cartTotal.value) {
        return alert("Uang kurang!")
    }

    isProcessing.value = true
    try {
        const trxData = {
            id: "TRX-" + Math.floor(Math.random() * 1000000),
            date: new Date().toLocaleString('id-ID'),
            customer: customerName.value || "Guest",
            items: [...cart.value],
            total: cartTotal.value,
            payment_method: paymentMethod.value.toUpperCase(),
            cash: paymentMethod.value === 'qris' ? cartTotal.value : cashAmount.value,
            change: changeAmount.value
        }

        const payload = {
            customer_name: trxData.customer,
            payment_method: trxData.payment_method,
            items: cart.value.map(i => ({ menu_item_id: i.menu_id, quantity: i.qty, note: i.note }))
        }

        await axios.post(`${API_URL}/sales/`, payload)

        lastTransaction.value = trxData
        showSuccessModal.value = true
        cart.value = []; customerName.value = ""; cashAmount.value = 0
    } catch (e) { alert("Gagal transaksi") } finally { isProcessing.value = false }
}

const printReceipt = async () => {
  await nextTick()
  printJS({
    printable: 'print-area',
    type: 'html',
    scanStyles: false,
    style: `
      .receipt { width: 50mm; font-family: 'Courier New'; font-size: 10px; color: #000; margin: 0 auto; }
      .text-center { text-align: center; }
      .d-flex { display: flex; }
      .justify-content-between { display: flex; justify-content: space-between; }
      .fw-bold { font-weight: bold; }
      .divider { margin: 5px 0; border-top: 1px dashed #000; }
    `
  })
}
const saveAsDebt = async () => {
    if (!customerName.value) return alert("Nama pelanggan wajib diisi!");
    if (cart.value.length === 0) return alert("Keranjang kosong!");

    // DEBUG: Cek isi cart sebelum dikirim
    console.log("Isi Keranjang:", cart.value);

    try {
        const payload = {
        customer_name: customerName.value,
        items: cart.value.map(item => ({
            menu_item_id: item.menu_id, // Pastikan 'menu_id' ada di object cart kamu
            menu_name: item.name,
            quantity: item.qty,
            price_at_moment: item.price
        }))
    };
        
        const response = await axios.post(`${API_URL}/debts/`, payload);
        console.log("Respon Sukses:", response.data);
        
        alert("Hutang dicatat, stok dipotong, & pesanan masuk dapur!");
        cart.value = [];
        customerName.value = "";
    } catch (e) {
        console.error("Error saat simpan hutang:", e.response?.data || e.message);
        alert("Gagal simpan! Cek terminal backend.");
    }
};

onMounted(fetchMenus)
onUnmounted(stopCamera)
</script>

<template>
  <div class="page-container container-fluid p-4">
    <div class="row h-100 g-4 no-print">
      <div class="col-lg-8 d-flex flex-column h-100">
        <div class="main-card card flex-grow-1 overflow-hidden">
          <div class="card-header bg-transparent border-0 pt-4 px-4 pb-3">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h4 class="fw-bold brand-text mb-0"><i class="fas fa-leaf me-2 accent-text"></i>Degentong POS</h4>
                <p class="text-muted small mb-0">Sistem Kasir AI</p>
              </div>
              <div class="tab-container p-1">
                <button class="btn tab-btn" :class="{ 'active': activeTab === 'manual' }" @click="activeTab = 'manual'">Menu</button>
                <button class="btn tab-btn" :class="{ 'active': activeTab === 'scan' }" @click="activeTab = 'scan'; startCamera()">AI Scan</button>
              </div>
            </div>
          </div>

          <div class="card-body px-4 pb-4 overflow-auto custom-scroll">
            <div v-if="activeTab === 'manual'" class="fade-in">
              <div class="search-bar input-group mb-4 shadow-sm border rounded-pill">
                <span class="input-group-text border-0 bg-transparent ps-3"><i class="fas fa-search text-muted"></i></span>
                <input v-model="searchQuery" type="text" class="form-control border-0 bg-transparent" placeholder="Cari produk...">
              </div>
              <div class="row g-3">
                <div class="col-md-4 col-sm-6" v-for="menu in filteredMenus" :key="menu.id">
                  <div class="menu-card h-100 p-3 border rounded-4" @click="addToCart({menu_id: menu.id, name: menu.name, price: menu.price, qty: 1})">
                    <span class="badge-pill mb-2 d-inline-block" :class="menu.division === 'Bar' ? 'badge-bar' : 'badge-kitchen'">{{ menu.division }}</span>
                    <h6 class="fw-bold brand-text mb-1">{{ menu.name }}</h6>
                    <div class="d-flex justify-content-between align-items-center mt-auto">
                        <span class="accent-text fw-bold">Rp {{ menu.price.toLocaleString() }}</span>
                        <div class="btn-add-circle"><i class="fas fa-plus"></i></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'scan'" class="text-center h-100 d-flex flex-column justify-content-center">
                <div class="camera-viewport mx-auto mb-4 border rounded-4 bg-dark overflow-hidden position-relative">
                    <video v-show="isCameraOpen && !scanPreview" ref="videoRef" autoplay playsinline class="w-100 h-100 object-fit-cover"></video>
                    <img v-if="scanPreview" :src="scanPreview" class="w-100 h-100 object-fit-contain">
                    <canvas ref="canvasRef" style="display: none;"></canvas>
                </div>
                <div class="d-flex justify-content-center gap-2">
                    <button v-if="isCameraOpen" class="btn btn-primary-rounded px-4" @click="takePhoto">Ambil Foto</button>
                    <button v-if="scanPreview" class="btn btn-secondary-rounded px-4" @click="startCamera">Ulang</button>
                    <button v-if="scanPreview" class="btn btn-primary-rounded px-4" @click="processScan" :disabled="isScanning">Proses AI</button>
                </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4 d-flex flex-column h-100">
        <div class="main-card card h-100 d-flex flex-column overflow-hidden">
          <div class="card-header border-0 p-4">
            <h5 class="fw-bold brand-text mb-3">Pesanan</h5>
            <input v-model="customerName" class="form-control rounded-pill border-0 bg-light px-3" placeholder="Nama Pelanggan">
          </div>

          <div class="card-body px-3 overflow-auto custom-scroll flex-grow-1">
            <div v-for="(item, index) in cart" :key="index" class="cart-item mb-2 p-3 bg-light rounded-4">
                <div class="d-flex justify-content-between fw-bold mb-1">
                    <span>{{ item.name }}</span>
                    <span class="accent-text">Rp {{ (item.price * item.qty).toLocaleString() }}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <input v-model="item.note" class="note-input small border-0 bg-transparent text-muted" placeholder="Catatan...">
                    <div class="qty-control bg-white rounded-pill px-2 border">
                        <button class="btn btn-sm border-0" @click="decreaseQty(index)">-</button>
                        <span class="px-2 small fw-bold">{{ item.qty }}</span>
                        <button class="btn btn-sm border-0" @click="item.qty++">+</button>
                    </div>
                </div>
            </div>
          </div>

          <div class="card-footer p-4 bg-white border-0 shadow-lg" style="border-radius: 30px 30px 0 0;">
            <div class="summary-box mb-3">
                <div class="d-flex justify-content-between fw-bold mb-3">
                    <span>Total</span><span class="fs-5 brand-text">Rp {{ cartTotal.toLocaleString() }}</span>
                </div>
                <div class="mb-3">
                    <label class="small fw-bold text-muted mb-2 d-block">Metode Bayar</label>
                    <div class="d-flex gap-2">
                        <button class="btn btn-payment-type flex-grow-1" :class="{ 'active': paymentMethod === 'cash' }" @click="paymentMethod = 'cash'">Cash</button>
                        <button class="btn btn-payment-type flex-grow-1" :class="{ 'active': paymentMethod === 'qris' }" @click="paymentMethod = 'qris'; cashAmount = cartTotal">QRIS</button>
                    </div>
                </div>
                <div v-if="paymentMethod === 'cash'" class="fade-in">
                    <input v-model.number="cashAmount" type="number" class="form-control border-0 bg-light rounded-pill fw-bold text-center mb-2" placeholder="Uang Tunai">
                    <div class="d-flex justify-content-between small text-danger fw-bold px-2">
                        <span>Kembali</span><span>Rp {{ changeAmount.toLocaleString() }}</span>
                    </div>
                </div>
            </div>
            <div class="d-flex gap-2">
                <button 
                    class="btn btn-debt flex-grow-1 py-3 fw-bold shadow-sm" 
                    @click="saveAsDebt" 
                    :disabled="cart.length === 0 || isProcessing"
                >
                    <i class="fas fa-book me-2"></i>HUTANG
                </button>

                <button 
                    class="btn btn-checkout flex-grow-2 py-3 fw-bold shadow-lg" 
                    @click="checkout" 
                    :disabled="cart.length === 0 || isProcessing"
                >
                    <i class="fas fa-paper-plane me-2"></i>BAYAR
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showSuccessModal" class="modal-overlay no-print fade-in">
    <div class="success-modal-box text-center p-5 bg-white shadow-lg rounded-5 border-top border-5 border-success">
        <div class="success-icon mb-4"><i class="fas fa-check-circle"></i></div>
        <h4 class="fw-bold brand-text mb-2">Transaksi Berhasil!</h4>
        <p class="text-muted small mb-4">Struk siap dicetak untuk pelanggan.</p>

        <div class="summary-preview p-3 rounded-4 mb-4 text-start bg-light border">
            <div class="d-flex justify-content-between small mb-2">
                <span class="text-muted">Pelanggan</span>
                <span class="fw-bold">{{ lastTransaction?.customer }}</span>
            </div>
            <div class="d-flex justify-content-between small mb-2">
                <span class="text-muted">Metode Bayar</span>
                <span class="badge bg-success-soft text-success border-0 px-2 py-1">{{ lastTransaction?.payment_method }}</span>
            </div>
            <div class="d-flex justify-content-between small mb-2">
                <span class="text-muted">Total</span>
                <span class="fw-bold">Rp {{ lastTransaction?.total.toLocaleString() }}</span>
            </div>
            <div class="d-flex justify-content-between fw-bold border-top pt-2 mt-2">
                <span>Kembali</span>
                <span class="accent-text">Rp {{ lastTransaction?.change.toLocaleString() }}</span>
            </div>
        </div>

        <div class="d-flex gap-3 justify-content-center">
            <button class="btn btn-secondary-rounded px-4 py-2 w-50" @click="showSuccessModal = false">
                Tutup
            </button>
            <button class="btn btn-primary-rounded px-4 py-3 w-50 fw-bold shadow-sm" @click="printReceipt">
                <i class="fas fa-print me-2"></i>Cetak Struk
            </button>
        </div>
    </div>
</div>

<div id="print-area" v-if="lastTransaction">
    <div class="receipt">
        <div class="text-center">
            <h4 class="fw-bold mb-0" style="font-size: 14px;">DEGENTONG CAFE</h4>
            <p class="m-0 small">Banyuwangi, Jawa Timur</p>
            <p class="m-0 small">WA: 0812-xxxx-xxxx</p>
        </div>
        
        <div class="divider">================================</div>
        
        <div class="receipt-info small">
            <div class="d-flex justify-content-between">
                <span>No: {{ lastTransaction.id }}</span>
                <span>{{ lastTransaction.payment_method }}</span>
            </div>
            <p class="m-0">{{ lastTransaction.date }}</p>
            <p class="m-0">Cust: {{ lastTransaction.customer }}</p>
        </div>
        
        <div class="divider">--------------------------------</div>
        
        <div class="receipt-items">
            <div v-for="item in lastTransaction.items" :key="item.menu_id" class="mb-1">
                <div class="fw-bold">{{ item.name }}</div>
                <div class="d-flex justify-content-between small">
                    <span>{{ item.qty }} x {{ item.price.toLocaleString() }}</span>
                    <span>{{ (item.qty * item.price).toLocaleString() }}</span>
                </div>
                <div v-if="item.note" class="small italic text-muted">({{ item.note }})</div>
            </div>
        </div>
        
        <div class="divider">--------------------------------</div>
        
        <div class="receipt-total fw-bold">
            <div class="d-flex justify-content-between">
                <span>TOTAL</span><span>Rp {{ lastTransaction.total.toLocaleString() }}</span>
            </div>
            <div class="d-flex justify-content-between">
                <span>BAYAR</span><span>Rp {{ lastTransaction.cash.toLocaleString() }}</span>
            </div>
            <div class="d-flex justify-content-between">
                <span>KEMBALI</span><span>Rp {{ lastTransaction.change.toLocaleString() }}</span>
            </div>
        </div>
        
        <div class="divider">================================</div>
        
        <div class="text-center mt-3">
            <p class="fw-bold mb-1">TERIMA KASIH</p>
            <p class="small">Selamat Menikmati!</p>
            <p class="watermark mt-2">AI-POS by Degentong</p>
        </div>
    </div>
</div>

    <div id="print-area" v-if="lastTransaction">
        <div class="receipt">
            <div class="text-center">
                <h6 class="fw-bold m-0">Degentong Cafe</h6>
                <p class="m-0">Banyuwangi, East Java</p>
            </div>
            <div class="divider"></div>
            <p class="m-0">ID : {{ lastTransaction.id }}</p>
            <p class="m-0">BYR: {{ lastTransaction.payment_method }}</p>
            <div class="divider"></div>
            <div v-for="item in lastTransaction.items" :key="item.menu_id">
                <div class="d-flex justify-content-between">
                    <span>{{ item.name }} x{{ item.qty }}</span>
                    <span>{{ (item.qty * item.price).toLocaleString() }}</span>
                </div>
            </div>
            <div class="divider"></div>
            <div class="d-flex justify-content-between fw-bold">
                <span>TOTAL</span><span>{{ lastTransaction.total.toLocaleString() }}</span>
            </div>
            <div class="d-flex justify-content-between">
                <span>TUNAI</span><span>{{ lastTransaction.cash.toLocaleString() }}</span>
            </div>
            <div class="d-flex justify-content-between">
                <span>KEMBALI</span><span>{{ lastTransaction.change.toLocaleString() }}</span>
            </div>
            <div class="text-center mt-3">Terima Kasih!</div>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* Styling minimal agar bersih */
.brand-text { color: #2c4a3b; }
.accent-text { color: #84a548; }
.btn-primary-rounded { background: #2c4a3b; color: white; border-radius: 50px; border: none; }
.menu-card { cursor: pointer; transition: 0.2s; }
.menu-card:hover { border-color: #84a548 !important; transform: translateY(-3px); }
.btn-payment-type { background: #f8f9fa; border: 1px solid #eee; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
.btn-payment-type.active { background: #2c4a3b; color: white; }
.btn-checkout { background: #2c4a3b; color: white; border-radius: 50px; font-weight: bold; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.camera-viewport { height: 300px; width: 100%; max-width: 400px; }
.badge-pill { font-size: 0.6rem; padding: 2px 8px; border-radius: 10px; font-weight: bold; }
.badge-bar { background: #e6f0eb; color: #2c4a3b; }
.badge-kitchen { background: #fff4e6; color: #d68c45; }
#print-area { position: fixed; left: -9999px; }
</style>