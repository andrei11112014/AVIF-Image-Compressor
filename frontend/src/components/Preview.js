import React from 'react';

export const Preview = ({ downloadUrl, fileName, stats }) => {
    if (!downloadUrl) return null;

    const openFullscreenPreview = () => {
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

        const img = document.createElement('img');
        img.src = downloadUrl;
        img.alt = 'AVIF Result';
        img.style.cssText = `
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      box-shadow: 0 0 30px rgba(0,0,0,0.5);
    `;

        container.appendChild(img);
        document.body.appendChild(container);

        const onFullscreenChange = () => {
            if (!document.fullscreenElement) {
                if (container.parentNode) {
                    container.parentNode.removeChild(container);
                }
                document.removeEventListener('fullscreenchange', onFullscreenChange);
            }
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);

        container.requestFullscreen().catch(err => {
            alert('Не удалось открыть полноэкранный режим. Возможно, браузер блокирует эту функцию.');
            console.error('Fullscreen error:', err);
            if (container.parentNode) container.parentNode.removeChild(container);
        });
    };

    return (
        <div className="panel" style={{ marginTop: '40px' }}>
            <div style={{ marginBottom: '15px', fontWeight: 'bold', color: '#0056b3', fontSize: '19px'}}>
                Предпросмотр
            </div>
            <img
                src={downloadUrl}
                alt="Result"
                style={{
                    maxWidth: '100%',
                    maxHeight: '500px',
                    borderRadius: '12px',
                    border: '4px solid white',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                }}
            />
            <div
                className="preview-actions"
                style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center',
                    marginTop: '25px',
                }}
            >
                <a
                    href={downloadUrl}
                    download="compressed.avif"
                    className="button button--green"
                    style={{ textDecoration: 'none' }}
                >
                    Скачать .avif
                </a>
                <button
                    onClick={openFullscreenPreview}
                    className="button button--teal button--icon"
                    title="Открыть на весь экран"
                    style={{
                        width: '60px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                    }}
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </button>
            </div>
        </div>
    );
};