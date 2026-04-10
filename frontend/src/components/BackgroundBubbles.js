import React from 'react';

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

export const BackgroundBubbles = () => {
    return (
        <div className="bubbles-wrapper">
            {bubbleConfigs.map((b, i) => (
                <div
                    key={i}
                    className={`bubble bubble--type-${b.t}`}
                    style={{ width: `${b.w}px`, height: `${b.w}px`, left: `${b.l}%`, animationDelay: b.d }}
                />
            ))}
        </div>
    );
};