// components/ComparisonArtifactCard.tsx
"use client";
import React from "react";
import { Scale, FileText, AlertTriangle, Users } from "lucide-react";

export interface ComparisonData {
  id: string;
  documents: {
    id: string;
    name: string;
  }[];
  highRiskClauses: number;
  missingClauses: number;
  overallAssessment: string;
  clauseDifferences?: {
    clause: string;
    difference: string;
    severity: "low" | "medium" | "high";
    impact: string;
  }[];
  recommendations?: string[];
}

interface ComparisonArtifactCardProps {
  comparison: ComparisonData;
  onClick: () => void;
}

export default function ComparisonArtifactCard({ comparison, onClick }: ComparisonArtifactCardProps) {
  return (
    <div 
      onClick={onClick}
      className="min-w-[280px] bg-white border-2 border-blue-200 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-blue-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scale className="text-blue-600" size={20} />
          <span className="font-semibold text-gray-900">Document Comparison</span>
        </div>
      </div>

      {/* Documents List */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1">Documents:</p>
        <div className="space-y-1">
          {comparison.documents.slice(0, 2).map((doc, index) => (
            <div key={doc.id} className="flex items-center gap-1">
              <FileText size={12} className="text-gray-400" />
              <span className="text-xs text-gray-700 truncate">{doc.name}</span>
            </div>
          ))}
          {comparison.documents.length > 2 && (
            <p className="text-xs text-gray-500">+{comparison.documents.length - 2} more</p>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="text-center p-2 bg-red-50 rounded">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertTriangle size={14} className="text-red-600" />
            <span className="text-xs font-medium text-red-800">High Risk</span>
          </div>
          <span className="text-lg font-bold text-red-700">{comparison.highRiskClauses}</span>
        </div>
        
        <div className="text-center p-2 bg-orange-50 rounded">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users size={14} className="text-orange-600" />
            <span className="text-xs font-medium text-orange-800">Missing</span>
          </div>
          <span className="text-lg font-bold text-orange-700">{comparison.missingClauses}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="border-t pt-2">
        <p className="text-xs text-gray-600 line-clamp-2">
          {comparison.overallAssessment}
        </p>
      </div>
    </div>
  );
}
