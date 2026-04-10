const express = require('express');
const ensureDirectories = require('./config/directories');
const corsMiddleware = require('./middleware/cors');
const upload = require('./middleware/upload');
const compressHandler = require('./routes/compress');
const wrapHandler = require('./routes/wrap');

// Убедимся, что папки существуют
ensureDirectories();

const app = express();

app.use(corsMiddleware);

app.post('/compress', upload.single('image'), compressHandler);
app.post('/wrap-avif', upload.single('raw_av1'), wrapHandler);

module.exports = app;