<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

// --- KONFIGURASI ---
const API_URL = "https://api.inventorycafe.space"
const sales = ref([])
const selectedSale = ref(null)
const searchQuery = ref("")
const filterDate = ref(new Date().toISOString().substr(0, 10))
const isPrinting = ref(false)

// --- FETCH DATA (Memanfaatkan hasil JOIN dari Backend) ---
const fetchHistory = async () => {
    try {
        const res = await axios.get(`${API_URL}/sales/history`, {
            params: { search: searchQuery.value, date: filterDate.value }
        })
        console.log(res);
        sales.value = res.data
        // Pilih otomatis transaksi pertama jika ada
        if (sales.value.length > 0 && !selectedSale.value) {
            selectedSale.value = sales.value[0]
        }
    } catch (e) { console.error("Gagal load history:", e) }
}

const selectSale = (sale) => {
    selectedSale.value = sale
}

// --- HELPER: RINGKASAN NAMA ITEM UNTUK DAFTAR KIRI ---
const getProductSummary = (items) => {
    if (!items || items.length === 0) return "Tanpa item";
    // Mengambil menu_item.name (Hasil Eager Loading/JOIN di Backend)
    return items.map(i => i.menu_item?.name || 'Menu').join(", ")
}

// --- LOGIKA CETAK ULANG (REPRINT) ---
const reprintReceipt = async (sale) => {
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
        content += "(REPRINT STRUK)\n"
        content += "--------------------------------\n" + left
        content += `ID  : TRX-${sale.id}\n`
        content += `Tgl : ${new Date(sale.transaction_date).toLocaleString('id-ID')}\n`
        content += `Plg : ${sale.customer_name}\n`
        content += `Byr : ${sale.payment_method}\n`
        content += "--------------------------------\n"

        sale.items.forEach(item => {
            content += `${item.menu_item?.name || 'Menu'}\n`
            content += `${item.quantity} x ${item.price_at_moment.toLocaleString()} = ${(item.quantity * item.price_at_moment).toLocaleString()}\n`
        })

        content += "--------------------------------\n" + boldOn
        content += `TOTAL: Rp ${sale.total_amount.toLocaleString()}\n` + boldOff + feed

        const dataArray = encoder.encode(content)
        for (let i = 0; i < dataArray.length; i += 20) {
            await characteristic.writeValue(dataArray.slice(i, i + 20))
        }
        await device.gatt.disconnect()
    } catch (e) { alert("Printer Gagal: " + e.message) } 
    finally { isPrinting.value = false }
}

onMounted(fetchHistory)
</script>

<template>
  <div class="page-container p-4 bg-light-gray min-vh-100">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold text-dark">History Pemesanan</h4>
        <div class="d-flex gap-2">
            <input v-model="filterDate" type="date" @change="fetchHistory" class="form-control rounded-pill border-0 shadow-sm px-3">
            <div class="input-group shadow-sm rounded-pill overflow-hidden bg-white">
                <span class="input-group-text border-0 bg-white"><i class="fas fa-search text-muted"></i></span>
                <input v-model="searchQuery" @input="fetchHistory" class="form-control border-0 px-2" placeholder="Cari transaksi...">
            </div>
        </div>
    </div>

    <div class="row g-4">
      <div class="col-md-5">
        <div class="card-modern border-0 shadow-sm bg-white">
          <div class="card-header-modern d-flex justify-content-between align-items-center">
            <span class="fw-bold">Transactions</span>
            <div class="d-flex gap-2">
                <button class="btn-icon" @click="fetchHistory"><i class="fas fa-sync-alt"></i></button>
            </div>
          </div>
          
          <div class="list-container custom-scroll">
            <div 
              v-for="sale in sales" 
              :key="sale.id" 
              class="list-item" 
              :class="{ 'active': selectedSale?.id === sale.id }"
              @click="selectSale(sale)"
            >
              <div class="icon-wrapper">
                <i class="fas fa-file-invoice" :class="selectedSale?.id === sale.id ? 'text-white' : 'text-primary-purple'"></i>
              </div>
              <div class="item-content overflow-hidden">
                <div class="d-flex justify-content-between">
                    <span class="fw-bold text-dark text-truncate">TRX-#{{ sale.id }}</span>
                    <span v-if="selectedSale?.id === sale.id" class="text-white"><i class="fas fa-check"></i></span>
                </div>
                
                <div class="product-summary text-truncate small fw-bold" :class="selectedSale?.id === sale.id ? 'text-white-50' : 'text-purple'">
                    {{ selectedSale.payment_method }}
                </div>

                <div class="item-meta mt-1">
                    {{ new Date(sale.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) }} 
                    • By {{ sale.customer_name }}
                </div>
              </div>
            </div>
            
            <div v-if="sales.length === 0" class="p-5 text-center text-muted small">
                Belum ada transaksi ditemukan.
            </div>
          </div>
          
          <div class="card-footer-modern text-center">
            <button class="btn-show-more" @click="fetchHistory">Refresh List</button>
          </div>
        </div>
      </div>

      <div class="col-md-7">
        <div class="card-modern border-0 shadow-sm bg-white h-100">
            <div class="card-header-modern d-flex justify-content-between align-items-center">
                <span class="fw-bold">Activity Log</span>
                <button v-if="selectedSale" @click="reprintReceipt(selectedSale)" class="btn-reprint" :disabled="isPrinting">
                    <i class="fas fa-print me-1"></i> Reprint
                </button>
            </div>

            <div class="activity-container p-4 custom-scroll" v-if="selectedSale">
                <div class="activity-item">
                    <div class="activity-icon bg-yellow-soft">
                        <i class="fas fa-plus text-warning"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">
                            <strong>{{ selectedSale.customer_name }}</strong> membuat pesanan baru
                        </div>
                        <div class="activity-time">{{ new Date(selectedSale.transaction_date).toLocaleTimeString() }}</div>
                    </div>
                </div>

                <div class="activity-item" v-for="item in selectedSale.items" :key="item.id">
                    <div class="activity-icon bg-purple-soft">
                        <i class="fas fa-coffee text-purple"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">
                            Menambahkan <strong>{{ item.quantity }}x {{ item.menu_item?.name || 'Item' }}</strong> ke pesanan
                        </div>
                        <div class="activity-time">Subtotal: Rp {{ (item.quantity * item.price_at_moment).toLocaleString() }}</div>
                    </div>
                </div>

                <div class="activity-item">
                    <div class="activity-icon bg-blue-soft">
                        <i class="fas fa-check text-info"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">
                            Pembayaran diselesaikan via <strong>{{ selectedSale.payment_method }}</strong>
                        </div>
                        <div class="activity-time fw-bold text-dark fs-5">Total Transaksi: Rp {{ selectedSale.total_amount.toLocaleString() }}</div>
                    </div>
                </div>
            </div>
            
            <div v-else class="p-5 text-center text-muted">
                Pilih transaksi di sebelah kiri untuk melihat detail aktivitas.
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- VARIABLES --- */
:root {
    --purple-primary: #84a548;
    --purple-soft: #f0fdf4;
    --text-muted: #94a3b8;
}

