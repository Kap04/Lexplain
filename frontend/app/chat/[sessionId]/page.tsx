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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  
  // Document processing status
  const [documentStatus, setDocumentStatus] = useState<'processing' | 'ready' | 'error'>('processing');
  const [processingMessage, setProcessingMessage] = useState('Starting document analysis...');
  
  // Comparison processing status
  const [comparisonStatus, setComparisonStatus] = useState<'processing' | 'ready' | 'error'>('processing');
  const [comparisonMessage, setComparisonMessage] = useState('Preparing document comparison...');
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  
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

  // Function to check document status via HTTP (fallback)
  const checkDocumentStatus = async (documentId: string) => {
    if (!user) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/${documentId}/status`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      
      if (response.ok) {
        const statusData = await response.json();
        console.log('📊 HTTP status check result:', statusData);
        
        if (statusData.status === 'processed' || statusData.status === 'ready') {
          console.log('✅ Document is ready! (via HTTP check)');
          setDocumentStatus('ready');
          setProcessingMessage('Document analysis complete! Ready for legal insights.');
        } else if (statusData.status === 'error' || statusData.status === 'failed') {
          console.log('❌ Document has error! (via HTTP check)');
          setDocumentStatus('error');
          setProcessingMessage('Error processing document. Please try again.');
        } else {
          console.log('🔄 Document still processing... (via HTTP check)');
          setDocumentStatus('processing');
          setProcessingMessage(statusData.message || 'Processing document...');
        }
      }
    } catch (error) {
      console.error('❌ Error checking document status:', error);
    }
  };

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
          
          // Set initial document status - assume processing if document exists but no explicit status
          if (data.documentId) {
            setDocumentStatus('processing');
            setProcessingMessage('Starting document analysis...');
            
            // Also try to get current document status via HTTP
            checkDocumentStatus(data.documentId);
          }
          
          // Check if this is a comparison session
          if (data.type === "comparison" && data.document_ids) {
            setComparisonDocuments(data.document_ids);
            setShowComparison(true);
            
            // Initialize comparison status
            setComparisonStatus('processing');
            setComparisonMessage(`Preparing to compare ${data.document_ids.length} documents...`);
            
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

  // WebSocket connection for document processing status
  useEffect(() => {
    if (!docId) return;
    
    const connectWebSocket = () => {
      const wsUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL?.replace('http', 'ws')}/ws/${docId}`;
      console.log('🔌 Connecting WebSocket to:', wsUrl);
      console.log('📄 Document ID:', docId);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('🔄 WebSocket message received:', data);
          console.log('📊 Current document status:', documentStatus);
          
          if (data.type === 'status_update') {
            // Update processing message first
            if (data.message) {
              setProcessingMessage(data.message);
              console.log('💬 Updated processing message:', data.message);
            }
            
            // Handle status changes
            console.log('🎯 Checking status:', data.status);
            
            if (data.status === 'complete' || data.status === 'processed' || data.status === 'ready') {
              console.log('✅ Document processing completed! Updating status to ready');
              setDocumentStatus('ready');
              setProcessingMessage('Document analysis complete! Ready for legal insights.');
            } else if (data.status === 'error' || data.status === 'failed') {
              console.log('❌ Document processing failed! Updating status to error');
              setDocumentStatus('error');
              setProcessingMessage('Error processing document. Please try again.');
            } else if (data.status === 'processing' || data.status === 'analyzing') {
              console.log('🔄 Document still processing...');
              setDocumentStatus('processing');
              // Keep the message from the server, or use default
              if (!data.message) {
                setProcessingMessage('Processing document...');
              }
            }
          } else {
            console.log('🔍 Non-status message:', data);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully for document:', docId);
        console.log('🔗 WebSocket URL:', wsUrl);
      };
      
      ws.onclose = (event) => {
        console.log('❌ WebSocket disconnected:', event.code, event.reason);
        console.log('🔄 Current document status during close:', documentStatus);
        // Auto-retry connection after 3 seconds if document is still processing
        if (documentStatus === 'processing') {
          console.log('🔄 Will retry WebSocket connection in 3 seconds...');
          setTimeout(connectWebSocket, 3000);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.log('🔗 Failed WebSocket URL:', wsUrl);
      };
      
      return ws;
    };
    
    const ws = connectWebSocket();
    
    return () => {
      ws.close();
    };
  }, [docId, documentStatus]);

  // Backup polling mechanism in case WebSocket fails
  useEffect(() => {
    if (!docId || documentStatus !== 'processing') return;
    
    const pollInterval = setInterval(() => {
      console.log('🔄 Polling document status as backup...');
      checkDocumentStatus(docId);
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(pollInterval);
  }, [docId, documentStatus, user]);

  // Debug document status changes
  useEffect(() => {
    console.log('📊 Document status changed to:', documentStatus);
    console.log('💬 Processing message:', processingMessage);
  }, [documentStatus, processingMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  const handleSignIn = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const handleSend = async () => {
    if (!input.trim() || !docId || !user || isStreaming) return;
    
    const messageText = input.trim();
    setInput("");
    setIsStreaming(true);
    setStreamingMessage("");
    
    // Add user message immediately
    const userMessage = { role: "user", text: messageText };
    setMessages(prev => [...prev, userMessage]);
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/session/${sessionId}/message/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ text: messageText }),
      });
      
      if (!response.ok) throw new Error('Streaming failed');
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'ai_chunk') {
                setStreamingMessage(data.accumulated);
              } else if (data.type === 'complete') {
                // Add final AI message
                setMessages(prev => [...prev, data.ai_message]);
                setStreamingMessage("");
                // Update session if provided
                if (data.session) {
                  setSession(data.session);
                }
              } else if (data.type === 'error') {
                console.error('Streaming error:', data.error);
                setMessages(prev => [...prev, { 
                  role: "ai", 
                  text: "Sorry, I encountered an error processing your request." 
                }]);
                setStreamingMessage("");
              }
            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: "ai", 
        text: "Sorry, I encountered an error processing your request." 
      }]);
      setStreamingMessage("");
    } finally {
      setIsStreaming(false);
    }
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
    if (!docId || !user || documentStatus !== 'ready') return;
    
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
    
    setComparisonStatus('processing');
    setComparisonMessage(`Starting comparison analysis for ${docIds.length} documents...`);
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
          setComparisonMessage(`Documents still processing: ${comparisonData.message || 'Please wait...'}`);
          // Retry after a delay
          setTimeout(() => generateComparisonArtifact(docIds), 5000);
          return;
        }
        
        // Check if we have a complete comparison (documents and comparison fields)
        if (!comparisonData.documents || !comparisonData.comparison) {
          console.log("Incomplete comparison data received, retrying...");
          setComparisonMessage("Processing comparison analysis, please wait...");
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
        setSelectedComparison(newComparisonArtifact);
        setShowArtifactPanel(true);
        
        // Update status to complete
        setComparisonStatus('ready');
        setComparisonMessage(`✅ Comparison analysis complete! Found ${newComparisonArtifact.highRiskClauses} high-risk clauses and ${newComparisonArtifact.missingClauses} missing clauses.`);
        
      } else {
        const errorData = await res.json();
        console.error("Comparison API error:", errorData);
        if (errorData.detail?.includes("still processing")) {
          setComparisonMessage("Documents are still being processed. Retrying in 5 seconds...");
          // Retry if documents are still processing
          setTimeout(() => generateComparisonArtifact(docIds), 5000);
          return;
        }
        throw new Error(errorData.detail || "Failed to generate comparison");
      }
    } catch (error) {
      console.error("Error generating comparison artifact:", error);
      setComparisonStatus('error');
      setComparisonMessage("❌ Failed to generate document comparison. Please try again.");
      // Retry on network errors after longer delay
      setTimeout(() => {
        setComparisonMessage("Retrying comparison analysis...");
        generateComparisonArtifact(docIds);
      }, 10000);
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
    if (!docId || !user || documentStatus !== 'ready') return;
    
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
            {/* {!showComparison && (
              <button
                onClick={handleGenerateDemo}
                className="btn btn-secondary flex items-center gap-2 text-xs"
              >
                🧪 Demo Analysis
              </button>
            )} */}
            
            {/* Generate Analysis button - only for single documents */}
            {docId && !showComparison && (
              <button
                onClick={handleGenerateAnalysis}
                disabled={loading || documentStatus !== 'ready'}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing...
                  </>
                ) : documentStatus === 'processing' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing Document...
                  </>
                ) : documentStatus === 'error' ? (
                  <>
                    ❌ Document Error
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
                disabled={summaryLoading || documentStatus !== 'ready'}
                className="btn btn-outline flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {summaryLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </>
                ) : documentStatus === 'processing' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    Processing Document...
                  </>
                ) : documentStatus === 'error' ? (
                  <>
                    ❌ Document Error
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
                  <div className="text-blue-700 text-sm leading-relaxed prose prose-sm max-w-none prose-headings:text-blue-800 prose-headings:font-semibold prose-strong:text-blue-900 prose-strong:font-semibold">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Custom styling for headers with blue theme
                        h1: ({ children }) => <h1 className="text-lg font-bold text-blue-800 mb-2 border-b border-blue-200 pb-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-semibold text-blue-800 mb-2 mt-3">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold text-blue-700 mb-1 mt-2">{children}</h3>,
                        
                        // Enhanced lists with better spacing and blue icons
                        ul: ({ children }) => <ul className="space-y-1 my-2">{children}</ul>,
                        ol: ({ children }) => <ol className="space-y-1 my-2">{children}</ol>,
                        li: ({ children }) => <li className="flex items-start gap-2"><span className="text-blue-500 mt-1 text-xs">•</span><span className="flex-1">{children}</span></li>,
                        
                        // Code styling with blue theme
                        code: ({ children, ...props }) => {
                          const isInline = !props.className?.includes('language-');
                          return isInline ? 
                            <code className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs font-mono">{children}</code> :
                            <code className="block bg-blue-50 text-blue-800 p-2 rounded text-xs font-mono whitespace-pre-wrap">{children}</code>;
                        },
                        
                        // Enhanced strong/bold text with blue theme
                        strong: ({ children }) => <strong className="font-semibold text-blue-900 bg-blue-100 px-1 py-0.5 rounded">{children}</strong>,
                        
                        // Better paragraph spacing
                        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-blue-700">{children}</p>,
                        
                        // Blockquote styling with blue theme
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-300 pl-3 py-1 bg-blue-100 my-2 italic text-blue-800">{children}</blockquote>
                      }}
                    >
                      {summary}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
              
              {/* Document processing status indicator */}
              {docId && documentStatus === 'processing' && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                    <div>
                      <h3 className="font-semibold text-yellow-800">Processing Document</h3>
                      <p className="text-yellow-700 text-sm">
                        {processingMessage || 'Analyzing your document... This may take a few moments.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Document error status indicator */}
              {docId && documentStatus === 'error' && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-red-500 text-xl">❌</div>
                    <div>
                      <h3 className="font-semibold text-red-800">Document Processing Error</h3>
                      <p className="text-red-700 text-sm">
                        {processingMessage || 'There was an error processing your document. Please try uploading again.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Document ready status (subtle) */}
              {docId && documentStatus === 'ready' && messages.length === 0 && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-green-500 text-lg">✅</div>
                    <div>
                      <p className="text-green-700 text-sm">
                        Document analysis complete! Ready for legal insights. Use the buttons above to get started.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Comparison processing status indicator */}
              {showComparison && comparisonStatus === 'processing' && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <div>
                      <h3 className="font-semibold text-blue-800">Comparing Documents</h3>
                      <p className="text-blue-700 text-sm">
                        {comparisonMessage || 'Analyzing document differences and generating comparison insights...'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Comparison error status indicator */}
              {showComparison && comparisonStatus === 'error' && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-red-500 text-xl">❌</div>
                    <div>
                      <h3 className="font-semibold text-red-800">Comparison Error</h3>
                      <p className="text-red-700 text-sm">
                        {comparisonMessage || 'There was an error generating the document comparison. Please try again.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Comparison ready status */}
              {showComparison && comparisonStatus === 'ready' && comparisonArtifacts.length > 0 && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-green-500 text-lg">✅</div>
                    <div>
                      <p className="text-green-700 text-sm">
                        {comparisonMessage || 'Document comparison complete! Check the insights panel for detailed analysis.'}
                      </p>
                    </div>
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
                  {msg.role === "user" ? (
                    msg.text
                  ) : (
                    <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-headings:font-semibold prose-strong:text-gray-900 prose-strong:font-semibold">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Custom styling for headers
                          h1: ({ children }) => <h1 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-semibold text-gray-800 mb-2 mt-3">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-700 mb-1 mt-2">{children}</h3>,
                          
                          // Enhanced lists with better spacing and icons
                          ul: ({ children }) => <ul className="space-y-1 my-2">{children}</ul>,
                          ol: ({ children }) => <ol className="space-y-1 my-2">{children}</ol>,
                          li: ({ children }) => <li className="flex items-start gap-2"><span className="text-blue-500 mt-1 text-xs">•</span><span className="flex-1">{children}</span></li>,
                          
                          // Code styling
                          code: ({ children, ...props }) => {
                            const isInline = !props.className?.includes('language-');
                            return isInline ? 
                              <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">{children}</code> :
                              <code className="block bg-gray-50 text-gray-800 p-2 rounded text-xs font-mono whitespace-pre-wrap">{children}</code>;
                          },
                          
                          // Enhanced strong/bold text
                          strong: ({ children }) => <strong className="font-semibold text-gray-900 bg-yellow-50 px-1 py-0.5 rounded">{children}</strong>,
                          
                          // Better paragraph spacing
                          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                          
                          // Table styling (if needed)
                          table: ({ children }) => <table className="min-w-full border-collapse border border-gray-200 my-2">{children}</table>,
                          th: ({ children }) => <th className="border border-gray-200 px-2 py-1 bg-gray-50 font-semibold text-xs">{children}</th>,
                          td: ({ children }) => <td className="border border-gray-200 px-2 py-1 text-xs">{children}</td>,
                          
                          // Blockquote styling
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-200 pl-3 py-1 bg-blue-50 my-2 italic text-gray-700">{children}</blockquote>
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Streaming message */}
              {isStreaming && streamingMessage && (
                <div className="bubble bubble-ai mr-auto">
                  <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-headings:font-semibold prose-strong:text-gray-900 prose-strong:font-semibold">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Custom styling for headers
                        h1: ({ children }) => <h1 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-semibold text-gray-800 mb-2 mt-3">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-700 mb-1 mt-2">{children}</h3>,
                        
                        // Enhanced lists with better spacing and icons
                        ul: ({ children }) => <ul className="space-y-1 my-2">{children}</ul>,
                        ol: ({ children }) => <ol className="space-y-1 my-2">{children}</ol>,
                        li: ({ children }) => <li className="flex items-start gap-2"><span className="text-blue-500 mt-1 text-xs">•</span><span className="flex-1">{children}</span></li>,
                        
                        // Code styling
                        code: ({ children, ...props }) => {
                          const isInline = !props.className?.includes('language-');
                          return isInline ? 
                            <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">{children}</code> :
                            <code className="block bg-gray-50 text-gray-800 p-2 rounded text-xs font-mono whitespace-pre-wrap">{children}</code>;
                        },
                        
                        // Enhanced strong/bold text
                        strong: ({ children }) => <strong className="font-semibold text-gray-900 bg-yellow-50 px-1 py-0.5 rounded">{children}</strong>,
                        
                        // Better paragraph spacing
                        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                        
                        // Table styling (if needed)
                        table: ({ children }) => <table className="min-w-full border-collapse border border-gray-200 my-2">{children}</table>,
                        th: ({ children }) => <th className="border border-gray-200 px-2 py-1 bg-gray-50 font-semibold text-xs">{children}</th>,
                        td: ({ children }) => <td className="border border-gray-200 px-2 py-1 text-xs">{children}</td>,
                        
                        // Blockquote styling
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-200 pl-3 py-1 bg-blue-50 my-2 italic text-gray-700">{children}</blockquote>
                      }}
                    >
                      {streamingMessage}
                    </ReactMarkdown>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    Typing...
                  </div>
                </div>
              )}
              
              {/* Streaming indicator without message */}
              {isStreaming && !streamingMessage && (
                <div className="bubble bubble-ai mr-auto">
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    AI is thinking...
                  </div>
                </div>
              )}
              
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
                disabled={!docId || loading || isStreaming}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                disabled={!docId || !input.trim() || loading || isStreaming}
                className="btn btn-primary"
              >
                {isStreaming ? "AI is typing..." : loading ? "Sending..." : "Send"}
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