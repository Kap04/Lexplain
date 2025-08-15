import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lexplain',
  description: 'Legal document summarization and Q&A (not legal advice)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main>{children}</main>
        <footer style={{textAlign:'center',marginTop:32,fontSize:12}}>
          <hr />
          <div style={{color:'#888'}}>This tool provides informational summaries only, not legal advice.</div>
        </footer>
      </body>
    </html>
  );
}
