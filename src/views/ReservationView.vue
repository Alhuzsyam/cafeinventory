<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const API_URL = "https://api.inventorycafe.space"
const reservations = ref([])
const availableMenus = ref([])
const isProcessing = ref(false)
const isPrinting = ref(false)

// State Modals
const showFulfillModal = ref(false)
const showAddMenuModal = ref(false)
const showDetailModal = ref(false)

const selectedRes = ref(null)
const finalMethod = ref('CASH')
const tempCart = ref([]) 
const menuSearch = ref("")

// --- FETCH DATA ---
const fetchReservations = async () => {
    try {
        const res = await axios.get(`${API_URL}/reservations/`)
        reservations.value = res.data
    } catch (e) { console.error("Gagal mengambil data reservasi") }
}

const fetchMenus = async () => {
    try {
        const res = await axios.get(`${API_URL}/menu/`)
        availableMenus.value = res.data
    } catch (e) { console.error("Gagal mengambil data menu") }
}

const filteredMenus = computed(() => {
    return availableMenus.value.filter(m => m.name.toLowerCase().includes(menuSearch.value.toLowerCase()))
})

// --- LOGIKA BARU: PROSES KE DAPUR ---
const processToKitchen = async (res) => {
    if (!confirm(`Kirim pesanan ${res.customer_name} ke dapur sekarang? Stok akan otomatis dipotong.`)) return
    
    isProcessing.value = true
    try {
        await axios.put(`${API_URL}/reservations/${res.id}/process-kitchen`)
        alert("👨‍🍳 Berhasil! Pesanan dikirim ke Dapur.")
        fetchReservations() 
    } catch (e) {
        alert("Gagal mengirim ke dapur. Coba lagi.")
    } finally {
        isProcessing.value = false
    }
}

// --- LOGIKA TAMBAH MENU KE RESERVASI ---
const openAddMenu = (res) => {
    selectedRes.value = res
    tempCart.value = []
    menuSearch.value = ""
    showAddMenuModal.value = true
    if (availableMenus.value.length === 0) fetchMenus()
}

const addToTempCart = (menu) => {
    const exist = tempCart.value.find(i => i.menu_item_id === menu.id)
    if (exist) {
        exist.quantity++
    } else {
        tempCart.value.push({
            menu_item_id: menu.id,
            menu_name: menu.name,
            price_at_moment: menu.price,
            quantity: 1,
            note: ""
        })
    }
}

const removeTempCart = (index) => {
    tempCart.value.splice(index, 1)
}

const totalTempCart = computed(() => {
    return tempCart.value.reduce((total, item) => total + (item.price_at_moment * item.quantity), 0)
})

const submitAdditionalItems = async () => {
    if (tempCart.value.length === 0) return alert("Pilih menu terlebih dahulu!")
    
    isProcessing.value = true
    try {
        await axios.post(`${API_URL}/reservations/${selectedRes.value.id}/items`, tempCart.value)
        alert("✅ Menu tambahan berhasil dimasukkan!")
        showAddMenuModal.value = false
        fetchReservations() 
    } catch (e) {
        alert("Gagal menambah pesanan.")
    } finally {
        isProcessing.value = false
    }
}

// --- LOGIKA DETAIL PESANAN ---
const openDetail = (res) => {
    selectedRes.value = res
    showDetailModal.value = true
}

// --- LOGIKA PELUNASAN ---
const openFulfill = (res) => {
    selectedRes.value = res
    showFulfillModal.value = true
}

const confirmFulfill = async () => {
    isProcessing.value = true
    try {
        await axios.put(`${API_URL}/reservations/${selectedRes.value.id}/fulfill`, {
            payment_method: finalMethod.value
        })
        alert("✅ Pembayaran Lunas!")
        showFulfillModal.value = false
        fetchReservations()
    } catch (e) {
        alert("Gagal memproses pelunasan.")
    } finally {
        isProcessing.value = false
    }
}

// --- 🖨️ FUNGSI PRINTER (REUSABLE) ---
const sendToPrinter = async (content) => {
    isPrinting.value = true
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        })
        const server = await device.gatt.connect()
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb')
        const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb')

        const encoder = new TextEncoder()
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

// --- FUNGSI HELPER: GROUPING ITEM ---
const groupItems = (items) => {
    if (!items) return []
    const grouped = {}
    items.forEach(item => {
        if (grouped[item.menu_name]) {
            grouped[item.menu_name].quantity += item.quantity
        } else {
            grouped[item.menu_name] = { ...item }
        }
    })
    return Object.values(grouped)
}

