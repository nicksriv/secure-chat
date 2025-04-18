import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useGroupStore } from '../../stores/groupStore';
import { useMessageStore } from '../../stores/messageStore';

export const ChatHeader = () => {
  const { selectedGroup } = useGroupStore();
  const { logout } = useAuthStore();
  const { typingUsers } = useMessageStore();

  return (
    <div className="flex justify-between items-center px-4 py-3 border-b bg-white shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">{selectedGroup?.name}</h2>
        {typingUsers.size > 0 && (
          <p className="text-sm text-indigo-600 animate-pulse">
            {Array.from(typingUsers).join(', ')} typing...
          </p>
        )}
      </div>
      <button
        onClick={() => console.log('Group settings clicked')}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
      >
        <span className="text-sm">Group Settings</span>
      </button>
    </div>
  );
};
