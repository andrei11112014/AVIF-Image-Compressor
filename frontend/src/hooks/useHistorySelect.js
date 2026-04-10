import { useCallback } from 'react';

export const useHistorySelect = ({
                                     touchCacheItem,
                                     setDownloadUrl,
                                     setStats,
                                     setFileName,
                                     fileNameRef,
                                     setStatus,
                                     setShowHistory,
                                 }) => {
    const handleHistorySelect = useCallback(
        (item) => {
            touchCacheItem(item.key);
            setDownloadUrl(item.url);
            setStats(item.stats);
            setFileName(item.fileName);
            fileNameRef.current = item.fileName;
            setStatus(`Готово!`);
            setShowHistory(false);
        },
        [
            touchCacheItem,
            setDownloadUrl,
            setStats,
            setFileName,
            fileNameRef,
            setStatus,
            setShowHistory,
        ]
    );

    return handleHistorySelect;
};