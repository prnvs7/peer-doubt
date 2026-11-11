import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Doubt from '@/models/Doubt';
import DoubtCard from '@/components/DoubtCard';

export default async function MyDoubts() {
    const session = await getServerSession(authOptions);
    await connectDB();
    const doubts = JSON.parse(
        JSON.stringify(await Doubt.find({ author: session.user.id }).sort({ createdAt: -1 }).lean())
    );

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">My Doubts</h1>
                <Link href="/doubts/new" className="bg-blue-600 text-white px-3 py-2 rounded text-sm">
                    + New doubt
                </Link>
            </div>
            {doubts.length === 0 && <p className="text-gray-500">No doubts yet. Ask your first one!</p>}
            {doubts.map((d) => <DoubtCard key={d._id} doubt={d} />)}
        </div>
    );
}