// --- 🖨️ CETAK 1: STRUK BUKTI DP ---
const printDPReceipt = async (res) => {
    const init = '\x1B\x40', center = '\x1B\x61\x01', left = '\x1B\x61\x00'
    const boldOn = '\x1B\x45\x01', boldOff = '\x1B\x45\x00', feed = '\x0A\x0A\x0A'

    let content = init + center + boldOn + "DEGENTONG CAFE\n" + boldOff
    content += "BUKTI RESERVASI (DP)\n"
    content += "--------------------------------\n" + left
    content += `Plg : ${res.customer_name}\n`
    content += `Tgl Datang: ${formatDate(res.reservation_date)}\n`
    content += "--------------------------------\n"

    // Menggunakan Item yang sudah di-group
    const groupedItems = groupItems(res.items)

    if (groupedItems.length > 0) {
        groupedItems.forEach(item => {
            content += `${item.menu_name}\n`
            content += `${item.quantity} x ${item.price_at_moment.toLocaleString()} = ${(item.quantity * item.price_at_moment).toLocaleString()}\n`
        })
        content += "--------------------------------\n"
    }

    content += `Total Order : Rp ${res.total_amount.toLocaleString()}\n`
    content += boldOn + `DP (${res.dp_method})   : Rp ${res.dp_amount.toLocaleString()}\n` + boldOff
    content += `SISA TAGIHAN: Rp ${(res.total_amount - res.dp_amount).toLocaleString()}\n`
    content += feed

    await sendToPrinter(content)
}

// --- 🖨️ CETAK 2: LIST PESANAN ---
const printOrderList = async (res) => {
    const init = '\x1B\x40', center = '\x1B\x61\x01', left = '\x1B\x61\x00'
    const boldOn = '\x1B\x45\x01', boldOff = '\x1B\x45\x00', feed = '\x0A\x0A\x0A'

    let content = init + center + boldOn + "LIST PESANAN\n" + boldOff
    content += `Plg: ${res.customer_name}\n`
    content += "--------------------------------\n" + left

    // Menggunakan Item yang sudah di-group
    const groupedItems = groupItems(res.items)

    if (groupedItems.length > 0) {
        groupedItems.forEach(item => {
            content += `${item.quantity}x ${item.menu_name}\n`
            if (item.note && item.note.trim() !== '') {
                 content += `   *Catatan: ${item.note}\n`
            }
        })
    }
    content += "--------------------------------\n" + feed
    
    await sendToPrinter(content)
}

// Computasi untuk Grouping List di Layar (Modal Detail)
const detailGroupedItems = computed(() => {
    return groupItems(selectedRes.value?.items)
})

onMounted(fetchReservations)
const formatDate = (dateStr) => new Date(dateStr).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
</script>

