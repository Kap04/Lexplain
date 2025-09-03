// components/DocumentStatusCard.tsx
import React from 'react';
import { FileText } from 'lucide-react';
import { useDocumentStatus } from '../hooks/useDocumentStatus';
import ProcessingStatus from './ProcessingStatus';

interface DocumentStatusCardProps {
  docId: string;
  fileName: string;
  onReady?: (docId: string) => void;
  extractionMethod?: string;
}

const DocumentStatusCard: React.FC<DocumentStatusCardProps> = ({
  docId,
  fileName,
  onReady,
  extractionMethod
}) => {
  const { status, message, isProcessing, isConnected } = useDocumentStatus(docId);

  const getExtractionMethodDisplay = (method?: string) => {
    if (!method) return null;
    
    switch (method) {
      case 'text_based':
        return { label: 'Text', icon: '📄', color: 'text-green-600 bg-green-50' };
      case 'plain_text_fallback':
        return { label: 'Plain Text', icon: '📝', color: 'text-gray-600 bg-gray-50' };
      default:
        return { label: 'Processed', icon: '✓', color: 'text-gray-600 bg-gray-50' };
    }
  };

  const extractionDisplay = getExtractionMethodDisplay(extractionMethod);

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
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-medium">{fileName}</span>
            {extractionDisplay && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${extractionDisplay.color} font-medium`}>
                {extractionDisplay.icon} {extractionDisplay.label}
              </span>
            )}
          </div>
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
