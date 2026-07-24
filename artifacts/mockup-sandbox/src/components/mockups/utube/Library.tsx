import React from "react";
import "./_shared/tokens.css";
import { PhoneFrame } from "./_shared/PhoneFrame";
import { BottomNav } from "./_shared/BottomNav";
import { Download, MoreVertical, HardDrive, Check, PlayCircle, Share, Trash2 } from "lucide-react";

export function Library() {
  const downloads = [
    { id: 1, title: "Exploring the Cyberpunk Aesthetics in Modern Film", channel: "CineMaster", size: "450 MB", quality: "1080p", date: "Downloaded today", thumb: "/__mockup/images/thumb-for-you-2.jpg", status: "done" },
    { id: 2, title: "How to Build a Custom Mechanical Keyboard", channel: "Tech Dimension", size: "280 MB", quality: "1080p", date: "Downloaded yesterday", thumb: "/__mockup/images/thumb-tech.jpg", status: "done" },
    { id: 3, title: "The Art of the Perfect Espresso Shot", channel: "Coffee Notes", size: "120 MB", quality: "720p", date: "Downloaded 3 days ago", thumb: "/__mockup/images/thumb-for-you-1.jpg", status: "done", showMenu: true }
  ];

  return (
    <PhoneFrame>
      <div className="flex flex-col h-full bg-[#050507]">
        
        {/* Header Tabs */}
        <div className="flex items-center px-6 py-4 border-b border-[#1F1F2E]/50 sticky top-0 bg-[#050507]/90 backdrop-blur-md z-30">
          <div className="flex gap-6 w-full">
            <button className="vyde-display text-lg font-semibold text-white border-b-2 border-[#E84A27] pb-2">Downloads</button>
            <button className="vyde-display text-lg font-semibold text-[#666675] hover:text-white pb-2 transition-colors">Playlists</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">
          
          {/* Storage Visualization (Cinematic Arc) */}
          <div className="p-6 flex flex-col items-center border-b border-[#1F1F2E]/30 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#E84A27]/5 to-transparent"></div>
            
            <div className="relative w-48 h-24 mb-4">
              {/* Background Arc */}
              <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#161620" strokeWidth="8" strokeLinecap="round" />
                {/* Used Arc */}
                <path d="M 10 50 A 40 40 0 0 1 70 20" fill="none" stroke="#E84A27" strokeWidth="8" strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(232,74,39,0.5)]" />
              </svg>
              
              <div className="absolute bottom-0 inset-x-0 flex flex-col items-center text-center">
                <span className="vyde-display text-3xl font-bold text-white tracking-tight">32<span className="text-lg text-[#9999A6]">GB</span></span>
                <span className="text-xs text-[#9999A6] font-medium flex items-center gap-1 mt-1">
                  <HardDrive size={12} /> Used of 128GB
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-medium w-full justify-center px-4">
              <div className="flex items-center gap-1.5 text-white">
                <div className="w-2 h-2 rounded-full bg-[#E84A27] shadow-[0_0_8px_rgba(232,74,39,0.5)]"></div>
                Vyde (4.2GB)
              </div>
              <div className="flex items-center gap-1.5 text-[#666675]">
                <div className="w-2 h-2 rounded-full bg-[#161620]"></div>
                Free (96GB)
              </div>
            </div>
          </div>

          {/* List Header */}
          <div className="px-4 pt-6 pb-2 flex items-center justify-between">
            <h3 className="vyde-display font-semibold text-white">Downloaded Videos</h3>
            <button className="text-xs font-medium text-[#E84A27]">Manage</button>
          </div>

          {/* Downloads List */}
          <div className="flex flex-col">
            {downloads.map((item) => (
              <div key={item.id} className="relative">
                <div className="flex gap-3 px-4 py-3 hover:bg-[#0C0C12] transition-colors cursor-pointer group">
                  <div className="w-36 aspect-video bg-[#161620] rounded-lg overflow-hidden shrink-0 relative border border-[#1F1F2E] group-hover:border-[#2A2A3D]">
                    <img src={item.thumb} alt={item.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-md px-1 py-[1px] rounded text-[9px] font-bold text-white">{item.quality}</div>
                    <div className="absolute top-1.5 left-1.5 bg-[#E84A27] rounded-full p-0.5 shadow-lg">
                      <Check size={10} className="text-white" strokeWidth={3} />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 py-0.5">
                    <h4 className="text-sm font-medium text-white leading-snug line-clamp-2 pr-4">{item.title}</h4>
                    <p className="text-xs text-[#9999A6] mt-1 line-clamp-1">{item.channel}</p>
                    <p className="text-[11px] text-[#666675] mt-1">{item.size} • {item.date}</p>
                  </div>
                  
                  <button className="p-2 text-[#666675] hover:text-white self-start -mr-2">
                    <MoreVertical size={18} />
                  </button>
                </div>

                {/* Inline Action Menu Mockup for item 3 */}
                {item.showMenu && (
                  <div className="absolute right-4 top-12 w-48 bg-[#161620] border border-[#2A2A3D] rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <button className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#2A2A3D] flex items-center gap-3 transition-colors">
                      <PlayCircle size={16} /> Play
                    </button>
                    <button className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#2A2A3D] flex items-center gap-3 transition-colors">
                      <Share size={16} /> Export / Share
                    </button>
                    <div className="h-px bg-[#2A2A3D] mx-2"></div>
                    <button className="w-full px-4 py-3 text-left text-sm text-[#E84A27] hover:bg-[#E84A27]/10 flex items-center gap-3 transition-colors font-medium">
                      <Trash2 size={16} /> Delete Download
                    </button>
                  </div>
                )}
                
                {/* Delete Confirmation Overlay (Mockup for item 3) */}
                {item.showMenu && (
                  <div className="absolute inset-0 z-30 hidden">
                     {/* Shown inline if toggled, hiding for clean initial view */}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

        <BottomNav activeTab="library" />
      </div>
    </PhoneFrame>
  );
}
