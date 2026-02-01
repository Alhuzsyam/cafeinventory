<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'

// --- STATE UTAMA ---
const products = ref([])
const categories = ref([])
// const API_URL = "http://127.0.0.1:8000"
const API_URL = "https://api.inventorycafe.space"
const isSubmitting = ref(false)

// --- STATE FILTER & SEARCH ---
const selectedDivision = ref('ALL')
const searchQuery = ref("")

// --- STATE PAGINATION ---
const currentPage = ref(1)
const itemsPerPage = ref(10) // Default items per page

// --- STATE FORM TAMBAH ---
const aliasInput = ref("")
const form = ref({
  name: "", sku: "", category_id: "", unit: "pcs", 
  min_stock_level: 5, max_stock_level: 100, division: "Bar", aliases: []
})

// --- STATE FORM EDIT (MODAL) ---
const showModal = ref(false)
const editAliasInput = ref("")
const editForm = ref({
  id: null,
  name: "", sku: "", category_id: "", unit: "", 
  min_stock_level: 0, max_stock_level: 0, division: "", aliases: []
})

// --- COMPUTED: FILTERING ---
const filteredProducts = computed(() => {
    let result = products.value

    // 1. Filter by Division
    if (selectedDivision.value !== 'ALL') {
        result = result.filter(p => p.division === selectedDivision.value)
    }

    // 2. Filter by Search Query (Nama atau SKU)
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        result = result.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.sku.toLowerCase().includes(query)
        )
    }

    return result
})

// --- COMPUTED: PAGINATION ---
const totalPages = computed(() => {
    return Math.ceil(filteredProducts.value.length / itemsPerPage.value)
})

const paginatedProducts = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return filteredProducts.value.slice(start, end)
})

// --- WATCHERS ---
// Reset ke halaman 1 jika filter atau search berubah
watch([selectedDivision, searchQuery, itemsPerPage], () => {
    currentPage.value = 1
})

// --- METHODS ---

const fetchData = async () => {
    try {
        // Mengambil semua data (limit besar) untuk client-side pagination
        // Jika data sangat besar (ribuan), sebaiknya gunakan server-side pagination
        const pRes = await axios.get(`${API_URL}/products/?limit=1000`)
        products.value = pRes.data
        const cRes = await axios.get(`${API_URL}/categories/`)
        categories.value = cRes.data
    } catch (e) {
        console.error("Gagal load data:", e)
    }
}

const changePage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page
    }
}

// Helper: Add/Remove Alias di Form Tambah
const addAlias = () => {
    if(aliasInput.value.trim()) {
        form.value.aliases.push(aliasInput.value.trim()); aliasInput.value = ""
    }
}
const removeAlias = (index) => form.value.aliases.splice(index, 1)

// Helper: Add/Remove Alias di Form Edit
const addEditAlias = () => {
    if(editAliasInput.value.trim()) {
        editForm.value.aliases.push(editAliasInput.value.trim()); editAliasInput.value = ""
    }
}
const removeEditAlias = (index) => editForm.value.aliases.splice(index, 1)

// --- CRUD OPERATIONS ---

// 1. CREATE (Tambah Produk)
const submitProduct = async () => {
    if (!form.value.name || !form.value.sku) return alert("Nama dan SKU wajib diisi")
    
    isSubmitting.value = true
    try {
        await axios.post(`${API_URL}/products/`, form.value)
        await fetchData()
        // Reset form
        form.value = { 
            name: "", sku: "", category_id: "", unit: "pcs", 
            min_stock_level: 5, max_stock_level: 100, division: "Bar", aliases: [] 
        }
        alert("Produk berhasil ditambahkan!")
    } catch (e) {
        alert("Gagal tambah: " + e.message)
    } finally {
        isSubmitting.value = false
    }
}

// 2. PREPARE EDIT (Buka Modal)
const openEditModal = (product) => {
    editForm.value = JSON.parse(JSON.stringify(product))
    if (!editForm.value.aliases) editForm.value.aliases = []
    showModal.value = true
}

