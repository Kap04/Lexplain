// components/ChatSidebar.tsx
"use client";
import React, { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { Trash2, Plus, ChevronLeft, ChevronRight } from "lucide-react";

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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function ChatSidebar({ 
  user, 
  selectedSessionId, 
  onSelect, 
  onNewChat, 
  onDelete,
  isCollapsed = false,
  onToggleCollapse
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
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-gray-900/80 backdrop-blur-sm border-r border-gray-700/50 h-full flex flex-col transition-all duration-300 ease-in-out relative`}>
      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-6 bg-gray-800/90 border border-gray-600 rounded-full p-1 hover:bg-gray-700/90 transition-colors z-10 shadow-lg backdrop-blur-sm"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight size={14} className="text-gray-300" /> : <ChevronLeft size={14} className="text-gray-300" />}
      </button>

      <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
        {!isCollapsed && <span className="font-medium text-sm text-gray-100">Your Chats</span>}
        <button 
          onClick={onNewChat} 
          className={`btn btn-primary p-1 rounded-full hover:bg-blue-600 transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
          title="Start new chat"
        >
          <Plus size={14} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 text-gray-400 text-center">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
            {!isCollapsed && <span className="text-sm">Loading chats...</span>}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-3 text-gray-400 text-center">
            {!isCollapsed && (
              <>
                <p className="mb-2 text-sm">No chats yet</p>
                <p className="text-xs">Start your first conversation!</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-700/30">
            {sessions.map((session) => (
              <div
                key={session.session_id}
                className={`flex items-center justify-between ${isCollapsed ? 'px-2 py-2' : 'px-3 py-2'} cursor-pointer hover:bg-gray-800/40 transition-colors ${
                  selectedSessionId === session.session_id ? "bg-blue-900/40 border-r-2 border-blue-400" : ""
                }`}
                onClick={() => onSelect(session.session_id)}
                title={isCollapsed ? formatTitle(session.title) : undefined}
              >
                {isCollapsed ? (
                  <div className="w-full flex justify-center">
                    <div className="w-6 h-6 bg-gray-700/60 rounded-full flex items-center justify-center text-xs font-medium text-gray-200">
                      {session.title.charAt(0).toUpperCase()}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className="block truncate text-xs font-medium text-gray-100">
                        {formatTitle(session.title)}
                      </span>
                      {session.createdAt && (
                        <span className="block text-xs text-gray-400 mt-0.5">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => handleDelete(session.session_id, e)}
                      disabled={deleteLoading === session.session_id}
                      className="ml-2 p-1 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors flex-shrink-0"
                      title="Delete chat"
                    >
                      {deleteLoading === session.session_id ? (
                        <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 size={12} />
                      )}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* User info at bottom */}
      {!isCollapsed && (
        <div className="p-2 border-t border-gray-700/50 bg-gray-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <img
              src={user.photoURL || undefined}
              alt="Profile"
              className="w-6 h-6 rounded-full border border-gray-500"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-100 truncate">
                {user.displayName}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}