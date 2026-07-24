import React, { useState } from "react";
import "./_shared/tokens.css";
import { PhoneFrame } from "./_shared/PhoneFrame";
import { BottomNav } from "./_shared/BottomNav";
import { Search, TrendingUp, Mic, X, ArrowUpLeft } from "lucide-react";

export function SearchExplore() {
  const [isFocused, setIsFocused] = useState(true);
  const [query, setQuery] = useState("cinematic");

  const recentSearches = [
    "cinematic landscape 4k",
    "mechanical keyboard asmr",
    "f1 highlights 2024",
    "best coffee setup"
  ];

  const trending = [
    { text: "SpaceX Launch", rank: 1 },
    { text: "Dune Part Two Review", rank: 2 },
    { text: "M3 MacBook Pro", rank: 3 },
  ];

  const categories = [
    { label: "Gaming", img: "/__mockup/images/cat-gaming.jpg", color: "from-purple-500/20" },
    { label: "Tech", img: "/__mockup/images/cat-tech.jpg", color: "from-blue-500/20" },
    { label: "Sports", img: "/__mockup/images/cat-sports.jpg", color: "from-green-500/20" },
    { label: "Music", img: "/__mockup/images/thumb-for-you-3.jpg", color: "from-amber-500/20" },
    { label: "Film", img: "/__mockup/images/thumb-for-you-2.jpg", color: "from-red-500/20" },
    { label: "Nature", img: "/__mockup/images/thumb-nature.jpg", color: "from-emerald-500/20" },
  ];

  return (
    <PhoneFrame>
      {/* Search Header */}
      <div className="pt-4 pb-2 px-4 bg-[#050507] z-30 sticky top-0 border-b border-[#1F1F2E]/50">
        <div className="flex items-center gap-3">
          <div className={`flex-1 flex items-center bg-[#161620] rounded-xl px-3 py-2 border transition-colors ${isFocused ? 'border-[#E84A27]' : 'border-[#2A2A3D]'}`}>
            <Search size={18} className={isFocused ? 'text-[#E84A27]' : 'text-[#666675]'} />
            <input 
              type="text" 
              className="flex-1 bg-transparent border-none outline-none text-white text-[15px] ml-2 placeholder-[#666675]"
              placeholder="Search Vyde"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-[#9999A6] hover:text-white">
                <X size={16} />
              </button>
            )}
          </div>
          <button className="w-10 h-10 rounded-xl bg-[#161620] flex items-center justify-center text-white border border-[#2A2A3D]">
            <Mic size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">
        
        {/* Active Search State */}
        {isFocused && (
          <div className="px-4 py-2 border-b border-[#1F1F2E]/50">
            {recentSearches.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3 group cursor-pointer">
                <div className="flex items-center gap-4 text-white">
                  <History size={18} className="text-[#666675]" />
                  <span className="text-[15px] group-hover:text-[#E84A27] transition-colors">{item}</span>
                </div>
                <ArrowUpLeft size={18} className="text-[#666675]" />
              </div>
            ))}
          </div>
        )}

        {/* Trending Section */}
        <div className="px-4 py-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-[#E84A27]" />
            <h2 className="vyde-display font-semibold text-lg text-white">Trending Now</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {trending.map((item) => (
              <button key={item.rank} className="flex items-center gap-2 bg-[#0C0C12] border border-[#1F1F2E] rounded-full px-4 py-2 text-sm text-white hover:bg-[#161620] transition-colors">
                <span className="text-[#E84A27] font-bold vyde-display">#{item.rank}</span>
                {item.text}
              </button>
            ))}
          </div>
        </div>

        {/* Explore Categories */}
        <div className="px-4 pb-6">
          <h2 className="vyde-display font-semibold text-lg text-white mb-4">Explore</h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat, i) => (
              <div 
                key={i} 
                className="relative h-24 rounded-xl overflow-hidden cursor-pointer group"
              >
                <img src={cat.img} alt={cat.label} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700 ease-out" />
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 to-transparent ${cat.color}`}></div>
                <span className="absolute bottom-3 left-3 vyde-display font-semibold text-white tracking-wide z-10 drop-shadow-md">
                  {cat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <BottomNav activeTab="explore" />
    </PhoneFrame>
  );
}

// Needed to avoid undefined History icon in SearchExplore if I forgot to import it
function History(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
