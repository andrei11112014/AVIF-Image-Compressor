/* global VideoEncoder AudioEncoder */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';

function App() {
  const API_URL = `http://${window.location.hostname}:3001`;
  const [status, setStatus] = useState('Инициализация кодека...');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [mode, setMode] = useState('hybrid');
  const [stats, setStats] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [cacheVersion, setCacheVersion] = useState(0);
  const isWebCodecsMode = mode === 'hybrid' || mode === 'client_fast';

  const [inputKey, setInputKey] = useState(0);
  const cacheRef = useRef(new Map());
  const CACHE_LIMIT = 10;

  const fileInputRef = useRef(null);
  const fileNameRef = useRef('');
  const currentDownloadUrlRef = useRef(null);

  const [quality, setQuality] = useState(35);
  const [effort, setEffort] = useState(4);
  const [scale, setScale] = useState(100);
  const [fileName, setFileName] = useState('');

  const [webCodecsAvailable, setWebCodecsAvailable] = useState(null);
  const [hardwarePreference, setHardwarePreference] = useState('prefer-software');
  const [isMobile, setIsMobile] = useState(false);

  const worker = useMemo(() => new Worker(new URL('./Worker.js', import.meta.url)), []);

  useEffect(() => {
    currentDownloadUrlRef.current = downloadUrl;
  }, [downloadUrl]);

  const addToCache = (key, blob, statsObj, fileName) => {
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
      quality,
      effort,
      scale,
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

  useEffect(() => {
    return () => {
      for (const { url } of cacheRef.current.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const checkWebCodecsSupport = async () => {
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);
    console.log('[Debug] Mobile device detected:', mobile);

    if (!('VideoEncoder' in window) || !('AudioEncoder' in window)) {
      console.log('[Debug] WebCodecs API not available');
      setWebCodecsAvailable(false);
      setStatus('WebCodecs не поддерживаются браузером. Доступны только серверный и программный режимы.');
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
        setStatus('');
      } else {
        setHardwarePreference('prefer-software');
        console.log('[Debug] AV1 codec supported, but only software mode available');
        setStatus('');
      }
      setWebCodecsAvailable(true);
      return true;
    } catch (e) {
      console.warn('[Debug] Error checking hardware AV1 support:', e);
      try {
        const basicSupport = await VideoEncoder.isConfigSupported({ codec: 'av01.0.04M.08', width: 640, height: 480 });
        if (basicSupport.supported) {
          setHardwarePreference('prefer-software');
          setWebCodecsAvailable(true);
          console.log('[Debug] AV1 codec supported (basic, no hardware info)');
          setStatus('');
          return true;
        }
      } catch (e2) {
        console.warn('[Debug] Basic AV1 check failed:', e2);
      }
      setWebCodecsAvailable(false);
      setStatus('WebCodecs недоступны для кодека AV1. Используйте серверный или программный режим.');
      return false;
    }
  };

  useEffect(() => {
    checkWebCodecsSupport();
  }, []);

  useEffect(() => {
    if (webCodecsAvailable === false) {
      const unavailableModes = ['hybrid', 'client_fast'];
      if (unavailableModes.includes(mode)) {
        setMode('server');
        console.log('[Debug] Mode switched to "server" because WebCodecs not available');
        setStatus('Режим изменён на "Сервер", так как WebCodecs не поддерживается');
      }
    }
  }, [webCodecsAvailable, mode]);

  useEffect(() => {
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
  }, [worker, hardwarePreference]);

  const finalizeResult = (blob, time, label) => {
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    const statsObj = { time, size: (blob.size / 1024 / 1024).toFixed(2) };
    setStats(statsObj);
    setStatus(`Готово!`);

    if (fileNameRef.current) {
      const cacheKey = `${fileNameRef.current}_${quality}_${effort}_${scale}_${mode}`;
      addToCache(cacheKey, blob, statsObj, fileNameRef.current);
    }

    if (fileInputRef.current) { fileInputRef.current.value = ''; }
    setInputKey(prev => prev + 1);
  };

  const handleHybridWrap = async (rawData, clientTime) => {
    setStatus('Упаковка на сервере...');
    const formData = new FormData();
    formData.append('raw_av1', new Blob([rawData]));
    formData.append('quality', quality);
    formData.append('effort', effort);

    try {
      const res = await fetch(`${API_URL}/wrap-avif`, { method: 'POST', body: formData });
      const serverTime = res.headers.get('X-Compression-Time') || 0;
      const blob = await res.blob();
      const totalTime = (parseFloat(clientTime) + parseFloat(serverTime)).toFixed(2);
      finalizeResult(blob, totalTime, `Гибрид`);
    } catch (err) {
      setStatus(`Ошибка гибрида: ${err.message}`);
      console.error('[Debug] Hybrid wrap error:', err);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    fileNameRef.current = file.name;
    console.log('[Debug] Selected file:', file.name, file.size, 'bytes');

    const cacheKey = `${file.name}_${quality}_${effort}_${scale}_${mode}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      touchCacheItem(cacheKey);
      setDownloadUrl(cached.url);
      setStats(cached.stats);
      setStatus(`Готово! (из кэша)`);
      if (fileInputRef.current) { fileInputRef.current.value = ''; }
      setInputKey(prev => prev + 1);
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setDownloadUrl(null);
    setStats(null);
    setStatus('Обработка...');

    const compressionSettings = {
      quality,
      effort,
      scale,
      hardwarePreference: webCodecsAvailable ? hardwarePreference : undefined
    };
    console.log('[Debug] Compression settings:', compressionSettings);

    if (mode === 'server') {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('quality', quality);
      fd.append('effort', effort);
      fd.append('scale', scale);
      try {
        const res = await fetch(`${API_URL}/compress`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Ошибка сервера');
        const serverTime = res.headers.get('X-Compression-Time');
        const blob = await res.blob();
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
  };

  const availableModes = [
    { value: 'hybrid', label: '1. Гибрид (WebCodecs API + Упаковка на сервере)' },
    { value: 'client_fast', label: '2. Автономно (WebCodecs API + Упаковка в браузере (FFmpeg))' },
    { value: 'client_software', label: '3. Автономно (Jsquash)' },
    { value: 'server', label: '4. Сервер (GPU/CPU (FFmpeg + Sharp))' }
  ];

  const filteredModes = webCodecsAvailable === false
      ? availableModes.filter(m => m.value !== 'hybrid' && m.value !== 'client_fast')
      : availableModes;

  return (
      <div style={{ padding: '40px', textAlign: 'center', maxWidth: '900px', margin: '0 auto'}}>
        <div className="bubbles-wrapper">
          <div className="bubble bubble--type-3" style={{ width: '95px', height: '95px', left: '1%', animationDelay: '0s, 0s' }}></div>
          <div className="bubble bubble--type-2" style={{ width: '65px', height: '65px', left: '11%', animationDelay: '11s, 1s' }}></div>
          <div className="bubble bubble--type-5" style={{ width: '35px', height: '35px', left: '18%', animationDelay: '7s, 2s' }}></div>
          <div className="bubble bubble--type-1" style={{ width: '30px', height: '30px', left: '23%', animationDelay: '4s, 2s' }}></div>
          <div className="bubble bubble--type-3" style={{ width: '85px', height: '85px', left: '5%', animationDelay: '16s, 3s' }}></div>
          <div className="bubble bubble--type-5" style={{ width: '45px', height: '45px', left: '15%', animationDelay: '20s, 1.5s' }}></div>
          <div className="bubble bubble--type-6" style={{ width: '105px', height: '105px', left: '19%', animationDelay: '9s, 0s' }}></div>
          <div className="bubble bubble--type-5" style={{ width: '20px', height: '20px', left: '7%', animationDelay: '3s, 1s' }}></div>
          <div className="bubble bubble--type-4" style={{ width: '70px', height: '70px', left: '27%', animationDelay: '22s, 2s' }}></div>
          <div className="bubble bubble--type-3" style={{ width: '85px', height: '85px', left: '34%', animationDelay: '5s, 0.5s' }}></div>
          <div className="bubble bubble--type-2" style={{ width: '75px', height: '75px', left: '42%', animationDelay: '10s, 3s' }}></div>
          <div className="bubble bubble--type-5" style={{ width: '30px', height: '30px', left: '31%', animationDelay: '18s, 1s' }}></div>
          <div className="bubble bubble--type-1" style={{ width: '55px', height: '55px', left: '49%', animationDelay: '20s, 1s' }}></div>
          <div className="bubble bubble--type-6" style={{ width: '105px', height: '105px', left: '55%', animationDelay: '2s, 0s' }}></div>
          <div className="bubble bubble--type-2" style={{ width: '90px', height: '90px', left: '45%', animationDelay: '14s, 4s' }}></div>
          <div className="bubble bubble--type-6" style={{ width: '20px', height: '20px', left: '53%', animationDelay: '6s, 2s' }}></div>
          <div className="bubble bubble--type-2" style={{ width: '80px', height: '80px', left: '61%', animationDelay: '17s, 2s' }}></div>
          <div className="bubble bubble--type-3" style={{ width: '75px', height: '75px', left: '69%', animationDelay: '8s, 0.5s' }}></div>
          <div className="bubble bubble--type-5" style={{ width: '60px', height: '60px', left: '76%', animationDelay: '3s, 5s' }}></div>
          <div className="bubble bubble--type-1" style={{ width: '25px', height: '25px', left: '67%', animationDelay: '24s, 4s' }}></div>
          <div className="bubble bubble--type-4" style={{ width: '100px', height: '100px', left: '81%', animationDelay: '12s, 1s' }}></div>
          <div className="bubble bubble--type-3" style={{ width: '60px', height: '60px', left: '89%', animationDelay: '11s, 0.5s' }}></div>
          <div className="bubble bubble--type-6" style={{ width: '90px', height: '90px', left: '95%', animationDelay: '1s, 0s' }}></div>
          <div className="bubble bubble--type-1" style={{ width: '45px', height: '45px', left: '86%', animationDelay: '6s, 1s' }}></div>
          <div className="bubble bubble--type-2" style={{ width: '50px', height: '50px', left: '91%', animationDelay: '15s, 2s' }}></div>
        </div>
        <h1 className="title" style={{ fontSize: '38px', marginBottom: '30px' }}>AVIF-Image-Compressor</h1>

        <div style={{ marginBottom: '25px' }}>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="select" disabled={webCodecsAvailable === null}>
            {filteredModes.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          {webCodecsAvailable === false && isMobile && (
              <div style={{ fontSize: '12px', color: '#e67e22', marginTop: '5px' }}>
                ⚠️ Ваше мобильное устройство не поддерживает WebCodecs. Доступны только серверный и программный режимы.
              </div>
          )}
        </div>

        <div className="panel" style={{ marginBottom: '25px' }}>
          <h3 style={{ marginTop: 0, color: '#0056b3' }}>Настройки сжатия</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            {/* Качество */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Качество: {quality}%</label>
              <input
                  type="range"
                  min="1" max="100"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  disabled={isWebCodecsMode}
                  style={{
                    width: '100%',
                    appearance: 'none',
                    height: '10px',
                    borderRadius: '5px',
                    outline: 'none',
                    background: `linear-gradient(to right, #3498db 0%, #3498db ${(quality - 1) / 0.99}%, #e0e0e0 ${(quality - 1) / 0.99}%, #e0e0e0 100%)`,
                    opacity: isWebCodecsMode ? 0.6 : 1,
                    cursor: isWebCodecsMode ? 'not-allowed' : 'pointer'
                  }}
              />
              <small style={{ display: 'block', marginTop: '8px', color: '#444', fontStyle: 'italic' }}>
                {isWebCodecsMode ? '⛔ Недоступно в этом режиме' : 'Высокое значение - лучшее качество и больший размер файла'}
              </small>
            </div>

            {/* Степень сжатия */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Степень сжатия: {effort}</label>
              <input
                  type="range"
                  min="1" max="10"
                  value={effort}
                  onChange={(e) => setEffort(parseInt(e.target.value))}
                  disabled={isWebCodecsMode}
                  style={{
                    width: '100%',
                    appearance: 'none',
                    height: '10px',
                    borderRadius: '5px',
                    outline: 'none',
                    background: `linear-gradient(to right, #3498db 0%, #3498db ${(effort - 1) / 9 * 100}%, #e0e0e0 ${(effort - 1) / 9 * 100}%, #e0e0e0 100%)`,
                    opacity: isWebCodecsMode ? 0.6 : 1,
                    cursor: isWebCodecsMode ? 'not-allowed' : 'pointer'
                  }}
              />
              <small style={{ display: 'block', marginTop: '8px', color: '#444', fontStyle: 'italic' }}>
                {isWebCodecsMode ? '⛔ Недоступно в этом режиме' : '1 - быстрее, 10 - качественнее (медленнее)'}
              </small>
            </div>

            {/* Размер изображения */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Размер изображения: {scale}%</label>
              <input
                  type="range"
                  min="10" max="100"
                  value={scale}
                  onChange={(e) => setScale(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    appearance: 'none',
                    height: '10px',
                    borderRadius: '5px',
                    outline: 'none',
                    background: `linear-gradient(to right, #3498db 0%, #3498db ${(scale - 10) / 90 * 100}%, #e0e0e0 ${(scale - 10) / 90 * 100}%, #e0e0e0 100%)`
                  }}
              />
              <small style={{ display: 'block', marginTop: '8px', color: '#444', fontStyle: 'italic' }}>
                Чем меньше масштаб, меньше размер файла
              </small>
            </div>
          </div>
        </div>

        <div className="panel" style={{ borderStyle: 'dashed', borderWidth: '3px', borderColor: 'rgba(52, 152, 219, 0.4)' }}>
          <div className="file-upload">
            <input key={inputKey} id="file" type="file" accept="image/*" onChange={handleFile} disabled={!isReady || webCodecsAvailable === null} style={{ display: 'none' }} />
            <label htmlFor="file" className="button">Выберите файл</label>
          </div>
          {fileName && <div style={{ marginTop: '12px', color: '#333', fontSize: '15px' }}>Файл: <strong>{fileName}</strong></div>}
          {status && <p style={{ marginTop: '20px', fontSize: '18px' }}><span style={{ color: '#0078d7', fontWeight: 'bold' }}>{status}</span></p>}
          {stats && <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: '8px', display: 'inline-block' }}><strong>Время:</strong> {stats.time} ms | <strong>Вес:</strong> {stats.size} MB</div>}

          <div style={{ marginTop: '15px' }}>
            <button onClick={() => setShowHistory(!showHistory)} className="button">📋 Ранее сжатые ({getCacheItems().length})</button>
            {showHistory && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'left', maxHeight: '200px', overflowY: 'auto' }}>
                  {getCacheItems().length === 0 ? <div style={{ color: '#666' }}>Нет сохранённых изображений</div> :
                      getCacheItems().map((item) => (
                          <div key={item.key} onClick={() => {
                            touchCacheItem(item.key);
                            setDownloadUrl(item.url);
                            setStats(item.stats);
                            setFileName(item.fileName);
                            fileNameRef.current = item.fileName;
                            setStatus(`Готово! (из истории)`);
                            setShowHistory(false);
                          }} style={{ padding: '8px', borderBottom: '1px solid #ddd', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>📷 {item.fileName} <span style={{ fontSize: '10px', color: '#555' }}>(кач:{item.quality}%, ст.:{item.effort}, масштаб:{item.scale}%)</span></span>
                            <span style={{ fontSize: '12px', color: '#666' }}>{item.stats.size} MB / {item.stats.time} ms</span>
                          </div>
                      ))
                  }
                </div>
            )}
          </div>
        </div>

        {downloadUrl && (
            <div className="panel" style={{ marginTop: '40px' }}>
              <div style={{ marginBottom: '15px', fontWeight: 'bold', color: '#2c3e50' }}>Предпросмотр:</div>
              <img src={downloadUrl} alt="Result" style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '12px', border: '4px solid white', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }} />
              <br />
              <a href={downloadUrl} download="compressed.avif" className="button button--green" style={{ textDecoration: 'none', marginTop: '25px' }}>Скачать .avif</a>
            </div>
        )}
      </div>
  );
}

export default App;