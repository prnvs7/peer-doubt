import './globals.css';
import { Suspense } from 'react';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';

export const metadata = {
    title: { default: 'unStuck · Stuck at Question Three', template: '%s · unStuck' },
    description: 'unStuck gives students a clearer place to ask, explain and preserve class knowledge.',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{
                    __html: "try{var t=localStorage.getItem('unstuck-theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){}",
                }} />
            </head>
            <body className="font-sans antialiased">
                <Providers>
                    <Suspense fallback={<div className="h-16 border-b border-rule bg-sheet" aria-hidden="true" />}>
                        <Navbar />
                    </Suspense>
                    <main>{children}</main>
                </Providers>
            </body>
        </html>
    );
}
