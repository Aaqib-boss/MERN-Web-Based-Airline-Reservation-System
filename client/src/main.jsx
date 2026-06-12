import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { BookingProvider } from './context/BookingContext';
import './styles/globals.css';
import './styles/glassmorphism.css';
import './styles/animations.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BookingProvider>
            <App />
          </BookingProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);

// Register Service Worker for PWA capabilities
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('SkyWave Service Worker registered successfully with scope:', reg.scope);
      })
      .catch(err => {
        console.error('SkyWave Service Worker registration failed:', err);
      });
  });
}

