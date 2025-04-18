import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ForgotPasswordForm } from './components/auth/ForgotPasswordForm';
import { ResetPasswordForm } from './components/auth/ResetPasswordForm';
import { GroupList } from './components/groups/GroupList';
import { ChatWindow } from './components/chat/ChatWindow';
import { Welcome } from './components/Welcome';
import { useAuthStore } from './stores/authStore';
import { useMessageStore } from './stores/messageStore';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  // Redirect authenticated users to chat
  if (isAuthenticated) {
    return <Navigate to="/chat" />;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
};

const ChatLayout = () => {
  const initializeSocket = useMessageStore(state => state.initializeSocket);
  const disconnectSocket = useMessageStore(state => state.disconnectSocket);
  const reconnectSocket = useMessageStore(state => state.reconnectSocket);
  const socketError = useMessageStore(state => state.socketError);

  useEffect(() => {
    initializeSocket();
    return () => {
      disconnectSocket();
    };
  }, [initializeSocket, disconnectSocket]);

  // Handle socket errors
  useEffect(() => {
    if (socketError) {
      console.log('Socket error detected, attempting to reconnect...');
      const reconnectTimer = setTimeout(() => {
        reconnectSocket();
      }, 3000);

      return () => clearTimeout(reconnectTimer);
    }
  }, [socketError, reconnectSocket]);

  return (
    <div className="h-screen overflow-hidden">
      <div className="grid md:grid-cols-[300px_1fr] grid-cols-1 h-full">
        <div className="h-full overflow-hidden">
          <GroupList />
        </div>
        <div className="h-full overflow-hidden">
          <ChatWindow />
        </div>
      </div>
    </div>
  );
};

function App() {
  const { isAuthenticated, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          isAuthenticated ? <Navigate to="/chat" /> : <Welcome />
        } />
        <Route path="/login" element={
          <AuthLayout>
            <LoginForm />
          </AuthLayout>
        } />
        <Route path="/register" element={
          <AuthLayout>
            <RegisterForm />
          </AuthLayout>
        } />
        <Route path="/forgot-password" element={
          <AuthLayout>
            <ForgotPasswordForm />
          </AuthLayout>
        } />
        <Route path="/reset-password" element={
          <AuthLayout>
            <ResetPasswordForm />
          </AuthLayout>
        } />
        <Route path="/chat" element={
          <ProtectedRoute>
            <ChatLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
