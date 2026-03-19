import React, { useState, useEffect, useMemo } from 'react';

function App() {
  const [status, setStatus] = useState('Инициализация кодека...');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [mode, setMode] = useState('hybrid');
  const [stats, setStats] = useState(null);

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
  };

  const handleHybridWrap = async (rawData, clientTime) => {
    setStatus('Упаковка на сервере...');
    const formData = new FormData();
    formData.append('raw_av1', new Blob([rawData]));

    try {
      const res = await fetch('http://localhost:3001/wrap-avif', { method: 'POST', body: formData });
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

    setDownloadUrl(null);
    setStats(null);
    setStatus('Обработка...');

    if (mode === 'server') {
      const fd = new FormData();
      fd.append('image', file);
      try {
        const res = await fetch('http://localhost:3001/compress', { method: 'POST', body: fd });
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
        worker.postMessage({ bitmap, mode }, [bitmap]);
        URL.revokeObjectURL(img.src);
      } catch (err) {
        setStatus('Ошибка обработки изображения');
      }
    }
  };

  return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '30px' }}>AVIF-Image-Compressor
        </h1>

        <div style={{ marginBottom: '25px' }}>
          <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={{ padding: '12px 20px', fontSize: '16px', borderRadius: '8px', border: '2px solid #3498db' }}
          >
            <option value="hybrid">1. Гибрид (WebCodecs API + Упаковка на сервере)</option>
            <option value="client_fast">2. Автономно (WebCodecs API + Упаковка в браузере (FFmpeg))</option>
            <option value="client_software">3. Автономно (Jsquash)</option>
            <option value="server">4. Сервер (GPU/CPU (FFmpeg + Sharp))</option>
          </select>
        </div>

        <div style={{ border: '3px dashed #bdc3c7', padding: '40px', borderRadius: '15px', backgroundColor: '#fdfdfd' }}>
          <input type="file" accept="image/*" onChange={handleFile} disabled={!isReady} style={{ fontSize: '16px' }} />
          <p style={{ marginTop: '20px', fontSize: '18px' }}>
            Статус: <span style={{ color: '#3498db', fontWeight: 'bold' }}>{status}</span>
          </p>
          {stats && (
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#eef2f3', borderRadius: '5px', display: 'inline-block' }}>
                <strong>Время:</strong> {stats.time} ms | <strong>Вес:</strong> {stats.size} MB
              </div>
          )}
        </div>

        {downloadUrl && (
            <div style={{ marginTop: '40px' }}>
              <div style={{ marginBottom: '15px', fontWeight: 'bold', color: '#7f8c8d' }}>Предпросмотр:</div>
              <img src={downloadUrl} alt="Result" style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '12px', boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }} />
              <br />
              <a
                  href={downloadUrl}
                  download="compressed.avif"
                  style={{
                    display: 'inline-block',
                    marginTop: '25px',
                    padding: '15px 40px',
                    backgroundColor: '#27ae60',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '10px',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
              >
                Скачать .avif
              </a>
            </div>
        )}
      </div>
  );
}

export default App;
