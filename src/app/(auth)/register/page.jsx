'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
    const router = useRouter();
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');

    async function onSubmit(e) {
        e.preventDefault();
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) return setError(data.msg);
        router.push('/login');
    }

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    return (
        <form onSubmit={onSubmit} className="max-w-sm mx-auto mt-10 space-y-3">
            <h1 className="text-2xl font-semibold">Register</h1>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <input className="w-full border p-2 rounded" placeholder="Name" onChange={set('name')} required />
            <input className="w-full border p-2 rounded" type="email" placeholder="Email" onChange={set('email')} required />
            <input className="w-full border p-2 rounded" type="password" placeholder="Password (min 6)" onChange={set('password')} required />
            <button className="w-full bg-blue-600 text-white p-2 rounded">Create account</button>
            <p className="text-sm">Have an account? <Link href="/login" className="underline">Login</Link></p>
        </form>
    );
}