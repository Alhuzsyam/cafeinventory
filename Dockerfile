FROM node:20-alpine

RUN echo "Setting up Jakarta Timezone"
# Tambahkan zona waktu
RUN apk add --no-cache tzdata
ENV TZ=Asia/Jakarta

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]