// 3. UPDATE (Simpan Perubahan)
const updateProduct = async () => {
    if (!editForm.value.name) return alert("Nama produk wajib diisi")

    isSubmitting.value = true
    try {
        await axios.put(`${API_URL}/products/${editForm.value.id}`, editForm.value)
        await fetchData() 
        showModal.value = false 
        alert("Data berhasil diperbarui!")
    } catch (e) {
        alert("Gagal update: " + e.message)
    } finally {
        isSubmitting.value = false
    }
}

// 4. DELETE (Hapus Produk)
const deleteProduct = async (id, name) => {
    if (confirm(`Yakin ingin menghapus permanent produk "${name}"?`)) {
        try {
            await axios.delete(`${API_URL}/products/${id}`)
            products.value = products.value.filter(p => p.id !== id)
        } catch (e) {
            alert("Gagal menghapus: " + e.message)
        }
    }
}

// UI Helper
const getProductImage = (name) => {
  const initial = name ? name.substring(0, 1).toUpperCase() : '?'
  return `https://placehold.co/100x100/f0f2f5/5c5c5c?text=${initial}&font=merriweather`
}

onMounted(fetchData)
</script>

<template>
  <div class="page-container">
    
    <div class="mb-4">
      <h2 class="fw-bold text-dark-green m-0">📦 Master Produk</h2>
      <p class="text-muted m-0">Kelola daftar menu, harga, dan stok barang</p>
    </div>
    
    <div class="row g-4">
        
        <div class="col-lg-4">
            <div class="card-modern sticky-top" style="top: 20px; z-index: 1;">
                <h5 class="fw-bold text-dark-green mb-4">Tambah Produk Baru</h5>
                
                <div class="form-group mb-3">
                    <label>Nama Produk</label>
                    <input v-model="form.name" class="form-control-soft" placeholder="Misal: Arabica Gayo">
                </div>

                <div class="form-group mb-3">
                    <label>SKU (Kode Unik)</label>
                    <input v-model="form.sku" class="form-control-soft" placeholder="Contoh: COF-001">
                </div>

                <div class="form-group mb-3">
                    <label>Divisi (Area)</label>
                    <select v-model="form.division" class="form-control-soft form-select">
                        <option value="Bar">🍷 Bar (Minuman)</option>
                        <option value="Kitchen">🍳 Dapur (Makanan/Bahan)</option>
                    </select>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label>Kategori</label>
                        <select v-model="form.category_id" class="form-control-soft form-select">
                            <option value="" disabled>Pilih...</option>
                            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                        </select>
                    </div>
                    <div class="col-6">
                        <label>Satuan</label>
                        <input v-model="form.unit" class="form-control-soft" placeholder="pcs/kg">
                    </div>
                </div>

                 <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label>Min. Stok</label>
                        <input type="number" v-model="form.min_stock_level" class="form-control-soft">
                    </div>
                    <div class="col-6">
                        <label>Max. Stok</label>
                        <input type="number" v-model="form.max_stock_level" class="form-control-soft">
                    </div>
                </div>

                <div class="form-group mb-4">
                    <label class="d-flex justify-content-between">
                        <span>Alias (Voice Command)</span>
                        <small class="text-muted" style="font-size: 0.7em;">Enter untuk nambah</small>
                    </label>
                    <div class="alias-wrapper">
                        <input 
                            v-model="aliasInput" 
                            @keyup.enter="addAlias" 
                            class="form-control-soft mb-2" 
                            placeholder="Ketik alias..."
                        >
                        <div class="d-flex flex-wrap gap-2">
                            <span v-for="(alias, index) in form.aliases" :key="index" class="badge-alias">
                                {{ alias }}
                                <button @click="removeAlias(index)" class="btn-remove">×</button>
                            </span>
                        </div>
                    </div>
                </div>

                <button class="btn-submit w-100" @click="submitProduct" :disabled="isSubmitting">
                    {{ isSubmitting ? 'Menyimpan...' : 'Simpan Produk' }}
                </button>
            </div>
        </div>

        <div class="col-lg-8">
            <div class="card-modern d-flex flex-column h-100">
                
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                    <div>
                        <h5 class="fw-bold text-dark-green m-0">Daftar Stok Bahan</h5>
                        <small class="text-muted" v-if="selectedDivision === 'ALL'">Semua Divisi</small>
                        <small class="text-muted" v-else>Divisi: <strong>{{ selectedDivision }}</strong></small>
                    </div>

                    <div class="filter-container p-1 rounded-pill d-inline-flex">
                        <button class="btn-filter rounded-pill px-3 py-1" :class="{active: selectedDivision === 'ALL'}" @click="selectedDivision = 'ALL'">Semua</button>
                        <button class="btn-filter rounded-pill px-3 py-1" :class="{active: selectedDivision === 'Bar'}" @click="selectedDivision = 'Bar'">🍷 Bar</button>
                        <button class="btn-filter rounded-pill px-3 py-1" :class="{active: selectedDivision === 'Kitchen'}" @click="selectedDivision = 'Kitchen'">🍳 Dapur</button>
                    </div>
                </div>

                <div class="row g-2 mb-3 align-items-center">
                    <div class="col-md-6 col-sm-12">
                         <div class="search-wrapper w-100">
                            <input 
                                type="text" 
                                v-model="searchQuery" 
                                class="form-control-soft" 
                                placeholder="🔍 Cari nama / SKU..."
                            >
                        </div>
                    </div>
                    <div class="col-md-6 col-sm-12 text-md-end text-sm-start">
                        <label class="small text-muted me-2">Tampilkan:</label>
                        <select v-model="itemsPerPage" class="form-select-sm border-0 bg-light rounded px-2 py-1" style="cursor: pointer;">
                            <option :value="5">5</option>
                            <option :value="10">10</option>
                            <option :value="25">25</option>
                            <option :value="50">50</option>
                        </select>
                        <span class="small text-muted ms-1">baris</span>
                    </div>
                </div>

                <div class="table-responsive flex-grow-1">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="bg-light sticky-top" style="z-index: 0;">
                            <tr>
                                <th class="ps-3 border-0 rounded-start text-uppercase small text-muted font-weight-bold" width="35%">Produk</th>
                                <th class="border-0 text-uppercase small text-muted font-weight-bold" width="20%">Kategori</th>
                                <th class="border-0 text-uppercase small text-muted font-weight-bold" width="20%">Stok</th>
                                <th class="border-0 text-center text-uppercase small text-muted font-weight-bold" width="10%">Status</th>
                                <th class="pe-3 border-0 rounded-end text-end text-uppercase small text-muted font-weight-bold" width="15%">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="filteredProducts.length === 0">
                                <td colspan="5" class="text-center py-5 text-muted">
                                    <div class="mb-2" style="font-size: 2rem;">📭</div>
                                    Tidak ada data ditemukan.
                                </td>
                            </tr>

                            <tr v-for="p in paginatedProducts" :key="p.id">
                                <td class="ps-3">
                                    <div class="d-flex align-items-center gap-3">
                                        <img :src="getProductImage(p.name)" class="rounded-3 shadow-sm" width="40" height="40" alt="img" loading="lazy">
                                        <div style="line-height: 1.2;">
                                            <div class="fw-bold text-dark text-truncate" style="max-width: 150px;" :title="p.name">{{ p.name }}</div>
                                            <small class="text-muted font-monospace" style="font-size: 0.75rem;">{{ p.sku }}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div class="d-flex flex-column gap-1">
                                        <span class="badge w-fit border fw-normal py-1 px-2" 
                                            :class="p.division === 'Bar' ? 'bg-brown text-white' : (p.division === 'Kitchen' ? 'bg-info text-white' : 'bg-secondary text-white')">
                                            {{ p.division || '-' }}
                                        </span>
                                        <small class="text-muted text-truncate" style="max-width: 120px;">
                                            {{ categories.find(c => c.id === p.category_id)?.name || 'Uncategorized' }}
                                        </small>
                                    </div>
                                </td>
                                <td>
                                    <div class="d-flex align-items-baseline">
                                        <span class="fw-bold fs-6" :class="p.current_stock <= p.min_stock_level ? 'text-danger' : 'text-dark-green'">
                                            {{ p.current_stock }}
                                        </span>
                                        <span class="text-muted mx-1 small">/</span> 
                                        <span class="text-muted small">{{ p.max_stock_level }}</span>
                                        <span class="text-muted ms-1 small">{{ p.unit }}</span>
                                    </div>
                                    <div class="progress mt-1" style="height: 4px; width: 80px;">
                                        <div class="progress-bar" role="progressbar" 
                                            :class="p.current_stock <= p.min_stock_level ? 'bg-danger' : 'bg-success'"
                                            :style="{ width: Math.min((p.current_stock / p.max_stock_level) * 100, 100) + '%' }">
                                        </div>
                                    </div>
                                </td>
                                <td class="text-center">
                                    <span v-if="p.current_stock === 0" class="badge bg-secondary text-white rounded-pill px-2">Habis</span>
                                    <span v-else-if="p.current_stock <= p.min_stock_level" class="badge bg-soft-pink text-danger rounded-pill px-2">Low</span>
                                    <span v-else class="badge bg-sage-light text-dark-green rounded-pill px-2">Aman</span>
                                </td>
                                <td class="pe-3 text-end">
                                    <div class="btn-group">
                                        <button class="btn btn-sm btn-light text-primary" @click="openEditModal(p)" title="Edit">
                                            ✏️
                                        </button>
                                        <button class="btn btn-sm btn-light text-danger" @click="deleteProduct(p.id, p.name)" title="Hapus">
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                    <small class="text-muted">
                        Menampilkan {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, filteredProducts.length) }} dari {{ filteredProducts.length }} data
                    </small>
                    
                    <nav aria-label="Page navigation">
                        <ul class="pagination pagination-sm mb-0">
                            <li class="page-item" :class="{ disabled: currentPage === 1 }">
                                <button class="page-link border-0 rounded-start" @click="changePage(currentPage - 1)">Previous</button>
                            </li>
                            
                            <li class="page-item disabled">
                                <span class="page-link border-0 bg-light text-dark fw-bold px-3">
                                    Page {{ currentPage }} / {{ totalPages || 1 }}
                                </span>
                            </li>

                            <li class="page-item" :class="{ disabled: currentPage === totalPages || totalPages === 0 }">
                                <button class="page-link border-0 rounded-end" @click="changePage(currentPage + 1)">Next</button>
                            </li>
                        </ul>
                    </nav>
                </div>

            </div>
        </div>
    </div>

    <div v-if="showModal" class="modal-backdrop">
        <div class="modal-content-custom">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h5 class="fw-bold text-dark-green m-0">Edit Produk</h5>
                <button @click="showModal = false" class="btn-close-modal">✕</button>
            </div>

            <div class="row g-3">
                <div class="col-12">
                    <label>Nama Produk</label>
                    <input v-model="editForm.name" class="form-control-soft">
                </div>
                <div class="col-6">
                    <label>SKU</label>
                    <input v-model="editForm.sku" class="form-control-soft">
                </div>
                <div class="col-6">
                    <label>Divisi</label>
                    <select v-model="editForm.division" class="form-control-soft form-select">
                        <option value="Bar">🍷 Bar</option>
                        <option value="Kitchen">🍳 Dapur</option>
                    </select>
                </div>
                <div class="col-6">
                    <label>Kategori</label>
                    <select v-model="editForm.category_id" class="form-control-soft form-select">
                        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                    </select>
                </div>
                <div class="col-6">
                    <label>Satuan</label>
                    <input v-model="editForm.unit" class="form-control-soft">
                </div>
                <div class="col-6">
                    <label>Min. Stok</label>
                    <input type="number" v-model="editForm.min_stock_level" class="form-control-soft">
                </div>
                <div class="col-6">
                    <label>Max. Stok</label>
                    <input type="number" v-model="editForm.max_stock_level" class="form-control-soft">
                </div>
                
                <div class="col-12">
                    <label>Alias (Enter to add)</label>
                    <div class="alias-wrapper">
                        <input v-model="editAliasInput" @keyup.enter="addEditAlias" class="form-control-soft mb-2" placeholder="Tambah alias...">
                        <div class="d-flex flex-wrap gap-2">
                            <span v-for="(alias, index) in editForm.aliases" :key="index" class="badge-alias">
                                {{ alias }}
                                <button @click="removeEditAlias(index)" class="btn-remove">×</button>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-4 d-flex justify-content-end gap-2">
                <button class="btn btn-light" @click="showModal = false">Batal</button>
                <button class="btn-submit" @click="updateProduct" :disabled="isSubmitting">
                    {{ isSubmitting ? 'Simpan...' : 'Simpan Perubahan' }}
                </button>
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
  --soft-pink: #ffe6e6;
  --brown: #8a7044;
}
.text-dark-green { color: #2c4a3b; }
.bg-sage-light { background-color: #e6f0eb; }
.bg-soft-pink { background-color: #ffe6e6; }
.bg-brown { background-color: #8a7044; }
.bg-info { background-color: #17a2b8 !important; }
.w-fit { width: fit-content; }

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
    padding: 10px 15px;
    border: 1px solid #eee;
    border-radius: 10px;
    background-color: #fafafa;
    transition: all 0.3s;
    font-size: 0.95rem;
}

.form-control-soft:focus {
    background-color: white;
    border-color: #b8d0c3;
    outline: none;
    box-shadow: 0 0 0 3px rgba(44, 74, 59, 0.1);
}

.form-select {
    appearance: auto;
    cursor: pointer;
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

/* --- FILTER TABS --- */
.filter-container {
    background-color: #f8f9fa;
}
.btn-filter {
    border: none;
    background: transparent;
    color: #666;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.3s ease;
    cursor: pointer;
}
.btn-filter:hover { color: #2c4a3b; }
.btn-filter.active {
    background-color: white;
    color: #2c4a3b;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

/* --- ACTION BUTTONS --- */
.btn-icon {
    border: none;
    background: #f8f9fa;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
}
.btn-icon:hover {
    background: #e2e6ea;
    transform: scale(1.1);
}
.btn-icon.text-danger:hover {
    background: #ffe6e6;
}

/* --- ALIAS CHIPS --- */
.badge-alias {
    background-color: #e6f0eb;
    color: #2c4a3b;
    padding: 5px 10px;
    border-radius: 20px;
    font-size: 0.8rem;
    display: inline-flex;
    align-items: center;
    gap: 5px;
}
.btn-remove {
    background: none;
    border: none;
    color: #2c4a3b;
    font-size: 1rem;
    padding: 0;
    line-height: 1;
    cursor: pointer;
    opacity: 0.6;
}
.btn-remove:hover {
    opacity: 1;
    color: red;
}

/* --- PAGINATION --- */
.page-link {
    color: #2c4a3b;
    cursor: pointer;
}
.page-item.disabled .page-link {
    color: #aaa;
    pointer-events: none;
    background-color: #f8f9fa;
}

/* --- MODAL STYLE --- */
.modal-backdrop {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1050;
    backdrop-filter: blur(3px);
}
.modal-content-custom {
    background: white;
    width: 90%;
    max-width: 600px;
    border-radius: 20px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    animation: slideUp 0.3s ease-out;
}
.btn-close-modal {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: #999;
}
.btn-close-modal:hover { color: #333; }

@keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}
</style>