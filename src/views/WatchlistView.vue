<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import axios from 'axios'

// --- CONFIG & STATE ---
const queue = ref([])
const API_URL = "https://api.inventorycafe.space"
let pollingInterval = null
const knownKitchenIds = ref(new Set()) 

// Audio Setup
const newOrderSound = new Audio("/sounds/bell.mp3")
const deliveredSound = new Audio("/sounds/bell3.mp3")
const isAudioEnabled = ref(true)

// Reactive Set untuk tracking loading per item secara instan
const processingIds = ref(new Set())

// --- LOGIKA FETCH DATA ---
const fetchQueue = async () => {
    try {
        const res = await axios.get(`${API_URL}/queue/`)
        const currentQueue = res.data || []
        
        // Cek pesanan baru (Pending) untuk bunyi bel standard
        const newPendingItems = currentQueue.filter(i => i.status === 'PENDING')
        let hasNewOrder = false
        newPendingItems.forEach(item => {
            if (!knownKitchenIds.value.has(item.id)) {
                hasNewOrder = true
                knownKitchenIds.value.add(item.id)
            }
        });

        if (isAudioEnabled.value && hasNewOrder) {
            newOrderSound.currentTime = 0
            newOrderSound.play().catch(() => {})
        }

        const currentAllIds = new Set(currentQueue.map(i => i.id))
        knownKitchenIds.value.forEach(id => {
            if (!currentAllIds.has(id)) knownKitchenIds.value.delete(id)
        })

        queue.value = currentQueue
    } catch (e) { console.error("Sync Error") }
}

// --- ACTIONS WRAPPER ---
const handleAction = async (id, actionFn, statusChangeType) => {
    if (processingIds.value.has(id)) return
    processingIds.value.add(id) 
    
    try {
        await actionFn(id)
        
        if (isAudioEnabled.value && statusChangeType === 'to_delivered') {
            deliveredSound.currentTime = 0
            deliveredSound.play().catch(() => {})
        }
        
        await fetchQueue()
    } catch (e) { 
        alert("Gagal memperbarui status. Cek koneksi server.") 
    } finally {
        processingIds.value.delete(id)
    }
}

const markAsPrepared = (id) => handleAction(id, (id) => axios.put(`${API_URL}/queue/${id}/prepare`), 'to_prepared')
const markAsDelivered = (id) => handleAction(id, (id) => axios.put(`${API_URL}/queue/${id}/delivered`), 'to_delivered')
const markAsServed = (id) => handleAction(id, (id) => axios.put(`${API_URL}/queue/${id}/serve`), 'to_served')

// --- LOGIKA FILTERING KOTAK TERPISAH ---
// Kotak Produksi (Hanya yang PENDING)
const barPending = computed(() => queue.value.filter(i => i.division === 'Bar' && i.status === 'PENDING'))
const kitchenPending = computed(() => queue.value.filter(i => i.division === 'Kitchen' && i.status === 'PENDING'))

// Kotak Waiters (Siap Antar & OTW Meja)
const waiterQueue = computed(() => queue.value.filter(i => i.status === 'PREPARED' || i.status === 'DELIVERED'))

onMounted(() => {
    fetchQueue()
    pollingInterval = setInterval(fetchQueue, 5000)
})
onUnmounted(() => clearInterval(pollingInterval))

