<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import axios from 'axios'

// --- STATE ---
const productSearch = ref("")
const isDropdownOpen = ref(false)
const products = ref([])
const logs = ref([])

// API URL
// const API_URL = "http://localhost:8000"
const API_URL = "https://api.inventorycafe.space"

const isSubmitting = ref(false)
const isAnalyzing = ref(false)

// CAMERA STATE
const videoRef = ref(null)
const canvasRef = ref(null)
const stream = ref(null)

const activeTab = ref('paper') 
const scanResults = ref([]) 

// 1. UPDATE: Hapus 'note' dari state form
const form = ref({ product_id: "", qty_change: "", type: "INBOUND" })

// --- COMPUTED: Filter Produk untuk Search ---
const filteredProductOptions = computed(() => {
    if (!productSearch.value) return products.value
    return products.value.filter(p => 
        p.name.toLowerCase().includes(productSearch.value.toLowerCase())
    )
})

// --- 1. LOGIC KAMERA ---
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

// --- 2. LOGIC SCAN LOKAL ---
const capturePaper = async () => {
    isAnalyzing.value = true;
    const context = canvasRef.value.getContext('2d');
    const video = videoRef.value;

    canvasRef.value.width = video.videoWidth;
    canvasRef.value.height = video.videoHeight;
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    canvasRef.value.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'scan.jpg');
        try {
            const res = await axios.post(`${API_URL}/inventory/scan-local`, formData, {
                timeout: 120000 
            });
            scanResults.value = res.data;
        } catch (err) {
            alert("Gagal scan: " + err.message);
        } finally {
            isAnalyzing.value = false;
        }
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
        await fetchData()
        scanResults.value = []; 
        alert("✅ Data berhasil disimpan ke database!");
    } catch(e) { 
        alert("Gagal simpan: " + (e.response?.data?.detail?.[0]?.msg || e.message));
    } finally { 
        isSubmitting.value = false 
    }
}

const removeScanItem = (index) => { scanResults.value.splice(index, 1) }

// --- 3. STANDARD LOGIC & MANUAL INPUT ---
const fetchData = async () => {
    try {
        const [pRes, lRes] = await Promise.all([
            axios.get(`${API_URL}/products/`),
            axios.get(`${API_URL}/inventory/history`)
        ])
        products.value = pRes.data; logs.value = lRes.data
    } catch (e) { console.error(e) }
}

const submitTrx = async () => {
    if(!form.value.product_id || !form.value.qty_change) return alert("Lengkapi data!")
    isSubmitting.value = true
    try {
        // 2. UPDATE: Payload tidak lagi mengambil note dari user
        await axios.post(`${API_URL}/inventory/transaction`, {
            product_id: form.value.product_id,
            qty_change: form.value.type === 'OUTBOUND' ? -Math.abs(form.value.qty_change) : Math.abs(form.value.qty_change),
            transaction_type: form.value.type,
            source: "MANUAL_APP",
            raw_input_text: "Input Manual" // Default text karena input note dihapus
        })
        await fetchData(); 
        
        // Reset form
        form.value.qty_change = "";
        form.value.product_id = "";
        productSearch.value = ""; 
        
    } catch(e) { alert(e.message) } 
    finally { isSubmitting.value = false }
}

const setType = (t) => form.value.type = t

// --- FUNGSI PILIH PRODUK (DROPDOWN SEARCH) ---
const selectProduct = (product) => {
    form.value.product_id = product.id
    productSearch.value = product.name 
    isDropdownOpen.value = false 
}

