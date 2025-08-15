"use client";
import React, { useState } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function UploadPage() {
  const [user, setUser] = useState<User|null>(null);
  const [file, setFile] = useState<File|null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const [docId, setDocId] = useState<string|null>(null);
  const [summary, setSummary] = useState<any|null>(null);
  const [processing, setProcessing] = useState(false);

  // Auth state
  React.useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  const handleSignIn = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleUpload = async () => {
    setError(null); setSuccess(null);
    if (!file || !user) return setError('No file or user.');
    setUploading(true);
    try {
      // 1. Get ID token
      const idToken = await user.getIdToken();
      
      // 2. Create FormData with the file
      const formData = new FormData();
      formData.append('file', file);
      
      // 3. Upload file to backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload/content`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${idToken}` 
          // Note: Don't set Content-Type - browser will set it with boundary
        },
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const { document_id } = await res.json();
  setSuccess(`Uploaded! Document ID: ${document_id}`);
  setDocId(document_id);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleProcess = async () => {
    if (!docId || !user) return;
    setProcessing(true);
    setSummary(null);
    const idToken = await user.getIdToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/process/${docId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    const data = await res.json();
    setSummary(data);
    setProcessing(false);
  };

  return (
    <div style={{maxWidth:600,margin:'40px auto',padding:24}}>
      <h2>Upload Document</h2>
      {!user ? (
        <button onClick={handleSignIn}>Sign in with Google</button>
      ) : (
        <div>
          <div style={{marginBottom:12}}>Signed in as {user.email} <button onClick={handleSignOut}>Sign out</button></div>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" onChange={handleFileChange} />
          <div style={{margin:'12px 0'}}>
            <label>
              <input type="checkbox" required /> I consent to processing and understand this is not legal advice.
            </label>
          </div>
          <button onClick={handleUpload} disabled={!file || uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
          {docId && (
            <div style={{marginTop:24}}>
              <button onClick={handleProcess} disabled={processing}>{processing ? 'Processing...' : 'Process & Summarize'}</button>
            </div>
          )}
        </div>
      )}
      {error && <div style={{color:'red',marginTop:16}}>{error}</div>}
      {success && <div style={{color:'green',marginTop:16}}>{success}</div>}
      {summary && (
        <div style={{marginTop:32, padding: "20px", backgroundColor: "#f8f9fa", borderRadius: "8px"}}>
          <h3 style={{marginBottom: "20px", color: "#2c3e50"}}>Document Summary</h3>
          <div style={{marginBottom: "24px"}}>
            {summary.summary?.map((b:string,i:number) => 
              b.startsWith("•") ? (
                <li key={i} style={{marginLeft: "20px", marginBottom: "8px"}}>{b.substring(1).trim()}</li>
              ) : (
                <p key={i} style={{marginBottom: "12px", fontWeight: b.includes(":") ? "bold" : "normal"}}>{b}</p>
              )
            )}
          </div>
          
          <h4 style={{marginTop: "24px", marginBottom: "16px", color: "#e74c3c"}}>Key Risks & Considerations</h4>
          <div style={{display: "grid", gap: "16px"}}>
            {summary.risks?.map((r:any,i:number) => (
              <div key={i} style={{
                padding: "16px",
                backgroundColor: "white",
                borderLeft: "4px solid #e74c3c",
                borderRadius: "4px"
              }}>
                <div style={{fontWeight: "bold", marginBottom: "8px", color: "#e74c3c"}}>{r.label}</div>
                <div style={{color: "#444"}}>{r.explanation}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
