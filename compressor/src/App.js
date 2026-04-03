import React, { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
function App() {
  const API_URL = `http://${window.location.hostname}:3001`;
  const [status, setStatus] = useState('Инициализация кодека...');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [mode, setMode] = useState('hybrid');
  const [stats, setStats] = useState(null);

  const fileInputRef = useRef(null); //refresh для input файла

  const [quality, setQuality] = useState(35); //качество от 1 до 100 процентов
  const [effort, setEffort] = useState(4); //степень сжатия от 1 до 10 (1 = быстрее, 10 = качественнее итд)
  const [scale, setScale] = useState(100); //масштабирование от 10 до 100 процентов
  const [fileName, setFileName] = useState('');
  const worker = useMemo(() => new Worker(new URL('./Worker.js', import.meta.url)), []);

  useEffect(() => {
    worker.postMessage({ type: 'WARMUP' });

    worker.onmessage = (e) => {
      const { type, data, message, duration, label } = e.data;

      if (type === 'READY') {
        setIsReady(true);
        setStatus('Кодек готов. Выберите фото');
      } else if (type === 'DONE') {
        const blob = new Blob([data], { type: 'image/avif' });
        finalizeResult(blob, duration, label || 'Автономно');
      } else if (type === 'RAW_DATA') {
        handleHybridWrap(data, duration);
      } else if (type === 'ERROR') {
        setStatus(`Ошибка: ${message}`);
      }
    };
  }, [worker]);

  const finalizeResult = (blob, time, label) => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    setStats({ time, size: (blob.size / 1024 / 1024).toFixed(2) });
    setStatus(`Готово!`);
    if (fileInputRef.current) { fileInputRef.current.value = ''; }
  };

  const handleHybridWrap = async (rawData, clientTime) => {
    setStatus('Упаковка на сервере...');
    const formData = new FormData();
    formData.append('raw_av1', new Blob([rawData]));
    //отправка настроек на сервер
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
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setDownloadUrl(null);
    setStats(null);
    setStatus('Обработка...');

    const compressionSettings = {
      quality,
      effort,
      scale
    };

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
      }
    }
  };

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
        <h1 className="title" style={{ fontSize: '38px', marginBottom: '30px' }}>
          AVIF-Image-Compressor
        </h1>

        <div style={{ marginBottom: '25px' }}>
          <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="select"
          >
            <option value="hybrid">1. Гибрид (WebCodecs API + Упаковка на сервере)</option>
            <option value="client_fast">2. Автономно (WebCodecs API + Упаковка в браузере (FFmpeg))</option>
            <option value="client_software">3. Автономно (Jsquash)</option>
            <option value="server">4. Сервер (GPU/CPU (FFmpeg + Sharp))</option>
          </select>
        </div>

        <div className="panel" style={{ marginBottom: '25px' }}>
          <h3 style={{ marginTop: 0, color: '#0056b3' }}>Настройки сжатия</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Качество: {quality}%
              </label>
              <input
                  type="range"
                  min="1" max="100"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  style={{width: '100%', appearance: 'none', height: '10px', borderRadius: '5px', outline: 'none', background: `linear-gradient(to right, #3498db 0%, #3498db ${(quality - 1) / 0.99}%, #e0e0e0 ${(quality - 1) / 0.99}%, #e0e0e0 100%)`}}
              />
              <small style={{ display: 'block', marginTop: '8px', color: '#444', fontStyle: 'italic' }}>
                Высокое значение - лучшее качество и больший размер файла
              </small>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Степень сжатия: {effort}
              </label>
              <input
                  type="range"
                  min="1" max="10"
                  value={effort}
                  onChange={(e) => setEffort(parseInt(e.target.value))}
                  style={{width: '100%', appearance: 'none', height: '10px', borderRadius: '5px', outline: 'none', background: `linear-gradient(to right, #3498db 0%, #3498db ${(effort - 1) / 9 * 100}%, #e0e0e0 ${(effort - 1) / 9 * 100}%, #e0e0e0 100%)`}}
              />
              <small style={{ display: 'block', marginTop: '8px', color: '#444', fontStyle: 'italic' }}>
                1 - быстрее, 10 - качественнее (медленнее)
              </small>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Размер изображения: {scale}%
              </label>
              <input
                  type="range"
                  min="10" max="100"
                  value={scale}
                  onChange={(e) => setScale(parseInt(e.target.value))}
                  style={{width: '100%', appearance: 'none', height: '10px', borderRadius: '5px', outline: 'none', background: `linear-gradient(to right, #3498db 0%, #3498db ${(scale - 10) / 90 * 100}%, #e0e0e0 ${(scale - 10) / 90 * 100}%, #e0e0e0 100%)`}}
              />
              <small style={{ display: 'block', marginTop: '8px', color: '#444', fontStyle: 'italic' }}>
                Чем меньше масштаб, меньше размер файла
              </small>
            </div>
          </div>
        </div>

        <div className="panel" style={{ borderStyle: 'dashed', borderWidth: '3px', borderColor: 'rgba(52, 152, 219, 0.4)' }}>
          <div className="file-upload">
            <input
                id="file"
                type="file"
                accept="image/*"
                onChange={handleFile}
                disabled={!isReady}
                style={{ display: 'none' }}
            />
            <label htmlFor="file" className="button">
              Выберите файл
            </label>
          </div>

          {fileName && (
              <div style={{ marginTop: '12px', color: '#333', fontSize: '15px' }}>
                Файл: <strong>{fileName}</strong>
              </div>
          )}

          <p style={{ marginTop: '20px', fontSize: '18px' }}>
            Статус: <span style={{ color: '#0078d7', fontWeight: 'bold' }}>{status}</span>
          </p>

          {stats && (
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: '8px', display: 'inline-block' }}>
                <strong>Время:</strong> {stats.time} ms | <strong>Вес:</strong> {stats.size} MB
              </div>
          )}
        </div>

        {downloadUrl && (
            <div className="panel" style={{ marginTop: '40px' }}>
              <div style={{ marginBottom: '15px', fontWeight: 'bold', color: '#2c3e50' }}>Предпросмотр:</div>
              <img
                  src={downloadUrl}
                  alt="Result"
                  style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '12px', border: '4px solid white', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
              />
              <br />
              <a
                  href={downloadUrl}
                  download="compressed.avif"
                  className="button button--green"
                  style={{ textDecoration: 'none', marginTop: '25px' }}
              >
                Скачать .avif
              </a>
            </div>
        )}
      </div>
  );
}

export default App;
