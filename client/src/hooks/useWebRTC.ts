import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";



export interface RemotePeer {
  userId: string;
  userName: string;
  socketId: string;
  stream: MediaStream | null;
  screenStream: MediaStream | null;
  isAudioActive: boolean;
  isVideoActive: boolean;
  connectionState?: RTCPeerConnectionState;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface FloatingReaction {
  id: string;
  userId: string;
  emoji: string;
}

export const useWebRTC = (roomId: string, userId: string, userName: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, RemotePeer>>(new Map());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [currentActivity, setCurrentActivity] = useState<string>("none");
  
  const [isAudioActive, setIsAudioActive] = useState<boolean>(true);
  const [isVideoActive, setIsVideoActive] = useState<boolean>(true);
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  
  // Track active RTCPeerConnections: userId -> RTCPeerConnection
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  // Track makingOffer state for Perfect Negotiation: userId -> boolean
  const makingOfferRef = useRef<Map<string, boolean>>(new Map());
  // Store screen stream ID map: userId -> screenStreamId (tells us which remote stream is a screen share)
  const remoteScreenStreamIdsRef = useRef<Map<string, string>>(new Map());

  // Setup Socket URL based on current host (supports mobile testing on local network)
  const getSocketUrl = () => {
    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }
    const hostname = window.location.hostname;
    // For local dev, backend is on 3001
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:3001";
    }
    return `http://${hostname}:3001`;
  };

  // Dynamic ICE/TURN servers list (using your Metered TURN servers as the default client fallback)
  const iceServersRef = useRef<RTCIceServer[]>([
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:br.relay.metered.ca:80",
      username: "111ba03923c126c367b7f7a8",
      credential: "MZU6qfnODu99E6Vs",
    },
    {
      urls: "turn:br.relay.metered.ca:80?transport=tcp",
      username: "111ba03923c126c367b7f7a8",
      credential: "MZU6qfnODu99E6Vs",
    },
    {
      urls: "turn:br.relay.metered.ca:443",
      username: "111ba03923c126c367b7f7a8",
      credential: "MZU6qfnODu99E6Vs",
    },
    {
      urls: "turns:br.relay.metered.ca:443?transport=tcp",
      username: "111ba03923c126c367b7f7a8",
      credential: "MZU6qfnODu99E6Vs",
    },
    { urls: "stun:stun.l.google.com:19302" }
  ]);

  // Load ICE/TURN servers from backend
  useEffect(() => {
    if (!roomId) return;
    const fetchIceServers = async () => {
      try {
        const socketUrl = getSocketUrl();
        const res = await fetch(`${socketUrl}/ice-servers`);
        if (res.ok) {
          const servers = await res.json();
          iceServersRef.current = servers;
          console.log("Loaded remote ICE servers successfully:", servers);
        }
      } catch (err) {
        console.warn("Failed to fetch remote ICE servers, falling back to default STUN:", err);
      }
    };
    fetchIceServers();
  }, [roomId]);

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const nextState = !videoTrack.enabled;
        videoTrack.enabled = nextState;
        setIsVideoActive(nextState);
        
        // Notify others
        socketRef.current?.emit("send-reaction", {
          roomId,
          reaction: {
            type: "status-change",
            userId,
            isVideoActive: nextState,
            isAudioActive
          }
        });
      }
    }
  };

  // Toggle Microphone
  const toggleMicrophone = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const nextState = !audioTrack.enabled;
        audioTrack.enabled = nextState;
        setIsAudioActive(nextState);

        // Notify others
        socketRef.current?.emit("send-reaction", {
          roomId,
          reaction: {
            type: "status-change",
            userId,
            isVideoActive,
            isAudioActive: nextState
          }
        });
      }
    }
  };

  // Broadcast current activity (Watch, Music, Browse, Screenshare)
  const changeActivity = (activity: string) => {
    setCurrentActivity(activity);
    socketRef.current?.emit("activity-change", { roomId, activity });
  };

  // Send message to the room
  const sendMessage = (text: string) => {
    if (!socketRef.current || !text.trim()) return;

    const message: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      userId,
      userName,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    socketRef.current.emit("send-message", { roomId, message });
  };

  // Send a reaction emoji
  const sendReaction = (emoji: string) => {
    if (!socketRef.current) return;

    const reaction: FloatingReaction = {
      id: Math.random().toString(36).substring(2, 9),
      userId,
      emoji
    };

    // Show locally
    setReactions((prev) => [...prev, reaction]);
    
    // Broadcast to room
    socketRef.current.emit("send-reaction", {
      roomId,
      reaction: {
        type: "emoji",
        data: reaction
      }
    });
  };

  // Screen sharing logic
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      screenStreamRef.current = stream;
      setScreenStream(stream);
      setIsSharingScreen(true);
      changeActivity("screenshare");

      // Broadcast screen share state
      socketRef.current?.emit("send-reaction", {
        roomId,
        reaction: {
          type: "screen-share-start",
          userId,
          streamId: stream.id
        }
      });

      // Add screen tracks to all active peer connections
      stream.getTracks().forEach((track) => {
        pcsRef.current.forEach((pc) => {
          pc.addTrack(track, stream);
        });
      });

      // Handle Stop Share click in browser UI
      trackScreenShareEnding(stream);

    } catch (err) {
      console.error("Error sharing screen:", err);
      setIsSharingScreen(false);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      
      // Remove track from all PeerConnections
      pcsRef.current.forEach((pc) => {
        // Find senders that belong to screen share stream
        pc.getSenders().forEach((sender) => {
          if (sender.track && screenStreamRef.current?.getTracks().includes(sender.track)) {
            pc.removeTrack(sender);
          }
        });
      });

      // Notify others
      socketRef.current?.emit("send-reaction", {
        roomId,
        reaction: {
          type: "screen-share-stop",
          userId
        }
      });

      screenStreamRef.current = null;
      setScreenStream(null);
      setIsSharingScreen(false);
      changeActivity("none");
    }
  };

  const trackScreenShareEnding = (stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.onended = () => {
        stopScreenShare();
      };
    }
  };

  // Initialize camera and micro
  useEffect(() => {
    if (!roomId || !userName) return;

    const initLocalMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          },
          audio: true
        });
        
        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch (err) {
        console.error("Error accessing camera/microphone:", err);
        // Fallback 1: Try audio only if camera is blocked or missing
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
          });
          localStreamRef.current = audioStream;
          setLocalStream(audioStream);
          setIsVideoActive(false);
        } catch (audioErr) {
          console.error("Microphone also blocked:", audioErr);
          setIsVideoActive(false);
          setIsAudioActive(false);
          // Set empty MediaStream so hook states are initialized without crashing
          const emptyStream = new MediaStream();
          localStreamRef.current = emptyStream;
          setLocalStream(emptyStream);
        }
      }
    };

    initLocalMedia();

    return () => {
      // Cleanup local streams
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    };
  }, [roomId, userName]);

  // Initialize socket connection and WebRTC signaling (Independent of localStream load state)
  useEffect(() => {
    if (!roomId) return;

    const socketUrl = getSocketUrl();
    console.log(`Connecting to socket at URL: ${socketUrl}`);
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(`Connected to signaling server with socket ID: ${socket.id}`);
      setIsConnected(true);

      // Join the room
      socket.emit("join-room", { roomId, userId, userName });
      
      // Auto notification locally
      setMessages((prev) => [
        ...prev,
        {
          id: `welcome-${Date.now()}`,
          userId: "system",
          userName: "Lumi",
          text: `Você entrou na sala.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      setIsConnected(false);
    });

    // Received the list of existing users in the room
    socket.on("room-users", ({ users, currentActivity }) => {
      console.log("Existing users in room received:", users);
      setCurrentActivity(currentActivity);

      setPeers((prev) => {
        const next = new Map(prev);
        users.forEach((user: { userId: string; userName: string; socketId: string }) => {
          if (!next.has(user.userId)) {
            next.set(user.userId, {
              userId: user.userId,
              userName: user.userName,
              socketId: user.socketId,
              stream: null,
              screenStream: null,
              isAudioActive: true,
              isVideoActive: true
            });
          }
        });
        return next;
      });

      users.forEach((user: { userId: string; userName: string; socketId: string }) => {
        // Create peer connection for each user
        createPeerConnection(user.userId, user.userName, user.socketId);
      });
    });

    // A new user has joined the room
    socket.on("user-joined", ({ userId: joiningUserId, userName: joiningUserName, socketId }) => {
      console.log(`New user joined: ${joiningUserName} (${joiningUserId})`);
      
      // Add user to the peers dictionary immediately so they show up in the UI
      setPeers((prev) => {
        const next = new Map(prev);
        next.set(joiningUserId, {
          userId: joiningUserId,
          userName: joiningUserName,
          socketId,
          stream: null,
          screenStream: null,
          isAudioActive: true,
          isVideoActive: true
        });
        return next;
      });

      // Create peer connection
      createPeerConnection(joiningUserId, joiningUserName, socketId);

      // System notification in chat
      setMessages((prev) => [
        ...prev,
        {
          id: `join-${Date.now()}`,
          userId: "system",
          userName: "Lumi",
          text: `${joiningUserName} entrou na sala.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    });

    // Handle incoming WebRTC signaling data (SDP and ICE Candidates using Perfect Negotiation)
    socket.on("signal", async ({ senderUserId, signalData }) => {
      const pc = pcsRef.current.get(senderUserId);
      if (!pc) {
        console.warn(`Signaling message received from ${senderUserId} but no peer connection exists.`);
        return;
      }

      try {
        if (signalData.description) {
          const description = signalData.description;
          const polite = userId > senderUserId; // Tie breaker: higher user ID is polite
          const makingOffer = makingOfferRef.current.get(senderUserId) || false;
          
          // Check for collision
          const offerCollision = (description.type === "offer") &&
                                 (makingOffer || pc.signalingState !== "stable");

          const ignoreOffer = !polite && offerCollision;
          if (ignoreOffer) {
            console.log(`Ignoring offer from ${senderUserId} due to collision (impolite peer)`);
            return;
          }

          await pc.setRemoteDescription(new RTCSessionDescription(description));
          if (description.type === "offer") {
            await pc.setLocalDescription();
            socket.emit("signal", {
              targetUserId: senderUserId,
              senderUserId: userId,
              signalData: { description: pc.localDescription }
            });
          }
        } else if (signalData.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          } catch (err) {
            console.warn(`Error adding ICE candidate from ${senderUserId}:`, err);
          }
        }
      } catch (err) {
        console.error(`Error handling signal from ${senderUserId}:`, err);
      }
    });

    // Receives chat message
    socket.on("message", (message: ChatMessage) => {
      console.log("Chat message received:", message);
      setMessages((prev) => [...prev, message]);
    });

    // Receives ambient reactions, status changes, or screen share notifications
    socket.on("reaction", (payload) => {
      if (payload.type === "emoji") {
        setReactions((prev) => [...prev, payload.data]);
      } else if (payload.type === "status-change") {
        setPeers((prev) => {
          const next = new Map(prev);
          const peer = next.get(payload.userId);
          if (peer) {
            next.set(payload.userId, {
              ...peer,
              isVideoActive: payload.isVideoActive,
              isAudioActive: payload.isAudioActive
            });
          }
          return next;
        });
      } else if (payload.type === "screen-share-start") {
        remoteScreenStreamIdsRef.current.set(payload.userId, payload.streamId);
        // Force state update to attach tracks correctly
        setPeers((prev) => new Map(prev));
      } else if (payload.type === "screen-share-stop") {
        remoteScreenStreamIdsRef.current.delete(payload.userId);
        setPeers((prev) => {
          const next = new Map(prev);
          const peer = next.get(payload.userId);
          if (peer) {
            next.set(payload.userId, {
              ...peer,
              screenStream: null
            });
          }
          return next;
        });
      }
    });

    // Receives active room activity changed by someone else
    socket.on("activity-change", (activity: string) => {
      setCurrentActivity(activity);
    });

    // An user disconnected
    socket.on("user-left", ({ userId: leftUserId, userName: leftUserName }) => {
      console.log(`User left: ${leftUserName} (${leftUserId})`);
      
      // Clean up peer connection
      const pc = pcsRef.current.get(leftUserId);
      if (pc) {
        pc.close();
        pcsRef.current.delete(leftUserId);
      }

      makingOfferRef.current.delete(leftUserId);
      remoteScreenStreamIdsRef.current.delete(leftUserId);

      // Remove from state
      setPeers((prev) => {
        const next = new Map(prev);
        next.delete(leftUserId);
        return next;
      });

      // System notification in chat
      setMessages((prev) => [
        ...prev,
        {
          id: `left-${Date.now()}`,
          userId: "system",
          userName: "Lumi",
          text: `${leftUserName} saiu da sala.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    });

    return () => {
      socket.disconnect();
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      makingOfferRef.current.clear();
      remoteScreenStreamIdsRef.current.clear();
    };
  }, [roomId]);

  // Handle adding local stream tracks dynamically when localStream loads
  useEffect(() => {
    if (!localStream) return;

    console.log("Local media stream loaded. Adding tracks to existing peer connections.");
    
    pcsRef.current.forEach((pc, targetUserId) => {
      const senders = pc.getSenders();
      
      localStream.getTracks().forEach((track) => {
        // Check if track is already added to this peer connection
        const alreadyAdded = senders.some((s) => s.track === track);
        if (!alreadyAdded) {
          console.log(`Adding local track (${track.kind}) to peer ${targetUserId}`);
          pc.addTrack(track, localStream);
        }
      });
    });
  }, [localStream]);

  // Create an RTCPeerConnection
  const createPeerConnection = (targetUserId: string, targetUserName: string, targetSocketId: string) => {
    if (pcsRef.current.has(targetUserId)) {
      console.log(`Closing existing peer connection for user ${targetUserName}`);
      pcsRef.current.get(targetUserId)?.close();
    }

    console.log(`Initializing RTCPeerConnection for user ${targetUserName}`);
    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current
    });
    pcsRef.current.set(targetUserId, pc);
    makingOfferRef.current.set(targetUserId, false);

    // Add local webcam/mic tracks if they are loaded
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        console.log(`Attaching track (${track.kind}) to peer connection for ${targetUserName}`);
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Add local screen share tracks if active
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, screenStreamRef.current!);
      });
    }

    // Send ICE candidates to signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("signal", {
          targetUserId,
          senderUserId: userId,
          signalData: {
            candidate: event.candidate
          }
        });
      }
    };

    // Receive remote tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (!remoteStream) return;

      console.log(`Received remote track for ${targetUserName}: kind=${event.track.kind}, streamId=${remoteStream.id}`);

      // Check if this stream is a screen share stream
      const screenStreamId = remoteScreenStreamIdsRef.current.get(targetUserId);
      const isScreenShare = screenStreamId === remoteStream.id;

      setPeers((prev) => {
        const next = new Map(prev);
        const peer = next.get(targetUserId) || {
          userId: targetUserId,
          userName: targetUserName,
          socketId: targetSocketId,
          stream: null,
          screenStream: null,
          isAudioActive: true,
          isVideoActive: true
        };

        if (isScreenShare) {
          peer.screenStream = remoteStream;
        } else {
          peer.stream = remoteStream;
        }

        next.set(targetUserId, peer);
        return next;
      });
    };

    // Perfect Negotiation NegotiationNeeded trigger
    pc.onnegotiationneeded = async () => {
      try {
        console.log(`Negotiation needed for peer ${targetUserName}. Generating offer...`);
        makingOfferRef.current.set(targetUserId, true);
        
        await pc.setLocalDescription();
        
        socketRef.current?.emit("signal", {
          targetUserId,
          senderUserId: userId,
          signalData: { description: pc.localDescription }
        });
      } catch (err) {
        console.error(`Error during negotiationneeded for ${targetUserName}:`, err);
      } finally {
        makingOfferRef.current.set(targetUserId, false);
      }
    };

    // Monitor connection states
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${targetUserName}: ${pc.connectionState}`);
      
      setPeers((prev) => {
        const next = new Map(prev);
        const peer = next.get(targetUserId);
        if (peer) {
          next.set(targetUserId, {
            ...peer,
            connectionState: pc.connectionState
          });
        }
        return next;
      });

      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        console.warn(`Connection with ${targetUserName} fell into disconnected/failed state.`);
      }
    };
  };

  // Periodically clean old reactions
  useEffect(() => {
    if (reactions.length === 0) return;
    const interval = setInterval(() => {
      setReactions([]); // Wipe all after 3 seconds for clean interface
    }, 3000);
    return () => clearInterval(interval);
  }, [reactions]);

  return {
    localStream,
    screenStream,
    peers,
    messages,
    reactions,
    currentActivity,
    isAudioActive,
    isVideoActive,
    isSharingScreen,
    isConnected,
    toggleCamera,
    toggleMicrophone,
    sendMessage,
    sendReaction,
    startScreenShare,
    stopScreenShare,
    changeActivity
  };
};
