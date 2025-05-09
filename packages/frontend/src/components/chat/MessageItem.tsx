// components/chat/MessageItem.tsx
import { FC } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Message } from '../../types';

const formatMessageTime = (timestamp: string) => {
  const messageDate = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  // For messages less than a minute old
  if (diffInMinutes < 1) {
    return 'just now';
  }
  // For messages less than an hour old
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  // For messages less than a day old
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  // For messages less than a week old
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  // For older messages
  return messageDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

type Props = {
  msg: Message;
  onRequestSmartReply: () => void;
};

export const MessageItem: FC<Props> = ({ msg, onRequestSmartReply }) => {
  const { user } = useAuthStore();
  
  // Safely handle senderId which might be a string, object, or undefined
  const senderId = msg.senderId 
    ? (typeof msg.senderId === 'string' 
      ? msg.senderId 
      : msg.senderId._id)
    : '';
    
  const isSelf = user && senderId === user._id;

  let initials = 'UN';
  if (msg.senderName) {
    initials = msg.senderName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  // Don't show smart reply for system messages or your own messages
  const showSmartReply = !isSelf && 
    msg.content && // Add null check here
    !msg.content.startsWith('SYSTEM:') && 
    msg.content.length > 0 &&
    msg.content.length < 200; // Don't show for very long messages

  return (
    <div
      className={`flex items-start space-x-2 max-w-[80%] ${
        isSelf ? 'ml-auto flex-row-reverse space-x-reverse' : 'mr-auto'
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white">
        {msg.senderAvatar ? (
          <img
            src={msg.senderAvatar}
            alt={msg.senderName || 'User'}
            className="w-8 h-8 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '';
            }}
          />
        ) : (
          initials
        )}
      </div>

      <div
        className={`rounded-lg p-3 shadow ${
          isSelf ? 'bg-blue-100 text-right' : 'bg-gray-100'
        }`}
      >
        <p className="text-sm">{msg.content}</p>
        <div className="text-xs text-gray-500 mt-1 flex items-center justify-between gap-2">
          <span title={new Date(msg.createdAt).toLocaleString()}>
            {formatMessageTime(msg.createdAt)}
          </span>
          <div className="flex items-center">
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {msg.readBy?.length || 0} read
            </span>
            {showSmartReply && (
              <button
                onClick={onRequestSmartReply}
                className="text-xs flex items-center text-blue-500 hover:text-blue-600 hover:underline ml-2 transition-colors"
                title="Get AI-suggested responses based on conversation context"
              >
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"></path>
                </svg>
                Smart Reply
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
