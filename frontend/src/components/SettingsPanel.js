import React from 'react';

export const SettingsPanel = ({ quality, setQuality, effort, setEffort, scale, setScale, isQualityDisabled }) => {
    const disabled = isQualityDisabled;

    return (
        <div className="panel" style={{ marginBottom: '25px' }}>
            <h3 style={{ marginTop: 0, color: '#0056b3' }}>Настройки сжатия</h3>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '20px',
                }}
            >
                {/* Качество */}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                        Качество: {quality}%
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="100"
                        value={quality}
                        onChange={(e) => {
                            let val = parseInt(e.target.value, 10);
                            if (val >= 99.5) val = 100;
                            setQuality(val);
                        }}
                        disabled={disabled}
                        style={{
                            width: '100%',
                            appearance: 'none',
                            height: '10px',
                            borderRadius: '5px',
                            outline: 'none',
                            background: `linear-gradient(to right, #3498db 0%, #3498db ${
                                (quality - 1) / 0.99
                            }%, #e0e0e0 ${(quality - 1) / 0.99}%, #e0e0e0 100%)`,
                            opacity: disabled ? 0.6 : 1,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                        }}
                    />
                    <small style={{ display: 'block', marginTop: '8px', color: '#444', fontStyle: 'italic' }}>
                        {disabled
                            ? 'Недоступно в этом режиме'
                            : 'Высокое значение - лучшее качество и больший размер файла'}
                    </small>
                </div>

                {/* Степень сжатия */}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                        Степень сжатия: {effort}
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={effort}
                        onChange={(e) => {
                            let val = parseInt(e.target.value, 10);
                            if (val >= 9.5) val = 10;
                            setEffort(val);
                        }}
                        disabled={disabled}
                        style={{
                            width: '100%',
                            appearance: 'none',
                            height: '10px',
                            borderRadius: '5px',
                            outline: 'none',
                            background: `linear-gradient(to right, #3498db 0%, #3498db ${
                                ((effort - 1) / 9) * 100
                            }%, #e0e0e0 ${((effort - 1) / 9) * 100}%, #e0e0e0 100%)`,
                            opacity: disabled ? 0.6 : 1,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                        }}
                    />
                    <small style={{ display: 'block', marginTop: '8px', color: '#444', fontStyle: 'italic' }}>
                        {disabled
                            ? 'Недоступно в этом режиме'
                            : '1 - быстрее, 10 - качественнее (медленнее)'}
                    </small>
                </div>

                {/* Размер изображения */}
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                        Размер изображения: {scale}%
                    </label>
                    <input
                        type="range"
                        min="10"
                        max="100"
                        value={scale}
                        onChange={(e) => {
                            let val = parseInt(e.target.value, 10);
                            if (val >= 99.5) val = 100;
                            setScale(val);
                        }}
                        style={{
                            width: '100%',
                            appearance: 'none',
                            height: '10px',
                            borderRadius: '5px',
                            outline: 'none',
                            background: `linear-gradient(to right, #3498db 0%, #3498db ${
                                ((scale - 10) / 90) * 100
                            }%, #e0e0e0 ${((scale - 10) / 90) * 100}%, #e0e0e0 100%)`,
                        }}
                    />
                    <small style={{ display: 'block', marginTop: '8px', color: '#444', fontStyle: 'italic' }}>
                        Чем меньше масштаб, меньше размер файла
                    </small>
                </div>
            </div>
        </div>
    );
};