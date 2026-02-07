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
const payMethod = ref('CASH')

// --- FETCH DATA ---
const fetchDebts = async () => {
    try {
        const res = await axios.get(`${API_URL}/debts/`)
        debts.value = res.data
    } catch (e) { console.error("Gagal load hutang") }
}

const fetchMenus = async () => {
    try {
        const res = await axios.get(`${API_URL}/menu/`)
        menus.value = res.data
    } catch (e) { console.error("Gagal load menu") }
}

// --- 🔵 LOGIKA: HAPUS ITEM SPESIFIK (DI DALAM KARTU) ---
const removeDebtItem = async (debtItemId, itemName) => {
    if(!confirm(`Hapus "${itemName}"? Stok akan dikembalikan ke gudang.`)) return
    isProcessing.value = true
    try {
        await axios.delete(`${API_URL}/debts/items/${debtItemId}`)
        await fetchDebts() // Refresh data & total amount
    } catch (e) {
        alert("Gagal hapus item: " + (e.response?.data?.detail || e.message))
    } finally { isProcessing.value = false }
}

// --- LOGIKA: HAPUS TOTAL & PELUNASAN ---
const deleteDebt = async (id) => {
    if(confirm("PERINGATAN: Menghapus catatan ini akan menghapus data di Buku Hutang DAN Sales History. Lanjutkan?")) {
        await axios.delete(`${API_URL}/debts/${id}`)
        fetchDebts()
    }
}

const openPayModal = (debt) => {
    selectedDebtToPay.value = debt
    payMethod.value = 'CASH'
    showPayModal.value = true
}

const confirmPelunasan = async () => {
    if(!selectedDebtToPay.value) return
    isProcessing.value = true
    try {
        await axios.put(`${API_URL}/debts/${selectedDebtToPay.value.id}/pay`, {
            payment_method: payMethod.value
        })
        showPayModal.value = false
        fetchDebts()
    } catch (e) { alert("Gagal proses pelunasan") } 
    finally { isProcessing.value = false }
}

// --- 🟢 FIX: LOGIKA TAMBAH ITEM (MODAL) ---
const openAddModal = (debt) => {
    selectedDebt.value = debt
    tempItems.value = [] // Reset daftar sementara
    searchQuery.value = "" // Reset pencarian
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
    if (!selectedDebt.value || tempItems.value.length === 0) return
    isProcessing.value = true
    try {
        // Kirim ke endpoint POST /debts/{id}/items
        await axios.post(`${API_URL}/debts/${selectedDebt.value.id}/items`, tempItems.value)
        alert("Item berhasil ditambahkan & stok dipotong!")
        showAddModal.value = false
        fetchDebts()
    } catch (e) { 
        alert("Gagal menambah item. Cek koneksi server.")
    } finally { isProcessing.value = false }
}

// --- LOGIKA CETAK (BLUETOOTH) ---
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
        const init = '\x1B\x40', center = '\x1B\x61\x01', left = '\x1B\x61\x00', boldOn = '\x1B\x45\x01', boldOff = '\x1B\x45\x00', feed = '\x0A\x0A\x0A'

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

onMounted(() => { fetchDebts(); fetchMenus() })
</script>

