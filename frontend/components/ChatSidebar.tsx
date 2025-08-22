// components/ChatSidebar.tsx
"use client";
import React, { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { Trash2, Plus } from "lucide-react";

interface ChatSession {
  session_id: string;
  title: string;
  createdAt?: any;
}

interface ChatSidebarProps {
  user: User;
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onDelete: (sessionId: string) => void;
}

export default function ChatSidebar({ 
  user, 
  selectedSessionId, 
  onSelect, 
  onNewChat, 
  onDelete 
}: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Fetch sessions
  const fetchSessions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/sessions`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      } else {
        console.error("Failed to fetch sessions");
        setSessions([]);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      setSessions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this chat?")) {
      return;
    }

    setDeleteLoading(sessionId);
    try {
      await onDelete(sessionId);
      // Refresh sessions after deletion
      await fetchSessions();
    } catch (error) {
      console.error("Error in delete handler:", error);
    }
    setDeleteLoading(null);
  };

  const formatTitle = (title: string) => {
    if (!title || title === "New Chat") {
      return "New Chat";
    }
    return title.length > 20 ? title.substring(0, 20) + "..." : title;
  };

  return (
    <div className="w-64 bg-white border-r h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <span className="font-bold text-lg">Your Chats</span>
        <button 
          onClick={onNewChat} 
          className="btn btn-primary p-1 rounded-full hover:bg-blue-600 transition-colors"
          title="Start new chat"
        >
          <Plus size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-gray-400 text-center">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
            Loading chats...
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-gray-400 text-center">
            <p className="mb-2">No chats yet</p>
            <p className="text-sm">Start your first conversation!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sessions.map((session) => (
              <div
                key={session.session_id}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors ${
                  selectedSessionId === session.session_id ? "bg-blue-100 border-r-2 border-blue-500" : ""
                }`}
                onClick={() => onSelect(session.session_id)}
              >
                <div className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-medium text-gray-900">
                    {formatTitle(session.title)}
                  </span>
                  {session.createdAt && (
                    <span className="block text-xs text-gray-500 mt-1">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <button
                  onClick={(e) => handleDelete(session.session_id, e)}
                  disabled={deleteLoading === session.session_id}
                  className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                  title="Delete chat"
                >
                  {deleteLoading === session.session_id ? (
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* User info at bottom */}
      <div className="p-3 border-t bg-gray-50">
        <div className="flex items-center gap-2">
          <img
            src={user.photoURL || undefined}
            alt="Profile"
            className="w-8 h-8 rounded-full border border-gray-300"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.displayName}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}