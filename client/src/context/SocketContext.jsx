import React, { createContext, useEffect, useState, useContext } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Resolve backend port 5002 in development
    const socketUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:5002'
      : window.location.origin;

    console.log(`Connecting Socket to: ${socketUrl}`);
    const socketInstance = io(socketUrl, {
      transports: ['websocket'],
      upgrade: false
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Socket connection established with server!');
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected from server.');
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export { SocketContext };
