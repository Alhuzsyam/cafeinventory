<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// --- KONFIGURASI API ---
const API_URL = "https://api.inventorycafe.space"
// const API_URL = "http://127.0.0.1:8000"

// --- STATE UTAMA ---
const activeTab = ref('categories') 
const isSubmitting = ref(false)
const categories = ref([])
const products = ref([]) 
const menus = ref([])    

// --- STATE EDIT & MODAL ---
const editMode = ref({ type: null, id: null })
const modal = ref({
    show: false,
    title: "",
    message: "",
    type: "alert", // 'alert' atau 'confirm'
    onConfirm: null
})

// --- FORMS ---
const catForm = ref({ name: "", description: "" })
const menuForm = ref({ 
    name: "", 
    price: "", 
    description: "",
    division: "Bar", 
    recipes: [] 
})

// --- MODAL HELPER ---
const showAlert = (title, msg) => {
    modal.value = { show: true, title, message: msg, type: 'alert', onConfirm: null }
}

const showConfirm = (title, msg, callback) => {
    modal.value = { show: true, title, message: msg, type: 'confirm', onConfirm: callback }
}

const closeModal = () => { modal.value.show = false }

const confirmAction = () => {
    if (modal.value.onConfirm) modal.value.onConfirm()
    closeModal()
}

// --- FETCH DATA ---
const fetchData = async () => {
    try {
        const [cRes, pRes] = await Promise.all([
            axios.get(`${API_URL}/categories/`),
            axios.get(`${API_URL}/products/`)
        ])
        categories.value = cRes.data
        products.value = pRes.data
        const mRes = await axios.get(`${API_URL}/menu/`) 
        menus.value = mRes.data
    } catch (e) {
        console.error("Gagal load data:", e)
    }
}

const cancelEdit = () => {
    editMode.value = { type: null, id: null }
    catForm.value = { name: "", description: "" }
    menuForm.value = { name: "", price: "", description: "", division: "Bar", recipes: [] }
}

