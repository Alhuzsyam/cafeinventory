<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import axios from 'axios'

// --- STATE ---
const productSearch = ref("")
const isDropdownOpen = ref(false)
const products = ref([])
const logs = ref([])

// API URL
const API_URL = "https://api.inventorycafe.space"

const isSubmitting = ref(false)
const isAnalyzing = ref(false)

// CAMERA STATE
const videoRef = ref(null)
const canvasRef = ref(null)
const stream = ref(null)

const activeTab = ref('paper') 
const scanResults = ref([]) 

// FORM STATE
const form = ref({ product_id: "", qty_change: "", type: "INBOUND" })

// --- STATE PAGINATION ---
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = 20

// --- 1. FETCH DATA (Dengan Pagination & Unit) ---
const fetchData = async () => {
    try {
        const [pRes, lRes] = await Promise.all([
            axios.get(`${API_URL}/products/`),
            axios.get(`${API_URL}/inventory/history`, { 
                params: { page: currentPage.value, size: pageSize } 
            })
        ])
        products.value = pRes.data;
        
        if (lRes.data.items) {
            logs.value = lRes.data.items;
            totalPages.value = lRes.data.total_pages;
        } else {
            logs.value = lRes.data;
        }
    } catch (e) { 
        console.error("Gagal ambil data:", e) 
    }
}

const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages.value) {
        currentPage.value = newPage
        fetchData()
    }
}

// --- COMPUTED: Filter Produk ---
const filteredProductOptions = computed(() => {
    if (!productSearch.value) return products.value
    return products.value.filter(p => 
        p.name.toLowerCase().includes(productSearch.value.toLowerCase())
    )
})

// --- 2. LOGIC KAMERA & SCAN ---
const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            stream.value = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment", width: 400, height: 400 } 
            })
            if (videoRef.value) videoRef.value.srcObject = stream.value
        } catch (err) { alert("Error Kamera: " + err.message) }
    }
}

const stopCamera = () => {
    if (stream.value) {
        stream.value.getTracks().forEach(track => track.stop())
        stream.value = null
    }
}

const capturePaper = async () => {
    isAnalyzing.value = true;
    const context = canvasRef.value.getContext('2d');
    canvasRef.value.width = videoRef.value.videoWidth;
    canvasRef.value.height = videoRef.value.videoHeight;
    context.drawImage(videoRef.value, 0, 0);

    canvasRef.value.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'scan.jpg');
        try {
            const res = await axios.post(`${API_URL}/inventory/scan-local`, formData, { timeout: 120000 });
            scanResults.value = res.data;
        } catch (err) { alert("Gagal scan: " + err.message); } 
        finally { isAnalyzing.value = false; }
    }, 'image/jpeg', 0.95);
}

const submitBulkScan = async () => {
    if(scanResults.value.length === 0) return;
    isSubmitting.value = true
    try {
        for (const item of scanResults.value) {
            const jumlah = item.qty || item.qty_change || 0;
            await axios.post(`${API_URL}/inventory/transaction`, {
                product_id: item.id,
                qty_change: item.type === 'OUTBOUND' ? -Math.abs(jumlah) : Math.abs(jumlah),
                transaction_type: item.type,
                source: "IMAGE_AI", 
                raw_input_text: item.note || "Paper Scan Lokal"
            })
        }
        currentPage.value = 1; 
        await fetchData()
        scanResults.value = []; 
        alert("✅ Data berhasil disimpan!");
    } catch(e) { alert("Gagal simpan: " + e.message); } 
    finally { isSubmitting.value = false }
}

const removeScanItem = (index) => { scanResults.value.splice(index, 1) }

// --- 3. MANUAL INPUT ---
const submitTrx = async () => {
    if(!form.value.product_id || !form.value.qty_change) return alert("Lengkapi data!")
    isSubmitting.value = true
    try {
        await axios.post(`${API_URL}/inventory/transaction`, {
            product_id: form.value.product_id,
            qty_change: form.value.type === 'OUTBOUND' ? -Math.abs(form.value.qty_change) : Math.abs(form.value.qty_change),
            transaction_type: form.value.type,
            source: "MANUAL_APP",
            raw_input_text: "Input Manual"
        })
        currentPage.value = 1; 
        await fetchData(); 
        form.value.qty_change = ""; form.value.product_id = ""; productSearch.value = ""; 
    } catch(e) { alert(e.message) } 
    finally { isSubmitting.value = false }
}

const setType = (t) => form.value.type = t

const selectProduct = (product) => {
    form.value.product_id = product.id
    productSearch.value = product.name 
    isDropdownOpen.value = false 
}