const formatTime = (date) => new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="monitor-container p-4 min-vh-100">
    
    <header class="d-flex justify-content-between align-items-center mb-5 px-3">
        <div class="brand-group">
            <h1 class="m-0 fw-bold header-title">Order <span class="text-sage">Monitor</span> 🌿</h1>
            <p class="text-muted small m-0 letter-spacing-1">ZONAL KITCHEN DISPLAY SYSTEM</p>
        </div>

        <div class="d-flex gap-3 align-items-center">
            <button @click="isAudioEnabled = !isAudioEnabled" class="btn-audio-toggle shadow-sm" :class="{ 'muted': !isAudioEnabled }">
                <i class="fa-solid" :class="isAudioEnabled ? 'fa-volume-high' : 'fa-volume-xmark'"></i>
                <span>{{ isAudioEnabled ? 'Sound On' : 'Mute' }}</span>
            </button>
            <div class="live-badge shadow-sm"><span class="dot-pulse"></span> LIVE</div>
        </div>
    </header>

    <div class="row g-4 h-100">
        <div v-for="station in [
                {name: 'Barista', items: barPending, icon: 'fa-mug-hot'}, 
                {name: 'Kitchen', items: kitchenPending, icon: 'fa-utensils'},
                {name: 'Waiters', items: waiterQueue, icon: 'fa-person-running'}
             ]" 
             :key="station.name" class="col-lg-4">
            
            <div class="station-container h-100">
                <div class="station-header p-4 d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-3">
                        <div class="icon-circle shadow-sm"><i class="fa-solid" :class="station.icon"></i></div>
                        <h4 class="m-0 fw-bold uppercase-spaced">{{ station.name }}</h4>
                    </div>
                    <span class="count-pill">{{ station.items.length }}</span>
                </div>

                <div class="orders-viewport custom-scroll p-3">
                    <TransitionGroup name="staggered-list">
                        <div v-for="item in station.items" :key="item.id" 
                             class="elegant-card shadow-sm" 
                             :class="{ 'status-prepared': item.status === 'PREPARED', 'status-delivered': item.status === 'DELIVERED' }"
                             @dblclick="item.status === 'DELIVERED' ? markAsServed(item.id) : null">
                            
                            <div class="card-main">
                                <div class="card-meta d-flex justify-content-between">
                                    <span class="order-number">#{{ item.sale_id }}</span>
                                    <span class="order-clock">{{ formatTime(item.created_at) }}</span>
                                </div>

                                <h2 class="menu-title">{{ item.menu_name }}</h2>
                                
                                <div class="card-footer-info d-flex align-items-center gap-3 mt-1">
                                    <span class="customer-pill"><i class="fa-regular fa-user me-2"></i>{{ item.customer_name }}</span>
                                    <span class="quantity-pill">x{{ item.quantity }}</span>
                                </div>

                                <div v-if="item.note" class="quote-note shadow-sm mt-3">
                                    <i class="fa-solid fa-quote-left quote-icon"></i>
                                    <span class="note-text">{{ item.note }}</span>
                                </div>

                                <div class="status-box mt-3">
                                    <span v-if="item.status === 'PENDING'" class="tag tag-pending">Proses</span>
                                    <span v-else-if="item.status === 'PREPARED'" class="tag tag-prepared animate-pulse">Siap Antar</span>
                                    <span v-else class="tag tag-delivered">OTW Meja</span>
                                </div>
                            </div>

                            <div class="card-action-side p-2">
                                <button class="btn-main-action" 
                                        :class="item.status.toLowerCase()"
                                        @click="item.status === 'PENDING' ? markAsPrepared(item.id) : item.status === 'PREPARED' ? markAsDelivered(item.id) : markAsServed(item.id)" 
                                        :disabled="processingIds.has(item.id)">
                                    
                                    <i v-if="processingIds.has(item.id)" class="fa-solid fa-spinner-third fa-spin"></i>
                                    
                                    <template v-else>
                                        <i v-if="item.status === 'PENDING'" class="fa-solid fa-check"></i>
                                        <i v-else-if="item.status === 'PREPARED'" class="fa-solid fa-person-running"></i>
                                        <i v-else class="fa-solid fa-circle-check"></i>
                                    </template>
                                </button>
                            </div>
                        </div>
                    </TransitionGroup>

                    <div v-if="station.items.length === 0" class="empty-state">
                        <i class="fa-solid fa-clipboard-check mb-3 fa-3x opacity-10"></i>
                        <p class="fw-bold text-muted-light">No active orders</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* STYLE TETAP SAMA SESUAI PERMINTAAN ANDA */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;700;800&display=swap');

