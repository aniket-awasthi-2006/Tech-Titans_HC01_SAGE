'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data?: unknown) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  emit: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket] = useState<Socket | null>(() => {
    if (typeof window === 'undefined') return null;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
    return io(socketUrl, {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
    });
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log('[Socket.io] Connected:', socket.id);
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('[Socket.io] Disconnected');
      setIsConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.disconnect();
    };
  }, [socket]);

  const emit = (event: string, data?: unknown) => {
    socket?.emit(event, data);
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
