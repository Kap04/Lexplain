"use client";
import { useState } from 'react';

export default function ChatPage() {
  const [docId, setDocId] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string|null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    setLoading(true); setAnswer(null); setSources([]);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/${docId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const data = await res.json();
      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch (e: any) {
      setAnswer('Error: ' + (e.message || 'Failed to get answer'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{maxWidth:600,margin:'40px auto',padding:24}}>
      <h2>Chat with your document</h2>
      <div style={{marginBottom:12}}>
        <input type="text" placeholder="Document ID" value={docId} onChange={e => setDocId(e.target.value)} style={{width:'100%',marginBottom:8}} />
        <input type="text" placeholder="Type your question..." value={question} onChange={e => setQuestion(e.target.value)} style={{width:'100%',marginBottom:8}} />
        <button onClick={handleAsk} disabled={loading || !docId || !question} style={{marginTop:8}}>{loading ? 'Asking...' : 'Ask'}</button>
      </div>
      {answer && <div style={{marginTop:24}}><b>Answer:</b> {answer}</div>}
      {sources.length > 0 && <div style={{marginTop:16}}>
        <b>Sources:</b>
        <ul>
          {sources.map((s,i) => <li key={i}>Page {s.page}: "{s.snippet}"</li>)}
        </ul>
      </div>}
    </div>
  );
}
