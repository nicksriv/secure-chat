import React, { useEffect, useState } from 'react';
import { useGroupStore } from '../../stores/groupStore';
import { useAuthStore } from '../../stores/authStore';
import { useMessageStore } from '../../stores/messageStore';
import { Group } from '../../types';
import { MdAdd, MdExitToApp } from 'react-icons/md';
import { GroupItem } from './GroupItem';
import { CreateGroupModal } from './CreateGroupModal';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 10;

export const GroupList = () => {
  const {
    groups,
    loading,
    error,
    fetchGroups,
    joinGroup,
    leaveGroup,
    selectGroup,
    selectedGroup,
    createGroup
  } = useGroupStore();
  
  const { getUnreadCountForGroup, setSelectedGroupId } = useMessageStore();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));

  const handleLeaveGroup = async (group: Group) => {
    try {
      await leaveGroup(group._id);
    } catch (err) {
      console.error('Failed to leave group:', err);
    }
  };

  const handleJoinGroup = async (group: Group) => {
    try {
      await joinGroup(group._id);
    } catch (err) {
      console.error('Failed to join group:', err);
    }
  };

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + PAGE_SIZE);
  };

  const handleLogout = () => {
    // Assuming your authentication store has a logout function
    useAuthStore.getState().logout(); 
    navigate('/login'); // Redirect to login page
  };

  const handleSelectGroup = (group: Group) => {
    selectGroup(group);
    // Update the selected group ID in the message store to mark messages as read
    setSelectedGroupId(group._id);
  };

  const visibleGroups = sortedGroups.slice(0, displayCount);

  return (
    <div className="relative h-full overflow-hidden bg-white">
      <div className="relative h-16 bg-gray-100 shadow-md flex items-center">
        <h2 className="text-xl font-semibold px-4 pt-4 pb-2">Groups</h2>
      <button
        onClick={() => setShowCreateModal(true)}
        className="absolute right-6 bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition-all"
        aria-label="Create Group"
      >
        <MdAdd className="h-6 w-6" />
      </button>
      </div>
      

      <div className="overflow-y-auto h-[calc(100%-4rem)] px-2">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : visibleGroups.length === 0 ? (
          <p className="text-gray-500 text-center mt-4">No groups yet. Create one!</p>
        ) : (
          <>
            <ul className="divide-y">
              {visibleGroups.map((group) => {
                const isMember = group.members.includes(user?._id || '');
                const isOwner = group.ownerId === user?._id;
                const isSelected = selectedGroup?._id === group._id;
                const unreadCount = !isSelected ? getUnreadCountForGroup(group._id) : 0;

                return (
                  <GroupItem
                    key={group._id}
                    group={group}
                    isMember={isMember}
                    onClick={() => isMember ? handleSelectGroup(group) : {}}
                    onActionClick={(e) => {
                      e.stopPropagation();
                      isMember ? handleLeaveGroup(group) : handleJoinGroup(group);
                    }}
                    actionLabel={isMember ? (isOwner ? '' : 'Leave') : 'Join'}
                    actionColor={isMember ? 'text-red-500 hover:text-red-600' : 'text-green-600 hover:text-green-700'}
                    unreadCount={unreadCount}
                  />
                );
              })}
            </ul>

            {displayCount < sortedGroups.length && (
              <div className="flex justify-center my-4">
                <button
                  onClick={handleLoadMore}
                  className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createGroup}
        />
      )}
      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="fixed bottom-6 left-6 bg-red-600 text-white p-4 rounded-full shadow-lg hover:bg-red-700 transition-all"
        aria-label="Logout"
      >
        <MdExitToApp className="h-6 w-6" />
      </button>
    </div>
  );
};
