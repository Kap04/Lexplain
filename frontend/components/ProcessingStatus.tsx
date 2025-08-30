// components/ProcessingStatus.tsx
import React from 'react';

interface ProcessingStatusProps {
  status: string;
  message: string;
  isProcessing: boolean;
  isConnected: boolean;
  className?: string;
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  status,
  message,
  isProcessing,
  isConnected,
  className = ''
}) => {
  if (!isProcessing && status !== 'failed') {
    return null; // Don't show anything if not processing and not failed
  }

  const getStatusColor = () => {
    switch (status) {
      case 'processed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'processing':
      case 'uploaded':
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processed':
        return '✅';
      case 'failed':
        return '❌';
      case 'processing':
      case 'uploaded':
      default:
        return (
          <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
        );
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'processed':
        return 'Complete';
      case 'failed':
        return 'Failed';
      case 'processing':
        return 'Processing';
      case 'uploaded':
        return 'Uploaded';
      default:
        return 'Processing';
    }
  };

  return (
    <div className={`inline-flex items-center px-3 py-2 rounded-lg border ${getStatusColor()} ${className}`}>
      <span className="mr-2">
        {getStatusIcon()}
      </span>
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {getStatusText()}
        </span>
        {message && (
          <span className="text-xs opacity-75">
            {message}
          </span>
        )}
      </div>
      {!isConnected && isProcessing && (
        <span className="ml-2 text-xs opacity-50" title="Connection lost">
          📡
        </span>
      )}
    </div>
  );
};

export default ProcessingStatus;
