<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

// --- KONFIGURASI API ---
const API_URL = "https://api.inventorycafe.space"

// --- STATE UTAMA ---
const activeTab = ref('menu') 
const isSubmitting = ref(false)
const categories = ref([])
const products = ref([]) 
const menus = ref([])    
const searchQuery = ref("") 

// --- STATE MODAL CUSTOM ---
const modal = ref({
    show: false,
    title: "",
    message: "",
    type: "confirm", // 'confirm' atau 'alert'
    onConfirm: null
})

// --- FORMS ---
const catForm = ref({ name: "", description: "" })
const menuForm = ref({ 
    name: "", price: "", description: "", division: "Bar", 
    recipes: [] 
})
const editMode = ref({ type: null, id: null })

// --- MODAL METHODS ---
const openModal = (title, message, type, action = null) => {
    modal.value = { show: true, title, message, type, onConfirm: action }
}
const closeModal = () => { modal.value.show = false }
const handleConfirm = () => {
    if (modal.value.onConfirm) modal.value.onConfirm()
    closeModal()
}

// --- FETCH DATA ---
const fetchData = async () => {
    try {
        const [cRes, pRes, mRes] = await Promise.all([
            axios.get(`${API_URL}/categories/`).catch(() => ({ data: [] })),
            axios.get(`${API_URL}/products/`).catch(() => ({ data: [] })),
            axios.get(`${API_URL}/menu/`).catch(() => ({ data: [] }))
        ])
        categories.value = cRes.data;
        products.value = pRes.data;
        menus.value = mRes.data;
    } catch (e) { console.error("Gagal load data:", e) }
}

