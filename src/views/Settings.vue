<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// --- STATE ---
const activeTab = ref('categories') 
const API_URL = "https://api.inventorycafe.space"
// const API_URL = "http://127.0.0.1:8000"
const isSubmitting = ref(false)

// DATA STATE
const categories = ref([])
const products = ref([]) 
const menus = ref([])    

// FORMS
const catForm = ref({ name: "", description: "" })

// ✅ UPDATE 1: Tambahkan 'division' di sini
const menuForm = ref({ 
    name: "", 
    price: "", 
    description: "",
    division: "Bar", // Default ke Bar
    recipes: [] 
})

// --- FETCH DATA ---
const fetchData = async () => {
    try {
        const [cRes, pRes] = await Promise.all([
            axios.get(`${API_URL}/categories/`),
            axios.get(`${API_URL}/products/`)
        ])
        categories.value = cRes.data
        products.value = pRes.data

        try {
            const mRes = await axios.get(`${API_URL}/menu/`) 
            menus.value = mRes.data
        } catch (err) {
            console.warn("Endpoint /menu/ belum tersedia", err)
            menus.value = []
        }

    } catch (e) {
        console.error("Gagal load data:", e)
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
        alert("✅ Kategori berhasil disimpan")
    } catch(e) { alert("Error: " + e.message) } 
    finally { isSubmitting.value = false }
}

// --- LOGIC MENU & RESEP ---
const addIngredient = () => {
    menuForm.value.recipes.push({ product_id: "", amount_needed: "" })
}

const removeIngredient = (index) => {
    menuForm.value.recipes.splice(index, 1)
}

const submitMenu = async () => {
    if(!menuForm.value.name || !menuForm.value.price) return alert("Nama Menu dan Harga wajib diisi!")
    
    if(menuForm.value.recipes.length === 0) {
        if(!confirm("⚠️ Menu ini tidak memiliki resep. Lanjutkan?")) return;
    }

    isSubmitting.value = true
    try {
        const payload = {
            ...menuForm.value,
            price: parseFloat(menuForm.value.price),
            recipes: menuForm.value.recipes.map(r => ({
                product_id: r.product_id,
                amount_needed: parseFloat(r.amount_needed)
            }))
        }

        await axios.post(`${API_URL}/menu/`, payload)
        await fetchData()
        
        // ✅ UPDATE 2: Reset form termasuk division
        menuForm.value = { name: "", price: "", description: "", division: "Bar", recipes: [] }
        alert("✅ Menu & Resep berhasil dibuat!")
    } catch(e) {
        console.error(e)
        alert("Gagal simpan menu: " + (e.response?.data?.detail || e.message))
    } finally {
        isSubmitting.value = false
    }
}

onMounted(fetchData)
</script>

