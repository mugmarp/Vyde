import React from "react";
import "./_shared/tokens.css";
import { PhoneFrame } from "./_shared/PhoneFrame";
import { MonitorPlay, ShieldCheck, History, ThumbsUp, ListVideo } from "lucide-react";

export function SignIn() {
  return (
    <PhoneFrame>
      <div className="flex flex-col h-full bg-[#050507] relative overflow-hidden">
        
        {/* Cinematic Background */}
        <div className="absolute inset-0 z-0">
          <img src="/__mockup/images/signin-bg.jpg" alt="Background" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/80 to-transparent"></div>
          {/* Accent glow */}
          <div className="absolute top-1/4 -right-20 w-64 h-64 bg-[#E84A27] rounded-full blur-[100px] opacity-20"></div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col h-full px-6 py-12">
          
          {/* Logo & Hook */}
          <div className="flex-1 flex flex-col items-center justify-center mt-12">
            <div className="w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl flex items-center justify-center mb-8 shadow-2xl">
              <MonitorPlay size={40} className="text-[#E84A27]" />
            </div>
            
            <h1 className="vyde-display text-4xl font-bold text-white tracking-tight mb-4">Vyde</h1>
            <p className="text-lg text-[#9999A6] text-center font-medium max-w-[240px] leading-snug">
              The cinematic video experience, crafted for you.
            </p>
          </div>

          {/* Benefits Box */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 mb-8">
            <h3 className="vyde-display text-sm font-semibold text-white mb-4 tracking-wide uppercase">Sign in to unlock:</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#E84A27]/20 p-2 rounded-lg"><History size={18} className="text-[#E84A27]" /></div>
                <span className="text-sm text-white font-medium">Sync watch history across devices</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-[#E84A27]/20 p-2 rounded-lg"><ThumbsUp size={18} className="text-[#E84A27]" /></div>
                <span className="text-sm text-white font-medium">Personalized cinematic feed</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-[#E84A27]/20 p-2 rounded-lg"><ListVideo size={18} className="text-[#E84A27]" /></div>
                <span className="text-sm text-white font-medium">Curate playlists & save videos</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-4">
            <button className="w-full bg-white hover:bg-neutral-200 text-black py-4 rounded-xl flex items-center justify-center gap-3 font-semibold text-[15px] transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.86 16.8 15.68 17.58V20.34H19.25C21.34 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                <path d="M12 23C14.97 23 17.46 22.02 19.25 20.34L15.68 17.58C14.7 18.23 13.46 18.63 12 18.63C9.17 18.63 6.76 16.73 5.88 14.18H2.21V17.03C4.01 20.61 7.7 23 12 23Z" fill="#34A853"/>
                <path d="M5.88 14.18C5.66 13.52 5.53 12.78 5.53 12C5.53 11.22 5.66 10.48 5.88 9.82V6.97H2.21C1.47 8.44 1.05 10.15 1.05 12C1.05 13.85 1.47 15.56 2.21 17.03L5.88 14.18Z" fill="#FBBC05"/>
                <path d="M12 5.38C13.62 5.38 15.06 5.94 16.2 7.02L19.33 3.89C17.45 2.14 14.97 1 12 1C7.7 1 4.01 3.39 2.21 6.97L5.88 9.82C6.76 7.27 9.17 5.38 12 5.38Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            
            <div className="flex items-start gap-2 mt-2 px-2">
              <ShieldCheck size={16} className="text-[#666675] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#666675] leading-tight">
                Vyde uses official Google Sign-In. We only access your basic profile and YouTube data to personalize your experience. Your data never leaves your device.
              </p>
            </div>

            <button className="text-[13px] font-medium text-[#9999A6] hover:text-white mt-4 py-2 transition-colors">
              Continue without signing in
            </button>
          </div>

        </div>
      </div>
    </PhoneFrame>
  );
}
