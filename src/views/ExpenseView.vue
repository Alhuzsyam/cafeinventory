<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

// const API_URL = "http://127.0.0.1:8000"
const API_URL = "https://api.inventorycafe.space"
const expenses = ref([])
const suggestions = ref([])

// --- STATE MODAL & FILTER ---
const isModalOpen = ref(false)
const selectedItem = ref(null)
const inputPrice = ref(0)

// State Filter: 'daily' atau 'monthly'
const filterMode = ref('daily') 
const selectedDate = ref(new Date().toISOString().slice(0, 10)) // Format: YYYY-MM-DD
const selectedMonth = ref(new Date().toISOString().slice(0, 7)) // Format: YYYY-MM

const fetchData = async () => {
    try {
        const [expRes, sugRes] = await Promise.all([
            axios.get(`${API_URL}/expenses/`),
            axios.get(`${API_URL}/expenses/suggestions`)
        ])
        expenses.value = expRes.data
        suggestions.value = sugRes.data
    } catch (e) {
        console.error("Gagal memuat data pengeluaran:", e)
    }
}

// --- LOGIKA FILTER DINAMIS ---
const filteredHistory = computed(() => {
    return expenses.value.filter(e => {
        if (!e.is_completed || !e.purchase_date) return false
        
        if (filterMode.value === 'daily') {
            // Cocokkan tanggal spesifik (YYYY-MM-DD)
            return e.purchase_date === selectedDate.value
        } else {
            // Cocokkan bulan (YYYY-MM)
            return e.purchase_date.startsWith(selectedMonth.value)
        }
    })
})

const totalExpense = computed(() => {
    return filteredHistory.value.reduce((sum, item) => sum + item.price, 0)
})

const addSuggestion = async (p) => {
    try {
        await axios.post(`${API_URL}/expenses/`, { 
            item_name: p.name, 
            product_id: p.id, 
            is_completed: false 
        })
        fetchData()
    } catch (e) {
        alert("Gagal menambah ke daftar belanja")
    }
}

const openModal = (item) => {
    selectedItem.value = item
    inputPrice.value = 0
    isModalOpen.value = true
}

const closeModal = () => {
    isModalOpen.value = false
    selectedItem.value = null
}

const confirmPurchase = async () => {
    if (inputPrice.value <= 0) {
        alert("Harap masukkan harga yang valid")
        return
    }
    try {
        await axios.put(`${API_URL}/expenses/${selectedItem.value.id}/check`, { 
            price: parseFloat(inputPrice.value) 
        })
        closeModal()
        fetchData()
    } catch (e) {
        alert("Gagal memperbarui status belanja")
    }
}

onMounted(fetchData)
</script>

