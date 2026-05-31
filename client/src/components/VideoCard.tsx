import React, { useEffect, useRef, useState } from "react";
import { MicOff, Move } from "lucide-react";
import type { FloatingReaction } from "../hooks/useWebRTC";

interface VideoCardProps {
  stream: MediaStream | null;
  userName: string;
  isLocal: boolean;
  isAudioActive: boolean;
  isVideoActive: boolean;
  isSpeaking?: boolean;
  reactions: FloatingReaction[];
  initialX: number;
  initialY: number;
  initialWidth?: number;
  isSplit?: boolean;
  connectionState?: RTCPeerConnectionState;
  socketConnected?: boolean;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  stream,
  userName,
  isLocal,
  isAudioActive,
  isVideoActive,
  isSpeaking = false,
  reactions,
  initialX,
  initialY,
  initialWidth = 240,
  isSplit = false,
  connectionState,
  socketConnected = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Floating position and width state (for draggable mode)
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [width, setWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, cardX: 0, cardY: 0 });
  const resizeStartRef = useRef({ mouseX: 0, cardWidth: 0 });

  const getConnectionQuality = () => {
    if (isLocal) {
      return socketConnected ? { text: "Excelente", color: "bg-emerald-500" } : { text: "Instável", color: "bg-amber-500" };
    }
    switch (connectionState) {
      case "connected":
        return { text: "Excelente", color: "bg-emerald-500" };
      case "connecting":
      case "disconnected":
        return { text: "Instável", color: "bg-amber-500 animate-pulse" };
      case "failed":
        return { text: "Instável", color: "bg-rose-500" };
      default:
        return { text: "Conectando", color: "bg-stone-600 animate-pulse" };
    }
  };

  const quality = getConnectionQuality();

  // Sync video stream object
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Handle Drag Start
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (isSplit) return; // Disable dragging in split screen mode
    if ("button" in e && e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest(".resize-handle")) return;

    setIsDragging(true);

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      cardX: position.x,
      cardY: position.y
    };

    if (e.cancelable) e.preventDefault();
  };

  // Handle Resize Start
  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (isSplit) return; // Disable resizing in split screen mode
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;

    resizeStartRef.current = {
      mouseX: clientX,
      cardWidth: width
    };
  };

  // Move & Resize Global Listeners (for draggable mode)
  useEffect(() => {
    if (isSplit) return; // Disable event listeners in split screen mode

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (isDragging) {
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - dragStartRef.current.mouseX;
        const deltaY = clientY - dragStartRef.current.mouseY;

        let nextX = dragStartRef.current.cardX + deltaX;
        let nextY = dragStartRef.current.cardY + deltaY;

        // Clamp to screen boundaries
        nextX = Math.max(10, Math.min(window.innerWidth - width - 10, nextX));
        nextY = Math.max(10, Math.min(window.innerHeight - (width * 0.75) - 95, nextY));

        setPosition({ x: nextX, y: nextY });
      }

      if (isResizing) {
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const deltaX = clientX - resizeStartRef.current.mouseX;

        let nextWidth = resizeStartRef.current.cardWidth + deltaX;
        nextWidth = Math.max(140, Math.min(600, nextWidth));
        setWidth(nextWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleMouseMove, { passive: false });
      window.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, isResizing, width, isSplit]);

  // Keep cards within boundaries on window resize
  useEffect(() => {
    if (isSplit) return; // Ignore on split layout

    const handleResize = () => {
      setPosition((prev) => {
        const maxX = window.innerWidth - width - 10;
        const maxY = window.innerHeight - (width * 0.75) - 95;

        const clampedX = Math.max(10, Math.min(maxX, prev.x));
        const clampedY = Math.max(10, Math.min(maxY, prev.y));

        if (clampedX !== prev.x || clampedY !== prev.y) {
          return { x: clampedX, y: clampedY };
        }
        return prev;
      });
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [width, isSplit]);

  // Generate initials for placeholder
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const cardStyle: React.CSSProperties = isSplit
    ? {
        position: "relative",
        width: "100%",
        height: "100%",
        zIndex: 10,
      }
    : {
        position: "absolute",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${width}px`,
        zIndex: isDragging ? 50 : 30,
      };

  return (
    <div
      style={cardStyle}
      className={`flex flex-col gap-2 select-none pointer-events-auto transition-shadow duration-300 ${
        isDragging ? "shadow-[0_20px_50px_rgba(0,0,0,0.6)] cursor-grabbing" : ""
      }`}
    >
      {/* Video Container Card */}
      <div
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        className={`relative w-full rounded-2xl overflow-hidden bg-stone-950 border group/video transition-all duration-300 ${
          isSplit ? "flex-1 min-h-0 cursor-default" : "aspect-[4/3] cursor-grab"
        } ${
          isSpeaking
            ? "border-amber-500/80 shadow-[0_0_15px_rgba(217,119,6,0.25)]"
            : "border-stone-850 hover:border-stone-700/60"
        }`}
      >
        {/* Remote/Local Video Element */}
        {isVideoActive && stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-cover rounded-2xl transform scale-x-[-1]"
          />
        ) : (
          /* Cozy Placeholder when Video is Off */
          <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-[#161310] rounded-2xl">
            {/* Ambient breathing circle glow */}
            <div className="absolute w-28 h-28 rounded-full bg-amber-500/10 blur-xl animate-pulse-slow scale-110" />
            
            <div className="relative z-10 flex items-center justify-center">
              {/* Extra subtle breathing border */}
              <div className="absolute inset-0 rounded-full bg-amber-500/5 blur-md animate-pulse-slow scale-125" />
              <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-pulse-slow scale-110" />
              
              <div className="w-14 h-14 rounded-full bg-stone-850 border border-stone-800/80 flex items-center justify-center text-stone-200 text-base font-bold tracking-wide shadow-inner relative z-10">
                {initials}
              </div>
            </div>
            
            <span className="text-[10px] text-stone-450 mt-3.5 font-semibold tracking-wider relative z-10 px-2 py-0.5 bg-stone-900/80 border border-stone-800 rounded-md shadow-sm">
              {!isAudioActive ? "Silencioso" : "Apenas ouvindo"}
            </span>
          </div>
        )}

        {/* Drag Helper Overlay (Only shown in draggable mode on hover) */}
        {!isSplit && (
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px] opacity-0 group-hover/video:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none z-30">
            <div className="px-2.5 py-1.5 rounded-xl bg-stone-900/90 border border-stone-800 text-stone-300 text-[10px] font-medium tracking-wide flex items-center gap-1.5 shadow-md">
              <Move className="w-3 h-3 text-amber-500 animate-pulse" />
              <span>Arraste para mover</span>
            </div>
          </div>
        )}

        {/* Floating Reactions Overlay */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {reactions.map((react) => {
            const driftX = `${(Math.random() - 0.5) * 40}px`;
            return (
              <div
                key={react.id}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 text-3xl animate-float-up pointer-events-none select-none"
                style={{ "--drift-x": driftX } as React.CSSProperties}
              >
                {react.emoji}
              </div>
            );
          })}
        </div>

        {/* Diagonal Resize Handle (Only shown in draggable mode) */}
        {!isSplit && (
          <div
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
            className="resize-handle absolute bottom-2.5 right-2.5 w-6 h-6 cursor-se-resize z-35 flex items-center justify-center text-stone-400 hover:text-amber-500 hover:scale-110 active:scale-95 transition-all pointer-events-auto bg-stone-900/90 hover:bg-stone-850 rounded-lg border border-stone-800 shadow-md"
            title="Arrastar para redimensionar"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2">
              <polyline points="4 14 4 20 10 20" />
              <polyline points="20 10 20 4 14 4" />
              <line x1="14" y1="10" x2="20" y2="4" />
              <line x1="10" y1="14" x2="4" y2="20" />
            </svg>
          </div>
        )}
      </div>

      {/* User Info Label below Video Card */}
      <div className="flex items-center justify-between px-2.5 font-sans min-h-[1.75rem] bg-stone-950/20 py-1 rounded-lg border border-white/3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-stone-300 tracking-wide truncate max-w-[100px] md:max-w-[130px]">
              {userName}
            </span>
            {isLocal && (
              <span className="text-[9px] text-stone-500 font-medium bg-stone-900/60 border border-stone-850 px-1.5 py-0.5 rounded">
                Você
              </span>
            )}
            
            {/* Discrete connection quality dot/text */}
            <div className="flex items-center gap-1 ml-1 group/quality relative cursor-help">
              <span className={`w-1.5 h-1.5 rounded-full ${quality.color}`} />
              {quality.text === "Instável" && (
                <span className="text-[8px] text-amber-500 font-medium animate-pulse">
                  Instável
                </span>
              )}
              {quality.text === "Conectando" && (
                <span className="text-[8px] text-stone-500 font-medium">
                  Conectando
                </span>
              )}
              <span className="absolute bottom-5 left-0 scale-0 group-hover/quality:scale-100 bg-stone-900 border border-stone-800 text-stone-300 text-[9px] px-2 py-1 rounded font-medium transition-all duration-200 pointer-events-none whitespace-nowrap shadow-lg z-30">
                Conexão: {quality.text}
              </span>
            </div>
          </div>
          {isLocal && !isSplit && (
            <span className="text-[8px] text-stone-500 font-medium tracking-wide">
              Ajuste no canto • Arraste p/ mover
            </span>
          )}
        </div>
        
        {/* Indicators Panel (Muted / Audio output active) */}
        <div className="flex gap-1.5 items-center">
          {!isAudioActive && (
            <div className="text-cozy-sunset animate-pulse" title="Mutado">
              <MicOff className="w-3.5 h-3.5" />
            </div>
          )}
          {isSpeaking && isAudioActive && (
            /* Premium animated voice wave lines */
            <div className="flex gap-0.5 items-center h-3" title="Falando">
              <span className="w-0.5 h-2 bg-amber-500 rounded animate-bounce" style={{ animationDelay: "0.1s" }} />
              <span className="w-0.5 h-3 bg-amber-500 rounded animate-bounce" style={{ animationDelay: "0.2s" }} />
              <span className="w-0.5 h-1.5 bg-amber-500 rounded animate-bounce" style={{ animationDelay: "0.3s" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
