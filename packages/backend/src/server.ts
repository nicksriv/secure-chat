import path from 'path';
import dotenv from 'dotenv';
import logger from './utils/logger';
// Get the absolute path to the project root
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
logger.info('Loading .env file from:', envPath);
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
  message: any; // Using any for now as the message structure is complex
}

// Socket connection handler with error recovery
const handleSocketConnection = (socket: any) => {
  logger.info('User connected', { socketId: socket.id, user: socket.data.user });

  // Set up error handling
  socket.on('error', (error: Error) => {
    logger.error('Socket error for user', { email: socket.data.user?.email, error });
    // Don't disconnect on recoverable errors
    if (!(error instanceof TokenExpiredError)) {
      socket.emit('error', { message: 'An error occurred, attempting to reconnect...' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason: string) => {
    logger.info('User disconnected', { socketId: socket.id, reason });
    // Handle reconnection for specific disconnect reasons
    if (reason === 'transport error' || reason === 'ping timeout') {
      logger.info('Allowing reconnection for', { socketId: socket.id });
    }
  });

  // Group events with error handling
  socket.on('join_group', (groupId: string) => {
    try {
      socket.join(groupId);
      logger.info(`User ${socket.data.user.email} joined group ${groupId}`);
    } catch (error) {
      logger.error('Error joining group', { error });
      socket.emit('error', { message: 'Failed to join group' });
    }
  });

  socket.on('leave_group', (groupId: string) => {
    try {
      socket.leave(groupId);
      logger.info(`User ${socket.data.user.email} left group ${groupId}`);
    } catch (error) {
      logger.error('Error leaving group', { error });
      socket.emit('error', { message: 'Failed to leave group' });
    }
  });

  // Message events with error handling
  socket.on('send_message', async (data: MessageEvent) => {
    try {
      logger.info('Broadcasting message to group', { groupId: data.groupId, message: data.message });
      
      // Make sure group ID is a string for socket.io rooms
      const roomId = String(data.groupId);
      
      // Broadcast the message to ALL clients in the group including metadata
      io.to(roomId).emit('receive_message', {
        ...data.message,
        groupId: data.groupId,  // Ensure groupId is included
        timestamp: new Date(),
        senderId: socket.data.user.userId,
        senderName: socket.data.user.email || 'User'
      });
    } catch (error) {
      logger.error('Error sending message', { error });
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
      logger.error('Error handling typing event', { error });
      // Don't emit error for typing events as they're not critical
    }
  });

  // Add socket event for message read status
  socket.on('mark_read', async (data: { messageId: string, groupId: string }) => {
    try {
      logger.info('User marked message as read', { email: socket.data.user.email, messageId: data.messageId });
      
      // Broadcast read status to all clients in the group
      io.to(data.groupId).emit('message_read', {
        messageId: data.messageId,
        userId: socket.data.user.userId,
        userName: socket.data.user.email
      });
    } catch (error) {
      logger.error('Error marking message as read', { error });
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
  logger.info('Socket.io connection error', { err });
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
  logger.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// MongoDB connection with retry logic
const connectDB = async (retries = 5, timeout = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secure-chat');
      logger.info('Connected to MongoDB successfully');
      return;
    } catch (err) {
      logger.error(`MongoDB connection attempt ${i + 1} failed`, { err });
      if (i === retries - 1) {
        logger.error('Max retries reached. Exiting...');
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
    logger.info(`Server running on port ${PORT}`);
  });
}).catch(err => {
  logger.error('Failed to start server', { err });
  process.exit(1);
});