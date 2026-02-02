<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

// --- KONFIGURASI API ---
const API_URL = "https://api.inventorycafe.space"

const expenses = ref([])
const suggestions = ref([])
const isSubmitting = ref(false)
const manualItemName = ref("") 

const modal = ref({ show: false, title: "", message: "", type: "confirm", onConfirm: null })
const priceModal = ref({ show: false, item: null, value: 0 })
const filterMode = ref('daily') 
const selectedDate = ref(new Date().toISOString().slice(0, 10))
const selectedMonth = ref(new Date().toISOString().slice(0, 7))

const fetchData = async () => {
    try {
        const [expRes, sugRes] = await Promise.all([
            axios.get(`${API_URL}/expenses/`).catch(() => ({ data: [] })),
            axios.get(`${API_URL}/expenses/suggestions`).catch(() => ({ data: [] }))
        ])
        expenses.value = expRes.data
        suggestions.value = sugRes.data
    } catch (e) { console.error(e) }
}

const addManualExpense = async () => {
    if (!manualItemName.value.trim()) return
    try {
        isSubmitting.value = true
        await axios.post(`${API_URL}/expenses/`, { item_name: manualItemName.value, is_completed: false, note: "Input Manual" })
        manualItemName.value = "" 
        fetchData()
    } catch (e) { openCustomModal("Error", "Gagal menambah data", "alert") }
    finally { isSubmitting.value = false }
}

const openCustomModal = (title, message, type, action = null) => {
    modal.value = { show: true, title, message, type, onConfirm: action }
}
const closeCustomModal = () => { modal.value.show = false }
const handleModalConfirm = () => {
    if (modal.value.onConfirm) modal.value.onConfirm()
    closeCustomModal()
}

const triggerDelete = (id) => {
    openCustomModal("Hapus Data?", "Data ini akan dihapus permanen dari sistem.", "confirm", async () => {
        try {
            await axios.delete(`${API_URL}/expenses/${id}`)
            fetchData()
        } catch (e) { console.error(e) }
    })
}

const openPriceInput = (item) => {
    priceModal.value = { show: true, item: item, value: 0 }
}

const submitPrice = async () => {
    if (priceModal.value.value <= 0) return alert("Masukkan harga valid")
    try {
        await axios.put(`${API_URL}/expenses/${priceModal.value.item.id}/check`, { price: parseFloat(priceModal.value.value) })
        priceModal.value.show = false
        fetchData()
    } catch (e) { console.error(e) }
}

const addSuggestion = async (p) => {
    try {
        const qtyToBuy = p.max_stock_level - p.current_stock
        await axios.post(`${API_URL}/expenses/`, { 
            item_name: p.name, product_id: p.id, is_completed: false,
            note: `Beli ${qtyToBuy} ${p.unit}`
        })
        fetchData()
    } catch (e) { console.error(e) }
}

const filteredHistory = computed(() => {
    return expenses.value.filter(e => {
        if (!e.is_completed || !e.purchase_date) return false
        return filterMode.value === 'daily' ? e.purchase_date === selectedDate.value : e.purchase_date.startsWith(selectedMonth.value)
    })
})

const totalExpense = computed(() => filteredHistory.value.reduce((sum, item) => sum + item.price, 0))

onMounted(fetchData)
</script>

