// components/chat/ChatMessages.tsx
import { FC, RefObject } from 'react';
import { MessageItem } from './MessageItem';
import { Message, SmartReply } from '../../types';

type Props = {
  messages: Message[];
  smartReplies: SmartReply[];
  messageEndRef: RefObject<HTMLDivElement>;
  onSelectSmartReply: (text: string) => void;
  onRequestSmartReply: (messageId: string) => void;
};

export const ChatMessages: FC<Props> = ({ 
  messages, 
  smartReplies, 
  messageEndRef,
  onSelectSmartReply,
  onRequestSmartReply 
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {messages.map((msg) => (
            <MessageItem 
              key={msg._id} 
              msg={msg} 
              onRequestSmartReply={() => onRequestSmartReply(msg._id)}
            />
          ))}
          <div ref={messageEndRef} />
        </div>
      </div>

      {smartReplies.length > 0 && (
        <div className="p-3 bg-white border-t flex gap-2 items-center overflow-x-auto shadow-inner">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Quick replies:</span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {smartReplies.map((reply) => (
              <button
                key={`${reply.text}-${reply.confidence}`}
                className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full hover:bg-indigo-100 transition-colors whitespace-nowrap flex-shrink-0"
                onClick={() => onSelectSmartReply(reply.text)}
              >
                {reply.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
