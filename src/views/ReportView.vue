<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

// const API_URL = "http://127.0.0.1:8000"
const API_URL = "https://api.inventorycafe.space"

// --- STATE FILTER ---
const reportType = ref('monthly') 
const selectedDate = ref(new Date())

// --- INITIAL STATE ---
const bestSellers = ref([])
const incomeSummary = ref({ 
    total_sales: 0, 
    cash_total: 0,    // Untuk Uang Fisik
    qris_total: 0,    // Untuk Uang di Bank
    pending_debt: 0, 
    transaction_count: 0 
})
const isChartLoaded = ref(false)

// --- CHART CONFIG ---
const chartData = ref({
  labels: [],
  datasets: [{ 
    label: 'Penjualan (Rp)', 
    backgroundColor: (ctx) => {
      const canvas = ctx.chart.ctx;
      const gradient = canvas.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, 'rgba(44, 74, 59, 0.2)');
      gradient.addColorStop(1, 'rgba(44, 74, 59, 0.0)');
      return gradient;
    },
    borderColor: '#2c4a3b', 
    borderWidth: 3,
    pointBackgroundColor: '#fff',
    pointBorderColor: '#2c4a3b',
    pointRadius: 4,
    data: [], 
    fill: true,
    tension: 0.4 
  }]
})

const chartOptions = { 
    responsive: true, 
    maintainAspectRatio: false,
    plugins: { 
        legend: { display: false },
        tooltip: {
            backgroundColor: '#2c4a3b',
            cornerRadius: 8,
            padding: 12
        }
    },
    scales: {
        x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
        y: { 
            beginAtZero: true, 
            grid: { color: '#f3f4f6', borderDash: [5, 5] },
            ticks: { 
                color: '#9ca3af', 
                font: { size: 11 },
                callback: (val) => (val >= 1000 ? (val/1000) + 'k' : val) 
            } 
        }
    }
}

// --- FETCH DATA ---
const fetchReportData = async () => {
    isChartLoaded.value = false
    try {
        const params = {
            type: reportType.value,
            date: selectedDate.value.toISOString().split('T')[0]
        }

        const [popRes, sumRes, chartRes] = await Promise.all([
            axios.get(`${API_URL}/reports/popularity`, { params }),
            axios.get(`${API_URL}/reports/summary`, { params }),
            axios.get(`${API_URL}/reports/chart-data`, { params })
        ])

        bestSellers.value = popRes.data.best_sellers || []
        incomeSummary.value = sumRes.data 
        
        chartData.value.labels = chartRes.data.labels || []
        chartData.value.datasets[0].data = chartRes.data.values || []
        isChartLoaded.value = true

    } catch (e) {
        console.error("Gagal memuat laporan:", e)
    }
}

watch([reportType, selectedDate], fetchReportData)

const downloadExcel = () => {
    const dateStr = selectedDate.value.toISOString().split('T')[0]
    window.open(`${API_URL}/reports/export-excel?type=${reportType.value}&date=${dateStr}`, '_blank')
}

onMounted(fetchReportData)
</script>

