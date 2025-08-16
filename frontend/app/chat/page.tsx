"use client";
import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";
import { initializeApp } from "firebase/app";

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

function DocumentUpload({ onUpload, user }: { onUpload: (docId: string) => void, user: User|null }) {
  const [file, setFile] = useState<File|null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
    setError(null);
    setSuccess(null);
  };

  const handleUpload = async () => {
    setError(null); setSuccess(null);
    if (!file || !user) return setError('No file or user.');
    setUploading(true);
    try {
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload/content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        },
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const { document_id } = await res.json();
      setSuccess(`Uploaded! Document ID: ${document_id}`);
      onUpload(document_id);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{marginBottom:32}}>
      <h3>Upload Document</h3>
      <input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!file || uploading || !user} style={{marginLeft:8}}>{uploading ? 'Uploading...' : 'Upload'}</button>
      {error && <div style={{color:'red',marginTop:8}}>{error}</div>}
      {success && <div style={{color:'green',marginTop:8}}>{success}</div>}
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Array<{role: string; text: string}>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string|null>(null);
  const [docId, setDocId] = useState<string|null>(null);
  const [user, setUser] = useState<User|null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  const handleSignIn = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    setDocId(null);
    setMessages([]);
    setSummary(null);
  };

  const handleSend = async () => {
    if (!input || !docId || !user) return;
    setLoading(true);
    setMessages((msgs) => [...msgs, {role: "user", text: input}]);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/${docId}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ question: input })
      });
      const data = await res.json();
      setMessages((msgs) => [...msgs, {role: "ai", text: data.answer}]);
    } catch (e) {
      setMessages((msgs) => [...msgs, {role: "ai", text: "Error: Could not get response."}]);
    }
    setInput("");
    setLoading(false);
  };

  const handleSummarize = async () => {
    if (!docId || !user) return;
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/${docId}/summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${idToken}`
        }
      });
      const data = await res.json();
      setSummary(data.summary);
    } catch (e) {
      setSummary("Error: Could not get summary.");
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div style={{maxWidth:600,margin:"40px auto",padding:24}}>
        <h2>Lexplain Chat</h2>
        <button onClick={handleSignIn}>Sign in with Google</button>
      </div>
    );
  }

  return (
    <div style={{maxWidth:600,margin:"40px auto",padding:24}}>
      <div style={{marginBottom:16}}>
        Signed in as {user.email} <button onClick={handleSignOut} style={{marginLeft:8}}>Sign out</button>
      </div>
      <DocumentUpload onUpload={setDocId} user={user} />
      {docId && (
        <div style={{marginBottom:16}}>
          <b>Document ID:</b> <span style={{color:'#0077cc'}}>{docId}</span>
        </div>
      )}
      <div style={{border:"1px solid #ccc",borderRadius:8,padding:16,minHeight:200,marginBottom:16}}>
        {messages.map((msg, i) => (
          <div key={i} style={{marginBottom:12}}>
            <b style={{color:msg.role==="user"?"#2c3e50":"#0077cc"}}>{msg.role === "user" ? "You" : "Lexplain"}:</b>
            <span style={{marginLeft:8}}>{msg.text}</span>
          </div>
        ))}
        {loading && <div>Loading...</div>}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question about the document..."
          style={{flex:1,padding:8}}
          disabled={loading || !docId}
        />
        <button onClick={handleSend} disabled={loading || !input || !docId}>Send</button>
      </div>
      <div style={{marginTop:24}}>
        <button onClick={handleSummarize} disabled={loading || !docId}>Summarize Document</button>
        {summary && (
          <div style={{marginTop:16,padding:16,background:"#f8f9fa",borderRadius:8}}>
            <h4>Summary</h4>
            <div>{summary}</div>
          </div>
        )}
      </div>
    </div>
  );
}