<template>
  <div class="app-container p-4">
    
    <header class="header-section mb-4">
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <div class="text-center text-md-start">
          <h2 class="fw-800 text-dark-green m-0 ls-tight">Pengeluaran & Belanja</h2>
          <div class="d-flex flex-wrap align-items-center justify-content-center justify-content-md-start gap-3 mt-2">
              <div class="tab-navigator p-1 shadow-sm">
                  <button :class="['tab-link-sm', { active: filterMode === 'daily' }]" @click="filterMode = 'daily'">Harian</button>
                  <button :class="['tab-link-sm', { active: filterMode === 'monthly' }]" @click="filterMode = 'monthly'">Bulanan</button>
              </div>
              
              <div class="date-picker-box shadow-xs">
                <i class="fa-regular fa-calendar-alt text-muted me-2"></i>
                <input v-if="filterMode === 'daily'" type="date" v-model="selectedDate" class="clean-date-input">
                <input v-else type="month" v-model="selectedMonth" class="clean-date-input">
              </div>
          </div>
        </div>

        <div class="total-pill shadow-sm animate-pop">
          <span class="text-uppercase fw-700 opacity-70 x-small">Estimasi Terbelanja</span>
          <h4 class="m-0 fw-800">Rp {{ totalExpense.toLocaleString() }}</h4>
        </div>
      </div>
    </header>

    <div class="row g-4">
        <div class="col-lg-7">
            <div class="glass-card h-100">
                <div class="card-header-premium">
                    <i class="fa-solid fa-clipboard-list text-premium-green me-2"></i>
                    <span>Tunggu Beli</span>
                </div>

                <div class="p-4">
                    <div class="input-manual-wrapper mb-4 shadow-xs">
                        <input v-model="manualItemName" type="text" class="input-modern" placeholder="Tambah belanja manual..." @keyup.enter="addManualExpense">
                        <button @click="addManualExpense" class="btn-add-circle" :disabled="isSubmitting">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>

                    <div v-if="suggestions.length > 0" class="ai-box mb-4">
                        <label class="d-block x-small fw-800 text-danger text-uppercase mb-3"><i class="fa-solid fa-sparkles me-1"></i> Saran Belanja Stok Kritis</label>
                        <div class="ai-grid">
                            <button v-for="s in suggestions" :key="s.id" @click="addSuggestion(s)" class="btn-suggestion-card">
                                <div class="fw-700 text-dark text-truncate">{{ s.name }}</div>
                                <div class="suggestion-qty">Butuh {{ s.max_stock_level - s.current_stock }} {{ s.unit }}</div>
                            </button>
                        </div>
                    </div>

                    <div class="checklist-wrapper custom-scroll">
                        <div v-for="item in expenses.filter(e => !e.is_completed)" :key="item.id" class="shopping-item animate-pop">
                            <div class="item-content" @click="openPriceInput(item)">
                                <div class="radio-check"><i class="fa-regular fa-circle"></i></div>
                                <div class="ms-3">
                                    <h6 class="m-0 fw-700 text-dark-green">{{ item.item_name }}</h6>
                                    <p class="m-0 x-small text-muted">{{ item.note || 'Ketuk untuk selesaikan' }}</p>
                                </div>
                            </div>
                            <button class="btn-delete-premium" @click.stop="triggerDelete(item.id)">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                        
                        <div v-if="expenses.filter(e => !e.is_completed).length === 0" class="empty-layout">
                            <p>Belum Ada Belanja Barang</p>
                            <i class="fa-solid fa-dolly fs-1 opacity-10"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-lg-5">
            <div class="glass-card h-100">
                <div class="card-header-premium">
                    <i class="fa-solid fa-check-double text-muted me-2"></i>
                    <span>Riwayat Selesai</span>
                </div>
                
                <div class="p-4">
                    <div class="history-wrapper custom-scroll">
                        <div v-for="item in filteredHistory" :key="item.id" class="history-card-modern animate-pop">
                            <div class="flex-grow-1 overflow-hidden">
                                <h6 class="m-0 fw-700 text-dark-green font-sm text-truncate">{{ item.item_name }}</h6>
                                <span class="x-small text-muted fw-600"><i class="fa-regular fa-clock me-1"></i>{{ item.purchase_date }}</span>
                            </div>
                            <div class="text-end me-3">
                                <div class="fw-800 text-premium-green font-sm">Rp{{ item.price.toLocaleString() }}</div>
                            </div>
                            <button class="btn-delete-ghost" @click="triggerDelete(item.id)">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>

                        <div v-if="filteredHistory.length === 0" class="empty-layout">
                             <p>Belum Ada Riwayat Belanja</p>
                             <i class="fa-solid fa-box-open fs-1 opacity-10"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div v-if="modal.show || priceModal.show" class="modal-overlay">
        <div v-if="modal.show" class="modal-card animate-pop shadow-2xl">
            <div class="text-center mb-4">
                <div :class="['modal-icon-box', modal.type === 'confirm' ? 'bg-soft-danger' : 'bg-soft-green']">
                    <i :class="['fa-solid', modal.type === 'confirm' ? 'fa-exclamation-triangle text-danger' : 'fa-check-circle text-premium-green']"></i>
                </div>
            </div>
            <h5 class="fw-800 text-center text-dark-green mb-2">{{ modal.title }}</h5>
            <p class="text-muted text-center small mb-5 px-2">{{ modal.message }}</p>
            <div class="d-flex gap-2">
                <button v-if="modal.type === 'confirm'" class="btn-premium-cancel w-100" @click="closeCustomModal">Batal</button>
                <button class="btn-premium-action w-100" @click="handleModalConfirm">Lanjutkan</button>
            </div>
        </div>

        <div v-if="priceModal.show" class="modal-card animate-pop shadow-2xl">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="fw-800 text-dark-green m-0">Input Harga</h5>
                <button class="btn-close-circle" @click="priceModal.show = false"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <p class="text-muted x-small mb-4">Item: <span class="fw-700 text-dark">{{ priceModal.item?.item_name }}</span></p>
            <div class="price-input-box mb-5 shadow-xs">
                <span class="currency-label">Rp</span>
                <input type="number" v-model="priceModal.value" class="input-price-field" autofocus @keyup.enter="submitPrice">
            </div>
            <button class="btn-premium-action w-100 py-3 shadow-lg" @click="submitPrice">Simpan Pembelian</button>
        </div>
    </div>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');

