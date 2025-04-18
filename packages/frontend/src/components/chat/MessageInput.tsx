// components/chat/MessageInput.tsx
import { FC, useState, useRef } from 'react';
import { IoSend } from 'react-icons/io5';
import { useMessageStore } from '../../stores/messageStore';
import { useAuthStore } from '../../stores/authStore';
import { EmojiPicker } from './EmojiPicker';

type Props = {
  selectedGroupId: string;
};

export const MessageInput: FC<Props> = ({ selectedGroupId }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { sendMessage, setTypingStatus } = useMessageStore();
  const { user } = useAuthStore();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedGroupId || !user) return;

    try {
      await sendMessage(selectedGroupId, message);
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = () => {
    if (!selectedGroupId || !user) return;

    if (!isTyping) {
      setIsTyping(true);
      setTypingStatus(selectedGroupId, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTypingStatus(selectedGroupId, false);
    }, 2000);
  };

  return (
    <div className="flex items-center p-4 bg-white border-t">
      <EmojiPicker onSelectEmoji={(emoji) => setMessage(prev => prev + emoji)} />
      <input
        type="text"
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
        placeholder="Type a message..."
        className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        onClick={handleSendMessage}
        disabled={!message.trim()}
        className={`p-2 rounded-md text-white ${
          message.trim() ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
        }`}
      >
        <IoSend className="h-5 w-5" />
      </button>
    </div>
  );
};