<template>
  <div class="page-content p-4">
    
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
            <h4 class="fw-bold brand-text m-0">Laporan Keuangan</h4>
            <p class="text-muted small m-0">Audit harian dan performa bisnis.</p>
        </div>
        
        <div class="d-flex flex-wrap gap-2 align-items-center">
            <div class="btn-group btn-group-sm bg-white shadow-sm rounded-pill p-1 border">
                <button @click="reportType = 'daily'" class="btn btn-type" :class="{ 'active': reportType === 'daily' }">Harian</button>
                <button @click="reportType = 'weekly'" class="btn btn-type" :class="{ 'active': reportType === 'weekly' }">Mingguan</button>
                <button @click="reportType = 'monthly'" class="btn btn-type" :class="{ 'active': reportType === 'monthly' }">Bulanan</button>
            </div>

            <div class="datepicker-wrapper">
                <VueDatePicker 
                    v-model="selectedDate" 
                    :month-picker="reportType === 'monthly'"
                    auto-apply 
                    :clearable="false"
                    :format="reportType === 'monthly' ? 'MMMM yyyy' : 'dd MMM yyyy'"
                    input-class-name="dp-custom-input shadow-sm"
                />
            </div>

            <button class="btn btn-export shadow-sm" @click="downloadExcel" title="Export Excel">
                <i class="fa-solid fa-file-excel"></i>
            </button>
        </div>
    </div>

    <div class="row g-4 mb-4">
        <div class="col-md-6">
            <div class="stat-card p-4 bg-dark-green text-white shadow-lg rounded-4 border-0">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="icon-box bg-white-20"><i class="fa-solid fa-money-bill-wave"></i></div>
                    <span class="fw-bold text-uppercase ls-1 small">Total Cash</span>
                </div>
                <h2 class="fw-bold m-0">Rp {{ incomeSummary.cash_total.toLocaleString() }}</h2>
                <small class="opacity-75">Uang fisik yang wajib ada di laci kasir</small>
            </div>
        </div>

        <div class="col-md-6">
            <div class="stat-card p-4 bg-qris text-white shadow-lg rounded-4 border-0">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="icon-box bg-white-20"><i class="fa-solid fa-qrcode"></i></div>
                    <span class="fw-bold text-uppercase ls-1 small">Total QRIS</span>
                </div>
                <h2 class="fw-bold m-0">Rp {{ incomeSummary.qris_total.toLocaleString() }}</h2>
                <small class="opacity-75">Uang masuk ke rekening / e-wallet</small>
            </div>
        </div>
    </div>

    <div class="row g-4 mb-4">
        <div class="col-md-4">
            <div class="stat-card p-3 bg-white border shadow-sm rounded-4 border-start border-4 border-success">
                <small class="text-muted fw-bold">TOTAL OMZET (KOTOR)</small>
                <h4 class="fw-bold brand-text m-0">Rp {{ incomeSummary.total_sales.toLocaleString() }}</h4>
            </div>
        </div>
        <div class="col-md-4">
            <div class="stat-card p-3 bg-white border shadow-sm rounded-4 border-start border-4 border-danger">
                <small class="text-danger fw-bold">TOTAL PIUTANG (BON)</small>
                <h4 class="fw-bold text-danger m-0">Rp {{ incomeSummary.pending_debt.toLocaleString() }}</h4>
            </div>
        </div>
        <div class="col-md-4">
            <div class="stat-card p-3 bg-white border shadow-sm rounded-4 border-start border-4 border-primary">
                <small class="text-primary fw-bold">VOLUME TRANSAKSI</small>
                <h4 class="fw-bold text-primary m-0">{{ incomeSummary.transaction_count }} Pesanan</h4>
            </div>
        </div>
    </div>

    <div class="row g-4">
        <div class="col-lg-8">
            <div class="card-modern h-100 p-4 bg-white shadow-sm border">
                <h6 class="fw-bold brand-text mb-4">Grafik Tren Penjualan</h6>
                <div class="chart-container">
                    <Line v-if="isChartLoaded" :data="chartData" :options="chartOptions" />
                    <div v-else class="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                        <i class="fa-solid fa-circle-notch fa-spin fa-2x mb-2"></i>
                        <span class="small">Menyusun data...</span>
                    </div>
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
                            <small class="text-muted">{{ item.sold }} porsi terjual</small>
                        </div>
                    </div>
                    <div v-if="bestSellers.length === 0" class="text-center py-5 text-muted small">
                        Belum ada data penjualan.
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
.bg-qris { background-color: #00569c; } /* Warna Biru Khas QRIS/Bank */
.bg-white-20 { background-color: rgba(255, 255, 255, 0.2); }
.ls-1 { letter-spacing: 1px; }

/* Filter Buttons */
.btn-type { border: none; font-size: 0.75rem; font-weight: 700; padding: 6px 15px; border-radius: 50px !important; color: #9ca3af; }
.btn-type.active { background: #2c4a3b; color: white; }

/* Cards */
.stat-card { border-radius: 24px; transition: transform 0.2s; }
.stat-card:hover { transform: translateY(-5px); }
.icon-box { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }

.card-modern { border-radius: 24px; }
.chart-container { height: 320px; }

.rank-num { 
    width: 32px; height: 32px; background: #f8f9fa; border-radius: 10px; 
    display: flex; align-items: center; justify-content: center; 
    font-weight: bold; color: #2c4a3b; font-size: 0.85rem;
}

.btn-export { background: white; border: 1px solid #eee; border-radius: 50%; width: 40px; height: 40px; color: #2c4a3b; }

.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #eee; border-radius: 10px; }
.datepicker-wrapper { width: 180px; }
</style>