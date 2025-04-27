// components/chat/ChatMessages.tsx
import { FC, RefObject } from 'react';
import { MessageItem } from './MessageItem';
import { Message, SmartReply } from '../../types';
import { useMessageStore } from '../../stores/messageStore';

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
  const clearSmartReplies = useMessageStore(state => state.clearSmartReplies);
  const loadingSmartReplies = useMessageStore(state => state.loadingSmartReplies);

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

      {/* Smart reply section - show either loading, suggestions, or nothing */}
      {(loadingSmartReplies || smartReplies.length > 0) && (
        <div className="p-3 bg-white border-t flex flex-col shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                {loadingSmartReplies ? 'Generating smart replies...' : 'AI-suggested replies based on conversation context:'}
              </span>
              <div className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                Smart
              </div>
            </div>
            {!loadingSmartReplies && (
              <button 
                onClick={clearSmartReplies}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close smart replies"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          
          {loadingSmartReplies ? (
            <div className="flex justify-center py-2">
              <div className="animate-pulse flex space-x-3">
                <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
                <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      )}
    </div>
  );
};
