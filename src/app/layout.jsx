import './globals.css';
import { Bricolage_Grotesque, Source_Serif_4 } from 'next/font/google';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';

const ui = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-ui' });
const read = Source_Serif_4({ subsets: ['latin'], variable: '--font-read' });

export const metadata = { title: 'Peer Doubt' };

export default function RootLayout({ children }) {
    return (
        <html lang="en" className={`${ui.variable} ${read.variable}`}>
            <body className="font-sans antialiased">
                <Providers>
                    <Navbar />
                    <main>{children}</main>
                </Providers>
            </body>
        </html>
    );
}