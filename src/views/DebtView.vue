<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const API_URL = "https://api.inventorycafe.space"
const debts = ref([])
const menus = ref([])
const isPrinting = ref(false)

// --- STATE UNTUK TAMBAH ITEM (CUSTOM) ---
const showAddModal = ref(false)
const selectedDebt = ref(null)
const searchQuery = ref("")
const tempItems = ref([]) // Item yang dipilih sementara di modal

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

const markAsPaid = async (id) => {
    if(confirm("Yakin hutang ini sudah dilunasi?")) {
        await axios.put(`${API_URL}/debts/${id}/pay`)
        fetchDebts()
    }
}

const deleteDebt = async (id) => {
    if(confirm("Hapus permanen catatan ini? Stok tidak akan kembali otomatis.")) {
        await axios.delete(`${API_URL}/debts/${id}`)
        fetchDebts()
    }
}

// --- LOGIKA TAMBAH ITEM KE HUTANG ---
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
    try {
        await axios.post(`${API_URL}/debts/${selectedDebt.value.id}/items`, tempItems.value)
        alert("Hutang berhasil diperbarui & stok dipotong!")
        showAddModal.value = false
        fetchDebts()
    } catch (e) { alert("Gagal menambah item") }
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
        content += `TOTAL: Rp ${debt.total_amount.toLocaleString()}\n` + boldOff + feed

        const dataArray = encoder.encode(content)
        for (let i = 0; i < dataArray.length; i += 20) {
            await characteristic.writeValue(dataArray.slice(i, i + 20))
        }
        await device.gatt.disconnect()
    } catch (e) { alert("Cetak gagal: " + e.message) } finally { isPrinting.value = false }
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
  <div class="page-container p-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold brand-text m-0">Buku Hutang (Cas Bon)</h4>
        <button @click="fetchDebts" class="btn btn-sm btn-outline-success rounded-pill px-3">Refresh</button>
    </div>

    <div class="row g-3">
        <div v-for="debt in debts" :key="debt.id" class="col-md-6 col-lg-4">
            <div class="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white position-relative card-debt">
                <button @click="deleteDebt(debt.id)" class="btn-delete"><i class="fas fa-times"></i></button>

                <div class="d-flex justify-content-between mb-3">
                    <span class="badge bg-danger-soft text-danger rounded-pill px-3">Belum Lunas</span>
                    <small class="text-muted fw-bold">{{ new Date(debt.created_at).toLocaleDateString('id-ID') }}</small>
                </div>
                
                <h5 class="fw-bold brand-text mb-1">{{ debt.customer_name }}</h5>
                <h4 class="fw-bold text-dark mb-3">Rp {{ debt.total_amount.toLocaleString() }}</h4>

                <div class="border-top border-dashed pt-3 flex-grow-1">
                    <div v-for="item in debt.items" :key="item.id" class="d-flex justify-content-between small mb-1">
                        <span>{{ item.menu_name }} x{{ item.quantity }}</span>
                        <span class="text-muted">Rp {{ (item.quantity * item.price_at_moment).toLocaleString() }}</span>
                    </div>
                </div>

                <div class="d-flex gap-2 mt-4">
                    <button @click="printReceipt(debt)" class="btn btn-outline-dark rounded-pill flex-grow-1" :disabled="isPrinting">
                        <i class="fas fa-print"></i>
                    </button>
                    <button @click="openAddModal(debt)" class="btn btn-outline-success rounded-pill flex-grow-1">
                        <i class="fas fa-plus"></i> Item
                    </button>
                    <button @click="markAsPaid(debt.id)" class="btn btn-primary-rounded flex-grow-2">
                        Pelunasan
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div v-if="showAddModal" class="modal-overlay">
        <div class="modal-box bg-white p-4 rounded-5 shadow-lg w-100" style="max-width: 500px;">
            <div class="d-flex justify-content-between mb-3">
                <h5 class="fw-bold m-0">Tambah Hutang: {{ selectedDebt?.customer_name }}</h5>
                <button class="btn-close" @click="showAddModal = false"></button>
            </div>

            <input v-model="searchQuery" class="form-control rounded-pill mb-3" placeholder="Cari menu...">
            
            <div class="menu-selection overflow-auto mb-3" style="max-height: 200px;">
                <div v-for="m in filteredMenus" :key="m.id" @click="addToTemp(m)" class="p-2 border-bottom small cursor-pointer">
                    {{ m.name }} - <span class="accent-text">Rp {{ m.price.toLocaleString() }}</span>
                </div>
            </div>

            <div v-if="tempItems.length > 0" class="selected-list p-3 bg-light rounded-4 mb-3">
                <div v-for="(ti, idx) in tempItems" :key="idx" class="d-flex justify-content-between small mb-1">
                    <span>{{ ti.menu_name }} x{{ ti.quantity }}</span>
                    <button class="btn btn-sm text-danger p-0" @click="tempItems.splice(idx,1)">Hapus</button>
                </div>
            </div>

            <button class="btn btn-primary-rounded w-100 py-3" @click="submitAdditionalItems" :disabled="tempItems.length === 0">
                Simpan Tambahan Hutang
            </button>
        </div>
    </div>
  </div>
</template>

<style scoped>
.bg-danger-soft { background-color: #fff5f5; }
.brand-text { color: #2c4a3b; }
.accent-text { color: #84a548; }
.btn-primary-rounded { background: #2c4a3b; color: white; border-radius: 50px; border: none; font-weight: bold; }
.card-debt:hover { border: 1px solid #2c4a3b !important; }
.btn-delete { position: absolute; top: 15px; right: 15px; border: none; background: #f8f9fa; color: #ddd; border-radius: 50%; width: 25px; height: 25px; font-size: 0.7rem; }
.btn-delete:hover { color: #dc3545; background: #fff5f5; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.cursor-pointer { cursor: pointer; }
.border-dashed { border-top: 2px dashed #eee !important; }
.flex-grow-2 { flex-grow: 2; }
</style>