<script setup>
import { ref, onMounted, watch, computed } from 'vue' 
import axios from 'axios'
import { VueDatePicker } from '@vuepic/vue-datepicker' // WAJIB pakai kurung kurawal
import '@vuepic/vue-datepicker/dist/main.css'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const API_URL = "https://api.inventorycafe.space"

// --- STATE FILTER ---
// Pilihan: 'daily' (Single Date), 'range' (Custom Rentang), 'monthly' (Per Bulan)
const reportType = ref('daily') 

// Inisialisasi default ke hari ini
const initSingleDate = new Date()
const selectedDate = ref(initSingleDate) 

const bestSellers = ref([])
const rawExpenses = ref([])
const incomeSummary = ref({ total_sales: 0, cash_total: 0, qris_total: 0, pending_debt: 0, transaction_count: 0 })
const isChartLoaded = ref(false)

// --- HELPER FORMAT TANGGAL ---
const formatLocalDate = (date) => {
    if (!date) return null
    const offset = date.getTimezoneOffset()
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000))
    return adjustedDate.toISOString().split('T')[0] // Format: YYYY-MM-DD
}

// Format untuk tampilan UI (contoh: 23 Feb 2026)
const formatDisplayDate = (date) => {
    if (!date) return "Pilih Tanggal"
    // Jika mode range (Array)
    if (Array.isArray(date)) {
        if(!date[0] || !date[1]) return "Pilih Rentang"
        const start = date[0].toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        const end = date[1].toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        return `${start} - ${end}`
    }
    // Jika mode monthly (Objek khusus dari VueDatePicker)
    if (date.month !== undefined) {
         const d = new Date(date.year, date.month)
         return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    }
    // Jika mode harian (Single Date)
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

// --- KALKULASI PENGELUARAN DINAMIS ---
const totalExpenseInPeriod = computed(() => {
    let startStr, endStr;

    if (reportType.value === 'range') {
        if (!selectedDate.value || !selectedDate.value[0] || !selectedDate.value[1]) return 0
        startStr = formatLocalDate(selectedDate.value[0])
        endStr = formatLocalDate(selectedDate.value[1])
    } else if (reportType.value === 'monthly') {
        // Mode Bulanan (Date picker me-return { month: 1, year: 2026 })
        const y = selectedDate.value.year || new Date().getFullYear()
        const m = selectedDate.value.month !== undefined ? selectedDate.value.month : new Date().getMonth()
        startStr = formatLocalDate(new Date(y, m, 1))
        endStr = formatLocalDate(new Date(y, m + 1, 0)) // Hari terakhir di bulan itu
    } else {
        // Mode Harian
        if (!selectedDate.value) return 0
        startStr = formatLocalDate(selectedDate.value)
        endStr = startStr 
    }

    const filtered = rawExpenses.value.filter(e => {
        if (!e.purchase_date || !e.is_completed) return false
        return e.purchase_date >= startStr && e.purchase_date <= endStr
    })

    return filtered.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0)
})

const nettIncome = computed(() => {
    const totalMasuk = (incomeSummary.value.cash_total || 0) + (incomeSummary.value.qris_total || 0)
    return totalMasuk - totalExpenseInPeriod.value
})

// --- CHART CONFIG ---
const chartData = ref({
  labels: [],
  datasets: [{ 
    label: 'Penjualan (Rp)', 
    backgroundColor: 'rgba(44, 74, 59, 0.1)',
    borderColor: '#2c4a3b', 
    borderWidth: 3,
    data: [], fill: true, tension: 0.4 
  }]
})

const chartOptions = { 
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { ticks: { callback: (val) => (val >= 1000 ? (val/1000) + 'k' : val) } } }
}

// --- FETCH DATA ---
const fetchReportData = async () => {
    if (!selectedDate.value) return
    
    // Cegah fetch jika mode range tapi baru pilih 1 tanggal
    if (reportType.value === 'range' && (!Array.isArray(selectedDate.value) || !selectedDate.value[1])) return

    isChartLoaded.value = false
    try {
        let params = { type: reportType.value }

        if (reportType.value === 'range') {
            params.type = 'custom' // Backend kamu baca 'custom' untuk range
            params.start_date = formatLocalDate(selectedDate.value[0])
            params.end_date = formatLocalDate(selectedDate.value[1])
        } 
        else if (reportType.value === 'monthly') {
            const y = selectedDate.value.year || new Date().getFullYear()
            const m = selectedDate.value.month !== undefined ? selectedDate.value.month : new Date().getMonth()
            // Kirim tanggal 1 sebagai representasi bulan
            params.date = formatLocalDate(new Date(y, m, 1)) 
        } 
        else {
            // Harian
            params.date = formatLocalDate(selectedDate.value)
        }

        const [popRes, sumRes, chartRes, expRes] = await Promise.all([
            axios.get(`${API_URL}/reports/popularity`, { params }),
            axios.get(`${API_URL}/reports/summary`, { params }),
            axios.get(`${API_URL}/reports/chart-data`, { params }),
            axios.get(`${API_URL}/expenses/`).catch(() => ({ data: [] })) 
        ])

        bestSellers.value = popRes.data.best_sellers || []
        incomeSummary.value = sumRes.data 
        rawExpenses.value = expRes.data || [] 
        
        chartData.value.labels = chartRes.data.labels || []
        chartData.value.datasets[0].data = chartRes.data.values || []
        isChartLoaded.value = true

    } catch (e) {
        console.error("Gagal sinkronisasi laporan:", e)
    }
}

