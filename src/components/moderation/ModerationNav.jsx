'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
    { href: '/moderation', label: 'Overview' },
    { href: '/moderation/answers', label: 'Answer review' },
    { href: '/moderation/duplicates', label: 'Duplicate doubts' },
    { href: '/moderation/reports', label: 'Reports' },
    { href: '/moderation/history', label: 'History' },
];

export default function ModerationNav() {
    const pathname = usePathname();
    return (
        <nav aria-label="Moderation navigation" className="-mx-1 flex gap-1 overflow-x-auto border-b border-rule px-1 pb-3">
            {ITEMS.map((item) => {
                const active = item.href === '/moderation' ? pathname === item.href : pathname.startsWith(item.href);
                return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
                    className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? 'bg-ink text-paper' : 'text-graphite hover:bg-sheet hover:text-ink'}`}>
                    {item.label}
                </Link>;
            })}
        </nav>
    );
}
