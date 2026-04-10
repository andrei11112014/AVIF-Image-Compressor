import { useCallback } from 'react';
import { compressOnServer, wrapAvifOnServer } from '../services/api';

export const useCompression = ({
                                   worker,
                                   mode,
                                   qualityRef,
                                   effortRef,
                                   scaleRef,
                                   hardwarePreference,
                                   webCodecsAvailable,
                                   finalizeResult,
                                   setStatus,
                                   setIsReady,
                               }) => {
    // Инициализация воркера
    const initWorker = useCallback(() => {
        worker.postMessage({ type: 'WARMUP' });

        worker.onmessage = (e) => {
            const { type, data, message, duration, label } = e.data;

            if (type === 'READY') {
                setIsReady(true);
                console.log('[Debug] Worker ready. Hardware preference used:', hardwarePreference);
                setStatus('');
            } else if (type === 'DONE') {
                const blob = new Blob([data], { type: 'image/avif' });
                finalizeResult(blob, duration, label || 'Автономно');
            } else if (type === 'RAW_DATA') {
                handleHybridWrap(data, duration);
            } else if (type === 'ERROR') {
                setStatus(`Ошибка: ${message}`);
                console.error('[Debug] Worker error:', message);
            }
        };
    }, [worker, hardwarePreference, finalizeResult, setStatus, setIsReady]);

    // Гибридная упаковка на сервере
    const handleHybridWrap = useCallback(
        async (rawData, clientTime) => {
            setStatus('Упаковка на сервере...');
            try {
                const { blob, serverTime } = await wrapAvifOnServer(
                    rawData,
                    qualityRef.current,
                    effortRef.current
                );
                const totalTime = (parseFloat(clientTime) + parseFloat(serverTime)).toFixed(2);
                finalizeResult(blob, totalTime, `Гибрид`);
            } catch (err) {
                setStatus(`Ошибка гибрида: ${err.message}`);
                console.error('[Debug] Hybrid wrap error:', err);
            }
        },
        [qualityRef, effortRef, finalizeResult, setStatus]
    );

    // Основная функция сжатия
    const compress = useCallback(
        async (file) => {
            const compressionSettings = {
                quality: qualityRef.current,
                effort: effortRef.current,
                scale: scaleRef.current,
                hardwarePreference: webCodecsAvailable ? hardwarePreference : undefined,
            };
            console.log('[Debug] Mode:', mode, 'Compression settings:', compressionSettings);

            if (mode === 'server') {
                try {
                    const { blob, serverTime } = await compressOnServer(
                        file,
                        qualityRef.current,
                        effortRef.current,
                        scaleRef.current
                    );
                    finalizeResult(blob, serverTime, 'Сервер');
                } catch (err) {
                    setStatus('Ошибка сервера');
                    console.error('[Debug] Server error:', err);
                }
            } else {
                try {
                    const img = new Image();
                    img.src = URL.createObjectURL(file);
                    await img.decode();

                    const bitmap = await createImageBitmap(img, { imageOrientation: 'from-image' });
                    worker.postMessage({ bitmap, mode, settings: compressionSettings }, [bitmap]);
                    URL.revokeObjectURL(img.src);
                } catch (err) {
                    setStatus('Ошибка обработки изображения');
                    console.error('[Debug] Image processing error:', err);
                }
            }
        },
        [
            mode,
            qualityRef,
            effortRef,
            scaleRef,
            webCodecsAvailable,
            hardwarePreference,
            finalizeResult,
            setStatus,
            worker,
        ]
    );

    return {
        initWorker,
        handleHybridWrap,
        compress,
    };
};