// --- WATCHERS ---
// 1. Dengarkan perubahan Tab (Ganti tipe value kalender)
watch(reportType, (newVal) => {
    if (newVal === 'daily') {
        selectedDate.value = new Date()
    } else if (newVal === 'range') {
        const start = new Date(); start.setDate(1)
        selectedDate.value = [start, new Date()]
    } else if (newVal === 'monthly') {
        const d = new Date()
        selectedDate.value = { month: d.getMonth(), year: d.getFullYear() }
    }
    fetchReportData()
})

// 2. Dengarkan perubahan Tanggal di Kalender
watch(selectedDate, () => {
    fetchReportData()
}, { deep: true }) // Deep true diperlukan untuk mode 'range' (array) dan 'monthly' (object)


// --- LOGIKA EXCEL DOWNLOAD DINAMIS ---
const downloadExcel = () => {
    // 1. Tambahkan parameter 't' berisi timestamp unik (MENCEGAH CACHE BROWSER)
    const timestamp = new Date().getTime()
    let url = `${API_URL}/reports/export-excel?type=${reportType.value}&t=${timestamp}`

    if (reportType.value === 'range') {
        const start = formatLocalDate(selectedDate.value[0])
        const end = formatLocalDate(selectedDate.value[1])
        url = `${API_URL}/reports/export-excel?type=custom&start_date=${start}&end_date=${end}&t=${timestamp}`
    } 
    else if (reportType.value === 'monthly') {
        const y = selectedDate.value.year || new Date().getFullYear()
        const m = selectedDate.value.month !== undefined ? selectedDate.value.month : new Date().getMonth()
        const dateStr = formatLocalDate(new Date(y, m, 1))
        url += `&date=${dateStr}`
    } 
    else {
        const dateStr = formatLocalDate(selectedDate.value)
        url += `&date=${dateStr}`
    }

    // Buka tab baru untuk trigger download PDF/Excel dari server
    window.open(url, '_blank')
}

onMounted(fetchReportData)
</script>

