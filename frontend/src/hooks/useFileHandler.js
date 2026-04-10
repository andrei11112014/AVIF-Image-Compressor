import { useCallback } from 'react';
import { generateCacheKey } from '../utils/helpers';

export const useFileHandler = ({
                                   compress,
                                   cache,
                                   touchCacheItem,
                                   qualityRef,
                                   effortRef,
                                   scaleRef,
                                   mode,
                                   setStatus,
                                   setDownloadUrl,
                                   setStats,
                                   setFileName,
                                   fileInputRef,
                                   fileNameRef,
                                   setInputKey,
                               }) => {
    const handleFile = useCallback(
        async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            setFileName(file.name);
            fileNameRef.current = file.name;
            console.log('[Debug] Selected file:', file.name, file.size, 'bytes');

            const cacheKey = generateCacheKey(
                file.name,
                qualityRef.current,
                effortRef.current,
                scaleRef.current,
                mode
            );
            const cached = cache.get(cacheKey);
            if (cached) {
                touchCacheItem(cacheKey);
                setDownloadUrl(cached.url);
                setStats(cached.stats);
                setStatus(`Готово!`);
                if (fileInputRef.current) fileInputRef.current.value = '';
                setInputKey((prev) => prev + 1);
                return;
            }

            if (fileInputRef.current) fileInputRef.current.value = '';

            setDownloadUrl(null);
            setStats(null);
            setStatus('Обработка...');

            try {
                await compress(file);
            } catch (err) {
                // ошибки обрабатываются внутри useCompression
            }
        },
        [
            compress,
            cache,
            touchCacheItem,
            qualityRef,
            effortRef,
            scaleRef,
            mode,
            setStatus,
            setDownloadUrl,
            setStats,
            setFileName,
            fileInputRef,
            fileNameRef,
            setInputKey,
        ]
    );

    return handleFile;
};