:root {
  --dark-green: #1a3a34;
  --premium-green: #2d6a4f;
  --soft-green: #d8f3dc;
  --soft-danger: #fff1f0;
  --danger-red: #ff4d4f;
}

.app-container { font-family: 'Plus Jakarta Sans', sans-serif; color: #2d3436; }
.fw-800 { font-weight: 800; }
.fw-700 { font-weight: 700; }
.x-small { font-size: 0.68rem; }
.font-sm { font-size: 0.88rem; }
.ls-tight { letter-spacing: -0.5px; }

/* 📅 MODERN DATE PICKER */
.date-picker-box {
    display: flex;
    align-items: center;
    background: white;
    border-radius: 12px;
    padding: 6px 14px;
    border: 1.5px solid #edf2f7;
}
.clean-date-input {
    border: none;
    background: transparent;
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--dark-green);
    outline: none;
}

/* 🗑️ PREMIUM DELETE BUTTON */
.btn-delete-premium {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: var(--soft-danger);
    color: var(--danger-red);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.2s;
    cursor: pointer;
}
.btn-delete-premium:hover { background: var(--danger-red); color: white; }

.btn-delete-ghost {
    background: transparent;
    border: none;
    color: #cbd5e1;
    padding: 8px;
    transition: 0.2s;
}
.btn-delete-ghost:hover { color: var(--danger-red); }

/* 🏢 MODAL SYSTEM */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 34, 30, 0.65);
    backdrop-filter: blur(8px);
    z-index: 9999;
    display: flex !important;
    align-items: center;
    justify-content: center;
}
.modal-card {
    background: white;
    width: 100%;
    max-width: 350px;
    padding: 30px;
    border-radius: 28px;
    position: relative;
}

