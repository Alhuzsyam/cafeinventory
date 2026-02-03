<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

// --- KONFIGURASI API ---
const API_URL = "https://api.inventorycafe.space"

// --- STATE UTAMA ---
const debts = ref([])
const menus = ref([])
const isPrinting = ref(false)
const isProcessing = ref(false)

// --- STATE MODAL TAMBAH ITEM ---
const showAddModal = ref(false)
const selectedDebt = ref(null)
const searchQuery = ref("")
const tempItems = ref([])

// --- STATE MODAL PELUNASAN ---
const showPayModal = ref(false)
const selectedDebtToPay = ref(null)
const payMethod = ref('CASH') // Nilai ini yang akan masuk ke DB ('CASH' / 'QRIS')

// --- FETCH DATA ---
const fetchDebts = async () => {
    try {
        const res = await axios.get(`${API_URL}/debts/`)
        debts.value = res.data
    } catch (e) { console.error("Gagal load hutang:", e) }
}

const fetchMenus = async () => {
    try {
        const res = await axios.get(`${API_URL}/menu/`)
        menus.value = res.data
    } catch (e) { console.error("Gagal load menu:", e) }
}

// --- LOGIKA HAPUS & PELUNASAN ---
const deleteDebt = async (id) => {
    if(confirm("Hapus permanen catatan ini? Stok tidak akan kembali otomatis.")) {
        await axios.delete(`${API_URL}/debts/${id}`)
        fetchDebts()
    }
}

const openPayModal = (debt) => {
    selectedDebtToPay.value = debt
    payMethod.value = 'CASH' // Reset ke CASH setiap modal dibuka
    showPayModal.value = true
}

// FIX: Pastikan payload dikirim dengan benar ke Backend
const confirmPelunasan = async () => {
    if(!selectedDebtToPay.value) return
    isProcessing.value = true
    try {
        // payload { payment_method: "CASH" } atau { payment_method: "QRIS" }
        await axios.put(`${API_URL}/debts/${selectedDebtToPay.value.id}/pay`, {
            payment_method: payMethod.value
        })
        
        alert(`Sukses! Hutang ${selectedDebtToPay.value.customer_name} dilunasi via ${payMethod.value}`)
        showPayModal.value = false
        fetchDebts()
    } catch (e) {
        console.error(e)
        alert("Gagal proses pelunasan. Cek koneksi server.")
    } finally { isProcessing.value = false }
}

// --- LOGIKA TAMBAH ITEM (CUSTOM) ---
const openAddModal = (debt) => {
    selectedDebt.value = debt
    tempItems.value = []
    showAddModal.value = true
}

const addToTemp = (menu) => {
    const existing = tempItems.value.find(i => i.menu_item_id === menu.id)
    if (existing) {
        existing.quantity++
    } else {
        tempItems.value.push({
            menu_item_id: menu.id,
            menu_name: menu.name,
            quantity: 1,
            price_at_moment: menu.price
        })
    }
}

const submitAdditionalItems = async () => {
    if (tempItems.value.length === 0) return
    isProcessing.value = true
    try {
        await axios.post(`${API_URL}/debts/${selectedDebt.value.id}/items`, tempItems.value)
        alert("Hutang diperbarui & stok dipotong!")
        showAddModal.value = false
        fetchDebts()
    } catch (e) { alert("Gagal menambah item") }
    finally { isProcessing.value = false }
}

// --- LOGIKA CETAK STRUK BLUETOOTH ---
const printReceipt = async (debt) => {
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
        const init = '\x1B\x40', center = '\x1B\x61\x01', left = '\x1B\x61\x00'
        const boldOn = '\x1B\x45\x01', boldOff = '\x1B\x45\x00', feed = '\x0A\x0A\x0A'

        let content = init + center + boldOn + "DEGENTONG CAFE\n" + boldOff
        content += "Buku Hutang (Bon)\n--------------------------------\n" + left
        content += `Tgl : ${new Date(debt.created_at).toLocaleString('id-ID')}\n`
        content += `Plg : ${debt.customer_name}\n--------------------------------\n`

        debt.items.forEach(i => {
            content += `${i.menu_name}\n${i.quantity} x ${i.price_at_moment.toLocaleString()} = ${(i.quantity * i.price_at_moment).toLocaleString()}\n`
        })

        content += "--------------------------------\n" + boldOn
        content += `TOTAL TAGIHAN: Rp ${debt.total_amount.toLocaleString()}\n` + boldOff + feed

        const dataArray = encoder.encode(content)
        for (let i = 0; i < dataArray.length; i += 20) {
            await characteristic.writeValue(dataArray.slice(i, i + 20))
        }
        await device.gatt.disconnect()
    } catch (e) { alert("Cetak gagal: " + e.message) } 
    finally { isPrinting.value = false }
}

