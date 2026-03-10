<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import axios from 'axios'

// --- CONFIG & STATE ---
const API_URL = "https://api.inventorycafe.space"
const activeTab = ref('manual') 
const selectedDivision = ref('All')
const menus = ref([])
const cart = ref([])
const searchQuery = ref("")
const isProcessing = ref(false)
const isPrinting = ref(false) 
const customerName = ref("")
const tableNumber = ref("")
const discountPercent = ref(0)
const paymentMethod = ref('cash')
const cashAmount = ref(0) 

// --- STATE MODAL & RECEIPT ---
const showSuccessModal = ref(false)
const lastTransaction = ref(null)

// --- STATE RESERVASI (TAMBAHKAN INI) ---
const showReservationModal = ref(false)
const reservationDate = ref("")
const dpAmount = ref(0)
const dpMethod = ref("QRIS")


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

// --- FILTER LOGIC ---
const filteredMenus = computed(() => {
    return menus.value.filter(m => {
        const matchSearch = m.name.toLowerCase().includes(searchQuery.value.toLowerCase())
        const matchDiv = selectedDivision.value === 'All' || m.division === selectedDivision.value
        return matchSearch && matchDiv
    })
})

// --- 🔵 BLUETOOTH PRINT LOGIC (ESC/POS) ---
const printReceiptBluetooth = async () => {
    if (!lastTransaction.value) return
    isPrinting.value = true
    const sale = lastTransaction.value
    
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        })
        const server = await device.gatt.connect()
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')
        const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb')

        const encoder = new TextEncoder()
        const init = '\x1B\x40', center = '\x1B\x61\x01', left = '\x1B\x61\x00'
        const boldOn = '\x1B\x45\x01', boldOff = '\x1B\x45\x00', feed = '\x0A\x0A\x0A'

        let content = init + center + boldOn + "DEGENTONG CAFE\n" + boldOff
        content += "Banyuwangi, East Java\n"
        content += "--------------------------------\n" + left
        content += `ID  : ${sale.id}\n`
        content += `Tgl : ${sale.date}\n`
        content += `Plg : ${sale.customer_name}\n`
        content += `Meja: ${sale.table_number}\n`
        content += `Byr : ${sale.payment_method}\n`
        content += "--------------------------------\n"

        sale.items_detail.forEach(item => {
            content += `${item.name}\n`
            content += `${item.qty} x ${item.price.toLocaleString()} = ${(item.qty * item.price).toLocaleString()}\n`
        })

        content += "--------------------------------\n"
        content += `Subtotal: Rp ${sale.subtotal.toLocaleString()}\n`
        if(sale.discount > 0) content += `Discount: -Rp ${sale.discount.toLocaleString()}\n`
        content += boldOn + `TOTAL   : Rp ${sale.final.toLocaleString()}\n` + boldOff
        content += `Bayar   : Rp ${sale.cash.toLocaleString()}\n`
        content += `Kembali : Rp ${sale.change.toLocaleString()}\n`
        content += feed

        const dataArray = encoder.encode(content)
        for (let i = 0; i < dataArray.length; i += 20) {
            await characteristic.writeValue(dataArray.slice(i, i + 20))
        }
        await device.gatt.disconnect()
    } catch (e) { 
        alert("Printer Gagal: " + e.message) 
    } finally { 
        isPrinting.value = false 
    }
}

// --- CAMERA LOGIC ---
const startCamera = async () => {
    isCameraOpen.value = true
    scanPreview.value = null
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        })
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
    if (item) item.qty++
    else cart.value.push({ menu_id: mid, name: menu.name, price: menu.price, qty: 1, note: "" })
}

const removeFromCart = (idx) => cart.value.splice(idx, 1)

// --- CALCULATIONS ---
const cartTotal = computed(() => cart.value.reduce((t, i) => t + (i.price * i.qty), 0))
const discountAmount = computed(() => (discountPercent.value / 100) * cartTotal.value)
const finalTotal = computed(() => cartTotal.value - discountAmount.value)

watch(finalTotal, (newVal) => {
    if (paymentMethod.value === 'cash') cashAmount.value = newVal
}, { immediate: true })

const changeAmount = computed(() => cashAmount.value >= finalTotal.value ? cashAmount.value - finalTotal.value : 0)

