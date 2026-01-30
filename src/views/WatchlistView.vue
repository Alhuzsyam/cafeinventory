<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import axios from 'axios'

// --- STATE UMUM ---
const queue = ref([])
const API_URL = "https://api.inventorycafe.space"
let pollingInterval = null

// --- STATE AUDIO & LOGIK NOTIFIKASI ---
const isAudioEnabled = ref(true)
const knownKitchenIds = ref(new Set()) // Menyimpan ID yang sudah pernah dilihat
const audioPath = "/sounds/bell2.mp3" 
const notificationSound = new Audio(audioPath)

// --- FETCH DATA ---
const fetchQueue = async () => {
    try {
        const res = await axios.get(`${API_URL}/queue/`)
        const currentQueue = res.data || []
        
        // Ambil ID khusus untuk divisi Kitchen
        const currentKitchenItems = currentQueue.filter(i => i.division === 'Kitchen')
        const currentKitchenIds = currentKitchenItems.map(i => i.id)

        // LOGIKA BUNYI: Cek apakah ada ID baru yang belum pernah masuk ke "knownKitchenIds"
        let hasNewOrder = false
        currentKitchenIds.forEach(id => {
            if (!knownKitchenIds.value.has(id)) {
                hasNewOrder = true
                knownKitchenIds.value.add(id) // Tandai ID ini sebagai "sudah dilihat"
            }
        });

        // Bunyi hanya jika ada pesanan benar-benar baru
        if (isAudioEnabled.value && hasNewOrder) {
            playBell()
        }

        // Bersihkan ID lama yang sudah tidak ada di antrean agar memory tidak bengkak
        const currentAllIds = new Set(currentQueue.map(i => i.id))
        knownKitchenIds.value.forEach(id => {
            if (!currentAllIds.has(id)) knownKitchenIds.value.delete(id)
        })

        queue.value = currentQueue
    } catch (e) {
        console.error("Gagal load queue:", e)
    }
}

const playBell = () => {
    notificationSound.currentTime = 0 
    notificationSound.play().catch(err => console.warn("Audio blocked", err))
}

const toggleAudio = () => {
    isAudioEnabled.value = !isAudioEnabled.value
    if (isAudioEnabled.value) {
        notificationSound.play().then(() => notificationSound.pause())
    }
}

// --- ACTIONS ---
const markAsServed = async (id) => {
    try {
        // Hapus ID dari set "sudah dilihat" agar tidak ada sisa data
        knownKitchenIds.value.delete(id)
        
        await axios.put(`${API_URL}/queue/${id}/serve`)
        await fetchQueue() // Refresh data langsung
    } catch (e) {
        alert("Gagal update status")
    }
}

// --- COMPUTED ---
const barQueue = computed(() => queue.value.filter(i => i.division === 'Bar'))
const kitchenQueue = computed(() => queue.value.filter(i => i.division === 'Kitchen'))

onMounted(() => {
    fetchQueue()
    pollingInterval = setInterval(fetchQueue, 5000)
})

onUnmounted(() => {
    clearInterval(pollingInterval)
})

