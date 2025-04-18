import api from './api';
import { Message, SmartReply } from '../types';
import { encryptMessage, decryptMessage } from '../utils/encryption';

class MessageError extends Error {
  status?: number;
  
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    this.name = 'MessageError';
  }
}

const messageService = {
  async sendMessage(groupId: string, content: string): Promise<Message> {
    const encryptedContent = encryptMessage(content);
    try {
      const response = await api.post<Message>('/messages', {
        groupId,
        content: encryptedContent
      });
      
      // Ensure we're using the actual message data but with decrypted content
      const message = {
        ...response.data,
        content: content // Return decrypted content for immediate display
      };
      
      // If senderId is populated, make sure we're using its _id
      if (typeof message.senderId === 'object' && message.senderId !== null) {
        message.senderId = message.senderId._id;
      }
      
      return message;
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.response?.data?.message || 'Failed to send message';
      throw new MessageError(message, status);
    }
  },

  async getGroupMessages(groupId: string): Promise<Message[]> {
    try {
      const response = await api.get<Message[]>(`/messages/group/${groupId}`);
      return response.data.map(message => ({
        ...message,
        content: decryptMessage(message.content),
        // Normalize senderId to string format for consistency
        senderId: typeof message.senderId === 'object' && message.senderId !== null 
          ? message.senderId._id 
          : message.senderId
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch messages';
      throw new MessageError(message);
    }
  },

  async markAsRead(messageId: string): Promise<void> {
    try {
      await api.post(`/messages/${messageId}/read`);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to mark message as read';
      throw new MessageError(message);
    }
  },

  async getSmartReplies(messageId: string): Promise<SmartReply[]> {
    try {
      const response = await api.get<{ suggestions: SmartReply[] }>(`/messages/${messageId}/smart-replies`);
      return response.data.suggestions;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to get smart replies';
      throw new MessageError(message);
    }
  }
};

export default messageService;