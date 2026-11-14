'use client';

import { useState } from 'react';

const REASONS = [
    ['INCORRECT', 'Incorrect or misleading content'],
    ['HARASSMENT', 'Harassment or abuse'],
    ['SPAM', 'Spam or unrelated content'],
    ['PRIVACY', 'Privacy concern'],
    ['DUPLICATE', 'Duplicate question'],
    ['OTHER', 'Other'],
];

export default function ReportButton({ targetType, targetId }) {
    const [open, setOpen] = useState(false);
    const [reasonCategory, setReasonCategory] = useState(REASONS[0][0]);
    const [details, setDetails] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setMessage('');
        try {
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetType, target: targetId, reasonCategory, details }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Could not submit your report.');
            setMessage('Report sent to the moderation team.');
            setDetails('');
            setOpen(false);
        } catch (error) {
            setMessage(error.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-2">
            <button type="button" className="text-xs font-medium text-graphite underline underline-offset-2 hover:text-ink" onClick={() => setOpen((value) => !value)}>
                {open ? 'Cancel report' : 'Report content'}
            </button>
            {open && <form className="space-y-3 rounded-xl border border-rule bg-sheet p-4" onSubmit={submit}>
                <label className="block space-y-1.5 text-sm font-semibold">
                    Reason
                    <select className="field" value={reasonCategory} onChange={(event) => setReasonCategory(event.target.value)}>
                        {REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </label>
                <label className="block space-y-1.5 text-sm font-semibold">
                    Context <span className="font-normal text-graphite">(optional)</span>
                    <textarea className="field min-h-20 resize-y" maxLength={2000} value={details} onChange={(event) => setDetails(event.target.value)} />
                </label>
                <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send report'}</button>
            </form>}
            {message && <p className="text-xs text-graphite" role="status">{message}</p>}
        </div>
    );
}
