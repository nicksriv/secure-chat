import { create } from 'zustand';
import { Group } from '../types';
import { groupService } from '../services/groupService';

interface GroupState {
  groups: Group[];
  selectedGroup: Group | null;
  loading: boolean;
  error: string | null;
  fetchGroups: () => Promise<void>;
  createGroup: (name: string) => Promise<void>;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  selectGroup: (group: Group | null) => void;
  deleteGroup: (groupId: string) => Promise<void>;
  transferOwnership: (groupId: string, newOwnerId: string) => Promise<void>;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  selectedGroup: null,
  loading: false,
  error: null,

  fetchGroups: async () => {
    set({ loading: true, error: null });
    try {
      const groups = await groupService.getAllGroups();
      set({ groups, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch groups', loading: false });
    }
  },

  createGroup: async (name: string) => {
    set({ loading: true, error: null });
    try {
      const newGroup = await groupService.createGroup(name);
      set(state => ({ 
        groups: [...state.groups, newGroup],
        loading: false 
      }));
    } catch (error) {
      set({ error: 'Failed to create group', loading: false });
    }
  },

  joinGroup: async (groupId: string) => {
    set({ loading: true, error: null });
    try {
      const updatedGroup = await groupService.joinGroup(groupId);
      set(state => ({
        groups: state.groups.map(g => g._id === groupId ? updatedGroup : g),
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to join group', loading: false });
    }
  },

  leaveGroup: async (groupId: string) => {
    set({ loading: true, error: null });
    try {
      await groupService.leaveGroup(groupId);
      set(state => ({
        groups: state.groups.filter(g => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup,
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to leave group', loading: false });
    }
  },

  selectGroup: (group: Group | null) => {
    set({ selectedGroup: group });
  },

  deleteGroup: async (groupId: string) => {
    set({ loading: true, error: null });
    try {
      await groupService.deleteGroup(groupId);
      set(state => ({
        groups: state.groups.filter(g => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup,
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to delete group', loading: false });
    }
  },

  transferOwnership: async (groupId: string, newOwnerId: string) => {
    set({ loading: true, error: null });
    try {
      const updatedGroup = await groupService.transferOwnership(groupId, newOwnerId);
      set(state => ({
        groups: state.groups.map(g => g._id === groupId ? updatedGroup : g),
        selectedGroup: state.selectedGroup?._id === groupId ? updatedGroup : state.selectedGroup,
        loading: false
      }));
    } catch (error) {
      set({ error: 'Failed to transfer ownership', loading: false });
    }
  }
}));