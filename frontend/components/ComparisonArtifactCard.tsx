// components/ComparisonArtifactCard.tsx
"use client";
import React from "react";
import { Scale, FileText, AlertTriangle, Users } from "lucide-react";
import RiskMeter from "./RiskMeter";

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
      className="w-full bg-white border-2 border-blue-200 rounded-lg p-3 cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-blue-300"
    >
      <div className="flex items-center gap-4">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Scale className="text-blue-600" size={18} />
              <span className="font-medium text-gray-900 text-sm">Document Comparison</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 bg-red-50 text-red-600 font-medium rounded-full">{comparison.highRiskClauses} High Risk</span>
              <span className="px-2 py-1 bg-orange-50 text-orange-600 font-medium rounded-full">{comparison.missingClauses} Missing</span>
            </div>
          </div>

          {/* Documents List */}
          <div className="mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              {comparison.documents.slice(0, 2).map((doc, index) => (
                <div key={doc.id} className="flex items-center gap-1">
                  <FileText size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-700">{doc.name}</span>
                  {index < comparison.documents.length - 1 && <span className="text-gray-400">vs</span>}
                </div>
              ))}
              {comparison.documents.length > 2 && (
                <span className="text-xs text-gray-500">+{comparison.documents.length - 2} more</span>
              )}
            </div>
          </div>

          {/* Summary */}
          <p className="text-xs text-gray-600 line-clamp-1">
            {comparison.overallAssessment}
          </p>
        </div>
        
        {/* Risk Meter on the right */}
        <div className="flex-shrink-0">
          <RiskMeter 
            riskScore={Math.min(100, (comparison.highRiskClauses * 15) + (comparison.missingClauses * 10))} 
            size="small" 
            showLabel={false}
            showScore={true}
          />
        </div>
      </div>
    </div>
  );
}
