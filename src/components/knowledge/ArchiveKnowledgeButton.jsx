'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ArchiveKnowledgeButton({ id }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function archive(event) {
        event.preventDefault(); setBusy(true); setError('');
        try {
            const response = await fetch(`/api/knowledge/${id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Could not archive this entry.');
            router.push('/knowledge');
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    }

    return <div className="space-y-2"><button type="button" className="btn-quiet text-margin" onClick={() => setOpen((value) => !value)}>{open ? 'Cancel archive' : 'Archive knowledge'}</button>{open && <form className="space-y-2 rounded-xl border border-rule bg-paper p-3" onSubmit={archive}><label className="block text-xs font-semibold">Reason<textarea className="field mt-1" minLength={3} maxLength={1000} required value={reason} onChange={(event) => setReason(event.target.value)} /></label>{error && <p className="text-xs text-margin" role="alert">{error}</p>}<button className="btn-primary" disabled={busy}>{busy ? 'Archiving…' : 'Confirm archive'}</button></form>}</div>;
}
