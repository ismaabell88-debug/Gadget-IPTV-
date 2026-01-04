import React, { useState } from 'react';
import { Upload, Globe, PlayCircle, Loader2 } from 'lucide-react';
import { DecoderBoxProps } from '../types';

export const DecoderBox: React.FC<DecoderBoxProps> = ({ 
  onImport, 
  onLoadDemo, 
  status, 
  channelCount, 
  currentChannelIndex 
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'url' | null>(null);
  const [url, setUrl] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
            onImport(ev.target.result as string, false); 
            setActiveTab(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const getDisplayText = () => {
    switch(status) {
        case 'loading': return 'BOOT...';
        case 'error': return 'ERR-01';
        case 'active': return `CH-${String(currentChannelIndex + 1).padStart(3, '0')}`;
        default: return 'READY';
    }
  };

  const getStatusColorClass = () => {
      if (status === 'error') return 'text-red-500 glow-text-error';
      if (status === 'loading') return 'text-yellow-400 animate-pulse';
      if (status === 'active') return 'text-green-500 glow-text';
      return 'text-green-500/50';
  };

  return (
    <div className="w-full max-w-xl mx-auto relative z-20 perspective-1000">
      {/* Main Box Chassis */}
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg p-1 shadow-[0_20px_50px_rgba(0,0,0,0.6)] border-t border-slate-700 border-b-4 border-black relative">
        
        {/* Front Panel Face */}
        {/* REMOVED: overflow-hidden to allow dropdown to show */}
        <div className="bg-slate-800 h-16 md:h-20 rounded md:rounded-lg flex items-center justify-between px-4 md:px-6 border border-slate-700 shadow-inner gap-4 relative">
            
            {/* Texture */}
            {/* ADDED: rounded classes to manually clip texture since parent is no longer overflow-hidden */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:4px_4px] rounded md:rounded-lg pointer-events-none"></div>

            {/* Brand/Model */}
            <div className="hidden md:block text-[10px] text-slate-500 font-mono absolute top-2 left-4 tracking-widest pointer-events-none">
                STB-2000 PRO
            </div>

            {/* LED Display */}
            <div className="flex items-center gap-4 flex-shrink-0 z-10 mt-2 md:mt-0">
                <div className="w-24 md:w-32 h-10 bg-black rounded border-2 border-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden relative">
                    <div className={`font-mono-display text-xl md:text-2xl font-bold tracking-widest relative z-10 ${getStatusColorClass()}`}>
                       {getDisplayText()}
                    </div>
                    {/* Screen reflection */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                </div>
                {/* Status Lights */}
                <div className="flex gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'active' || status === 'loading' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-green-900'}`}></div>
                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'error' ? 'bg-red-500 shadow-[0_0_5px_#ef4444]' : 'bg-red-900'}`}></div>
                </div>
            </div>

            {/* Controls Panel */}
            <div className="flex-1 flex justify-end items-center gap-3 relative z-10">
                
                {/* File Input Toggle */}
                <button 
                    onClick={() => setActiveTab(activeTab === 'file' ? null : 'file')}
                    className={`group relative h-8 md:h-10 px-3 bg-slate-700 rounded-sm border-b-2 border-black text-[10px] md:text-xs text-slate-300 font-bold hover:bg-slate-600 hover:text-white active:border-b-0 active:translate-y-[2px] transition-all flex items-center gap-2
                    ${activeTab === 'file' ? 'bg-slate-600 text-white border-b-0 translate-y-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]' : ''}`}
                >
                    <Upload size={14} className="group-hover:text-yellow-400 transition-colors"/> 
                    <span className="hidden sm:inline">LOCAL</span>
                </button>

                {/* URL Input Toggle */}
                <button 
                    onClick={() => setActiveTab(activeTab === 'url' ? null : 'url')}
                    className={`group relative h-8 md:h-10 px-3 bg-slate-700 rounded-sm border-b-2 border-black text-[10px] md:text-xs text-slate-300 font-bold hover:bg-slate-600 hover:text-white active:border-b-0 active:translate-y-[2px] transition-all flex items-center gap-2
                    ${activeTab === 'url' ? 'bg-slate-600 text-white border-b-0 translate-y-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]' : ''}`}
                >
                    <Globe size={14} className="group-hover:text-blue-400 transition-colors"/> 
                    <span className="hidden sm:inline">NETWORK</span>
                </button>

                {/* Dropdown Tray */}
                {activeTab && (
                    <div className="absolute top-full mt-2 right-0 w-72 bg-slate-800 border border-slate-600 p-4 shadow-2xl z-50 rounded-b-lg text-slate-200 animate-in slide-in-from-top-2 duration-200">
                        {/* Little triangle arrow pointing up */}
                        <div className="absolute -top-1.5 right-6 w-3 h-3 bg-slate-800 border-t border-l border-slate-600 rotate-45"></div>
                        
                        {/* File Tab */}
                        {activeTab === 'file' && (
                            <div className="space-y-4">
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-700 hover:bg-slate-600 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-6 h-6 mb-2 text-slate-400" />
                                        <p className="text-xs text-slate-400"><span className="font-semibold">Click to upload</span> .m3u</p>
                                    </div>
                                    <input type="file" className="hidden" accept=".m3u,.txt" onChange={handleFile}/>
                                </label>
                                
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-600"></span></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-800 px-2 text-slate-500">Or</span></div>
                                </div>

                                <button 
                                    onClick={() => { onLoadDemo(); setActiveTab(null); }} 
                                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-white text-xs py-2 rounded font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                                >
                                    <PlayCircle size={14}/> Load Demo Channel
                                </button>
                            </div>
                        )}

                        {/* URL Tab */}
                        {activeTab === 'url' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Remote Playlist URL</label>
                                    <input 
                                        value={url} 
                                        onChange={e=>setUrl(e.target.value)} 
                                        className="w-full bg-black/30 border border-slate-600 text-white text-xs p-2.5 rounded focus:ring-1 focus:ring-blue-500 outline-none font-mono" 
                                        placeholder="https://example.com/playlist.m3u"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button 
                                        disabled={!url || status === 'loading'}
                                        onClick={() => { if(url) { onImport(url, true); setActiveTab(null); setUrl(''); }}} 
                                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs px-4 py-2 rounded font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                                    >
                                        {status === 'loading' ? <Loader2 size={12} className="animate-spin"/> : 'Load Stream'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
      
      {/* Box Feet */}
      <div className="flex justify-between px-8 -mt-1 relative z-0">
         <div className="w-8 h-3 bg-black rounded-b-lg shadow-lg"></div>
         <div className="w-8 h-3 bg-black rounded-b-lg shadow-lg"></div>
      </div>
    </div>
  );
};