<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const categories = ref([])
const form = ref({ name: "", description: "" })
const API_URL = "http://127.0.0.1:8000"
const isSubmitting = ref(false)

const fetchCategories = async () => {
    try {
        categories.value = (await axios.get(`${API_URL}/categories/`)).data
    } catch (e) {
        console.error(e)
    }
}

const submitCategory = async () => {
    if(!form.value.name) return alert("Nama kategori wajib diisi")
    
    isSubmitting.value = true
    try {
        await axios.post(`${API_URL}/categories/`, form.value)
        // alert("Kategori tersimpan") // Optional, bisa dihapus biar smooth
        fetchCategories()
        form.value = { name: "", description: "" }
    } catch(e) { 
        alert("Error: " + e.message) 
    } finally {
        isSubmitting.value = false
    }
}

onMounted(fetchCategories)
</script>

<template>
  <div class="page-container">
    
    <div class="mb-4">
      <h2 class="fw-bold text-dark-green m-0">⚙️ Pengaturan Kategori</h2>
      <p class="text-muted m-0">Kelola pengelompokan menu (misal: Kopi, Snack, Non-Coffee)</p>
    </div>
    
    <div class="row g-4">
        
        <div class="col-lg-4">
            <div class="card-modern sticky-top" style="top: 20px; z-index: 1;">
                <h5 class="fw-bold text-dark-green mb-4">Tambah Kategori</h5>
                
                <div class="form-group mb-3">
                    <label>Nama Kategori</label>
                    <input 
                        v-model="form.name" 
                        class="form-control-soft" 
                        placeholder="Contoh: Minuman Dingin"
                    >
                </div>

                <div class="form-group mb-4">
                    <label>Deskripsi (Opsional)</label>
                    <textarea 
                        v-model="form.description" 
                        class="form-control-soft" 
                        rows="3" 
                        placeholder="Keterangan singkat..."
                    ></textarea>
                </div>

                <button class="btn-submit w-100" @click="submitCategory" :disabled="isSubmitting">
                    {{ isSubmitting ? 'Menyimpan...' : 'Simpan Kategori' }}
                </button>
            </div>
        </div>

        <div class="col-lg-8">
            <div class="card-modern">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h5 class="fw-bold text-dark-green m-0">Daftar Kategori</h5>
                    <span class="badge bg-sage-light text-dark-green rounded-pill px-3">
                        Total: {{ categories.length }}
                    </span>
                </div>

                <div class="category-list">
                    <div v-if="categories.length === 0" class="text-center py-5 text-muted">
                        Belum ada kategori. Silakan buat baru.
                    </div>

                    <div v-for="c in categories" :key="c.id" class="category-item">
                        <div class="icon-box">
                            🏷️
                        </div>
                        
                        <div class="ms-3 flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center">
                                <h6 class="fw-bold text-dark mb-1">{{ c.name }}</h6>
                                </div>
                            <p class="text-muted small mb-0 description-text">
                                {{ c.description || 'Tidak ada deskripsi' }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
  </div>
</template>

<style scoped>
/* --- VARIABLES --- */
:root {
  --dark-green: #2c4a3b;
  --sage-light: #e6f0eb;
}
.text-dark-green { color: #2c4a3b; }
.bg-sage-light { background-color: #e6f0eb; }

/* --- CARD STYLE --- */
.card-modern {
    background: white;
    border-radius: 20px;
    padding: 25px;
    border: 1px solid #f0f0f0;
    box-shadow: 0 4px 20px rgba(0,0,0,0.02);
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
    font-family: inherit;
}

.form-control-soft:focus {
    background-color: white;
    border-color: #b8d0c3;
    outline: none;
    box-shadow: 0 0 0 3px rgba(44, 74, 59, 0.1);
}

textarea.form-control-soft {
    resize: none;
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
}
.btn-submit:hover {
    background-color: #1e3329;
}
.btn-submit:disabled {
    background-color: #9aa5a0;
    cursor: not-allowed;
}

/* --- LIST ITEMS --- */
.category-item {
    display: flex;
    align-items: center;
    padding: 15px;
    border: 1px solid #f9f9f9;
    border-radius: 15px;
    margin-bottom: 10px;
    transition: all 0.2s;
}

.category-item:hover {
    background-color: #fcfdfc;
    border-color: #eee;
    transform: translateX(5px);
}

.icon-box {
    width: 45px;
    height: 45px;
    background-color: #e6f0eb;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
}

.description-text {
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>