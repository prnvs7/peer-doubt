import Link from 'next/link';
import StatusBadge from './StatusBadge';

export default function DoubtCard({ doubt }) {
    const date = new Date(doubt.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
    });

    return (
        <li className="border-b border-rule">
            <Link
                href={`/doubts/${doubt._id}`}
                className="flex items-start justify-between gap-4 px-2 py-4 transition-colors hover:bg-sheet focus-visible:outline-2 focus-visible:outline-pencil"
            >
                <div className="min-w-0">
                    <h2 className="truncate font-medium">{doubt.title}</h2>
                    <p className="mt-0.5 text-sm text-graphite">
                        {doubt.topic} in {doubt.course}, asked {date}
                    </p>
                </div>
                <StatusBadge status={doubt.status} />
            </Link>
        </li>
    );
}