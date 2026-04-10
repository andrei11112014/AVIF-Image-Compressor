import { useCallback } from 'react';
import { generateCacheKey, formatFileSize } from '../utils/helpers';

export const useFinalizeResult = ({
                                      setDownloadUrl,
                                      setStats,
                                      setStatus,
                                      setInputKey,
                                      addToCache,
                                      fileNameRef,
                                      qualityRef,
                                      effortRef,
                                      scaleRef,
                                      mode,
                                      currentDownloadUrlRef,
                                      fileInputRef,
                                  }) => {
    const finalizeResult = useCallback(
        (blob, time, label) => {
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            const statsObj = { time, size: formatFileSize(blob.size) };
            setStats(statsObj);
            setStatus(`Готово!`);

            if (fileNameRef.current) {
                const cacheKey = generateCacheKey(
                    fileNameRef.current,
                    qualityRef.current,
                    effortRef.current,
                    scaleRef.current,
                    mode
                );
                addToCache(
                    cacheKey,
                    blob,
                    statsObj,
                    fileNameRef.current,
                    qualityRef.current,
                    effortRef.current,
                    scaleRef.current,
                    currentDownloadUrlRef
                );
            }

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setInputKey((prev) => prev + 1);
        },
        [
            setDownloadUrl,
            setStats,
            setStatus,
            setInputKey,
            addToCache,
            fileNameRef,
            qualityRef,
            effortRef,
            scaleRef,
            mode,
            currentDownloadUrlRef,
            fileInputRef,
        ]
    );

    return finalizeResult;
};