const MAP = {
    OPEN: { label: 'Open', cls: 'bg-marker text-ink' },
    CLAIMED: { label: 'Being answered', cls: 'bg-pencil/10 text-pencil' },
    ANSWERED: { label: 'Answered', cls: 'bg-ink/10 text-ink' },
    PENDING: { label: 'Awaiting review', cls: 'bg-marker text-ink' },
    SUBMITTED: { label: 'Awaiting review', cls: 'bg-marker text-ink' },
    PENDING_REVIEW: { label: 'Awaiting review', cls: 'bg-marker text-ink' },
    ACCEPTED: { label: 'Accepted by asker', cls: 'bg-verified/10 text-verified' },
    REVISION_REQUESTED: { label: 'Correction requested', cls: 'bg-marker text-ink' },
    VERIFIED: { label: 'Verified', cls: 'bg-verified/10 text-verified' },
    RESOLVED: { label: 'Resolved', cls: 'bg-verified/10 text-verified' },
    DISMISSED: { label: 'Dismissed', cls: 'bg-rule text-graphite' },
    DUPLICATE: { label: 'Duplicate', cls: 'bg-rule text-graphite' },
    REJECTED: { label: 'Rejected', cls: 'bg-margin/10 text-margin' },
};

export default function StatusBadge({ status }) {
    const s = MAP[status] ?? MAP.OPEN;
    return (
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
            {status === 'VERIFIED' && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 6.5l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
            {s.label}
        </span>
    );
}
