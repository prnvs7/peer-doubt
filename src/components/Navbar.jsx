'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

const LINKS = [
    { href: '/doubts/mine', label: 'My doubts' },
    { href: '/doubts/new', label: 'Ask a doubt' },
];

export default function Navbar() {
    const { data: session } = useSession();
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-10 border-b border-rule bg-sheet/90 backdrop-blur">
            <nav className="mx-auto flex h-14 max-w-4xl items-center gap-6 px-5">
                <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <span className="h-5 w-[3px] bg-margin" aria-hidden="true" />
                    Peer Doubt
                </Link>

                {session ? (
                    <>
                        <div className="flex h-full items-stretch gap-5 text-[15px]">
                            {LINKS.map((l) => (
                                <Link
                                    key={l.href}
                                    href={l.href}
                                    className={`flex items-center border-b-2 ${pathname === l.href
                                            ? 'border-ink font-medium'
                                            : 'border-transparent text-graphite hover:text-ink'
                                        }`}
                                >
                                    {l.label}
                                </Link>
                            ))}
                        </div>
                        <div className="ml-auto flex items-center gap-4 text-sm">
                            <span className="text-graphite">{session.user.name}</span>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="underline underline-offset-4 hover:text-margin"
                            >
                                Log out
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="ml-auto flex items-center gap-3 text-[15px]">
                        <Link href="/login" className="hover:underline underline-offset-4">Log in</Link>
                        <Link href="/register" className="btn">Create account</Link>
                    </div>
                )}
            </nav>
        </header>
    );
}