const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="page-container h-100 p-3">
    
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4 px-2 gap-3">
        <div>
            <h2 class="fw-bold brand-text m-0">
                <i class="fa-solid fa-leaf me-2 text-accent"></i>Order Monitor
            </h2>
            <p class="text-muted m-0 ps-1" style="font-size: 0.9rem;">Live Kitchen Display System</p>
        </div>

        <div class="d-flex align-items-center gap-4 py-2">
            <button @click="toggleAudio" class="btn-audio shadow-sm px-4" :class="{ 'active': isAudioEnabled }">
                <i class="fa-solid me-2" :class="isAudioEnabled ? 'fa-volume-high' : 'fa-volume-xmark'"></i>
                <span>{{ isAudioEnabled ? 'Suara Aktif' : 'Suara Mati' }}</span>
            </button>

            <div class="live-indicator d-flex align-items-center ms-2">
                <div class="blob red me-3"></div>
                <span class="text-muted fw-bold small tracking-wider">LIVE UPDATE</span>
            </div>
        </div>
    </div>

    <div class="row h-100 g-4">
        <div class="col-md-6 d-flex flex-column">
            <div class="station-wrapper bar-theme h-100">
                <div class="station-header shadow-sm">
                    <div class="icon-circle"><i class="fa-solid fa-martini-glass-citrus"></i></div>
                    <div>
                        <h4 class="fw-bold m-0">Bar Station</h4>
                        <small class="opacity-75">{{ barQueue.length }} Antrean</small>
                    </div>
                </div>
                <div class="queue-scroll-area">
                    <div v-if="barQueue.length === 0" class="empty-state">
                        <i class="fa-solid fa-mug-hot mb-3 fs-1"></i>
                        <p>Bar sedang kosong.</p>
                    </div>
                    <div v-for="item in barQueue" :key="item.id" class="plant-card fade-in">
                        <div class="card-content">
                            <div class="d-flex justify-content-between mb-2">
                                <span class="order-badge">#{{ item.sale_id }}</span>
                                <span class="time-badge">{{ formatTime(item.created_at) }}</span>
                            </div>
                            <h5 class="menu-title">{{ item.menu_name }}</h5>
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <span class="customer-name">{{ item.customer_name }}</span>
                                <span class="qty-badge">x{{ item.quantity }}</span>
                            </div>
                            <div v-if="item.note" class="note-bubble">{{ item.note }}</div>
                        </div>
                        <div class="card-action">
                            <button class="btn-serve" @click="markAsServed(item.id)"><i class="fa-solid fa-check"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-md-6 d-flex flex-column">
            <div class="station-wrapper kitchen-theme h-100">
                <div class="station-header shadow-sm">
                    <div class="icon-circle"><i class="fa-solid fa-fire-burner"></i></div>
                    <div>
                        <h4 class="fw-bold m-0">Kitchen Station</h4>
                        <small class="opacity-75">{{ kitchenQueue.length }} Antrean</small>
                    </div>
                </div>
                <div class="queue-scroll-area">
                    <div v-if="kitchenQueue.length === 0" class="empty-state">
                        <i class="fa-solid fa-utensils mb-3 fs-1"></i>
                        <p>Dapur sedang kosong.</p>
                    </div>
                    <div v-for="item in kitchenQueue" :key="item.id" class="plant-card fade-in">
                        <div class="card-content">
                            <div class="d-flex justify-content-between mb-2">
                                <span class="order-badge">#{{ item.sale_id }}</span>
                                <span class="time-badge">{{ formatTime(item.created_at) }}</span>
                            </div>
                            <h5 class="menu-title">{{ item.menu_name }}</h5>
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <span class="customer-name">{{ item.customer_name }}</span>
                                <span class="qty-badge">x{{ item.quantity }}</span>
                            </div>
                            <div v-if="item.note" class="note-bubble">{{ item.note }}</div>
                        </div>
                        <div class="card-action">
                            <button class="btn-serve" @click="markAsServed(item.id)"><i class="fa-solid fa-check"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* --- THEME COLORS --- */
.brand-text { color: #203A2E; }
.text-accent { color: #84a548; }

/* --- BUTTON AUDIO (FIXED SPACE) --- */
.btn-audio {
    background: white;
    border: 1.5px solid #eee;
    border-radius: 50px;
    padding: 10px 20px;
    font-weight: 700;
    font-size: 0.85rem;
    color: #dc3545;
    transition: 0.3s;
    display: flex;
    align-items: center;
    min-width: 170px; /* Biar posisi LIVE UPDATE ga geser pas teks berubah */
    justify-content: center;
}
.btn-audio.active {
    color: #2c4a3b;
    border-color: #2c4a3b;
    background: #e6f0eb;
}

/* --- LIVE INDICATOR --- */
.live-indicator {
    padding: 10px 18px;
    background: rgba(0,0,0,0.04);
    border-radius: 50px;
}
.tracking-wider { letter-spacing: 0.05rem; }

/* --- STATION LAYOUT --- */
.station-wrapper {
    background-color: #f0f4f1;
    border-radius: 35px;
    padding: 25px;
}
.station-header {
    display: flex; align-items: center; gap: 15px; margin-bottom: 25px;
    padding: 15px 20px; background: white; border-radius: 50px;
}

.icon-circle {
    width: 48px; height: 48px; border-radius: 50%; display: flex; 
    align-items: center; justify-content: center; font-size: 1.3rem; color: white;
}
.bar-theme .icon-circle { background-color: #4A6C56; }
.kitchen-theme .icon-circle { background-color: #d68c45; }

/* --- CARD STYLING --- */
.plant-card {
    background: white; border-radius: 26px; padding: 22px; margin-bottom: 18px;
    display: flex; justify-content: space-between; align-items: center;
    border: 1px solid rgba(0,0,0,0.01);
}
.menu-title { font-weight: 800; color: #203A2E; margin-bottom: 6px; font-size: 1.15rem; }
.qty-badge { background: #e6f0eb; color: #2c4a3b; padding: 2px 10px; border-radius: 10px; font-weight: 800; }
.order-badge { background: #f3f4f6; color: #6b7280; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 800; }

.note-bubble {
    background-color: #fff9c4; color: #856404; padding: 10px 15px;
    border-radius: 15px; font-size: 0.85rem; margin-top: 12px; border: 1px dashed #e6dbb9;
}

.btn-serve {
    width: 55px; height: 55px; border-radius: 50%; border: none;
    background-color: #203A2E; color: white; transition: 0.2s;
}
.btn-serve:hover { background-color: #84a548; transform: scale(1.1); }

/* --- ANIMASI --- */
.blob { width: 12px; height: 12px; background: #ff5252; border-radius: 50%; animation: pulse-red 2s infinite; }
@keyframes pulse-red {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 82, 82, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 82, 82, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 82, 82, 0); }
}
.fade-in { animation: fadeIn 0.4s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* SCROLLBAR */
.queue-scroll-area { overflow-y: auto; flex-grow: 1; padding-right: 8px; scrollbar-width: thin; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
</style>