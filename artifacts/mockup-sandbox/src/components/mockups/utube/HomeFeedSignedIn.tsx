import React from "react";
import "./_shared/tokens.css";
import { PhoneFrame } from "./_shared/PhoneFrame";
import { BottomNav } from "./_shared/BottomNav";
import { Search, Bell, MonitorPlay, MoreVertical, CheckCircle2, History } from "lucide-react";

export function HomeFeedSignedIn() {
  const categories = ["For You", "Gaming", "Tech", "Education", "Sports", "Entertainment", "News", "Music"];
  
  const continueWatching = [
    { id: 1, title: "How to Build a Custom Mechanical Keyboard", progress: 65, thumb: "/__mockup/images/thumb-tech.jpg" },
    { id: 2, title: "The Art of the Perfect Espresso Shot", progress: 30, thumb: "/__mockup/images/thumb-for-you-1.jpg" }
  ];

  const videos = [
    {
      id: 1,
      title: "Exploring the Cyberpunk Aesthetics in Modern Film",
      channel: "CineMaster",
      verified: true,
      views: "1.2M",
      age: "2 days ago",
      duration: "18:40",
      thumb: "/__mockup/images/thumb-for-you-2.jpg",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=cine&backgroundColor=161620"
    },
    {
      id: 2,
      title: "Why Vinyl Sounds Better: The Science of Analog Audio",
      channel: "Audiophile Space",
      verified: false,
      views: "340K",
      age: "5 hours ago",
      duration: "12:15",
      thumb: "/__mockup/images/thumb-for-you-3.jpg",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=audio&backgroundColor=161620"
    },
    {
      id: 3,
      title: "Lost in the Mist: A 4K Drone Journey Through the Cascades",
      channel: "WanderLens",
      verified: true,
      views: "230K",
      age: "1 week ago",
      duration: "22:15",
      thumb: "/__mockup/images/thumb-nature.jpg",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=nature&backgroundColor=161620"
    }
  ];

  return (
    <PhoneFrame>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#050507] z-30 sticky top-0 border-b border-[#1F1F2E]/50 backdrop-blur-xl bg-[#050507]/80">
        <div className="flex items-center gap-2">
          <MonitorPlay size={24} className="text-[#E84A27]" />
          <span className="vyde-display text-xl font-bold tracking-tight">Vyde</span>
        </div>
        <div className="flex items-center gap-4 text-white">
          <button><Search size={22} className="opacity-80 hover:opacity-100" /></button>
          <button className="relative">
            <Bell size={22} className="opacity-80 hover:opacity-100" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-[#E84A27] rounded-full border-2 border-[#050507]"></span>
          </button>
          <div className="w-8 h-8 rounded-full bg-[#161620] overflow-hidden border border-[#2A2A3D]">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=161620" alt="Avatar" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">
        
        {/* Categories */}
        <div className="px-4 py-3 overflow-x-auto hide-scrollbar flex gap-2">
          {categories.map((cat, i) => (
            <button 
              key={cat} 
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                i === 0 ? "bg-white text-black" : "bg-[#161620] text-[#9999A6] hover:text-white border border-transparent hover:border-[#2A2A3D]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Continue Watching Shelf */}
        <div className="mb-6 px-4">
          <div className="flex items-center gap-2 mb-3 text-white">
            <History size={16} className="text-[#E84A27]" />
            <h3 className="vyde-display font-semibold text-sm">Continue Watching</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar snap-x">
            {continueWatching.map(item => (
              <div key={item.id} className="w-[160px] shrink-0 snap-start bg-[#0C0C12] rounded-xl overflow-hidden border border-[#1F1F2E]">
                <div className="relative aspect-video w-full bg-[#161620]">
                  <img src={item.thumb} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                    <div className="h-full bg-[#E84A27]" style={{ width: `${item.progress}%` }}></div>
                  </div>
                </div>
                <div className="p-2.5">
                  <h4 className="text-xs font-medium text-white line-clamp-2 leading-tight">{item.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feed */}
        <div className="flex flex-col gap-6">
          {videos.map((vid) => (
            <div key={vid.id} className="flex flex-col gap-3 group">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-[#161620] w-full cursor-pointer overflow-hidden">
                <img src={vid.thumb} alt={vid.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300"></div>
                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-medium text-white tracking-wide">
                  {vid.duration}
                </div>
              </div>
              
              {/* Meta */}
              <div className="flex gap-3 px-4">
                <div className="w-10 h-10 rounded-full bg-[#161620] overflow-hidden shrink-0 mt-0.5 border border-[#1F1F2E]">
                  <img src={vid.avatar} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-medium text-white leading-snug line-clamp-2 pr-4">
                    {vid.title}
                  </h3>
                  <div className="text-xs text-[#9999A6] mt-1.5 flex items-center gap-1.5">
                    <span className="flex items-center gap-1">
                      {vid.channel}
                      {vid.verified && <CheckCircle2 size={12} className="text-[#9999A6]" />}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-[#666675]"></span>
                    <span>{vid.views}</span>
                    <span className="w-1 h-1 rounded-full bg-[#666675]"></span>
                    <span>{vid.age}</span>
                  </div>
                </div>
                <button className="text-[#666675] hover:text-white shrink-0 -mt-1 p-1">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      <BottomNav activeTab="home" />
    </PhoneFrame>
  );
}
