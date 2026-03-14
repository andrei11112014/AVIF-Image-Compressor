/* global self, VideoEncoder, VideoFrame */
/* eslint-disable no-restricted-globals */
import { FFmpeg } from '@ffmpeg/ffmpeg';

let ffmpeg = null;

self.onmessage = async (e) => {
    const { bitmap } = e.data;
    let encodedChunk = null;

    const init = {
        output: (chunk) => {
            const data = new Uint8Array(chunk.byteLength);
            chunk.copyTo(data);
            encodedChunk = data;
        },
        error: (err) => self.postMessage({ type: 'ERROR', message: "Encoder: " + err.message })
    };

    try {
        const encoder = new VideoEncoder(init);
        const config = {
            codec: 'av01.0.04M.08',
            width: bitmap.width,
            height: bitmap.height,
            hardwareAcceleration: 'prefer-software',
        };

        encoder.configure(config);
        encoder.encode(new VideoFrame(bitmap, { timestamp: 0 }), { keyFrame: true });
        await encoder.flush();
        encoder.close();
        bitmap.close();

        if (!ffmpeg) {
            ffmpeg = new FFmpeg();
            await ffmpeg.load();
        }

        // 1. Записываем как .ivf
        await ffmpeg.writeFile('input.ivf', encodedChunk);

        // 2. УПАКОВКА С ИСПРАВЛЕНИЕМ МЕТАДАННЫХ
        // -bsf:v av1_metadata=td=insert: Сверхважно для браузеров!
        // Добавляет Temporal Delimiter, который делает поток валидным для <img>
        await ffmpeg.exec([
            '-i', 'input.ivf',
            '-c:v', 'copy',
            '-bsf:v', 'av1_metadata=td=insert',
            '-brand', 'avif',
            '-f', 'avif',
            'output.avif'
        ]);

        const data = await ffmpeg.readFile('output.avif');

        self.postMessage({
            type: 'DONE',
            data: new Uint8Array(data)
        }, [data.buffer]);

    } catch (error) {
        self.postMessage({ type: 'ERROR', message: "FFmpeg Error: " + error.toString() });
    }
};