.bg-light-gray { background-color: #f8fafc; }
.text-purple { color: #84a548; }
.text-primary-purple { color: #84a548; }

/* --- CARD STYLE --- */
.card-modern { border-radius: 16px; overflow: hidden; }
.card-header-modern { padding: 1.2rem 1.5rem; border-bottom: 1px solid #f1f5f9; }
.card-footer-modern { padding: 1rem; border-top: 1px solid #f1f5f9; }

/* --- LIST ITEM (LEFT COLUMN) --- */
.list-item {
    padding: 1rem 1.5rem;
    display: flex; gap: 15px;
    cursor: pointer; transition: 0.2s;
    border-bottom: 1px solid #f8fafc;
}
.list-item:hover { background-color: #f1f5f9; }
.list-item.active { background-color: #84a548; color: white !important; border-left: 4px solid #2c4a3b; }
.list-item.active .text-dark, .list-item.active .text-muted, .list-item.active .text-purple { color: white !important; }

.icon-wrapper {
    width: 45px; height: 45px;
    background: #f1f5f9; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
}
.list-item.active .icon-wrapper { background: rgba(255,255,255,0.2); }

.item-content { flex: 1; overflow: hidden; }
.product-summary { font-size: 0.85rem; margin-top: 2px; }
.item-meta { font-size: 0.75rem; color: #64748b; margin-top: 2px; }

/* --- ACTIVITY LOG (RIGHT COLUMN) --- */
.activity-container { position: relative; }
.activity-item { position: relative; padding-left: 50px; padding-bottom: 25px; }
.activity-item::before {
    content: ''; position: absolute;
    left: 20px; top: 40px;
    bottom: 0; width: 2px;
    background-color: #f1f5f9;
}
.activity-item:last-child::before { display: none; }
.activity-icon {
    position: absolute; left: 0; top: 0;
    width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.9rem; z-index: 2;
}
.activity-text { font-size: 0.95rem; color: #334155; line-height: 1.4; }
.activity-time { font-size: 0.8rem; color: #94a3b8; margin-top: 4px; }

/* Colors Soft */
.bg-purple-soft { background-color: #f0fdf4; }
.bg-yellow-soft { background-color: #fefce8; }
.bg-blue-soft { background-color: #eff6ff; }

/* --- BUTTONS --- */
.btn-icon { border: none; background: transparent; color: #94a3b8; padding: 4px 8px; font-size: 1.1rem; }
.btn-icon:hover { color: #84a548; }
.btn-show-more { border: 1px solid #e2e8f0; background: white; padding: 8px 24px; border-radius: 10px; font-size: 0.9rem; color: #475569; }

.btn-reprint {
    border: 1px solid #eee; background: #f8f9fa; padding: 5px 15px; border-radius: 50px; 
    font-size: 0.8rem; font-weight: bold; color: #555; transition: 0.3s;
}
.btn-reprint:hover { background: #2c4a3b; color: white; border-color: #2c4a3b; }

.custom-scroll { max-height: 600px; overflow-y: auto; }
.x-small { font-size: 0.7rem; }
</style>