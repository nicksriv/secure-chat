import React from 'react';
import { Group } from '../../types';

interface Props {
  group: Group;
  isMember: boolean;
  onClick: () => void;
  onActionClick: (e: React.MouseEvent) => void;
  actionLabel: string;
  actionColor: string;
  unreadCount?: number;
}

export const GroupItem: React.FC<Props> = ({
  group,
  isMember,
  onClick,
  onActionClick,
  actionLabel,
  actionColor,
  unreadCount = 0,
}) => {
  const initials = group.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <li
      onClick={onClick}
      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-all cursor-pointer"
    >
      <div className="flex items-center space-x-3">
        {/* Avatar with fallback to initials */}
        <div className="relative w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-semibold text-sm overflow-hidden">
          {group.avatarUrl ? (
            <img
              src={group.avatarUrl}
              alt={group.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '';
              }}
            />
          ) : (
            initials
          )}
          
          {/* Unread count badge */}
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-medium text-base">{group.name}</h3>
          <p className="text-sm text-gray-500">{group.members.length} members</p>
        </div>
      </div>

      {actionLabel && (
        <button onClick={onActionClick} className={`text-sm ${actionColor}`}>
          {actionLabel}
        </button>
      )}
    </li>
  );
};
