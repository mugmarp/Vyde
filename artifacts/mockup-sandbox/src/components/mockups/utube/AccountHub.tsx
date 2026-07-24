import React from "react";
import "./_shared/tokens.css";
import { PhoneFrame } from "./_shared/PhoneFrame";
import { BottomNav } from "./_shared/BottomNav";
import { Settings, ChevronRight, History, ThumbsUp, ListVideo, ShieldCheck, PlayCircle } from "lucide-react";

export function AccountHub() {
  const subscriptions = [
    { name: "CineMaster", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=cine&backgroundColor=161620" },
    { name: "Tech Dimension", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=tech&backgroundColor=161620" },
    { name: "WanderLens", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=nature&backgroundColor=161620" },
    { name: "Audiophile", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=audio&backgroundColor=161620" },
    { name: "Pixel Pushers", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=gaming&backgroundColor=161620" }
  ];

  const watchHistory = [
    { title: "Beyond The Atmosphere", thumb: "/__mockup/images/player-cinematic.jpg" },
    { title: "M3 MacBook Pro Review", thumb: "/__mockup/images/thumb-tech.jpg" },
    { title: "CyberTrack 2077 Reveal", thumb: "/__mockup/images/thumb-gaming.jpg" }
  ];

  return (
    <PhoneFrame>
      <div className="flex flex-col h-full bg-[#050507]">
        
        {/* Header Actions */}
        <div className="flex justify-between items-center px-4 pt-4 pb-2">
          <div className="w-8"></div> {/* Spacer */}
          <button className="text-white hover:bg-white/10 p-2 rounded-full transition-colors">
            <Settings size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar pb-24 px-4">
          
          {/* Account Profile Card */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4 group cursor-pointer">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#2A2A3D] group-hover:border-[#E84A27] transition-colors bg-[#161620]">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=161620" alt="Profile" className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-0 right-0 bg-[#E84A27] text-white p-1.5 rounded-full shadow-lg border-2 border-[#050507]">
                <ShieldCheck size={14} />
              </div>
            </div>
            
            <h2 className="vyde-display text-2xl font-bold text-white mb-1">Alex Mercer</h2>
            <p className="text-sm text-[#9999A6] flex items-center gap-1.5 bg-[#161620] px-3 py-1 rounded-full border border-[#2A2A3D]">
              <span className="w-3 h-3 text-[#E84A27]"><ShieldCheck size={12} fill="currentColor" className="text-white"/></span>
              alex.m@google.com
            </p>

            {/* Viewer Stats Row */}
            <div className="flex w-full justify-around mt-6 bg-[#0C0C12] rounded-2xl p-4 border border-[#1F1F2E]">
              <div className="flex flex-col items-center">
                <span className="vyde-display text-xl font-bold text-white">124</span>
                <span className="text-[10px] text-[#666675] uppercase tracking-wider font-semibold">Subscribed</span>
              </div>
              <div className="w-px h-8 bg-[#2A2A3D]"></div>
              <div className="flex flex-col items-center">
                <span className="vyde-display text-xl font-bold text-white">1.2k</span>
                <span className="text-[10px] text-[#666675] uppercase tracking-wider font-semibold">Watched</span>
              </div>
              <div className="w-px h-8 bg-[#2A2A3D]"></div>
              <div className="flex flex-col items-center">
                <span className="vyde-display text-xl font-bold text-white">45<span className="text-sm text-[#9999A6]">h</span></span>
                <span className="text-[10px] text-[#666675] uppercase tracking-wider font-semibold">This Week</span>
              </div>
            </div>
          </div>

          {/* Subscriptions Shelf */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="vyde-display font-semibold text-white">Subscriptions</h3>
              <button className="text-xs font-medium text-[#E84A27] flex items-center">All <ChevronRight size={14} /></button>
            </div>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar">
              {subscriptions.map((sub, i) => (
                <div key={i} className="flex flex-col items-center gap-2 shrink-0 w-[60px]">
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-[#2A2A3D] bg-[#161620]">
                    <img src={sub.img} alt={sub.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] text-[#9999A6] font-medium text-center truncate w-full">{sub.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions List */}
          <div className="flex flex-col gap-2 mb-8">
            
            {/* History */}
            <div className="bg-[#0C0C12] border border-[#1F1F2E] rounded-2xl p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History size={20} className="text-[#E84A27]" />
                  <span className="vyde-display font-semibold text-white text-lg">History</span>
                </div>
                <ChevronRight size={18} className="text-[#666675]" />
              </div>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar snap-x">
                {watchHistory.map((vid, i) => (
                  <div key={i} className="w-[120px] shrink-0 snap-start relative group cursor-pointer">
                    <div className="aspect-video bg-[#161620] rounded-lg overflow-hidden border border-[#2A2A3D]">
                      <img src={vid.thumb} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Playlists */}
            <button className="w-full bg-[#0C0C12] border border-[#1F1F2E] rounded-2xl p-4 flex items-center justify-between hover:bg-[#161620] transition-colors">
              <div className="flex items-center gap-3">
                <ListVideo size={20} className="text-[#E84A27]" />
                <span className="vyde-display font-semibold text-white text-lg">Playlists</span>
                <span className="bg-[#161620] text-xs font-medium px-2 py-0.5 rounded-full text-[#9999A6] border border-[#2A2A3D]">12</span>
              </div>
              <ChevronRight size={18} className="text-[#666675]" />
            </button>

            {/* Liked */}
            <button className="w-full bg-[#0C0C12] border border-[#1F1F2E] rounded-2xl p-4 flex items-center justify-between hover:bg-[#161620] transition-colors">
              <div className="flex items-center gap-3">
                <ThumbsUp size={20} className="text-[#E84A27]" />
                <span className="vyde-display font-semibold text-white text-lg">Liked Videos</span>
                <span className="bg-[#161620] text-xs font-medium px-2 py-0.5 rounded-full text-[#9999A6] border border-[#2A2A3D]">482</span>
              </div>
              <ChevronRight size={18} className="text-[#666675]" />
            </button>

          </div>
          
        </div>

        <BottomNav activeTab="profile" />
      </div>
    </PhoneFrame>
  );
}