:root {
    --sage: #84a548;
    --sage-light: #f7fee7;
    --bg-light: #f9fafb;
    --slate: #1e293b;
    --white: #ffffff;
    --note-bg: #fffce8;
    --note-border: #facc15;
}

.monitor-container { background-color: #f9fafb; font-family: 'Plus Jakarta Sans', sans-serif; color: #1e293b; }
.text-sage { color: #84a548; }
.header-title { font-weight: 800; letter-spacing: -1.5px; font-size: 2.2rem; }
.uppercase-spaced { text-transform: uppercase; letter-spacing: 2px; font-size: 0.75rem; }
.letter-spacing-1 { letter-spacing: 2px; font-weight: 700; color: #94a3b8; }

.station-container { background: #f1f5f9; border-radius: 32px; display: flex; flex-direction: column; overflow: hidden; height: calc(100vh - 180px); }
.icon-circle { width: 45px; height: 45px; background: white; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #84a548; font-size: 1.2rem; }
.count-pill { background: #1e293b; color: white; padding: 6px 16px; border-radius: 100px; font-weight: 800; font-size: 0.8rem; }

.elegant-card { background: white; border-radius: 28px; margin-bottom: 16px; display: flex; padding: 24px; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); border: 2px solid transparent; }
.elegant-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.05) !important; }

.status-prepared { border-color: #84a548; background: #f7fee7; }
.status-delivered { border-color: #3b82f6; background: #eff6ff; }

.card-main { flex-grow: 1; }
.order-number { font-weight: 800; color: #cbd5e1; font-size: 0.85rem; }
.order-clock { font-size: 0.8rem; color: #94a3b8; font-weight: 600; }
.menu-title { font-weight: 800; font-size: 1.6rem; color: #1e293b; margin: 4px 0; letter-spacing: -0.5px; }
.customer-pill { background: #f1f5f9; padding: 4px 12px; border-radius: 10px; font-weight: 700; font-size: 0.85rem; color: #64748b; }
.quantity-pill { color: #84a548; font-weight: 800; font-size: 1.4rem; }

.quote-note { background-color: #fffce8; border: 2px dashed #facc15; border-radius: 16px; padding: 12px 18px; display: inline-flex; align-items: center; gap: 10px; max-width: 90%; }
.quote-icon { color: #eab308; font-size: 0.9rem; align-self: flex-start; margin-top: 4px; }
.note-text { color: #854d0e; font-weight: 700; font-style: italic; font-size: 0.9rem; line-height: 1.4; }

.btn-main-action { width: 65px; height: 65px; border-radius: 22px; border: none; background: #1e293b; color: white; font-size: 1.6rem; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center; }
.btn-main-action:hover:not(:disabled) { transform: scale(1.1) rotate(5deg); }
.btn-main-action.prepared { background: #84a548; }
.btn-main-action.delivered { background: #3b82f6; }

.btn-audio-toggle { background: white; border: 1px solid #f1f5f9; border-radius: 100px; padding: 10px 24px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 10px; transition: 0.3s; }
.btn-audio-toggle.muted { color: #ef4444; border-color: #fecaca; background: #fff1f2; }

.tag { padding: 5px 14px; border-radius: 100px; font-weight: 800; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; }
.tag-pending { background: #fef3c7; color: #d97706; }
.tag-prepared { background: #dcfce7; color: #166534; }
.tag-delivered { background: #dbeafe; color: #1e40af; }

@keyframes fa-spin { to { transform: rotate(360deg); } }
.fa-spinner-third { animation: fa-spin 0.8s linear infinite; }
.animate-pulse { animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

.live-badge { background: #1e293b; color: white; padding: 8px 18px; border-radius: 100px; font-weight: 800; font-size: 0.75rem; display: flex; align-items: center; gap: 8px; }
.dot-pulse { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; animation: dot-blink 1.5s infinite; }
@keyframes dot-blink { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.4; } }

.custom-scroll { overflow-y: auto; scrollbar-width: none; }
.empty-state { text-align: center; padding-top: 80px; }
</style>