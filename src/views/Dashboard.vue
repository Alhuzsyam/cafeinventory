<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

// --- KONFIGURASI ---
const products = ref([])
const logs = ref([]) 
const usageReport = ref([]) 
const API_URL = "https://api.inventorycafe.space"
const searchQuery = ref("")
const activeTab = ref('logs') 
const stockTab = ref('low')   
const isProcessing = ref(false) 

// --- LOGIKA DATA ---
const fetchData = async () => {
  try {
    const pRes = await axios.get(`${API_URL}/products/`)
    products.value = pRes.data
    
    const lRes = await axios.get(`${API_URL}/inventory/history?limit=10`)
    logs.value = lRes.data

    const uRes = await axios.get(`${API_URL}/inventory/usage-report`)
    usageReport.value = uRes.data

  } catch (err) {
    console.error("Error fetching data:", err)
  }
}

// 🔵 FUNGSI RESET STOK
const resetStock = async (product) => {
  if (!confirm(`Reset stok ${product.name} menjadi 0?`)) return
  isProcessing.value = true
  try {
    await axios.put(`${API_URL}/products/${product.id}/reset-stock`)
    await fetchData() 
  } catch (e) {
    alert("Gagal reset: " + (e.response?.data?.detail || e.message))
  } finally { isProcessing.value = false }
}

const getProductImage = (name) => {
  const initial = name.substring(0, 1).toUpperCase()
  return `https://placehold.co/150x150/f4f4f5/5c5c5c?text=${initial}&font=playfair-display`
}

// --- COMPUTED DATA ---
const currentDate = computed(() => {
  return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
})

