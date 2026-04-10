/* global VideoEncoder AudioEncoder */
import { useState, useCallback } from 'react';

export const useWebCodecs = () => {
    const [webCodecsAvailable, setWebCodecsAvailable] = useState(null);
    const [hardwarePreference, setHardwarePreference] = useState('prefer-software');
    const [isMobile, setIsMobile] = useState(false);

    const checkWebCodecsSupport = useCallback(async () => {
        const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        setIsMobile(mobile);
        console.log('[Debug] Mobile device detected:', mobile);

        if (!('VideoEncoder' in window) || !('AudioEncoder' in window)) {
            console.log('[Debug] WebCodecs API not available');
            setWebCodecsAvailable(false);
            return false;
        }

        const config = {
            codec: 'av01.0.04M.08',
            width: 640,
            height: 480,
            bitrate: 1_000_000,
            hardwarePreference: 'prefer-hardware',
        };

        try {
            const support = await VideoEncoder.isConfigSupported(config);
            if (support.supported && support.config?.hardwareAcceleration === 'prefer-hardware') {
                setHardwarePreference('prefer-hardware');
                console.log('[Debug] AV1 codec supported with hardware acceleration');
            } else {
                setHardwarePreference('prefer-software');
                console.log('[Debug] AV1 codec supported, but only software mode available');
            }
            setWebCodecsAvailable(true);
            return true;
        } catch (e) {
            console.warn('[Debug] Error checking hardware AV1 support:', e);
            try {
                const basicSupport = await VideoEncoder.isConfigSupported({
                    codec: 'av01.0.04M.08',
                    width: 640,
                    height: 480,
                });
                if (basicSupport.supported) {
                    setHardwarePreference('prefer-software');
                    setWebCodecsAvailable(true);
                    console.log('[Debug] AV1 codec supported (basic, no hardware info)');
                    return true;
                }
            } catch (e2) {
                console.warn('[Debug] Basic AV1 check failed:', e2);
            }
            setWebCodecsAvailable(false);
            return false;
        }
    }, []);

    return {
        webCodecsAvailable,
        hardwarePreference,
        isMobile,
        checkWebCodecsSupport,
    };
};