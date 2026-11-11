'use client';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
    const { data: session } = useSession();
    return (
        <nav className="bg-white border-b px-4 py-3 flex gap-4 items-center">
            <Link href="/" className="font-bold">Peer Doubt</Link>
            {session ? (
                <>
                    <Link href="/doubts/new">Ask</Link>
                    <Link href="/doubts/mine">My Doubts</Link>
                    <span className="ml-auto text-sm text-gray-500">{session.user.name}</span>
                    <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-sm underline">
                        Logout
                    </button>
                </>
            ) : (
                <>
                    <Link href="/login" className="ml-auto">Login</Link>
                    <Link href="/register">Register</Link>
                </>
            )}
        </nav>
    );
}