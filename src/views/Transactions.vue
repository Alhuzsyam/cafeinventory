<!-- <script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const products = ref([])
const logs = ref([])
const API_URL = "http://127.0.0.1:8000"
const isSubmitting = ref(false)

// Form State
const form = ref({ 
    product_id: "", 
    qty_change: "", // Ubah ke string kosong dulu biar placeholder muncul
    type: "INBOUND", 
    note: "" 
})

const fetchData = async () => {
    try {
        const pRes = await axios.get(`${API_URL}/products/`)
        products.value = pRes.data
        const lRes = await axios.get(`${API_URL}/inventory/history`)
        logs.value = lRes.data
    } catch (e) {
        console.error(e)
    }
}

const setType = (type) => {
    form.value.type = type
}

const submitTrx = async () => {
    if(!form.value.product_id || !form.value.qty_change || form.value.qty_change <= 0) {
        return alert("Mohon pilih produk dan isi jumlah yang valid!")
    }

    isSubmitting.value = true
    
    const payload = {
        product_id: form.value.product_id,
        // Logika backend: jika OUTBOUND, jadikan negatif
        qty_change: form.value.type === 'OUTBOUND' ? -Math.abs(form.value.qty_change) : Math.abs(form.value.qty_change),
        transaction_type: form.value.type,
        source: "MANUAL_APP",
        raw_input_text: form.value.note || "Input Manual via Web"
    }

    try {
        await axios.post(`${API_URL}/inventory/transaction`, payload)
        // Refresh data
        await fetchData()
        
        // Reset form (kecuali tipe, biar user ga perlu klik ulang kalau mau input sejenis)
        form.value.product_id = ""
        form.value.qty_change = ""
        form.value.note = ""
        
    } catch(e) { 
        alert("Error: " + (e.response?.data?.detail || e.message)) 
    } finally {
        isSubmitting.value = false
    }
}

// Helper untuk format tanggal
const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('id-ID', { 
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
    })
}

onMounted(fetchData)
</script>