watch(() => form.value.product_id, (newVal) => {
    if (!newVal) {
        productSearch.value = "" 
        return
    }
    const selected = products.value.find(p => p.id === newVal)
    if (selected) {
        productSearch.value = selected.name
    }
})

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
  <div class="page-container">
    <div class="mb-4 d-flex justify-content-between align-items-center">
      <div>
        <h2 class="fw-bold text-dark-green m-0">🔄 Stok Movement</h2>
        <span class="badge bg-success-soft text-success">Lokal AI Mode</span>
      </div>
      <button class="btn btn-outline-secondary btn-sm" @click="fetchData">🔄 Refresh</button>
    </div>

    <div class="row g-4">
        <div class="col-lg-5">
            <div class="card-modern sticky-top" style="top: 20px; z-index: 1;">
                
                <div class="nav-tabs-wrapper mb-4">
                    <button class="tab-btn" :class="{ active: activeTab === 'paper' }" @click="activeTab = 'paper'">📝 Paper Scan</button>
                    <button class="tab-btn" :class="{ active: activeTab === 'manual' }" @click="activeTab = 'manual'">👆 Manual</button>
                </div>

                <div v-show="activeTab === 'paper'" class="text-center fade-in">
                    <div class="camera-wrapper mb-3" v-if="scanResults.length === 0">
                        <video ref="videoRef" autoplay playsinline class="video-preview"></video>
                        <canvas ref="canvasRef" width="400" height="400" style="display:none;"></canvas>
                        
                        <div class="scan-overlay" v-if="isAnalyzing">
                            <div class="scan-grid"></div>
                            <span class="scan-text">🤖 Ollama Sedang Menganalisa...</span>
                        </div>
                    </div>

                    <div v-if="scanResults.length === 0">
                        <button class="btn-snap" @click="capturePaper" :disabled="isAnalyzing">
                            {{ isAnalyzing ? 'Menganalisa...' : '📸 Foto & Baca Tulisan' }}
                        </button>
                        <p class="mt-2 text-muted small">Memproses data tanpa internet</p>
                    </div>

                    <div v-else class="scan-results text-start">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="fw-bold text-dark-green m-0">Hasil Scan Lokal ({{ scanResults.length }})</h6>
                            <button class="btn btn-sm btn-outline-danger" @click="scanResults = []">Ulang</button>
                        </div>
                        <div class="scan-list-scroll">
                            <div v-for="(item, idx) in scanResults" :key="idx" class="scan-item">
                                <div>
                                    <div class="fw-bold text-dark">{{ item.name }}</div>
                                    <small class="text-muted">{{ item.note }}</small>
                                </div>
                                <div class="text-end d-flex align-items-center gap-2">
                                    <span class="badge-custom" :class="item.type.toUpperCase() === 'INBOUND' ? 'status-in' : 'status-out'">
                                        {{ item.type.toUpperCase() === 'INBOUND' ? '+' : '-' }}{{ item.qty }}
                                    </span>
                                    <button class="btn-remove-sm" @click="removeScanItem(idx)">×</button>
                                </div>
                            </div>
                        </div>
                        <button class="btn-submit w-100 mt-3" @click="submitBulkScan" :disabled="isSubmitting">
                            {{ isSubmitting ? 'Menyimpan...' : '✅ Konfirmasi Masuk Stok' }}
                        </button>
                    </div>
                </div>

                <div v-if="activeTab === 'manual'" class="fade-in pt-2">
                    <div class="d-flex gap-2 mb-2">
                        <div class="type-badge" :class="{ active: form.type === 'INBOUND' }" @click="setType('INBOUND')">📥 Masuk</div>
                        <div class="type-badge" :class="{ active: form.type === 'OUTBOUND' }" @click="setType('OUTBOUND')">📤 Keluar</div>
                    </div>

                    <div class="mb-2 position-relative">
                        <label class="form-label small text-muted">Pilih Produk</label>
                        
                        <input 
                            type="text" 
                            class="form-control form-control-soft"
                            placeholder="Ketik nama produk..."
                            v-model="productSearch"
                            @focus="isDropdownOpen = true"
                            @input="isDropdownOpen = true" 
                        >
                        
                        <div 
                            v-if="isDropdownOpen" 
                            class="custom-dropdown-menu shadow-sm border rounded mt-1 bg-white"
                        >
                            <div 
                                v-for="p in filteredProductOptions" 
                                :key="p.id" 
                                class="dropdown-item p-2 border-bottom"
                                @click="selectProduct(p)"
                                style="cursor: pointer;"
                            >
                                <div class="d-flex justify-content-between">
                                    <span class="fw-bold">{{ p.name }}</span>
                                    <span class="badge" :class="p.current_stock > 0 ? 'bg-success' : 'bg-danger'">
                                        Stok: {{ p.current_stock }}
                                    </span>
                                </div>
                            </div>

                            <div v-if="filteredProductOptions.length === 0" class="p-3 text-center text-muted">
                                Produk tidak ditemukan
                            </div>
                        </div>
                    </div>

                    <div 
                        v-if="isDropdownOpen" 
                        @click="isDropdownOpen = false"
                        class="position-fixed top-0 start-0 w-100 h-100" 
                        style="z-index: 998;">
                    </div>

                    <input type="number" v-model="form.qty_change" class="form-control-soft mb-3" placeholder="Jumlah">
                    
                    <button class="btn-submit w-100" @click="submitTrx" :disabled="isSubmitting">
                        {{ isSubmitting ? 'Memproses...' : 'Simpan Transaksi' }}
                    </button>
                </div>
            </div>
        </div>

        <div class="col-lg-7">
            <div class="card-modern">
                <h5 class="fw-bold text-dark-green mb-4">Aktivitas Gudang</h5>
                <div class="history-list">
                    <div v-if="logs.length === 0" class="text-center py-5 text-muted">Belum ada aktivitas.</div>
                    <div v-for="log in logs" :key="log.id" class="history-item">
                        <div class="icon-wrapper" :class="log.transaction_type === 'INBOUND' ? 'bg-sage-light text-dark-green' : 'bg-soft-pink text-danger'">
                            {{ log.transaction_type === 'INBOUND' ? '↓' : '↑' }}
                        </div>
                        <div class="ms-3 flex-grow-1">
                            <h6 class="fw-bold mb-1">{{ log.product_name }}</h6>
                            <span class="badge" :class="log.source === 'IMAGE_AI' ? 'bg-info text-white' : 'bg-light text-muted border'">{{ log.source }}</span>
                            <small class="text-muted d-block mt-1">{{ log.raw_input_text || '-' }}</small>
                        </div>
                        <div class="text-end">
                            <span class="fw-bold fs-5" :class="log.qty_change > 0 ? 'text-success' : 'text-danger'">
                                {{ log.qty_change > 0 ? '+' : '' }}{{ log.qty_change }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS agar Dropdown melayang di atas konten lain */
.position-relative {
    position: relative;
    z-index: 1000;
}

.custom-dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    max-height: 250px;
    overflow-y: auto;
    z-index: 1001; 
}