// --- FILTERED DATA (LOCAL SEARCH) ---
const filteredMenus = computed(() => {
    if (!searchQuery.value) return menus.value
    return menus.value.filter(m => m.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

// --- LOGIC KATEGORI ---
const editCategory = (c) => {
    editMode.value = { type: 'cat', id: c.id };
    catForm.value = { name: c.name, description: c.description || "" };
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const cancelEdit = () => {
    editMode.value = { type: null, id: null };
    catForm.value = { name: "", description: "" };
    menuForm.value = { name: "", price: "", description: "", division: "Bar", recipes: [] };
};

const submitCategory = async () => {
    if(!catForm.value.name) return openModal("Peringatan", "Nama kategori wajib diisi!", "alert")
    isSubmitting.value = true
    try {
        if(editMode.value.type === 'cat') {
            await axios.put(`${API_URL}/categories/${editMode.value.id}`, catForm.value)
            openModal("Berhasil", "Kategori berhasil diperbarui.", "alert")
        } else {
            await axios.post(`${API_URL}/categories/`, catForm.value)
            openModal("Berhasil", "Kategori baru telah ditambahkan.", "alert")
        }
        await fetchData(); 
        cancelEdit();
    } catch(e) { 
        openModal("Error", "Gagal memproses kategori.", "alert") 
    } finally { 
        isSubmitting.value = false 
    }
}

const triggerDeleteCategory = (id) => {
    openModal("Hapus Kategori?", "Seluruh data kategori ini akan hilang permanen.", "confirm", async () => {
        try {
            await axios.delete(`${API_URL}/categories/${id}`)
            fetchData();
            if(editMode.value.id === id) cancelEdit();
        } catch(e) { 
            openModal("Gagal", "Kategori tidak bisa dihapus karena masih digunakan produk lain.", "alert") 
        }
    })
}

// --- LOGIC MENU & RESEP ---
const addIngredient = () => {
    menuForm.value.recipes.push({ product_id: "", amount_needed: "", searchQuery: "", unit: "", isOpen: false })
}
const removeIngredient = (index) => { menuForm.value.recipes.splice(index, 1) }

const selectIngredient = (index, product) => {
    const row = menuForm.value.recipes[index]
    row.product_id = product.id
    row.searchQuery = product.name
    row.unit = product.unit
    row.isOpen = false
}

const editMenu = (m) => {
    activeTab.value = 'menu';
    editMode.value = { type: 'menu', id: m.id }
    menuForm.value = { 
        name: m.name, 
        price: m.price, 
        description: m.description, 
        division: m.division || 'Bar',
        recipes: m.recipes.map(r => ({ 
            product_id: r.product_id, 
            amount_needed: r.amount_needed, 
            searchQuery: r.product?.name || '', 
            unit: r.product?.unit || '', 
            isOpen: false 
        }))
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

const triggerDeleteMenu = (id) => {
    openModal("Hapus Menu?", "Menu ini tidak akan muncul lagi di kasir.", "confirm", async () => {
        try {
            await axios.delete(`${API_URL}/menu/${id}`)
            fetchData()
        } catch(e) { openModal("Error", "Gagal menghapus menu.", "alert") }
    })
}

const submitMenu = async () => {
    if(!menuForm.value.name || !menuForm.value.price) return openModal("Peringatan", "Nama & Harga wajib diisi!", "alert")
    isSubmitting.value = true
    try {
        const payload = {
            ...menuForm.value,
            price: parseFloat(menuForm.value.price),
            recipes: menuForm.value.recipes.map(r => ({
                product_id: r.product_id,
                amount_needed: parseFloat(r.amount_needed)
            })).filter(r => r.product_id && r.amount_needed)
        }
        if(editMode.value.type === 'menu') {
            await axios.put(`${API_URL}/menu/${editMode.value.id}`, payload)
        } else {
            await axios.post(`${API_URL}/menu/`, payload)
        }
        await fetchData(); 
        cancelEdit();
        openModal("Berhasil", "Data menu berhasil disimpan.", "alert")
    } catch(e) { openModal("Error", "Gagal menyimpan menu.", "alert") } 
    finally { isSubmitting.value = false }
}

const getFilteredProducts = (query) => {
    if (!query) return products.value.slice(0, 10)
    return products.value.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
}

onMounted(fetchData)
</script>

<template>
  <div class="app-container p-4">
    <header class="mb-5 d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3">
      <div>
        <h1 class="fw-800 text-dark-green m-0">Pengaturan & Menu</h1>
        <p class="text-muted m-0">Master data kategori dan manajemen resep cafe.</p>
      </div>
      <div class="tab-navigator p-1 shadow-sm">
        <button :class="['tab-link', { active: activeTab === 'categories' }]" @click="activeTab = 'categories'; cancelEdit()">🏷️ Kategori</button>
        <button :class="['tab-link', { active: activeTab === 'menu' }]" @click="activeTab = 'menu'; cancelEdit()">☕ Menu</button>
      </div>
    </header>

    <main v-if="activeTab === 'categories'" class="row g-4 fade-in">
        <div class="col-lg-4">
            <div class="glass-card sticky-top" style="top: 20px;">
                <h4 class="fw-bold text-dark-green mb-4">{{ editMode.type === 'cat' ? '📝 Edit Kategori' : '✨ Tambah Kategori' }}</h4>
                <div class="form-floating mb-3">
                    <input v-model="catForm.name" class="form-control premium-input" placeholder="Nama">
                    <label>Nama Kategori</label>
                </div>
                <div class="form-floating mb-4">
                    <textarea v-model="catForm.description" class="form-control premium-input" style="height: 100px" placeholder="Desc"></textarea>
                    <label>Deskripsi (Opsional)</label>
                </div>
                <div class="d-grid gap-2">
                    <button class="btn btn-premium-green py-3" @click="submitCategory" :disabled="isSubmitting">
                        {{ editMode.type === 'cat' ? 'Update Kategori' : 'Simpan Kategori' }}
                    </button>
                    <button v-if="editMode.type === 'cat'" class="btn btn-light border-0" @click="cancelEdit">Batal</button>
                </div>
            </div>
        </div>
        <div class="col-lg-8">
            <div class="list-container">
                <div v-for="c in categories" :key="c.id" class="item-card d-flex align-items-center mb-3">
                    <div class="icon-avatar shadow-sm">🏷️</div>
                    <div class="ms-3 flex-grow-1">
                        <h6 class="fw-700 m-0">{{ c.name }}</h6>
                        <p class="text-muted small m-0">{{ c.description || 'Tidak ada deskripsi' }}</p>
                    </div>
                    <div class="action-buttons d-flex gap-2">
                        <button class="btn-circle edit" @click="editCategory(c)"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-circle delete" @click="triggerDeleteCategory(c.id)"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <main v-if="activeTab === 'menu'" class="row g-4 fade-in">
        <div class="col-lg-5">
            <div class="glass-card sticky-top" style="top: 20px;">
                <h4 class="fw-bold text-dark-green mb-4">{{ editMode.type === 'menu' ? '📝 Edit Resep' : '✨ Menu & Resep Baru' }}</h4>
                <div class="form-floating mb-3">
                    <input v-model="menuForm.name" class="form-control premium-input" placeholder="Nama">
                    <label>Nama Menu Jualan</label>
                </div>
                <div class="row g-2 mb-3">
                    <div class="col-7"><div class="form-floating"><input type="number" v-model="menuForm.price" class="form-control premium-input" placeholder="Hrg"><label>Harga (Rp)</label></div></div>
                    <div class="col-5">
                        <div class="form-floating">
                            <select v-model="menuForm.division" class="form-select premium-input">
                                <option value="Bar">🍷 Bar</option>
                                <option value="Kitchen">🍳 Kitchen</option>
                            </select>
                            <label>Divisi</label>
                        </div>
                    </div>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-4 mb-3">
                    <label class="fw-bold text-muted small">RESEP / KOMPOSISI</label>
                    <button class="btn btn-sm btn-soft-green rounded-pill" @click="addIngredient">+ Bahan</button>
                </div>
                <div v-for="(recipe, index) in menuForm.recipes" :key="index" class="d-flex gap-2 mb-2 animate-pop">
                    <div class="position-relative flex-grow-1">
                        <input type="text" v-model="recipe.searchQuery" class="form-control premium-input-sm" placeholder="Cari..." @focus="recipe.isOpen = true" @blur="setTimeout(() => recipe.isOpen=false, 200)">
                        <div v-if="recipe.isOpen" class="dropdown-overlay shadow-lg border">
                            <div v-for="p in getFilteredProducts(recipe.searchQuery)" :key="p.id" class="dropdown-item-p" @mousedown="selectIngredient(index, p)">
                                {{ p.name }} <small class="text-muted">({{ p.unit }})</small>
                            </div>
                        </div>
                    </div>
                    <div class="input-group" style="width: 120px;">
                        <input type="number" v-model="recipe.amount_needed" class="form-control premium-input-sm border-end-0" placeholder="Qty">
                        <span class="input-group-text unit-tag">{{ recipe.unit || '-' }}</span>
                    </div>
                    <button class="btn btn-soft-danger" @click="removeIngredient(index)"><i class="fa-solid fa-times"></i></button>
                </div>
                <div class="d-grid gap-2 mt-4">
                    <button class="btn btn-premium-green py-3 fw-bold" @click="submitMenu" :disabled="isSubmitting">Simpan Menu</button>
                    <button v-if="editMode.type === 'menu'" class="btn btn-outline-secondary border-0" @click="cancelEdit">Batal</button>
                </div>
            </div>
        </div>

        <div class="col-lg-7">
            <div class="search-bar mb-4 position-relative">
                <i class="fa-solid fa-magnifying-glass search-icon"></i>
                <input v-model="searchQuery" class="form-control search-input-field shadow-sm" placeholder="Cari menu...">
            </div>
            <div class="row g-3">
                <div v-for="m in filteredMenus" :key="m.id" class="col-md-6">
                    <div class="menu-item-card h-100 shadow-sm border p-4">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="fw-800 m-0 text-truncate" style="max-width: 150px">{{ m.name }}</h6>
                            <div class="d-flex gap-1">
                                <button class="btn btn-action-sm edit" @click="editMenu(m)"><i class="fa-solid fa-pen"></i></button>
                                <button class="btn btn-action-sm delete" @click="triggerDeleteMenu(m.id)"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                        <div class="text-premium-green fw-700 mb-3">Rp {{ m.price.toLocaleString() }}</div>
                        <div class="d-flex flex-wrap gap-1">
                            <span v-for="r in m.recipes" :key="r.id" class="recipe-tag">{{ r.product?.name }} <small>{{ r.amount_needed }}{{ r.product?.unit }}</small></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <div v-if="modal.show" class="modal-overlay">
        <div class="modal-content-card animate-pop">
            <div class="text-center mb-4">
                <div :class="['modal-icon-circle', modal.type === 'confirm' ? 'bg-soft-danger' : 'bg-soft-green']">
                    <i :class="['fa-solid', modal.type === 'confirm' ? 'fa-triangle-exclamation text-danger' : 'fa-circle-check text-premium-green']"></i>
                </div>
            </div>
            <h5 class="fw-800 text-center text-dark-green mb-2">{{ modal.title }}</h5>
            <p class="text-muted text-center small mb-4">{{ modal.message }}</p>
            <div class="d-flex gap-2">
                <button v-if="modal.type === 'confirm'" class="btn btn-light w-100 py-2 rounded-pill" @click="closeModal">Batal</button>
                <button class="btn btn-premium-green w-100 py-2 rounded-pill shadow-sm" @click="modal.type === 'confirm' ? handleConfirm() : closeModal()">
                    {{ modal.type === 'confirm' ? 'Ya, Lanjutkan' : 'Oke' }}
                </button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');

:root {
  --dark-green: #1a3a34;
  --premium-green: #2d6a4f;
  --soft-green: #d8f3dc;
  --soft-danger: #ffebee;
}

.app-container { font-family: 'Plus Jakarta Sans', sans-serif; color: #2d3436; }
.fw-800 { font-weight: 800; }
.fw-700 { font-weight: 700; }
.text-premium-green { color: var(--premium-green); }

.tab-navigator { background: #f1f2f6; border-radius: 14px; display: inline-flex; }
.tab-link { border: none; background: transparent; padding: 10px 20px; border-radius: 10px; font-weight: 700; font-size: 0.85rem; color: #636e72; transition: 0.3s; }
.tab-link.active { background: white; color: var(--dark-green); box-shadow: 0 4px 10px rgba(0,0,0,0.05); }

.glass-card { background: white; border-radius: 24px; padding: 28px; border: 1px solid #f1f2f6; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
.item-card { background: white; padding: 16px 20px; border-radius: 18px; border: 1px solid #f1f2f6; transition: 0.2s; }
.item-card:hover { transform: translateX(5px); border-color: var(--premium-green); }
.menu-item-card { background: white; border-radius: 20px; transition: 0.3s; }

.premium-input { border-radius: 14px; border: 1.5px solid #edf2f7; background: #f8fafc; font-size: 0.95rem; font-weight: 600; }
.premium-input:focus { border-color: var(--premium-green); background: white; box-shadow: 0 0 0 4px rgba(45, 106, 79, 0.1); }
.premium-input-sm { border-radius: 10px; border: 1.5px solid #edf2f7; background: #f8fafc; font-size: 0.85rem; padding: 8px 12px; }

.btn-premium-green { background: var(--dark-green); color: white; border-radius: 12px; font-weight: 700; transition: 0.2s; }
.btn-premium-green:hover { background: var(--premium-green); transform: translateY(-2px); }
.btn-soft-green { background: var(--soft-green); color: var(--premium-green); border: none; font-weight: 700; }
.btn-soft-danger { background: var(--soft-danger); color: #d32f2f; border: none; border-radius: 8px; width: 32px; height: 32px; }
.btn-circle { width: 36px; height: 36px; border-radius: 50%; border: none; background: #f8fafc; display: flex; align-items: center; justify-content: center; }
.btn-circle.edit:hover { background: #e3f2fd; color: #1976d2; }
.btn-circle.delete:hover { background: var(--soft-danger); color: #d32f2f; }
.btn-action-sm { border: none; background: transparent; color: #b2bec3; font-size: 0.9rem; transition: 0.2s; }
.btn-action-sm.edit:hover { color: #1976d2; }
.btn-action-sm.delete:hover { color: #d32f2f; }

.modal-overlay { position: fixed; inset: 0; background: rgba(26, 58, 52, 0.4); backdrop-filter: blur(6px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-content-card { background: white; width: 100%; max-width: 360px; padding: 32px; border-radius: 28px; box-shadow: 0 20px 50px rgba(0,0,0,0.1); }
.modal-icon-circle { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto; }
.bg-soft-danger { background: #fff5f5; }
.bg-soft-green { background: #f0fff4; }

.icon-avatar { width: 44px; height: 44px; background: #f1f7f5; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.recipe-tag { background: #f1f2f6; padding: 4px 10px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; color: #444; }
.unit-tag { background: #f8fafc; border: 1.5px solid #edf2f7; border-left: none; font-size: 0.7rem; font-weight: 800; color: #adb5bd; }
.dropdown-overlay { position: absolute; top: 105%; left: 0; width: 100%; background: white; border-radius: 12px; z-index: 100; max-height: 150px; overflow-y: auto; padding: 5px; }
.dropdown-item-p { padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; display: flex; justify-content: space-between; }
.dropdown-item-p:hover { background: #f1f7f5; color: var(--premium-green); }

.search-input-field { padding: 12px 15px 12px 45px; border-radius: 16px; border: 1.5px solid #edf2f7; width: 100%; }
.search-icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); color: #b2bec3; }

.fade-in { animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-pop { animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes pop { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
</style>