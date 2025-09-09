"use client";
import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ChatSidebar from "../../../components/ChatSidebar";
import DocumentUpload from "../../../components/DocumentUpload";

export default function ChatPage() {
  const { user } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const router = useRouter();

  // Function to get greeting based on Indian time
  const getGreeting = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    const hour = istTime.getUTCHours();
    
    if (hour < 12) {
      return "Good morning";
    } else if (hour < 17) {
      return "Good afternoon";
    } else {
      return "Good evening";
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setShowProfileDropdown(false);
    router.push("/auth");
  };

  const handleNewChat = () => {
    // Always route to a clean new chat page
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
  };

  const handleComparisonReady = (docIds: string[]) => {
    if (!user || docIds.length < 2) return;
    
    // Create a comparison session and navigate to it
    createComparisonSession(docIds);
  };

  const createComparisonSession = async (docIds: string[]) => {
    if (!user || docIds.length < 2) return;
    
    try {
      const idToken = await user.getIdToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          type: "comparison",
          document_ids: docIds,
          title: `Document Comparison (${docIds.length} docs)`
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
    }
  };

  const handleSelectSession = (sessionId: string) => {
    router.push(`/chat/${sessionId}`);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;
    
    try {
      const idToken = await user.getIdToken();
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/session/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      
      // Refresh the sidebar by triggering a re-render
      window.location.reload(); // Simple approach, or you can use state management
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  return (
    <ProtectedRoute>
      {user && (
        <div className="flex h-screen">
          <ChatSidebar
            user={user}
            selectedSessionId={null}
            onSelect={handleSelectSession}
            onNewChat={handleNewChat}
            onDelete={handleDeleteSession}
          />
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <span className="font-bold text-lg">Lexplain Chat</span>
              <div className="flex items-center gap-3">
                {/* Profile dropdown */}
                <div className="relative">
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

            {/* Main content - centered */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full">
              {/* Greeting */}
              <h1 className="text-5xl font-bold text-gray-800 mb-8">
                {getGreeting()}, <span className="text-blue-900 font-bold">{user.displayName?.split(' ')[0] || 'there'}!</span>
              </h1>
              
              {/* Document Upload Component */}
              <div className="w-full mb-6">
                <DocumentUpload 
                  onUpload={handleUpload} 
                  onComparisonReady={handleComparisonReady}
                  user={user} 
                />
              </div>
              
              {/* Bottom message */}
              <p className="text-sm text-gray-500 text-center">
                Upload your legal document to demystify it
              </p>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}