import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Signal, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { VideoPlayerProps } from '../types';

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

    if (!isPowerOn || !src) {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        if (dashRef.current) {
            // @ts-ignore - Dash types might not be perfectly inferred
            dashRef.current.reset();
            dashRef.current = null;
        }
        setIsLoading(false);
        return;
    }

    const initPlayer = () => {
      const video = videoRef.current;
      if (!video) return;

      // Cleanup previous instances
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (dashRef.current) {
        // @ts-ignore
        dashRef.current.reset();
        dashRef.current = null;
      }

      // INTELLIGENT STREAM DETECTION
      // 1. Check for DASH (.mpd)
      const isDash = src.includes('.mpd');
      
      // 2. Check for Static Video Files (MP4, MKV, etc) that should run natively
      //    We strip query params to check the extension of the path
      const cleanPath = src.split('?')[0].toLowerCase();
      const isStaticVideo = cleanPath.endsWith('.mp4') || cleanPath.endsWith('.mkv') || cleanPath.endsWith('.webm') || cleanPath.endsWith('.mov');

      // 3. HLS Fallback logic:
      //    If it contains .m3u8, it is HLS.
      //    If it is NOT Dash and NOT a static video file, we ASSUME it is HLS (e.g. php scripts, obfuscated links).
      //    This solves the issue with links like "php/artvYT.php" that redirect to m3u8.
      const isHls = src.includes('.m3u8') || (!isDash && !isStaticVideo);

      // --- DASH SETUP ---
      // @ts-ignore - Check if dashjs is available globally or imported
      if (isDash && typeof dashjs !== 'undefined') {
        console.log("Initializing DASH Player");
        // @ts-ignore
        const player = dashjs.MediaPlayer().create();
        player.initialize(video, src, true);
        
        // @ts-ignore
        player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
           setIsLoading(false);
           video.play().catch(e => console.warn("DASH Autoplay blocked", e));
        });
        
        // @ts-ignore
        player.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
           console.error("DASH Error", e);
           // If DASH fails, maybe try generic? But usually fatal.
           setIsLoading(false);
           setErrorState('fatal');
        });
        dashRef.current = player;
      } 
      // --- HLS SETUP ---
      else if (Hls.isSupported() && isHls) {
        console.log("Initializing HLS Player (hls.js)");
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          manifestLoadingTimeOut: 30000,
          manifestLoadingMaxRetry: 3,
          levelLoadingTimeOut: 30000,
          fragLoadingTimeOut: 30000,
          startFragPrefetch: true,
        });

        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          video.play().catch(e => console.warn("HLS Autoplay blocked", e));
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.warn("HLS Fatal Error:", data.type);
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
      // --- NATIVE SAFARI HLS / STANDARD VIDEO ---
      else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log("Initializing Native HLS (Safari)");
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          video.play().catch(e => console.warn("Autoplay blocked", e));
        });
        video.addEventListener('error', () => {
          setIsLoading(false);
          setErrorState('fatal');
        });
      } 
      // --- GENERIC FALLBACK ---
      else {
         console.log("Initializing Generic Video Player");
         video.src = src;
         video.play()
            .then(() => setIsLoading(false))
            .catch(() => {
                setIsLoading(false);
                setErrorState('fatal');
            });
      }
    };

    initPlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (dashRef.current) {
        // @ts-ignore
        dashRef.current.reset();
        dashRef.current = null;
      }
    };
  }, [src, isPowerOn]);

  if (!isPowerOn) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center relative overflow-hidden">
        {/* Screen reflection/glare */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent skew-y-12 pointer-events-none"></div>
        <div className="w-2 h-2 bg-red-900/50 rounded-full animate-pulse shadow-[0_0_10px_rgba(200,0,0,0.5)]"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black relative overflow-hidden group">
      {/* CRT Scanline Effect */}
      <div className="absolute inset-0 z-10 pointer-events-none scanlines opacity-20"></div>
      
      {/* Vignette */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)]"></div>

      {/* Info Banner - Top Channel Info */}
      <div 
        className={`absolute top-4 left-0 right-0 mx-auto w-[90%] md:w-[80%] bg-black/60 backdrop-blur-md z-30 
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

      {/* Video Element */}
      <video 
        ref={videoRef} 
        className="w-full h-full object-contain relative z-0" 
        playsInline 
      />

      {/* EPG / INFO BOTTOM BANNER */}
      {/* Displays EPG info or default text if unavailable */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pb-6 z-20 pointer-events-none">
          <div className="flex flex-col items-start gap-1 max-w-4xl mx-auto pl-2 md:pl-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]"></span>
                <span className="text-[10px] font-bold text-red-500 tracking-widest uppercase">LIVE BROADCAST</span>
              </div>
              <h3 className="text-white font-bold text-lg md:text-xl drop-shadow-md leading-tight">
                {channelInfo?.name || "Unknown Channel"}
              </h3>
              <p className="text-gray-300 text-sm font-mono opacity-80 mt-1 max-w-md">
                {currentProgram ? (
                   <span className="text-yellow-400 font-bold">{currentProgram}</span>
                ) : (
                   "Programación: Sin información disponible"
                )}
              </p>
          </div>
      </div>

      {/* Loading State */}
      {isLoading && !errorState && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/20">
            <Loader2 size={48} className="animate-spin text-blue-500 mb-2" />
            <p className="font-mono text-blue-400 tracking-widest text-xs animate-pulse">TUNING...</p>
        </div>
      )}

      {/* No Signal State */}
      {!src && !isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#101010]">
           <Signal size={64} className="animate-pulse mb-4 text-gray-700"/>
           <p className="font-mono text-gray-600 tracking-[0.5em] text-sm animate-pulse">NO SIGNAL</p>
        </div>
      )}

      {/* Error State */}
      {errorState === 'fatal' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white p-6 text-center animate-in fade-in duration-300">
            <AlertCircle size={48} className="mb-4 text-red-500"/>
            <h3 className="text-xl font-bold text-red-400 mb-2">SIGNAL LOST</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
                Unable to connect to the broadcast source.
            </p>
            <button 
                onClick={onRetry}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full text-sm font-bold transition-transform active:scale-95 shadow-lg shadow-red-900/20 pointer-events-auto"
            >
                <RefreshCw size={16} /> RECONNECT
            </button>
        </div>
      )}
    </div>
  );
};