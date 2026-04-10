import React from 'react';

export const HistoryPanel = ({ showHistory, setShowHistory, cacheItems, onSelectItem }) => {
    return (
        <div style={{ marginTop: '15px' }}>
            <div className="file-upload" style={{ margin: 0 }}>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="button button--teal"
                >
                    Ранее сжатые ({cacheItems.length})
                </button>
            </div>
            {showHistory && (
                <div
                    style={{
                        marginTop: '10px',
                        padding: '10px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        textAlign: 'left',
                        maxHeight: '200px',
                        overflowY: 'auto',
                    }}
                >
                    {cacheItems.length === 0 ? (
                        <div style={{ color: '#666' }}>Нет сохранённых изображений</div>
                    ) : (
                        cacheItems.map((item) => (
                            <div
                                key={item.key}
                                onClick={() => onSelectItem(item)}
                                style={{
                                    padding: '8px',
                                    borderBottom: '1px solid #ddd',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                <span>
                  📷 {item.fileName}{' '}
                    <span style={{ fontSize: '10px', color: '#555' }}>
                    (кач:{item.quality}%, ст.:{item.effort}, масштаб:{item.scale}%)
                  </span>
                </span>
                                <span style={{ fontSize: '12px', color: '#666' }}>
                  {item.stats.size} MB / {item.stats.time} ms
                </span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};