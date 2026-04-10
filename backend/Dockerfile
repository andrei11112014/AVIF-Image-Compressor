FROM node:20

# Устанавливаем системные зависимости для работы с графикой (libavif/ffmpeg)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
