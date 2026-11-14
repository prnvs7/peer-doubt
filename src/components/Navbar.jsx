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

function Icon({ name, size = 16 }) {
    const common = {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
    };

    const paths = {
        inbox: <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" /><path d="M4 14h4l1.5 2h5L16 14h4" /></>,
        plus: <><circle cx="12" cy="12" r="8.25" /><path d="M12 8v8M8 12h8" /></>,
        users: <><path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20" /><circle cx="10" cy="8" r="3" /><path d="M16 4.8a3 3 0 0 1 0 5.8M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35" /></>,
        book: <><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z" /><path d="M5 4.5v17M9 6h7M9 10h7" /></>,
        bookmark: <path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.5L6 21z" />,
        bell: <><path d="M18 9.5a6 6 0 0 0-12 0c0 7-3 7-3 8.5h18c0-1.5-3-1.5-3-8.5z" /><path d="M10 21h4" /></>,
        sparkles: <><path d="m12 3 1.1 3.9L17 8l-3.9 1.1L12 13l-1.1-3.9L7 8l3.9-1.1z" /><path d="m19 14 .6 2.4L22 17l-2.4.6L19 20l-.6-2.4L16 17l2.4-.6z" /></>,
        shield: <><path d="M12 3 19 6v5c0 4.7-2.9 8-7 10-4.1-2-7-5.3-7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
        chevron: <path d="m7 10 5 5 5-5" />,
        sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2M12 20v2M4.93 4.93l1.4 1.4M17.67 17.67l1.4 1.4M2 12h2M20 12h2M4.93 19.07l1.4-1.4M17.67 6.33l1.4-1.4" /></>,
        moon: <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2z" />,
    };

    return <svg {...common}>{paths[name] || paths.inbox}</svg>;
}

const navIcons = {
    '/doubts/mine': 'inbox',
    '/doubts/new': 'plus',
    '/helper': 'users',
    '/helper/profile': 'sparkles',
    '/knowledge': 'book',
    '/knowledge/saved': 'bookmark',
    '/moderation': 'shield',
    '/admin/users': 'users',
};

export default function Navbar() {
    const themeReady = useSyncExternalStore(subscribeToNothing, getClientReady, getServerReady);
    const { data: session } = useSession();
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();
    const [unread, setUnread] = useState(0);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const roles = session?.user?.roles || [];
    const links = session ? getNavigationLinks(roles) : [];
    const themeLabel = themeReady ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme` : 'Change appearance';
    const themeIcon = themeReady ? (theme === 'dark' ? 'sun' : 'moon') : 'moon';
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
        <header className="app-navbar sticky top-0 z-30">
            <nav className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex shrink-0 items-center gap-2.5 text-[17px] font-bold tracking-tight">
                    <span className="brand-mark flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold text-white shadow-[0_5px_12px_rgba(59,102,219,0.2)]" aria-hidden="true">uS</span>
                    <span aria-label="unStuck"><span className="brand-wordmark-un">un</span><span className="brand-wordmark-stuck font-bold">Stuck</span></span>
                </Link>

                {session ? (
                    <>
                        <div className="ml-3 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm sm:ml-5 sm:gap-2">
                            {links.filter((l) => l.href !== '/notifications').map((l) => {
                                const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
                                return <Link
                                    key={l.href}
                                    href={l.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`nav-link shrink-0 rounded-lg px-3.5 py-1.5 transition-colors ${active
                                        ? 'nav-link-active border border-indigo-500/15 bg-marker font-semibold text-ink'
                                        : 'border border-transparent text-graphite hover:bg-paper hover:text-ink'
                                        }`}
                                >
                                    <span className="inline-flex items-center gap-1.5"><Icon name={navIcons[l.href]} />{l.label}</span>
                                </Link>;
                            })}
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-1.5 text-sm sm:gap-2">
                            <Link href="/notifications" className="nav-icon-button relative" aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`} title="Notifications">
                                <Icon name="bell" />
                                {unread > 0 && <span aria-hidden="true" className="notification-dot">{unread > 99 ? '99+' : unread}</span>}
                            </Link>
                            <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={themeLabel} title="Change appearance">
                                <Icon name={themeIcon} />
                                <span className="hidden sm:inline">{themeText}</span>
                            </button>
                            <div className="relative">
                                <button type="button" className="user-chip" onClick={() => setUserMenuOpen((open) => !open)} aria-expanded={userMenuOpen} aria-haspopup="menu">
                                    <span className="user-avatar" aria-hidden="true">{(session.user.name || session.user.email || 'R').slice(0, 1).toUpperCase()}</span>
                                    <span className="hidden max-w-24 truncate sm:inline">{session.user.name || 'Ravi'}</span>
                                    <Icon name="chevron" size={14} />
                                </button>
                                {userMenuOpen && <div className="user-menu" role="menu">
                                    <div className="border-b border-rule px-3 py-2">
                                        <p className="text-xs font-semibold text-ink">Signed in as</p>
                                        <p className="mt-0.5 max-w-44 truncate text-xs text-graphite">{session.user.email || session.user.name}</p>
                                    </div>
                                    <button type="button" role="menuitem" className="user-menu-item" onClick={() => signOut({ callbackUrl: '/login' })}>
                                        <span>Log out</span><span aria-hidden="true">↗</span>
                                    </button>
                                </div>}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="ml-auto flex items-center gap-2 text-sm sm:gap-3">
                        <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={themeLabel}>
                            <Icon name={themeIcon} /><span className="hidden sm:inline">{themeText}</span>
                        </button>
                        <Link href="/login" className="rounded-lg px-3 py-2 font-medium hover:bg-paper">Log in</Link>
                        <Link href="/register" className="btn-primary min-h-9 px-3 text-xs sm:text-sm">Create account</Link>
                    </div>
                )}
            </nav>
        </header>
    );
}