<template>
  <div class="page-container p-3 p-md-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h4 class="fw-bold brand-text m-0">Buku Hutang</h4>
            <p class="text-muted small">Kelola catatan bon pelanggan</p>
        </div>
        <button @click="fetchDebts" class="btn btn-sm btn-outline-success rounded-pill px-3 shadow-sm bg-white" :disabled="isProcessing">
            <i class="fas fa-sync me-1" :class="{'fa-spin': isProcessing}"></i> Refresh
        </button>
    </div>

    <div class="row g-3">
        <div v-for="debt in debts" :key="debt.id" class="col-md-6 col-lg-4">
            <div class="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white position-relative card-debt">
                <button @click="deleteDebt(debt.id)" class="btn-delete" title="Hapus Total">
                    <i class="fas fa-times"></i>
                </button>

                <div class="d-flex justify-content-between mb-3">
                    <span class="badge bg-danger-soft text-danger rounded-pill px-3">Belum Lunas</span>
                    <small class="text-muted fw-bold">{{ new Date(debt.created_at).toLocaleDateString('id-ID') }}</small>
                </div>
                
                <h5 class="fw-bold brand-text mb-1">{{ debt.customer_name }}</h5>
                <h4 class="fw-bold text-dark mb-3">Rp {{ debt.total_amount.toLocaleString() }}</h4>

                <div class="border-top border-dashed pt-3 flex-grow-1 mb-4">
                    <div v-for="item in debt.items" :key="item.id" class="d-flex justify-content-between align-items-center x-small mb-2">
                        <div class="d-flex align-items-center gap-2">
                            <button @click="removeDebtItem(item.id, item.menu_name)" class="btn-minus-item" :disabled="isProcessing">
                                <i class="fas fa-minus-circle"></i>
                            </button>
                            <span class="fw-bold">{{ item.menu_name }} x{{ item.quantity }}</span>
                        </div>
                        <span class="text-muted">Rp {{ (item.quantity * item.price_at_moment).toLocaleString() }}</span>
                    </div>
                </div>

                <div class="card-footer-actions">
                    <button @click="printReceipt(debt)" class="btn-footer-outline" :disabled="isPrinting">
                        <i class="fas fa-print"></i>
                    </button>
                    <button @click="openAddModal(debt)" class="btn-footer-success">
                        <i class="fas fa-plus me-1"></i> ITEM
                    </button>
                    <button @click="openPayModal(debt)" class="btn-footer-primary">
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
        <div class="modal-box bg-white p-4 rounded-5 shadow-lg w-100 mx-3" style="max-width: 480px;">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="fw-bold m-0">Tambah: {{ selectedDebt?.customer_name }}</h5>
                <button class="btn-close" @click="showAddModal = false"></button>
            </div>

            <div class="input-group mb-3 bg-light rounded-pill px-3 py-1">
                <span class="input-group-text border-0 bg-transparent text-muted"><i class="fas fa-search"></i></span>
                <input v-model="searchQuery" class="form-control border-0 bg-transparent" placeholder="Cari menu...">
            </div>
            
            <div class="menu-selection-scroll mb-3 border rounded-4 bg-light overflow-auto" style="max-height: 220px;">
                <div v-for="m in filteredMenus" :key="m.id" @click="addToTemp(m)" class="p-3 border-bottom menu-row-action">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <p class="fw-bold m-0 small">{{ m.name }}</p>
                            <small class="text-muted">Rp {{ m.price.toLocaleString() }}</small>
                        </div>
                        <i class="fas fa-plus-circle text-success"></i>
                    </div>
                </div>
            </div>

            <div v-if="tempItems.length > 0" class="p-3 bg-success-soft rounded-4 mb-3 border border-success border-opacity-10">
                <p class="x-small fw-bold text-success text-uppercase mb-2">Item Baru:</p>
                <div v-for="(ti, idx) in tempItems" :key="idx" class="d-flex justify-content-between align-items-center mb-1 small">
                    <span>{{ ti.menu_name }} x{{ ti.quantity }}</span>
                    <button class="btn btn-sm text-danger p-0" @click="tempItems.splice(idx,1)"><i class="fas fa-times-circle"></i></button>
                </div>
            </div>

            <button class="btn btn-footer-primary w-100 py-3 rounded-pill" @click="submitAdditionalItems" :disabled="tempItems.length === 0 || isProcessing">
                <i v-if="isProcessing" class="fas fa-spinner fa-spin me-2"></i>
                {{ isProcessing ? 'Menyimpan...' : 'Simpan & Update Watchlist' }}
            </button>
        </div>
    </div>

    <div v-if="showPayModal" class="modal-overlay">
        <div class="modal-box bg-white p-4 rounded-5 shadow-lg w-100 mx-3" style="max-width: 400px;">
            <div class="text-center mb-4">
                <h5 class="fw-bold m-0">Konfirmasi Pelunasan</h5>
                <p class="text-muted small">{{ selectedDebtToPay?.customer_name }}</p>
                <h4 class="fw-900 text-success">Rp {{ selectedDebtToPay?.total_amount.toLocaleString() }}</h4>
            </div>

            <div class="d-flex gap-2 mb-4">
                <button class="btn-pay-toggle" :class="{ 'active': payMethod === 'CASH' }" @click="payMethod = 'CASH'">CASH</button>
                <button class="btn-pay-toggle" :class="{ 'active': payMethod === 'QRIS' }" @click="payMethod = 'QRIS'">QRIS</button>
            </div>

            <div class="d-flex gap-2">
                <button class="btn btn-light rounded-pill flex-grow-1" @click="showPayModal = false">BATAL</button>
                <button class="btn btn-footer-primary flex-grow-2" @click="confirmPelunasan">PROSES LUNAS</button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* --- TATA LETAK FOOTER KARTU (Symmetry Fix) --- */
.card-footer-actions { display: flex; gap: 8px; width: 100%; margin-top: auto; }
.card-footer-actions button { 
    border: none; border-radius: 12px; padding: 12px 5px; 
    font-weight: 800; font-size: 0.75rem; display: flex; 
    align-items: center; justify-content: center; transition: 0.2s;
}
.btn-footer-outline { flex: 0.5; background: #f8f9fa; color: #333; border: 1px solid #eee !important; }
.btn-footer-success { flex: 1; background: #f0fdf4; color: #15803d; }
.btn-footer-primary { flex: 1.5; background: #2c4a3b; color: white; }

/* --- STYLE HAPUS PER ITEM --- */
.btn-minus-item { background: transparent; border: none; color: #ffcccc; padding: 0; cursor: pointer; transition: 0.2s; }
.btn-minus-item:hover { color: #dc3545; }

/* --- MODAL & MISC --- */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.bg-success-soft { background-color: #f0fdf4; }
.menu-row-action { cursor: pointer; transition: 0.2s; }
.menu-row-action:hover { background-color: #e6f7ed; }
.btn-pay-toggle { flex: 1; border: 2px solid #eee; background: #f8f9fa; padding: 12px; border-radius: 15px; font-weight: bold; color: #888; }
.btn-pay-toggle.active { border-color: #2c4a3b; background: #e6f0eb; color: #2c4a3b; }
.card-debt { border: 1px solid #f1f5f2 !important; }
.border-dashed { border-top: 1px dashed #e2e8f0 !important; }
.x-small { font-size: 0.75rem; }
.btn-delete { position: absolute; top: 15px; right: 15px; border: none; background: #f8f9fa; color: #ccc; border-radius: 50%; width: 26px; height: 26px; font-size: 0.65rem; display: flex; align-items: center; justify-content: center; }
</style>