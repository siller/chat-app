import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'n8n Chat App',
  description: 'Chat mit deinem n8n-Bot',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>
        {children}
      </body>
    </html>
  );
}
