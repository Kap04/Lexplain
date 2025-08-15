# Lexplain MVP Demo Script

## 1. Sign Up / Sign In
- Go to the landing page.
- Sign up or sign in with email or Google (Firebase Auth).

## 2. Upload Document
- Click 'Upload Document'.
- Select a sample PDF (e.g., rental_agreement.pdf).
- Consent to disclaimer and upload.

## 3. Processing
- Wait for processing spinner (OCR, chunking, embedding, summary generation).
- On completion, see summary page.

## 4. View Summary & Highlights
- See 4–6 bullet summary.
- See highlighted clauses with paraphrase and page numbers.
- Click a clause to view source text.

## 5. Q&A
- Ask: "What is my penalty if I cancel early?"
- See answer with cited page and quoted snippet.

## 6. Export
- Click 'Export as PDF' to download summary and highlights.

## 7. Audit
- Check Firestore for query and summary logs.

---
**Disclaimer:** This tool provides informational summaries only, not legal advice. Always show this in the UI and on exports.
