import { ComparisonData } from "../components/ComparisonArtifactCard";

// Demo comparison artifact data structure for reference
export const demoComparisonData: ComparisonData = {
  id: "comp-demo-1",
  documents: [
    { id: "doc1", name: "Service Agreement v1.pdf" },
    { id: "doc2", name: "Service Agreement v2.pdf" }
  ],
  highRiskClauses: 3,
  missingClauses: 2,
  overallAssessment: "Document 2 shows improved liability limitations and clearer termination clauses compared to Document 1. However, Document 1 has better payment protection terms.",
  clauseDifferences: [
    {
      clause: "Liability Limitation",
      difference: "Document 1 caps liability at $10,000 while Document 2 caps at $50,000",
      severity: "high",
      impact: "Document 2 provides better protection for service provider but higher risk for client"
    },
    {
      clause: "Termination Notice",
      difference: "Document 1 requires 30 days notice, Document 2 requires only 15 days",
      severity: "medium", 
      impact: "Document 2 provides more flexibility but less stability"
    }
  ],
  recommendations: [
    "Consider adopting the liability cap structure from Document 2 with a middle-ground amount",
    "Implement the clearer termination language from Document 2 but with 30-day notice period",
    "Add the payment protection clauses from Document 1 to Document 2"
  ]
};
