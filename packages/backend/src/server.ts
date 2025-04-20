import path from 'path';
import dotenv from 'dotenv';
// Get the absolute path to the project root
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
console.log('Loading .env file from:', envPath);
dotenv.config({ path: envPath });

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import { verifyToken } from './utils/jwt';
import { TokenExpiredError } from 'jsonwebtoken';

// Import routes
import authRoutes from './routes/auth';
import groupRoutes from './routes/groups';
import messageRoutes from './routes/messages';


const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
  } 
});

// Socket event types
interface TypingEvent {
  groupId: string;
  userId: string;
}

interface MessageEvent {
  groupId: string;
  message: string;
}

// Socket connection handler with error recovery
const handleSocketConnection = (socket: any) => {
  console.log('User connected:', socket.id, 'User data:', socket.data.user);

  // Set up error handling
  socket.on('error', (error: Error) => {
    console.error('Socket error for user:', socket.data.user?.email, error);
    // Don't disconnect on recoverable errors
    if (!(error instanceof TokenExpiredError)) {
      socket.emit('error', { message: 'An error occurred, attempting to reconnect...' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason: string) => {
    console.log('User disconnected:', socket.id, 'Reason:', reason);
    // Handle reconnection for specific disconnect reasons
    if (reason === 'transport error' || reason === 'ping timeout') {
      console.log('Allowing reconnection for:', socket.id);
    }
  });

  // Group events with error handling
  socket.on('join_group', (groupId: string) => {
    try {
      socket.join(groupId);
      console.log(`User ${socket.data.user.email} joined group ${groupId}`);
    } catch (error) {
      console.error('Error joining group:', error);
      socket.emit('error', { message: 'Failed to join group' });
    }
  });

  socket.on('leave_group', (groupId: string) => {
    try {
      socket.leave(groupId);
      console.log(`User ${socket.data.user.email} left group ${groupId}`);
    } catch (error) {
      console.error('Error leaving group:', error);
      socket.emit('error', { message: 'Failed to leave group' });
    }
  });

  // Message events with error handling
  socket.on('send_message', async (data: MessageEvent) => {
    try {
      // Forward the complete message object to all clients in the group
      socket.to(data.groupId).emit('receive_message', {
        ...data.message,
        timestamp: new Date(),
        senderId: socket.data.user.userId,
        senderName: socket.data.user.email
      });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing events with error handling
  socket.on('typing', (data: TypingEvent) => {
    try {
      socket.to(data.groupId).emit('user_typing', {
        groupId: data.groupId,
        userId: socket.data.user.userId,
        email: socket.data.user.email
      });
    } catch (error) {
      console.error('Error handling typing event:', error);
      // Don't emit error for typing events as they're not critical
    }
  });
};

// Socket.io middleware for authentication with error handling
io.use((socket: any, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication token required'));
  }

  try {
    const user = verifyToken(token);
    socket.data.user = user;
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return next(new Error('Token expired'));
    }
    next(new Error('Invalid token'));
  }
});

// Socket.io error handling for the server
io.engine.on('connection_error', (err) => {
  console.log('Socket.io connection error:', err);
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  //allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// MongoDB connection with retry logic
const connectDB = async (retries = 5, timeout = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secure-chat');
      console.log('Connected to MongoDB successfully');
      return;
    } catch (err) {
      console.error(`MongoDB connection attempt ${i + 1} failed:`, err);
      if (i === retries - 1) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, timeout));
    }
  }
};

// Initialize socket connection with error handling
io.on('connection', handleSocketConnection);

// Start server
const PORT = process.env.PORT || 5000;

// Initialize database and start server
connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});