<template>
  <div class="page-container">
    
    <div class="mb-4">
      <h2 class="fw-bold text-dark-green m-0">🔄 Stok Movement</h2>
      <p class="text-muted m-0">Catat barang masuk (restock) atau barang keluar (pemakaian)</p>
    </div>

    <div class="row g-4">
        
        <div class="col-lg-4">
            <div class="card-modern sticky-top" style="top: 20px; z-index: 1;">
                <h5 class="fw-bold text-dark-green mb-4">Input Transaksi</h5>

                <div class="d-flex gap-2 mb-4">
                    <div 
                        class="type-selector in" 
                        :class="{ active: form.type === 'INBOUND' }"
                        @click="setType('INBOUND')"
                    >
                        <span class="fs-4">📥</span>
                        <div class="fw-bold">Masuk</div>
                        <small>Restock</small>
                    </div>
                    <div 
                        class="type-selector out" 
                        :class="{ active: form.type === 'OUTBOUND' }"
                        @click="setType('OUTBOUND')"
                    >
                        <span class="fs-4">📤</span>
                        <div class="fw-bold">Keluar</div>
                        <small>Terjual/Rusak</small>
                    </div>
                </div>

                <div class="form-group mb-3">
                    <label>Pilih Produk</label>
                    <select v-model="form.product_id" class="form-control-soft form-select">
                        <option value="" disabled>-- Cari Produk --</option>
                        <option v-for="p in products" :key="p.id" :value="p.id">
                            {{ p.name }} (Sisa: {{ p.current_stock }} {{ p.unit }})
                        </option>
                    </select>
                </div>

                <div class="form-group mb-3">
                    <label>Jumlah ({{ form.type === 'INBOUND' ? 'Penambahan' : 'Pengurangan' }})</label>
                    <input 
                        type="number" 
                        v-model="form.qty_change" 
                        class="form-control-soft" 
                        min="1" 
                        placeholder="0"
                    >
                </div>

                <div class="form-group mb-4">
                    <label>Catatan (Opsional)</label>
                    <textarea 
                        v-model="form.note" 
                        class="form-control-soft" 
                        rows="2" 
                        placeholder="Contoh: Beli dari pasar, atau Stok rusak..."
                    ></textarea>
                </div>

                <button class="btn-submit w-100" @click="submitTrx" :disabled="isSubmitting">
                    {{ isSubmitting ? 'Memproses...' : 'Simpan Transaksi' }}
                </button>
            </div>
        </div>

        <div class="col-lg-8">
            <div class="card-modern">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h5 class="fw-bold text-dark-green m-0">Riwayat Aktivitas</h5>
                    <button class="btn btn-sm btn-light text-muted" @click="fetchData">🔄 Refresh</button>
                </div>

                <div class="history-list">
                    <div v-if="logs.length === 0" class="text-center py-5 text-muted">
                        Belum ada riwayat transaksi.
                    </div>

                    <div v-for="log in logs" :key="log.id" class="history-item">
                        <div class="icon-wrapper" :class="log.transaction_type === 'INBOUND' ? 'bg-sage-light text-dark-green' : 'bg-soft-pink text-danger'">
                            {{ log.transaction_type === 'INBOUND' ? '↓' : '↑' }}
                        </div>

                        <div class="flex-grow-1 ms-3">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="fw-bold text-dark mb-1">{{ log.product_name }}</h6>
                                    <p class="text-muted small mb-0">
                                        {{ log.raw_input_text || '-' }} 
                                        <span class="badge bg-light text-muted border ms-2">{{ log.source }}</span>
                                    </p>
                                </div>
                                <div class="text-end">
                                    <div class="fw-bold fs-5" :class="log.qty_change > 0 ? 'text-success' : 'text-danger'">
                                        {{ log.qty_change > 0 ? '+' : '' }}{{ log.qty_change }}
                                    </div>
                                    <small class="text-muted" style="font-size: 0.75rem;">
                                        {{ formatDate(log.created_at) }}
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* --- VARIABLES & UTILS --- */
:root {
  --dark-green: #2c4a3b;
  --sage-light: #e6f0eb;
  --soft-pink: #ffe6e6;
}
.text-dark-green { color: #2c4a3b; }
.bg-sage-light { background-color: #e6f0eb; }
.bg-soft-pink { background-color: #ffe6e6; }

/* --- CARD STYLE --- */
.card-modern {
    background: white;
    border-radius: 20px;
    padding: 25px;
    border: 1px solid #f0f0f0;
    box-shadow: 0 4px 20px rgba(0,0,0,0.02);
}

/* --- TYPE SELECTOR (TOGGLE BESAR) --- */
.type-selector {
    flex: 1;
    border: 2px solid #eee;
    border-radius: 15px;
    padding: 15px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    background: #fafafa;
    color: #888;
}

.type-selector:hover {
    background: white;
    border-color: #ddd;
}

.type-selector.in.active {
    background-color: #e6f0eb; /* Sage Light */
    border-color: #2c4a3b;
    color: #2c4a3b;
}

.type-selector.out.active {
    background-color: #ffe6e6; /* Soft Pink */
    border-color: #dc3545;
    color: #dc3545;
}

/* --- FORM INPUTS --- */
label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #555;
    margin-bottom: 6px;
    display: block;
}

.form-control-soft {
    width: 100%;
    padding: 12px 15px;
    border: 1px solid #eee;
    border-radius: 10px;
    background-color: #fafafa;
    transition: all 0.3s;
    font-size: 0.95rem;
}

.form-control-soft:focus {
    background-color: white;
    border-color: #b8d0c3;
    outline: none;
    box-shadow: 0 0 0 3px rgba(44, 74, 59, 0.1);
}

/* --- BUTTONS --- */
.btn-submit {
    background-color: #2c4a3b;
    color: white;
    border: none;
    padding: 12px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    margin-top: 10px;
}
.btn-submit:hover {
    background-color: #1e3329;
}
.btn-submit:disabled {
    background-color: #9aa5a0;
    cursor: not-allowed;
}

/* --- HISTORY LIST --- */
.history-item {
    display: flex;
    align-items: center;
    padding: 15px 0;
    border-bottom: 1px dashed #eee;
}
.history-item:last-child {
    border-bottom: none;
}

.icon-wrapper {
    width: 45px;
    height: 45px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 1.2rem;
}
</style> -->


<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import axios from 'axios'

const products = ref([])
const logs = ref([])

// ⚠️ Pastikan port 8000 sesuai dengan port FastAPI Anda
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
const form = ref({ product_id: "", qty_change: "", type: "INBOUND", note: "" })

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

// --- 2. LOGIC SCAN LOKAL (MENEMBAK KE FASTAPI) ---
const capturePaper = async () => {
    isAnalyzing.value = true;
    const context = canvasRef.value.getContext('2d');
    const video = videoRef.value;

    // Gunakan ukuran asli dari stream video agar tidak terpotong
    canvasRef.value.width = video.videoWidth;
    canvasRef.value.height = video.videoHeight;
    
    // Gambar seluruh frame video ke canvas
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    console.log(`📸 Gambar diambil: ${video.videoWidth}x${video.videoHeight}`);

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
            // Pastikan kita mengambil angka yang benar (qty atau qty_change)
            const jumlah = item.qty || item.qty_change || 0;
            
            await axios.post(`${API_URL}/inventory/transaction`, {
                product_id: item.id,
                // Pastikan qty_change adalah integer dan tidak null
                qty_change: item.type === 'OUTBOUND' ? -Math.abs(jumlah) : Math.abs(jumlah),
                transaction_type: item.type,
                // GANTI 'LOCAL_AI' menjadi 'IMAGE_AI' agar sesuai Enum di Backend
                source: "IMAGE_AI", 
                raw_input_text: item.note || "Paper Scan Lokal"
            })
        }
        await fetchData()
        scanResults.value = []; 
        alert("✅ Data berhasil disimpan ke database!");
    } catch(e) { 
        console.error("Detail Error:", e.response?.data);
        alert("Gagal simpan: " + (e.response?.data?.detail?.[0]?.msg || e.message));
    } finally { 
        isSubmitting.value = false 
    }
}

