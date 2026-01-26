import { createApp } from 'vue'
// import './style.css' <-- HAPUS CSS LAMA BIAR GAK BENTROK
import 'bootstrap/dist/css/bootstrap.min.css' // Import CSS Bootstrap
import 'bootstrap' // Import JS Bootstrap

import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')