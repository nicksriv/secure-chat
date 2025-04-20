import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import messageService from '../services/messageService';
import { Message, SmartReply } from '../types';

interface MessageState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  socket: Socket | null;
  socketError: string | null;
  typingUsers: Set<string>;
  smartReplies: SmartReply[];
  initializeSocket: () => void;
  disconnectSocket: () => void;
  reconnectSocket: () => void;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  sendMessage: (groupId: string, content: string) => Promise<void>;
  fetchMessages: (groupId: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  setTyping: (groupId: string, userId: string) => void;
  getSmartReplies: (messageId: string) => Promise<void>;
  setTypingStatus: (groupId: string, isTyping: boolean) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  loading: false,
  error: null,
  socket: null,
  socketError: null,
  typingUsers: new Set(),
  smartReplies: [],

  initializeSocket: () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ socketError: 'No authentication token found' });
      return;
    }

    const socket = io(import.meta.env.REACT_APP_SOCKET_URL || 'http://localhost:5012', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      set({ socket, socketError: null });
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      set({ socketError: error.message });
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        socket.connect();
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      set({ socketError: error.message });
    });

    socket.on('receive_message', (message: Message) => {
      // Ensure message has all required fields
      const updatedMessage = {
        ...message,
        readBy: message.readBy || [message.senderId],
        senderName: message.senderName || 'User'
      };
      
      set(state => ({
        messages: [...state.messages, updatedMessage]
      }));
    });

    socket.on('user_typing', ({ userId }) => {
      set(state => {
        const newTypingUsers = new Set(state.typingUsers);
        newTypingUsers.add(userId);
        // Clear typing indicator after 2 seconds
        setTimeout(() => {
          set(state => {
            const users = new Set(state.typingUsers);
            users.delete(userId);
            return { typingUsers: users };
          });
        }, 2000);
        return { typingUsers: newTypingUsers };
      });
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, socketError: null });
    }
  },

  reconnectSocket: () => {
    const { socket, initializeSocket } = get();
    if (socket) {
      socket.disconnect();
    }
    initializeSocket();
  },

  joinGroup: (groupId: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('join_group', groupId);
    }
  },

  leaveGroup: (groupId: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('leave_group', groupId);
    }
  },

  sendMessage: async (groupId: string, content: string) => {
    set({ loading: true, error: null });
    try {
      const message = await messageService.sendMessage(groupId, content);
      const { socket } = get();
      
      if (socket && socket.connected) {
        socket.emit('send_message', { 
          groupId, 
          message: {
            ...message,
            readBy: message.readBy || [],  // Ensure readBy is never undefined
          }
        });
      } else {
        // If socket is disconnected, try to reconnect
        const store = get();
        store.reconnectSocket();
        // Wait for reconnection and retry sending
        setTimeout(() => {
          const { socket } = get();
          if (socket && socket.connected) {
            socket.emit('send_message', { 
              groupId, 
              message: {
                ...message,
                readBy: message.readBy || [],
              }
            });
          }
        }, 1000);
      }
      
      set(state => ({
        messages: [...state.messages, message],
        loading: false,
        error: null
      }));
    } catch (error) {
      console.error('Failed to send message:', error);
      // If we get a 500 error, try to reconnect the socket
      if (error instanceof Error && error.message.includes('500')) {
        const store = get();
        store.reconnectSocket();
      }
      set({ 
        error: error instanceof Error ? error.message : 'Failed to send message',
        loading: false
      });
    }
  },

  fetchMessages: async (groupId: string) => {
    set({ loading: true, error: null });
    try {
      const messages = await messageService.getGroupMessages(groupId);
      set({ messages, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch messages', loading: false });
    }
  },

  markAsRead: async (messageId: string) => {
    try {
      await messageService.markAsRead(messageId);
      set(state => ({
        messages: state.messages.map(msg =>
          msg._id === messageId
            ? { ...msg, readBy: [...msg.readBy, get().socket?.id || ''] }
            : msg
        )
      }));
    } catch (error) {
      set({ error: 'Failed to mark message as read' });
    }
  },

  setTyping: (groupId: string, userId: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('typing', { groupId, userId });
    }
  },

  getSmartReplies: async (messageId: string) => {
    set({ loading: true, error: null, smartReplies: [] }); // Clear existing replies immediately
    try {
      const suggestions = await messageService.getSmartReplies(messageId);
      // Sort by confidence and only show high confidence replies
      const filteredSuggestions = suggestions
        .filter(s => s.confidence > 0.7)
        .sort((a, b) => b.confidence - a.confidence);
      set({ smartReplies: filteredSuggestions, loading: false });
    } catch (error) {
      console.error('Smart reply error:', error);
      set({ smartReplies: [], error: 'Failed to get smart replies', loading: false });
    }
  },

  setTypingStatus: (groupId: string, isTyping: boolean) => {
    const userId = localStorage.getItem('userId');
    const { socket } = get();
    
    if (!userId || !socket) return;

    if (isTyping) {
      socket.emit('typing', { groupId, userId });
      set(state => ({
        typingUsers: new Set([...state.typingUsers, userId])
      }));
    } else {
      socket.emit('stop_typing', { groupId, userId });
      set(state => {
        const newTypingUsers = new Set(state.typingUsers);
        newTypingUsers.delete(userId);
        return { typingUsers: newTypingUsers };
      });
    }
  }
}));