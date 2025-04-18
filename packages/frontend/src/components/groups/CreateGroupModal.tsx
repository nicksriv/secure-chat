import React, { useState } from 'react';
import { MdClose } from 'react-icons/md';

interface Props {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export const CreateGroupModal: React.FC<Props> = ({ onClose, onCreate }) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setError('Group name is required');
      return;
    }
    try {
      await onCreate(newGroupName.trim());
      setNewGroupName('');
      setError('');
      onClose();
    } catch {
      setError('Failed to create group');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Create Group</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <MdClose className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
