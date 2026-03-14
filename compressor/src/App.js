import React, { useState } from 'react';

function App() {
  const [status, setStatus] = useState('Выберите фото');
  const [downloadUrl, setDownloadUrl] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files[0]; // Берем первый файл
    if (!file) return;

    setStatus('Обработка...');

    const img = new Image();
    img.src = URL.createObjectURL(file);

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    // Важно: округляем до четного числа
    const w = img.naturalWidth % 2 === 0 ? img.naturalWidth : img.naturalWidth - 1;
    const h = img.naturalHeight % 2 === 0 ? img.naturalHeight : img.naturalHeight - 1;

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    const bitmap = await createImageBitmap(canvas);

    const worker = new Worker(new URL('./Worker.js', import.meta.url));
    worker.postMessage({ bitmap }, [bitmap]);

    worker.onmessage = (e) => {
      if (e.data.type === 'DONE') {
        const blob = new Blob([e.data.data], { type: 'image/avif' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setStatus('Готово!');
      }
    };
  };

  return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h1>AVIF Compressor</h1>
        <input type="file" accept="image/*" onChange={handleFile} />
        <p>Статус: <strong>{status}</strong></p>

        {downloadUrl && (
            <div style={{ marginTop: '20px' }}>
              <img src={downloadUrl} alt="Compressed" style={{ maxWidth: '100%', border: '1px solid #ccc' }} />
              <br />
              <a href={downloadUrl} download="compressed.avif" style={{ display: 'inline-block', marginTop: '10' }}>
                Скачать .avif
              </a>
            </div>
        )}
      </div>
  );
}

export default App;
