import api from './api';
import { Group } from '../types';

export const groupService = {
  async createGroup(name: string): Promise<Group> {
    const response = await api.post<Group>('/groups', { name });
    return response.data;
  },

  async getAllGroups(): Promise<Group[]> {
    const response = await api.get<Group[]>('/groups');
    return response.data;
  },

  async joinGroup(groupId: string): Promise<Group> {
    const response = await api.post<Group>(`/groups/${groupId}/join`);
    return response.data;
  },

  async leaveGroup(groupId: string): Promise<void> {
    await api.post(`/groups/${groupId}/leave`);
  },

  async transferOwnership(groupId: string, newOwnerId: string): Promise<Group> {
    const response = await api.post<Group>(`/groups/${groupId}/transfer-ownership`, { newOwnerId });
    return response.data;
  },

  async deleteGroup(groupId: string): Promise<void> {
    await api.delete(`/groups/${groupId}`);
  }
};