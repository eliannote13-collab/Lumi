import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

// Health check endpoint
app.get("/health", (req, res) => {
  res.send({ status: "healthy", time: new Date() });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow any origin for simple local/network testing
    methods: ["GET", "POST"]
  }
});

interface User {
  userId: string;
  userName: string;
  socketId: string;
}

interface Room {
  roomId: string;
  users: User[];
  currentActivity: string;
}

// In-memory room management
const rooms = new Map<string, Room>();

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Handle joining a room
  socket.on("join-room", ({ roomId, userId, userName }) => {
    if (!roomId || !userId || !userName) {
      console.warn("Invalid join-room payload", { roomId, userId, userName });
      return;
    }

    socket.join(roomId);

    // Get or create room
    let room = rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        users: [],
        currentActivity: "none"
      };
      rooms.set(roomId, room);
    }

    // Check if user is already in the list (e.g. on reconnection), otherwise add
    const existingUserIndex = room.users.findIndex(u => u.userId === userId);
    const newUser: User = { userId, userName, socketId: socket.id };
    
    if (existingUserIndex > -1) {
      room.users[existingUserIndex] = newUser;
    } else {
      room.users.push(newUser);
    }

    console.log(`User ${userName} (${userId}) joined room ${roomId}`);

    // Return the list of current users in the room (excluding this new user)
    const otherUsers = room.users.filter(u => u.userId !== userId);
    socket.emit("room-users", {
      users: otherUsers,
      currentActivity: room.currentActivity
    });

    // Notify other users in the room that this user joined
    socket.to(roomId).emit("user-joined", {
      userId,
      userName,
      socketId: socket.id
    });
  });

  // Relay WebRTC signals (Offers, Answers, ICE Candidates)
  socket.on("signal", ({ targetUserId, signalData, senderUserId }) => {
    // Find target user socket
    // We search the rooms to find the matching socketId for targetUserId
    let targetSocketId: string | null = null;
    for (const room of rooms.values()) {
      const user = room.users.find(u => u.userId === targetUserId);
      if (user) {
        targetSocketId = user.socketId;
        break;
      }
    }

    if (targetSocketId) {
      io.to(targetSocketId).emit("signal", {
        senderUserId,
        signalData
      });
    } else {
      console.warn(`Target user ${targetUserId} not found for signaling`);
    }
  });

  // Handle chat messages
  socket.on("send-message", ({ roomId, message }) => {
    if (!roomId || !message) return;
    // Broadcast the message to everyone in the room (including sender, or sender handles locally)
    // We broadcast to everyone so everyone has the exact same message feed and timestamp
    io.to(roomId).emit("message", message);
  });

  // Handle reaction sharing
  socket.on("send-reaction", ({ roomId, reaction }) => {
    if (!roomId || !reaction) return;
    // Broadcast to other users in the room
    socket.to(roomId).emit("reaction", reaction);
  });

  // Handle room activity change (e.g., Watch, Music, Browse, Screenshare)
  socket.on("activity-change", ({ roomId, activity }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.currentActivity = activity;
      // Broadcast to other users in the room
      socket.to(roomId).emit("activity-change", activity);
      console.log(`Room ${roomId} activity changed to: ${activity}`);
    }
  });

  // Handle disconnection
  socket.on("disconnecting", () => {
    const socketRooms = Array.from(socket.rooms);
    
    socketRooms.forEach(roomId => {
      const room = rooms.get(roomId);
      if (room) {
        // Find user that belongs to this socket
        const userIndex = room.users.findIndex(u => u.socketId === socket.id);
        if (userIndex > -1) {
          const departingUser = room.users[userIndex];
          room.users.splice(userIndex, 1);
          console.log(`User ${departingUser.userName} (${departingUser.userId}) left room ${roomId}`);

          // Notify other users in the room
          socket.to(roomId).emit("user-left", {
            userId: departingUser.userId,
            userName: departingUser.userName
          });

          // Delete room if empty
          if (room.users.length === 0) {
            rooms.delete(roomId);
            console.log(`Room ${roomId} is now empty and has been removed`);
          }
        }
      }
    });
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Lumi signaling backend running on http://localhost:${PORT}`);
});
