"use client";
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { User } from "firebase/auth";

interface DocumentUploadProps {
  onUpload: (docId: string) => void;
  user: User | null;
}

export default function DocumentUpload({ onUpload, user }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"], "image/*": [".png", ".jpg", ".jpeg"] },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file || !user) return setError("No file or user.");
    setUploading(true);

    try {
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
      onUpload(document_id);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-80">
      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition 
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"}`}
        >
          <input {...getInputProps()} />
          <p className="text-gray-600">Drag & drop your document here, or click to select</p>
          <p className="text-xs text-gray-400 mt-2">PDF, TXT, PNG, JPG supported</p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-100">
          <span className="text-sm text-gray-700">{file.name}</span>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-blue-600 text-white px-4 py-1 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      )}
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
    </div>
  );
}
