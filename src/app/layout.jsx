import './globals.css';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';

export const metadata = { title: 'Peer Doubt' };

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className="bg-gray-50 text-gray-900">
                <Providers>
                    <Navbar />
                    <main className="max-w-3xl mx-auto p-4">{children}</main>
                </Providers>
            </body>
        </html>
    );
}