<script setup>
import { ref, computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const isCollapsed = ref(false)

const isLoginPage = computed(() => route.name === 'login' || route.path === '/login')

const handleLogout = () => {
  localStorage.removeItem('isAuthenticated')
  router.push('/login')
}

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <div id="app-layout" :class="{ 'login-mode': isLoginPage, 'sidebar-collapsed': isCollapsed }">
    
    <aside v-if="!isLoginPage" class="sidebar d-none d-md-flex flex-column bg-white border-end">
      <div class="sidebar-header d-flex align-items-center px-3 py-4" :class="isCollapsed ? 'justify-content-center' : 'justify-content-between'">
        <div class="brand-wrapper d-flex align-items-center gap-2" v-if="!isCollapsed">
            <i class="fa-solid fa-leaf text-success fs-4"></i>
            <div class="brand-text">
                <h5 class="fw-bold m-0 text-dark-green">Degentong</h5>
                <small class="text-muted text-uppercase" style="font-size: 0.6rem;">Smart Inventory</small>
            </div>
        </div>
        <i v-else class="fa-solid fa-leaf text-success fs-3"></i>
        
        <button @click="toggleSidebar" class="btn btn-sm btn-collapse d-none d-md-block shadow-sm">
            <i class="fa-solid" :class="isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'"></i>
        </button>
      </div>

      <nav class="nav flex-column px-2 gap-1 mt-2">
        <RouterLink to="/" class="nav-link" active-class="active" title="Dashboard">
          <i class="fa-solid fa-chart-pie nav-icon"></i>
          <span v-if="!isCollapsed">Dashboard</span>
        </RouterLink>
        <RouterLink to="/report" class="nav-link" active-class="active" title="Laporan">
          <i class="fa-solid fa-file-invoice nav-icon"></i>
          <span v-if="!isCollapsed">Laporan</span>
        </RouterLink>
        <RouterLink to="/debts" class="nav-link" active-class="active" title="Buku Hutang">
          <i class="fa-solid fa-book-bookmark nav-icon"></i>
          <span v-if="!isCollapsed">Buku Hutang</span>
        </RouterLink>

        <div class="nav-divider mt-3 mb-2 px-3 text-muted" v-if="!isCollapsed">MASTER DATA</div>
        <hr v-else class="my-3 mx-2">
        
        <RouterLink to="/products" class="nav-link" active-class="active" title="Produk">
          <i class="fa-solid fa-box-open nav-icon"></i>
          <span v-if="!isCollapsed">Produk</span>
        </RouterLink>

        <div class="nav-divider mt-3 mb-2 px-3 text-muted" v-if="!isCollapsed">OPERASIONAL</div>
        <hr v-else class="my-3 mx-2">

        <RouterLink to="/transactions" class="nav-link" active-class="active" title="Stok Movement">
          <i class="fa-solid fa-right-left nav-icon"></i>
          <span v-if="!isCollapsed">Stok Movement</span>
        </RouterLink>
        <RouterLink to="/sales" class="nav-link" active-class="active" title="Kasir / POS">
          <i class="fa-solid fa-cash-register nav-icon"></i>
          <span v-if="!isCollapsed">Kasir / POS</span>
        </RouterLink>
        <RouterLink to="/expenses" class="nav-link" active-class="active" title="Pengeluaran">
          <i class="fa-solid fa-wallet nav-icon"></i>
          <span v-if="!isCollapsed">Pengeluaran</span>
        </RouterLink>
        
        <div class="nav-divider mt-3 mb-2 px-3 text-muted" v-if="!isCollapsed">LAINNYA</div>
        <hr v-else class="my-3 mx-2">

        <RouterLink to="/watchlist" class="nav-link" active-class="active" title="Watchlist">
          <i class="fa-solid fa-tv nav-icon"></i>
          <span v-if="!isCollapsed">Watchlist (KDS)</span>
        </RouterLink>
        <RouterLink to="/printer" class="nav-link" active-class="active" title="Printer">
          <i class="fa-solid fa-print nav-icon"></i>
          <span v-if="!isCollapsed">Set Printer</span>
        </RouterLink>
        <RouterLink to="/settings" class="nav-link" active-class="active" title="Pengaturan">
          <i class="fa-solid fa-gear nav-icon"></i>
          <span v-if="!isCollapsed">Pengaturan</span>
        </RouterLink>
      </nav>

      <div class="mt-auto p-3 border-top">
        <div class="d-flex align-items-center gap-2" :class="isCollapsed ? 'justify-content-center' : 'justify-content-between'">
          <div class="d-flex align-items-center gap-2" v-if="!isCollapsed">
            <div class="avatar bg-dark-green text-white rounded-circle d-flex align-items-center justify-content-center fw-bold small">BW</div>
            <div style="line-height: 1.1;">
              <div class="fw-bold text-dark-green" style="font-size: 0.75rem;">Banjarwangi</div>
              <small class="text-muted" style="font-size: 0.65rem;">Owner</small>
            </div>
          </div>
          <button @click="handleLogout" class="btn btn-sm btn-link text-danger p-0" title="Logout">
            <i class="fa-solid fa-power-off"></i>
          </button>
        </div>
      </div>
    </aside>

    <main class="main-content flex-grow-1" :class="{ 'bg-light': !isLoginPage }">
      
      <nav v-if="!isLoginPage" class="navbar navbar-light bg-white border-bottom d-md-none px-3 sticky-top shadow-sm">
        <span class="navbar-brand fw-bold text-dark-green fs-5 m-0">
            <i class="fa-solid fa-leaf text-success me-2"></i>Degentong
        </span>
      </nav>

      <div :class="isLoginPage ? '' : 'content-wrapper container-fluid p-3 p-md-4 pb-5 mb-5 mb-md-0'">
        <RouterView />
      </div>

      <div v-if="!isLoginPage" class="bottom-nav d-md-none no-print">
        <RouterLink to="/" class="bnav-item" active-class="active">
          <i class="fa-solid fa-chart-pie"></i>
          <span>Home</span>
        </RouterLink>
        <RouterLink to="/products" class="bnav-item" active-class="active">
          <i class="fa-solid fa-box"></i>
          <span>Stok</span>
        </RouterLink>
        
        <div class="bnav-center-wrapper">
            <RouterLink to="/sales" class="bnav-center-btn shadow" active-class="active">
                <i class="fa-solid fa-cash-register"></i>
            </RouterLink>
        </div>

        <RouterLink to="/transactions" class="bnav-item" active-class="active">
          <i class="fa-solid fa-right-left"></i>
          <span>Arus</span>
        </RouterLink>
        <RouterLink to="/settings" class="bnav-item" active-class="active">
          <i class="fa-solid fa-gear"></i>
          <span>Set</span>
        </RouterLink>
      </div>

    </main>
  </div>
</template>

<style>
:root { 
  --dark-green: #2c4a3b; 
  --sidebar-width: 260px; 
  --sidebar-collapsed: 80px; 
}

body, html { 
  margin: 0; 
  padding: 0;
  height: 100%;
  font-family: 'Plus Jakarta Sans', sans-serif; 
  background: #f8f9fa; 
}

/* Flex context utama */
#app-layout { 
    display: flex; 
    height: 100vh;
    width: 100vw;
    overflow: hidden; /* Dikunci hanya untuk desktop */
    transition: all 0.3s; 
}

