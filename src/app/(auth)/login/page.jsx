'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Login() {
    const router = useRouter();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');

    async function onSubmit(e) {
        e.preventDefault();
        const res = await signIn('credentials', { ...form, redirect: false });
        if (res?.error) return setError('Invalid email or password');
        router.push('/doubts/mine');
        router.refresh();
    }

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    return (
        <form onSubmit={onSubmit} className="max-w-sm mx-auto mt-10 space-y-3">
            <h1 className="text-2xl font-semibold">Login</h1>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <input className="w-full border p-2 rounded" type="email" placeholder="Email" onChange={set('email')} required />
            <input className="w-full border p-2 rounded" type="password" placeholder="Password" onChange={set('password')} required />
            <button className="w-full bg-blue-600 text-white p-2 rounded">Login</button>
        </form>
    );
}