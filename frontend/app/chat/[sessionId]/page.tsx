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
import { Scale } from "lucide-react";
import ChatSidebar from "../../../components/ChatSidebar";
import DocumentUpload from "../../../components/DocumentUpload";
import ArtifactCard from "../../../components/ArtifactCard";
import ArtifactPanel from "../../../components/ArtifactPanel";
import ComparisonArtifactCard from "../../../components/ComparisonArtifactCard";
import { LegalAnalysisData } from "../../../components/ArtifactCard";
import { ComparisonData } from "../../../components/ComparisonArtifactCard";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Artifact system state
  const [artifacts, setArtifacts] = useState<LegalAnalysisData[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<LegalAnalysisData | null>(null);
  const [showArtifactPanel, setShowArtifactPanel] = useState(false);
  
  // Comparison artifact state
  const [comparisonArtifacts, setComparisonArtifacts] = useState<ComparisonData[]>([]);
  const [selectedComparison, setSelectedComparison] = useState<ComparisonData | null>(null);
  
  // Comparison mode state
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonDocuments, setComparisonDocuments] = useState<string[]>([]);
  
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
          
          // Check if this is a comparison session
          if (data.type === "comparison" && data.document_ids) {
            setComparisonDocuments(data.document_ids);
            setShowComparison(true);
            
            // Generate comparison artifact immediately
            generateComparisonArtifact(data.document_ids);
          }
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

  const handleComparisonReady = async (docIds: string[]) => {
    if (!user) return;
    
    try {
      // Create a new chat session for comparison
      const idToken = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/session/new`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `Document Comparison - ${new Date().toLocaleDateString()}`,
          type: "comparison",
          document_ids: docIds
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newSessionId = data.session_id;
        
        // Navigate to the new comparison session
        router.push(`/chat/${newSessionId}?mode=comparison&docs=${docIds.join(',')}`);
      } else {
        // Fallback: show comparison in current session
        setComparisonDocuments(docIds);
        setShowComparison(true);
        setShowUpload(false);
      }
    } catch (error) {
      console.error("Error creating comparison session:", error);
      // Fallback: show comparison in current session
      setComparisonDocuments(docIds);
      setShowComparison(true);
      setShowUpload(false);
    }
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

  // Generate comparison artifact
  const generateComparisonArtifact = async (docIds: string[]) => {
    if (!user || docIds.length < 2) return;
    
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/compare`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document_ids: docIds }),
      });
      
      if (res.ok) {
        const comparisonData = await res.json();
        
        // Check if documents are still processing
        if (comparisonData.status === "processing") {
          console.log(`Documents still processing: ${comparisonData.message}`);
          // Retry after a delay
          setTimeout(() => generateComparisonArtifact(docIds), 5000);
          return;
        }
        
        // Check if we have a complete comparison (documents and comparison fields)
        if (!comparisonData.documents || !comparisonData.comparison) {
          console.log("Incomplete comparison data received, retrying...");
          setTimeout(() => generateComparisonArtifact(docIds), 3000);
          return;
        }
        
        const comparison = comparisonData.comparison;
        const newComparisonArtifact: ComparisonData = {
          id: `comp-${Date.now()}`,
          documents: comparisonData.documents.map((doc: any) => ({ 
            id: doc.id, 
            name: doc.name || `Document ${doc.id}`
          })),
          highRiskClauses: comparison.clauseDifferences?.filter((diff: any) => 
            diff.riskComparison?.doc1Risk === 'high' || diff.riskComparison?.doc2Risk === 'high'
          ).length || 0,
          missingClauses: comparison.missingClauses?.length || 0,
          overallAssessment: comparison.overallComparison?.riskSummary || "Comparison analysis completed",
          clauseDifferences: comparison.clauseDifferences || [],
          recommendations: comparison.recommendations || []
        };
        
        setComparisonArtifacts(prev => [newComparisonArtifact, ...prev]);
        
      } else {
        const errorData = await res.json();
        console.error("Comparison API error:", errorData);
        if (errorData.detail?.includes("still processing")) {
          // Retry if documents are still processing
          setTimeout(() => generateComparisonArtifact(docIds), 5000);
          return;
        }
      }
    } catch (error) {
      console.error("Error generating comparison artifact:", error);
      // Retry on network errors
      setTimeout(() => generateComparisonArtifact(docIds), 5000);
    }
    setLoading(false);
  };

  const handleComparisonArtifactClick = (comparison: ComparisonData) => {
    setSelectedComparison(comparison);
    setSelectedArtifact(null);
    setShowArtifactPanel(true);
  };

  // Generate legal analysis artifact
  const handleGenerateAnalysis = async () => {
    if (!docId || !user) return;
    
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/${docId}/legal-analysis`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}` 
        },
      });
      
      if (res.ok) {
        const analysisData = await res.json();
        const newArtifact: LegalAnalysisData = {
          id: Date.now().toString(),
          documentId: docId,
          documentName: session?.title || "Legal Document",
          summary: analysisData.summary || "No summary available",
          clauseCategories: analysisData.clauseCategories || [],
          riskAnalysis: analysisData.riskAnalysis || {
            overallRisk: "medium",
            riskScore: 50,
            highRiskClauses: []
          },
          legalQuestions: analysisData.legalQuestions || [],
          overallRiskScore: analysisData.riskAnalysis?.riskScore || 50
        };
        setArtifacts(prev => [...prev, newArtifact]);
        
        // Add success message to chat
        setMessages(msgs => [...msgs, { 
          role: "ai", 
          text: "✅ Legal analysis complete! I've generated a comprehensive analysis report that you can view in the artifact panel." 
        }]);
      } else {
        setMessages(msgs => [...msgs, { 
          role: "ai", 
          text: "❌ Failed to generate legal analysis. Please try again." 
        }]);
      }
    } catch (e) {
      console.error("Error generating analysis:", e);
      setMessages(msgs => [...msgs, { 
        role: "ai", 
        text: "❌ Error generating legal analysis. Please try again." 
      }]);
    }
    setLoading(false);
  };

  // Handle artifact card click
  const handleArtifactClick = (artifact: LegalAnalysisData) => {
    setSelectedArtifact(artifact);
    setSelectedComparison(null);
    setShowArtifactPanel(true);
  };

  // Handle artifact panel close
  const handleCloseArtifactPanel = () => {
    setShowArtifactPanel(false);
    setSelectedArtifact(null);
    setSelectedComparison(null);
  };

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!user) return;
    
    try {
      const idToken = await user.getIdToken();
      let endpoint = "";
      let payload = {};
      let filename = "";
      
      if (selectedArtifact) {
        endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/${selectedArtifact.documentId}/export-pdf`;
        payload = selectedArtifact;
        filename = `${selectedArtifact.documentName}_analysis.pdf`;
      } else if (selectedComparison) {
        endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/comparison/export-pdf`;
        payload = selectedComparison;
        filename = `document_comparison.pdf`;
      } else {
        return;
      }
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}` 
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  // Generate demo artifact (for testing)
  const handleGenerateDemo = () => {
    const demoArtifact: LegalAnalysisData = {
      id: Date.now().toString(),
      documentId: docId || "demo-doc",
      documentName: session?.title || "Demo Legal Contract",
      summary: "This is a comprehensive service agreement between two parties outlining payment terms, service delivery expectations, and liability limitations. The contract includes standard confidentiality clauses and termination procedures with a 30-day notice period.",
      jurisdiction: {
        detected: "US-California",
        confidence: "high",
        applicable_laws: [
          "California Civil Code Section 1671.5 (Liquidated Damages)",
          "California Labor Code Section 2870 (Employee Inventions)",
          "Unruh Civil Rights Act"
        ],
        recent_changes: [
          "AB 2273 (2022) - California Age-Appropriate Design Code Act",
          "SB 523 (2023) - Updated data privacy requirements for businesses"
        ]
      },
      clauseCategories: [
        {
          category: "Payment Terms",
          clauses: [
            "Payment due within 30 days of invoice",
            "Late payment penalties of 2% per month",
            "Automatic renewal clause for annual contracts"
          ],
          riskLevel: "low",
          jurisdictionNotes: "California requires clear disclosure of automatic renewal terms per SB 313"
        },
        {
          category: "Liability & Indemnification",
          clauses: [
            "Limitation of liability to contract value",
            "Mutual indemnification provisions",
            "Exclusion of consequential damages"
          ],
          riskLevel: "high",
          jurisdictionNotes: "California Civil Code 1668 may limit enforceability of broad liability exclusions"
        },
        {
          category: "Termination",
          clauses: [
            "30-day written notice required",
            "Immediate termination for material breach",
            "Survival of confidentiality obligations"
          ],
          riskLevel: "medium"
        }
      ],
      riskAnalysis: {
        overallRisk: "medium",
        riskScore: 68,
        highRiskClauses: [
          {
            clause: "Limitation of liability to contract value",
            risk: "May not cover actual damages incurred",
            impact: "Potential significant financial exposure beyond contract value",
            jurisdictionSpecific: "California courts may not enforce if unconscionable under Civil Code 1670.5"
          },
          {
            clause: "Exclusion of consequential damages",
            risk: "Broad exclusion may be unenforceable",
            impact: "Could limit recovery for business losses",
            jurisdictionSpecific: "Must be conspicuous and reasonable under California law"
          }
        ],
        complianceIssues: [
          "Automatic renewal clause may need to comply with California SB 313 disclosure requirements",
          "Data handling provisions should align with CCPA requirements",
          "Consider adding required California consumer protection notices"
        ]
      },
      legalQuestions: [
        "Should the liability cap be increased for this type of service?",
        "Are the termination provisions balanced for both parties?",
        "Does the automatic renewal clause comply with California SB 313?",
        "Should there be specific performance milestones included?",
        "Are CCPA compliance provisions needed for this agreement?"
      ],
      searchInsights: [
        "Recent California court decisions suggest liability caps under $50k may be scrutinized more heavily",
        "Similar service agreements in California typically include force majeure clauses post-COVID",
        "New AI and data processing regulations may require additional disclosure language",
        "Industry standard payment terms have shifted to NET-15 for technology services"
      ],
      overallRiskScore: 68
    };
    
    setArtifacts(prev => [...prev, demoArtifact]);
    setMessages(msgs => [...msgs, { 
      role: "ai", 
      text: "✅ Enhanced demo legal analysis generated with jurisdiction detection and legal research insights! This shows the new Google Search integration features." 
    }]);
  };

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    setSidebarCollapsed(prev => !prev);
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
          onToggleCollapse={handleSidebarToggle}
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
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleSidebarToggle}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        showArtifactPanel 
          ? 'mr-[50vw]' // Artifact panel is w-1/2 (50vw), so shift chat area left by 50vw
          : 'mr-0' // No artifact panel, chat area uses full width minus sidebar
      }`}>
        {/* Header with title and profile dropdown */}
        <div className="p-4 border-b flex items-center justify-between max-w-4xl mx-auto w-full">
          <span className="font-bold text-lg flex items-center gap-2">
            {showComparison && comparisonDocuments.length >= 2 ? (
              <>
                <Scale className="w-5 h-5 text-blue-600" />
                {session?.title || `Document Comparison (${comparisonDocuments.length} docs)`}
              </>
            ) : (
              session?.title || "Lexplain Chat"
            )}
          </span>
          <div className="flex items-center gap-3">
            {/* Demo button for testing */}
            {!showComparison && (
              <button
                onClick={handleGenerateDemo}
                className="btn btn-secondary flex items-center gap-2 text-xs"
              >
                🧪 Demo Analysis
              </button>
            )}
            
            {/* Generate Analysis button - only for single documents */}
            {docId && !showComparison && (
              <button
                onClick={handleGenerateAnalysis}
                disabled={loading}
                className="btn btn-primary flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    ⚖️ Legal Analysis
                  </>
                )}
              </button>
            )}
            
            {/* Summarize button - only for single documents */}
            {docId && !showComparison && (
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

        {/* Main content area */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full h-0">
          {/* Document upload section */}
          {showUpload && (
            <div className="p-4 flex-shrink-0">
              <DocumentUpload 
                onUpload={handleUpload} 
                onComparisonReady={handleComparisonReady}
                user={user} 
              />
            </div>
          )}

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Artifacts section - now inside scrollable area */}
              {(artifacts.length > 0 || comparisonArtifacts.length > 0) && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 Generated Analysis Reports</h3>
                  <div className="space-y-3">
                    {/* Regular artifacts */}
                    {artifacts.map((artifact) => (
                      <ArtifactCard
                        key={artifact.id}
                        analysis={artifact}
                        onClick={() => handleArtifactClick(artifact)}
                      />
                    ))}
                    {/* Comparison artifacts */}
                    {comparisonArtifacts.map((comparison) => (
                      <ComparisonArtifactCard
                        key={comparison.id}
                        comparison={comparison}
                        onClick={() => handleComparisonArtifactClick(comparison)}
                      />
                    ))}
                  </div>
                </div>
              )}
              
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
              
              {messages.length === 0 && !showSummary && !showComparison && (
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
            <div className="p-4 border-t bg-white flex gap-2 flex-shrink-0">
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

      {/* Artifact Panel */}
      {(selectedArtifact || selectedComparison) && (
        <ArtifactPanel
          analysis={selectedArtifact || undefined}
          comparison={selectedComparison || undefined}
          isOpen={showArtifactPanel}
          onClose={handleCloseArtifactPanel}
          onDownloadPDF={handleDownloadPDF}
        />
      )}
    </div>
  );
}