<template>
  <div class="reservation-page p-4">
    <header class="mb-5">
      <h1 class="fw-800 text-dark">Daftar <span class="text-sage">Reservasi</span> 🗓️</h1>
      <p class="text-muted">Kelola DP, Proses Dapur, dan Pelunasan.</p>
    </header>

    <div class="row g-4">
        <div v-for="res in reservations" :key="res.id" class="col-md-4">
            <div class="elegant-card shadow-sm p-4 h-100 d-flex flex-column" :class="{'border-orange': res.status === 'PROCESSING'}">
                <div class="d-flex justify-content-between align-items-start mb-3 border-bottom pb-3">
                    <div>
                        <h3 class="fw-bold m-0">{{ res.customer_name }}</h3>
                        <span class="badge-meja mt-1">Meja: {{ res.table_number || 'TBD' }}</span>
                        <span v-if="res.status === 'PROCESSING'" class="badge-cooking ms-1">DI DAPUR</span>
                    </div>
                    <div class="date-badge text-end">
                        <small class="text-muted d-block fw-bold">Datang:</small>
                        <span class="fw-bold text-sage small">{{ formatDate(res.reservation_date) }}</span>
                    </div>
                </div>

                <div class="finance-box p-3 mb-4">
                    <div class="d-flex justify-content-between mb-1 small text-muted fw-bold">
                        <span>Total Bill</span><span>Rp{{ res.total_amount.toLocaleString() }}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-1 small text-success">
                        <span>DP</span><span>Rp{{ res.dp_method.toLocaleString() }}</span>
                    </div>
                    <div class="d-flex justify-content-between fw-900 text-danger pt-1">
                        <span>Sisa Bayar</span><span>Rp{{ (res.total_amount - res.dp_amount).toLocaleString() }}</span>
                    </div>
                </div>

                <div class="d-flex gap-2 mt-auto">
                    <button class="btn-outline-sage flex-grow-0 px-3" @click="printDPReceipt(res)" title="Struk DP"><i class="fa-solid fa-receipt"></i></button>
                    <button class="btn-outline-sage flex-grow-0 px-3" @click="openAddMenu(res)" title="Tambah Item"><i class="fa-solid fa-cart-plus"></i></button>
                    <button class="btn-outline-sage flex-grow-0 px-3" @click="openDetail(res)" title="Lihat List"><i class="fa-solid fa-list-ul"></i></button>
                    
                    <button v-if="res.status === 'PENDING'" class="btn-orange flex-grow-1 shadow-sm" @click="processToKitchen(res)" :disabled="isProcessing">
                        MASAK
                    </button>
                    <button v-else class="btn-coral flex-grow-1 shadow-sm" @click="openFulfill(res)">
                        LUNAS
                    </button>
                </div>
            </div>
        </div>

        <div v-if="reservations.length === 0" class="col-12 text-center py-5">
            <i class="fa-regular fa-calendar-xmark fa-4x text-muted mb-3 opacity-25"></i>
            <h4 class="text-muted fw-bold">Belum ada reservasi aktif</h4>
        </div>
    </div>

    <div v-if="showDetailModal" class="modal-backdrop">
        <div class="modal-content animate-up shadow-2xl">
            <h4 class="fw-800 text-dark mb-4">Rincian Pesanan</h4>
            <div class="bg-light-gray p-3 rounded-3 mb-4 text-start">
                <ul class="list-unstyled custom-scroll m-0" style="max-height: 250px; overflow-y: auto;">
                    <li v-for="item in detailGroupedItems" :key="item.menu_item_id" class="d-flex justify-content-between mb-2 border-bottom-dashed pb-1">
                        <span><b class="text-sage">{{ item.quantity }}x</b> {{ item.menu_name }}</span>
                        <span class="text-muted small">Rp{{ (item.price_at_moment * item.quantity).toLocaleString() }}</span>
                    </li>
                    <li v-if="detailGroupedItems.length === 0" class="text-center text-muted py-3">
                        Daftar pesanan tidak ditemukan di sistem.
                    </li>
                </ul>
                <div class="d-flex justify-content-between mt-3 pt-2 border-top fw-bold">
                    <span>TOTAL TAGIHAN</span>
                    <span>Rp{{ selectedRes?.total_amount.toLocaleString() }}</span>
                </div>
            </div>
            <div class="d-flex gap-2">
                <button class="btn-secondary-modal w-50" @click="showDetailModal = false">TUTUP</button>
                <button class="btn-coral w-50" @click="printOrderList(selectedRes)" :disabled="isPrinting || detailGroupedItems.length === 0">
                   <i v-if="isPrinting" class="fa-solid fa-spinner fa-spin me-2"></i> PRINTER LIST
                </button>
            </div>
        </div>
    </div>

    <div v-if="showAddMenuModal" class="modal-backdrop">
        <div class="modal-content modal-large animate-up shadow-2xl">
            <h4 class="fw-800 text-dark mb-4">Tambah Menu</h4>
            <div class="row text-start flex-grow-1 overflow-hidden">
                <div class="col-md-6 border-end pe-3">
                    <input v-model="menuSearch" type="text" class="form-control mb-3" placeholder="Cari menu...">
                    <div class="menu-list custom-scroll" style="max-height: 300px; overflow-y: auto;">
                        <div v-for="menu in filteredMenus" :key="menu.id" class="p-2 border-bottom d-flex justify-content-between align-items-center">
                            <span class="small fw-bold">{{ menu.name }}</span>
                            <button class="btn btn-sm btn-outline-success" @click="addToTempCart(menu)">+</button>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 bg-light-gray rounded p-3">
                    <h6 class="fw-bold mb-3 small text-muted">Keranjang Tambahan:</h6>
                    <div class="custom-scroll" style="max-height: 230px; overflow-y: auto;">
                        <div v-for="(item, idx) in tempCart" :key="idx" class="d-flex justify-content-between mb-2 bg-white p-2 rounded shadow-xs">
                            <span class="small fw-bold text-truncate" style="max-width: 120px;">{{ item.menu_name }}</span>
                            <div class="d-flex align-items-center gap-2">
                                <button class="btn btn-sm border bg-light" @click="item.quantity > 1 ? item.quantity-- : removeTempCart(idx)">-</button>
                                <span class="small fw-bold">{{ item.quantity }}</span>
                                <button class="btn btn-sm border bg-light" @click="item.quantity++">+</button>
                            </div>
                        </div>
                        <div v-if="tempCart.length === 0" class="text-center text-muted small mt-4">Belum ada tambahan</div>
                    </div>
                    <div class="mt-3 pt-2 border-top text-end fw-bold text-danger">Total: Rp{{ totalTempCart.toLocaleString() }}</div>
                </div>
            </div>
            <div class="d-flex gap-2 mt-4">
                <button class="btn-secondary-modal w-50" @click="showAddMenuModal = false">BATAL</button>
                <button class="btn-coral w-50" @click="submitAdditionalItems" :disabled="isProcessing || tempCart.length === 0">SIMPAN TAGIHAN</button>
            </div>
        </div>
    </div>

    <div v-if="showFulfillModal" class="modal-backdrop">
        <div class="modal-content animate-up shadow-2xl">
            <h3 class="fw-800 mb-4">Pelunasan</h3>
            <div class="bg-light-gray p-3 rounded-3 mb-4 text-start">
                <small class="text-muted fw-bold">Sisa Tagihan yang harus dibayar:</small>
                <h2 class="text-danger fw-900 m-0 mt-1">Rp{{ (selectedRes?.total_amount - selectedRes?.dp_amount).toLocaleString() }}</h2>
            </div>
            <div class="text-start mb-4">
                 <label class="fw-bold small text-muted">Metode Pembayaran:</label>
                <div class="pay-method-pill mt-2">
                    <button :class="{ active: finalMethod === 'CASH' }" @click="finalMethod = 'CASH'">CASH</button>
                    <button :class="{ active: finalMethod === 'QRIS' }" @click="finalMethod = 'QRIS'">QRIS</button>
                </div>
            </div>
            <div class="d-flex gap-2">
                <button class="btn-secondary-modal w-50" @click="showFulfillModal = false" :disabled="isProcessing">BATAL</button>
                <button class="btn-coral w-50" @click="confirmFulfill" :disabled="isProcessing">
                    <i v-if="isProcessing" class="fa-solid fa-spinner fa-spin me-2"></i> LUNASI
                </button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS Variabel & Tema */
