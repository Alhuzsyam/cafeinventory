<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// --- STATE ---
const activeTab = ref('categories') // 'categories' atau 'menu'
const API_URL = "https://api.inventorycafe.space"
// const API_URL = "http://127.0.0.1:8000"
const isSubmitting = ref(false)

// DATA
const categories = ref([])
const products = ref([]) // Butuh ini untuk bikin resep (pilih bahan baku)
const menus = ref([])

// FORMS
const catForm = ref({ name: "", description: "" })
const menuForm = ref({ 
    name: "", 
    price: 0, 
    description: "",
    recipes: [] // Array of { product_id: "", amount_needed: 0 }
})

// --- FETCH DATA ---
const fetchData = async () => {
    try {
        const [cRes, pRes, mRes] = await Promise.all([
            axios.get(`${API_URL}/categories/`),
            axios.get(`${API_URL}/products/`),
            // Endpoint ini belum kita buat di backend utk GET menu list, 
            // tapi asumsi kita pakai struktur endpoint standar (GET /menu/ blm ada di backend code sebelumnya, 
            // tapi POST ada. Nanti pastikan Backend punya GET /menu/ atau sesuaikan)
            // Kalo belum ada GET /menu/, bagian list menu mungkin error. 
            // *Pastikan Backend sudah punya endpoint GET /menu/ atau tabel menu_items*
             axios.get(`${API_URL}/menu/`).catch(() => ({ data: [] })) 
        ])
        categories.value = cRes.data
        products.value = pRes.data
        menus.value = mRes.data
    } catch (e) {
        console.error("Error fetching data:", e)
    }
}

// --- LOGIC KATEGORI ---
const submitCategory = async () => {
    if(!catForm.value.name) return alert("Nama kategori wajib diisi")
    isSubmitting.value = true
    try {
        await axios.post(`${API_URL}/categories/`, catForm.value)
        await fetchData()
        catForm.value = { name: "", description: "" }
        alert("Kategori berhasil disimpan")
    } catch(e) { alert("Error: " + e.message) } 
    finally { isSubmitting.value = false }
}

// --- LOGIC MENU & RESEP ---
const addIngredient = () => {
    menuForm.value.recipes.push({ product_id: "", amount_needed: 0 })
}

const removeIngredient = (index) => {
    menuForm.value.recipes.splice(index, 1)
}

const submitMenu = async () => {
    if(!menuForm.value.name || menuForm.value.price <= 0) return alert("Nama dan Harga wajib diisi")
    
    // Validasi Resep
    if(menuForm.value.recipes.length === 0) {
        if(!confirm("Menu ini tidak memiliki resep (Stok tidak akan berkurang). Lanjut?")) return;
    }

    isSubmitting.value = true
    try {
        await axios.post(`${API_URL}/menu/`, menuForm.value)
        await fetchData()
        // Reset Form
        menuForm.value = { name: "", price: 0, description: "", recipes: [] }
        alert("Menu berhasil dibuat!")
    } catch(e) {
        alert("Gagal membuat menu: " + e.message)
    } finally {
        isSubmitting.value = false
    }
}

onMounted(fetchData)
</script>

