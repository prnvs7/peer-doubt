const COLORS = {
    OPEN: 'bg-yellow-100 text-yellow-800',
    CLAIMED: 'bg-blue-100 text-blue-800',
    ANSWERED: 'bg-purple-100 text-purple-800',
    VERIFIED: 'bg-green-100 text-green-800',
    DUPLICATE: 'bg-gray-200 text-gray-700',
    REJECTED: 'bg-red-100 text-red-800',
};

export default function StatusBadge({ status }) {
    return (
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${COLORS[status]}`}>
            {status}
        </span>
    );
}