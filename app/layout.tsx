import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Prompt Chain Studio', description: 'Build and run prompt chains.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

