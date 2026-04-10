export const generateCacheKey = (fileName, quality, effort, scale, mode) => {
    return `${fileName}_${quality}_${effort}_${scale}_${mode}`;
};

export const formatFileSize = (bytes) => (bytes / 1024 / 1024).toFixed(2);