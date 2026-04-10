const { spawn } = require('child_process');

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

const buildGpuArgs = (inputPath, qp) => [
    '-i', inputPath,
    '-c:v', 'av1_amf',
    '-rc', '0',
    '-qp_i', qp.toString(),
    '-qp_p', qp.toString(),
];

const buildWrapArgs = (inputPath) => [
    '-i', inputPath,
    '-c:v', 'copy',
    '-bsf:v', 'av1_metadata=td=insert',
    '-brand', 'avif',
    '-f', 'avif',
];

module.exports = {
    runFFmpeg,
    buildGpuArgs,
    buildWrapArgs,
};