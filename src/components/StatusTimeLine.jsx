import StatusBadge from '@/components/StatusBadge';

const STEPS = [
    { key: 'OPEN', label: 'Open' },
    { key: 'CLAIMED', label: 'Being answered' },
    { key: 'ANSWERED', label: 'Answered' },
    { key: 'VERIFIED', label: 'Verified' },
];

export default function StatusTimeline({ status }) {
    const current = STEPS.findIndex((s) => s.key === status);

    if (current < 0) {
        return <div className="flex flex-wrap items-center gap-2 rounded-lg bg-paper px-3 py-2 text-sm" aria-label="Doubt progress">
            <span className="font-semibold">Question status</span>
            <StatusBadge status={status} />
        </div>;
    }

    return (
        <ol className="flex items-start" aria-label="Doubt progress">
            {STEPS.map((s, i) => {
                const reached = i <= current;
                const isCurrent = i === current;
                const fill = s.key === 'VERIFIED' ? 'bg-verified border-verified' : 'bg-ink border-ink';
                return (
                    <li
                        key={s.key}
                        aria-current={isCurrent ? 'step' : undefined}
                        className="relative flex-1 text-sm"
                    >
                        {i > 0 && (
                            <span
                                aria-hidden="true"
                                className={`absolute left-[-50%] right-1/2 top-[7px] h-0.5 ${i <= current ? 'bg-ink' : 'bg-rule'}`}
                            />
                        )}
                        <span
                            aria-hidden="true"
                                className={`relative z-[1] mx-auto block h-4 w-4 rounded-full border-2 ${reached ? fill : 'border-rule bg-sheet'
                                } ${isCurrent ? 'ring-4 ring-ink/15' : ''}`}
                        />
                        <span className={`mt-2 block text-center ${isCurrent ? 'font-medium' : 'text-graphite'}`}>
                            {s.label}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}
