// components/chat/ChatWindow.tsx
import { FC, useEffect, useRef, useState } from 'react';
import { useMessageStore } from '../../stores/messageStore';
import { useAuthStore } from '../../stores/authStore';
import { useGroupStore } from '../../stores/groupStore';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { MessageInput } from './MessageInput';

export const ChatWindow: FC = () => {
  const { selectedGroup } = useGroupStore();
  const { 
    messages, 
    loading, 
    error, 
    fetchMessages, 
    sendMessage, 
    setTypingStatus, 
    typingUsers, 
    getSmartReplies, 
    smartReplies, 
    clearSmartReplies 
  } = useMessageStore();
  const { user } = useAuthStore();
  const [message, setMessage] = useState('');
  const [isLocalTyping, setIsLocalTyping] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null); // Reference to the input field

  // Handle message fetching and socket group join
  useEffect(() => {
    if (selectedGroup) {
      // Only fetch if we haven't fetched for this group yet
      fetchMessages(selectedGroup._id);
      // Join the socket room for this group
      useMessageStore.getState().joinGroup(selectedGroup._id);
      // Update selected group in message store to clear unread counts
      useMessageStore.getState().setSelectedGroupId(selectedGroup._id);
    }
    
    // Cleanup: Leave the socket room when component unmounts or group changes
    return () => {
      if (selectedGroup) {
        useMessageStore.getState().leaveGroup(selectedGroup._id);
        // Clear selected group when leaving
        useMessageStore.getState().setSelectedGroupId(null);
      }
    };
  }, [selectedGroup?._id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedGroup || !user) return;

    try {
      await sendMessage(selectedGroup._id, message);
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = () => {
    if (!selectedGroup || !user) return;

    if (!isLocalTyping) {
      setIsLocalTyping(true);
      setTypingStatus(selectedGroup._id, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsLocalTyping(false);
      setTypingStatus(selectedGroup._id, false);
    }, 2000);
  };

  const handleRequestSmartReply = async (messageId: string) => {
    try {
      await getSmartReplies(messageId);
    } catch (error) {
      console.error('Failed to get smart replies:', error);
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    setMessage(prevMessage => prevMessage + emoji);
  };

  const handleSelectSmartReply = (text: string) => {
    setMessage(text); // Set the message input state with the selected reply
    clearSmartReplies(); // Clear replies after selection
    
    // Focus the input field after a small delay to ensure state updates first
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  if (!selectedGroup) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Select a group to start chatting</p>
      </div>
    );
  }

  if (loading) return (
    <div className="h-full flex justify-center items-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );

  if (error) return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <p className="text-red-500 p-4">{error}</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white">
      <ChatHeader />
      <ChatMessages 
        messages={messages} 
        smartReplies={smartReplies}
        messageEndRef={messageEndRef} 
        onSelectSmartReply={handleSelectSmartReply}
        onRequestSmartReply={handleRequestSmartReply}
      />
      <MessageInput 
        message={message} 
        setMessage={setMessage} 
        onSendMessage={handleSendMessage} 
        onTyping={handleTyping}
        onSelectEmoji={handleSelectEmoji}
        inputRef={inputRef}
      />
    </div>
  );
};
