import React, { useState } from "react";
import "./_shared/tokens.css";
import { PhoneFrame } from "./_shared/PhoneFrame";
import { ArrowLeft, User, Play, HardDrive, Hand, Monitor, LogOut, ChevronRight } from "lucide-react";

export function Settings() {
  const [gesturesEnabled, setGesturesEnabled] = useState(true);
  const [doubleTapEnabled, setDoubleTapEnabled] = useState(true);
  const [autoplay, setAutoplay] = useState(false);

  // Reusable toggle switch component for this file
  const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) => (
    <button 
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${checked ? 'bg-[#E84A27]' : 'bg-[#2A2A3D]'}`}
    >
      <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
    </button>
  );

  const SectionTitle = ({ children, icon: Icon }: { children: React.ReactNode, icon: any }) => (
    <div className="flex items-center gap-2 mb-3 mt-6 px-1">
      <Icon size={16} className="text-[#E84A27]" />
      <h3 className="vyde-display font-semibold text-sm text-[#E84A27] uppercase tracking-wider">{children}</h3>
    </div>
  );

  const SettingRow = ({ label, desc, action }: { label: string, desc?: string, action: React.ReactNode }) => (
    <div className="flex items-center justify-between py-3 px-1 border-b border-[#1F1F2E]/50 group cursor-pointer">
      <div className="flex flex-col gap-0.5 pr-4">
        <span className="text-[15px] font-medium text-white">{label}</span>
        {desc && <span className="text-xs text-[#9999A6]">{desc}</span>}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );

  return (
    <PhoneFrame>
      <div className="flex flex-col h-full bg-[#050507]">
        
        {/* Header */}
        <div className="flex items-center gap-4 px-4 py-4 border-b border-[#1F1F2E] bg-[#050507] z-30 sticky top-0">
          <button className="text-white hover:bg-white/10 p-1.5 rounded-full transition-colors -ml-1.5">
            <ArrowLeft size={22} />
          </button>
          <h1 className="vyde-display text-xl font-bold text-white">Settings</h1>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-12">
          
          {/* Account */}
          <SectionTitle icon={User}>Account</SectionTitle>
          <div className="bg-[#0C0C12] border border-[#1F1F2E] rounded-2xl px-3 mb-2">
            <div className="flex items-center justify-between py-4 px-1 border-b border-[#1F1F2E]/50">
              <div className="flex items-center gap-3">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=161620" className="w-10 h-10 rounded-full border border-[#2A2A3D] bg-[#161620]" />
                <div>
                  <h4 className="text-sm font-medium text-white">Alex Mercer</h4>
                  <p className="text-xs text-[#9999A6]">alex.m@google.com</p>
                </div>
              </div>
              <button className="bg-[#161620] hover:bg-[#2A2A3D] text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors">
                Manage
              </button>
            </div>
            <button className="w-full flex items-center justify-center gap-2 py-3 px-1 text-[#E84A27] font-medium text-sm hover:bg-[#161620] rounded-b-xl transition-colors">
              <LogOut size={16} /> Sign out of Vyde
            </button>
          </div>

          {/* Playback */}
          <SectionTitle icon={Play}>Playback</SectionTitle>
          <div className="bg-[#0C0C12] border border-[#1F1F2E] rounded-2xl px-3 mb-2">
            <SettingRow 
              label="Video Quality Preference" 
              desc="Auto (Recommended)"
              action={<ChevronRight size={18} className="text-[#666675]" />}
            />
            <SettingRow 
              label="Autoplay next video" 
              action={<Toggle checked={autoplay} onChange={setAutoplay} />}
            />
            <SettingRow 
              label="Default Playback Speed" 
              action={<span className="text-sm font-medium text-[#9999A6] flex items-center gap-1">Normal <ChevronRight size={16}/></span>}
            />
          </div>

          {/* Downloads */}
          <SectionTitle icon={HardDrive}>Downloads</SectionTitle>
          <div className="bg-[#0C0C12] border border-[#1F1F2E] rounded-2xl px-3 mb-2">
            <SettingRow 
              label="Download Quality" 
              desc="1080p Premium"
              action={<ChevronRight size={18} className="text-[#666675]" />}
            />
            <SettingRow 
              label="Storage Location" 
              desc="Internal Storage (Sandboxed)"
              action={<ChevronRight size={18} className="text-[#666675]" />}
            />
          </div>

          {/* Gestures (Signature Feature) */}
          <SectionTitle icon={Hand}>Gestures & Interaction</SectionTitle>
          <div className="bg-[#0C0C12] border border-[#1F1F2E] rounded-2xl px-3 mb-2">
            <SettingRow 
              label="Volume/Brightness Swipe" 
              desc="Swipe edges vertically in fullscreen"
              action={<Toggle checked={gesturesEnabled} onChange={setGesturesEnabled} />}
            />
            <SettingRow 
              label="Double-tap to seek" 
              action={<Toggle checked={doubleTapEnabled} onChange={setDoubleTapEnabled} />}
            />
            <SettingRow 
              label="Seek Increment" 
              action={<span className="text-sm font-medium text-[#9999A6] flex items-center gap-1">10 seconds <ChevronRight size={16}/></span>}
            />
          </div>

          {/* Appearance */}
          <SectionTitle icon={Monitor}>Appearance</SectionTitle>
          <div className="bg-[#0C0C12] border border-[#1F1F2E] rounded-2xl px-3 mb-6">
            <SettingRow 
              label="Theme" 
              desc="Dark (Cinematic)"
              action={<ChevronRight size={18} className="text-[#666675]" />}
            />
          </div>

          {/* About Footer */}
          <div className="flex flex-col items-center justify-center py-6 border-t border-[#1F1F2E]/30">
             <span className="vyde-display text-lg font-bold text-[#E84A27] tracking-tight mb-1">Vyde</span>
             <span className="text-xs text-[#666675]">Version 2.4.0 (Build 8421)</span>
             <span className="text-[10px] text-[#666675] mt-2 border-b border-[#666675]/50 pb-0.5">Open Source Licenses</span>
          </div>

        </div>
      </div>
    </PhoneFrame>
  );
}
