import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { validateEncryptionKey } from './utils/encryption';

// Validate encryption key before app startup
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY;
if (!validateEncryptionKey(ENCRYPTION_KEY)) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:20px;background:red;color:white;text-align:center;';
  errorDiv.textContent = 'Invalid encryption key. Please check your environment variables.';
  document.body.appendChild(errorDiv);
  throw new Error('Invalid VITE_ENCRYPTION_KEY. Must be a 32-character hex string.');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
