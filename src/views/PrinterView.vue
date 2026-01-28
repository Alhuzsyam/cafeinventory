<script setup>
import { ref, onMounted } from 'vue'

const printerStatus = ref('Disconnected')
const pairedDevice = ref(null)
const isConnecting = ref(false)

// Fungsi Mencari Printer
const connectPrinter = async () => {
  isConnecting.value = true
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
    });

    const server = await device.gatt.connect();
    pairedDevice.value = device
    printerStatus.value = 'Connected to ' + device.name
    
    // Simpan status sederhana ke local storage
    localStorage.setItem('lastPrinterName', device.name)
    
    alert("Printer Terhubung, Bos!")
  } catch (error) {
    console.error(error)
    printerStatus.value = 'Failed to Connect'
  } finally {
    isConnecting.value = false
  }
}

// Fungsi Test Print (Kirim Perintah ESC/POS Sederhana)
const testPrint = async () => {
  if (!pairedDevice.value) return alert("Hubungkan printer dulu!")

  try {
    const server = await pairedDevice.value.gatt.connect();
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

    const encoder = new TextEncoder();
    const content = "\x1B\x40" + "\x1B\x61\x01" + "TEST PRINT BERHASIL\n" + "Degentong POS System\n" + "\x0A\x0A\x0A";
    
    await characteristic.writeValue(encoder.encode(content));
    alert("Perintah Test Terkirim!")
  } catch (error) {
    alert("Gagal cetak test: " + error.message)
  }
}
</script>

<template>
  <div class="page-content p-4">
    <div class="header mb-4">
      <h4 class="fw-bold brand-text m-0">Pengaturan Printer</h4>
      <p class="text-muted small">Kelola koneksi printer thermal Bluetooth Anda.</p>
    </div>

    <div class="row g-4">
      <div class="col-md-6">
        <div class="card-modern p-4 bg-white border shadow-sm rounded-4">
          <div class="d-flex align-items-center gap-3 mb-4">
            <div class="icon-circle" :class="pairedDevice ? 'bg-success' : 'bg-secondary'">
              <i class="fa-solid fa-print text-white"></i>
            </div>
            <div>
              <h6 class="fw-bold m-0">{{ pairedDevice ? 'Printer Aktif' : 'Belum Ada Printer' }}</h6>
              <small :class="pairedDevice ? 'text-success' : 'text-muted'">{{ printerStatus }}</small>
            </div>
          </div>

          <div class="d-grid gap-2">
            <button @click="connectPrinter" class="btn btn-dark-green py-3 fw-bold rounded-3" :disabled="isConnecting">
              <i class="fa-brands fa-bluetooth me-2"></i>
              {{ isConnecting ? 'Mencari...' : 'CARI PRINTER' }}
            </button>
            
            <button v-if="pairedDevice" @click="testPrint" class="btn btn-outline-dark-green py-3 fw-bold rounded-3">
              <i class="fa-solid fa-vial me-2"></i> TEST PRINT
            </button>
          </div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="card-modern p-4 bg-light border-0 rounded-4">
          <h6 class="fw-bold brand-text mb-3">Panduan Koneksi</h6>
          <ul class="small text-muted ps-3">
            <li class="mb-2">Pastikan Bluetooth pada perangkat (HP/Laptop) sudah aktif.</li>
            <li class="mb-2">Nyalakan Printer Thermal Bluetooth Anda.</li>
            <li class="mb-2">Klik tombol <b>Cari Printer</b> dan pilih nama printer Anda (misal: RPP02N atau MTP-2).</li>
            <li class="mb-2">Gunakan fitur <b>Test Print</b> untuk memastikan koneksi stabil.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.brand-text { color: #2c4a3b; }
.btn-dark-green { background-color: #2c4a3b; color: white; transition: 0.3s; }
.btn-dark-green:hover { background-color: #1a2e25; transform: translateY(-2px); }
.btn-outline-dark-green { border: 2px solid #2c4a3b; color: #2c4a3b; }
.btn-outline-dark-green:hover { background-color: #2c4a3b; color: white; }
.icon-circle { width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.card-modern { border-radius: 24px; }
</style>