.text-sage { color: #84a548; }
.bg-light-gray { background-color: #F8F9FA; }

.btn-coral { background: #84a548; color: white; border: none; border-radius: 14px; font-weight: 800; padding: 12px; transition: 0.3s;}
.btn-coral:hover { background: #718f3d; }
.btn-coral:disabled { background: #cbd5e1; cursor: not-allowed;}

.btn-orange { background: #f97316; color: white; border: none; border-radius: 14px; font-weight: 800; padding: 12px; transition: 0.3s;}
.btn-orange:hover { background: #ea580c; }
.btn-orange:disabled { background: #cbd5e1; cursor: not-allowed;}

.btn-outline-sage { border: 2px solid #84a548; color: #84a548; background: white; border-radius: 14px; padding: 10px; transition: 0.3s;}
.btn-outline-sage:hover { background: #f0fdf4; }

.border-orange { border: 2px solid #f97316 !important; }
.badge-cooking { background: #ffedd5; color: #9a3412; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 0.65rem; }

.elegant-card { background: white; border-radius: 24px; border: 1px solid #f1f5f9; transition: 0.3s;}
.finance-box { background: #f8fafc; border-radius: 16px; border: 1px dashed #cbd5e1; }
.badge-meja { background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 0.7rem; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.modal-content { background: white; padding: 30px; border-radius: 30px; width: 400px; text-align: center; }
.modal-large { width: 650px; }

.border-bottom-dashed { border-bottom: 1px dashed #ddd; }
.pay-method-pill { display: flex; background: #e2e8f0; padding: 4px; border-radius: 100px; }
.pay-method-pill button { flex: 1; border: none; background: transparent; padding: 10px; border-radius: 100px; font-weight: 800; color: #64748b; transition: 0.3s;}
.pay-method-pill button.active { background: #1e293b; color: white; }

.btn-secondary-modal { border: none; background: #f1f5f9; padding: 12px; border-radius: 14px; font-weight: 700; color: #64748b; transition: 0.3s;}
.btn-secondary-modal:hover { background: #e2e8f0; }

.form-control { border: 1.5px solid #e2e8f0; padding: 10px; border-radius: 10px; width: 100%; outline: none;}

.animate-up { animation: slideUp 0.3s ease; }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
</style>