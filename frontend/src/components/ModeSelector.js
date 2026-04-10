import React, { useMemo } from 'react';

const ALL_MODES = [
    { value: 'hybrid', label: '🔄 Полусерверный режим' },
    { value: 'server', label: '☁️ Серверный режим' },
    { value: 'client_software', label: '💻 Автономный режим' },
    { value: 'client_fast', label: '🧪 Автономный режим (бета)' }
];

export const ModeSelector = ({ mode, setMode, webCodecsAvailable, isOnline }) => {
    const availableModes = useMemo(() => {
        return ALL_MODES.filter(m => {
            if ((m.value === 'hybrid' || m.value === 'client_fast') && !webCodecsAvailable) {
                return false;
            }
            return true;
        });
    }, [webCodecsAvailable]);

    return (
        <div style={{ marginBottom: '25px' }}>
            <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="select"
                disabled={webCodecsAvailable === null}
            >
                {availableModes.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>

            {!isOnline && mode === 'server' && (
                <div className="mode-warning">
                    Нет интернета – серверный режим может не работать
                </div>
            )}
            {(mode === 'hybrid' || mode === 'client_fast') &&
                webCodecsAvailable === false && (
                    <div className="mode-warning">
                        Ваш браузер не поддерживает ускоренное сжатие, выберите другой режим
                    </div>
                )}
        </div>
    );
};