// --- ACTIONS ---
const checkout = async () => {
    if (paymentMethod.value === 'cash' && cashAmount.value < finalTotal.value) return alert("Uang tunai kurang!")
    isProcessing.value = true
    try {
        const payload = {
            customer_name: customerName.value || "Guest",
            table_number: tableNumber.value || "Take Away",
            payment_method: paymentMethod.value.toUpperCase(),
            items: cart.value.map(i => ({ menu_item_id: i.menu_id, quantity: i.qty, note: i.note }))
        }
        await axios.post(`${API_URL}/sales/`, payload)
        
        lastTransaction.value = { 
            id: 'TRX-' + Math.floor(1000 + Math.random() * 9000),
            ...payload, 
            items_detail: [...cart.value], 
            subtotal: cartTotal.value, 
            discount: discountAmount.value, 
            final: finalTotal.value, 
            cash: cashAmount.value, 
            change: changeAmount.value, 
            date: new Date().toLocaleString('id-ID') 
        }
        
        showSuccessModal.value = true
        resetPOS()
    } catch (e) { alert("Transaksi Gagal") } 
    finally { isProcessing.value = false }
}

const saveAsDebt = async () => {
    if (!customerName.value) return alert("Nama pelanggan wajib!")
    isProcessing.value = true
    try {
        const payload = { customer_name: customerName.value, items: cart.value.map(item => ({ menu_item_id: item.menu_id, menu_name: item.name, quantity: item.qty, price_at_moment: item.price, note: item.note || "" })) }
        await axios.post(`${API_URL}/debts/`, payload)
        alert("📝 Hutang dicatat!")
        resetPOS()
    } catch (e) { console.error(e) }
    finally { isProcessing.value = false }
}
// --- FUNGSI SUBMIT RESERVASI (TAMBAHKAN INI) ---
const submitReservation = async () => {
    if (!customerName.value) return alert("Nama pelanggan wajib diisi untuk Reservasi!")
    if (!reservationDate.value) return alert("Pilih tanggal & jam kedatangan!")
    
    isProcessing.value = true
    try {
        const payload = {
            customer_name: customerName.value,
            table_number: tableNumber.value || "TBD",
            reservation_date: new Date(reservationDate.value).toISOString(),
            total_amount: finalTotal.value,
            dp_amount: dpAmount.value,
            dp_method: dpMethod.value,
            items: cart.value.map(i => ({ 
                menu_item_id: i.menu_id || i.id, 
                menu_name: i.name,
                quantity: i.qty, 
                price_at_moment: i.price,
                note: i.note || "" 
            }))
        }
        await axios.post(`${API_URL}/reservations/`, payload)
        
        alert("📝 Reservasi berhasil dicatat! (Belum masuk ke Dapur)")
        showReservationModal.value = false
        resetPOS()
    } catch (e) { 
        alert("Gagal mencatat reservasi. Cek koneksi server.") 
        console.error(e)
    } finally { 
        isProcessing.value = false 
    }
}

const resetPOS = () => { 
    cart.value = []; 
    customerName.value = "";
    tableNumber.value = ""; 
    cashAmount.value = 0; 
    discountPercent.value = 0;
    
    // Reset state reservasi juga
    reservationDate.value = "";
    dpAmount.value = 0;
}

// const resetPOS = () => { cart.value = []; customerName.value = "";tableNumber.value = ""; cashAmount.value = 0; discountPercent.value = 0 }

onMounted(fetchMenus)
onUnmounted(stopCamera)


</script>

