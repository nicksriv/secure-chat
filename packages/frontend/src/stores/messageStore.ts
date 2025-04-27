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
  unreadMessagesByGroup: Record<string, Message[]>;
  selectedGroupId: string | null;
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
  getUnreadCountForGroup: (groupId: string) => number;
  markAllAsReadInGroup: (groupId: string) => Promise<void>;
  setSelectedGroupId: (groupId: string | null) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  loading: false,
  error: null,
  socket: null,
  socketError: null,
  typingUsers: new Set(),
  smartReplies: [],
  unreadMessagesByGroup: {},
  selectedGroupId: null,

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
      console.log('Received message:', message);
      
      // Ensure message has all required fields 
      const updatedMessage = {
        ...message,
        readBy: message.readBy || [message.senderId],
        senderName: message.senderName || message.email || 'User'
      };
      
      const userId = localStorage.getItem('userId');
      const { selectedGroupId } = get();
      
      // Check if this message is from the current user
      const isOwnMessage = updatedMessage.senderId === userId || 
        (typeof updatedMessage.senderId === 'object' && updatedMessage.senderId?._id === userId);
        
      // Check if this message is for the currently selected group
      const isCurrentGroup = updatedMessage.groupId === selectedGroupId;
      
      set(state => {
        // Check if message already exists to prevent duplicates
        if (state.messages.some(m => m._id === updatedMessage._id)) {
          return state;
        }
        
        // Add to unread messages if it's not the current group and not sent by current user
        const newUnreadMessagesByGroup = { ...state.unreadMessagesByGroup };
        
        if (!isOwnMessage && !isCurrentGroup) {
          const groupUnreads = newUnreadMessagesByGroup[updatedMessage.groupId] || [];
          newUnreadMessagesByGroup[updatedMessage.groupId] = [...groupUnreads, updatedMessage];
          console.log(`Added unread message to group ${updatedMessage.groupId}`, 
            newUnreadMessagesByGroup[updatedMessage.groupId].length);
        }

        // Add to current messages if it's the selected group
        const newMessages = isCurrentGroup 
          ? [...state.messages, updatedMessage].sort((a, b) => 
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )
          : state.messages;
          
        return {
          messages: newMessages,
          unreadMessagesByGroup: newUnreadMessagesByGroup
        };
      });
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

    // Add handler for message_read socket event
    socket.on('message_read', (data: { messageId: string, userId: string, userName: string }) => {
      console.log('Message read by:', data);
      
      // Update the readBy array for this message
      set(state => ({
        messages: state.messages.map(msg =>
          msg._id === data.messageId && !msg.readBy.includes(data.userId)
            ? { ...msg, readBy: [...msg.readBy, data.userId] }
            : msg
        )
      }));
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
      const userId = localStorage.getItem('userId');
      const { socket, selectedGroupId } = get();
      
      // Save to backend
      await messageService.markAsRead(messageId);
      
      // Update local state
      set(state => ({
        messages: state.messages.map(msg =>
          msg._id === messageId && !msg.readBy.includes(userId!)
            ? { ...msg, readBy: [...msg.readBy, userId!] }
            : msg
        )
      }));
      
      // Broadcast to other users that this message was read
      if (socket && selectedGroupId) {
        socket.emit('mark_read', { 
          messageId, 
          groupId: selectedGroupId 
        });
      }
    } catch (error) {
      console.error('Failed to mark message as read:', error);
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
  },

  getUnreadCountForGroup: (groupId: string) => {
    const { unreadMessagesByGroup } = get();
    return unreadMessagesByGroup[groupId]?.length || 0;
  },

  markAllAsReadInGroup: async (groupId: string) => {
    const { unreadMessagesByGroup } = get();
    const unreadMessages = unreadMessagesByGroup[groupId] || [];
    
    try {
      // Mark all unread messages as read in the backend
      const promises = unreadMessages.map(msg => messageService.markAsRead(msg._id));
      await Promise.all(promises);
      
      // Remove the unread messages for this group
      set(state => {
        const newUnreadMessagesByGroup = { ...state.unreadMessagesByGroup };
        delete newUnreadMessagesByGroup[groupId];
        return { unreadMessagesByGroup: newUnreadMessagesByGroup };
      });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  },

  setSelectedGroupId: (groupId: string | null) => {
    set({ selectedGroupId: groupId });
    
    // If selecting a group, mark all messages as read in that group
    if (groupId) {
      get().markAllAsReadInGroup(groupId);
    }
  }
}));