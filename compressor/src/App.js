/* global VideoEncoder AudioEncoder */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';

function App() {
  const API_URL = `http://${window.location.hostname}:3001`;
  const [status, setStatus] = useState('Инициализация...');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [mode, setMode] = useState('hybrid');
  const [stats, setStats] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [cacheVersion, setCacheVersion] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [inputKey, setInputKey] = useState(0);
  const cacheRef = useRef(new Map());
  const CACHE_LIMIT = 10;
  const CACHE_TTL = 10 * 60 * 1000;

  const fileInputRef = useRef(null);
  const fileNameRef = useRef('');
  const currentDownloadUrlRef = useRef(null);

  const [quality, setQuality] = useState(35);
  const [effort, setEffort] = useState(4);
  const [scale, setScale] = useState(100);
  const [fileName, setFileName] = useState('');

  const qualityRef = useRef(quality);
  const effortRef = useRef(effort);
  const scaleRef = useRef(scale);

  useEffect(() => { qualityRef.current = quality; }, [quality]);
  useEffect(() => { effortRef.current = effort; }, [effort]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  const [webCodecsAvailable, setWebCodecsAvailable] = useState(null);
  const [hardwarePreference, setHardwarePreference] = useState('prefer-software');
  const [isMobile, setIsMobile] = useState(false);

  const worker = useMemo(() => new Worker(new URL('./Worker.js', import.meta.url)), []);

  // Функция открытия полноэкранного предпросмотра с Fullscreen API
  const openFullscreenPreview = () => {
    if (!downloadUrl) return;

    // Создаём контейнер для полноэкранного просмотра
    const container = document.createElement('div');
    container.id = 'fullscreen-preview-container';
    container.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;

    // Изображение
    const img = document.createElement('img');
    img.src = downloadUrl;
    img.alt = 'AVIF Result';
    img.style.cssText = `
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      box-shadow: 0 0 30px rgba(0,0,0,0.5);
    `;

    // Кнопка закрытия
    const onclick = () => document.exitFullscreen();

    // Собираем элементы
    container.appendChild(img);
    document.body.appendChild(container);

    // Обработчик выхода из полноэкранного режима
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
        document.removeEventListener('fullscreenchange', onFullscreenChange);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);

    // Запрашиваем полноэкранный режим
    container.requestFullscreen().catch(err => {
      alert('Не удалось открыть полноэкранный режим. Возможно, браузер блокирует эту функцию.');
      console.error('Fullscreen error:', err);
      if (container.parentNode) container.parentNode.removeChild(container);
    });
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  const getDefaultMode = () => {
    if (webCodecsAvailable && isOnline) return 'hybrid';
    if (!webCodecsAvailable && isOnline) return 'server';
    else return 'client_software';
  };

  useEffect(() => {
    if (webCodecsAvailable !== null) {
      const defaultMode = getDefaultMode();
      setMode(defaultMode);
      console.log('[Debug] Default mode set to:', defaultMode);
    }
  }, [webCodecsAvailable, isOnline]);

  const availableModes = [
    { value: 'hybrid', label: '🔄 Полусерверный режим' },
    { value: 'server', label: '☁️ Серверный режим' },
    { value: 'client_software', label: '💻 Автономный режим' },
    { value: 'client_fast', label: '🧪 Автономный режим (экспериментальный)' }
  ].filter(m => {
    if ((m.value === 'hybrid' || m.value === 'client_fast') && !webCodecsAvailable) return false;
    return true;
  });

  useEffect(() => {
    currentDownloadUrlRef.current = downloadUrl;
  }, [downloadUrl]);

  const addToCache = (key, blob, statsObj, fileName, qualityVal, effortVal, scaleVal) => {
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
      setStatus('Ограниченный режим');
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
      setStatus('Ограниченный режим');
      return false;
    }
  };

  useEffect(() => {
    checkWebCodecsSupport();
  }, []);

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
      const cacheKey = `${fileNameRef.current}_${qualityRef.current}_${effortRef.current}_${scaleRef.current}_${mode}`;
      addToCache(cacheKey, blob, statsObj, fileNameRef.current, qualityRef.current, effortRef.current, scaleRef.current);
    }

    if (fileInputRef.current) { fileInputRef.current.value = ''; }
    setInputKey(prev => prev + 1);
  };

  const handleHybridWrap = async (rawData, clientTime) => {
    setStatus('Упаковка на сервере...');
    const formData = new FormData();
    formData.append('raw_av1', new Blob([rawData]));
    formData.append('quality', qualityRef.current);
    formData.append('effort', effortRef.current);

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

    const cacheKey = `${file.name}_${qualityRef.current}_${effortRef.current}_${scaleRef.current}_${mode}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      touchCacheItem(cacheKey);
      setDownloadUrl(cached.url);
      setStats(cached.stats);
      setStatus(`Готово!`);
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
      quality: qualityRef.current,
      effort: effortRef.current,
      scale: scaleRef.current,
      hardwarePreference: webCodecsAvailable ? hardwarePreference : undefined
    };
    console.log('[Debug] Mode:', mode, 'Compression settings:', compressionSettings);

    if (mode === 'server') {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('quality', qualityRef.current);
      fd.append('effort', effortRef.current);
      fd.append('scale', scaleRef.current);
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

  const isQualityDisabled = () => {
    return mode === 'client_fast' || mode === 'hybrid';
  };

  return (
      <div style={{ padding: '40px', textAlign: 'center', maxWidth: '900px', margin: '0 auto'}}>
        <div className="bubbles-wrapper">
          {useMemo(() => {
            const bubbleConfigs = [
              { w: 95, l: 1, d: '0s, 0s', t: 3 }, { w: 65, l: 11, d: '11s, 1s', t: 2 },
              { w: 35, l: 18, d: '7s, 2s', t: 5 }, { w: 30, l: 23, d: '4s, 2s', t: 1 },
              { w: 85, l: 5, d: '16s, 3s', t: 3 }, { w: 45, l: 15, d: '20s, 1.5s', t: 5 },
              { w: 105, l: 19, d: '9s, 0s', t: 6 }, { w: 20, l: 7, d: '3s, 1s', t: 5 },
              { w: 70, l: 27, d: '22s, 2s', t: 4 }, { w: 85, l: 34, d: '5s, 0.5s', t: 3 },
              { w: 75, l: 42, d: '10s, 3s', t: 2 }, { w: 30, l: 31, d: '18s, 1s', t: 5 },
              { w: 55, l: 49, d: '20s, 1s', t: 1 }, { w: 105, l: 55, d: '2s, 0s', t: 6 },
              { w: 90, l: 45, d: '14s, 4s', t: 2 }, { w: 20, l: 53, d: '6s, 2s', t: 6 },
              { w: 80, l: 61, d: '17s, 2s', t: 2 }, { w: 75, l: 69, d: '8s, 0.5s', t: 3 },
              { w: 60, l: 76, d: '3s, 5s', t: 5 }, { w: 25, l: 67, d: '24s, 4s', t: 1 },
              { w: 100, l: 81, d: '12s, 1s', t: 4 }, { w: 60, l: 89, d: '11s, 0.5s', t: 3 },
              { w: 90, l: 95, d: '1s, 0s', t: 6 }, { w: 45, l: 86, d: '6s, 1s', t: 1 },
              { w: 50, l: 91, d: '15s, 2s', t: 2 }
            ];
            return bubbleConfigs.map((b, i) => (
                <div
                    key={i}
                    className={`bubble bubble--type-${b.t}`}
                    style={{ width: `${b.w}px`, height: `${b.w}px`, left: `${b.l}%`, animationDelay: b.d }}
                />
            ));
          }, [])}
        </div>
        <h1 className="title" style={{ fontSize: '38px', marginBottom: '30px' }}>AVIF-Image-Compressor</h1>

        <div style={{ marginBottom: '25px' }}>
          <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="select"
              disabled={webCodecsAvailable === null}
          >
            {availableModes.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {!isOnline && mode === 'server' && (
              <div style={{ fontSize: '12px', color: 'orange', marginTop: '5px' }}>
                Нет интернета – серверный режим может не работать
              </div>
          )}
          {(mode === 'hybrid' || mode === 'client_fast') && webCodecsAvailable === false && (
              <div style={{ fontSize: '12px', color: 'orange', marginTop: '5px' }}>
                Ваш браузер не поддерживает ускоренное сжатие, выберите другой режим
              </div>
          )}
        </div>

        <div className="panel" style={{ marginBottom: '25px' }}>
          <h3 style={{ marginTop: 0, color: '#0056b3' }}>Настройки сжатия</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Качество: {quality}%</label>
              <input
                  type="range"
                  min="1" max="100"
                  value={quality}
                  onChange={(e) => { let val = parseInt(e.target.value, 10); if (val >= 99.5) val = 100; setQuality(val); }}
                  disabled={isQualityDisabled()}
                  style={{
                    width: '100%',
                    appearance: 'none',
                    height: '10px',
                    borderRadius: '5px',
                    outline: 'none',
                    background: `linear-gradient(to right, #3498db 0%, #3498db ${(quality - 1) / 0.99}%, #e0e0e0 ${(quality - 1) / 0.99}%, #e0e0e0 100%)`,
                    opacity: isQualityDisabled() ? 0.6 : 1,
                    cursor: isQualityDisabled() ? 'not-allowed' : 'pointer'
                  }}
              />
              <small style={{ display: 'block', marginTop: '8px', color: '#444', fontStyle: 'italic' }}>
                {isQualityDisabled() ? 'Недоступно в этом режиме' : 'Высокое значение - лучшее качество и больший размер файла'}
              </small>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Степень сжатия: {effort}</label>
              <input
                  type="range"
                  min="1" max="10"
                  value={effort}
                  onChange={(e) => { let val = parseInt(e.target.value, 10); if (val >= 9.5) val = 10; setEffort(val); }}
                  disabled={isQualityDisabled()}
                  style={{
                    width: '100%',
                    appearance: 'none',
                    height: '10px',
                    borderRadius: '5px',
                    outline: 'none',
                    background: `linear-gradient(to right, #3498db 0%, #3498db ${(effort - 1) / 9 * 100}%, #e0e0e0 ${(effort - 1) / 9 * 100}%, #e0e0e0 100%)`,
                    opacity: isQualityDisabled() ? 0.6 : 1,
                    cursor: isQualityDisabled() ? 'not-allowed' : 'pointer'
                  }}
              />
              <small style={{ display: 'block', marginTop: '8px', color: '#444', fontStyle: 'italic' }}>
                {isQualityDisabled() ? 'Недоступно в этом режиме' : '1 - быстрее, 10 - качественнее (медленнее)'}
              </small>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Размер изображения: {scale}%</label>
              <input
                  type="range"
                  min="10" max="100"
                  value={scale}
                  onChange={(e) => { let val = parseInt(e.target.value, 10); if (val >= 99.5) val = 100; setScale(val); }}
                  style={{
                    width: '100%',
                    appearance: 'none',
                    height: '10px',
                    borderRadius: '5px',
                    outline: 'none',
                    background: `linear-gradient(to right, #3498db 0%, #3498db ${(scale - 10) / 90 * 100}%, #e0e0e0 ${(scale - 10) / 90 * 100}%, #e0e0e0 100%)`
                  }}
              />
              <small style={{ display: 'block', marginTop: '8px', color: '#444', fontStyle: 'italic' }}>Чем меньше масштаб, меньше размер файла</small>
            </div>
          </div>
        </div>

        <div className="panel" style={{ borderStyle: 'dashed', borderWidth: '3px', borderColor: 'rgba(52, 152, 219, 0.4)' }}>
          <div className="file-upload">
            <input key={inputKey} id="file" type="file" accept="image/*" onChange={handleFile} disabled={!isReady || webCodecsAvailable === null} style={{ display: 'none' }} />
            <label htmlFor="file" className="button button--blue">Выберите файл</label>
          </div>
          {fileName && <div style={{ marginTop: '12px', color: '#333', fontSize: '15px' }}>Файл: <strong>{fileName}</strong></div>}
          {status && <p style={{ marginTop: '20px', fontSize: '18px' }}><span style={{ color: '#0078d7', fontWeight: 'bold' }}>{status}</span></p>}
          {stats && <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: '8px', display: 'inline-block' }}><strong>Время:</strong> {stats.time} ms | <strong>Вес:</strong> {stats.size} MB</div>}

          <div style={{ marginTop: '15px' }}>
            <button onClick={() => setShowHistory(!showHistory)} className="button button--teal">Ранее сжатые ({getCacheItems().length})</button>
            {showHistory && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'left', maxHeight: '200px', overflowY: 'auto' }}>
                  {getCacheItems().length === 0 ? <div style={{ color: '#666' }}>Нет сохранённых изображений</div> :
                      getCacheItems().map((item) => (
                          <div key={item.key} onClick={() => { touchCacheItem(item.key); setDownloadUrl(item.url); setStats(item.stats); setFileName(item.fileName); fileNameRef.current = item.fileName; setStatus(`Готово!`); setShowHistory(false); }} style={{ padding: '8px', borderBottom: '1px solid #ddd', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              <div className="preview-actions">
              <a href={downloadUrl} download="compressed.avif" className="button button--green" style={{ textDecoration: 'none'}}>Скачать .avif</a>
              <button onClick={openFullscreenPreview} className="button button--teal button--icon-only" title="Открыть в новой вкладке">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
            </div>
            </div>
        )}
      </div>
  );
}

export default App;