const searchResults = computed(() => {
  if (!searchQuery.value) return products.value
  return products.value.filter(p => p.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

const lowStockItemsGlobal = computed(() => products.value.filter(p => p.current_stock <= p.min_stock_level))
const readyStockCount = computed(() => products.value.filter(p => p.current_stock > 0).length)
const stockHealthPercentage = computed(() => {
  if (products.value.length === 0) return 0
  return Math.round((readyStockCount.value / products.value.length) * 100)
})

const safeStockList = computed(() => searchResults.value.filter(p => p.current_stock > p.min_stock_level))
const lowStockList = computed(() => searchResults.value.filter(p => p.current_stock <= p.min_stock_level))

const displayedProducts = computed(() => {
  return stockTab.value === 'safe' ? safeStockList.value : lowStockList.value
})

onMounted(fetchData)
</script>

<template>
  <div class="dashboard-wrapper">
    <header class="dashboard-header mb-5">
      <div class="row align-items-center g-4">
        <div class="col-md-7">
          <div class="d-flex align-items-center gap-3">
            <div class="avatar-circle">☕</div>
            <div>
              <h2 class="fw-800 text-dark-green m-0 ls-tight">Halo, Barista!</h2>
              <p class="text-muted m-0 small fw-600">{{ currentDate }} • <span class="text-success">System Online</span></p>
            </div>
          </div>
        </div>
        <div class="col-md-5">
          <div class="search-box">
            <i class="fas fa-search search-icon"></i>
            <input v-model="searchQuery" type="text" class="search-input" placeholder="Cari menu atau bahan...">
          </div>
        </div>
      </div>
    </header>

    <div class="row g-4 mb-5">
      <div v-for="stat in [
        {title: 'Total Menu', val: products.length, icon: '📋', bg: 'bg-sage-soft', color: 'text-sage'},
        {title: 'Ready Stock', val: stockHealthPercentage + '%', icon: '✨', bg: 'bg-cream-soft', color: 'text-brown'},
        {title: 'Need Restock', val: lowStockItemsGlobal.length, icon: lowStockItemsGlobal.length > 0 ? '⚠️' : '✅', bg: lowStockItemsGlobal.length > 0 ? 'bg-pink-soft' : 'bg-gray-soft', color: lowStockItemsGlobal.length > 0 ? 'text-danger' : 'text-muted'}
      ]" :key="stat.title" class="col-md-4">
        <div class="stat-card" :class="stat.bg">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <p class="stat-label mb-1" :class="stat.color">{{ stat.title }}</p>
              <h2 class="stat-value m-0 fw-800">{{ stat.val }}</h2>
            </div>
            <div class="stat-icon-box">{{ stat.icon }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="fw-800 text-dark-green m-0">Inventory List</h5>
      <div class="tab-control">
        <button @click="stockTab = 'low'" class="tab-btn" :class="{ 'active text-danger': stockTab === 'low' }">
          Low Stock <span class="tab-badge bg-danger">{{ lowStockList.length }}</span>
        </button>
        <button @click="stockTab = 'safe'" class="tab-btn" :class="{ 'active text-success': stockTab === 'safe' }">
          Safe Stock <span class="tab-badge bg-success">{{ safeStockList.length }}</span>
        </button>
      </div>
    </div>

    <div class="row g-4">
      <div v-if="displayedProducts.length === 0" class="col-12 text-center py-5">
        <div class="empty-icon">🍃</div>
        <p class="text-muted fw-600">Tidak ada produk dalam kategori ini</p>
      </div>

      <div class="col-6 col-md-4 col-lg-3" v-for="product in displayedProducts" :key="product.id">
        <div class="product-card" :class="{'border-danger-soft': product.current_stock < 0}">
          
          <div class="card-float-top">
            <button v-if="product.current_stock < 0" @click.stop="resetStock(product)" class="btn-reset-fab" title="Reset ke 0">
              <i class="fas" :class="isProcessing ? 'fa-spinner fa-spin' : 'fa-undo-alt'"></i>
            </button>
            <div class="stock-pill shadow-sm" :class="product.current_stock <= product.min_stock_level ? 'bg-danger' : 'bg-dark'">
              {{ product.current_stock }} <small class="opacity-75">{{ product.unit }}</small>
            </div>
          </div>

          <div class="card-body p-4 text-center">
            <div class="img-container mb-3">
              <img :src="getProductImage(product.name)" class="product-img" alt="Product">
            </div>
            
            <h6 class="product-title text-truncate fw-800">{{ product.name }}</h6>
            <p class="product-sku mb-3">{{ product.sku }}</p>

            <div class="status-indicator">
              <div v-if="product.current_stock < 0" class="status-tag tag-error animate-pulse">Stok Minus</div>
              <div v-else-if="product.current_stock === 0" class="status-tag tag-empty">Habis</div>
              <div v-else-if="product.current_stock <= product.min_stock_level" class="status-tag tag-warning">Menipis</div>
              <div v-else class="status-tag tag-success">Tersedia</div>
            </div>
          </div>

          <button v-if="product.current_stock < 0" @click="resetStock(product)" class="btn-reset-bottom d-md-none">
            RESET DATA
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');

/* --- THEME DESIGN --- */
.dashboard-wrapper {
  background-color: #f8faf9;
  min-height: 100vh;
  padding: 40px 20px;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.fw-800 { font-weight: 800; }
.ls-tight { letter-spacing: -1px; }
.text-dark-green { color: #1a2e24; }

/* --- HEADER & SEARCH --- */
.avatar-circle {
  width: 54px; height: 54px; background: white; 
  border-radius: 18px; display: flex; align-items: center; 
  justify-content: center; font-size: 1.5rem; box-shadow: 0 10px 20px rgba(0,0,0,0.04);
}

.search-box { position: relative; }
.search-input {
  width: 100%; border-radius: 16px; border: 2px solid transparent;
  padding: 14px 20px 14px 50px; background: white;
  box-shadow: 0 10px 25px rgba(0,0,0,0.03); transition: 0.3s;
}
.search-input:focus { border-color: #84a548; outline: none; box-shadow: 0 10px 30px rgba(132,165,72,0.1); }
.search-icon { position: absolute; left: 20px; top: 50%; transform: translateY(-50%); color: #cbd5e1; }

/* --- STAT CARDS --- */
.stat-card { border-radius: 24px; padding: 28px; transition: 0.3s; border: 1px solid rgba(0,0,0,0.02); }
.stat-card:hover { transform: translateY(-5px); }
.bg-sage-soft { background: #eff6f2; }
.bg-cream-soft { background: #fefaf2; }
.bg-pink-soft { background: #fff5f5; }
.bg-gray-soft { background: #f1f5f9; }
.stat-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
.stat-value { font-size: 2rem; color: #1a2e24; }
.stat-icon-box { font-size: 1.8rem; opacity: 0.8; }

/* --- TAB CONTROL --- */
.tab-control { background: #e2e8f0; padding: 5px; border-radius: 14px; display: flex; gap: 5px; }
.tab-btn {
  border: none; padding: 8px 18px; border-radius: 10px; font-weight: 700;
  font-size: 0.85rem; color: #64748b; background: transparent; transition: 0.2s;
}
.tab-btn.active { background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.tab-badge { font-size: 0.7rem; color: white; padding: 2px 8px; border-radius: 6px; margin-left: 5px; }

/* --- PRODUCT CARD --- */
.product-card {
  background: white; border-radius: 28px; position: relative;
  transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); overflow: hidden;
  border: 1px solid #f1f5f9;
}
.product-card:hover { transform: translateY(-10px); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.08); }

.card-float-top {
  position: absolute; top: 15px; left: 15px; right: 15px;
  display: flex; justify-content: space-between; align-items: center; z-index: 10;
}

.stock-pill { background: #1a2e24; color: white; padding: 6px 14px; border-radius: 12px; font-weight: 800; font-size: 0.85rem; }
.btn-reset-fab {
  width: 36px; height: 36px; border-radius: 12px; border: none;
  background: #dc3545; color: white; display: flex; align-items: center; justify-content: center;
  transition: 0.3s;
}
.btn-reset-fab:hover { transform: rotate(-180deg) scale(1.1); background: #a71d2a; }

.img-container {
  width: 90px; height: 90px; margin: 0 auto; 
  background: #f8fafc; border-radius: 24px; padding: 10px;
}
.product-img { width: 100%; height: 100%; object-fit: contain; border-radius: 18px; }

.product-title { color: #1a2e24; font-size: 1rem; margin-bottom: 2px; }
.product-sku { color: #94a3b8; font-size: 0.75rem; font-weight: 600; }

.status-tag { display: inline-block; padding: 6px 16px; border-radius: 100px; font-size: 0.75rem; font-weight: 800; }
.tag-success { background: #f0fdf4; color: #15803d; }
.tag-warning { background: #fff7ed; color: #c2410c; }
.tag-empty { background: #f8fafc; color: #64748b; }
.tag-error { background: #fef2f2; color: #dc2626; }

.btn-reset-bottom { width: 100%; border: none; background: #dc3545; color: white; padding: 12px; font-weight: 800; font-size: 0.8rem; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
.animate-pulse { animation: pulse 2s infinite; }
.empty-icon { font-size: 3rem; margin-bottom: 10px; opacity: 0.3; }
</style>