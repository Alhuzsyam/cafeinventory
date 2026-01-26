FROM node:20-slim

WORKDIR /app

# Install dependencies lebih dulu (biar build lebih cepat kalau kodingan berubah)
COPY package*.json ./
RUN npm install

# Salin semua file project
COPY . .

# Expose port Vite (default 5173)
EXPOSE 5173

# Jalankan dengan flag --host agar bisa diakses dari luar container
CMD ["npm", "run", "dev", "--", "--host"]