const removeScanItem = (index) => { scanResults.value.splice(index, 1) }

// --- 3. STANDARD LOGIC ---
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
        await axios.post(`${API_URL}/inventory/transaction`, {
            product_id: form.value.product_id,
            qty_change: form.value.type === 'OUTBOUND' ? -form.value.qty_change : form.value.qty_change,
            transaction_type: form.value.type,
            source: "MANUAL_APP",
            raw_input_text: form.value.note
        })
        await fetchData(); form.value.qty_change = "";
    } catch(e) { alert(e.message) } 
    finally { isSubmitting.value = false }
}

const setType = (t) => form.value.type = t
const formatDate = (d) => new Date(d).toLocaleString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})

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
                    <select v-model="form.product_id" class="form-control-soft mb-2">
                        <option value="" disabled>-- Pilih Produk --</option>
                        <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} (Stok: {{p.current_stock}})</option>
                    </select>
                    <input type="number" v-model="form.qty_change" class="form-control-soft mb-3" placeholder="Jumlah">
                    <button class="btn-submit w-100" @click="submitTrx" :disabled="isSubmitting">Simpan Transaksi</button>
                </div>
            </div>
        </div>

        <div class="col-lg-7">
            <div class="card-modern">
                <h5 class="fw-bold text-dark-green mb-4">Aktivitas Gudang</h5>
                <div class="history-list">
                    <div v-for="log in logs" :key="log.id" class="history-item">
                        <div class="icon-wrapper" :class="log.transaction_type === 'INBOUND' ? 'bg-sage-light text-dark-green' : 'bg-soft-pink text-danger'">
                            {{ log.transaction_type === 'INBOUND' ? '↓' : '↑' }}
                        </div>
                        <div class="ms-3 flex-grow-1">
                            <h6 class="fw-bold mb-1">{{ log.product_name }}</h6>
                            <span class="badge" :class="log.source === 'LOCAL_AI' ? 'bg-info text-white' : 'bg-light text-muted border'">{{ log.source }}</span>
                            <div class="text-end float-end">
                                <span class="fw-bold" :class="log.qty_change > 0 ? 'text-success' : 'text-danger'">
                                    {{ log.qty_change > 0 ? '+' : '' }}{{ log.qty_change }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* Tambahkan sedikit variasi warna untuk mode lokal */
.bg-success-soft { background-color: #e6f7ed; color: #198754; padding: 4px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; }
.camera-wrapper { width: 100%; height: 350px; background: #111; border-radius: 20px; overflow: hidden; position: relative; border: 4px solid #f0f0f0; }
/* Style sisanya tetap sama seperti desain modern sebelumnya */
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