.login-mode { display: block !important; overflow-y: auto !important; }

/* FIX: Unlocked scroll untuk Mobile */
@media (max-width: 768px) {
    body, html {
        overflow-y: auto !important; /* Paksa body bisa scroll */
        height: auto !important;
    }
    #app-layout {
        display: block !important; /* Matikan flex agar konten memanjang ke bawah */
        height: auto !important;
        overflow-y: visible !important;
    }
}
</style>

<style scoped>
.text-dark-green { color: var(--dark-green); }
.bg-dark-green { background-color: var(--dark-green); }

/* --- SIDEBAR --- */
.sidebar {
    flex: 0 0 var(--sidebar-width);
    width: var(--sidebar-width);
    height: 100vh;
    background-color: white;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    border-right: 1px solid #edf2f7;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1040;
}

.sidebar-collapsed .sidebar {
    flex: 0 0 var(--sidebar-collapsed);
    width: var(--sidebar-collapsed);
}

/* --- MAIN CONTENT --- */
.main-content {
    flex: 1;
    height: 100vh;
    min-width: 0;
    overflow-y: auto; 
    display: flex;
    flex-direction: column;
}

.content-wrapper {
    width: 100%;
    /* Ruang ekstra agar tidak tertutup bottom nav */
    padding-bottom: 100px !important; 
}

/* Navigasi */
.nav-link {
    display: flex;
    align-items: center;
    color: #6c757d;
    padding: 12px 15px;
    border-radius: 12px;
    text-decoration: none;
    font-size: 0.9rem;
    white-space: nowrap;
    transition: all 0.2s;
}

.nav-link.active {
    background-color: #e6f0eb;
    color: var(--dark-green);
    font-weight: 700;
}

.nav-icon { min-width: 24px; font-size: 1.1rem; text-align: center; }
.nav-divider { font-size: 0.65rem; font-weight: 800; color: #adb5bd; margin-top: 15px; }

/* BOTTOM NAV */
.bottom-nav {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    height: 65px;
    background: white;
    display: flex;
    box-shadow: 0 -5px 15px rgba(0,0,0,0.05);
    z-index: 1030;
    border-top: 1px solid #f0f0f0;
}

.bnav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #adb5bd;
    text-decoration: none;
    font-size: 0.65rem;
}

.bnav-item.active { color: var(--dark-green); font-weight: 700; }

.bnav-center-wrapper { position: relative; width: 20%; display: flex; justify-content: center; }
.bnav-center-btn { 
    position: absolute; 
    top: -20px; 
    width: 55px; height: 55px; 
    background: var(--dark-green); 
    border-radius: 18px; 
    display: flex; align-items: center; justify-content: center; 
    color: white; 
    border: 5px solid white;
}

.avatar { width: 32px; height: 32px; }

@media (max-width: 768px) {
    .sidebar { display: none !important; }
    .main-content { 
        height: auto !important; 
        overflow-y: visible !important; 
    }
}

/* Custom Scrollbar */
.main-content::-webkit-scrollbar { width: 6px; }
.main-content::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
</style>