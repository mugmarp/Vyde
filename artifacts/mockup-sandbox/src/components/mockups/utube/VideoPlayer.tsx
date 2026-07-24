import React from "react";
import "./_shared/tokens.css";
import { PhoneFrame } from "./_shared/PhoneFrame";
import { 
  ChevronDown, Cast, Settings, Maximize, Play, Pause, SkipForward, SkipBack, 
  MessageCircle, ThumbsUp, ThumbsDown, Share2, BookmarkPlus, Bell, CheckCircle2,
  Volume2, Sun
} from "lucide-react";

export function VideoPlayer() {
  return (
    <PhoneFrame>
      <div className="flex flex-col h-full bg-[#050507]">
        
        {/* Video Player Area - Cinematic */}
        <div className="relative w-full aspect-[16/9] bg-black z-40 group mt-0">
          <img 
            src="/__mockup/images/player-cinematic.jpg" 
            alt="Video frame" 
            className="w-full h-full object-cover"
          />
          
          {/* Player Chrome Overlay (Active State) */}
          <div className="absolute inset-0 bg-black/40 flex flex-col justify-between p-3 opacity-100 transition-opacity duration-300">
            
            {/* Top Bar */}
            <div className="flex items-start justify-between">
              <button className="text-white p-1 hover:bg-white/10 rounded-full transition-colors"><ChevronDown size={24} /></button>
              <div className="flex items-center gap-3">
                <button className="text-white p-1 hover:bg-white/10 rounded-full"><Cast size={20} /></button>
                <div className="px-1.5 py-0.5 rounded bg-white/20 backdrop-blur-md text-[10px] font-bold text-white tracking-wider">CC</div>
                <button className="text-white p-1 hover:bg-white/10 rounded-full"><Settings size={20} /></button>
              </div>
            </div>

            {/* Gesture Indicators (Teaching State) */}
            {/* Left: Brightness */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 opacity-80">
              <Sun size={20} className="text-white" />
              <div className="w-1 h-24 bg-white/20 rounded-full overflow-hidden">
                <div className="w-full h-[60%] bg-[#E84A27] mt-auto"></div>
              </div>
            </div>

            {/* Right: Volume */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 opacity-80">
              <Volume2 size={20} className="text-white" />
              <div className="w-1 h-24 bg-white/20 rounded-full overflow-hidden">
                <div className="w-full h-[80%] bg-white mt-auto"></div>
              </div>
            </div>

            {/* Double tap to seek ripple */}
            <div className="absolute right-1/4 top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center justify-center opacity-60">
              <div className="w-16 h-16 rounded-full bg-white/20 animate-ping absolute"></div>
              <div className="w-16 h-16 rounded-full bg-white/30 flex items-center justify-center backdrop-blur-sm z-10">
                <span className="text-white font-bold vyde-display text-sm">+10s</span>
              </div>
            </div>

            {/* Center Controls */}
            <div className="absolute inset-0 flex items-center justify-center gap-8 pointer-events-none">
              <button className="text-white p-3 hover:bg-white/10 rounded-full pointer-events-auto"><SkipBack size={28} fill="currentColor" /></button>
              <button className="text-white p-4 hover:bg-white/10 rounded-full pointer-events-auto bg-black/30 backdrop-blur-sm"><Pause size={36} fill="currentColor" /></button>
              <button className="text-white p-3 hover:bg-white/10 rounded-full pointer-events-auto"><SkipForward size={28} fill="currentColor" /></button>
            </div>

            {/* Bottom Bar */}
            <div className="flex items-center gap-3">
              <span className="text-white text-xs font-medium vyde-display w-10 text-right">04:12</span>
              
              {/* Scrub Bar */}
              <div className="flex-1 h-1 bg-white/30 rounded-full relative overflow-hidden group-hover:h-1.5 transition-all cursor-pointer">
                <div className="absolute left-0 top-0 bottom-0 bg-white/50 w-[45%]"></div>
                <div className="absolute left-0 top-0 bottom-0 bg-[#E84A27] w-[35%] relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow scale-0 group-hover:scale-100 transition-transform origin-center"></div>
                </div>
                {/* Chapter markers */}
                <div className="absolute left-[20%] top-0 bottom-0 w-0.5 bg-[#050507]"></div>
                <div className="absolute left-[45%] top-0 bottom-0 w-0.5 bg-[#050507]"></div>
                <div className="absolute left-[70%] top-0 bottom-0 w-0.5 bg-[#050507]"></div>
              </div>

              <span className="text-white/70 text-xs font-medium vyde-display w-10">18:40</span>
              <button className="text-white p-1 hover:bg-white/10 rounded-full"><Maximize size={18} /></button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#050507]">
          
          {/* Title & Info */}
          <div className="p-4 border-b border-[#1F1F2E]/30">
            <h1 className="text-lg font-semibold text-white leading-snug mb-2">
              Beyond The Atmosphere: The Cinematic Space Experience
            </h1>
            <div className="flex items-center gap-2 text-xs text-[#9999A6] font-medium">
              <span>1.2M views</span>
              <span className="w-1 h-1 rounded-full bg-[#666675]"></span>
              <span>2 days ago</span>
              <span className="w-1 h-1 rounded-full bg-[#666675]"></span>
              <span className="bg-[#161620] px-1.5 py-0.5 rounded text-[10px] text-white">4K HDR</span>
            </div>
          </div>

          {/* Channel Row */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-[#1F1F2E]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-[#2A2A3D]">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=cine&backgroundColor=161620" alt="Channel" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-white flex items-center gap-1">
                  CineMaster <CheckCircle2 size={12} className="text-[#9999A6]" />
                </h3>
                <p className="text-xs text-[#9999A6]">2.4M subscribers</p>
              </div>
            </div>
            <button className="bg-white text-black vyde-display font-bold text-[13px] px-5 py-2 rounded-full flex items-center gap-1.5 hover:bg-neutral-200 transition-colors">
              <Bell size={14} /> Subscribed
            </button>
          </div>

          {/* Actions Row */}
          <div className="px-4 py-4 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <div className="flex items-center bg-[#161620] rounded-full shrink-0">
              <button className="flex items-center gap-1.5 px-4 py-2 hover:bg-[#2A2A3D] rounded-l-full transition-colors border-r border-[#2A2A3D]">
                <ThumbsUp size={18} fill="currentColor" className="text-white" />
                <span className="text-sm font-medium text-white">124K</span>
              </button>
              <button className="px-4 py-2 hover:bg-[#2A2A3D] rounded-r-full transition-colors">
                <ThumbsDown size={18} className="text-white" />
              </button>
            </div>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-[#161620] hover:bg-[#2A2A3D] rounded-full shrink-0 transition-colors">
              <Share2 size={18} className="text-white" />
              <span className="text-sm font-medium text-white">Share</span>
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-[#161620] hover:bg-[#2A2A3D] rounded-full shrink-0 transition-colors">
              <BookmarkPlus size={18} className="text-white" />
              <span className="text-sm font-medium text-white">Save</span>
            </button>
          </div>

          {/* Comments Teaser */}
          <div className="mx-4 bg-[#0C0C12] rounded-xl p-3 border border-[#1F1F2E] cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="vyde-display font-semibold text-white">Comments</span>
                <span className="text-xs text-[#9999A6]">4,291</span>
              </div>
              <ChevronDown size={16} className="text-[#9999A6]" />
            </div>
            <div className="flex items-start gap-2">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=user1&backgroundColor=161620" className="w-6 h-6 rounded-full border border-[#2A2A3D]" />
              <p className="text-sm text-white line-clamp-2">The lighting in this shot is absolutely breathtaking. This channel never misses when it comes to cinematography.</p>
            </div>
          </div>

          {/* Up Next */}
          <div className="px-4 py-6">
            <h3 className="vyde-display font-semibold text-white mb-4">Up Next</h3>
            <div className="flex gap-3">
              <div className="w-[140px] aspect-video bg-[#161620] rounded-xl overflow-hidden shrink-0 relative">
                 <img src="/__mockup/images/thumb-tech.jpg" className="w-full h-full object-cover" />
                 <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-md px-1 py-[1px] rounded text-[9px] font-medium text-white">12:40</div>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white leading-snug line-clamp-2">Reviewing the sleekest matte black smartphone of 2024</h4>
                <p className="text-xs text-[#9999A6] mt-1">Tech Dimension</p>
                <p className="text-xs text-[#666675] mt-0.5">850K views • 5h ago</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PhoneFrame>
  );
}
