"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import { useParams, useRouter } from "next/navigation";
import ChatSidebar from "../../../components/ChatSidebar";
import DocumentUpload from "../../../components/DocumentUpload";

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

export default function ChatSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.sessionId as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showProfileDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showProfileDropdown]);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Fetch session data
  useEffect(() => {
    if (!sessionId || !user) return;
    
    const fetchSession = async () => {
      setSessionLoading(true);
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/session/${sessionId}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          setSession(data);
          setMessages(data.messages || []);
          setDocId(data.documentId || null);
        } else {
          // Session not found, redirect to main chat page
          router.push('/chat');
        }
      } catch (error) {
        console.error("Error fetching session:", error);
        router.push('/chat');
      }
      setSessionLoading(false);
    };
    
    fetchSession();
  }, [sessionId, user, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSignIn = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    router.push('/chat');
  };

  const handleNewChat = () => {
    
    router.push("/chat/new");
  };

  const handleUpload = async (newDocId: string) => {
    if (!user) return;
    
    // Create a new chat session with this document
    const idToken = await user.getIdToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ documentId: newDocId }),
    });
    const data = await res.json();
    
    // Navigate to the new session
    router.push(`/chat/${data.session_id}`);
    setShowUpload(false);
  };

  const handleSelectSession = (newSessionId: string) => {
    if (newSessionId !== sessionId) {
      router.push(`/chat/${newSessionId}`);
    }
  };

  const handleDeleteSession = async (sessionIdToDelete: string) => {
    if (!user) return;
    
    try {
      const idToken = await user.getIdToken();
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/session/${sessionIdToDelete}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      
      // If we're deleting the current session, redirect to new chat page
      if (sessionIdToDelete === sessionId) {
        router.push('/chat/new');
      } else {
        // Just refresh the sidebar
        window.location.reload();
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const handleSummarize = async () => {
    if (!docId || !user) return;
    
    setSummaryLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/${docId}/summary`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary || "No summary available");
        setShowSummary(true);
      } else {
        setSummary("Failed to fetch summary");
        setShowSummary(true);
      }
    } catch (e) {
      setSummary("Error fetching summary");
      setShowSummary(true);
    }
    setSummaryLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId || !user) return;
    
    const messageText = input.trim();
    setLoading(true);
    setMessages((msgs) => [...msgs, { role: "user", text: messageText }]);
    setInput("");
    
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/session/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ text: messageText }),
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Update session title if this is the first message
        if (messages.length === 0 && data.session) {
          setSession(data.session);
        }
        
        // Add AI response
        const aiMessages = data.messages?.filter((m: any) => m.role === "ai") || [];
        if (aiMessages.length > 0) {
          setMessages((msgs) => [...msgs, ...aiMessages]);
        } else {
          setMessages((msgs) => [...msgs, { role: "ai", text: "I received your message but couldn't generate a response." }]);
        }
      } else {
        setMessages((msgs) => [...msgs, { role: "ai", text: "Error: Could not get response from server." }]);
      }
    } catch (e) {
      console.error("Error sending message:", e);
      setMessages((msgs) => [...msgs, { role: "ai", text: "Error: Could not send message." }]);
    }
    
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white shadow-md rounded-xl p-8 text-center">
          <button onClick={handleSignIn} className="btn btn-primary">
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (sessionLoading) {
    return (
      <div className="flex h-screen">
        <ChatSidebar
          user={user}
          selectedSessionId={sessionId}
          onSelect={handleSelectSession}
          onNewChat={handleNewChat}
          onDelete={handleDeleteSession}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <ChatSidebar
        user={user}
        selectedSessionId={sessionId}
        onSelect={handleSelectSession}
        onNewChat={handleNewChat}
        onDelete={handleDeleteSession}
      />
      <div className="flex-1 flex flex-col">
        {/* Header with title and profile dropdown */}
        <div className="p-4 border-b flex items-center justify-between">
          <span className="font-bold text-lg">
            {session?.title || "Lexplain Chat"}
          </span>
          <div className="flex items-center gap-3">
            {/* Summarize button */}
            {docId && (
              <button
                onClick={handleSummarize}
                disabled={summaryLoading}
                className="btn btn-outline flex items-center gap-2"
              >
                {summaryLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    📄 Summarize
                  </>
                )}
              </button>
            )}
            
            {/* Profile dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                className="focus:outline-none hover:ring-2 hover:ring-blue-300 rounded-full transition-all duration-200"
                onClick={() => setShowProfileDropdown((v) => !v)}
              >
                <img
                  src={user.photoURL || undefined}
                  alt="Profile"
                  className="w-10 h-10 rounded-full border-2 border-blue-500 shadow-md"
                  referrerPolicy="no-referrer"
                />
              </button>
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg z-50">
                  <div className="flex flex-col items-center p-4">
                    <img
                      src={user.photoURL || undefined}
                      alt="Profile"
                      className="w-16 h-16 rounded-full mb-2 border-2 border-gray-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="font-semibold text-gray-800">{user.displayName}</div>
                    <div className="text-gray-500 text-sm mb-3">{user.email}</div>
                    <button
                      onClick={handleSignOut}
                      className="btn btn-outline w-full"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Document upload section */}
        {showUpload && (
          <div className="p-4">
            <DocumentUpload onUpload={handleUpload} user={user} />
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Summary display */}
          {showSummary && summary && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                  📄 Document Summary
                </h3>
                <button
                  onClick={() => setShowSummary(false)}
                  className="text-blue-600 hover:text-blue-800 text-lg"
                >
                  ×
                </button>
              </div>
              <div className="text-blue-700 whitespace-pre-wrap text-sm leading-relaxed">
                {summary}
              </div>
            </div>
          )}
          
          {messages.length === 0 && !showSummary && (
            <div className="text-gray-400 text-center">
              No messages yet. Start chatting!
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`bubble ${
                msg.role === "user" ? "bubble-user ml-auto" : "bubble-ai mr-auto"
              }`}
            >
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t bg-white flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              docId ? "Ask a question about the document..." : "Upload a document to start..."
            }
            className="flex-1 input"
            disabled={!docId || loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!docId || !input.trim() || loading}
            className="btn btn-primary"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}