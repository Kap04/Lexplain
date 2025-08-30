// components/ArtifactCard.tsx
"use client";
import React from "react";
import { FileText, AlertTriangle, CheckCircle, Download } from "lucide-react";
import RiskMeter from "./RiskMeter";

export interface LegalAnalysisData {
  id: string;
  summary: string;
  jurisdiction?: {
    detected: string;
    confidence: "high" | "medium" | "low";
    applicable_laws: string[];
    recent_changes: string[];
  };
  clauseCategories: ClauseCategory[];
  riskAnalysis: RiskAnalysis;
  legalQuestions: string[];
  searchInsights?: string[];
  overallRiskScore: number;
  documentId: string;
  documentName: string;
}

export interface ClauseCategory {
  category: string;
  clauses: string[];
  riskLevel: "low" | "medium" | "high";
  jurisdictionNotes?: string;
}

export interface RiskAnalysis {
  overallRisk: "low" | "medium" | "high";
  riskScore: number;
  highRiskClauses: {
    clause: string;
    risk: string;
    impact: string;
    jurisdictionSpecific?: string;
  }[];
  complianceIssues?: string[];
}

interface ArtifactCardProps {
  analysis: LegalAnalysisData;
  onClick: () => void;
}

export default function ArtifactCard({ analysis, onClick }: ArtifactCardProps) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "text-green-600 bg-green-50";
      case "medium": return "text-yellow-600 bg-yellow-50";
      case "high": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
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

  return (
    <div 
      className="w-full border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header with title and risk badge */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <FileText className="text-blue-600" size={18} />
              <h3 className="font-medium text-gray-900 text-sm">📋 Legal Analysis Report</h3>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getRiskColor(analysis.riskAnalysis.overallRisk)}`}>
              {getRiskIcon(analysis.riskAnalysis.overallRisk)}
              {analysis.riskAnalysis.overallRisk.toUpperCase()} RISK
            </div>
          </div>
          
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {analysis.summary.substring(0, 150)}...
          </p>
          
          <div className="text-xs text-gray-400">
            Click to view full analysis and download PDF
          </div>
        </div>
        
        {/* Risk Meter on the right */}
        <div className="flex-shrink-0">
          <RiskMeter 
            riskScore={analysis.riskAnalysis.riskScore} 
            size="small" 
            showLabel={false}
            showScore={true}
          />
        </div>
      </div>
    </div>
  );
}
