// components/chat/MessageInput.tsx
import { FC, useState, useRef, RefObject } from 'react';
import { IoSend } from 'react-icons/io5';
import { EmojiPicker } from './EmojiPicker';

type Props = {
  message: string;
  setMessage: (message: string) => void;
  onSendMessage: () => void;
  onTyping: () => void;
  onSelectEmoji: (emoji: string) => void;
  inputRef?: RefObject<HTMLTextAreaElement>; // Add inputRef prop
};

export const MessageInput: FC<Props> = ({ 
  message, 
  setMessage, 
  onSendMessage, 
  onTyping,
  onSelectEmoji,
  inputRef
}) => {
  return (
    <div className="flex items-center p-4 bg-white border-t">
      <EmojiPicker onSelectEmoji={onSelectEmoji} />
      <textarea
        ref={inputRef} // Use the inputRef here
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          onTyping();
        }}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line on Enter without shift
            onSendMessage();
          }
        }}
        placeholder="Type a message..."
        rows={1}
        className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[40px] max-h-[120px] resize-y"
      />
      <button
        onClick={onSendMessage}
        disabled={!message.trim()}
        className={`ml-2 p-2 rounded-md text-white ${
          message.trim() ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
        }`}
      >
        <IoSend className="h-5 w-5" />
      </button>
    </div>
  );
};