<template>
  <div class="page-container">
    
    <div class="mb-4">
      <h2 class="fw-bold text-dark-green m-0">⚙️ Pengaturan & Menu</h2>
      <p class="text-muted m-0">Kelola kategori dan resep menu untuk kasir</p>
    </div>
    
    <div class="nav-tabs-wrapper mb-4">
        <button class="tab-btn" :class="{ active: activeTab === 'categories' }" @click="activeTab = 'categories'">
            🏷️ Kategori
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'menu' }" @click="activeTab = 'menu'">
            ☕ Menu & Resep
        </button>
    </div>

    <div v-if="activeTab === 'categories'" class="row g-4 fade-in">
        <div class="col-lg-4">
            <div class="card-modern sticky-top" style="top: 20px;">
                <h5 class="fw-bold text-dark-green mb-4">Tambah Kategori</h5>
                <div class="form-group mb-3">
                    <label>Nama Kategori</label>
                    <input v-model="catForm.name" class="form-control-soft" placeholder="Contoh: Minuman Dingin">
                </div>
                <div class="form-group mb-4">
                    <label>Deskripsi</label>
                    <textarea v-model="catForm.description" class="form-control-soft" rows="3"></textarea>
                </div>
                <button class="btn-submit w-100" @click="submitCategory" :disabled="isSubmitting">Simpan Kategori</button>
            </div>
        </div>
        <div class="col-lg-8">
            <div class="card-modern">
                <h5 class="fw-bold text-dark-green mb-4">Daftar Kategori ({{ categories.length }})</h5>
                <div class="list-wrapper">
                    <div v-for="c in categories" :key="c.id" class="list-item">
                        <span class="icon-box">🏷️</span>
                        <div class="ms-3">
                            <h6 class="fw-bold mb-0">{{ c.name }}</h6>
                            <small class="text-muted">{{ c.description || '-' }}</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div v-if="activeTab === 'menu'" class="row g-4 fade-in">
        <div class="col-lg-5">
            <div class="card-modern sticky-top" style="top: 20px;">
                <h5 class="fw-bold text-dark-green mb-4">Buat Menu Baru</h5>
                
                <div class="form-group mb-3">
                    <label>Nama Menu (Jualan)</label>
                    <input v-model="menuForm.name" class="form-control-soft" placeholder="Misal: Kopi Susu Aren">
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label>Harga Jual (Rp)</label>
                        <input type="number" v-model="menuForm.price" class="form-control-soft" placeholder="25000">
                    </div>
                    <div class="col-6">
                        <label>Deskripsi</label>
                        <input v-model="menuForm.description" class="form-control-soft" placeholder="Opsional">
                    </div>
                </div>

                <hr class="border-dashed my-4">

                <div class="d-flex justify-content-between align-items-center mb-2">
                    <label class="mb-0 text-dark-green">Resep / Komposisi</label>
                    <button class="btn btn-sm btn-outline-success rounded-pill px-3" @click="addIngredient">+ Bahan</button>
                </div>
                <p class="text-muted small mb-3">Tentukan bahan baku yang berkurang setiap menu ini terjual.</p>

                <div v-if="menuForm.recipes.length === 0" class="text-center py-3 bg-light rounded-3 mb-3 border-dashed">
                    <small class="text-muted">Belum ada bahan baku</small>
                </div>

                <div v-for="(recipe, index) in menuForm.recipes" :key="index" class="d-flex gap-2 mb-2 align-items-center">
                    <select v-model="recipe.product_id" class="form-control-soft" style="flex: 2;">
                        <option value="" disabled>Pilih Bahan...</option>
                        <option v-for="p in products" :key="p.id" :value="p.id">
                            {{ p.name }} ({{ p.unit }})
                        </option>
                    </select>
                    <input type="number" v-model="recipe.amount_needed" class="form-control-soft" style="flex: 1;" placeholder="Jml">
                    <button class="btn-remove-sm" @click="removeIngredient(index)">×</button>
                </div>

                <button class="btn-submit w-100 mt-3" @click="submitMenu" :disabled="isSubmitting">Simpan Menu & Resep</button>
            </div>
        </div>

        <div class="col-lg-7">
            <div class="card-modern">
                <h5 class="fw-bold text-dark-green mb-4">Daftar Menu Aktif</h5>
                <div class="list-wrapper">
                    <div v-if="menus.length === 0" class="text-center py-5 text-muted">Belum ada menu terdaftar</div>
                    
                    <div v-for="m in menus" :key="m.id" class="list-item">
                        <span class="icon-box bg-brown text-white">☕</span>
                        <div class="ms-3 flex-grow-1">
                            <div class="d-flex justify-content-between">
                                <h6 class="fw-bold mb-0">{{ m.name }}</h6>
                                <span class="fw-bold text-dark-green">Rp {{ m.price.toLocaleString() }}</span>
                            </div>
                            <small class="text-muted d-block">{{ m.description }}</small>
                            
                            <div class="mt-2" v-if="m.recipes && m.recipes.length > 0">
                                <span v-for="r in m.recipes" :key="r.id" class="badge bg-light text-muted border me-1 fw-normal">
                                    {{ r.product?.name || 'Bahan' }}: {{ r.amount_needed }}
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
/* Gunakan style yang sama dengan Settings lama, ditambah style tabs */
:root { --dark-green: #2c4a3b; --sage-light: #e6f0eb; --brown: #8a7044; }
.text-dark-green { color: #2c4a3b; }
.bg-brown { background-color: #8a7044; }

.card-modern { background: white; border-radius: 20px; padding: 25px; border: 1px solid #f0f0f0; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
.form-control-soft { width: 100%; padding: 10px 15px; border: 1px solid #eee; border-radius: 10px; background-color: #fafafa; }
.form-control-soft:focus { background-color: white; border-color: #b8d0c3; outline: none; }
.btn-submit { background-color: #2c4a3b; color: white; border: none; padding: 12px; border-radius: 10px; font-weight: 600; width: 100%; transition: 0.2s; }
.btn-submit:hover { background-color: #1e3329; }
.btn-remove-sm { width: 30px; height: 38px; border: none; background: #ffe6e6; color: red; border-radius: 8px; cursor: pointer; }

/* TABS STYLE */
.nav-tabs-wrapper { display: flex; background: #e9ecef; padding: 5px; border-radius: 15px; gap: 5px; width: fit-content; }
.tab-btn { border: none; padding: 10px 20px; border-radius: 12px; background: transparent; color: #666; font-weight: 600; transition: all 0.2s; }
.tab-btn.active { background: white; color: #2c4a3b; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }

/* LIST STYLE */
.list-wrapper { max-height: 500px; overflow-y: auto; }
.list-item { display: flex; align-items: flex-start; padding: 15px; border: 1px solid #f9f9f9; border-radius: 15px; margin-bottom: 10px; transition: 0.2s; }
.list-item:hover { background: #fcfdfc; transform: translateX(3px); }
.icon-box { width: 40px; height: 40px; background: #e6f0eb; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.border-dashed { border-top: 1px dashed #eee; }
.fade-in { animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>