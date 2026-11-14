'use client';
import { useState } from 'react';

export default function KnowledgeSaveButton({ id, saved = false, onChange }) {
    const [isSaved, setSaved] = useState(saved);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function toggle() {
        setBusy(true); setError('');
        try {
            const response = await fetch(`/api/knowledge/${id}/bookmark`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ saved: !isSaved }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Could not update saved knowledge.');
            setSaved(data.saved);
            onChange?.(data.saved);
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    }

    return <span className="inline-flex flex-col items-start gap-1"><button type="button" className="btn-quiet min-h-9 px-3 text-xs" disabled={busy} onClick={toggle}>{busy ? 'Saving…' : isSaved ? 'Saved' : 'Save'}</button>{error && <span role="alert" className="max-w-48 text-xs text-margin">{error}</span>}</span>;
}
