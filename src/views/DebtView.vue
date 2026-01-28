<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// const API_URL = "http://127.0.0.1:8000"
const API_URL = "https://api.inventorycafe.space"
const debts = ref([])

const fetchDebts = async () => {
    const res = await axios.get(`${API_URL}/debts/`)
    debts.value = res.data
}

const markAsPaid = async (id) => {
    if(confirm("Yakin hutang ini sudah dilunasi?")) {
        await axios.put(`${API_URL}/debts/${id}/pay`)
        fetchDebts()
    }
}

onMounted(fetchDebts)
</script>

<template>
  <div class="page-container p-4">
    <h4 class="fw-bold brand-text mb-4">Buku Hutang (Cas Bon)</h4>

    <div class="row g-3">
        <div v-for="debt in debts" :key="debt.id" class="col-md-6 col-lg-4">
            <div class="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                <div class="d-flex justify-content-between mb-3">
                    <span class="badge bg-danger-soft text-danger rounded-pill">Belum Lunas</span>
                    <small class="text-muted">{{ new Date(debt.created_at).toLocaleDateString() }}</small>
                </div>
                
                <h5 class="fw-bold brand-text mb-1">{{ debt.customer_name }}</h5>
                <h4 class="fw-bold text-dark mb-3">Rp {{ debt.total_amount.toLocaleString() }}</h4>

                <div class="border-top pt-3">
                    <p class="x-small fw-bold text-muted mb-2 text-uppercase">Item yang dibeli:</p>
                    <div v-for="item in debt.items" class="d-flex justify-content-between small mb-1">
                        <span>{{ item.menu_name }} x{{ item.quantity }}</span>
                        <span class="text-muted">Rp {{ (item.quantity * item.price_at_moment).toLocaleString() }}</span>
                    </div>
                </div>

                <button @click="markAsPaid(debt.id)" class="btn btn-primary-rounded w-100 mt-4">
                    Pelunasan
                </button>
            </div>
        </div>
        
        <div v-if="debts.length === 0" class="text-center py-5">
            <p class="text-muted">Alhamdulillah, tidak ada yang berhutang hari ini.</p>
        </div>
    </div>
  </div>
</template>

<style scoped>
.bg-danger-soft { background-color: #fff5f5; }
.brand-text { color: #2c4a3b; }
.btn-primary-rounded { background: #2c4a3b; color: white; border-radius: 50px; border: none; padding: 10px; font-weight: bold; }
.x-small { font-size: 0.7rem; }
</style>