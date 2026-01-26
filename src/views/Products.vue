<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

// --- STATE UTAMA ---
const products = ref([])
const categories = ref([])
// const API_URL = "http://127.0.0.1:8000"
const API_URL = "https://api.inventorycafe.space"
const isSubmitting = ref(false)

// State Filter Tampilan
const selectedDivision = ref('ALL')

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

// --- COMPUTED: LOGIKA FILTER ---
const filteredProducts = computed(() => {
    if (selectedDivision.value === 'ALL') {
        return products.value
    }
    return products.value.filter(p => p.division === selectedDivision.value)
})

// --- METHODS ---

const fetchData = async () => {
    try {
        const pRes = await axios.get(`${API_URL}/products/`)
        products.value = pRes.data
        const cRes = await axios.get(`${API_URL}/categories/`)
        categories.value = cRes.data
    } catch (e) {
        console.error("Gagal load data:", e)
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
    // Deep clone data produk agar perubahan di modal tidak merusak tabel sebelum save
    editForm.value = JSON.parse(JSON.stringify(product))
    // Pastikan aliases adalah array (jaga-jaga jika null dari backend)
    if (!editForm.value.aliases) editForm.value.aliases = []
    
    showModal.value = true
}

// 3. UPDATE (Simpan Perubahan)
const updateProduct = async () => {
    if (!editForm.value.name) return alert("Nama produk wajib diisi")

    isSubmitting.value = true
    try {
        await axios.put(`${API_URL}/products/${editForm.value.id}`, editForm.value)
        await fetchData() // Refresh data tabel
        showModal.value = false // Tutup modal
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
            // Update UI langsung (filter lokal) agar terasa cepat
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
            <div class="card-modern">
                
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                    <div>
                        <h5 class="fw-bold text-dark-green m-0">Daftar Stok Bahan</h5>
                        <small class="text-muted" v-if="selectedDivision === 'ALL'">Menampilkan semua item</small>
                        <small class="text-muted" v-else>Menampilkan item divisi <strong>{{ selectedDivision }}</strong></small>
                    </div>

                    <div class="filter-container p-1 rounded-pill d-inline-flex">
                        <button class="btn-filter rounded-pill px-3 py-1" :class="{active: selectedDivision === 'ALL'}" @click="selectedDivision = 'ALL'">Semua</button>
                        <button class="btn-filter rounded-pill px-3 py-1" :class="{active: selectedDivision === 'Bar'}" @click="selectedDivision = 'Bar'">🍷 Bar</button>
                        <button class="btn-filter rounded-pill px-3 py-1" :class="{active: selectedDivision === 'Kitchen'}" @click="selectedDivision = 'Kitchen'">🍳 Dapur</button>
                    </div>
                </div>

                <div class="mb-3 text-end">
                    <span class="badge bg-sage-light text-dark-green rounded-pill px-3">
                        Total: {{ filteredProducts.length }} Item
                    </span>
                </div>

                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="bg-light">
                            <tr>
                                <th class="ps-3 border-0 rounded-start">Info Produk</th>
                                <th class="border-0">Divisi & Kategori</th>
                                <th class="border-0">Stok (Aktual/Max)</th>
                                <th class="border-0 text-center">Status</th>
                                <th class="pe-3 border-0 rounded-end text-end">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="filteredProducts.length === 0">
                                <td colspan="5" class="text-center py-5 text-muted">
                                    Tidak ada data di divisi <strong>{{ selectedDivision === 'ALL' ? 'manapun' : selectedDivision }}</strong>.
                                </td>
                            </tr>

                            <tr v-for="p in filteredProducts" :key="p.id">
                                <td class="ps-3">
                                    <div class="d-flex align-items-center gap-3">
                                        <img :src="getProductImage(p.name)" class="rounded-3" width="40" height="40" alt="img">
                                        <div style="line-height: 1.2;">
                                            <div class="fw-bold text-dark">{{ p.name }}</div>
                                            <small class="text-muted font-monospace" style="font-size: 0.75rem;">{{ p.sku }}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div class="d-flex flex-column gap-1">
                                        <span class="badge w-fit border fw-normal" 
                                            :class="p.division === 'Bar' ? 'bg-brown text-white' : (p.division === 'Kitchen' ? 'bg-info text-white' : 'bg-secondary text-white')">
                                            {{ p.division || '-' }}
                                        </span>
                                        <small class="text-muted">
                                            {{ categories.find(c => c.id === p.category_id)?.name || 'Uncategorized' }}
                                        </small>
                                    </div>
                                </td>
                                <td>
                                    <div class="fw-bold text-dark-green">
                                        {{ p.current_stock }} <span class="text-muted fw-normal mx-1">/</span> <span class="text-muted fw-normal small">{{ p.max_stock_level }}</span>
                                    </div>
                                    <small class="text-muted">{{ p.unit }}</small>
                                </td>
                                <td class="text-center">
                                    <span v-if="p.current_stock === 0" class="badge bg-secondary text-white rounded-pill">Habis</span>
                                    <span v-else-if="p.current_stock <= p.min_stock_level" class="badge bg-soft-pink text-danger rounded-pill">Low</span>
                                    <span v-else class="badge bg-sage-light text-dark-green rounded-pill">Aman</span>
                                </td>
                                <td class="pe-3 text-end">
                                    <button class="btn-icon me-2" @click="openEditModal(p)" title="Edit">✏️</button>
                                    <button class="btn-icon text-danger" @click="deleteProduct(p.id, p.name)" title="Hapus">🗑️</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
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

/* --- TABLE --- */
.table thead th {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
    padding: 12px;
}
.table td {
    padding: 12px;
    vertical-align: middle;
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