import React from "react";
import "./_shared/tokens.css";
import { PhoneFrame } from "./_shared/PhoneFrame";
import { ArrowLeft, PlayCircle, PauseCircle, XCircle, HardDrive, Share, Music, Settings2 } from "lucide-react";

export function DownloadManager() {
  const activeDownloads = [
    { id: 1, title: "M3 MacBook Pro Review: The Truth", size: "1.2 GB", progress: 65, speed: "12 MB/s", eta: "45s left", thumb: "/__mockup/images/thumb-tech.jpg" },
  ];

  const queuedDownloads = [
    { id: 2, title: "CyberTrack 2077 Gameplay 4K", size: "3.4 GB", status: "Queued", thumb: "/__mockup/images/thumb-gaming.jpg" }
  ];

  const completedDownloads = [
    { id: 3, title: "Cinematic Drone Journey", size: "450 MB", format: "1080p MP4", thumb: "/__mockup/images/thumb-nature.jpg" },
    { id: 4, title: "Perfect Espresso Shot", size: "120 MB", format: "720p MP4", thumb: "/__mockup/images/thumb-for-you-1.jpg" }
  ];

  return (
    <PhoneFrame>
      <div className="flex flex-col h-full bg-[#050507]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1F1F2E] bg-[#050507] z-30 sticky top-0">
          <div className="flex items-center gap-3">
            <button className="text-white hover:bg-white/10 p-1.5 rounded-full transition-colors -ml-1.5">
              <ArrowLeft size={22} />
            </button>
            <h1 className="vyde-display text-lg font-bold text-white">Download Manager</h1>
          </div>
          <button className="text-white hover:bg-white/10 p-1.5 rounded-full transition-colors">
            <Settings2 size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar relative">
          
          {/* Detailed Storage Ring */}
          <div className="p-6 pb-8 border-b border-[#1F1F2E]/30">
            <div className="flex justify-between items-center mb-6">
              <h3 className="vyde-display font-semibold text-white">Internal Storage</h3>
              <span className="text-xs text-[#E84A27] font-medium">96 GB Free</span>
            </div>
            
            {/* Horizontal Bar visualization instead of arc for variation & detail */}
            <div className="w-full h-3 bg-[#161620] rounded-full overflow-hidden flex shadow-inner border border-[#1F1F2E]">
              <div className="h-full bg-[#2A2A3D]" style={{ width: '15%' }} title="OS/Apps"></div>
              <div className="h-full bg-[#E84A27] relative" style={{ width: '10%' }}>
                <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/30 animate-pulse"></div>
              </div>
            </div>
            
            <div className="flex justify-between mt-3 text-xs">
              <div className="flex items-center gap-1.5 text-[#9999A6] font-medium">
                <div className="w-2 h-2 rounded-full bg-[#2A2A3D]"></div> Apps
              </div>
              <div className="flex items-center gap-1.5 text-white font-medium">
                <div className="w-2 h-2 rounded-full bg-[#E84A27]"></div> Vyde (12.4 GB)
              </div>
              <div className="flex items-center gap-1.5 text-[#666675] font-medium">
                <div className="w-2 h-2 rounded-full bg-[#161620] border border-[#2A2A3D]"></div> Free
              </div>
            </div>
          </div>

          {/* Active Section */}
          <div className="px-4 pt-6 pb-2">
            <h3 className="vyde-display text-sm font-semibold text-[#9999A6] uppercase tracking-wider mb-3">Downloading (1)</h3>
            {activeDownloads.map(item => (
              <div key={item.id} className="bg-[#0C0C12] border border-[#1F1F2E] rounded-xl p-3 mb-3">
                <div className="flex gap-3 mb-3">
                  <div className="w-24 aspect-video bg-[#161620] rounded-md overflow-hidden shrink-0">
                    <img src={item.thumb} alt="" className="w-full h-full object-cover opacity-80" />
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <h4 className="text-sm font-medium text-white leading-tight line-clamp-2">{item.title}</h4>
                    <p className="text-[11px] text-[#E84A27] mt-1 font-medium">{item.speed} • {item.eta}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-[#161620] rounded-full overflow-hidden">
                    <div className="h-full bg-[#E84A27]" style={{ width: `${item.progress}%` }}></div>
                  </div>
                  <span className="text-xs font-bold text-white w-8">{item.progress}%</span>
                  <div className="flex items-center gap-1 shrink-0 border-l border-[#2A2A3D] pl-3 ml-1">
                    <button className="p-1.5 text-white hover:bg-[#2A2A3D] rounded-full transition-colors"><PauseCircle size={18} /></button>
                    <button className="p-1.5 text-[#9999A6] hover:bg-[#2A2A3D] hover:text-white rounded-full transition-colors"><XCircle size={18} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Queued Section */}
          <div className="px-4 pt-2 pb-2">
            <h3 className="vyde-display text-sm font-semibold text-[#9999A6] uppercase tracking-wider mb-3">Queued (1)</h3>
            {queuedDownloads.map(item => (
              <div key={item.id} className="flex gap-3 px-1 py-2 opacity-60">
                <div className="w-16 aspect-video bg-[#161620] rounded-md overflow-hidden shrink-0">
                  <img src={item.thumb} alt="" className="w-full h-full object-cover grayscale" />
                </div>
                <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-center">
                  <h4 className="text-sm font-medium text-white leading-tight line-clamp-1">{item.title}</h4>
                  <p className="text-[11px] text-[#9999A6] mt-0.5">{item.size} • Waiting...</p>
                </div>
              </div>
            ))}
          </div>

          {/* Completed Section */}
          <div className="px-4 pt-6 pb-8">
            <h3 className="vyde-display text-sm font-semibold text-[#9999A6] uppercase tracking-wider mb-3">Completed (2)</h3>
            <div className="flex flex-col gap-4">
              {completedDownloads.map(item => (
                <div key={item.id} className="flex gap-3 px-1 group cursor-pointer">
                  <div className="w-24 aspect-video bg-[#161620] rounded-md overflow-hidden shrink-0 border border-[#1F1F2E] group-hover:border-[#2A2A3D]">
                    <img src={item.thumb} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <h4 className="text-sm font-medium text-white leading-tight line-clamp-2">{item.title}</h4>
                    <p className="text-[11px] text-[#666675] mt-1">{item.size} • {item.format}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export/Share Bottom Sheet Overlay (Mockup state) */}
          <div className="absolute inset-x-0 bottom-0 top-1/2 bg-black/60 backdrop-blur-sm z-40 hidden">
             {/* Shown hidden for default view, just mocking structural existence */}
          </div>
          
        </div>
      </div>
    </PhoneFrame>
  );
}
