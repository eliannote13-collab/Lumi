import React from "react";
import { Film, Music, Compass, Monitor } from "lucide-react";

interface ActivitySelectorProps {
  currentActivity: string;
  onChangeActivity: (activity: string) => void;
  isHost: boolean;
  isMobile?: boolean;
  isTV?: boolean;
}

export const ActivitySelector: React.FC<ActivitySelectorProps> = ({
  currentActivity,
  onChangeActivity,
  isMobile = false,
  isTV = false,
}) => {
  const activities = [
    { id: "watch", label: isMobile ? "Assistir" : "Assistir", icon: Film, color: "hover:text-amber-500 hover:bg-amber-950/20" },
    { id: "music", label: isMobile ? "Ouvir" : "Ouvir Música", icon: Music, color: "hover:text-emerald-500 hover:bg-emerald-950/20" },
    { id: "browse", label: isMobile ? "Navegar" : "Navegar Juntos", icon: Compass, color: "hover:text-blue-500 hover:bg-blue-950/20" },
    { id: "screenshare", label: isMobile ? "Compartilhar" : "Compartilhar Tela", icon: Monitor, color: "hover:text-rose-500 hover:bg-rose-950/20" },
  ];

  const containerPadding = isTV 
    ? "p-2 rounded-2xl gap-3 bg-stone-900/60" 
    : "p-1 rounded-xl gap-1.5 bg-stone-900/40";
  
  const btnBaseClass = isTV
    ? "px-5 py-3.5 text-base h-14 font-semibold rounded-xl"
    : "px-3.5 py-1.5 text-xs font-medium rounded-lg";

  const iconSizeClass = isTV ? "w-5 h-5" : "w-3.5 h-3.5";

  return (
    <div className={`flex flex-col items-center gap-2 animate-fade-in ${isTV ? "scale-105" : ""}`}>
      <span className={`uppercase tracking-widest text-stone-500 font-medium ${isTV ? "text-sm" : "text-[10px]"}`}>
        O que vocês vão fazer hoje?
      </span>
      <div className={`flex items-center border border-stone-800/60 ${containerPadding}`}>
        {activities.map((act) => {
          const Icon = act.icon;
          const isActive = currentActivity === act.id;
          return (
            <button
              key={act.id}
              onClick={() => onChangeActivity(isActive ? "none" : act.id)}
              className={`flex items-center gap-2 transition-all duration-300 cursor-pointer ${btnBaseClass} ${
                isActive
                  ? "bg-stone-800 text-stone-100 shadow-sm border border-stone-700/50"
                  : `text-stone-400 ${act.color}`
              }`}
            >
              <Icon className={`${iconSizeClass} transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
              <span>{act.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