<template>
  <div class="page-container">
    
    <div class="mb-4">
      <h2 class="fw-bold text-dark-green m-0">⚙️ Pengaturan</h2>
      <p class="text-muted m-0">Kelola kategori, menu kasir, dan resep produksi</p>
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
                    <label>Deskripsi (Opsional)</label>
                    <textarea v-model="catForm.description" class="form-control-soft" rows="3"></textarea>
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
                    <span class="badge bg-sage-light text-dark-green rounded-pill px-3">Total: {{ categories.length }}</span>
                </div>
                <div class="category-list">
                    <div v-if="categories.length === 0" class="text-center py-5 text-muted">Belum ada kategori.</div>
                    <div v-for="c in categories" :key="c.id" class="category-item">
                        <div class="icon-box">🏷️</div>
                        <div class="ms-3 flex-grow-1">
                            <h6 class="fw-bold text-dark mb-1">{{ c.name }}</h6>
                            <p class="text-muted small mb-0 description-text">{{ c.description || '-' }}</p>
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

                <div class="form-group mb-3">
                    <label>Divisi (Station)</label>
                    <select v-model="menuForm.division" class="form-control-soft form-select">
                        <option value="Bar">🍷 Bar (Minuman)</option>
                        <option value="Kitchen">🍳 Kitchen (Makanan)</option>
                    </select>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label>Harga Jual (Rp)</label>
                        <input type="number" v-model="menuForm.price" class="form-control-soft" placeholder="25000">
                    </div>
                    <div class="col-6">
                        <label>Ket. Singkat</label>
                        <input v-model="menuForm.description" class="form-control-soft" placeholder="Best Seller">
                    </div>
                </div>

                <hr class="border-dashed my-4">

                <div class="d-flex justify-content-between align-items-center mb-2">
                    <label class="mb-0 text-dark-green">Resep / Komposisi</label>
                    <button class="btn btn-sm btn-outline-success rounded-pill px-3 py-1" @click="addIngredient" style="font-size: 0.8rem;">
                        + Bahan
                    </button>
                </div>
                <p class="text-muted small mb-3 fst-italic">
                    Pilih bahan baku yang akan berkurang otomatis saat menu ini terjual.
                </p>

                <div v-if="menuForm.recipes.length === 0" class="text-center py-3 bg-light rounded-3 mb-3 border-dashed">
                    <small class="text-muted">Belum ada bahan baku ditambahkan</small>
                </div>

                <div v-for="(recipe, index) in menuForm.recipes" :key="index" class="d-flex gap-2 mb-2 align-items-center animate-slide">
                    <select v-model="recipe.product_id" class="form-control-soft" style="flex: 2; font-size: 0.85rem;">
                        <option value="" disabled>Pilih Bahan...</option>
                        <option v-for="p in products" :key="p.id" :value="p.id">
                            {{ p.name }} ({{ p.unit }})
                        </option>
                    </select>
                    
                    <input type="number" v-model="recipe.amount_needed" class="form-control-soft" style="flex: 1; font-size: 0.85rem;" placeholder="Jml">
                    
                    <button class="btn-remove-sm" @click="removeIngredient(index)" title="Hapus bahan">×</button>
                </div>

                <button class="btn-submit w-100 mt-3" @click="submitMenu" :disabled="isSubmitting">
                    {{ isSubmitting ? 'Menyimpan...' : 'Simpan Menu & Resep' }}
                </button>
            </div>
        </div>

        <div class="col-lg-7">
            <div class="card-modern">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h5 class="fw-bold text-dark-green m-0">Daftar Menu Aktif</h5>
                    <button class="btn btn-sm btn-light" @click="fetchData">🔄 Refresh</button>
                </div>

                <div class="list-wrapper">
                    <div v-if="menus.length === 0" class="text-center py-5 text-muted">Belum ada menu terdaftar.</div>
                    
                    <div v-for="m in menus" :key="m.id" class="category-item">
                        <div class="icon-box bg-brown text-white">☕</div>
                        <div class="ms-3 flex-grow-1">
                            <div class="d-flex justify-content-between">
                                <h6 class="fw-bold text-dark mb-0">
                                    {{ m.name }} 
                                    <span class="badge ms-2" :class="m.division === 'Kitchen' ? 'bg-secondary' : 'bg-success'">
                                        {{ m.division || 'Bar' }}
                                    </span>
                                </h6>
                                <span class="fw-bold text-dark-green">Rp {{ m.price.toLocaleString() }}</span>
                            </div>
                            <small class="text-muted d-block mb-2">{{ m.description }}</small>
                            
                            <div class="d-flex flex-wrap gap-1" v-if="m.recipes && m.recipes.length > 0">
                                <span v-for="r in m.recipes" :key="r.id" class="badge-resep">
                                    {{ r.product?.name || 'Bahan' }}: {{ r.amount_needed }} {{ r.product?.unit }}
                                </span>
                            </div>
                            <small v-else class="text-danger fst-italic" style="font-size: 0.75rem;">*Tidak ada resep (Stok tidak dipotong)</small>
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
:root { --dark-green: #2c4a3b; --sage-light: #e6f0eb; --brown: #8a7044; }
.text-dark-green { color: #2c4a3b; }
.bg-sage-light { background-color: #e6f0eb; }
.bg-brown { background-color: #8a7044; }

/* --- TABS --- */
.nav-tabs-wrapper { display: flex; background: #e9ecef; padding: 5px; border-radius: 15px; gap: 5px; width: fit-content; }
.tab-btn { border: none; padding: 10px 25px; border-radius: 12px; background: transparent; color: #666; font-weight: 600; transition: all 0.2s; font-size: 0.9rem; cursor: pointer; }
.tab-btn:hover { color: #2c4a3b; background: rgba(255,255,255,0.5); }
.tab-btn.active { background: white; color: #2c4a3b; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }

/* --- CARD STYLE --- */
.card-modern { background: white; border-radius: 20px; padding: 25px; border: 1px solid #f0f0f0; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }

/* --- FORM INPUTS --- */
label { font-size: 0.85rem; font-weight: 600; color: #555; margin-bottom: 6px; display: block; }
.form-control-soft { width: 100%; padding: 10px 15px; border: 1px solid #eee; border-radius: 10px; background-color: #fafafa; transition: all 0.3s; font-size: 0.95rem; font-family: inherit; }
.form-control-soft:focus { background-color: white; border-color: #b8d0c3; outline: none; box-shadow: 0 0 0 3px rgba(44, 74, 59, 0.1); }
textarea.form-control-soft { resize: none; }
.border-dashed { border-top: 1px dashed #eee; }

/* --- BUTTONS --- */
.btn-submit { background-color: #2c4a3b; color: white; border: none; padding: 12px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-submit:hover { background-color: #1e3329; }
.btn-submit:disabled { background-color: #9aa5a0; cursor: not-allowed; }
.btn-remove-sm { width: 35px; height: 38px; border: none; background: #ffe6e6; color: red; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; transition: 0.2s; }
.btn-remove-sm:hover { background: #ffcccc; }

/* --- LIST ITEMS --- */
.list-wrapper { max-height: 600px; overflow-y: auto; }
.category-item { display: flex; align-items: flex-start; padding: 15px; border: 1px solid #f9f9f9; border-radius: 15px; margin-bottom: 10px; transition: all 0.2s; }
.category-item:hover { background-color: #fcfdfc; border-color: #eee; transform: translateX(3px); }
.icon-box { width: 45px; height: 45px; background-color: #e6f0eb; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
.description-text { line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.badge-resep { background: #f8f9fa; border: 1px solid #eee; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; color: #666; }

/* --- ANIMATION --- */
.fade-in { animation: fadeIn 0.4s ease; }
.animate-slide { animation: slideIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
</style>