import { createRouter, createWebHistory } from 'vue-router'

// Import halaman-halaman (Views)
import Dashboard from '../views/Dashboard.vue'
import Products from '../views/Products.vue'
import Transactions from '../views/Transactions.vue'
import Settings from '../views/Settings.vue'
import WatchlistView from '../views/WatchlistView.vue'
import SalesView from '../views/SalesView.vue'
import ReportView from '../views/ReportView.vue'
import ExpenseView from '../views/ExpenseView.vue'
import DebtView from '../views/DebtView.vue'
import LoginView from '../views/LoginView.vue'
import PrinterView from '../views/PrinterView.vue' 

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/products',
      name: 'products',
      component: Products,
      meta: { requiresAuth: true }
    },
    {
      path: '/transactions',
      name: 'transactions',
      component: Transactions,
      meta: { requiresAuth: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: Settings,
      meta: { requiresAuth: true }
    },
    {
      path: '/sales',
      name: 'sales',
      component: SalesView,
      meta: { requiresAuth: true }
    },
    {
      path: '/watchlist',
      name: 'watchlist',
      component: WatchlistView,
      meta: { requiresAuth: true }
    },
    {
      path: '/report',
      name: 'report',
      component: ReportView,
      meta: { requiresAuth: true }
    },
    {
      path: '/expenses',
      name: 'expenses',
      component: ExpenseView,
      meta: { requiresAuth: true }
    },
    { 
      path: '/debts', 
      name: 'debts',
      component: DebtView, // Sudah diperbaiki dari dynamic import ganda
      meta: { requiresAuth: true }
    },
    {
    path: '/printer',
    name: 'printer',
    component: PrinterView,
    meta: { requiresAuth: true }
    },
  ]
})

// --- NAVIGATION GUARD (SATPAM RUTE) ---
router.beforeEach((to, from, next) => {
  // Cek apakah user sudah login (disimpan di localStorage)
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'

  if (to.meta.requiresAuth && !isAuthenticated) {
    // Jika butuh login tapi belum login, lempar ke halaman Login
    next('/login')
  } else if (to.name === 'login' && isAuthenticated) {
    // Jika sudah login tapi mau buka halaman login lagi, lempar ke Dashboard
    next('/')
  } else {
    // Izinkan lewat
    next()
  }
})

export default router