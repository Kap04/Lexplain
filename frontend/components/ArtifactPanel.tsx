// components/ArtifactPanel.tsx
"use client";
import React from "react";
import { X, Download, AlertTriangle, CheckCircle, FileText, Scale, Users, TrendingUp } from "lucide-react";
import { LegalAnalysisData } from "./ArtifactCard";
import { ComparisonData } from "./ComparisonArtifactCard";
import RiskMeter from "./RiskMeter";

interface ArtifactPanelProps {
  analysis?: LegalAnalysisData;
  comparison?: ComparisonData;
  isOpen: boolean;
  onClose: () => void;
  onDownloadPDF: () => void;
}

export default function ArtifactPanel({ analysis, comparison, isOpen, onClose, onDownloadPDF }: ArtifactPanelProps) {
  if (!isOpen) return null;

  const isComparison = !!comparison;

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

  return (
    <div className="fixed inset-y-0 right-0 w-1/2 bg-white shadow-xl border-l border-gray-200 z-50 overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {isComparison ? (
              <Scale className="text-blue-600" size={24} />
            ) : (
              <FileText className="text-blue-600" size={24} />
            )}
            <h2 className="text-xl font-bold text-gray-900">
              {isComparison ? "Document Comparison Report" : "Legal Analysis Report"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download size={16} />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Legal Analysis Content */}
        {analysis && (
          <>
            {/* Document Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Document Information</h3>
              <p className="text-sm text-gray-600">📄 {analysis.documentName}</p>
              <p className="text-sm text-gray-600">🆔 {analysis.documentId}</p>
              {analysis.jurisdiction && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-1">🌍 Jurisdiction</h4>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-blue-600">{analysis.jurisdiction.detected}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      analysis.jurisdiction.confidence === 'high' ? 'bg-green-100 text-green-700' :
                      analysis.jurisdiction.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {analysis.jurisdiction.confidence} confidence
                    </span>
                  </div>
                  {analysis.jurisdiction.applicable_laws && analysis.jurisdiction.applicable_laws.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Applicable Laws:</p>
                      <div className="flex flex-wrap gap-1">
                        {analysis.jurisdiction.applicable_laws.slice(0, 3).map((law, idx) => (
                          <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {law}
                          </span>
                        ))}
                        {analysis.jurisdiction.applicable_laws.length > 3 && (
                          <span className="text-xs text-gray-500">+{analysis.jurisdiction.applicable_laws.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Risk Assessment */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Risk Assessment</h3>
              <div className={`p-6 rounded-lg border ${getRiskColor(analysis.riskAnalysis.overallRisk)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getRiskIcon(analysis.riskAnalysis.overallRisk)}
                      <span className="font-medium">Overall Risk Level</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      This document has been assessed as <strong>{analysis.riskAnalysis.overallRisk.toUpperCase()}</strong> risk 
                      with {analysis.riskAnalysis.highRiskClauses.length} high-risk clauses identified.
                    </p>
                  </div>
                  <div className="ml-6">
                    <RiskMeter 
                      riskScore={analysis.riskAnalysis.riskScore} 
                      size="medium" 
                      showLabel={true}
                      showScore={true}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Executive Summary</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{analysis.summary}</p>
              </div>
            </div>

            {/* Clause Categories */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Clause Analysis</h3>
              <div className="space-y-4">
                {analysis.clauseCategories.map((category, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{category.category}</h4>
                      <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getRiskColor(category.riskLevel)}`}>
                        {getRiskIcon(category.riskLevel)}
                        <span>{category.riskLevel}</span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{category.category}</p>
                    <div className="space-y-2">
                      {category.clauses.map((clause, clauseIndex) => (
                        <div key={clauseIndex} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-700">{clause}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* High-Risk Clauses */}
            {analysis.riskAnalysis.highRiskClauses.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="text-red-600" size={20} />
                  High-Risk Clauses
                </h3>
                <div className="space-y-3">
                  {analysis.riskAnalysis.highRiskClauses.map((riskClause, index) => (
                    <div key={index} className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
                      <h4 className="font-medium text-red-900 mb-2">{riskClause.clause}</h4>
                      <p className="text-red-700 text-sm mb-2">{riskClause.risk}</p>
                      <p className="text-red-600 text-sm">{riskClause.impact}</p>
                      {riskClause.jurisdictionSpecific && (
                        <p className="text-red-500 text-xs mt-1">{riskClause.jurisdictionSpecific}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legal Questions */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Legal Questions</h3>
              <div className="space-y-3">
                {analysis.legalQuestions.map((question, index) => (
                  <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-900 font-medium">{question}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance Issues */}
            {analysis.riskAnalysis.complianceIssues && analysis.riskAnalysis.complianceIssues.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Compliance Issues</h3>
                <div className="space-y-3">
                  {analysis.riskAnalysis.complianceIssues.map((issue, index) => (
                    <div key={index} className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded-r-lg">
                      <p className="text-yellow-900">{issue}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Comparison Content */}
        {comparison && (
          <>
            {/* Document Comparison Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Documents Being Compared</h3>
              <div className="space-y-2">
                {comparison.documents.map((doc, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <FileText size={16} className="text-blue-600" />
                    <span className="text-sm text-gray-700">{doc.name}</span>
                    <span className="text-xs text-gray-500">({doc.id.slice(0, 8)}...)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparison Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertTriangle className="text-red-600" size={20} />
                  <span className="font-semibold text-red-900">High Risk Clauses</span>
                </div>
                <span className="text-2xl font-bold text-red-700">{comparison.highRiskClauses}</span>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="text-orange-600" size={20} />
                  <span className="font-semibold text-orange-900">Missing Clauses</span>
                </div>
                <span className="text-2xl font-bold text-orange-700">{comparison.missingClauses}</span>
              </div>
            </div>

            {/* Overall Assessment */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Overall Assessment</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{comparison.overallAssessment}</p>
              </div>
            </div>

            {/* Clause Differences */}
            {comparison.clauseDifferences && comparison.clauseDifferences.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="text-blue-600" size={20} />
                  Clause Differences
                </h3>
                <div className="space-y-4">
                  {comparison.clauseDifferences.map((diff, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{diff.clause}</h4>
                        <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getRiskColor(diff.severity)}`}>
                          {getRiskIcon(diff.severity)}
                          <span>{diff.severity}</span>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{diff.difference}</p>
                      <p className="text-gray-500 text-sm">{diff.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {comparison.recommendations && comparison.recommendations.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Recommendations</h3>
                <div className="space-y-3">
                  {comparison.recommendations.map((rec, index) => (
                    <div key={index} className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                      <p className="text-blue-900">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
