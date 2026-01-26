<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="d-flex" id="wrapper">
    
    <div class="sidebar-wrapper bg-white border-end d-none d-md-flex flex-column" style="width: 280px; min-height: 100vh;">
      
      <div class="sidebar-heading text-center py-5">
        <div class="brand-icon mb-2">☕</div>
        <h4 class="fw-bold text-dark-green m-0 tracking-tight">Degentong</h4>
        <small class="text-muted" style="font-size: 0.75rem; letter-spacing: 1px;">SMART INVENTORY</small>
      </div>

      <div class="list-group list-group-flush px-3 gap-2 mt-2">
        
        <RouterLink to="/" class="nav-item" active-class="active-link">
          <span class="icon">📊</span>
          <span>Dashboard</span>
        </RouterLink>

        <div class="menu-label mt-3 mb-2 px-3 text-uppercase text-muted fw-bold">Master Data</div>
        
        <RouterLink to="/products" class="nav-item" active-class="active-link">
          <span class="icon">📦</span>
          <span>Produk</span>
        </RouterLink>

        <div class="menu-label mt-3 mb-2 px-3 text-uppercase text-muted fw-bold">Operasional</div>

        <RouterLink to="/transactions" class="nav-item" active-class="active-link">
          <span class="icon">🔄</span>
          <span>Stok Movement</span>
        </RouterLink>

        <div class="menu-label mt-3 mb-2 px-3 text-uppercase text-muted fw-bold">Lainnya</div>

        <RouterLink to="/settings" class="nav-item" active-class="active-link">
          <span class="icon">⚙️</span>
          <span>Pengaturan</span>
        </RouterLink>

      </div>

      <div class="mt-auto p-4 border-top">
        <div class="d-flex align-items-center gap-3">
          <div class="avatar-circle">AD</div>
          <div style="line-height: 1.2;">
            <div class="fw-bold text-dark-green" style="font-size: 0.9rem;">Admin User</div>
            <small class="text-muted" style="font-size: 0.75rem;">Manager</small>
          </div>
        </div>
      </div>
    </div>

    <div id="page-content-wrapper" class="w-100 bg-soft-gray">
      
      <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm d-md-none px-3">
        <div class="container-fluid p-0">
          <span class="navbar-brand fw-bold text-dark-green">☕ Degentong</span>
          <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#mobileNav">
            <span class="navbar-toggler-icon"></span>
          </button>
          
          <div class="collapse navbar-collapse mt-3" id="mobileNav">
            <ul class="navbar-nav ms-auto gap-2">
              <li class="nav-item-mobile"><RouterLink to="/" class="nav-link" active-class="active-mobile">📊 Dashboard</RouterLink></li>
              <li class="nav-item-mobile"><RouterLink to="/products" class="nav-link" active-class="active-mobile">📦 Produk</RouterLink></li>
              <li class="nav-item-mobile"><RouterLink to="/transactions" class="nav-link" active-class="active-mobile">🔄 Stok Movement</RouterLink></li>
              <li class="nav-item-mobile"><RouterLink to="/settings" class="nav-link" active-class="active-mobile">⚙️ Pengaturan</RouterLink></li>
            </ul>
          </div>
        </div>
      </nav>

      <div class="container-fluid p-4" style="max-width: 1400px;">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- VARIABLE WARNA (Sama dengan Dashboard) --- */
:root {
  --dark-green: #2c4a3b;
  --sage-light: #e6f0eb;
  --text-gray: #6c757d;
}

.text-dark-green { color: #2c4a3b; }
.bg-soft-gray { background-color: #fcfdfc; } /* Background konten utama sangat muda */

/* --- SIDEBAR STYLE --- */
.sidebar-wrapper {
  box-shadow: 4px 0 10px rgba(0,0,0,0.01); /* Bayangan sangat halus di kanan */
  z-index: 100;
}

.brand-icon {
  font-size: 2.5rem;
  line-height: 1;
}

.menu-label {
  font-size: 0.7rem;
  letter-spacing: 0.5px;
}

/* --- NAV ITEM (DESKTOP) --- */
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: #6c757d;
  text-decoration: none;
  border-radius: 12px; /* Membuat tombol membulat */
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 0.95rem;
  border: 1px solid transparent;
}

.nav-item:hover {
  background-color: #f8f9fa;
  color: #2c4a3b;
}

.nav-item .icon {
  font-size: 1.1rem;
}

/* State Aktif (Hijau Sage) */
.active-link {
  background-color: #e6f0eb; /* Sage Light */
  color: #2c4a3b !important; /* Dark Green */
  font-weight: 700;
  border: 1px solid #dae8e0;
}

/* --- PROFILE AVATAR --- */
.avatar-circle {
  width: 40px;
  height: 40px;
  background-color: #2c4a3b;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: bold;
}

/* --- MOBILE STYLE --- */
.nav-item-mobile .nav-link {
  padding: 10px 15px;
  border-radius: 8px;
}
.active-mobile {
  background-color: #e6f0eb;
  color: #2c4a3b !important;
  font-weight: bold;
}
</style>