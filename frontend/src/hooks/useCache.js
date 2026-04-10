import { useRef, useState, useEffect } from 'react';
import { CACHE_LIMIT, CACHE_TTL } from '../utils/constants';

export const useCache = () => {
    const cacheRef = useRef(new Map());
    const [cacheVersion, setCacheVersion] = useState(0);

    // Очистка устаревших записей по TTL
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            let changed = false;
            for (const [key, value] of cacheRef.current.entries()) {
                if (now - value.timestamp > CACHE_TTL) {
                    URL.revokeObjectURL(value.url);
                    cacheRef.current.delete(key);
                    changed = true;
                    console.log('[Debug] Removed expired cache entry:', key);
                }
            }
            if (changed) setCacheVersion(prev => prev + 1);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    // Очистка всех URL при размонтировании
    useEffect(() => {
        return () => {
            for (const { url } of cacheRef.current.values()) {
                URL.revokeObjectURL(url);
            }
        };
    }, []);

    const addToCache = (
        key,
        blob,
        statsObj,
        fileName,
        qualityVal,
        effortVal,
        scaleVal,
        currentDownloadUrlRef
    ) => {
        const url = URL.createObjectURL(blob);
        const cache = cacheRef.current;

        if (cache.has(key)) {
            const old = cache.get(key);
            if (old.url !== currentDownloadUrlRef.current) {
                URL.revokeObjectURL(old.url);
            }
            cache.delete(key);
        }

        cache.set(key, {
            blob,
            url,
            stats: statsObj,
            timestamp: Date.now(),
            fileName,
            quality: qualityVal,
            effort: effortVal,
            scale: scaleVal,
        });

        if (cache.size > CACHE_LIMIT) {
            let oldestKey = null;
            let oldestTime = Infinity;
            for (const [k, v] of cache.entries()) {
                if (v.url === currentDownloadUrlRef.current) continue;
                if (v.timestamp < oldestTime) {
                    oldestTime = v.timestamp;
                    oldestKey = k;
                }
            }
            if (oldestKey) {
                const oldest = cache.get(oldestKey);
                URL.revokeObjectURL(oldest.url);
                cache.delete(oldestKey);
                console.log('[Debug] Removed oldest cache entry:', oldestKey);
            }
        }

        setCacheVersion(prev => prev + 1);
    };

    const touchCacheItem = (key) => {
        const cache = cacheRef.current;
        if (cache.has(key)) {
            const item = cache.get(key);
            item.timestamp = Date.now();
            cache.set(key, item);
            setCacheVersion(prev => prev + 1);
        }
    };

    const getCacheItems = () => {
        const items = [];
        for (const [key, value] of cacheRef.current.entries()) {
            items.push({
                key,
                fileName: value.fileName,
                stats: value.stats,
                url: value.url,
                timestamp: value.timestamp,
                quality: value.quality,
                effort: value.effort,
                scale: value.scale,
            });
        }
        return items.sort((a, b) => b.timestamp - a.timestamp);
    };

    return {
        cache: cacheRef.current,
        cacheVersion,
        addToCache,
        touchCacheItem,
        getCacheItems,
    };
};