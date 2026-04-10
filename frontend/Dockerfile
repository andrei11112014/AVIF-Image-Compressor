FROM node:20-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app

RUN npm install -g http-server

COPY --from=build /app/build ./build

EXPOSE 3000

# Запускаем на 0.0.0.0 для доступа извне, отключаем кэширование для тестов
# Добавляем --gzip и --proxy (чтобы правильно обрабатывать маршруты React)
CMD ["http-server", "build", "-p", "3000", "-a", "0.0.0.0", "-c-1", "--cors", "--gzip"]

