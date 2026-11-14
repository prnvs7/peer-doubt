'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/AuthShell';

export default function Login() {
    const router = useRouter();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await signIn('credentials', { ...form, redirect: false });
            if (res?.error) {
                setError(res.error === 'CredentialsSignin'
                    ? 'Email or password is incorrect.'
                    : 'Sign-in is temporarily unavailable. Check your connection and try again shortly.');
                return;
            }
            router.push('/doubts/mine');
            router.refresh();
        } catch {
            setError('Could not reach the sign-in service. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    return (
        <AuthShell
            title="Welcome back"
            hint="Pick up where your doubts left off."
            eyebrow="Return to your class"
            callout="Your open doubts and saved answers are waiting."
            footer={<>New here? <Link href="/register" className="underline underline-offset-4">Create an account</Link></>}
        >
            <form onSubmit={onSubmit} className="space-y-4">
                {error && <p role="alert" className="text-sm text-margin">{error}</p>}
                <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium">College email</label>
                    <input id="email" type="email" className="field" autoComplete="email" onChange={set('email')} required />
                </div>
                <div>
                    <label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
                    <input id="password" type="password" className="field" autoComplete="current-password"
                        onChange={set('password')} required />
                </div>
                <button className="btn w-full" disabled={loading}>
                    {loading ? 'Logging in...' : 'Log in'}
                </button>
            </form>
        </AuthShell>
    );
}
