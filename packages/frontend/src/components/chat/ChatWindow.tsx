// components/chat/ChatWindow.tsx
import { useEffect, useRef, useState } from 'react';
import { IoSend } from 'react-icons/io5';
import { useMessageStore } from '../../stores/messageStore';
import { useAuthStore } from '../../stores/authStore';
import { useGroupStore } from '../../stores/groupStore';
import { EmojiPicker } from './EmojiPicker';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';

export const ChatWindow = () => {
  const [message, setMessage] = useState('');
  const [isLocalTyping, setIsLocalTyping] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const hasFetchedRef = useRef<string | null>(null);

  const { 
    messages, 
    loading, 
    error, 
    sendMessage, 
    fetchMessages, 
    smartReplies, 
    getSmartReplies, 
    setTypingStatus,
    joinGroup,
    leaveGroup 
  } = useMessageStore();
  
  const { user } = useAuthStore();
  const { selectedGroup } = useGroupStore();

  // Handle message fetching and socket group join
  useEffect(() => {
    if (selectedGroup) {
      // Only fetch if we haven't fetched for this group yet
      if (hasFetchedRef.current !== selectedGroup._id) {
        fetchMessages(selectedGroup._id);
        hasFetchedRef.current = selectedGroup._id;
      }
      // Join the socket room for this group
      joinGroup(selectedGroup._id);
    }
    
    // Cleanup: Leave the socket room when component unmounts or group changes
    return () => {
      if (selectedGroup) {
        leaveGroup(selectedGroup._id);
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

  const handleSmartReply = async (messageId: string) => {
    try {
      await getSmartReplies(messageId);
    } catch (error) {
      console.error('Failed to get smart replies:', error);
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    setMessage(prevMessage => prevMessage + emoji);
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
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      <ChatHeader />
      
      <div className="flex-1 min-h-0"> {/* min-h-0 is crucial for nested flex containers */}
        <ChatMessages 
          messages={messages}
          smartReplies={smartReplies}
          messageEndRef={messageEndRef}
          onSelectSmartReply={text => setMessage(text)}
          onRequestSmartReply={handleSmartReply}
        />
      </div>

      <div className="p-4 bg-white flex gap-2 border-t">
        <EmojiPicker onSelectEmoji={handleSelectEmoji} />
        <input
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
        />
        <button
          className={`p-2 rounded-md text-white ${
            message.trim() 
              ? 'bg-blue-500 hover:bg-blue-600' 
              : 'bg-gray-300 cursor-not-allowed'
          }`}
          onClick={handleSendMessage}
          disabled={!message.trim()}
        >
          <IoSend className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
