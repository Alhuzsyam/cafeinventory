import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,  // Agar bisa diakses dari luar container
    port: 5173,
    
    // --- TAMBAHKAN BAGIAN INI ---
    allowedHosts: [
      'gentongai.inventorycafe.space', 
      'inventorycafe.space',
      'all' // Opsi malas: izinkan semua (opsional)
    ],
    // ----------------------------
  }
})