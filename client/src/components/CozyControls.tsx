import React from "react";
import { Mic, MicOff, Video, VideoOff, Monitor, Moon, Sun, MessageSquare, LogOut } from "lucide-react";

interface CozyControlsProps {
  isAudioActive: boolean;
  isVideoActive: boolean;
  isSharingScreen: boolean;
  isDimActive: boolean;
  isChatOpen: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleShare: () => void;
  onToggleDim: () => void;
  onToggleChat: () => void;
  onLeave: () => void;
  visible: boolean;
  isTV?: boolean;
}

export const CozyControls: React.FC<CozyControlsProps> = ({
  isAudioActive,
  isVideoActive,
  isSharingScreen,
  isDimActive,
  isChatOpen,
  onToggleMic,
  onToggleCamera,
  onToggleShare,
  onToggleDim,
  onToggleChat,
  onLeave,
  visible,
  isTV = false,
}) => {
  const iconSizeClass = isTV ? "w-6 h-6" : "w-5 h-5";
  const btnBaseClass = `rounded-xl transition-all duration-300 relative group flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
    isTV ? "h-14 w-14 p-0" : "p-2.5 md:p-3"
  }`;

  return (
    <div
      role="toolbar"
      aria-label="Controles de mídia"
      className="fixed bottom-6 left-1/2 z-50 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{
        transform: visible 
          ? "translate(-50%, 0px) scale(1)" 
          : "translate(-50%, 8px) scale(1)",
        opacity: visible ? 1 : 0.2
      }}
    >
      <div 
        className={`flex items-center rounded-2xl cozy-glass shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-stone-800/80 transition-all duration-500 ${
          isTV 
            ? "gap-4.5 px-6 py-4.5" 
            : "gap-1.5 md:gap-2.5 px-3 py-2 md:px-5 md:py-3"
        }`}
      >
        
        {/* Mic Control */}
        <button
          onClick={onToggleMic}
          aria-label={isAudioActive ? "Mudar microfone (Desativar)" : "Ativar microfone"}
          className={`${btnBaseClass} ${
            isAudioActive
              ? "text-stone-300 hover:text-stone-100 hover:bg-stone-850/50"
              : "bg-cozy-sunset/10 text-cozy-sunset hover:bg-cozy-sunset/20 border border-cozy-sunset/30"
          }`}
          title={isAudioActive ? "Desativar microfone" : "Ativar microfone"}
        >
          {isAudioActive ? <Mic className={iconSizeClass} /> : <MicOff className={iconSizeClass} />}
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-stone-950 text-stone-300 text-[10px] px-2 py-1 rounded font-medium transition-all duration-200 pointer-events-none whitespace-nowrap border border-stone-800">
            {isAudioActive ? "Desativar Áudio" : "Ativar Áudio"}
          </span>
        </button>

        {/* Camera Control */}
        <button
          onClick={onToggleCamera}
          aria-label={isVideoActive ? "Mudar câmera (Desativar)" : "Ativar câmera"}
          className={`${btnBaseClass} ${
            isVideoActive
              ? "text-stone-300 hover:text-stone-100 hover:bg-stone-850/50"
              : "bg-cozy-sunset/10 text-cozy-sunset hover:bg-cozy-sunset/20 border border-cozy-sunset/30"
          }`}
          title={isVideoActive ? "Desativar câmera" : "Ativar câmera"}
        >
          {isVideoActive ? <Video className={iconSizeClass} /> : <VideoOff className={iconSizeClass} />}
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-stone-950 text-stone-300 text-[10px] px-2 py-1 rounded font-medium transition-all duration-200 pointer-events-none whitespace-nowrap border border-stone-800">
            {isVideoActive ? "Desativar Câmera" : "Ativar Câmera"}
          </span>
        </button>

        <div className={`bg-stone-800 self-center mx-1 ${isTV ? "w-[1px] h-8" : "w-[1px] h-6"}`} />

        {/* Screen Share Control */}
        <button
          onClick={onToggleShare}
          aria-label={isSharingScreen ? "Parar transmissão de tela" : "Iniciar transmissão de tela"}
          className={`${btnBaseClass} ${
            isSharingScreen
              ? "bg-cozy-amber/20 text-cozy-gold border border-cozy-amber/40 hover:bg-cozy-amber/30"
              : "text-stone-300 hover:text-stone-100 hover:bg-stone-850/50"
          }`}
          title={isSharingScreen ? "Parar Compartilhamento" : "Compartilhar Tela"}
        >
          <Monitor className={iconSizeClass} />
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-stone-950 text-stone-300 text-[10px] px-2 py-1 rounded font-medium transition-all duration-200 pointer-events-none whitespace-nowrap border border-stone-800">
            {isSharingScreen ? "Parar Transmissão" : "Transmitir Tela"}
          </span>
        </button>

        {/* Dim the Lights Control */}
        <button
          onClick={onToggleDim}
          aria-label={isDimActive ? "Acender as luzes da sala" : "Apagar as luzes da sala"}
          className={`${btnBaseClass} ${
            isDimActive
              ? "bg-cozy-gold/20 text-cozy-gold border border-cozy-gold/45 hover:bg-cozy-gold/30"
              : "text-stone-300 hover:text-stone-100 hover:bg-stone-850/50"
          }`}
          title={isDimActive ? "Acender Luzes" : "Apagar Luzes"}
        >
          {isDimActive ? <Sun className={iconSizeClass} /> : <Moon className={iconSizeClass} />}
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-stone-950 text-stone-300 text-[10px] px-2 py-1 rounded font-medium transition-all duration-200 pointer-events-none whitespace-nowrap border border-stone-800">
            {isDimActive ? "Acender Luzes" : "Apagar Luzes (Cinema)"}
          </span>
        </button>

        {/* Chat Toggle Control */}
        <button
          onClick={onToggleChat}
          aria-expanded={isChatOpen}
          aria-label={isChatOpen ? "Fechar bate-papo" : "Abrir bate-papo"}
          className={`${btnBaseClass} ${
            isChatOpen
              ? "bg-stone-800 text-stone-100 border border-stone-700/60"
              : "text-stone-300 hover:text-stone-100 hover:bg-stone-850/50"
          }`}
          title={isChatOpen ? "Fechar Chat" : "Abrir Chat"}
        >
          <MessageSquare className={iconSizeClass} />
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-stone-950 text-stone-300 text-[10px] px-2 py-1 rounded font-medium transition-all duration-200 pointer-events-none whitespace-nowrap border border-stone-800">
            {isChatOpen ? "Ocultar Chat" : "Mostrar Chat"}
          </span>
        </button>

        <div className={`bg-stone-800 self-center mx-1 ${isTV ? "w-[1px] h-8" : "w-[1px] h-6"}`} />

        {/* Leave Room Control */}
        <button
          onClick={onLeave}
          aria-label="Sair do espaço Lumi"
          className={`${btnBaseClass} text-stone-400 hover:text-cozy-sunset hover:bg-cozy-sunset/10`}
          title="Sair da sala"
        >
          <LogOut className={iconSizeClass} />
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-stone-950 text-stone-300 text-[10px] px-2 py-1 rounded font-medium transition-all duration-200 pointer-events-none whitespace-nowrap border border-stone-800">
            Sair da Sala
          </span>
        </button>

      </div>
    </div>
  );
};
