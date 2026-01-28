<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Cek apakah halaman sekarang adalah login agar layout tidak rusak
const isLoginPage = computed(() => route.name === 'login' || route.path === '/login')

const handleLogout = () => {
  localStorage.removeItem('isAuthenticated')
  router.push('/login')
}
</script>

<template>
  <div id="app-layout" :class="{ 'login-mode': isLoginPage }">
    
    <aside v-if="!isLoginPage" class="sidebar d-none d-md-flex flex-column bg-white border-end">
      <div class="sidebar-header text-center py-4">
        <div class="brand-icon mb-2">
            <i class="fa-solid fa-leaf text-success"></i>
        </div>
        <h5 class="fw-bold m-0 text-dark-green">Degentong</h5>
        <small class="text-muted text-uppercase tracking-wide" style="font-size: 0.65rem;">Smart Inventory</small>
      </div>

      <nav class="nav flex-column px-3 gap-1 mt-2">
        <RouterLink to="/" class="nav-link" active-class="active">
          <i class="fa-solid fa-chart-pie nav-icon"></i>
          <span>Dashboard</span>
        </RouterLink>
        <RouterLink to="/report" class="nav-link" active-class="active">
          <i class="fa-solid fa-file-invoice nav-icon"></i>
          <span>Laporan</span>
        </RouterLink>
        <RouterLink to="/debts" class="nav-link" active-class="active">
          <i class="fa-solid fa-book-bookmark nav-icon"></i>
          <span>Buku Hutang</span>
        </RouterLink>

        <div class="nav-divider mt-3 mb-2">MASTER DATA</div>
        
        <RouterLink to="/products" class="nav-link" active-class="active">
          <i class="fa-solid fa-box-open nav-icon"></i>
          <span>Produk</span>
        </RouterLink>

        <div class="nav-divider mt-3 mb-2">OPERASIONAL</div>

        <RouterLink to="/transactions" class="nav-link" active-class="active">
          <i class="fa-solid fa-right-left nav-icon"></i>
          <span>Stok Movement</span>
        </RouterLink>

        <RouterLink to="/sales" class="nav-link" active-class="active">
          <i class="fa-solid fa-cash-register nav-icon"></i>
          <span>Kasir / POS</span>
        </RouterLink>
        <RouterLink to="/expenses" class="nav-link" active-class="active">
          <i class="fa-solid fa-wallet nav-icon"></i>
          <span>Pengeluaran</span>
        </RouterLink>
        
        <div class="nav-divider mt-3 mb-2">LAINNYA</div>

        <RouterLink to="/watchlist" class="nav-link" active-class="active">
          <i class="fa-solid fa-tv nav-icon"></i>
          <span>Watchlist (KDS)</span>
        </RouterLink>
        <RouterLink to="/settings" class="nav-link" active-class="active">
          <i class="fa-solid fa-gear nav-icon"></i>
          <span>Pengaturan</span>
        </RouterLink>
      </nav>

      <div class="mt-auto p-3 border-top">
        <div class="d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-2">
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
        <span class="navbar-brand fw-bold text-dark-green fs-5">
            <i class="fa-solid fa-leaf text-success me-2"></i>Degentong
        </span>
      </nav>

      <div :class="isLoginPage ? '' : 'container-fluid p-3 p-md-4 pb-5 mb-5 mb-md-0'">
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
            <span class="bnav-center-label">Kasir</span>
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
/* CSS Global & Reset */
:root { --dark-green: #2c4a3b; }
body { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
#app-layout { display: flex; min-height: 100vh; }
.login-mode { display: block !important; } /* Pastikan mode login tidak flex sidebar */
</style>

<style scoped>
.text-dark-green { color: #2c4a3b; }
.bg-dark-green { background-color: #2c4a3b; }

/* SIDEBAR */
.sidebar {
    width: 250px;
    height: 100vh;
    position: sticky;
    top: 0;
    overflow-y: auto;
}

.nav-link {
    display: flex;
    align-items: center;
    color: #6c757d;
    padding: 10px 15px;
    border-radius: 10px;
    text-decoration: none;
    font-size: 0.9rem;
    margin-bottom: 2px;
}

.nav-link.active {
    background-color: #e6f0eb;
    color: #2c4a3b;
    font-weight: 700;
}

.nav-icon { width: 24px; margin-right: 10px; text-align: center; }
.nav-divider { font-size: 0.65rem; font-weight: 800; color: #adb5bd; padding-left: 15px; margin-top: 15px; }

/* MAIN CONTENT */
.main-content { overflow-x: hidden; }

/* MOBILE NAV */
.bottom-nav {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    height: 65px;
    background: white;
    display: flex;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
    z-index: 1030;
}

.bnav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #adb5bd;
    text-decoration: none;
    font-size: 0.6rem;
}

.bnav-item.active { color: #2c4a3b; }

.bnav-center-wrapper { position: relative; width: 20%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 8px;}
.bnav-center-btn { position: absolute; top: -25px; width: 50px; height: 50px; background: #2c4a3b; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 4px solid white; }
.bnav-center-label { font-size: 0.65rem; font-weight: 700; color: #6c757d; margin-top: 22px; }

.avatar { width: 32px; height: 32px; }

@media print { .no-print, .sidebar, .bottom-nav { display: none !important; } }
</style>