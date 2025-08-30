"use client";
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { User } from "firebase/auth";
import { FileText, X, CheckCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import ProcessingStatus from "./ProcessingStatus";
import { useDocumentStatus } from "../hooks/useDocumentStatus";
import DocumentStatusCard from "./DocumentStatusCard";

interface UploadedDocument {
  id: string;
  name: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  error?: string;
}

interface DocumentUploadProps {
  onUpload: (docId: string) => void;
  onComparisonReady?: (docIds: string[]) => void;
  user: User | null;
}

export default function DocumentUpload({ onUpload, onComparisonReady, user }: DocumentUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      if (compareMode) {
        // In compare mode, allow multiple files (max 5)
        const newFiles = acceptedFiles.slice(0, 5 - files.length);
        setFiles(prev => [...prev, ...newFiles]);
      } else {
        // Single file mode
        setFiles([acceptedFiles[0]]);
      }
      setError(null);
    }
  }, [compareMode, files.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"], "image/*": [".png", ".jpg", ".jpeg"] },
    multiple: compareMode,
    maxFiles: compareMode ? 5 : 1,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const createComparisonSession = async (docIds: string[]) => {
    if (!user || docIds.length < 2) return;
    
    try {
      const idToken = await user.getIdToken();
      const documentNames = documents
        .filter(doc => docIds.includes(doc.id))
        .map(doc => doc.name)
        .join(', ');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          type: "comparison",
          document_ids: docIds,
          title: `Compare: ${documentNames.length > 50 ? documentNames.substring(0, 47) + '...' : documentNames}`
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create comparison session");
      }

      const { session_id } = await response.json();
      console.log(`Created comparison session: ${session_id} for documents: ${docIds.join(', ')}`);
      
      // Navigate to the comparison session
      router.push(`/chat/${session_id}`);
      
    } catch (error) {
      console.error("Error creating comparison session:", error);
      setError("Failed to create comparison session");
    }
  };

  const uploadSingleFile = async (file: File) => {
    if (!user) throw new Error("User not authenticated");
    
    const idToken = await user.getIdToken();
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload/content`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");
    const { document_id } = await res.json();
    return document_id;
  };

  const handleUpload = async () => {
    if (files.length === 0 || !user) return setError("No files selected or user not authenticated.");
    
    setUploading(true);
    setError(null);

    try {
      if (compareMode) {
        // Upload multiple files for comparison
        const uploadedDocs: UploadedDocument[] = [];
        const successfulDocIds: string[] = [];
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const docId = await uploadSingleFile(file);
            uploadedDocs.push({
              id: docId,
              name: file.name,
              status: 'processing'
            });
            successfulDocIds.push(docId);
          } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            uploadedDocs.push({
              id: '',
              name: file.name,
              status: 'error',
              error: 'Upload failed'
            });
          }
        }
        
        setDocuments(uploadedDocs);
        setFiles([]);
        
        // If we have at least 2 successful uploads, create comparison session
        if (successfulDocIds.length >= 2) {
          console.log(`Creating comparison session with ${successfulDocIds.length} documents`);
          // Wait a moment for backend processing to start, then create comparison session
          setTimeout(() => {
            if (onComparisonReady) {
              onComparisonReady(successfulDocIds);
            }
          }, 2000); // Give backend time to start processing
        } else {
          setError("Need at least 2 documents to upload successfully for comparison");
        }
        
      } else {
        // Single file upload
        const docId = await uploadSingleFile(files[0]);
        setFiles([]);
        
        // Set up document tracking for WebSocket status
        setDocuments([{
          id: docId,
          name: files[0].name,
          status: 'processing'
        }]);
        
        // Let WebSocket handle status updates, and navigate when ready
        setTimeout(() => {
          onUpload(docId);
        }, 1000); // Give WebSocket time to connect
      }
    } catch (error) {
      console.error("Upload error:", error);
      setError("Failed to upload documents. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentReady = (docId: string) => {
    // Update local state when document is ready
    setDocuments(prev => prev.map(doc => 
      doc.id === docId ? { ...doc, status: 'ready' } : doc
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />;
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing document...';
      case 'ready':
        return 'Ready';
      case 'error':
        return 'Error';
      default:
        return 'Waiting';
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Compare Mode Toggle - always show for full functionality */}
      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={compareMode}
            onChange={(e) => {
              setCompareMode(e.target.checked);
              setFiles([]);
              setDocuments([]);
              setError(null);
            }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">
            📊 Compare Multiple Documents
          </span>
        </label>
        {compareMode && (
          <span className="text-xs text-gray-500">
            Upload 2-5 documents for comparison
          </span>
        )}
      </div>

      {/* Clean File Drop Zone */}
      {(files.length === 0 || (compareMode && files.length < 5)) && (
        <div className="mb-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
            ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50/50"}`}
          >
            <input {...getInputProps()} />
            {/* Upload Icon */}
            <div className="mb-6">
              <svg 
                className="w-16 h-16 text-gray-400 mx-auto" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium text-gray-600 mb-4">
              {compareMode 
                ? `Browse files for Upload (${files.length}/5)`
                : "Browse files for Upload"
              }
            </h3>
            
            <div className="inline-flex items-center px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              Browse
            </div>
            
            <p className="text-xs text-gray-400 mt-4">
              Supports PDF, TXT, PNG, JPG files
            </p>
            {compareMode && (
              <p className="text-xs text-blue-600 mt-2">
                {files.length === 0 ? "Select 2-5 documents for comparison" : `${files.length} selected, add more or upload`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Selected Files Display - Compact */}
      {files.length > 0 && (
        <div className="mb-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Selected Files:</h4>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-500">
                  ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button - show when files are selected */}
      {files.length > 0 && (
        <div className="mb-4">
          <button
            onClick={handleUpload}
            disabled={uploading || (compareMode && files.length < 2)}
            className="w-full bg-slate-800 text-white px-6 py-4 rounded-xl font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                {compareMode ? "Uploading & Processing..." : "Uploading..."}
              </div>
            ) : (
              compareMode ? `Upload & Compare ${files.length} Documents` : "Upload"
            )}
          </button>
          {compareMode && files.length < 2 && (
            <p className="text-xs text-amber-600 mt-2 text-center">
              Select at least 2 documents to enable comparison
            </p>
          )}
        </div>
      )}

      {/* Upload Progress */}
      {documents.length > 0 && (
        <div className="mb-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            {compareMode ? 'Upload & Processing Progress:' : 'Document Status:'}
          </h4>
          {documents.map((doc, index) => (
            <DocumentStatusCard
              key={doc.id || index}
              docId={doc.id}
              fileName={doc.name}
              onReady={handleDocumentReady}
            />
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