// --- WATCHERS & LIFECYCLE ---
watch(activeTab, (val) => {
    if(val === 'paper') setTimeout(startCamera, 500)
    else stopCamera()
})

onMounted(() => {
    fetchData()
    if(activeTab.value === 'paper') setTimeout(startCamera, 500)
})
onUnmounted(stopCamera)
</script>

<template>
  <div class="page-container p-4 bg-light-gray min-vh-100">
    <div class="mb-4 d-flex justify-content-between align-items-center">
      <div>
        <h2 class="fw-bold text-dark-green m-0">🔄 Stok Movement</h2>
        <div class="d-flex align-items-center gap-2 mt-1">
            <span class="badge-status bg-success-soft text-success small">AI Scanner Active</span>
            <span class="text-muted small">| Degentong Inventory</span>
        </div>
      </div>
      <button class="btn-refresh" @click="fetchData">
        <i class="fas fa-sync-alt me-2"></i> Refresh
      </button>
    </div>

    <div class="row g-4">
        <div class="col-lg-5">
            <div class="card-modern shadow-sm sticky-top" style="top: 20px; z-index: 10;">
                <div class="nav-tabs-wrapper mb-4">
                    <button class="tab-btn" :class="{ active: activeTab === 'paper' }" @click="activeTab = 'paper'">
                        <i class="fas fa-file-invoice me-2"></i> Paper Scan
                    </button>
                    <button class="tab-btn" :class="{ active: activeTab === 'manual' }" @click="activeTab = 'manual'">
                        <i class="fas fa-hand-pointer me-2"></i> Manual
                    </button>
                </div>

                <div v-show="activeTab === 'paper'" class="text-center fade-in">
                    <div class="camera-wrapper mb-3 shadow-inner" v-if="scanResults.length === 0">
                        <video ref="videoRef" autoplay playsinline class="video-preview"></video>
                        <canvas ref="canvasRef" style="display:none;"></canvas>
                        <div class="scan-overlay" v-if="isAnalyzing">
                            <div class="scan-grid"></div>
                            <span class="scan-text fw-bold">🤖 AI Sedang Membaca...</span>
                        </div>
                    </div>

                    <div v-if="scanResults.length === 0">
                        <button class="btn-snap shadow" @click="capturePaper" :disabled="isAnalyzing">
                            {{ isAnalyzing ? 'Processing...' : '📸 Ambil Foto & Baca' }}
                        </button>
                        <p class="mt-3 text-muted x-small">Pastikan tulisan tangan terlihat jelas dan cukup cahaya</p>
                    </div>

                    <div v-else class="scan-results text-start">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="fw-bold text-dark-green m-0">Hasil Scan ({{ scanResults.length }})</h6>
                            <button class="btn btn-sm text-danger fw-bold" @click="scanResults = []">Batal</button>
                        </div>
                        <div class="scan-list-scroll custom-scroll">
                            <div v-for="(item, idx) in scanResults" :key="idx" class="scan-item">
                                <div class="flex-grow-1">
                                    <div class="fw-bold text-dark small">{{ item.name }}</div>
                                    <small class="text-muted x-small">{{ item.note }}</small>
                                </div>
                                <div class="d-flex align-items-center gap-3">
                                    <span class="qty-badge" :class="item.type === 'INBOUND' ? 'status-in' : 'status-out'">
                                        {{ item.type === 'INBOUND' ? '+' : '-' }}{{ item.qty }}
                                    </span>
                                    <button class="btn btn-remove-sm" @click="removeScanItem(idx)"><i class="fa-solid fa-x"></i></button>
                                </div>
                            </div>
                        </div>
                        <button class="btn-submit w-100 mt-3 shadow" @click="submitBulkScan" :disabled="isSubmitting">
                            {{ isSubmitting ? 'Saving...' : '✅ Konfirmasi & Simpan Stok' }}
                        </button>
                    </div>
                </div>

                <div v-if="activeTab === 'manual'" class="fade-in pt-2">
                    <div class="d-flex gap-2 mb-4">
                        <div class="type-badge flex-fill" :class="{ active: form.type === 'INBOUND' }" @click="setType('INBOUND')">📥 Masuk</div>
                        <div class="type-badge flex-fill" :class="{ active: form.type === 'OUTBOUND' }" @click="setType('OUTBOUND')">📤 Keluar</div>
                    </div>

                    <div class="mb-3 position-relative">
                        <label class="form-label x-small text-muted fw-bold">NAMA PRODUK</label>
                        <input type="text" class="form-control-soft" placeholder="Cari bahan baku..." v-model="productSearch" @focus="isDropdownOpen = true">
                        
                        <div v-if="isDropdownOpen" class="custom-dropdown-menu shadow-lg border-0 rounded-4 mt-1 bg-white">
                            <div v-for="p in filteredProductOptions" :key="p.id" class="dropdown-item p-3 border-bottom d-flex justify-content-between align-items-center" @click="selectProduct(p)">
                                <div>
                                    <strong class="d-block">{{ p.name }}</strong>
                                </div>
                                <span class="badge rounded-pill" :class="p.current_stock > 0 ? 'bg-sage-light text-success' : 'bg-soft-pink text-danger'">
                                    Stok: {{ p.current_stock }} {{ p.unit }}
                                </span>
                            </div>
                            <div v-if="filteredProductOptions.length === 0" class="p-3 text-center text-muted">Bahan tidak ditemukan</div>
                        </div>
                    </div>

                    <div class="mb-4">
                        <label class="form-label x-small text-muted fw-bold">JUMLAH PERUBAHAN</label>
                        <input type="number" v-model="form.qty_change" class="form-control-soft" placeholder="Contoh: 10">
                    </div>

                    <button class="btn-submit w-100 shadow" @click="submitTrx" :disabled="isSubmitting">
                        {{ isSubmitting ? 'Memproses...' : 'Simpan Transaksi' }}
                    </button>
                </div>
            </div>
        </div>

        <div class="col-lg-7">
            <div class="card-modern shadow-sm min-vh-75 d-flex flex-column">
                <h5 class="fw-bold text-dark-green mb-4">Activity Log Gudang</h5>
                
                <div class="history-list flex-grow-1 custom-scroll px-1">
                    <div v-if="logs.length === 0" class="text-center py-5 text-muted">
                        <i class="fas fa-history fa-3x mb-3 opacity-25"></i>
                        <p>Belum ada aktivitas stok tercatat.</p>
                    </div>

                    <div v-for="log in logs" :key="log.id" class="history-item animate-list">
                        <div class="icon-wrapper shadow-sm" :class="log.transaction_type === 'INBOUND' ? 'bg-sage-light text-success' : 'bg-soft-pink text-danger'">
                            <i :class="log.transaction_type === 'INBOUND' ? 'fas fa-arrow-down' : 'fas fa-arrow-up'"></i>
                        </div>
                        <div class="ms-3 flex-grow-1 overflow-hidden">
                            <h6 class="fw-bold mb-0 text-dark text-truncate">{{ log.product_name }}</h6>
                            <div class="d-flex align-items-center gap-2 mt-1">
                                <span class="badge x-small border" :class="log.source === 'IMAGE_AI' ? 'bg-info-soft text-info' : 'bg-light text-muted'">
                                    {{ log.source }}
                                </span>
                                <small class="text-muted x-small italic text-truncate">{{ log.raw_input_text || '-' }}</small>
                            </div>
                        </div>
                        <div class="text-end ms-2">
                            <div class="fw-bold fs-5" :class="log.qty_change > 0 ? 'text-success' : 'text-danger'">
                                {{ log.qty_change > 0 ? '+' : '' }}{{ log.qty_change }}
                                <small class="fw-normal text-muted ms-1" style="font-size: 0.7rem;">{{ log.unit || 'pcs' }}</small>
                            </div>
                            <small class="x-small text-muted-light">{{ new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</small>
                        </div>
                    </div>
                </div>

                <div class="pagination-footer d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                    <button class="btn-page" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <div class="page-info">
                        Halaman <span class="text-dark-green fw-bold">{{ currentPage }}</span> dari <span class="fw-bold">{{ totalPages }}</span>
                    </div>
                    <button class="btn-page" :disabled="currentPage === totalPages" @click="changePage(currentPage + 1)">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* --- THEME COLORS --- */
:root {
    --dark-green: #2c4a3b;
    --sage-light: #e6f0eb;
    --soft-pink: #ffe6e6;
    --light-gray: #f8fafc;
}

/* --- UTILS --- */
.text-dark-green { color: #2c4a3b; }
.bg-sage-light { background-color: #e6f0eb; }
.bg-soft-pink { background-color: #ffe6e6; }
.bg-info-soft { background-color: #e0f2fe; }
.x-small { font-size: 0.75rem; }
.italic { font-style: italic; }
.shadow-inner { box-shadow: inset 0 2px 10px rgba(0,0,0,0.1); }

/* --- PAGE & CARDS --- */
.page-container { background-color: #f8fafc; }
.card-modern { background: white; border-radius: 28px; padding: 28px; border: 1px solid rgba(0,0,0,0.03); transition: 0.3s; }

/* --- TABS --- */
.nav-tabs-wrapper { display: flex; background: #f1f5f9; padding: 6px; border-radius: 18px; gap: 4px; }
.tab-btn { flex: 1; border: none; padding: 12px; border-radius: 14px; background: transparent; color: #64748b; font-weight: 700; font-size: 0.85rem; transition: 0.2s; }
.tab-btn.active { background: white; color: #2c4a3b; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

/* --- CAMERA & OVERLAY --- */
.camera-wrapper { width: 100%; height: 380px; background: #0f172a; border-radius: 24px; overflow: hidden; position: relative; border: 6px solid #f1f5f9; }
.video-preview { width: 100%; height: 100%; object-fit: cover; }
.scan-overlay { position: absolute; inset: 0; background: rgba(44, 74, 59, 0.45); display: flex; align-items: center; justify-content: center; flex-direction: column; }
.scan-grid { width: 75%; height: 65%; border: 2px dashed #4ade80; background: rgba(74, 222, 128, 0.1); animation: pulseGrid 2s infinite; border-radius: 20px; }
.scan-text { color: white; margin-top: 15px; font-size: 0.9rem; letter-spacing: 1px; }
@keyframes pulseGrid { 0%, 100% { opacity: 0.3; transform: scale(0.98); } 50% { opacity: 0.8; transform: scale(1); } }

/* --- FORMS --- */
.form-control-soft { width: 100%; padding: 14px 18px; border: 2px solid #f1f5f9; border-radius: 16px; background: #f8fafc; transition: 0.2s; font-weight: 500; }
.form-control-soft:focus { border-color: #2c4a3b; background: white; outline: none; box-shadow: 0 0 0 4px rgba(44, 74, 59, 0.1); }
.type-badge { padding: 12px; border: 2px solid #f1f5f9; border-radius: 16px; cursor: pointer; text-align: center; color: #94a3b8; font-weight: 800; transition: 0.2s; background: white; }
.type-badge.active { background: #2c4a3b; color: white; border-color: #2c4a3b; box-shadow: 0 8px 15px rgba(44, 74, 59, 0.2); }

/* --- LISTS --- */
.custom-scroll { max-height: 550px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #e2e8f0 transparent; }
.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

.history-item { display: flex; align-items: center; padding: 18px 8px; border-bottom: 1px solid #f1f5f9; transition: 0.2s; }
.history-item:hover { background-color: #f8fafc; border-radius: 12px; }
.icon-wrapper { width: 48px; height: 48px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }

/* --- SCAN ITEMS --- */
.scan-item { display: flex; justify-content: space-between; align-items: center; padding: 14px; border-radius: 16px; background: #f8fafc; margin-bottom: 8px; border: 1px solid #f1f5f9; }
.qty-badge { padding: 4px 12px; border-radius: 10px; font-weight: 800; font-size: 0.85rem; }
.status-in { background: #dcfce7; color: #166534; }
.status-out { background: #fee2e2; color: #991b1b; }

/* --- DROPDOWN --- */
.custom-dropdown-menu { position: absolute; top: 100%; left: 0; width: 100%; max-height: 300px; overflow-y: auto; z-index: 1005; }

/* --- BUTTONS --- */
.btn-refresh { background: white; border: 2px solid #f1f5f9; padding: 10px 20px; border-radius: 14px; color: #475569; font-weight: 700; transition: 0.2s; }
.btn-refresh:hover { background: #f1f5f9; color: #2c4a3b; }
.btn-snap { background: #2c4a3b; color: white; border: none; padding: 16px 36px; border-radius: 50px; font-weight: 800; letter-spacing: 0.5px; transition: 0.3s; }
.btn-snap:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(44, 74, 59, 0.3); }
.btn-submit { background: #2c4a3b; color: white; border: none; padding: 16px; border-radius: 18px; font-weight: 800; transition: 0.3s; }
.btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(44, 74, 59, 0.2); }
.btn-page { width: 42px; height: 42px; border-radius: 14px; border: 2px solid #f1f5f9; background: white; color: #2c4a3b; transition: 0.2s; }
.btn-page:hover:not(:disabled) { background: #2c4a3b; color: white; border-color: #2c4a3b; }
.btn-page:disabled { opacity: 0.3; cursor: not-allowed; }
.btn-remove-sm {    background: #ffe1e1;
    border: none;
    color: #991b1b;
    border-radius: 8px;
    margin: 1px;
}
/* --- ANIMATIONS --- */
.fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>