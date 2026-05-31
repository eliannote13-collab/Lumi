import { useState, useEffect, useRef } from "react";
import { useWebRTC } from "./hooks/useWebRTC";
import { ActivitySelector } from "./components/ActivitySelector";
import { CozyControls } from "./components/CozyControls";
import { CozyChat } from "./components/CozyChat";
import { VideoCard } from "./components/VideoCard";
import {
  Tv,
  Share2,
  Copy,
  Check,
  Users,
  Heart
} from "lucide-react";

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [userId] = useState(() => Math.random().toString(36).substring(2, 10));
  const [userName, setUserName] = useState<string>("");
  const [isJoined, setIsJoined] = useState(false);
  const [inputRoomId, setInputRoomId] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGuest] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("room");
  });
  
  // Lobby navigation states
  const [showInviteInput, setShowInviteInput] = useState(false);

  // UI responsive and interactive states
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isDimActive, setIsDimActive] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isPortrait, setIsPortrait] = useState(() => window.innerHeight > window.innerWidth);
  const [isKeyboardNavActive, setIsKeyboardNavActive] = useState(false);
  const [isTVMode, setIsTVMode] = useState(() => {
    const isLargeScreen = window.innerWidth > 1600;
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    return isLargeScreen && isCoarsePointer;
  });

  const controlsTimeoutRef = useRef<any>(null);

  // Parse room query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    if (roomParam) {
      setRoomId(roomParam);
    }
  }, []);

  // Update layout parameters on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsPortrait(window.innerHeight > window.innerWidth);
      const isLargeScreen = window.innerWidth > 1600;
      const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
      setIsTVMode((isLargeScreen && isCoarsePointer) || isKeyboardNavActive);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isKeyboardNavActive]);

  // Inactivity mouse idle timer
  useEffect(() => {
    const resetIdleTimer = () => {
      setShowControls(true);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      // Hide/dim controls after 4 seconds of inactivity if user is inside the room
      if (isJoined) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 4000);
      }
    };

    window.addEventListener("mousemove", resetIdleTimer);
    window.addEventListener("keypress", resetIdleTimer);
    window.addEventListener("touchstart", resetIdleTimer);

    resetIdleTimer();

    return () => {
      window.removeEventListener("mousemove", resetIdleTimer);
      window.removeEventListener("keypress", resetIdleTimer);
      window.removeEventListener("touchstart", resetIdleTimer);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isJoined, isDimActive]);

  // Handle keyboard navigation to trigger TV Mode accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Tab" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {
        setIsKeyboardNavActive(true);
        setIsTVMode(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Turn off keyboard navigation (and thus TV Mode if screen is normal) if mouse moves
  useEffect(() => {
    const handleMouseMove = () => {
      if (isKeyboardNavActive) {
        setIsKeyboardNavActive(false);
        const isLargeScreen = window.innerWidth > 1600;
        const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
        setIsTVMode(isLargeScreen && isCoarsePointer);
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isKeyboardNavActive]);

  const toggleDimMode = () => {
    setIsDimActive((prev) => {
      const next = !prev;
      if (!next) {
        setShowControls(true);
      } else {
        setIsChatOpen(false); // Auto close chat when theater mode is active
      }
      return next;
    });
  };

  const handleCreateRoom = () => {
    const randomRoomId = Math.random().toString(36).substring(2, 11);
    const randomName = `Participante ${Math.floor(Math.random() * 90 + 10)}`;
    setUserName(randomName);
    setRoomId(randomRoomId);
    window.history.pushState({}, "", `?room=${randomRoomId}`);
  };

  const handleJoinFromInput = (e: React.FormEvent) => {
    e.preventDefault();
    let targetRoomId = inputRoomId.trim();
    if (targetRoomId.includes("?room=")) {
      targetRoomId = targetRoomId.split("?room=")[1].split("&")[0];
    }
    
    if (targetRoomId) {
      const randomName = `Participante ${Math.floor(Math.random() * 90 + 10)}`;
      setUserName(randomName);
      setRoomId(targetRoomId);
      window.history.pushState({}, "", `?room=${targetRoomId}`);
    }
  };

  const handleConfirmName = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      setIsJoined(true);
    }
  };

  const handleCopyLink = () => {
    const roomUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(roomUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShareLink = () => {
    const roomUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    if (navigator.share) {
      navigator.share({
        title: "Entrar na minha sala Lumi",
        text: "Vamos assistir ou compartilhar algo juntos?",
        url: roomUrl,
      }).catch(console.error);
    } else {
      handleCopyLink();
    }
  };

  const handleLeaveRoom = () => {
    setIsJoined(false);
    setRoomId(null);
    setShowInviteInput(false);
    window.history.pushState({}, "", window.location.pathname);
  };

  // Helper to space out draggable cameras (only used when screen sharing is active)
  const getInitialCoords = (idx: number, isLocalUser: boolean) => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      const y = window.innerHeight - 240;
      const x = isLocalUser ? 20 : 160 + idx * 135;
      return { x, y, width: 120 };
    } else {
      const x = window.innerWidth - 300;
      const y = isLocalUser ? 100 : 310 + idx * 210;
      return { x, y, width: 260 };
    }
  };

  // Hook activation
  const webrtc = useWebRTC(
    isJoined && roomId ? roomId : "",
    isJoined ? userId : "",
    isJoined ? userName : ""
  );

  const getScreenShareOwner = () => {
    if (webrtc.isSharingScreen && webrtc.screenStream) {
      return { isMe: true, name: "Você", stream: webrtc.screenStream };
    }
    for (const peer of webrtc.peers.values()) {
      if (peer.screenStream) {
        return { isMe: false, name: peer.userName, stream: peer.screenStream };
      }
    }
    return null;
  };

  const activeShare = getScreenShareOwner();
  const peersCount = webrtc.peers.size;

  // Contextual modes
  const isSplitScreenMode = isJoined && peersCount === 1 && !activeShare;
  const isMultiGridMode = isJoined && peersCount > 1 && !activeShare;
  const isAloneMode = isJoined && peersCount === 0 && !activeShare;

  const isReconnecting = !webrtc.isConnected || 
    (peersCount > 0 && Array.from(webrtc.peers.values()).some(p => p.connectionState === "disconnected" || p.connectionState === "connecting"));

  const ScreenShareViewport = ({ stream }: { stream: MediaStream }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }, [stream]);

    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain rounded-2xl bg-black border border-stone-850 shadow-2xl"
      />
    );
  };

  // VIEW 1: Lobby view (Simplified & Premium)
  if (!roomId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative p-6 bg-[#0B0A09]">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
        
        <div className="w-full max-w-sm cozy-glass border border-stone-850/60 p-8 rounded-3xl shadow-2xl relative z-10 flex flex-col items-center animate-fade-in">
          {/* Logo brand */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-3xl">✨</span>
            <h1 className="text-3xl font-bold font-display tracking-tight text-stone-100 bg-gradient-to-r from-stone-100 via-stone-200 to-amber-200 bg-clip-text text-transparent">
              Lumi
            </h1>
          </div>
          
          <p className="text-xs text-stone-400 font-sans text-center mb-8 max-w-[260px] leading-relaxed">
            Seu espaço privado, mesmo à distância.
          </p>

          <div className="w-full space-y-4">
            {!showInviteInput ? (
              <>
                <button
                  onClick={handleCreateRoom}
                  className="w-full py-3 bg-stone-100 text-stone-950 text-xs font-semibold rounded-2xl shadow-md hover:bg-stone-200 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer h-12"
                >
                  Criar Espaço
                </button>
                
                <button
                  onClick={() => setShowInviteInput(true)}
                  className="w-full py-3 bg-stone-900/60 text-stone-300 text-xs font-semibold rounded-2xl hover:text-stone-100 hover:bg-stone-850 transition-all duration-300 border border-stone-850 flex items-center justify-center gap-2 cursor-pointer h-12"
                >
                  Entrar com Convite
                </button>
              </>
            ) : (
              <form onSubmit={handleJoinFromInput} className="space-y-4 animate-fade-in">
                <input
                  type="text"
                  required
                  placeholder="Insira o link ou código"
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-900/60 text-stone-200 border border-stone-850 rounded-2xl text-xs outline-none focus:border-stone-700/60 focus:bg-stone-900 transition-all placeholder-stone-600 h-12"
                />
                
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowInviteInput(false)}
                    className="flex-1 py-3 bg-stone-900/60 text-stone-400 text-xs font-semibold rounded-2xl hover:bg-stone-850 hover:text-stone-300 transition-all border border-stone-850 cursor-pointer h-12"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-stone-100 text-stone-950 text-xs font-semibold rounded-2xl hover:bg-stone-200 transition-all cursor-pointer h-12"
                  >
                    Entrar
                  </button>
                </div>
              </form>
            )}
          </div>
          
          {/* Signature */}
          <div className="mt-6 text-[10px] text-stone-650 font-medium tracking-wider">
            Feito por <span className="text-stone-500 font-semibold hover:text-amber-400 transition-colors">Elian Carlos</span>
          </div>
        </div>
      </div>
    );
  }

  // VIEW 2: Username setup view
  if (!isJoined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0B0A09]">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm cozy-glass border border-stone-850/60 p-8 rounded-3xl shadow-2xl relative z-10 flex flex-col items-center animate-fade-in">
          <span className="text-2xl mb-2">💫</span>
          <h2 className="text-lg font-bold font-display tracking-tight text-stone-100">
            Confirmar presença
          </h2>
          <p className="text-[11px] text-stone-500 font-sans text-center mb-6">
            Como você gostaria de aparecer no espaço?
          </p>

          <form onSubmit={handleConfirmName} className="w-full space-y-4">
            <input
              type="text"
              required
              maxLength={15}
              placeholder="Digite seu nome (ex: Thiago)"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-4 py-3 bg-stone-900/60 text-stone-200 border border-stone-850 rounded-2xl text-xs outline-none focus:border-stone-700/60 focus:bg-stone-900 transition-all placeholder-stone-600 h-12"
            />
            
            <button
              type="submit"
              className="w-full py-3 bg-stone-100 text-stone-950 text-xs font-semibold rounded-2xl hover:bg-stone-200 active:scale-98 transition-all duration-300 flex items-center justify-center cursor-pointer h-12"
            >
              Entrar no Lumi
            </button>
          </form>
        </div>
      </div>
    );
  }

  // VIEW 3: Immersive Room View
  return (
    <div className={`min-h-screen flex flex-col relative bg-[#0B0A09] font-sans transition-colors duration-1000 ${isDimActive ? "bg-black" : ""}`}>
      {/* Ultrawide Max-Width Layout Confiner wrapper */}
      <div className="flex-1 flex flex-col w-full mx-auto max-w-[1600px] relative overflow-hidden">
        
        {/* Header Panel */}
        <header
          role="banner"
          className={`px-6 py-4 flex items-center justify-between border-b transition-all duration-700 ${
            isDimActive ? "border-transparent bg-transparent opacity-0 -translate-y-4 pointer-events-none" : "border-stone-900/60 cozy-glass-light bg-[#0B0A09]/40 z-30"
          } ${showControls ? "translate-y-0 opacity-100" : ""}`}
        >
          <div className="flex items-center gap-3">
            <div
              onClick={handleLeaveRoom}
              className="flex flex-col cursor-pointer hover:opacity-85 transition-opacity"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xl">✨</span>
                <span className="text-sm font-bold font-display tracking-wide text-stone-200">
                  Lumi
                </span>
              </div>
              <span className="text-[8px] text-stone-600 font-medium tracking-wide mt-0.5">Feito por Elian Carlos</span>
            </div>
            <span className="text-stone-700">/</span>
            <span className="text-xs font-semibold text-stone-500 bg-stone-900/40 border border-stone-850 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {peersCount + 1}
            </span>
          </div>

          {/* Activity selector component */}
          {!isGuest && (
            <div className="hidden md:block">
              <ActivitySelector
                currentActivity={webrtc.currentActivity}
                onChangeActivity={webrtc.changeActivity}
                isHost={true}
              />
            </div>
          )}

          {/* Room actions: Share / Copy */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-850 text-[11px] font-semibold text-stone-300 hover:text-stone-100 hover:bg-stone-900/50 transition-all active:scale-95 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-amber-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copiado!" : "Copiar Link"}</span>
            </button>
            
            <button
              onClick={handleShareLink}
              className="p-1.5 rounded-xl border border-stone-850 text-stone-300 hover:text-stone-100 hover:bg-stone-900/50 transition-all cursor-pointer"
              title="Compartilhar Espaço"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main workspace container */}
        <main 
          role="main" 
          className={`flex-1 flex flex-col md:flex-row relative overflow-hidden transition-all duration-700 ${
            isDimActive ? "p-3 gap-3" : "p-6 gap-6"
          }`}
        >
          
          {/* Ambient projection glow from shared content */}
          {activeShare && (
            <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] aspect-video rounded-full bg-amber-500/5 blur-[120px] animate-pulse-slow animate-pulse" />
            </div>
          )}

          {/* SCENARIO 1: ACTIVE SCREEN SHARE layout */}
          {activeShare && (
            <div className="flex-1 flex flex-col items-center justify-center z-10 relative">
              <div className={`w-full h-full flex flex-col justify-center select-none relative group transition-all duration-700 ${
                isDimActive ? "max-h-[50vh] md:max-h-[88vh]" : "max-h-[45vh] md:max-h-[75vh]"
              }`}>
                <ScreenShareViewport stream={activeShare.stream} />
                
                {/* Overlay Screen Share owner tag */}
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 border border-stone-850 rounded-xl text-xs font-semibold text-stone-300 backdrop-blur-md flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Tv className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>Transmissão de: {activeShare.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* SCENARIO 2: MODO 2 PESSOAS SPLIT SCREEN (when sharing is INACTIVE) */}
          {isSplitScreenMode && (
            <div 
              className={`flex z-10 w-full h-[calc(100vh-160px)] md:h-[calc(100vh-140px)] gap-4 transition-all duration-500 ${
                isPortrait ? "flex-col" : "flex-row"
              }`}
            >
              {/* Remote Partner camera */}
              {Array.from(webrtc.peers.values()).map((peer) => (
                <div key={peer.userId} className="flex-1 min-h-0 min-w-0">
                  <VideoCard
                    stream={peer.stream}
                    userName={peer.userName}
                    isLocal={false}
                    isAudioActive={peer.isAudioActive}
                    isVideoActive={peer.isVideoActive}
                    reactions={webrtc.reactions.filter((r) => r.userId === peer.userId)}
                    initialX={0}
                    initialY={0}
                    isSplit={true}
                    connectionState={peer.connectionState}
                    socketConnected={webrtc.isConnected}
                  />
                </div>
              ))}
              
              {/* Local User camera */}
              <div className="flex-1 min-h-0 min-w-0">
                <VideoCard
                  stream={webrtc.localStream}
                  userName={userName}
                  isLocal={true}
                  isAudioActive={webrtc.isAudioActive}
                  isVideoActive={webrtc.isVideoActive}
                  reactions={webrtc.reactions.filter((r) => r.userId === userId)}
                  initialX={0}
                  initialY={0}
                  isSplit={true}
                  socketConnected={webrtc.isConnected}
                />
              </div>
            </div>
          )}

          {/* SCENARIO 3: MULTI-GRID GRID (>2 people, screen share INACTIVE) */}
          {isMultiGridMode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 max-w-4xl mx-auto w-full z-10 relative justify-center items-center h-[calc(100vh-180px)] overflow-y-auto px-4 py-6">
              {/* Local User webcam */}
              <VideoCard
                stream={webrtc.localStream}
                userName={userName}
                isLocal={true}
                isAudioActive={webrtc.isAudioActive}
                isVideoActive={webrtc.isVideoActive}
                reactions={webrtc.reactions.filter((r) => r.userId === userId)}
                initialX={0}
                initialY={0}
                isSplit={true}
                socketConnected={webrtc.isConnected}
              />

              {/* Remote Peers webcams */}
              {Array.from(webrtc.peers.values()).map((peer) => (
                <VideoCard
                  key={peer.userId}
                  stream={peer.stream}
                  userName={peer.userName}
                  isLocal={false}
                  isAudioActive={peer.isAudioActive}
                  isVideoActive={peer.isVideoActive}
                  reactions={webrtc.reactions.filter((r) => r.userId === peer.userId)}
                  initialX={0}
                  initialY={0}
                  isSplit={true}
                  connectionState={peer.connectionState}
                  socketConnected={webrtc.isConnected}
                />
              ))}
            </div>
          )}

          {/* SCENARIO 4: ALONE EMPTY STATE (when alone and no share is active) */}
          {isAloneMode && (
            <div className="flex-1 flex flex-col items-center justify-center z-10 relative">
              <div className="flex flex-col items-center text-center max-w-sm p-8 rounded-3xl border border-stone-850/40 cozy-glass relative overflow-hidden animate-fade-in">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/10 via-amber-500/30 to-amber-500/10" />
                <Heart className="w-10 h-10 text-stone-600 mb-4 animate-pulse-slow" />
                <h2 className="text-sm font-bold font-display text-stone-200 mb-1.5">Seu espaço está pronto.</h2>
                <p className="text-[11px] text-stone-500 leading-relaxed mb-6">
                  Envie o link de convite para que outra pessoa se conecte instantaneamente ao seu espaço privado.
                </p>
                
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-stone-900 border border-stone-850 hover:bg-stone-850 text-stone-200 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-amber-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Link Copiado!" : "Convidar Alguém"}</span>
                </button>
              </div>

              {/* Render Local User webcam draggable card in Alone view so they can adjust camera layout while waiting */}
              <VideoCard
                stream={webrtc.localStream}
                userName={userName}
                isLocal={true}
                isAudioActive={webrtc.isAudioActive}
                isVideoActive={webrtc.isVideoActive}
                reactions={webrtc.reactions.filter((r) => r.userId === userId)}
                initialX={getInitialCoords(0, true).x}
                initialY={getInitialCoords(0, true).y}
                initialWidth={getInitialCoords(0, true).width}
                socketConnected={webrtc.isConnected}
              />
               </div>
          )}

          {/* ACTIVE SCREEN SHARING: Draggable webcams overlays */}
          {activeShare && (
            <div
              className={
                window.innerWidth < 768
                  ? "flex flex-row gap-3.5 z-20 w-full overflow-x-auto py-2 justify-center" // mobile bottom horizontal row
                  : isDimActive
                    ? "absolute bottom-6 right-6 flex flex-row gap-3.5 z-20 w-auto transition-all duration-700" // desktop corner row in dim
                    : "absolute top-6 right-6 w-56 md:w-64 flex flex-col gap-5 z-20 transition-all duration-700" // desktop standard stack sidebar
              }
            >
              {/* Local User webcam */}
              <div className={window.innerWidth < 768 ? "w-28 flex-shrink-0 aspect-[4/3]" : isDimActive ? "w-40 flex-shrink-0 aspect-[4/3]" : ""}>
                <VideoCard
                  stream={webrtc.localStream}
                  userName={userName}
                  isLocal={true}
                  isAudioActive={webrtc.isAudioActive}
                  isVideoActive={webrtc.isVideoActive}
                  reactions={webrtc.reactions.filter((r) => r.userId === userId)}
                  initialX={getInitialCoords(0, true).x}
                  initialY={getInitialCoords(0, true).y}
                  initialWidth={getInitialCoords(0, true).width}
                  isSplit={window.innerWidth < 768} // disable drag on mobile
                  socketConnected={webrtc.isConnected}
                />
              </div>

              {/* Remote Peers webcams */}
              {Array.from(webrtc.peers.values()).map((peer, idx) => (
                <div key={peer.userId} className={window.innerWidth < 768 ? "w-28 flex-shrink-0 aspect-[4/3]" : isDimActive ? "w-40 flex-shrink-0 aspect-[4/3]" : ""}>
                  <VideoCard
                    stream={peer.stream}
                    userName={peer.userName}
                    isLocal={false}
                    isAudioActive={peer.isAudioActive}
                    isVideoActive={peer.isVideoActive}
                    reactions={webrtc.reactions.filter((r) => r.userId === peer.userId)}
                    initialX={getInitialCoords(idx, false).x}
                    initialY={getInitialCoords(idx, false).y}
                    initialWidth={getInitialCoords(idx, false).width}
                    isSplit={window.innerWidth < 768} // disable drag on mobile
                    connectionState={peer.connectionState}
                    socketConnected={webrtc.isConnected}
                  />
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Reconnect State Amber Indicator */}
        {isJoined && isReconnecting && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] pointer-events-none animate-fade-in">
            <div className="bg-amber-500/10 border border-amber-500/35 text-amber-500 text-xs px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md shadow-lg animate-pulse font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-ping" />
              <span>Tentando restaurar a conexão...</span>
            </div>
          </div>
        )}

        {/* Cozy Control Center Panel */}
        <CozyControls
          isAudioActive={webrtc.isAudioActive}
          isVideoActive={webrtc.isVideoActive}
          isSharingScreen={webrtc.isSharingScreen}
          isDimActive={isDimActive}
          isChatOpen={isChatOpen}
          onToggleMic={webrtc.toggleMicrophone}
          onToggleCamera={webrtc.toggleCamera}
          onToggleShare={webrtc.isSharingScreen ? webrtc.stopScreenShare : webrtc.startScreenShare}
          onToggleDim={toggleDimMode}
          onToggleChat={() => setIsChatOpen((prev) => !prev)}
          onLeave={handleLeaveRoom}
          visible={showControls && !(isMobile && isChatOpen)}
          isTV={isTVMode}
        />

        {/* Slide-out Sidebar Chat */}
        <CozyChat
          isOpen={isChatOpen && !isDimActive}
          messages={webrtc.messages}
          currentUserId={userId}
          onSendMessage={webrtc.sendMessage}
          onSendReaction={webrtc.sendReaction}
          onClose={() => setIsChatOpen(false)}
        />
        
        {/* Toast alert if someone just shared screen */}
        {activeShare && !webrtc.isSharingScreen && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs px-4 py-2 rounded-xl backdrop-blur-md shadow-lg z-50 animate-bounce pointer-events-none">
            🎬 Transmissão iniciada na sala!
          </div>
        )}
      </div>
    </div>
  );
}