const filteredMenus = computed(() => {
    return menus.value.filter(m => m.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

onMounted(() => {
    fetchDebts()
    fetchMenus()
})
</script>

<template>
  <div class="page-container p-3 p-md-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h4 class="fw-bold brand-text m-0">Buku Hutang</h4>
            <p class="text-muted small">Kelola catatan bon pelanggan</p>
        </div>
        <button @click="fetchDebts" class="btn btn-sm btn-outline-success rounded-pill px-3 shadow-sm bg-white">
            <i class="fas fa-sync me-1"></i> Refresh
        </button>
    </div>

    <div class="row g-3">
        <div v-for="debt in debts" :key="debt.id" class="col-md-6 col-lg-4">
            <div class="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white position-relative card-debt">
                <button @click="deleteDebt(debt.id)" class="btn-delete" title="Hapus Catatan">
                    <i class="fas fa-times"></i>
                </button>

                <div class="d-flex justify-content-between mb-3">
                    <span class="badge bg-danger-soft text-danger rounded-pill px-3">Belum Lunas</span>
                    <small class="text-muted fw-bold">{{ new Date(debt.created_at).toLocaleDateString('id-ID') }}</small>
                </div>
                
                <h5 class="fw-bold brand-text mb-1">{{ debt.customer_name }}</h5>
                <h4 class="fw-bold text-dark mb-3">Rp {{ debt.total_amount.toLocaleString() }}</h4>

                <div class="border-top border-dashed pt-3 flex-grow-1 mb-4">
                    <div v-for="item in debt.items" :key="item.id" class="d-flex justify-content-between x-small mb-1">
                        <span>{{ item.menu_name }} x{{ item.quantity }}</span>
                        <span class="text-muted">Rp {{ (item.quantity * item.price_at_moment).toLocaleString() }}</span>
                    </div>
                </div>

                <div class="d-flex gap-2">
                    <button @click="printReceipt(debt)" class="btn btn-outline-dark rounded-pill px-3" :disabled="isPrinting">
                        <i class="fas fa-print"></i>
                    </button>
                    <button @click="openAddModal(debt)" class="btn btn-outline-success rounded-pill flex-grow-1">
                        <i class="fas fa-plus me-1"></i> Item
                    </button>
                    <button @click="openPayModal(debt)" class="btn btn-primary-rounded flex-grow-2">
                        PELUNASAN
                    </button>
                </div>
            </div>
        </div>

        <div v-if="debts.length === 0" class="col-12 text-center py-5">
            <div class="opacity-25 mb-3"><i class="fas fa-file-invoice-dollar fa-4x"></i></div>
            <p class="text-muted">Semua hutang telah lunas. Alhamdulillah!</p>
        </div>
    </div>

    <div v-if="showAddModal" class="modal-overlay">
        <div class="modal-box bg-white p-4 rounded-5 shadow-lg w-100 mx-3" style="max-width: 500px;">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="fw-bold m-0 text-truncate">Tambah Hutang: {{ selectedDebt?.customer_name }}</h5>
                <button class="btn-close" @click="showAddModal = false"></button>
            </div>

            <div class="input-group mb-3 bg-light rounded-pill px-3 py-1">
                <span class="input-group-text border-0 bg-transparent text-muted"><i class="fas fa-search"></i></span>
                <input v-model="searchQuery" class="form-control border-0 bg-transparent" placeholder="Cari menu...">
            </div>
            
            <div class="menu-selection overflow-auto mb-3 border rounded-4 bg-light" style="max-height: 200px;">
                <div v-for="m in filteredMenus" :key="m.id" @click="addToTemp(m)" class="p-3 border-bottom small cursor-pointer menu-item-row">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="fw-bold">{{ m.name }}</span>
                        <span class="accent-text">Rp {{ m.price.toLocaleString() }}</span>
                    </div>
                </div>
            </div>

            <div v-if="tempItems.length > 0" class="selected-list p-3 bg-success-soft rounded-4 mb-3 border border-success border-opacity-10">
                <p class="x-small fw-bold text-success text-uppercase mb-2">Ditambahkan:</p>
                <div v-for="(ti, idx) in tempItems" :key="idx" class="d-flex justify-content-between align-items-center mb-1 small">
                    <span>{{ ti.menu_name }} x{{ ti.quantity }}</span>
                    <button class="btn btn-sm text-danger p-0" @click="tempItems.splice(idx,1)"><i class="fas fa-minus-circle"></i></button>
                </div>
            </div>

            <button class="btn btn-primary-rounded w-100 py-3 shadow-sm" @click="submitAdditionalItems" :disabled="tempItems.length === 0 || isProcessing">
                {{ isProcessing ? 'Memproses...' : 'Simpan & Potong Stok' }}
            </button>
        </div>
    </div>

    <div v-if="showPayModal" class="modal-overlay">
        <div class="modal-box bg-white p-4 rounded-5 shadow-lg w-100 mx-3" style="max-width: 400px;">
            <div class="text-center mb-4">
                <div class="icon-circle bg-success-soft text-success mb-3 mx-auto">
                    <i class="fas fa-hand-holding-usd fa-lg"></i>
                </div>
                <h5 class="fw-bold m-0">Konfirmasi Pelunasan</h5>
                <p class="text-muted small">{{ selectedDebtToPay?.customer_name }} - <span class="fw-bold text-dark">Rp {{ selectedDebtToPay?.total_amount.toLocaleString() }}</span></p>
            </div>

            <label class="small fw-bold text-muted mb-2 d-block">Pilih Metode Bayar:</label>
            <div class="d-flex gap-2 mb-4">
                <button 
                    class="btn btn-pay-option flex-grow-1" 
                    :class="{ 'active': payMethod === 'CASH' }" 
                    @click="payMethod = 'CASH'"
                >
                    <i class="fas fa-money-bill-wave"></i>CASH
                </button>
                <button 
                    class="btn btn-pay-option flex-grow-1" 
                    :class="{ 'active': payMethod === 'QRIS' }" 
                    @click="payMethod = 'QRIS'"
                >
                    <i class="fas fa-qrcode"></i>QRIS
                </button>
            </div>

            <div class="d-flex gap-2">
                <button class="btn btn-light rounded-pill flex-grow-1 py-2 fw-bold" @click="showPayModal = false" :disabled="isProcessing">BATAL</button>
                <button class="btn btn-primary-rounded flex-grow-2 py-2 shadow-sm" @click="confirmPelunasan" :disabled="isProcessing">
                    {{ isProcessing ? '...' : 'PROSES LUNAS' }}
                </button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* Styling sama seperti sebelumnya, pastikan .active pada .btn-pay-option terlihat jelas */
.brand-text { color: #2c4a3b; }
.accent-text { color: #84a548; }
.bg-danger-soft { background-color: #fff5f5; }
.bg-success-soft { background-color: #f0fdf4; }

.btn-primary-rounded { background: #2c4a3b; color: white; border-radius: 50px; border: none; font-weight: bold; transition: 0.2s; }
.btn-primary-rounded:hover { background: #1e3328; transform: translateY(-2px); }

.card-debt { transition: 0.3s ease; border: 1px solid transparent !important; }
.card-debt:hover { transform: translateY(-5px); border-color: #e6f0eb !important; box-shadow: 0 10px 25px rgba(44,74,59,0.08) !important; }

.btn-delete { 
    position: absolute; top: 15px; right: 15px; border: none; background: #f8f9fa; 
    color: #ccc; border-radius: 50%; width: 28px; height: 28px; font-size: 0.7rem; 
    display: flex; align-items: center; justify-content: center; transition: 0.3s;
}
.btn-delete:hover { color: #dc3545; background: #fff5f5; }

.modal-overlay { 
    position: fixed; inset: 0; background: rgba(0,0,0,0.4); 
    backdrop-filter: blur(8px); display: flex; align-items: center; 
    justify-content: center; z-index: 2000; 
}
.icon-circle { width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

/* Tampilan Tombol Metode Bayar */
.btn-pay-option {
    background: #f8f9fa; border: 2px solid #eee; border-radius: 15px; 
    padding: 12px; font-weight: bold; color: #888; transition: 0.3s;
}
.btn-pay-option i { display: block; font-size: 1.2rem; margin-bottom: 5px; }
.btn-pay-option.active { 
    background: #e6f0eb; 
    border-color: #2c4a3b; 
    color: #2c4a3b; 
    box-shadow: 0 4px 10px rgba(44,74,59,0.15);
}

.cursor-pointer { cursor: pointer; }
.x-small { font-size: 0.75rem; line-height: 1.4; }
.border-dashed { border-top: 1px dashed #eee !important; }
.flex-grow-2 { flex-grow: 2; }
</style>