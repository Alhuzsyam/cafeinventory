<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const products = ref([])
const logs = ref([]) 
const usageReport = ref([]) // Data baru untuk laporan akumulasi
// const API_URL = "http://127.0.0.1:8000"
const API_URL = "https://api.inventorycafe.space"
const searchQuery = ref("")
const activeTab = ref('logs') // State untuk tab: 'logs' atau 'usage'

// --- COMPUTED DATA ---

const currentDate = computed(() => {
  const date = new Date()
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
})

// 1. Filter Pencarian
const filteredProducts = computed(() => {
  if (!searchQuery.value) return products.value
  return products.value.filter(p => p.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

// 2. Statistik Stok
const lowStockItems = computed(() => products.value.filter(p => p.current_stock <= p.min_stock_level))

// Item Ready Stock
const readyStockCount = computed(() => products.value.filter(p => p.current_stock > 0).length)

// Persentase kesehatan stok
const stockHealthPercentage = computed(() => {
  if (products.value.length === 0) return 0
  return Math.round((readyStockCount.value / products.value.length) * 100)
})

// --- LOGIC ---

const fetchData = async () => {
  try {
    // 1. Ambil Produk
    const pRes = await axios.get(`${API_URL}/products/`)
    products.value = pRes.data
    
    // 2. Ambil Log History
    const lRes = await axios.get(`${API_URL}/inventory/history?limit=10`)
    logs.value = lRes.data

    // 3. Ambil Laporan Penggunaan (Endpoint Baru)
    const uRes = await axios.get(`${API_URL}/inventory/usage-report`)
    usageReport.value = uRes.data

  } catch (err) {
    console.error("Error fetching data:", err)
  }
}

const getProductImage = (name) => {
  const initial = name.substring(0, 1).toUpperCase()
  return `https://placehold.co/150x150/f0f2f5/5c5c5c?text=${initial}&font=merriweather`
}

onMounted(fetchData)
</script>

<template>
  <div class="dashboard-wrapper">
    
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
      <div>
        <h2 class="fw-bold text-dark-green m-0">Halo, Barista! 👋</h2>
        <p class="text-muted m-0 mt-1" style="font-size: 0.95rem;">{{ currentDate }} • Semangat bekerja hari ini!</p>
      </div>
      
      <div class="search-wrapper">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          class="form-control search-input" 
          placeholder="Cari menu kopi atau snack..." 
          v-model="searchQuery"
        >
      </div>
    </div>

    <div class="row g-4 mb-5">
      
      <div class="col-md-4">
        <div class="stat-card bg-sage-light">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <span class="stat-label text-sage-dark">Total Item Terdaftar</span>
              <h3 class="stat-value text-dark-green">{{ products.length }}</h3>
            </div>
            <div class="icon-circle bg-white text-sage-dark">
              📝
            </div>
          </div>
          <p class="stat-note text-sage-dark">Database menu & bahan</p>
        </div>
      </div>

      <div class="col-md-4">
        <div class="stat-card bg-cream">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <span class="stat-label text-brown">Tingkat Ketersediaan</span>
              <div class="d-flex align-items-baseline gap-2">
                <h3 class="stat-value text-dark-brown">{{ stockHealthPercentage }}%</h3>
                <small class="text-muted fw-bold">({{ readyStockCount }}/{{ products.length }} Item)</small>
              </div>
            </div>
            <div class="icon-circle bg-white text-brown">
              ✨
            </div>
          </div>
          <div class="progress mt-3" style="height: 6px; background-color: rgba(138, 112, 68, 0.2);">
            <div class="progress-bar bg-brown" role="progressbar" 
              :style="{ width: stockHealthPercentage + '%' }" 
              :aria-valuenow="stockHealthPercentage" aria-valuemin="0" aria-valuemax="100">
            </div>
          </div>
          <p class="stat-note text-brown mt-2">Bahan siap digunakan</p>
        </div>
      </div>

      <div class="col-md-4">
        <div class="stat-card" :class="lowStockItems.length > 0 ? 'bg-soft-pink' : 'bg-soft-gray'">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <span class="stat-label" :class="lowStockItems.length > 0 ? 'text-danger' : 'text-muted'">Perlu Restock</span>
              <h3 class="stat-value" :class="lowStockItems.length > 0 ? 'text-danger' : 'text-dark'">
                {{ lowStockItems.length }} <span class="fs-6 fw-normal">Item</span>
              </h3>
            </div>
            <div class="icon-circle bg-white" :class="lowStockItems.length > 0 ? 'text-danger' : 'text-muted'">
              {{ lowStockItems.length > 0 ? '⚠️' : '✅' }}
            </div>
          </div>
          <p class="stat-note" :class="lowStockItems.length > 0 ? 'text-danger' : 'text-muted'">
            {{ lowStockItems.length > 0 ? 'Segera lakukan pembelian!' : 'Stok aman terkendali' }}
          </p>
        </div>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-3">
      <h4 class="fw-bold text-dark-green m-0">Daftar Menu & Stok</h4>
      <small class="text-muted">Menampilkan {{ filteredProducts.length }} produk</small>
    </div>

    <div class="row g-4 mb-5">
      <div class="col-6 col-md-4 col-lg-3" v-for="product in filteredProducts" :key="product.id">
        <div class="product-card h-100">
          <div class="stock-badge shadow-sm" :class="product.current_stock <= product.min_stock_level ? 'bg-danger text-white' : 'bg-white text-dark'">
            {{ product.current_stock }} <span class="text-muted small" :class="product.current_stock <= product.min_stock_level ? 'text-white-50' : ''">{{ product.unit }}</span>
          </div>

          <div class="card-body text-center p-3">
            <img :src="getProductImage(product.name)" class="product-img mb-3" alt="Product">
            
            <h6 class="product-name text-truncate" :title="product.name">{{ product.name }}</h6>
            <p class="product-sku">{{ product.sku }}</p>

            <div class="mt-3">
              <span v-if="product.current_stock === 0" class="badge bg-secondary text-white rounded-pill px-3">
                Habis
              </span>
              <span v-else-if="product.current_stock <= product.min_stock_level" class="badge bg-soft-pink text-danger rounded-pill px-3">
                Menipis
              </span>
              <span v-else class="badge bg-sage-light text-sage-dark rounded-pill px-3">
                Tersedia
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="activity-section p-4 rounded-4 bg-white shadow-sm border-0">
      
      <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
        <h5 class="fw-bold text-dark-green m-0">
          {{ activeTab === 'logs' ? '🕒 Aktivitas Terkini' : '📊 Laporan Penggunaan Bahan' }}
        </h5>
        
        <div class="d-flex gap-2">
          <a 
            v-if="activeTab === 'usage'"
            :href="`${API_URL}/inventory/usage-report/export`"
            target="_blank"
            class="btn btn-sm btn-success text-white rounded-pill px-3 fw-bold shadow-sm d-flex align-items-center gap-2"
            style="background-color: #2c4a3b; border: none;"
          >
            📥 Download Excel
          </a>

          <div class="bg-light p-1 rounded-pill d-inline-flex">
            <button 
              @click="activeTab = 'logs'"
              class="btn btn-sm rounded-pill px-3 fw-bold transition-all"
              :class="activeTab === 'logs' ? 'bg-white shadow-sm text-dark-green' : 'text-muted border-0'"
            >
              History Log
            </button>
            <button 
              @click="activeTab = 'usage'"
              class="btn btn-sm rounded-pill px-3 fw-bold transition-all"
              :class="activeTab === 'usage' ? 'bg-white shadow-sm text-dark-green' : 'text-muted border-0'"
            >
              Akumulasi
            </button>
          </div>
        </div>
      </div>

      <div class="table-responsive">
        
        <table v-if="activeTab === 'logs'" class="table table-borderless align-middle mb-0">
          <thead class="text-muted border-bottom">
            <tr class="small text-uppercase">
              <th>Waktu</th>
              <th>Produk</th>
              <th class="text-center">Perubahan</th>
              <th class="text-end">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id" class="border-bottom-dashed">
              <td class="text-muted small py-3">{{ new Date(log.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) }}</td>
              <td class="fw-bold text-dark">{{ log.product_name }}</td>
              <td class="text-center">
                <span class="badge rounded-pill px-3 fw-normal" 
                  :class="log.qty_change > 0 ? 'bg-sage-light text-sage-dark' : 'bg-soft-pink text-danger'">
                  {{ log.qty_change > 0 ? '+' : '' }}{{ log.qty_change }}
                </span>
              </td>
              <td class="text-end">
                <span class="badge border fw-normal" 
                  :class="log.transaction_type === 'INBOUND' ? 'border-success text-success bg-white' : 'border-danger text-danger bg-white'">
                  {{ log.transaction_type }}
                </span>
              </td>
            </tr>
            <tr v-if="logs.length === 0">
              <td colspan="4" class="text-center text-muted py-4">Belum ada aktivitas hari ini</td>
            </tr>
          </tbody>
        </table>

        <table v-else class="table table-borderless align-middle mb-0">
          <thead class="text-muted border-bottom">
            <tr class="small text-uppercase">
              <th>Nama Bahan</th>
              <th class="text-center">Pemakaian Minggu Ini</th>
              <th class="text-center">Pemakaian Bulan Ini</th>
              <th class="text-end">Satuan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in usageReport" :key="item.product_id" class="border-bottom-dashed">
              <td class="fw-bold text-dark py-3">
                {{ item.product_name }}
              </td>
              <td class="text-center">
                <span class="fw-bold text-dark-green" style="font-size: 1.1rem;">
                  {{ item.weekly_usage }}
                </span>
              </td>
              <td class="text-center">
                <span class="fw-bold text-dark-green" style="font-size: 1.1rem;">
                  {{ item.monthly_usage }}
                </span>
              </td>
              <td class="text-end text-muted">
                {{ item.unit }}
              </td>
            </tr>
            <tr v-if="usageReport.length === 0">
              <td colspan="4" class="text-center text-muted py-4">Belum ada data penggunaan</td>
            </tr>
          </tbody>
        </table>

      </div>
    </div>

  </div>
</template>

<style scoped>
/* --- PALET WARNA --- */
:root {
  --dark-green: #2c4a3b;
  --sage-light: #e6f0eb;
  --sage-dark: #4a7a62;
  --cream: #fff9e6;
  --brown: #8a7044;
  --soft-pink: #ffe6e6;
}

.text-dark-green { color: #2c4a3b; }
.text-sage-dark { color: #4a7a62; }
.bg-sage-light { background-color: #e6f0eb; }
.bg-cream { background-color: #fff9e6; }
.bg-brown { background-color: #8a7044; }
.text-brown { color: #8a7044; }
.text-dark-brown { color: #5c4b2e; }
.bg-soft-pink { background-color: #ffe6e6; }
.bg-soft-gray { background-color: #f8f9fa; }

/* --- STYLE CSS --- */
.dashboard-wrapper {
  background-color: #fcfdfc;
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  padding-bottom: 50px;
}

.transition-all {
  transition: all 0.3s ease;
}

/* SEARCH */
.search-wrapper {
  position: relative;
  width: 100%;
  max-width: 400px;
}
.search-input {
  border-radius: 50px;
  border: 1px solid #eee;
  padding: 12px 20px 12px 45px;
  background-color: white;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  transition: all 0.3s ease;
}
.search-input:focus {
  border-color: #b8d0c3;
  box-shadow: 0 4px 20px rgba(44, 74, 59, 0.1);
  outline: none;
}
.search-icon {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: #aaa;
}

/* STATS */
.stat-card {
  border-radius: 24px;
  padding: 24px;
  height: 100%;
  border: none;
  transition: transform 0.2s;
}
.stat-card:hover {
  transform: translateY(-3px);
}
.stat-label {
  font-size: 0.85rem;
  font-weight: 600;
  display: block;
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.stat-value {
  font-size: 2.2rem;
  font-weight: 800;
  margin: 0;
  line-height: 1;
}
.stat-note {
  font-size: 0.85rem;
  margin-top: 10px;
  margin-bottom: 0;
  opacity: 0.9;
}
.icon-circle {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

/* PRODUCT GRID */
.product-card {
  background: white;
  border-radius: 20px;
  border: 1px solid #f0f0f0;
  position: relative;
  transition: all 0.3s ease;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
}
.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  border-color: transparent;
}
.product-img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.stock-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 0.8rem;
  font-weight: bold;
  padding: 6px 12px;
  border-radius: 20px;
}

/* TABLE */
.border-bottom-dashed {
  border-bottom: 1px dashed #eee;
}
.border-bottom-dashed:last-child {
  border-bottom: none;
}
</style>