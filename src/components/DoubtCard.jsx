import Link from 'next/link';
import StatusBadge from './StatusBadge';

export default function DoubtCard({ doubt }) {
    return (
        <Link href={`/doubts/${doubt._id}`} className="block bg-white border rounded p-4 hover:shadow">
            <div className="flex justify-between items-start gap-2">
                <h2 className="font-medium">{doubt.title}</h2>
                <StatusBadge status={doubt.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
                {doubt.course} · {doubt.topic}
                {doubt.createdAt && ` · ${new Date(doubt.createdAt).toLocaleDateString()}`}
            </p>
        </Link>
    );
}