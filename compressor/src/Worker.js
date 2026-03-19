/* global self, VideoEncoder, VideoFrame */
/* eslint-disable no-restricted-globals */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import encode from '@jsquash/avif/encode';

let ffmpeg = null;

self.onmessage = async (e) => {
    const { bitmap, mode, type } = e.data;

    if (type === 'WARMUP') {
        try { await encode(new ImageData(1, 1), { speed: 10 }); self.postMessage({ type: 'READY' }); } catch (err) {}
        return;
    }

    try {
        if (mode === 'hybrid' || mode === 'client_fast') {
            const startTime = performance.now();

            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0);

            const fixedBitmap = canvas.transferToImageBitmap();
            const { width, height } = fixedBitmap;
            bitmap.close();

            let encodedChunk = null;
            const encoder = new VideoEncoder({
                output: (chunk) => {
                    const data = new Uint8Array(chunk.byteLength);
                    chunk.copyTo(data);
                    encodedChunk = data;
                },
                error: (err) => { throw err; }
            });

            encoder.configure({
                codec: 'av01.0.04M.08',
                width: width,
                height: height,
                hardwareAcceleration: 'prefer-software'
            });

            encoder.encode(new VideoFrame(fixedBitmap, { timestamp: 0 }), { keyFrame: true });
            await encoder.flush();
            encoder.close();
            fixedBitmap.close();

            if (!encodedChunk) throw new Error("Encoder produced no data");

            if (mode === 'hybrid') {
                const duration = (performance.now() - startTime).toFixed(2);
                self.postMessage({ type: 'RAW_DATA', data: encodedChunk, duration }, [encodedChunk.buffer]);
            } else {
                if (!ffmpeg) { ffmpeg = new FFmpeg(); await ffmpeg.load(); }
                await ffmpeg.writeFile('input.ivf', encodedChunk);
                await ffmpeg.exec(['-i', 'input.ivf', '-c:v', 'copy', '-brand', 'avif', '-f', 'avif', 'out.avif']);
                const data = await ffmpeg.readFile('out.avif');
                self.postMessage({ type: 'DONE', data: new Uint8Array(data), duration: (performance.now()-startTime).toFixed(2), label: 'GPU+FFmpeg' }, [data.buffer]);
            }
        } else if (mode === 'client_software') {
            const startTime = performance.now();
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            const avifBuffer = await encode(imageData, { quality: 35, speed: 10 });
            self.postMessage({ type: 'DONE', data: new Uint8Array(avifBuffer), duration: (performance.now()-startTime).toFixed(2), label: 'WASM' }, [avifBuffer]);
            bitmap.close();
        }
    } catch (error) {
        self.postMessage({ type: 'ERROR', message: error.message || error.toString() });
    }
};
