import React from 'react';

export const FileUpload = ({ inputKey, onFileSelect, isReady, webCodecsAvailable, fileName, status, stats }) => {
    return (
        <>
            <div className="file-upload">
                <input
                    key={inputKey}
                    id="file"
                    type="file"
                    accept="image/*"
                    onChange={onFileSelect}
                    disabled={!isReady || webCodecsAvailable === null}
                    style={{ display: 'none' }}
                />
                <label htmlFor="file" className="button button--blue">
                    Выберите файл
                </label>
            </div>
            {fileName && (
                <div style={{ marginTop: '12px', color: '#333', fontSize: '15px' }}>
                    Файл: <strong>{fileName}</strong>
                </div>
            )}
            {status && (
                <p style={{ marginTop: '20px', fontSize: '18px' }}>
                    <span style={{ color: '#0078d7', fontWeight: 'bold' }}>{status}</span>
                </p>
            )}
            {stats && (
                <div
                    style={{
                        marginTop: '10px',
                        padding: '10px',
                        backgroundColor: 'rgba(255,255,255,0.4)',
                        borderRadius: '8px',
                        display: 'inline-block',
                    }}
                >
                    <strong>Время:</strong> {stats.time} ms | <strong>Вес:</strong> {stats.size} MB
                </div>
            )}
        </>
    );
};