import { create } from 'zustand';
import { authService } from '../services/authService';
import { User } from '../types';
import { useMessageStore } from './messageStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  initializeAuth: () => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');

    if (token && userId && userEmail && userName) {
      set({
        user: { _id: userId, email: userEmail, name: userName },
        isAuthenticated: true,
        loading: false,
        error: null
      });
    }
  },
  
  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const data = await authService.login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', data.name);
      set({ 
        user: { _id: data.userId, email, name: data.name }, 
        isAuthenticated: true, 
        loading: false,
        error: null 
      });
      
      // Initialize socket connection after successful login
      useMessageStore.getState().initializeSocket();
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Login failed',
        loading: false,
        isAuthenticated: false,
        user: null 
      });
    }
  },
  
  register: async (name: string, email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await authService.register(name, email, password);
      localStorage.setItem('token', response.token);
      localStorage.setItem('userId', response.userId);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', name);
      set({ 
        isAuthenticated: true, 
        user: { _id: response.userId, email, name },
        loading: false,
        error: null
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
        isAuthenticated: false,
        user: null
      });
    }
  },
  
  logout: async () => {
    try {
      await authService.logout();
      // Disconnect socket
      const messageStore = useMessageStore.getState();
      messageStore.disconnectSocket();
      // Clear all auth-related data
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      set({ user: null, isAuthenticated: false, error: null, loading: false });
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear data even if the server request fails
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      set({ 
        user: null, 
        isAuthenticated: false, 
        error: 'Error during logout', 
        loading: false 
      });
    }
  }
}));