<template>
  <div class="page-container px-3 py-4">
    
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div class="d-flex flex-column gap-2">
            <h5 class="fw-bold brand-text m-0">Pengeluaran & Belanja</h5>
            
            <div class="d-flex align-items-center gap-2 mt-1">
                <div class="btn-group btn-group-sm shadow-sm rounded-pill p-1 bg-white border">
                    <button 
                        @click="filterMode = 'daily'" 
                        class="btn btn-filter rounded-pill"
                        :class="filterMode === 'daily' ? 'btn-active' : 'btn-inactive'"
                    >Harian</button>
                    <button 
                        @click="filterMode = 'monthly'" 
                        class="btn btn-filter rounded-pill"
                        :class="filterMode === 'monthly' ? 'btn-active' : 'btn-inactive'"
                    >Bulanan</button>
                </div>
                
                <input 
                    v-if="filterMode === 'daily'"
                    type="date" 
                    v-model="selectedDate" 
                    class="form-control form-control-sm border-0 shadow-sm rounded-pill px-3 filter-input"
                >
                <input 
                    v-else
                    type="month" 
                    v-model="selectedMonth" 
                    class="form-control form-control-sm border-0 shadow-sm rounded-pill px-3 filter-input"
                >
            </div>
        </div>

        <div class="stat-pill-modern bg-primary-green text-white shadow-sm">
            <span class="x-small opacity-75 text-uppercase fw-bold ls-1">
                {{ filterMode === 'daily' ? 'Belanja Hari Ini' : 'Belanja Bulan Ini' }}
            </span>
            <h5 class="m-0 fw-bold">Rp {{ totalExpense.toLocaleString() }}</h5>
        </div>
    </div>

    <div class="row g-4">
        <div class="col-lg-7">
            <div class="card-compact shadow-sm p-4 bg-white h-100">
                <div class="d-flex align-items-center mb-4">
                    <div class="icon-sm bg-success-soft text-success me-2">
                        <i class="fa-solid fa-list-check"></i>
                    </div>
                    <h6 class="fw-bold brand-text m-0">Tunggu Beli (Stok Kritis)</h6>
                </div>

                <div v-if="suggestions.length > 0" class="mb-4 p-3 rounded-4 bg-light-danger border-start border-4 border-danger">
                    <label class="x-small fw-bold text-danger text-uppercase mb-2 d-block">Saran Belanja AI</label>
                    <div class="d-flex flex-wrap gap-2">
                        <button v-for="s in suggestions" :key="s.id" @click="addSuggestion(s)" class="btn btn-suggestion shadow-sm">
                            <i class="fa-solid fa-plus me-1"></i> {{ s.name }}
                        </button>
                    </div>
                </div>

                <div class="checklist-container custom-scroll">
                    <div v-for="item in expenses.filter(e => !e.is_completed)" :key="item.id" @click="openModal(item)" class="todo-card d-flex align-items-center p-3 mb-2 rounded-4 border">
                        <div class="check-circle me-3"><i class="fa-regular fa-circle"></i></div>
                        <div class="flex-grow-1">
                            <h6 class="m-0 fw-bold brand-text font-sm">{{ item.item_name }}</h6>
                            <small class="text-muted x-small">Ketuk jika bahan sudah terbeli</small>
                        </div>
                        <i class="fa-solid fa-cart-plus text-muted opacity-25"></i>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-lg-5">
            <div class="card-compact shadow-sm p-4 bg-white h-100">
                <div class="d-flex align-items-center mb-4">
                    <div class="icon-sm bg-neutral-soft text-muted me-2">
                        <i class="fa-solid fa-receipt"></i>
                    </div>
                    <h6 class="fw-bold brand-text m-0">History Belanja</h6>
                </div>
                <div class="history-container custom-scroll">
                    <div v-for="item in filteredHistory" :key="item.id" class="history-item d-flex align-items-center p-3 mb-2 rounded-4 bg-light border-0">
                        <div class="icon-done me-3 text-success"><i class="fa-solid fa-circle-check"></i></div>
                        <div class="flex-grow-1">
                            <h6 class="m-0 fw-bold text-muted text-decoration-line-through font-sm text-truncate" style="max-width: 150px;">{{ item.item_name }}</h6>
                            <small class="x-small text-muted">{{ item.purchase_date }}</small>
                        </div>
                        <div class="text-end fw-bold brand-text font-sm">
                            Rp {{ item.price.toLocaleString() }}
                        </div>
                    </div>
                    
                    <div v-if="filteredHistory.length === 0" class="text-center py-5 text-muted x-small">
                        Tidak ada catatan belanja untuk periode ini.
                    </div>
                </div>
            </div>
        </div>
    </div>

    <Transition name="fade">
        <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
            <div class="modal-content-custom shadow-lg">
                <div class="modal-header-custom mb-3">
                    <h5 class="fw-bold brand-text m-0">Detail Belanja</h5>
                    <button class="btn-close-custom" @click="closeModal">&times;</button>
                </div>
                <div class="modal-body-custom">
                    <p class="text-muted small mb-3">Input harga beli untuk item <span class="fw-bold text-dark">{{ selectedItem?.item_name }}</span>:</p>
                    <div class="input-group-custom">
                        <span class="currency-label">Rp</span>
                        <input v-model="inputPrice" type="number" class="form-control price-input" autofocus @keyup.enter="confirmPurchase">
                    </div>
                </div>
                <div class="modal-footer-custom mt-4 d-flex gap-2">
                    <button class="btn btn-cancel flex-grow-1" @click="closeModal">Batal</button>
                    <button class="btn btn-confirm flex-grow-2" @click="confirmPurchase">Simpan</button>
                </div>
            </div>
        </div>
    </Transition>

  </div>
</template>

<style scoped>
/* --- BOOTSTRAP OVERRIDES & CUSTOM --- */
.brand-text { color: #2c4a3b; }
.bg-primary-green { background-color: #2c4a3b; }
.bg-success-soft { background-color: #e6f7ed; }
.bg-neutral-soft { background-color: #f8f9fa; }
.bg-light-danger { background-color: #fff5f5; }
.ls-1 { letter-spacing: 1px; }
.x-small { font-size: 0.75rem; }
.font-sm { font-size: 0.9rem; }

.btn-filter { border: none; font-size: 0.75rem; font-weight: 700; padding: 5px 15px; }
.btn-active { background-color: #2c4a3b; color: white; }
.btn-inactive { background-color: transparent; color: #adb5bd; }

.filter-input { width: 160px; font-weight: 600; color: #2c4a3b; }

.card-compact { border-radius: 28px; border: 1px solid #f8f9fa; }
.stat-pill-modern { border-radius: 20px; padding: 10px 25px; text-align: right; min-width: 200px; }
.icon-sm { width: 35px; height: 35px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }

/* --- ITEMS --- */
.todo-card { transition: 0.2s; cursor: pointer; background: white; }
.todo-card:hover { transform: translateX(8px); border-color: #84a548; background: #fdfdfd; }
.check-circle { font-size: 1.2rem; color: #cbd5e1; }
.btn-suggestion { background: white; color: #dc3545; border: 1px solid #fee2e2; padding: 6px 14px; border-radius: 50px; font-size: 0.7rem; font-weight: 700; }

/* --- MODAL --- */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(44, 74, 59, 0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.modal-content-custom { background: white; width: 90%; max-width: 380px; padding: 25px; border-radius: 30px; }
.modal-header-custom { display: flex; justify-content: space-between; align-items: center; }
.btn-close-custom { border: none; background: none; font-size: 1.5rem; color: #aaa; }
.input-group-custom { display: flex; align-items: center; background: #f8f9fa; border-radius: 15px; padding: 5px 15px; border: 1px solid #eee; }
.currency-label { font-weight: bold; color: #2c4a3b; margin-right: 10px; }
.price-input { border: none; background: transparent; font-weight: bold; font-size: 1.2rem; color: #2c4a3b; width: 100%; }
.btn { border-radius: 15px; padding: 10px; font-weight: 600; border: none; transition: 0.2s; }
.btn-cancel { background: #f1f3f5; color: #6c757d; }
.btn-confirm { background: #2c4a3b; color: white; }

.custom-scroll { max-height: 400px; overflow-y: auto; padding-right: 5px; }
.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>