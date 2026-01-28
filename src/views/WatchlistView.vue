<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import axios from 'axios'

const queue = ref([])
// const API_URL = "http://127.0.0.1:8000"
const API_URL = "https://api.inventorycafe.space"
let pollingInterval = null

// --- FETCH DATA ---
const fetchQueue = async () => {
    try {
        const res = await axios.get(`${API_URL}/queue/`)
        queue.value = res.data
    } catch (e) {
        console.error("Gagal load queue:", e)
    }
}

// --- ACTIONS ---
const markAsServed = async (id) => {
    try {
        await axios.put(`${API_URL}/queue/${id}/serve`)
        // Hapus lokal dengan animasi delay sedikit biar smooth
        const itemIndex = queue.value.findIndex(item => item.id === id)
        if (itemIndex !== -1) {
            // Kita bisa tambahkan logic animasi disini jika mau, 
            // tapi untuk sekarang hapus langsung dari array state
            queue.value.splice(itemIndex, 1)
        }
    } catch (e) {
        alert("Gagal update status")
    }
}

// --- COMPUTED (PEMISAH BAR & KITCHEN) ---
const barQueue = computed(() => queue.value.filter(i => i.division === 'Bar'))
const kitchenQueue = computed(() => queue.value.filter(i => i.division === 'Kitchen'))

// Auto Refresh setiap 5 detik
onMounted(() => {
    fetchQueue()
    pollingInterval = setInterval(fetchQueue, 5000)
})

onUnmounted(() => {
    clearInterval(pollingInterval)
})

// Helper Time
const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="page-container h-100">
    
    <div class="d-flex justify-content-between align-items-end mb-4 px-2">
        <div>
            <h2 class="fw-bold brand-text m-0">
                <i class="fa-solid fa-leaf me-2 text-accent"></i>Order Monitor
            </h2>
            <p class="text-muted m-0 ps-1" style="font-size: 0.9rem;">
                Live Kitchen Display System
            </p>
        </div>
        <div class="live-indicator">
            <div class="blob red"></div>
            <span class="text-muted fw-bold small">LIVE UPDATE</span>
        </div>
    </div>

    <div class="row h-100 g-4">
        
        <div class="col-md-6 d-flex flex-column">
            <div class="station-wrapper bar-theme h-100">
                <div class="station-header">
                    <div class="icon-circle">
                        <i class="fa-solid fa-martini-glass-citrus"></i>
                    </div>
                    <div>
                        <h4 class="fw-bold m-0">Bar Station</h4>
                        <small class="opacity-75">{{ barQueue.length }} Pesanan Menunggu</small>
                    </div>
                </div>

                <div class="queue-scroll-area">
                    
                    <div v-if="barQueue.length === 0" class="empty-state">
                        <i class="fa-solid fa-mug-hot mb-3 fs-1"></i>
                        <p>Tidak ada pesanan minuman.</p>
                    </div>

                    <div v-for="item in barQueue" :key="item.id" class="plant-card fade-in">
                        <div class="card-content">
                            <div class="d-flex justify-content-between mb-2">
                                <span class="order-badge">
                                    <i class="fa-solid fa-receipt me-1"></i> #{{ item.sale_id }}
                                </span>
                                <span class="time-badge">
                                    <i class="fa-regular fa-clock me-1"></i> {{ formatTime(item.created_at) }}
                                </span>
                            </div>
                            
                            <h5 class="menu-title">{{ item.menu_name }}</h5>
                            
                            <div class="d-flex align-items-center gap-2 mb-3 text-secondary">
                                <i class="fa-regular fa-user"></i>
                                <span class="customer-name">{{ item.customer_name }}</span>
                                <span class="qty-badge">x{{ item.quantity }}</span>
                            </div>

                            <div v-if="item.note" class="note-bubble">
                                <i class="fa-solid fa-note-sticky text-warning me-2"></i>
                                {{ item.note }}
                            </div>
                        </div>

                        <div class="card-action">
                            <button class="btn-serve" @click="markAsServed(item.id)" title="Sajikan">
                                <i class="fa-solid fa-check"></i>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>

        <div class="col-md-6 d-flex flex-column">
            <div class="station-wrapper kitchen-theme h-100">
                <div class="station-header">
                    <div class="icon-circle">
                        <i class="fa-solid fa-fire-burner"></i>
                    </div>
                    <div>
                        <h4 class="fw-bold m-0">Kitchen Station</h4>
                        <small class="opacity-75">{{ kitchenQueue.length }} Pesanan Menunggu</small>
                    </div>
                </div>

                <div class="queue-scroll-area">
                    
                    <div v-if="kitchenQueue.length === 0" class="empty-state">
                        <i class="fa-solid fa-utensils mb-3 fs-1"></i>
                        <p>Tidak ada pesanan makanan.</p>
                    </div>

                    <div v-for="item in kitchenQueue" :key="item.id" class="plant-card fade-in">
                        <div class="card-content">
                            <div class="d-flex justify-content-between mb-2">
                                <span class="order-badge">
                                    <i class="fa-solid fa-receipt me-1"></i> #{{ item.sale_id }}
                                </span>
                                <span class="time-badge">
                                    <i class="fa-regular fa-clock me-1"></i> {{ formatTime(item.created_at) }}
                                </span>
                            </div>
                            
                            <h5 class="menu-title">{{ item.menu_name }}</h5>
                            
                            <div class="d-flex align-items-center gap-2 mb-3 text-secondary">
                                <i class="fa-regular fa-user"></i>
                                <span class="customer-name">{{ item.customer_name }}</span>
                                <span class="qty-badge">x{{ item.quantity }}</span>
                            </div>

                            <div v-if="item.note" class="note-bubble">
                                <i class="fa-solid fa-note-sticky text-warning me-2"></i>
                                {{ item.note }}
                            </div>
                        </div>

                        <div class="card-action">
                            <button class="btn-serve" @click="markAsServed(item.id)" title="Sajikan">
                                <i class="fa-solid fa-check"></i>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>

    </div>
  </div>