<template>
  <div class="pos-app-wrapper">
    <div class="main-dashboard no-print">
      
      <section class="menu-container">
        <header class="dashboard-header">
          <div class="brand-info">
            <div class="brand-logo shadow-sm"><i class="fa-solid fa-leaf"></i></div>
            <div class="brand-text">
              <h1>Degentong</h1>
              <p>Operational Dashboard</p>
            </div>
          </div>

          <div class="header-center">
            <div class="search-pill shadow-xs">
              <i class="fa-solid fa-magnifying-glass"></i>
              <input v-model="searchQuery" placeholder="Search menu...">
            </div>
          </div>

          <div class="tab-navigator shadow-xs">
            <button :class="{ active: activeTab === 'manual' }" @click="activeTab = 'manual'; stopCamera()">
                <i class="fa-solid fa-utensils me-2"></i> Menu
            </button>
            <button :class="{ active: activeTab === 'scan' }" @click="activeTab = 'scan'; startCamera()">
                <i class="fa-solid fa-qrcode me-2"></i> AI Scan
            </button>
          </div>
        </header>

        <div class="category-pills">
            <button class="pill" :class="{ active: selectedDivision === 'All' }" @click="selectedDivision = 'All'">All Items</button>
            <button class="pill" :class="{ active: selectedDivision === 'Kitchen' }" @click="selectedDivision = 'Kitchen'">Kitchen</button>
            <button class="pill" :class="{ active: selectedDivision === 'Bar' }" @click="selectedDivision = 'Bar'">Bar</button>
        </div>

        <div class="items-view">
          <div v-if="activeTab === 'manual'" class="menu-grid animate-fade">
            <div v-for="menu in filteredMenus" 
                 :key="menu.id" class="menu-card" 
                 :class="menu.division === 'Bar' ? 'bar-nuance' : 'kitchen-nuance'" 
                 @click="addToCart(menu)">
              <div class="item-img-placeholder">
                <i v-if="menu.division === 'Bar'" class="fa-solid fa-mug-hot"></i>
                <i v-else class="fa-solid fa-bowl-food"></i>
              </div>
              <div class="item-body">
                <h3 class="name text-truncate">{{ menu.name }}</h3>
                <p class="price">Rp{{ (menu.price/1000).toFixed(0) }}k</p>
              </div>
              <div class="add-tag shadow-sm"><i class="fa-solid fa-plus"></i></div>
            </div>
          </div>

          <div v-if="activeTab === 'scan'" class="scan-area animate-fade">
             <div class="cam-box shadow-lg border-dashed">
                <video v-show="isCameraOpen && !scanPreview" ref="videoRef" autoplay playsinline class="video-content"></video>
                <img v-if="scanPreview" :src="scanPreview" class="video-content">
                <div v-if="isScanning" class="scan-line"></div>
                <canvas ref="canvasRef" style="display: none;"></canvas>
             </div>
             <div class="scan-actions mt-4 text-center">
                <button v-if="isCameraOpen" class="btn-coral" @click="takePhoto">CAPTURE PHOTO</button>
                <button v-if="scanPreview" class="btn-outline" @click="startCamera">RETAKE</button>
                <button v-if="scanPreview" class="btn-coral" @click="processScan" :disabled="isScanning">PROCESS SCAN</button>
             </div>
          </div>
        </div>
      </section>

      <aside class="order-sidebar shadow-xl">
        <div class="sidebar-header">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="sidebar-title">My Order</h2>
            <button class="btn-reset" @click="resetPOS"><i class="fa-solid fa-rotate-left"></i></button>
          </div>
          <div class="customer-input shadow-xs mb-2">
            <i class="fa-solid fa-circle-user text-sage"></i>
            <input v-model="customerName" placeholder="Customer Name...">
          </div>
          <div class="customer-input shadow-xs">
            <i class="fa-solid fa-chair text-sage"></i>
            <input v-model="tableNumber" placeholder="Meja" type="text">
          </div>
        </div>

        <div class="order-list custom-scroll">
          <div v-for="(item, idx) in cart" :key="item.menu_id" class="order-item animate-slide">
            <div class="item-thumb"><i class="fa-solid fa-burger"></i></div>
            <div class="item-info">
              <h4>{{ item.name }}</h4>
              <p class="text-coral fw-bold">Rp{{ (item.price * item.qty).toLocaleString() }}</p>
              <input v-model="item.note" placeholder="Write a note..." class="note-input">
            </div>
            <div class="item-stepper shadow-xs">
              <button @click="item.qty > 1 ? item.qty-- : removeFromCart(idx)">-</button>
              <span>{{ item.qty }}</span>
              <button @click="item.qty++">+</button>
            </div>
          </div>
          <div v-if="cart.length === 0" class="empty-state">
             <i class="fa-solid fa-basket-shopping fa-3x mb-3 opacity-10"></i>
             <p class="small fw-bold text-muted uppercase-spaced">Cart is Empty</p>
          </div>
        </div>

        <div class="payment-footer">
          <div class="summary-box">
              <div class="summary-line">
                <span>Subtotal</span>
                <span>Rp{{ cartTotal.toLocaleString() }}</span>
              </div>
              <div class="summary-line">
                <span>Discount (%)</span>
                <input type="number" v-model="discountPercent" class="disc-field shadow-xs">
              </div>
              
              <div class="total-row border-top-dashed">
                <span>Total</span>
                <span class="text-coral fw-900 fs-4">Rp{{ finalTotal.toLocaleString() }}</span>
              </div>
          </div>

          <div class="pay-method-pill shadow-xs mb-3">
              <button :class="{ active: paymentMethod === 'cash' }" @click="paymentMethod = 'cash'">CASH</button>
              <button :class="{ active: paymentMethod === 'qris' }" @click="paymentMethod = 'qris'">QRIS</button>
          </div>

          <div v-if="paymentMethod === 'cash'" class="cash-input-group fade-in mb-3">
              <div class="input-wrap shadow-xs">
                  <span class="fw-bold me-2">Rp</span>
                  <input v-model.number="cashAmount" type="number" placeholder="0">
              </div>
              <div class="change-info d-flex justify-content-between mt-2 px-2">
                  <span class="extra-small fw-bold text-muted">CHANGE</span>
                  <span class="fw-bold text-sage">Rp{{ changeAmount.toLocaleString() }}</span>
              </div>
          </div>

          <div class="main-actions d-flex gap-2">
            <button class="btn-outline-coral" @click="saveAsDebt" :disabled="isProcessing || cart.length === 0">DEBT</button>
            <button class="btn-coral shadow-lg" @click="checkout" :disabled="isProcessing || cart.length === 0">
               <i v-if="isProcessing" class="fa-solid fa-spinner fa-spin me-2"></i> PLACE ORDER
            </button>
            <button class="btn-outline-coral" @click="showReservationModal = true" :disabled="cart.length === 0">
                <i class="fa-regular fa-calendar-check me-2"></i> RESERVASI
            </button>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="showSuccessModal" class="modal-backdrop no-print">
        <div class="modal-content animate-up shadow-2xl">
            <div class="modal-body-success">
                <div class="icon-success shadow-sm"><i class="fa-solid fa-check"></i></div>
                <h3 class="fw-800 text-dark-green mt-3">Payment Success!</h3>
                <p class="text-muted small">Your transaction has been recorded.</p>
                
                <div class="modal-amount-summary my-4">
                    <div class="modal-row-item">
                        <span>Total Paid</span>
                        <span class="fw-bold">Rp{{ lastTransaction?.final.toLocaleString() }}</span>
                    </div>
                    <div class="modal-row-item">
                        <span>Cash Received</span>
                        <span>Rp{{ lastTransaction?.cash.toLocaleString() }}</span>
                    </div>
                    <div class="modal-row-item text-sage fw-bold pt-2 border-top-dashed">
                        <span>Change Due</span>
                        <span>Rp{{ lastTransaction?.change.toLocaleString() }}</span>
                    </div>
                </div>
            </div>
            
            <div class="modal-footer-actions">
                <button class="btn-secondary-modal mb-1" @click="showSuccessModal = false"><i class="fa-solid fa-x"></i> CLOSE</button>
                <button class="btn-coral shadow-lg" @click="printReceiptBluetooth" :disabled="isPrinting">
                    <i v-if="isPrinting" class="fa-solid fa-spinner fa-spin me-2"></i>
                    <i v-else class="fa-solid fa-print me-2"></i>PRINT RECEIPT
                </button>
            </div>
        </div>
    </div>
    <div v-if="showReservationModal" class="modal-backdrop">
    <div class="modal-content animate-up shadow-2xl">
        <h3 class="fw-800 text-dark mb-4">Buat Reservasi</h3>
        
        <div class="text-start mb-3">
            <label class="fw-bold small text-muted">Tanggal & Jam Kedatangan</label>
            <input type="datetime-local" v-model="reservationDate" class="form-control shadow-xs mt-1">
        </div>

        <div class="text-start mb-3">
            <label class="fw-bold small text-muted">Total Belanja</label>
            <h4 class="fw-bold text-sage">Rp{{ finalTotal.toLocaleString() }}</h4>
        </div>

        <div class="text-start mb-3">
            <label class="fw-bold small text-muted">Jumlah DP (Bisa 0)</label>
            <input type="number" v-model.number="dpAmount" class="form-control shadow-xs mt-1" placeholder="Masukkan nominal DP">
        </div>

        <div class="text-start mb-4" v-if="dpAmount > 0">
            <label class="fw-bold small text-muted">Metode DP</label>
            <div class="pay-method-pill shadow-xs mt-1">
              <button :class="{ active: dpMethod === 'CASH' }" @click="dpMethod = 'CASH'">CASH</button>
              <button :class="{ active: dpMethod === 'QRIS' }" @click="dpMethod = 'QRIS'">QRIS</button>
          </div>
        </div>

        <div class="d-flex gap-2">
            <button class="btn-secondary-modal w-50" @click="showReservationModal = false">BATAL</button>
            <button class="btn-coral w-50" @click="submitReservation" :disabled="isProcessing">
                <i v-if="isProcessing" class="fa-solid fa-spinner fa-spin"></i> SIMPAN DP
            </button>
        </div>
    </div>
