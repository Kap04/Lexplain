// hooks/useDocumentStatus.ts
import { useState, useEffect, useRef } from 'react';

interface DocumentStatusUpdate {
  type: string;
  document_id: string;
  status: string;
  message?: string;
  timestamp: string;
}

interface UseDocumentStatusResult {
  status: string;
  message: string;
  isProcessing: boolean;
  isConnected: boolean;
}

export const useDocumentStatus = (documentId: string | null): UseDocumentStatusResult => {
  const [status, setStatus] = useState<string>('unknown');
  const [message, setMessage] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!documentId) {
      setStatus('unknown');
      setMessage('');
      return;
    }

    // Create WebSocket connection
    const wsUrl = `ws://localhost:8000/ws/${documentId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`📡 WebSocket connected for document ${documentId}`);
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: DocumentStatusUpdate = JSON.parse(event.data);
        console.log('📡 Status update received:', data);
        
        setStatus(data.status);
        setMessage(data.message || '');
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log(`📡 WebSocket disconnected for document ${documentId}`);
      setIsConnected(false);
    };

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [documentId]);

  const isProcessing = status === 'processing' || status === 'uploaded';

  return {
    status,
    message,
    isProcessing,
    isConnected,
  };
};