</template>

<style scoped>
/* --- VARIABLES & THEME --- */
:root {
  --plant-green: #2c4a3b;  /* Dark Green text */
  --bg-soft: #f4f8f5;      /* Background */
  --card-bg: #ffffff;
  --accent-lime: #bfd673;  /* Accent color from image */
  --bar-accent: #6f9e8a;   /* Soft Teal for Bar */
  --kitchen-accent: #d68c45; /* Soft Orange for Kitchen */
}

.brand-text { color: #203A2E; font-family: 'Inter', sans-serif; letter-spacing: -0.5px; }
.text-accent { color: #84a548; }

/* --- LAYOUT WRAPPERS --- */
.station-wrapper {
    background-color: #f0f4f1; /* Very light organic grey/green */
    border-radius: 30px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    box-shadow: inset 0 0 20px rgba(0,0,0,0.02);
}

.queue-scroll-area {
    overflow-y: auto;
    flex-grow: 1;
    padding-right: 5px;
    padding-bottom: 20px;
    /* Hide scrollbar for clean look */
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
}

/* --- HEADER STATION --- */
.station-header {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 25px;
    padding: 10px 15px;
    background: white;
    border-radius: 50px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
}

.icon-circle {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: white;
}

/* Theme Colors */
.bar-theme .icon-circle { background-color: #4A6C56; }
.bar-theme .qty-badge { background-color: #e6f0eb; color: #4A6C56; }

.kitchen-theme .icon-circle { background-color: #d68c45; }
.kitchen-theme .qty-badge { background-color: #fff4e6; color: #d68c45; }


/* --- PLANT CARD (The main item style) --- */
.plant-card {
    background: white;
    border-radius: 24px;
    padding: 20px;
    margin-bottom: 15px;
    position: relative;
    box-shadow: 0 10px 20px rgba(0,0,0,0.03);
    border: 1px solid rgba(0,0,0,0.02);
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.plant-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 30px rgba(0,0,0,0.08);
}

.card-content {
    flex-grow: 1;
    padding-right: 15px;
}

/* Typography inside Card */
.menu-title {
    font-weight: 800;
    color: #203A2E;
    font-size: 1.1rem;
    margin-bottom: 5px;
    line-height: 1.2;
}

.customer-name {
    font-weight: 600;
    font-size: 0.9rem;
}

/* Badges */
.order-badge {
    background-color: #f3f4f6;
    color: #6b7280;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 700;
}

.time-badge {
    color: #9ca3af;
    font-size: 0.75rem;
    font-weight: 500;
}

.qty-badge {
    padding: 2px 8px;
    border-radius: 8px;
    font-weight: 800;
    font-size: 0.85rem;
}

.note-bubble {
    background-color: #fff9c4;
    color: #856404;
    padding: 8px 12px;
    border-radius: 12px;
    font-size: 0.8rem;
    margin-top: 10px;
    display: inline-block;
    border: 1px dashed #e6dbb9;
}

/* --- ACTION BUTTON (Floating Check) --- */
.card-action {
    display: flex;
    align-items: center;
}

.btn-serve {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: none;
    background-color: #203A2E; /* Dark Green */
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 10px rgba(32, 58, 46, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-serve:hover {
    background-color: #84a548; /* Lime accent on hover */
    transform: scale(1.1);
}

.btn-serve:active {
    transform: scale(0.9);
}


/* --- EXTRAS --- */
.empty-state {
    text-align: center;
    color: #a0aec0;
    margin-top: 60px;
    font-weight: 600;
}

.live-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
}

.blob {
	background: rgba(255, 82, 82, 1);
	border-radius: 50%;
	box-shadow: 0 0 0 0 rgba(255, 82, 82, 1);
	height: 10px;
	width: 10px;
	transform: scale(1);
	animation: pulse-red 2s infinite;
}

@keyframes pulse-red {
	0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 82, 82, 0.7); }
	70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 82, 82, 0); }
	100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 82, 82, 0); }
}

.fade-in { animation: fadeIn 0.4s ease-out forwards; opacity: 0; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* Scrollbar beautification */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>