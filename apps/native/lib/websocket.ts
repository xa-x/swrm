import { useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

interface WebSocketMessage {
  type: 'connected' | 'message' | 'typing' | 'error';
  sessionId?: string;
  agentId?: string;
  role?: 'user' | 'assistant';
  content?: string;
  tokens?: number;
  cost?: number;
  status?: boolean;
  message?: string;
}

export function useWebSocket(agentId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messageHandlers = useRef<((msg: WebSocketMessage) => void)[]>([]);

  const connect = useCallback(async () => {
    if (!agentId || wsRef.current?.readyState === WebSocket.OPEN) return;

    // Get user ID for auth (from storage or Clerk)
    const userId = await AsyncStorage.getItem('user_id') || 'demo-user';
    
    // Include userId in URL query since we can't send custom headers in RN WebSocket
    const wsUrl = API_URL.replace('http', 'ws');
    const url = `${wsUrl}/chat/ws/${agentId}?userId=${userId}`;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      const msg: WebSocketMessage = JSON.parse(event.data);
      
      if (msg.type === 'connected' && msg.sessionId) {
        setSessionId(msg.sessionId);
      }
      
      if (msg.type === 'typing') {
        setIsTyping(msg.status || false);
      }
      
      if (msg.type === 'error') {
        setError(msg.message || 'Unknown error');
      }

      // Notify all handlers
      messageHandlers.current.forEach(handler => handler(msg));
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('Connection error');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setSessionId(null);
    };

    wsRef.current = ws;
  }, [agentId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content,
      }));
    }
  }, []);

  const onMessage = useCallback((handler: (msg: WebSocketMessage) => void) => {
    messageHandlers.current.push(handler);
    return () => {
      messageHandlers.current = messageHandlers.current.filter(h => h !== handler);
    };
  }, []);

  useEffect(() => {
    if (agentId) {
      connect();
    }
    return () => disconnect();
  }, [agentId, connect, disconnect]);

  return {
    isConnected,
    isTyping,
    sessionId,
    error,
    send,
    onMessage,
    connect,
    disconnect,
  };
}
