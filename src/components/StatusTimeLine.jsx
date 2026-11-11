const STEPS = ['OPEN', 'CLAIMED', 'ANSWERED', 'VERIFIED'];

export default function StatusTimeline({ status }) {
    const current = STEPS.indexOf(status);
    return (
        <ol className="flex items-center gap-2 text-sm">
            {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded ${i <= current ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {s}
                    </span>
                    {i < STEPS.length - 1 && <span className="text-gray-400">→</span>}
                </li>
            ))}
        </ol>
    );
}