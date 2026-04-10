const path = require('path');
const { OUTPUTS_DIR } = require('../utils/constants');
const { runFFmpeg, buildWrapArgs } = require('../services/ffmpeg');
const cleanupFiles = require('../utils/cleanup');

const wrapHandler = async (req, res) => {
    if (!req.file) return res.status(400).send('No raw data');

    const outPath = path.join(OUTPUTS_DIR, `${req.file.filename}.avif`);
    const wrapArgs = buildWrapArgs(req.file.path);

    try {
        const duration = await runFFmpeg(wrapArgs, outPath);
        res.setHeader('X-Compression-Time', duration);
        res.download(outPath, () => {
            cleanupFiles(req.file.path, outPath);
        });
    } catch (err) {
        console.error('Wrap error:', err);
        cleanupFiles(req.file.path, outPath);
        res.status(500).send('FFmpeg wrap failed');
    }
};

module.exports = wrapHandler;