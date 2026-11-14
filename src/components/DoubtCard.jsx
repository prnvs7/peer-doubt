import Link from 'next/link';
import StatusBadge from './StatusBadge';

export default function DoubtCard({ doubt }) {
    const date = new Date(doubt.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
    });

    return (
        <li className="card overflow-hidden transition hover:border-pencil/50 hover:shadow-sm">
            <Link
                href={`/doubts/${doubt._id}`}
                className="flex items-start justify-between gap-4 p-4 focus-visible:outline-2 focus-visible:outline-pencil sm:p-5"
            >
                <div className="min-w-0">
                    <h2 className="truncate font-semibold">{doubt.title}</h2>
                    <p className="mt-0.5 text-sm text-graphite">
                        {doubt.topic} in {doubt.course}, asked {date}
                    </p>
                </div>
                <StatusBadge status={doubt.status} />
            </Link>
        </li>
    );
}
