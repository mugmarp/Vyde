import React from "react";
import { Home, Compass, FolderOpen, User } from "lucide-react";

type Tab = "home" | "explore" | "library" | "profile";

export function BottomNav({ activeTab }: { activeTab: Tab }) {
  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "explore", label: "Explore", icon: Compass },
    { id: "library", label: "Library", icon: FolderOpen },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div 
      className="absolute bottom-0 inset-x-0 pb-6 pt-3 px-2 z-40"
      style={{ 
        background: "linear-gradient(to top, rgba(5,5,7,1) 60%, rgba(5,5,7,0.8) 80%, transparent)",
        borderTop: "1px solid rgba(255,255,255,0.03)",
        backdropFilter: "blur(10px)"
      }}
    >
      <div className="flex justify-around items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              className={`flex flex-col items-center justify-center gap-1 w-16 transition-colors duration-300 ${
                isActive ? "text-white" : "text-[#666675] hover:text-[#9999A6]"
              }`}
            >
              <Icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 2} 
                className={isActive ? "text-[#E84A27]" : ""} 
              />
              <span className={`text-[10px] font-medium vyde-display ${isActive ? "text-white" : ""}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
