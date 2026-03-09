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

// Reactive Set untuk tracking loading per item
const processingIds = ref(new Set())

// --- LOGIKA FETCH DATA ---
const fetchQueue = async () => {
    try {
        const res = await axios.get(`${API_URL}/queue/`)
        const currentQueue = res.data || []
        
        // Deteksi pesanan baru untuk bel
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


// --- FUNGSI GROUPING (BARU) ---
// Fungsi ini mengelompokkan item flat menjadi format: { sale_id: 1, meja: 4, items: [...] }
const groupItemsByOrder = (flatItems) => {
    const groups = {}
    flatItems.forEach(item => {
        if (!groups[item.sale_id]) {
            groups[item.sale_id] = {
                sale_id: item.sale_id,
                customer_name: item.customer_name,
                table_number: item.table_number || '-',
                created_at: item.created_at,
                items: []
            }
        }
        groups[item.sale_id].items.push(item)
    })
    // Ubah Object jadi Array dan urutkan dari pesanan terbaru
    return Object.values(groups).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

// --- LOGIKA FILTERING & GROUPING ---
// Kotak Produksi (Hanya yang PENDING, lalu digabungkan per order)
const barPending = computed(() => groupItemsByOrder(queue.value.filter(i => i.division === 'Bar' && i.status === 'PENDING')))
const kitchenPending = computed(() => groupItemsByOrder(queue.value.filter(i => i.division === 'Kitchen' && i.status === 'PENDING')))

// Kotak Waiters (Siap Antar & OTW Meja, digabungkan per order)
const waiterQueue = computed(() => groupItemsByOrder(queue.value.filter(i => i.status === 'PREPARED' || i.status === 'DELIVERED')))

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
                {name: 'Barista', orders: barPending, icon: 'fa-mug-hot'}, 
                {name: 'Kitchen', orders: kitchenPending, icon: 'fa-utensils'},
                {name: 'Waiters', orders: waiterQueue, icon: 'fa-person-running'}
             ]" 
             :key="station.name" class="col-lg-4">
            
            <div class="station-container h-100">
                <div class="station-header p-4 d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-3">
                        <div class="icon-circle shadow-sm"><i class="fa-solid" :class="station.icon"></i></div>
                        <h4 class="m-0 fw-bold uppercase-spaced">{{ station.name }}</h4>
                    </div>
                    <span class="count-pill">{{ station.orders.length }}</span> 
                </div>

                <div class="orders-viewport custom-scroll p-3">
                    <TransitionGroup name="staggered-list">
                        <div v-for="order in station.orders" :key="'order-'+order.sale_id" class="elegant-card shadow-sm">
                            
                            <div class="card-main w-100">
                                <div class="card-meta d-flex justify-content-between align-items-center mb-2">
                                    <span class="order-number">#{{ order.sale_id }}</span>
                                    <span class="order-clock"><i class="fa-regular fa-clock me-1"></i>{{ formatTime(order.created_at) }}</span>
                                </div>
                                
                                <div class="d-flex align-items-center flex-wrap gap-2 mb-3 pb-3 border-bottom-dashed">
                                    <span class="customer-pill text-dark fw-bold">
                                        <i class="fa-solid fa-chair text-sage me-1"></i> Meja: {{ order.table_number }}
                                    </span>
                                    <span class="customer-pill">
                                        <i class="fa-regular fa-user me-1"></i> {{ order.customer_name }}
                                    </span>
                                </div>

                                <div class="order-items-list">
                                    <div v-for="item in order.items" :key="item.id" class="grouped-item d-flex justify-content-between align-items-center mb-3">
                                        <div class="item-detail-text">
                                            <div class="menu-title-grouped">
                                                {{ item.menu_name }} 
                                                <span class="quantity-text">x{{ item.quantity }}</span>
                                            </div>
                                            
                                            <div v-if="item.note" class="quote-note-small mt-1">
                                                <i class="fa-solid fa-quote-left quote-icon-small"></i>
                                                <span class="note-text-small">{{ item.note }}</span>
                                            </div>

                                            <div class="mt-1">
                                                <span v-if="item.status === 'PENDING'" class="tag tag-pending">Memasak</span>
                                                <span v-else-if="item.status === 'PREPARED'" class="tag tag-prepared animate-pulse">Siap Antar</span>
                                                <span v-else class="tag tag-delivered">OTW Meja</span>
                                            </div>
                                        </div>

                                        <button class="btn-main-action-small shadow-sm" 
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
                            </div>
                        </div>
                    </TransitionGroup>

                    <div v-if="station.orders.length === 0" class="empty-state">
                        <i class="fa-solid fa-clipboard-check mb-3 fa-3x opacity-10"></i>
                        <p class="fw-bold text-muted-light">Tidak ada antrean</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
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

.elegant-card { background: white; border-radius: 24px; margin-bottom: 16px; display: flex; padding: 20px; border: 1px solid #e2e8f0; }
.card-main { flex-grow: 1; }
.border-bottom-dashed { border-bottom: 2px dashed #f1f5f9; }

.order-number { font-weight: 800; color: #94a3b8; font-size: 0.9rem; }
.order-clock { font-size: 0.85rem; color: #64748b; font-weight: 700; background: #f8fafc; padding: 4px 10px; border-radius: 8px; }

.customer-pill { background: #f1f5f9; padding: 6px 12px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; color: #475569; }

/* STYLE UNTUK DAFTAR ITEM DI DALAM GROUP */
.menu-title-grouped { font-weight: 800; font-size: 1.1rem; color: #1e293b; line-height: 1.2; }
.quantity-text { color: #84a548; font-size: 1.2rem; margin-left: 6px; }

.quote-note-small { display: flex; align-items: flex-start; gap: 6px; color: #b45309; }
.quote-icon-small { font-size: 0.7rem; margin-top: 3px; color: #facc15; }
.note-text-small { font-style: italic; font-weight: 600; font-size: 0.8rem; }

/* TOMBOL PER ITEM LEBIH KECIL */
.btn-main-action-small { 
    width: 50px; height: 50px; min-width: 50px; border-radius: 16px; border: none; 
    background: #1e293b; color: white; font-size: 1.2rem; transition: 0.2s; 
    display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.btn-main-action-small:hover:not(:disabled) { transform: scale(1.05); }
.btn-main-action-small.prepared { background: #84a548; }
.btn-main-action-small.delivered { background: #3b82f6; }

.btn-audio-toggle { background: white; border: 1px solid #f1f5f9; border-radius: 100px; padding: 10px 24px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 10px; transition: 0.3s; cursor: pointer; }
.btn-audio-toggle.muted { color: #ef4444; border-color: #fecaca; background: #fff1f2; }

.tag { padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; margin-top: 4px; }
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