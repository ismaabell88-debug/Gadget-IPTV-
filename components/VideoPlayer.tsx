import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Signal, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { VideoPlayerProps } from '../types';

declare const dashjs: any;

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  src, 
  volume, 
  isPowerOn, 
  channelInfo,
  currentProgram,
  showInfoBanner,
  onRetry
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<any | null>(null);
  const [errorState, setErrorState] = useState<'retry' | 'fatal' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Volume effect
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  // Source change effect
  useEffect(() => {
    setErrorState(null);
    setIsLoading(true);

    // Guard clause: If power is off or no src, clean up and stop.
    if (!isPowerOn || !src) {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        if (dashRef.current) {
            // @ts-ignore
            dashRef.current.reset();
            dashRef.current = null;
        }
        setIsLoading(false);
        return;
    }

    const initPlayer = (videoSrc: string) => {
      const video = videoRef.current;
      if (!video) return;

      // Cleanup existing players
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (dashRef.current) { 
        // @ts-ignore
        dashRef.current.reset(); dashRef.current = null; 
      }

      // INTELLIGENT STREAM DETECTION
      const isDash = videoSrc.includes('.mpd');
      // Use a safe check for extensions by stripping query params
      const cleanPath = videoSrc.split('?')[0].toLowerCase();
      const isStaticVideo = cleanPath.endsWith('.mp4') || cleanPath.endsWith('.mkv') || cleanPath.endsWith('.webm') || cleanPath.endsWith('.mov');
      
      // HLS Fallback: If explicit m3u8 OR not Dash/Static, assume HLS (handles obfuscated URLs)
      const isHls = videoSrc.includes('.m3u8') || (!isDash && !isStaticVideo);

      // --- DASH SETUP ---
      if (isDash && typeof dashjs !== 'undefined') {
        // @ts-ignore
        const player = dashjs.MediaPlayer().create();
        player.initialize(video, videoSrc, true);
        // @ts-ignore
        player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
           setIsLoading(false);
           video.play().catch(e => console.warn("DASH Autoplay blocked", e));
        });
        // @ts-ignore
        player.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
           console.error("DASH Error", e);
           setIsLoading(false);
           setErrorState('fatal');
        });
        dashRef.current = player;
      } 
      // --- HLS SETUP ---
      else if (Hls.isSupported() && isHls) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });

        hlsRef.current = hls;
        hls.loadSource(videoSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          video.play().catch(e => console.warn("HLS Autoplay blocked", e));
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                setIsLoading(false);
                setErrorState('fatal');
                hls.destroy();
                break;
            }
          }
        });
      } 
      // --- NATIVE SAFARI HLS ---
      else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoSrc;
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          video.play().catch(e => console.warn("Autoplay blocked", e));
        });
        video.addEventListener('error', () => {
          setIsLoading(false);
          setErrorState('fatal');
        });
      } 
      // --- GENERIC VIDEO ---
      else {
         video.src = videoSrc;
         video.play()
            .then(() => setIsLoading(false))
            .catch(() => { setIsLoading(false); setErrorState('fatal'); });
      }
    };

    // We passed the guard check above, so src is string here.
    initPlayer(src);

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (dashRef.current) { 
        // @ts-ignore
        dashRef.current.reset(); dashRef.current = null; 
      }
    };
  }, [src, isPowerOn]);

  if (!isPowerOn) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent skew-y-12 pointer-events-none"></div>
        <div className="w-2 h-2 bg-red-900/50 rounded-full animate-pulse shadow-[0_0_10px_rgba(200,0,0,0.5)]"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black relative overflow-hidden group">
      <div className="absolute inset-0 z-10 pointer-events-none scanlines opacity-20"></div>
      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)]"></div>

      {/* Top Channel Banner */}
      <div 
        className={`absolute top-4 left-0 right-0 mx-auto w-[90%] md:w-[80%] bg-black/70 backdrop-blur-md z-30 
        transition-all duration-500 ease-out transform rounded-lg border border-white/10 p-4 shadow-2xl
        ${showInfoBanner ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}
      >
        <div className="flex items-center gap-4">
           <div className="text-4xl font-mono-display font-bold text-yellow-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {channelInfo?.index !== undefined ? String(channelInfo.index + 1).padStart(3, '0') : '---'}
           </div>
           {channelInfo?.logo && (
              <div className="w-12 h-12 bg-white/5 rounded p-1 flex items-center justify-center border border-white/10">
                  <img src={channelInfo.logo} className="max-w-full max-h-full object-contain" alt="Logo" onError={(e) => e.currentTarget.style.display = 'none'} />
              </div>
           )}
           <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-white truncate drop-shadow-md">
                {channelInfo?.name || "No Signal"}
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-gray-300">
                  <span className="bg-blue-600/80 px-1.5 py-0.5 rounded text-[10px] tracking-wider">HD</span>
                  <span>{channelInfo?.group || "General"}</span>
              </div>
           </div>
        </div>
      </div>

      <video ref={videoRef} className="w-full h-full object-contain relative z-0" playsInline />

      {/* EPG / INFO BOTTOM BANNER */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-md border-t border-white/10 p-4 pb-6 transition-all duration-300">
              <div className="flex flex-col items-start gap-1 max-w-4xl mx-auto pl-2 md:pl-0">
                  <div className="flex items-center gap-3 w-full">
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]"></span>
                        <span className="text-[10px] font-bold text-red-500 tracking-widest uppercase">EN VIVO</span>
                      </div>
                      <div className="w-px h-3 bg-white/20"></div>
                      <div className="text-white/70 text-xs font-bold uppercase tracking-wider truncate">
                         {channelInfo?.name}
                      </div>
                  </div>

                  <div className="mt-1 w-full">
                      {currentProgram ? (
                         <h3 className="text-yellow-400 font-bold text-lg md:text-xl drop-shadow-sm leading-tight animate-in slide-in-from-bottom-2 duration-500">
                            {currentProgram}
                         </h3>
                      ) : (
                         <h3 className="text-white/40 font-mono text-sm md:text-base italic">
                            Sin información disponible
                         </h3>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {isLoading && !errorState && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/20">
            <Loader2 size={48} className="animate-spin text-blue-500 mb-2" />
            <p className="font-mono text-blue-400 tracking-widest text-xs animate-pulse">SINTONIZANDO...</p>
        </div>
      )}

      {!src && !isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#101010]">
           <Signal size={64} className="animate-pulse mb-4 text-gray-700"/>
           <p className="font-mono text-gray-600 tracking-[0.5em] text-sm animate-pulse">SIN SEÑAL</p>
        </div>
      )}

      {errorState === 'fatal' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white p-6 text-center animate-in fade-in duration-300">
            <AlertCircle size={48} className="mb-4 text-red-500"/>
            <h3 className="text-xl font-bold text-red-400 mb-2">ERROR DE SEÑAL</h3>
            <button 
                onClick={onRetry}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full text-sm font-bold transition-transform active:scale-95 shadow-lg shadow-red-900/20 pointer-events-auto"
            >
                <RefreshCw size={16} /> REINTENTAR
            </button>
        </div>
      )}
    </div>
  );
};