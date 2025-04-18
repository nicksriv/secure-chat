// components/chat/EmojiPicker.tsx
import React, { FC, useState } from 'react';
import { FaSmile } from 'react-icons/fa';

type EmojiPickerProps = {
  onSelectEmoji: (emoji: string) => void;
};

export const EmojiPicker: FC<EmojiPickerProps> = ({ onSelectEmoji }) => {
  const [isOpen, setIsOpen] = useState(false);
  const emojis = ['😊', '😂', '😍', '😎', '😢', '😭', '😜', '🥺', '😤', '👍', '👎'];

  return (
    <div className="relative mr-3">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition"
      >
        <FaSmile className="h-5 w-5" />
      </button>
      {isOpen && (
        <div className="absolute bottom-10 left-0 bg-white shadow-md rounded-md p-2 grid grid-cols-5 gap-2 w-40">
          {emojis.map((emoji, index) => (
            <button
              key={index}
              onClick={() => {
                onSelectEmoji(emoji);
                setIsOpen(false); // Close the emoji picker after selecting
              }}
              className="text-xl p-2 hover:bg-gray-200 rounded-md"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
