import { createRouter, createWebHistory } from 'vue-router'

// Import halaman-halaman (Views)
import Dashboard from '../views/Dashboard.vue'
import Products from '../views/Products.vue'
import Transactions from '../views/Transactions.vue'
import Settings from '../views/Settings.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard
    },
    {
      path: '/products',
      name: 'products',
      component: Products
    },
    {
      path: '/transactions',
      name: 'transactions',
      component: Transactions
    },
    {
      path: '/settings',
      name: 'settings',
      component: Settings
    }
  ]
})

export default router