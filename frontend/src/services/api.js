import { API_URL } from '../utils/constants';

export const compressOnServer = async (file, quality, effort, scale) => {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('quality', quality);
    fd.append('effort', effort);
    fd.append('scale', scale);

    const res = await fetch(`${API_URL}/compress`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Ошибка сервера');
    const serverTime = res.headers.get('X-Compression-Time');
    const blob = await res.blob();
    return { blob, serverTime };
};

export const wrapAvifOnServer = async (rawData, quality, effort) => {
    const formData = new FormData();
    formData.append('raw_av1', new Blob([rawData]));
    formData.append('quality', quality);
    formData.append('effort', effort);

    const res = await fetch(`${API_URL}/wrap-avif`, { method: 'POST', body: formData });
    const serverTime = res.headers.get('X-Compression-Time') || 0;
    const blob = await res.blob();
    return { blob, serverTime };
};