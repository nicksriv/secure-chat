import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Message } from '../models/Message';
import { Group } from '../models/Group';
import { encryptMessage, decryptMessage } from '../utils/encryption';
import { TokenPayload } from '../types/index';

interface AuthRequest extends Request {
  user?: TokenPayload;
}

const generateSmartReplies = async (message: string): Promise<Array<{ text: string; confidence: number }>> => {
  // This is a more intelligent placeholder until LLM integration
  // It analyzes message content to provide more contextual responses
  const lowercaseMsg = message.toLowerCase();
  
  // Question detection
  if (message.endsWith('?')) {
    if (lowercaseMsg.includes('when') || lowercaseMsg.includes('time')) {
      return [
        { text: "I'll check and let you know the time", confidence: 0.9 },
        { text: "Let me check my calendar", confidence: 0.8 },
        { text: "Can we discuss this later?", confidence: 0.7 }
      ];
    }
    if (lowercaseMsg.includes('what') || lowercaseMsg.includes('how')) {
      return [
        { text: "Let me explain in detail", confidence: 0.9 },
        { text: "I'll send you more information", confidence: 0.8 },
        { text: "Could you be more specific?", confidence: 0.7 }
      ];
    }
    return [
      { text: "Yes, definitely", confidence: 0.9 },
      { text: "I'm not sure, let me check", confidence: 0.8 },
      { text: "No, I don't think so", confidence: 0.7 }
    ];
  }

  // Greeting detection
  if (lowercaseMsg.includes('hi') || lowercaseMsg.includes('hello') || lowercaseMsg.includes('hey')) {
    return [
      { text: "Hello! How are you?", confidence: 0.9 },
      { text: "Hi there!", confidence: 0.8 },
      { text: "Hey! Nice to hear from you", confidence: 0.7 }
    ];
  }

  // Thank you detection
  if (lowercaseMsg.includes('thank') || lowercaseMsg.includes('thanks')) {
    return [
      { text: "You're welcome!", confidence: 0.9 },
      { text: "No problem at all", confidence: 0.8 },
      { text: "Glad I could help", confidence: 0.7 }
    ];
  }

  // Default contextual responses
  return [
    { text: "Thanks for sharing that", confidence: 0.8 },
    { text: "I understand", confidence: 0.7 },
    { text: "Could you tell me more?", confidence: 0.6 }
  ];
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Sending message:', req.body);
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = new Types.ObjectId(req.user.userId);
    const { groupId, content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.includes(userId)) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    let encryptedContent;
    try {
      encryptedContent = encryptMessage(content);
    } catch (encryptError) {
      console.error('Message encryption failed:', encryptError);
      return res.status(500).json({ message: 'Failed to encrypt message' });
    }

    const message = new Message({
      groupId,
      senderId: userId,
      encryptedContent,
      readBy: [userId]
    });

    await message.save();
    console.log('Message saved successfully:', message._id);
    res.status(201).json(message);
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ 
      message: 'Error sending message', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export const getGroupMessages = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = new Types.ObjectId(req.user.userId);
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.includes(userId)) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const messages = await Message.find({ groupId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'email');

    const decryptedMessages = messages.map(msg => ({
      ...msg.toObject(),
      content: decryptMessage(msg.encryptedContent)
    }));

    res.json(decryptedMessages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = new Types.ObjectId(req.user.userId);
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (!message.readBy.includes(userId)) {
      message.readBy.push(userId);
      await message.save();
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Error marking message as read' });
  }
};

export const getSmartReplies = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const decryptedContent = decryptMessage(message.encryptedContent);
    const smartReplies = await generateSmartReplies(decryptedContent);

    res.json({ suggestions: smartReplies });
  } catch (error) {
    res.status(500).json({ message: 'Error generating smart replies' });
  }
};