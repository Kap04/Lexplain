import Link from 'next/link';

export default function Home() {
  return (
    <div style={{maxWidth:600,margin:'40px auto',padding:24}}>
      <h1>Lexplain</h1>
      <p>Upload a legal document to get a plain-English summary and ask questions. <b>This is not legal advice.</b></p>
      <Link href="/upload">
        <button style={{padding:'12px 24px',fontSize:18,marginTop:24}}>Get Started</button>
      </Link>
    </div>
  );
}