.dropdown-item:hover {
    background-color: #f8f9fa;
}

/* --- Style umum --- */
.bg-success-soft { background-color: #e6f7ed; color: #198754; padding: 4px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; }
.camera-wrapper { width: 100%; height: 350px; background: #111; border-radius: 20px; overflow: hidden; position: relative; border: 4px solid #f0f0f0; }
:root { --dark-green: #2c4a3b; --sage-light: #e6f0eb; --soft-pink: #ffe6e6; }
.card-modern { background: white; border-radius: 24px; padding: 25px; border: 1px solid #f0f0f0; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
.nav-tabs-wrapper { display: flex; background: #f5f5f5; padding: 5px; border-radius: 15px; gap: 5px; margin-bottom: 20px;}
.tab-btn { flex: 1; border: none; padding: 10px; border-radius: 12px; background: transparent; color: #888; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; }
.tab-btn.active { background: white; color: #2c4a3b; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.video-preview { width: 100%; height: 100%; object-fit: cover; }
.scan-overlay { position: absolute; inset: 0; background: rgba(44, 74, 59, 0.4); display: flex; align-items: center; justify-content: center; flex-direction: column; }
.scan-grid { width: 80%; height: 60%; border: 2px dashed #00ff00; background: rgba(0,255,0,0.1); animation: pulseGrid 2s infinite; }
.scan-text { color: white; margin-top: 15px; font-weight: bold; }
@keyframes pulseGrid { 0% { opacity: 0.3; } 50% { opacity: 0.8; } 100% { opacity: 0.3; } }
.btn-snap { background: #2c4a3b; color: white; border: none; padding: 12px 30px; border-radius: 50px; font-weight: bold; width: 100%; }
.scan-list-scroll { max-height: 250px; overflow-y: auto; border: 1px solid #eee; border-radius: 12px; padding: 10px; }
.scan-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px dashed #eee; }
.btn-remove-sm { width: 25px; height: 25px; border-radius: 50%; border: none; background: #ffe6e6; color: red; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;}
.form-control-soft { width: 100%; padding: 10px 15px; border: 1px solid #eee; border-radius: 12px; background: white; }
.type-badge { flex: 1; padding: 8px; border: 1px solid #eee; border-radius: 8px; cursor: pointer; text-align: center; color: #888; background: white; font-weight: 600; }
.type-badge.active { background: #e6f0eb; color: #2c4a3b; border-color: #2c4a3b; }
.btn-submit { background: #2c4a3b; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: bold; width: 100%; }
.history-item { display: flex; align-items: center; padding: 15px 0; border-bottom: 1px dashed #eee; }
.icon-wrapper { width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; }
.fade-in { animation: fadeIn 0.3s ease-in; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>