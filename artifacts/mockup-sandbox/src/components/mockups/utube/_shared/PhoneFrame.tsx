import React from "react";
import "./tokens.css";
import { Battery, Wifi, Signal } from "lucide-react";

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const time = new Date();
  const timeString = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).replace(" AM", "").replace(" PM", "");

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-900 p-8">
      {/* Outer device frame */}
      <div 
        className="relative overflow-hidden bg-black shadow-2xl rounded-[54px] border-[12px] border-neutral-800"
        style={{ width: "393px", height: "852px" }}
      >
        {/* Dynamic Island Area */}
        <div className="absolute top-0 inset-x-0 h-[48px] z-50 flex items-center justify-between px-6 pointer-events-none">
          <div className="text-[15px] font-semibold tracking-tight text-white vyde-display w-[54px]">
            9:41
          </div>
          
          {/* Dynamic Island cutout */}
          <div className="w-[120px] h-[35px] bg-black rounded-full absolute left-1/2 -translate-x-1/2 top-[10px]"></div>

          <div className="flex items-center gap-1.5 text-white">
            <Signal size={16} />
            <Wifi size={16} />
            <Battery size={18} />
          </div>
        </div>

        {/* Screen Content */}
        <div className="vyde-app h-full w-full relative flex flex-col pt-[48px] overflow-hidden">
          {children}
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-white/40 rounded-full z-50 pointer-events-none"></div>
      </div>
    </div>
  );
}