<template>
  <div class="page-content p-4">
    
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
            <h4 class="fw-bold brand-text m-0">Laporan Keuangan</h4>
            <p class="text-muted small m-0">Audit Omzet & Belanja Cafe</p>
        </div>
        
        <div class="d-flex flex-wrap gap-2 align-items-center">
            <div class="btn-group btn-group-sm bg-white shadow-sm rounded-pill p-1 border">
                <button @click="reportType = 'daily'" class="btn btn-type" :class="{ 'active': reportType === 'daily' }">Harian</button>
                <button @click="reportType = 'range'" class="btn btn-type" :class="{ 'active': reportType === 'range' }">Rentang</button>
                <button @click="reportType = 'monthly'" class="btn btn-type" :class="{ 'active': reportType === 'monthly' }">Bulanan</button>
            </div>

            <div class="datepicker-wrapper" :class="{ 'range-mode': reportType === 'range' }">
                <VueDatePicker 
                    v-model="selectedDate" 
                    :range="reportType === 'range'"
                    :multi-calendars="reportType === 'range'"
                    :month-picker="reportType === 'monthly'"
                    :enable-time-picker="false"
                    auto-apply 
                    :clearable="false"
                    :format="formatDisplayDate"
                    input-class-name="dp-custom-input shadow-sm fw-bold text-center text-dark-green"
                />
            </div>

            <button class="btn btn-export shadow-sm" @click="downloadExcel" title="Export Excel">
                <i class="fa-solid fa-file-excel"></i>
            </button>
        </div>
    </div>

    <div class="row g-4 mb-4">
        <div class="col-12">
            <div class="stat-card p-4 bg-success text-white shadow-lg rounded-4 border-0">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="fw-bold text-uppercase ls-1 small">Total Pemasukan Bersih (Nett)</span>
                    <div class="icon-box bg-white-20"><i class="fa-solid fa-vault"></i></div>
                </div>
                <h1 class="fw-bold m-0">Rp {{ nettIncome.toLocaleString() }}</h1>
                <p class="small m-0 opacity-75 mt-1 text-uppercase fw-bold"><i class="fa-regular fa-calendar me-1"></i> {{ formatDisplayDate(selectedDate) }}</p>
            </div>
        </div>
    </div>

    <div class="row g-4 mb-4">
        <div class="col-md-6">
            <div class="stat-card p-4 bg-dark-green text-white shadow-lg rounded-4 border-0">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="icon-box bg-white-20"><i class="fa-solid fa-money-bill-wave"></i></div>
                    <span class="fw-bold text-uppercase ls-1 small">Total Cash</span>
                </div>
                <h2 class="fw-bold m-0">Rp {{ (incomeSummary.cash_total || 0).toLocaleString() }}</h2>
            </div>
        </div>
        <div class="col-md-6">
            <div class="stat-card p-4 bg-qris text-white shadow-lg rounded-4 border-0">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="icon-box bg-white-20"><i class="fa-solid fa-qrcode"></i></div>
                    <span class="fw-bold text-uppercase ls-1 small">Total QRIS</span>
                </div>
                <h2 class="fw-bold m-0">Rp {{ (incomeSummary.qris_total || 0).toLocaleString() }}</h2>
            </div>
        </div>
    </div>

    <div class="row g-4 mb-4">
        <div class="col-md-3">
            <div class="stat-card p-3 bg-white border shadow-sm rounded-4 border-start border-4 border-success">
                <small class="text-muted fw-bold">TOTAL OMZET (KOTOR)</small>
                <h4 class="fw-bold brand-text m-0">Rp {{ (incomeSummary.total_sales || 0).toLocaleString() }}</h4>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-card p-3 bg-white border shadow-sm rounded-4 border-start border-4 border-warning">
                <small class="text-warning fw-bold">TOTAL BELANJA</small>
                <h4 class="fw-bold text-warning m-0">Rp {{ totalExpenseInPeriod.toLocaleString() }}</h4>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-card p-3 bg-white border shadow-sm rounded-4 border-start border-4 border-danger">
                <small class="text-danger fw-bold">TOTAL PIUTANG</small>
                <h4 class="fw-bold text-danger m-0">Rp {{ (incomeSummary.pending_debt || 0).toLocaleString() }}</h4>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-card p-3 bg-white border shadow-sm rounded-4 border-start border-4 border-primary">
                <small class="text-primary fw-bold">VOL. TRANSAKSI</small>
                <h4 class="fw-bold text-primary m-0">{{ incomeSummary.transaction_count || 0 }}</h4>
            </div>
        </div>
    </div>

    <div class="row g-4">
        <div class="col-lg-8">
            <div class="card-modern h-100 p-4 bg-white shadow-sm border">
                <h6 class="fw-bold brand-text mb-4">Grafik Tren Penjualan</h6>
                <div class="chart-container">
                    <Line v-if="isChartLoaded" :data="chartData" :options="chartOptions" />
                </div>
            </div>
        </div>
        <div class="col-lg-4">
            <div class="card-modern h-100 p-4 bg-white shadow-sm border">
                <h6 class="fw-bold brand-text mb-4">Menu Terlaris 🔥</h6>
                <div class="ranking-list custom-scroll pe-2">
                    <div v-for="(item, index) in bestSellers" :key="index" class="rank-item d-flex align-items-center mb-3">
                        <div class="rank-num me-3">{{ index + 1 }}</div>
                        <div class="flex-grow-1">
                            <h6 class="m-0 fw-bold brand-text font-sm">{{ item.name }}</h6>
                            <small class="text-muted">{{ item.sold }} terjual</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.brand-text { color: #2c4a3b; }
.text-dark-green { color: #2c4a3b; }
.bg-dark-green { background-color: #2c4a3b; }
.bg-qris { background-color: #00569c; } 
.btn-type { border: none; font-size: 0.75rem; font-weight: 700; padding: 6px 15px; border-radius: 50px !important; color: #9ca3af; transition: 0.2s; }
.btn-type.active { background: #2c4a3b; color: white; }
.stat-card { border-radius: 24px; transition: transform 0.2s; }
.stat-card:hover { transform: translateY(-5px); }
.icon-box { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background-color: rgba(255, 255, 255, 0.2); }
.card-modern { border-radius: 24px; }
.chart-container { height: 320px; }
.rank-num { width: 32px; height: 32px; background: #f8f9fa; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #2c4a3b; font-size: 0.85rem; }
.btn-export { background: white; border: 1px solid #eee; border-radius: 50%; width: 40px; height: 40px; color: #2c4a3b; }

/* Styling Kalender Dinamis */
.datepicker-wrapper { width: 170px; transition: 0.3s ease; }
.datepicker-wrapper.range-mode { width: 260px; } /* Melebar saat pilih Rentang */

/* Meng-override style bawaan VueDatePicker agar lebih bersih */
:deep(.dp-custom-input) {
    border-radius: 50px;
    border: 1px solid #e5e7eb;
    padding: 8px 15px;
    font-size: 0.85rem;
    cursor: pointer;
}
:deep(.dp__input_icon) { display: none; } /* Sembunyikan icon kalender bawaan */
</style>