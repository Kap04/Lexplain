// components/ComparisonDashboard.tsx
"use client";
import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { ArrowRight, AlertTriangle, CheckCircle, FileText, Download, Scale, TrendingUp } from "lucide-react";

interface ComparisonData {
  id: string;
  documents: {
    id: string;
    name: string;
    analysis: any;
  }[];
  comparison: {
    clauseDifferences: {
      category: string;
      document1: string[];
      document2: string[];
      differences: string[];
      riskComparison: {
        doc1Risk: "low" | "medium" | "high";
        doc2Risk: "low" | "medium" | "high";
        betterDocument: string;
        reasoning: string;
      };
    }[];
    overallComparison: {
      doc1Score: number;
      doc2Score: number;
      betterDocument: string;
      riskSummary: string;
    };
    missingClauses: {
      category: string;
      missingFrom: string;
      importance: "low" | "medium" | "high";
      recommendation: string;
    }[];
    recommendations: string[];
  };
}

interface ComparisonDashboardProps {
  documentIds: string[];
  user: User;
  onClose: () => void;
}

export default function ComparisonDashboard({ documentIds, user, onClose }: ComparisonDashboardProps) {
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateComparison();
  }, [documentIds]);

  const generateComparison = async () => {
    if (documentIds.length < 2) return;

    setLoading(true);
    setError(null);
    
    try {
      const idToken = await user.getIdToken();
      
      // First, check if all documents are ready
      console.log(`Checking if all ${documentIds.length} documents are ready for comparison...`);
      
      const statusChecks = await Promise.all(
        documentIds.map(async (docId) => {
          const statusRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/${docId}/status`, {
            headers: { Authorization: `Bearer ${idToken}` }
          });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            return { docId, status: statusData.status };
          }
          return { docId, status: 'unknown' };
        })
      );
      
      const readyDocs = statusChecks.filter(check => check.status === 'ready');
      const processingDocs = statusChecks.filter(check => check.status === 'processing');
      
      console.log(`Document status check: ${readyDocs.length} ready, ${processingDocs.length} still processing`);
      
      if (readyDocs.length < 2) {
        console.log(`Only ${readyDocs.length} documents ready, waiting for processing to complete...`);
        setError(`Documents are still processing. ${readyDocs.length}/${documentIds.length} ready. Please wait...`);
        
        // Retry after a delay
        setTimeout(() => {
          generateComparison();
        }, 5000);
        return;
      }
      
      console.log(`All documents ready, proceeding with comparison...`);
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/compare`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}` 
        },
        body: JSON.stringify({ document_ids: documentIds })
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`Comparison generated successfully:`, data);
        setComparisonData(data);
      } else {
        const errorText = await res.text();
        console.error(`Comparison failed:`, errorText);
        setError(`Failed to generate comparison: ${errorText}`);
      }
    } catch (e) {
      console.error("Comparison error:", e);
      setError("Error generating comparison");
    }
    setLoading(false);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "text-green-600 bg-green-50 border-green-200";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "high": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "low": return <CheckCircle size={16} />;
      case "medium": return <AlertTriangle size={16} />;
      case "high": return <AlertTriangle size={16} />;
      default: return <FileText size={16} />;
    }
  };

  const downloadComparisonPDF = async () => {
    if (!comparisonData) return;

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/comparison/export-pdf`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}` 
        },
        body: JSON.stringify(comparisonData)
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'document_comparison.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error("Error downloading comparison PDF:", e);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">Generating Comparison</h3>
          <p className="text-gray-600">Analyzing documents and comparing legal clauses...</p>
        </div>
      </div>
    );
  }

  if (error || !comparisonData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Comparison Failed</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="btn btn-primary"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Scale className="text-blue-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Document Comparison Analysis</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadComparisonPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download size={16} />
                Download Report
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Overall Comparison Summary */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <TrendingUp size={20} />
              Overall Comparison
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {comparisonData.documents.map((doc, idx) => (
                <div key={doc.id} className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-gray-900">{doc.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-blue-600">
                      {idx === 0 ? comparisonData.comparison.overallComparison.doc1Score : comparisonData.comparison.overallComparison.doc2Score}/100
                    </span>
                    <span className="text-sm text-gray-600">Risk Score</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800">
                <strong>Better Document:</strong> {comparisonData.comparison.overallComparison.betterDocument}
              </p>
              <p className="text-green-700 text-sm mt-1">
                {comparisonData.comparison.overallComparison.riskSummary}
              </p>
            </div>
          </div>

          {/* Clause-by-Clause Comparison */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Clause-by-Clause Comparison</h3>
            <div className="space-y-4">
              {comparisonData.comparison.clauseDifferences.map((clause, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{clause.category}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {comparisonData.documents[0].name}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(clause.riskComparison.doc1Risk)}`}>
                          {clause.riskComparison.doc1Risk.toUpperCase()}
                        </span>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {clause.document1.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-gray-400">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {comparisonData.documents[1].name}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(clause.riskComparison.doc2Risk)}`}>
                          {clause.riskComparison.doc2Risk.toUpperCase()}
                        </span>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {clause.document2.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-gray-400">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {clause.differences.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                      <h5 className="text-sm font-medium text-yellow-800 mb-2">Key Differences:</h5>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {clause.differences.map((diff, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <ArrowRight size={14} className="mt-0.5 flex-shrink-0" />
                            <span>{diff}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Recommendation:</strong> {clause.riskComparison.betterDocument} - {clause.riskComparison.reasoning}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Missing Clauses */}
          {comparisonData.comparison.missingClauses.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Missing Clauses</h3>
              <div className="space-y-3">
                {comparisonData.comparison.missingClauses.map((missing, index) => (
                  <div key={index} className={`border rounded-lg p-4 ${
                    missing.importance === 'high' ? 'border-red-200 bg-red-50' :
                    missing.importance === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{missing.category}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        missing.importance === 'high' ? 'text-red-600 bg-red-100' :
                        missing.importance === 'medium' ? 'text-yellow-600 bg-yellow-100' :
                        'text-gray-600 bg-gray-100'
                      }`}>
                        {missing.importance.toUpperCase()} IMPORTANCE
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Missing from:</strong> {missing.missingFrom}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Recommendation:</strong> {missing.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Overall Recommendations</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <ul className="space-y-2">
                {comparisonData.comparison.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-green-800">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              This comparison is generated by AI and should not replace professional legal advice.
              <br />
              Always consult with a qualified attorney for legal matters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
