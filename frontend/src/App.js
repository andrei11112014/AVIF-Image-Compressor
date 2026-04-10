/* global VideoEncoder AudioEncoder */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';

import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useWebCodecs } from './hooks/useWebCodecs';
import { useCache } from './hooks/useCache';
import { useCompression } from './hooks/useCompression';
import { useFileHandler } from './hooks/useFileHandler';
import { useFinalizeResult } from './hooks/useFinalizeResult';
import { useHistorySelect } from './hooks/useHistorySelect';

import { BackgroundBubbles } from './components/BackgroundBubbles';
import { ModeSelector } from './components/ModeSelector';
import { SettingsPanel } from './components/SettingsPanel';
import { FileUpload } from './components/FileUpload';
import { HistoryPanel } from './components/HistoryPanel';
import { Preview } from './components/Preview';

function App() {
  const [status, setStatus] = useState('Инициализация...');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [mode, setMode] = useState('hybrid');
  const [stats, setStats] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  const [quality, setQuality] = useState(70);
  const [effort, setEffort] = useState(4);
  const [scale, setScale] = useState(100);
  const [fileName, setFileName] = useState('');

  const qualityRef = useRef(quality);
  const effortRef = useRef(effort);
  const scaleRef = useRef(scale);
  const fileInputRef = useRef(null);
  const fileNameRef = useRef('');
  const currentDownloadUrlRef = useRef(null);

  useEffect(() => { qualityRef.current = quality; }, [quality]);
  useEffect(() => { effortRef.current = effort; }, [effort]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { currentDownloadUrlRef.current = downloadUrl; }, [downloadUrl]);

  const isOnline = useOnlineStatus();
  const { webCodecsAvailable, hardwarePreference, checkWebCodecsSupport } = useWebCodecs();
  const { cache, addToCache, touchCacheItem, getCacheItems } = useCache();

  const worker = useMemo(() => new Worker(new URL('./workers/Worker.js', import.meta.url)), []);

  // useFinalizeResult должен быть объявлен до useCompression, так как передаётся в него
  const finalizeResult = useFinalizeResult({
    setDownloadUrl,
    setStats,
    setStatus,
    setInputKey,
    addToCache,
    fileNameRef,
    qualityRef,
    effortRef,
    scaleRef,
    mode,
    currentDownloadUrlRef,
    fileInputRef,
  });

  const { initWorker, compress } = useCompression({
    worker,
    mode,
    qualityRef,
    effortRef,
    scaleRef,
    hardwarePreference,
    webCodecsAvailable,
    finalizeResult,
    setStatus,
    setIsReady,
  });

  useEffect(() => {
    const init = async () => {
      const supported = await checkWebCodecsSupport();
      if (!supported) setStatus('Ограниченный режим');
      else setStatus('');
    };
    init();
  }, [checkWebCodecsSupport]);

  useEffect(() => {
    initWorker();
  }, [initWorker]);

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

  const handleFile = useFileHandler({
    compress,
    cache,
    touchCacheItem,
    qualityRef,
    effortRef,
    scaleRef,
    mode,
    setStatus,
    setDownloadUrl,
    setStats,
    setFileName,
    fileInputRef,
    fileNameRef,
    setInputKey,
  });

  const handleHistorySelect = useHistorySelect({
    touchCacheItem,
    setDownloadUrl,
    setStats,
    setFileName,
    fileNameRef,
    setStatus,
    setShowHistory,
  });

  const isQualityDisabled = () => {
    return mode === 'client_fast' || mode === 'hybrid';
  };

  return (
      <div style={{ padding: '40px', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
        <BackgroundBubbles />
        <h1 className="title" style={{ fontSize: '44px',
          marginBottom: '25px',
          fontWeight: '850',
          textAlign: 'center',
          letterSpacing: '-1px',
          background: 'linear-gradient(to bottom, #4facfe 0%, #3498db 35%, #0056b3 60%, #4facfe 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 3px 2px #fff)',
          padding: '10px 0'}}>
          AVIF Image Compressor
        </h1>

        <ModeSelector
            mode={mode}
            setMode={setMode}
            webCodecsAvailable={webCodecsAvailable}
            isOnline={isOnline}
        />

        <SettingsPanel
            quality={quality}
            setQuality={setQuality}
            effort={effort}
            setEffort={setEffort}
            scale={scale}
            setScale={setScale}
            isQualityDisabled={isQualityDisabled()}
        />

        <div className="panel" style={{ borderStyle: 'dashed', borderWidth: '3px', borderColor: 'rgba(52, 152, 219, 0.4)' }}>
          <FileUpload
              inputKey={inputKey}
              onFileSelect={handleFile}
              isReady={isReady}
              webCodecsAvailable={webCodecsAvailable}
              fileName={fileName}
              status={status}
              stats={stats}
          />
          <HistoryPanel
              showHistory={showHistory}
              setShowHistory={setShowHistory}
              cacheItems={getCacheItems()}
              onSelectItem={handleHistorySelect}
          />
        </div>

        <Preview
            downloadUrl={downloadUrl}
            fileName={fileName}
            stats={stats}
        />
      </div>
  );
}

export default App;