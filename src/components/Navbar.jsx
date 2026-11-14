'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useSyncExternalStore } from 'react';
import { useEffect, useState } from 'react';
import { useTheme } from '@/components/Providers';
import { getNavigationLinks } from '@/lib/navigation.mjs';

const subscribeToNothing = () => () => {};
const getClientReady = () => true;
const getServerReady = () => false;

export default function Navbar() {
    const themeReady = useSyncExternalStore(subscribeToNothing, getClientReady, getServerReady);
    const { data: session } = useSession();
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();
    const [unread, setUnread] = useState(0);
    const roles = session?.user?.roles || [];
    const links = session ? getNavigationLinks(roles) : [];
    const themeLabel = themeReady ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme` : 'Change appearance';
    const themeIcon = themeReady ? (theme === 'dark' ? '☼' : '◐') : '◐';
    const themeText = themeReady ? (theme === 'dark' ? 'Light' : 'Dark') : 'Theme';

    useEffect(() => {
        if (!session) return undefined;
        let active = true;
        async function refresh() {
            try {
                const response = await fetch('/api/notifications?limit=1');
                if (response.ok) {
                    const data = await response.json();
                    if (active) setUnread(data.unread || 0);
                }
            } catch { /* The notification page has its own retry state. */ }
        }
        refresh();
        const timer = setInterval(refresh, 60000);
        return () => { active = false; clearInterval(timer); };
    }, [session]);

    return (
        <header className="sticky top-0 z-30 border-b border-rule bg-sheet/90 backdrop-blur-xl">
            <nav className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex shrink-0 items-center gap-2.5 text-[17px] font-bold tracking-tight">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pencil text-sm font-bold text-white" aria-hidden="true">P</span>
                    <span>Peer <span className="text-pencil">Doubt</span></span>
                </Link>

                {session ? (
                    <>
                        <div className="ml-3 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm sm:ml-5 sm:gap-2">
                            {links.map((l) => {
                                const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
                                return <Link
                                    key={l.href}
                                    href={l.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`shrink-0 rounded-lg px-3 py-2 transition-colors ${active
                                        ? 'bg-marker font-semibold text-ink'
                                        : 'text-graphite hover:bg-paper hover:text-ink'
                                        }`}
                                >
                                    {l.label}{l.href === '/notifications' && unread > 0 && <span aria-label={`${unread} unread`} className="ml-1 rounded-full bg-pencil px-1.5 py-0.5 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}
                                </Link>;
                            })}
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-2 text-sm sm:gap-3">
                            <button type="button" className="btn-quiet min-h-9 px-2.5 text-xs" onClick={toggleTheme} aria-label={themeLabel} title="Change appearance">
                                <span aria-hidden="true">{themeIcon}</span>
                                <span className="hidden sm:inline">{themeText}</span>
                            </button>
                            <span className="hidden max-w-28 truncate text-graphite lg:inline">{session.user.name}</span>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="rounded-lg px-2 py-2 font-medium text-graphite transition hover:bg-paper hover:text-ink"
                            >
                                <span className="hidden sm:inline">Log out</span><span className="sm:hidden">Exit</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="ml-auto flex items-center gap-2 text-sm sm:gap-3">
                        <button type="button" className="btn-quiet min-h-9 px-2.5 text-xs" onClick={toggleTheme} aria-label={themeLabel}>
                            <span aria-hidden="true">{themeIcon}</span><span className="hidden sm:inline">{themeText}</span>
                        </button>
                        <Link href="/login" className="rounded-lg px-3 py-2 font-medium hover:bg-paper">Log in</Link>
                        <Link href="/register" className="btn-primary min-h-9 px-3 text-xs sm:text-sm">Create account</Link>
                    </div>
                )}
            </nav>
        </header>
    );
}
