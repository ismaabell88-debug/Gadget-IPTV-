import React, { useState, useRef } from 'react';
import { Power, Volume2, VolumeX, ChevronUp, ChevronDown, List, Plus, Minus } from 'lucide-react';
import { Channel, DecoderStatus } from './types';
import { parseM3U } from './utils/m3uParser';
import { VideoPlayer } from './components/VideoPlayer';
import { DecoderBox } from './components/DecoderBox';

// Reliable internal demo playlist to ensure it always works without CORS/Network issues
const DEMO_PLAYLIST_CONTENT = `#EXTM3U
#EXTINF:-1 group-title="Test" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_buck_bunny_poster_big.jpg",Big Buck Bunny
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
#EXTINF:-1 group-title="Test",Sintel
https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8
#EXTINF:-1 group-title="News",France 24 English
https://static.france24.com/live/F24_EN_LO_HLS/master_web.m3u8
#EXTINF:-1 group-title="Space",NASA TV
https://ntv1.akamaized.net/hls/live/2013530/NASA-TV-Public/master.m3u8`;

export default function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [powerOn, setPowerOn] = useState(true);
  const [showChannelList, setShowChannelList] = useState(false);
  const [decoderStatus, setDecoderStatus] = useState<DecoderStatus>('idle');
  const [showBanner, setShowBanner] = useState(false);
  
  const bannerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentChannel = channels[currentIdx];

  const triggerBanner = () => {
    setShowBanner(true);
    if (bannerTimeout.current) clearTimeout(bannerTimeout.current);
    bannerTimeout.current = setTimeout(() => setShowBanner(false), 4000);
  };

  const handleImport = async (content: string, isUrl: boolean) => {
    // If it's a URL, we try to fetch it.
    if (isUrl) {
      setDecoderStatus('loading');
      try {
        let text = '';
        try {
          // Attempt 1: Direct Fetch
          const response = await fetch(content);
          if (!response.ok) throw new Error('Direct fetch failed');
          text = await response.text();
        } catch (err) {
          console.warn("Direct fetch failed, attempting proxy...", err);
          // Attempt 2: CORS Proxy Fallback
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(content)}`;
          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error('Proxy fetch failed');
          text = await response.text();
        }
        
        processContent(text);

      } catch (error) {
        console.error("Import completely failed:", error);
        setDecoderStatus('error');
        setTimeout(() => setDecoderStatus(channels.length > 0 ? 'active' : 'idle'), 3000);
      }
    } else {
      // If it's raw text content (File upload or Internal Demo)
      setDecoderStatus('loading');
      // Small artificial delay for visual effect of "Processing"
      setTimeout(() => {
        processContent(content);
      }, 500);
    }
  };

  const processContent = (text: string) => {
    try {
        const parsed = parseM3U(text);
        if (parsed.length > 0) {
          setChannels(parsed);
          setCurrentIdx(0);
          setDecoderStatus('active');
          triggerBanner();
          // Auto-open list if it's the first load
          if (!powerOn) setPowerOn(true);
        } else {
          console.error("Parser returned 0 channels");
          setDecoderStatus('error');
          setTimeout(() => setDecoderStatus('idle'), 2000);
        }
    } catch (e) {
        console.error("Parsing error", e);
        setDecoderStatus('error');
        setTimeout(() => setDecoderStatus('idle'), 2000);
    }
  };

  const changeChannel = (dir: number) => {
    if (channels.length === 0 || !powerOn) return;
    let next = currentIdx + dir;
    if (next < 0) next = channels.length - 1;
    if (next >= channels.length) next = 0;
    setCurrentIdx(next);
    triggerBanner();
  };

  const selectChannel = (idx: number) => {
    if (!powerOn) return;
    setCurrentIdx(idx);
    setShowChannelList(false);
    triggerBanner();
  };

  const handleRetry = () => {
     const current = currentIdx;
     setCurrentIdx(-1);
     setTimeout(() => setCurrentIdx(current), 100);
  };

  const adjustVolume = (delta: number) => {
      setVolume(prev => {
          const newVol = Math.max(0, Math.min(1, prev + delta));
          return newVol;
      });
      if (isMuted) setIsMuted(false);
  };

  return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center p-4 md:p-8 gap-8 select-none font-sans overflow-y-auto overflow-x-hidden relative">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-black z-0 pointer-events-none"></div>
      
      <div className="relative z-10 w-full max-w-5xl flex flex-col gap-8 my-auto">
        
        {/* TOP: DECODER */}
        <div className="relative z-50">
            <DecoderBox 
                onImport={handleImport}
                onLoadDemo={() => handleImport(DEMO_PLAYLIST_CONTENT, false)} 
                status={decoderStatus}
                channelCount={channels.length}
                currentChannelIndex={currentIdx}
            />
        </div>

        {/* MIDDLE: TV & REMOTE CONTROL LAYOUT */}
        <div className="flex flex-col lg:flex-row gap-8 items-stretch relative z-0">
            
            {/* TV UNIT */}
            <div className="flex-1 relative aspect-video bg-gray-900 rounded-2xl p-4 md:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] border-8 border-[#1a1a1a] ring-1 ring-gray-800">
                {/* Branding */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/20 text-[10px] font-bold tracking-[0.5em] z-20 pointer-events-none">
                    STREAMMASTER
                </div>
                
                {/* Power LED */}
                <div className={`absolute bottom-3 right-6 w-1.5 h-1.5 rounded-full z-20 transition-all duration-500 ${powerOn ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-red-900'}`}></div>

                {/* Screen Container */}
                <div className="w-full h-full bg-black rounded overflow-hidden relative border border-gray-800 shadow-inner">
                    <VideoPlayer 
                        // IMPORTANT: The key prop forces React to destroy and recreate the player
                        // whenever the URL changes. This solves most "black screen" or stuck player issues.
                        key={currentChannel?.url || 'no-channel'}
                        src={currentChannel?.url}
                        volume={isMuted ? 0 : volume}
                        isPowerOn={powerOn}
                        channelInfo={currentChannel ? { ...currentChannel, index: currentIdx } : null}
                        showInfoBanner={showBanner}
                        onRetry={handleRetry}
                    />
                    
                    {/* Channel List Overlay */}
                    {showChannelList && powerOn && (
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-40 p-6 flex flex-col animate-in slide-in-from-right-10 duration-200">
                             <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                                <h3 className="text-xl font-bold text-white">Channel List</h3>
                                <button onClick={() => setShowChannelList(false)} className="text-gray-400 hover:text-white">✕</button>
                             </div>
                             {/* Added min-h-0 to fix scrolling in flex container */}
                             <div className="overflow-y-auto flex-1 space-y-1 pr-2 min-h-0">
                                {channels.map((ch, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => selectChannel(idx)}
                                        className={`w-full text-left px-3 py-2 rounded flex items-center gap-3 transition-colors ${idx === currentIdx ? 'bg-blue-900/50 text-blue-100 border border-blue-800' : 'text-gray-400 hover:bg-white/5'}`}
                                    >
                                        <span className="font-mono text-xs opacity-50">{String(idx + 1).padStart(3, '0')}</span>
                                        <span className="truncate text-sm">{ch.name}</span>
                                        {ch.group && <span className="ml-auto text-[10px] bg-gray-800 px-1.5 rounded text-gray-500">{ch.group}</span>}
                                    </button>
                                ))}
                                {channels.length === 0 && <div className="text-gray-500 text-center py-10 italic">No channels loaded</div>}
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {/* REMOTE CONTROL PANEL */}
            <div className="w-full lg:w-24 bg-[#222] rounded-xl border-t border-white/10 shadow-2xl p-4 flex lg:flex-col justify-between items-center gap-4 lg:gap-6">
                 
                 {/* Power Group */}
                 <button 
                    onClick={() => { setPowerOn(!powerOn); setShowBanner(false); }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${powerOn ? 'bg-green-600 text-white shadow-green-900/50' : 'bg-red-600 text-white shadow-red-900/50'}`}
                 >
                    <Power size={20} />
                 </button>

                 <div className="h-px w-full bg-white/10 hidden lg:block"></div>

                 {/* Channel Group */}
                 <div className="flex flex-row lg:flex-col gap-2">
                    <button onClick={() => changeChannel(1)} className="w-12 h-12 bg-[#333] hover:bg-[#444] rounded-lg text-white flex items-center justify-center shadow-lg active:translate-y-0.5 transition-all border-b-4 border-[#1a1a1a] active:border-b-0">
                        <ChevronUp size={24} />
                    </button>
                    <button onClick={() => changeChannel(-1)} className="w-12 h-12 bg-[#333] hover:bg-[#444] rounded-lg text-white flex items-center justify-center shadow-lg active:translate-y-0.5 transition-all border-b-4 border-[#1a1a1a] active:border-b-0">
                        <ChevronDown size={24} />
                    </button>
                 </div>

                 {/* Volume Group (UPDATED) */}
                 <div className="flex flex-row lg:flex-col gap-2 bg-[#1a1a1a] lg:bg-transparent p-1 lg:p-0 rounded-lg lg:rounded-none border lg:border-0 border-white/5">
                     <button onClick={() => adjustVolume(0.1)} className="w-10 h-10 lg:w-12 lg:h-12 bg-[#333] hover:bg-[#444] text-gray-300 rounded lg:rounded-lg flex items-center justify-center shadow-lg active:translate-y-0.5 transition-all border-b-0 lg:border-b-4 border-[#1a1a1a] active:border-b-0 active:bg-green-900/50">
                        <Plus size={18} />
                     </button>
                     <button onClick={() => setIsMuted(!isMuted)} className={`w-10 h-10 lg:w-12 lg:h-12 rounded lg:rounded-lg flex items-center justify-center shadow-lg active:translate-y-0.5 transition-all border-b-0 lg:border-b-4 border-[#1a1a1a] active:border-b-0 ${isMuted ? 'bg-yellow-700 text-white' : 'bg-[#333] text-gray-400 hover:bg-[#444]'}`}>
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                     </button>
                     <button onClick={() => adjustVolume(-0.1)} className="w-10 h-10 lg:w-12 lg:h-12 bg-[#333] hover:bg-[#444] text-gray-300 rounded lg:rounded-lg flex items-center justify-center shadow-lg active:translate-y-0.5 transition-all border-b-0 lg:border-b-4 border-[#1a1a1a] active:border-b-0 active:bg-red-900/50">
                        <Minus size={18} />
                     </button>
                 </div>

                 <div className="flex-1 hidden lg:block"></div>

                 {/* Menu Group */}
                 <button 
                    onClick={() => setShowChannelList(!showChannelList)}
                    className="w-12 h-12 bg-blue-700 hover:bg-blue-600 rounded-full text-white flex items-center justify-center shadow-lg active:scale-95 transition-all"
                    disabled={!powerOn}
                 >
                    <List size={20} />
                 </button>

            </div>
        </div>
      </div>
    </div>
  );
}