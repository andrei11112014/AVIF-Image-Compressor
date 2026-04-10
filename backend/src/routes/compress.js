const path = require('path');
const { OUTPUTS_DIR } = require('../utils/constants');
const { runFFmpeg, buildGpuArgs } = require('../services/ffmpeg');
const compressWithSharp = require('../services/sharp');
const cleanupFiles = require('../utils/cleanup');

const compressHandler = async (req, res) => {
    if (!req.file) return res.status(400).send('No file');

    const outPath = path.join(OUTPUTS_DIR, `${req.file.filename}.avif`);

    const quality = parseInt(req.body.quality) || 35;
    const effort = parseInt(req.body.effort) || 4;
    const scale = parseInt(req.body.scale) || 100;

    try {
        let duration;

        // Попытка аппаратного сжатия через ffmpeg
        const qp = Math.floor(63 - (quality / 100) * 63);
        const gpuArgs = buildGpuArgs(req.file.path, qp);

        try {
            duration = await runFFmpeg(gpuArgs, outPath);
        } catch (ffmpegError) {
            // fallback на sharp
            duration = await compressWithSharp(req.file.path, outPath, quality, effort, scale);
        }

        res.setHeader('X-Compression-Time', duration);
        res.download(outPath, () => {
            cleanupFiles(req.file.path, outPath);
        });
    } catch (err) {
        cleanupFiles(req.file.path, outPath);
        res.status(500).send(err.message);
    }
};

module.exports = compressHandler;