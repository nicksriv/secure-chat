import { Request, Response } from 'express';
import { Types } from 'mongoose';
import OpenAI from 'openai';
import 'dotenv/config';

import { Message } from '../models/Message';
import { Group } from '../models/Group';
import { encryptMessage, decryptMessage, decryptFrontendMessage, decryptMessageWithAES } from '../utils/encryption';
import { TokenPayload } from '../types/index';
import logger from '../utils/logger';

interface AuthRequest extends Request {
  user?: TokenPayload;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // API key from environment variable
});

const generateSmartReplies = async (messages: string[], debug = false): Promise<Array<{ text: string; confidence: number }>> => {
  debug && logger.info('generateSmartReplies called with messages:', messages);
  
  if (!process.env.OPENAI_API_KEY) {
    debug && logger.warn('OPENAI_API_KEY not set. Using fallback smart replies.');
    return [
        { text: "Got it.", confidence: 0.5 },
        { text: "Okay", confidence: 0.5 },
        { text: "Thanks!", confidence: 0.5 }
    ];
  }

  // Use the last 5 messages as context, ensure they are not empty
  const conversationHistory = messages.filter(msg => msg && msg.trim().length > 0).slice(-5);
  debug && logger.info('Filtered conversation history:', conversationHistory);
  
  if (conversationHistory.length === 0) {
    logger.warn('No valid message history for smart replies. Using fallback.');
    return [
        { text: "Got it.", confidence: 0.5 },
        { text: "Okay", confidence: 0.5 },
        { text: "Thanks!", confidence: 0.5 }
    ];
  }

  // The last message is the one we want replies for
  const lastMessage = conversationHistory[conversationHistory.length - 1];
  logger.info('Last message to reply to:', lastMessage);

  // Format messages for the OpenAI API
  const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = conversationHistory.map((msg, index) => ({
    // Simple alternating roles assumption
    role: index % 2 === 0 ? 'user' : 'assistant', 
    content: msg,
  }));
  logger.info('Formatted API messages: %s', JSON.stringify(apiMessages, null, 2));

  const systemPrompt = `You are a helpful chat assistant. Based on the following conversation history, suggest 3 concise and relevant replies to the *last* message ("${lastMessage}"). Provide only the reply text, one reply per line, without any numbering or bullet points.`;
  logger.info('System prompt:', systemPrompt);

  try {
    logger.info('Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...apiMessages
      ],
      n: 1,
      max_tokens: 100,
      temperature: 0.7,
      stop: ["\n\n"],
    });
    logger.info('OpenAI API response: %s', JSON.stringify(completion, null, 2));

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      logger.error('OpenAI response content is empty. Using fallback replies.');
      return [
          { text: "Got it.", confidence: 0.5 },
          { text: "Okay", confidence: 0.5 },
          { text: "Thanks!", confidence: 0.5 }
      ];
    }

    const replies = content.trim().split('\n').map(text => text.trim()).filter(text => text.length > 0);
    logger.info('Parsed replies:', replies);

    const formattedReplies = replies.slice(0, 3).map(text => ({
      text: text,
      confidence: 0.9
    }));
    logger.info('Formatted replies to return:', formattedReplies);

    return formattedReplies;

  } catch (error) {
    logger.error('Error calling OpenAI API for smart replies:', error);
    // Fallback replies if API fails
    return [
        { text: "Got it.", confidence: 0.5 },
        { text: "Okay", confidence: 0.5 },
        { text: "Thanks!", confidence: 0.5 }
    ]; 
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    logger.info('Sending message:', req.body);
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
      logger.error('Message encryption failed:', encryptError);
      return res.status(500).json({ message: 'Failed to encrypt message' });
    }

    const message = new Message({
      groupId,
      senderId: userId,
      encryptedContent,
      readBy: [userId]
    });

    await message.save();
    logger.info('Message saved successfully:', message._id);
    res.status(201).json(message);
  } catch (error) {
    logger.error('Error in sendMessage:', error);
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
  logger.info('getSmartReplies endpoint called with messageId:', req.params.messageId);
  try {
    if (!req.user?.userId) {
      logger.info('User not authenticated');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { messageId } = req.params;
    
    // Get the target message first
    const targetMessage = await Message.findById(messageId);
    if (!targetMessage) {
      logger.info('Target message not found:', messageId);
      return res.status(404).json({ message: 'Message not found' });
    }
    logger.info('Target message found:', targetMessage._id);

    // Get recent messages in a single query with proper sorting
    const recentMessagesDesc = await Message.find({ 
      groupId: targetMessage.groupId 
    })
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Then reverse the array to get them in chronological order (oldest first)
    const recentMessages = recentMessagesDesc.reverse();
    
    logger.info('Recent messages found:', recentMessages.length);
    logger.info('Message IDs in order:', recentMessages.map(msg => msg._id));
    
    // Decrypt all messages - Use the new decryptFrontendMessage function
    const decryptedContents = recentMessages.map(msg => {
      try {
        if (!msg.encryptedContent) {
          logger.error('No encryptedContent found for message:', msg._id);
          return '';
        }
        // Try with the specialized frontend decryption function
        const decrypted = decryptMessageWithAES(msg.encryptedContent);
        logger.info(`Decrypted message ${msg._id}: ${decrypted.substring(0, 30)}${decrypted.length > 30 ? '...' : ''}`);
        return decrypted;
      } catch (error) {
        logger.error('Error decrypting message:', msg._id, error);
        return ''; // Return empty string for messages that can't be decrypted
      }
    });
    
    // Filter out any empty messages
    const validDecryptedContents = decryptedContents.filter(content => content.trim() !== '');
    logger.info('Valid decrypted messages count:', validDecryptedContents.length);
    
    if (validDecryptedContents.length === 0) {
      logger.warn('No valid decrypted messages for smart replies');
      return res.json({ 
        suggestions: [
          { text: "Got it.", confidence: 0.5 },
          { text: "Okay", confidence: 0.5 },
          { text: "Thanks!", confidence: 0.5 }
        ] 
      });
    }
    
    // Generate smart replies based on conversation context
    logger.info('Calling generateSmartReplies with valid content...');
    const smartReplies = await generateSmartReplies(validDecryptedContents);
    logger.info('Smart replies generated:', smartReplies);

    res.json({ suggestions: smartReplies });
  } catch (error) {
    logger.error('Error generating smart replies:', error);
    res.status(500).json({ 
      message: 'Error generating smart replies', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};