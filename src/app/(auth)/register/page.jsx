'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/AuthShell';

export default function Register() {
    const router = useRouter();
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return setError(data.msg || `Server error (${res.status})`);
            router.push('/login');
        } catch {
            setError('Could not reach the server. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    return (
        <AuthShell
            title="Create your account"
            hint="Ask doubts, answer a classmate's, and build the class answer library."
            footer={<>Already registered? <Link href="/login" className="underline underline-offset-4">Log in</Link></>}
        >
            <form onSubmit={onSubmit} className="space-y-4">
                {error && <p role="alert" className="text-sm text-margin">{error}</p>}
                <div>
                    <label htmlFor="name" className="mb-1 block text-sm font-medium">Name</label>
                    <input id="name" className="field" autoComplete="name" onChange={set('name')} required />
                </div>
                <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium">College email</label>
                    <input id="email" type="email" className="field" autoComplete="email" onChange={set('email')} required />
                </div>
                <div>
                    <label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
                    <input id="password" type="password" className="field" autoComplete="new-password"
                        placeholder="At least 6 characters" onChange={set('password')} required />
                </div>
                <button className="btn w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create account'}
                </button>
            </form>
        </AuthShell>
    );
}