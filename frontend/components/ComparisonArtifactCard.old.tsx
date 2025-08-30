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
  };

  const getHighRiskCount = () => {
    return comparison.comparison.clauseDifferences.filter(
      diff => diff.riskComparison.doc1Risk === 'high' || diff.riskComparison.doc2Risk === 'high'
    ).length;
  };

  const getMissingClausesCount = () => {
    return comparison.comparison.missingClauses.filter(clause => clause.importance === 'high').length;
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer p-4 min-w-[320px]"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Scale className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">
            📊 Document Comparison Report
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {comparison.documents.length} documents analyzed
          </p>
        </div>
      </div>

      {/* Documents List */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Documents Compared:</span>
        </div>
        <div className="space-y-1">
          {comparison.documents.slice(0, 2).map((doc, index) => (
            <div key={doc.id} className="flex items-center gap-2 text-xs">
              <FileText className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600 truncate">
                {index + 1}. {doc.name}
              </span>
            </div>
          ))}
          {comparison.documents.length > 2 && (
            <div className="text-xs text-gray-500 ml-5">
              +{comparison.documents.length - 2} more documents
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="w-3 h-3 text-orange-500" />
            <span className="text-xs font-medium text-gray-700">High Risk</span>
          </div>
          <div className="text-sm font-semibold text-gray-900">
            {getHighRiskCount()} clauses
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-blue-500" />
            <span className="text-xs font-medium text-gray-700">Missing</span>
          </div>
          <div className="text-sm font-semibold text-gray-900">
            {getMissingClausesCount()} clauses
          </div>
        </div>
      </div>

      {/* Overall Assessment */}
      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700">Better Document:</span>
            <span className="text-xs font-semibold text-blue-600">
              {comparison.comparison.overallComparison.betterDocument}
            </span>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getOverallRiskColor(comparison.comparison.overallComparison.betterDocument)}`}>
            {comparison.comparison.recommendations.length} recommendations
          </div>
        </div>
      </div>

      {/* Click Indicator */}
      <div className="mt-3 text-center">
        <span className="text-xs text-gray-400">Click to view detailed comparison</span>
      </div>
    </div>
  );
}
