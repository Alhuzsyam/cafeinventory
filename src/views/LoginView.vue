<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const errorMessage = ref('')

const handleLogin = () => {
  // Hardcoded Credentials
  const validUser = "banjarwangi"
  const validPass = "anonim321"

  if (username.value === validUser && password.value === validPass) {
    // Simpan status login sederhana di localStorage
    localStorage.setItem('isAuthenticated', 'true')
    router.push('/')
  } else {
    errorMessage.value = "Username atau Password salah, Bos!"
  }
}
</script>

<template>
  <div class="login-container d-flex align-items-center justify-content-center">
    <div class="login-card shadow-lg p-5 bg-white text-center">
      <div class="brand-icon mb-3">
        <i class="fa-solid fa-leaf text-success fa-3x"></i>
      </div>
      <h3 class="fw-bold brand-text mb-1">Degentong</h3>
      <p class="text-muted small mb-4">Smart Inventory & POS System</p>

      <div v-if="errorMessage" class="alert alert-danger py-2 small border-0">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleLogin">
        <div class="mb-3 text-start">
          <label class="form-label small fw-bold text-muted">Username</label>
          <input v-model="username" type="text" class="form-control custom-input" placeholder="Masukkan username" required>
        </div>
        <div class="mb-4 text-start">
          <label class="form-label small fw-bold text-muted">Password</label>
          <input v-model="password" type="password" class="form-control custom-input" placeholder="••••••••" required>
        </div>
        <button type="submit" class="btn btn-login w-100 py-2 fw-bold">
          MASUK SISTEM
        </button>
      </form>
      
      <p class="mt-4 x-small text-muted">© 2026 Degentong POS by Alfi</p>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  background-color: #f8f9fa;
  background-image: radial-gradient(#2c4a3b 0.5px, transparent 0.5px);
  background-size: 20px 20px;
}
.login-card {
  width: 100%;
  max-width: 400px;
  border-radius: 30px;
}
.brand-text { color: #2c4a3b; }
.custom-input {
  border-radius: 12px;
  border: 1px solid #eee;
  padding: 12px;
  font-size: 0.9rem;
}
.custom-input:focus {
  border-color: #2c4a3b;
  box-shadow: 0 0 0 0.25rem rgba(44, 74, 59, 0.1);
}
.btn-login {
  background-color: #2c4a3b;
  color: white;
  border-radius: 12px;
  transition: 0.3s;
}
.btn-login:hover {
  background-color: #1a2e25;
  transform: translateY(-2px);
}
.x-small { font-size: 0.7rem; }
</style>