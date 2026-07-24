import React from "react";
import "./_shared/tokens.css";
import { PhoneFrame } from "./_shared/PhoneFrame";
import { BottomNav } from "./_shared/BottomNav";
import { Search, Bell, MonitorPlay, MoreVertical } from "lucide-react";

export function HomeFeedSignedOut() {
  const categories = ["All", "Gaming", "Tech", "Education", "Sports", "Entertainment", "News", "Music"];
  
  const videos = [
    {
      id: 1,
      title: "The Future of Racing: CyberTrack 2077 Gameplay Reveal & Review",
      channel: "Pixel Pushers",
      views: "1.2M",
      age: "2 days ago",
      duration: "14:20",
      thumb: "/__mockup/images/thumb-gaming.jpg",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=gaming&backgroundColor=161620"
    },
    {
      id: 2,
      title: "I Used The $5,000 Smartphone For A Month. Here's The Truth.",
      channel: "Tech Dimension",
      views: "850K",
      age: "5 hours ago",
      duration: "08:45",
      thumb: "/__mockup/images/thumb-tech.jpg",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=tech&backgroundColor=161620"
    },
    {
      id: 3,
      title: "Lost in the Mist: A 4K Drone Journey Through the Cascades",
      channel: "WanderLens",
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
      <div className="flex items-center justify-between px-4 py-3 bg-[#050507] z-30 sticky top-0">
        <div className="flex items-center gap-2">
          <MonitorPlay size={24} className="text-[#E84A27]" />
          <span className="vyde-display text-xl font-bold tracking-tight">Vyde</span>
        </div>
        <div className="flex items-center gap-4 text-white">
          <button><Search size={22} className="opacity-80" /></button>
          <button><Bell size={22} className="opacity-80" /></button>
          <div className="w-7 h-7 rounded-full border border-[#2A2A3D] bg-[#0C0C12] flex items-center justify-center">
            <span className="text-[10px] text-[#9999A6] font-semibold">?</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">
        
        {/* Sign In Banner */}
        <div className="mx-4 mt-2 mb-4 p-4 rounded-xl border border-[#1F1F2E] bg-gradient-to-br from-[#0C0C12] to-[#050507] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#E84A27] rounded-full blur-[60px] opacity-10"></div>
          <h3 className="vyde-display font-semibold text-white mb-1">Sign in to Vyde</h3>
          <p className="text-xs text-[#9999A6] mb-3 pr-8">Get personalized recommendations, save your favorite videos, and join the conversation.</p>
          <button className="bg-white text-black vyde-display font-semibold text-xs px-4 py-2 rounded-full hover:bg-neutral-200 transition-colors">
            Sign In Now
          </button>
        </div>

        {/* Categories */}
        <div className="px-4 mb-4 overflow-x-auto hide-scrollbar flex gap-2">
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

        {/* Feed */}
        <div className="flex flex-col gap-6">
          {videos.map((vid) => (
            <div key={vid.id} className="flex flex-col gap-3">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-[#161620] w-full">
                <img src={vid.thumb} alt={vid.title} className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-medium text-white tracking-wide">
                  {vid.duration}
                </div>
              </div>
              
              {/* Meta */}
              <div className="flex gap-3 px-4">
                <div className="w-10 h-10 rounded-full bg-[#161620] overflow-hidden shrink-0">
                  <img src={vid.avatar} className="w-full h-full object-cover opacity-80" alt="" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-white leading-snug line-clamp-2 pr-4">
                    {vid.title}
                  </h3>
                  <div className="text-xs text-[#9999A6] mt-1 flex items-center gap-1.5">
                    <span>{vid.channel}</span>
                    <span className="w-1 h-1 rounded-full bg-[#666675]"></span>
                    <span>{vid.views}</span>
                    <span className="w-1 h-1 rounded-full bg-[#666675]"></span>
                    <span>{vid.age}</span>
                  </div>
                </div>
                <button className="text-[#666675] hover:text-white shrink-0 -mt-1">
                  <MoreVertical size={16} />
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
