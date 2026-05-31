import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API_BASE.replace('/api', '');

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider: React.FC<{ userId?: string; children: React.ReactNode }> = ({ userId, children }) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Connect to socket server
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Register this user's socket with the server
      socket.emit('register', userId);
    });

    // Listen for real-time notifications pushed from server
    socket.on('notification', (data: { title: string; message: string; type: string }) => {
      switch (data.type) {
        case 'success': toast.success(data.title, { description: data.message }); break;
        case 'error': toast.error(data.title, { description: data.message }); break;
        case 'warning': toast.warning(data.title, { description: data.message }); break;
        default: toast.info(data.title, { description: data.message });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
