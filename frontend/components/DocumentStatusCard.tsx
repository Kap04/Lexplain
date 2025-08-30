// components/DocumentStatusCard.tsx
import React from 'react';
import { FileText } from 'lucide-react';
import { useDocumentStatus } from '../hooks/useDocumentStatus';
import ProcessingStatus from './ProcessingStatus';

interface DocumentStatusCardProps {
  docId: string;
  fileName: string;
  onReady?: (docId: string) => void;
}

const DocumentStatusCard: React.FC<DocumentStatusCardProps> = ({
  docId,
  fileName,
  onReady
}) => {
  const { status, message, isProcessing, isConnected } = useDocumentStatus(docId);

  // Call onReady when document becomes ready
  React.useEffect(() => {
    if (status === 'processed' && onReady) {
      onReady(docId);
    }
  }, [status, docId, onReady]);

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
      <div className="flex items-center gap-3">
        <FileText className="w-4 h-4 text-gray-500" />
        <div className="flex flex-col">
          <span className="text-sm text-gray-700 font-medium">{fileName}</span>
          <span className="text-xs text-gray-500">ID: {docId.slice(0, 8)}...</span>
        </div>
      </div>
      
      <ProcessingStatus
        status={status}
        message={message}
        isProcessing={isProcessing}
        isConnected={isConnected}
        className="flex-shrink-0"
      />
    </div>
  );
};

export default DocumentStatusCard;