// --- LOGIC KATEGORI ---
const editCategory = (c) => {
    editMode.value = { type: 'cat', id: c.id }
    catForm.value = { name: c.name, description: c.description }
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

const deleteCategory = (id) => {
    showConfirm("Hapus Kategori?", "Data kategori ini akan hilang permanen.", async () => {
        try {
            await axios.delete(`${API_URL}/categories/${id}`)
            fetchData()
            showAlert("Berhasil", "Kategori telah dihapus.")
        } catch(e) { showAlert("Gagal", "Kategori sedang digunakan oleh produk lain.") }
    })
}

const submitCategory = async () => {
    if(!catForm.value.name) return showAlert("Peringatan", "Nama kategori wajib diisi!")
    isSubmitting.value = true
    try {
        if(editMode.value.type === 'cat') {
            await axios.put(`${API_URL}/categories/${editMode.value.id}`, catForm.value)
            showAlert("Berhasil", "Kategori berhasil diperbarui.")
        } else {
            await axios.post(`${API_URL}/categories/`, catForm.value)
            showAlert("Berhasil", "Kategori baru telah ditambahkan.")
        }
        await fetchData(); cancelEdit()
    } catch(e) { showAlert("Error", e.message) } 
    finally { isSubmitting.value = false }
}

// --- LOGIC MENU & RESEP ---
const editMenu = (m) => {
    editMode.value = { type: 'menu', id: m.id }
    menuForm.value = { 
        name: m.name, 
        price: m.price, 
        description: m.description, 
        division: m.division || 'Bar',
        recipes: m.recipes.map(r => ({ product_id: r.product_id, amount_needed: r.amount_needed }))
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

const deleteMenu = (id) => {
    showConfirm("Hapus Menu?", "Menu ini tidak akan muncul lagi di Kasir.", async () => {
        try {
            await axios.delete(`${API_URL}/menu/${id}`)
            fetchData()
            showAlert("Berhasil", "Menu telah dihapus.")
        } catch(e) { showAlert("Gagal", "Gagal menghapus menu.") }
    })
}

const addIngredient = () => { menuForm.value.recipes.push({ product_id: "", amount_needed: "" }) }
const removeIngredient = (index) => { menuForm.value.recipes.splice(index, 1) }

const submitMenu = async () => {
    if(!menuForm.value.name || !menuForm.value.price) return showAlert("Peringatan", "Nama Menu dan Harga wajib diisi!")
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
        if(editMode.value.type === 'menu') {
            await axios.put(`${API_URL}/menu/${editMode.value.id}`, payload)
            showAlert("Berhasil", "Menu & Resep berhasil diperbarui.")
        } else {
            await axios.post(`${API_URL}/menu/`, payload)
            showAlert("Berhasil", "Menu baru berhasil dibuat.")
        }
        await fetchData(); cancelEdit()
    } catch(e) { showAlert("Gagal", e.response?.data?.detail || e.message) } 
    finally { isSubmitting.value = false }
}

onMounted(fetchData)
</script>

<template>
  <div class="page-container p-4">
    
    <div class="mb-4">
      <h2 class="fw-bold text-dark-green m-0">⚙️ Pengaturan</h2>
      <p class="text-muted m-0">Kelola kategori, menu kasir, dan resep produksi</p>
    </div>
    
    <div class="nav-tabs-wrapper mb-4">
        <button class="tab-btn" :class="{ active: activeTab === 'categories' }" @click="activeTab = 'categories'; cancelEdit()">🏷️ Kategori</button>
        <button class="tab-btn" :class="{ active: activeTab === 'menu' }" @click="activeTab = 'menu'; cancelEdit()">☕ Menu & Resep</button>
    </div>

    <div v-if="activeTab === 'categories'" class="row g-4 fade-in">
        <div class="col-lg-4">
            <div class="card-modern sticky-top" style="top: 20px;">
                <h5 class="fw-bold text-dark-green mb-4">{{ editMode.type === 'cat' ? '📝 Edit Kategori' : '✨ Tambah Kategori' }}</h5>
                <div class="form-group mb-3">
                    <label>Nama Kategori</label>
                    <input v-model="catForm.name" class="form-control-soft" placeholder="Contoh: Minuman Dingin">
                </div>
                <div class="form-group mb-4">
                    <label>Deskripsi (Opsional)</label>
                    <textarea v-model="catForm.description" class="form-control-soft" rows="3"></textarea>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn-submit w-100" @click="submitCategory" :disabled="isSubmitting">{{ editMode.type === 'cat' ? 'Update' : 'Simpan' }}</button>
                    <button v-if="editMode.type === 'cat'" class="btn btn-light rounded-3 px-3" @click="cancelEdit">Batal</button>
                </div>
            </div>
        </div>
        <div class="col-lg-8">
            <div class="card-modern">
                <div class="category-list">
                    <div v-for="c in categories" :key="c.id" class="category-item d-flex align-items-center">
                        <div class="icon-box">🏷️</div>
                        <div class="ms-3 flex-grow-1">
                            <h6 class="fw-bold text-dark mb-1">{{ c.name }}</h6>
                            <p class="text-muted small mb-0">{{ c.description || '-' }}</p>
                        </div>
                        <div class="d-flex gap-1">
                            <button class="btn btn-action edit" @click="editCategory(c)"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn btn-action delete" @click="deleteCategory(c.id)"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div v-if="activeTab === 'menu'" class="row g-4 fade-in">
        <div class="col-lg-5">
            <div class="card-modern sticky-top" style="top: 20px;">
                <h5 class="fw-bold text-dark-green mb-4">{{ editMode.type === 'menu' ? '📝 Edit Menu' : '✨ Buat Menu Baru' }}</h5>
                <div class="form-group mb-3"><label>Nama Menu</label><input v-model="menuForm.name" class="form-control-soft"></div>
                <div class="form-group mb-3"><label>Divisi</label>
                    <select v-model="menuForm.division" class="form-control-soft"><option value="Bar">🍷 Bar</option><option value="Kitchen">🍳 Kitchen</option></select>
                </div>
                <div class="row g-2 mb-3">
                    <div class="col-6"><label>Harga (Rp)</label><input type="number" v-model="menuForm.price" class="form-control-soft"></div>
                    <div class="col-6"><label>Keterangan</label><input v-model="menuForm.description" class="form-control-soft"></div>
                </div>
                <hr class="border-dashed my-4">
                <div class="d-flex justify-content-between align-items-center mb-2"><label>Resep</label><button class="btn btn-sm btn-outline-success rounded-pill px-3" @click="addIngredient">+ Bahan</button></div>
                <div v-for="(recipe, index) in menuForm.recipes" :key="index" class="d-flex gap-2 mb-2 animate-slide">
                    <select v-model="recipe.product_id" class="form-control-soft" style="flex: 2;"><option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option></select>
                    <input type="number" v-model="recipe.amount_needed" class="form-control-soft" style="flex: 1;" placeholder="Jml">
                    <button class="btn-remove-sm" @click="removeIngredient(index)">×</button>
                </div>
                <div class="d-flex gap-2 mt-3">
                    <button class="btn-submit w-100" @click="submitMenu" :disabled="isSubmitting">{{ editMode.type === 'menu' ? 'Update Menu' : 'Simpan Menu' }}</button>
                    <button v-if="editMode.type === 'menu'" class="btn btn-light rounded-3 px-3" @click="cancelEdit">Batal</button>
                </div>
            </div>
        </div>
        <div class="col-lg-7">
            <div class="card-modern">
                <div v-for="m in menus" :key="m.id" class="category-item d-flex align-items-start">
                    <div class="icon-box bg-brown text-white">☕</div>
                    <div class="ms-3 flex-grow-1">
                        <div class="d-flex justify-content-between">
                            <h6 class="fw-bold text-dark mb-0">{{ m.name }} <span class="badge ms-2" :class="m.division === 'Kitchen' ? 'bg-secondary' : 'bg-success'">{{ m.division || 'Bar' }}</span></h6>
                            <div class="d-flex gap-1">
                                <button class="btn btn-action edit" @click="editMenu(m)"><i class="fa-solid fa-pen"></i></button>
                                <button class="btn btn-action delete" @click="deleteMenu(m.id)"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                        <div class="fw-bold text-dark-green small mb-2">Rp {{ m.price.toLocaleString() }}</div>
                        <div class="d-flex flex-wrap gap-1"><span v-for="r in m.recipes" :key="r.id" class="badge-resep">{{ r.product?.name }} {{ r.amount_needed }}</span></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div v-if="modal.show" class="modal-overlay fade-in">
        <div class="modal-card shadow-lg">
            <div class="text-center mb-3">
                <div v-if="modal.type === 'alert'" class="modal-icon bg-sage-light text-dark-green"><i class="fa-solid fa-circle-check"></i></div>
                <div v-else class="modal-icon bg-light text-danger"><i class="fa-solid fa-circle-exclamation"></i></div>
            </div>
            <h5 class="fw-bold text-center text-dark-green mb-2">{{ modal.title }}</h5>
            <p class="text-muted text-center small mb-4">{{ modal.message }}</p>
            <div class="d-flex gap-2">
                <button v-if="modal.type === 'confirm'" class="btn btn-light w-100 rounded-pill fw-bold" @click="closeModal">Batal</button>
                <button class="btn-submit w-100 rounded-pill" @click="modal.type === 'confirm' ? confirmAction() : closeModal()">{{ modal.type === 'confirm' ? 'Ya, Lanjutkan' : 'Oke' }}</button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
:root { --dark-green: #2c4a3b; --sage-light: #e6f0eb; --brown: #8a7044; }
.text-dark-green { color: #2c4a3b; }
.bg-sage-light { background-color: #e6f0eb; }
.bg-brown { background-color: #8a7044; }

/* TABS */
.nav-tabs-wrapper { display: flex; background: #e9ecef; padding: 5px; border-radius: 15px; width: fit-content; }
.tab-btn { border: none; padding: 10px 25px; border-radius: 12px; background: transparent; color: #666; font-weight: 600; cursor: pointer; }
.tab-btn.active { background: white; color: #2c4a3b; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }

/* CARDS & INPUTS */
.card-modern { background: white; border-radius: 20px; padding: 25px; border: 1px solid #f0f0f0; }
.form-control-soft { width: 100%; padding: 10px 15px; border: 1px solid #eee; border-radius: 10px; background: #fafafa; font-size: 0.95rem; }
.form-control-soft:focus { border-color: #b8d0c3; outline: none; background: white; }
label { font-size: 0.85rem; font-weight: 600; color: #555; margin-bottom: 6px; display: block; }

/* BUTTONS */
.btn-submit { background: #2c4a3b; color: white; border: none; padding: 12px; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-action { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: none; background: #f8f9fa; transition: 0.2s; }
.btn-action.edit:hover { background: #e6f0eb; color: #2c4a3b; }
.btn-action.delete:hover { background: #ffe6e6; color: #dc3545; }
.btn-remove-sm { width: 35px; height: 38px; border: none; background: #ffe6e6; color: red; border-radius: 8px; font-size: 1.2rem; }

/* LISTS */
.category-item { padding: 15px; border: 1px solid #f9f9f9; border-radius: 15px; margin-bottom: 10px; }
.icon-box { width: 45px; height: 45px; background: #e6f0eb; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.badge-resep { background: #198754; border: 1px solid #6aca87; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; color: #fff; }

/* MODAL SYSTEM */
.modal-overlay { position: fixed; inset: 0; background: rgba(44, 74, 59, 0.2); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; }
.modal-card { background: white; width: 100%; max-width: 350px; padding: 30px; border-radius: 28px; animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-icon { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto; }

@keyframes modalPop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
.fade-in { animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>