</div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* --- THEME COLORS --- */
.text-sage { color: #84a548; }
.text-coral { color: #84a548; }
.bg-light-gray { background-color: #F8F9FA; }

/* --- FLUID LAYOUT --- */
.pos-app-wrapper { 
    min-height: 100vh; background-color: #F9FAFB; font-family: 'Plus Jakarta Sans', sans-serif;
    padding: 15px; box-sizing: border-box;
}
.main-dashboard { display: flex; gap: 15px; max-width: 1440px; margin: 0 auto; flex-wrap: wrap; }

/* 🟢 LEFT SECTION: MENU STATION (Fluid with No Min-Width Lock) */
.menu-container { flex: 1; background: white; border-radius: 28px; display: flex; flex-direction: column; padding: 25px; box-shadow: 0 4px 30px rgba(0,0,0,0.02); overflow: hidden; }

.dashboard-header { display: flex; justify-content: space-between; align-items: center; gap: 15px; margin-bottom: 25px; }
.brand-info { display: flex; align-items: center; gap: 10px; }
.brand-logo { width: 38px; height: 38px; background: #15803d; color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.brand-text h1 { font-size: 1.2rem; font-weight: 800; margin: 0; color: #1e293b; }
.brand-text p { font-size: 0.7rem; color: #94a3b8; margin: 0; font-weight: 600; }

.search-pill { background: #f3f4f6; padding: 10px 18px; border-radius: 100px; display: flex; align-items: center; gap: 10px; flex: 1; max-width: 250px; }
.search-pill input { border: none; background: transparent; width: 100%; outline: none; font-weight: 600; font-size: 0.85rem; }

.tab-navigator { background: #f3f4f6; padding: 4px; border-radius: 100px; display: flex; }
.tab-navigator button { border: none; background: transparent; padding: 8px 16px; border-radius: 100px; font-weight: 800; font-size: 0.75rem; color: #64748b; transition: 0.3s; }
.tab-navigator button.active { background: white; color: #15803d; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }

.category-pills { display: flex; gap: 8px; margin-bottom: 20px; }
.pill { border: 1.5px solid #f1f5f5; background: white; padding: 8px 16px; border-radius: 100px; font-weight: 700; font-size: 0.75rem; color: #6b7280; transition: 0.2s; cursor: pointer; }
.pill.active { background: #84a548; color: white; border-color: #84a548; }

/* GRID MENU */
.menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px; }
.menu-card { 
    background: white; border-radius: 22px; padding: 15px; text-align: center; cursor: pointer; transition: 0.3s; 
    border: 1px solid #F1F3F5; position: relative; overflow: hidden;
}
.menu-card:hover { transform: translateY(-5px); border-color: #84a548; box-shadow: 0 10px 20px rgba(255, 91, 91, 0.05); }

.bar-nuance { background-color: #f0fdf4; border-color: #dcfce7; }
.kitchen-nuance { background-color: #ffffff; }

.item-img-placeholder { width: 60px; height: 60px; background: #F8F9FA; border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #cbd5e1; }
.item-body .name { font-weight: 800; color: #1e293b; font-size: 0.85rem; margin-bottom: 4px; }
.item-body .price { font-weight: 800; color: #84a548; font-size: 0.8rem; }
.add-tag { position: absolute; top: 12px; right: 12px; background: #84a548; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; }

/* 🛒 RIGHT SIDEBAR */
.order-sidebar { width: 360px; background: white; border-radius: 28px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 4px 30px rgba(0,0,0,0.02); }
.sidebar-header { padding: 25px; border-bottom: 1px solid #F1F3F5; }
.sidebar-title { font-size: 1.2rem; font-weight: 800; margin: 0; color: #1e293b; }
.customer-input { display: flex; align-items: center; background: #f8fafc; padding: 10px 15px; border-radius: 12px; gap: 10px; border: 1.5px solid #F1F3F5; }
.customer-input input { border: none; background: transparent; width: 100%; outline: none; font-weight: 700; font-size: 0.85rem; }

.order-list { flex: 1; padding: 20px; overflow-y: auto; max-height: 400px; }
.order-item { display: flex; align-items: center; gap: 12px; margin-bottom: 15px; padding-bottom: 12px; border-bottom: 1px solid #F8FAFC; }
.item-thumb { width: 48px; height: 48px; background: #f3f4f6; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 1rem; }
.item-info { flex: 1; }
.item-info h4 { font-size: 0.8rem; font-weight: 800; margin: 0; color: #1e293b; }
.note-input { border: none; background: transparent; font-size: 0.65rem; font-style: italic; color: #94a3b8; width: 100%; outline: none; margin-top: 2px; border-bottom: 1px dashed #e2e8f0; }

.item-stepper { display: flex; align-items: center; background: #f1f5f9; padding: 4px; border-radius: 10px; }
.item-stepper button { border: none; background: white; width: 22px; height: 22px; border-radius: 6px; font-weight: 800; color: #84a548; font-size: 0.8rem; }
.item-stepper span { font-weight: 800; font-size: 0.85rem; margin: 0 8px; }

/* PAYMENT BOX */
.payment-footer { padding: 25px; background: #F8F9FA; border-top: 1px solid #F1F3F5; }
.summary-box .summary-line { display: flex; justify-content: space-between; margin-bottom: 8px; color: #64748b; font-weight: 700; font-size: 0.8rem; }
.disc-field { width: 45px; text-align: right; border: none; border-radius: 5px; padding: 2px 6px; font-weight: 800; font-size: 0.8rem; }
.total-row { display: flex; justify-content: space-between; align-items: center; margin: 15px 0; padding-top: 15px; }
.border-top-dashed { border-top: 1.5px dashed #cbd5e1; }

.pay-method-pill { display: flex; background: #e2e8f0; padding: 4px; border-radius: 100px; }
.pay-method-pill button { flex: 1; border: none; background: transparent; padding: 10px; border-radius: 100px; font-weight: 800; font-size: 0.7rem; color: #64748b; }
.pay-method-pill button.active { background: #1e293b; color: white; }

.input-wrap { display: flex; align-items: center; background: white; border-radius: 12px; padding: 8px 12px; border: 1.5px solid #e2e8f0; }
.input-wrap input { border: none; width: 100%; text-align: right; outline: none; font-weight: 800; font-size: 1.2rem; background: transparent; }

.btn-coral { width: 100%; padding: 15px; border: none; background: #84a548; color: white; border-radius: 14px; font-weight: 800; font-size: 0.9rem; transition: 0.3s; cursor: pointer; }
.btn-outline-coral { width: 100%; padding: 15px; border: 2px solid #84a548; background: transparent; color: #84a548; border-radius: 14px; font-weight: 800; cursor: pointer; }

/* 🔵 CAMERA SCAN AI STATION (Optimized Size) */
.scan-area { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }
.cam-box { 
    width: 100%; 
    max-width: 500px; 
    aspect-ratio: 4/3; 
    background: black; 
    border-radius: 28px; 
    overflow: hidden; 
    position: relative; 
}
.video-content { width: 100%; height: 100%; object-fit: cover; }
.border-dashed { border: 2px dashed #84a548; }
.scan-line { position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: #84a548; animation: scanMove 2.5s infinite linear; box-shadow: 0 0 15px #84a548; }
@keyframes scanMove { 0% { top: 0; } 100% { top: 100%; } }

/* MODAL */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.modal-content { background: white; padding: 40px; border-radius: 35px; width: 380px; text-align: center; }
.icon-success { width: 65px; height: 65px; background: #dcfce7; color: #15803d; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; font-size: 1.8rem; }
.modal-amount-summary { background: #f8fafc; border-radius: 20px; padding: 20px; text-align: left; }
.modal-row-item { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.9rem; color: #475569; }
.change-highlight { color: #15803d; }
.modal-footer-btns { display: flex; gap: 10px; margin-top: 25px; }
.btn-secondary-modal { flex: 1; border: none; background: #f1f5f9; padding: 15px; border-radius: 14px; font-weight: 700; color: #64748b; font-size: 0.85rem; }

/* UTILS */
.custom-scroll::-webkit-scrollbar { width: 0px; }
.animate-fade { animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.animate-slide { animation: slideIn 0.3s ease; }
@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
</style>