const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const sharp = require('sharp');

const app = express();

app.use(cors({ exposedHeaders: ['X-Compression-Time'] }));

const UPLOADS = path.join(__dirname, 'uploads');
const OUTPUTS = path.join(__dirname, 'compressed');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);
if (!fs.existsSync(OUTPUTS)) fs.mkdirSync(OUTPUTS);

const upload = multer({ dest: 'uploads/' });

const runFFmpeg = (args, outPath) => {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const ffmpeg = spawn('ffmpeg', [...args, '-y', outPath]);

        ffmpeg.on('close', (code) => {
            if (code === 0) resolve(Date.now() - start);
            else reject(new Error(`FFmpeg exit code ${code}`));
        });
    });
};

app.post('/compress', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file');
    const outPath = path.join(OUTPUTS, `${req.file.filename}.avif`);

    //получение настроек от клиента
    const quality = parseInt(req.body.quality) || 35;
    const effort = parseInt(req.body.effort) || 4;
    const scale = parseInt(req.body.scale) || 100;

    try {
        let duration;
        //конвертация effort в значение sharp
        //effort 1-10 -> sharp effort 0-9
        const sharpEffort = Math.min(9, Math.max(0, effort - 1));
        //расчет qp для ffmpeg на основе качества
        //quality 1-100 -> qp 63-0 (меньше QP = лучше качество)
        const qp = Math.floor(63 - (quality / 100) * 63);
        const gpuArgs = ['-i', req.file.path, '-c:v', 'av1_amf', '-rc', '0', '-qp_i', qp.toString(), '-qp_p', qp.toString()];

        try {
            duration = await runFFmpeg(gpuArgs, outPath);
        } catch (e) {
            const start = Date.now();
            let sharpChain = sharp(req.file.path);
            if (scale < 100) {
                const metadata = await sharp(req.file.path).metadata();
                sharpChain = sharpChain.resize({
                    width: Math.floor(metadata.width * (scale / 100)),
                    height: Math.floor(metadata.height * (scale / 100))
                });
            }
            await sharpChain
                .avif({ quality: quality, effort: sharpEffort, chromaSubsampling: '4:2:0' })
                .toFile(outPath);
            duration = Date.now() - start;
        }

        res.setHeader('X-Compression-Time', duration);
        res.download(outPath, () => {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/wrap-avif', upload.single('raw_av1'), async (req, res) => {
    if (!req.file) return res.status(400).send('No raw data');

    const outPath = path.join(OUTPUTS, `${req.file.filename}.avif`);

    const wrapArgs = [
        '-i', req.file.path,
        '-c:v', 'copy',
        '-bsf:v', 'av1_metadata=td=insert',
        '-brand', 'avif',
        '-f', 'avif'
    ];

    try {
        const duration = await runFFmpeg(wrapArgs, outPath);
        res.setHeader('X-Compression-Time', duration);
        res.download(outPath, () => {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        });
    } catch (err) {
        console.error("Wrap error:", err);
        res.status(500).send('FFmpeg wrap failed');
    }
});

app.listen(3001, () => console.log('Server active on :3001'));
