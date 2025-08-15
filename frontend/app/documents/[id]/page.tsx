import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function DocumentView() {
  const params = useParams();
  const id = params?.id as string;
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/documents/${id}/summary`, { credentials: 'include' })
      .then(r => r.json())
      .then(setSummary)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div>Loading summary...</div>;
  if (!summary) return <div>No summary found.</div>;

  return (
    <div style={{maxWidth:700,margin:'40px auto',padding:24}}>
      <h2>Summary</h2>
      <ul>
        {summary.bullets?.map((b:string,i:number) => <li key={i}>{b}</li>)}
      </ul>
      <h3>Risks</h3>
      <ul>
        {summary.risks?.map((r:any,i:number) => <li key={i}>{r.label}: {r.explanation} (Source: page {r.source?.page})</li>)}
      </ul>
      <h3>Highlights</h3>
      <ul>
        {summary.highlights?.map((h:any,i:number) => <li key={i}>{h.text} (Page {h.page})</li>)}
      </ul>
    </div>
  );
}
