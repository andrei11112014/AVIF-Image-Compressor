# Используем slim-версию для легкой установки системных утилит
FROM node:18-slim

# 1. Устанавливаем FFmpeg (критично для твоего spawn в бэкенде)
RUN apt-get update && \
    apt-get install -y ffmpeg libvips-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Копируем файлы зависимостей
COPY package*.json ./
COPY compressor/package*.json ./compressor/
COPY server/package*.json ./server/

# 3. Устанавливаем зависимости
RUN npm install
RUN cd compressor && npm install
RUN cd server && npm install

# 4. Копируем весь исходный код
COPY . .

# 5. Открываем оба порта
EXPOSE 3000
EXPOSE 3001

# 6. Запускаем всё через твой скрипт (убедись, что он запускает и фронт, и бэк)
CMD ["npm", "run", "dev"]