/* 🖋️ INPUT MANUAL */
.input-manual-wrapper {
    display: flex;
    background: #f8fafc;
    border: 1.5px solid #edf2f7;
    border-radius: 16px;
    padding: 6px;
}
.input-modern {
    border: none;
    background: transparent;
    padding: 8px 12px;
    flex-grow: 1;
    outline: none;
    font-weight: 600;
    font-size: 0.85rem;
}
.btn-add-circle {
    background: var(--dark-green);
    color: white;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    transition: 0.3s;
}
.btn-add-circle:hover { background: var(--premium-green); transform: scale(1.05); }

/* 🛒 SHOPPING ITEMS */
.shopping-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    background: #fdfdfd;
    border-radius: 18px;
    margin-bottom: 12px;
    border: 1px solid #f1f2f6;
    cursor: pointer;
    transition: 0.25s;
}
.shopping-item:hover { border-color: var(--premium-green); transform: translateX(5px); background: white; }
.item-content { display: flex; align-items: center; flex-grow: 1; }
.radio-check { font-size: 1.1rem; color: #cbd5e1; }

/* 📊 HISTORY CARDS */
.history-card-modern {
    display: flex;
    align-items: center;
    padding: 14px 0;
    border-bottom: 1px dashed #f1f2f6;
}

/* EMPTY STATE */
.empty-layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    color: #b2bec3;
    text-align: center;
}
.empty-layout p { margin-bottom: 10px; font-weight: 700; font-size: 0.85rem; opacity: 0.6; }

/* AI GRID */
.ai-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 10px;
}
.btn-suggestion-card {
    background: white;
    border: 1px solid #fee2e2;
    padding: 10px;
    border-radius: 12px;
    text-align: left;
    transition: 0.2s;
}
.btn-suggestion-card:hover { background: #d32f2f; border-color: #d32f2f; }
.btn-suggestion-card:hover div { color: white !important; }

/* OTHER UTILS */
.glass-card { background: white; border-radius: 24px; border: 1px solid #f1f2f6; box-shadow: 0 10px 40px rgba(0,0,0,0.03); overflow: hidden; min-height: 520px; }
.card-header-premium { padding: 18px 20px; font-weight: 800; font-size: 0.8rem; color: #636e72; text-transform: uppercase; border-bottom: 1px solid #f8fafc; letter-spacing: 0.5px; }
.tab-navigator { background: #f1f2f6; border-radius: 12px; display: flex; padding: 4px; }
.tab-link-sm { border: none; background: transparent; padding: 6px 14px; border-radius: 10px; font-weight: 700; font-size: 0.72rem; color: #636e72; transition: 0.3s; }
.tab-link-sm.active { background: white; color: var(--dark-green); box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.total-pill { background: #1a3a34; color: white; padding: 14px 28px; border-radius: 20px; text-align: right; }
.ai-box { background: #fff5f5; border-radius: 18px; padding: 15px; border: 1px solid #fee2e2; }
.suggestion-qty { font-size: 0.65rem; color: #d32f2f; font-weight: 800; }
.custom-scroll { max-height: 480px; overflow-y: auto; padding-right: 5px; }
.price-input-box { display: flex; align-items: center; background: #f8fafc; padding: 14px 20px; border-radius: 18px; border: 1.5px solid #edf2f7; }
.input-price-field { border: none; background: transparent; font-weight: 800; font-size: 1.5rem; color: var(--dark-green); outline: none; width: 100%; }
.btn-premium-action { background: var(--dark-green); color: white; border: none; border-radius: 16px; padding: 12px; font-weight: 700; transition: 0.3s; }
.btn-premium-action:hover { background: var(--premium-green); transform: translateY(-2px); }
.btn-premium-cancel { background: #f1f2f6; color: #636e72; border: none; border-radius: 16px; padding: 12px; font-weight: 700; }
.modal-icon-box { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto; }
.bg-soft-danger { background: #fff1f0; } .bg-soft-green { background: #f0fff4; }
.animate-pop { animation: pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes pop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
</style>