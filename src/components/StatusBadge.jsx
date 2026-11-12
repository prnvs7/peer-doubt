const MAP = {
    OPEN: { label: 'Open', cls: 'bg-marker/70 text-ink' },
    CLAIMED: { label: 'Being answered', cls: 'bg-pencil/10 text-pencil' },
    ANSWERED: { label: 'Answered', cls: 'bg-ink/10 text-ink' },
    VERIFIED: { label: 'Verified', cls: 'bg-verified/10 text-verified' },
    DUPLICATE: { label: 'Duplicate', cls: 'bg-rule text-graphite' },
    REJECTED: { label: 'Rejected', cls: 'bg-margin/10 text-margin' },
};

export default function StatusBadge({ status }) {
    const s = MAP[status] ?? MAP.OPEN;
    return (
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${s.cls}`}>
            {status === 'VERIFIED' && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 6.5l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
            {s.label}
        </span>
    );
}