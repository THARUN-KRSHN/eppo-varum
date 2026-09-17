'use client';

import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function Login() {
	const router = useRouter();
	const { setSession } = useAuth();
	const [mode, setMode] = useState<'login' | 'signup'>('login');
	const [form, setForm] = useState({ username: '', email: '', password: '' });
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		setBusy(true);
		setError('');
		try {
			const response = await fetch(`${api}/auth/${mode === 'login' ? 'login' : 'signup'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
			const data = await response.json().catch(() => ({}));
			if (!response.ok) setError(data.detail || `Request failed (${response.status}). Check the deployed API URL and CORS settings.`);
			else if (data.data?.token) { setSession(data.data.token, data.data.user); router.push('/profile'); }
			else setError(data.data?.message || 'Check your email to continue.');
		} catch {
			setError('Could not reach the API. Confirm NEXT_PUBLIC_API_URL points to the deployed backend /api URL.');
		} finally { setBusy(false); }
	};

	return <main className="mx-auto max-w-md px-5 pb-28 pt-32 md:pt-44"><div className="surface p-7 md:p-9"><div className="flex justify-center"><img src="/logo.png" alt="eppo varum" className="h-24 w-24 rounded-[26px] border border-green-100 bg-white p-3 object-contain shadow-[0_12px_30px_rgba(21,128,61,.12)]" /></div><p className="mt-5 text-center text-xs font-bold uppercase tracking-[.2em] text-green-700">എപ്പോ വരും</p><h1 className="mt-3 text-center text-3xl font-bold text-green-950">{mode === 'login' ? 'Welcome back' : 'Create your eppo varum account'}</h1><p className="mt-2 text-center text-sm leading-6 text-green-950/60">Your account keeps uploads, corrections, and contributions connected to your username.</p><form onSubmit={submit} className="mt-7 space-y-4">{mode === 'signup' && <label className="block text-sm font-bold">Username<input required value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-green-100 px-4" placeholder="tharun" /></label>}<label className="block text-sm font-bold">Email<input required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-green-100 px-4" placeholder="you@example.com" /></label><label className="block text-sm font-bold">Password<input required minLength={8} type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-green-100 px-4" placeholder="8 characters minimum" /></label>{error && <p className="rounded-xl bg-yellow-50 p-3 text-sm font-semibold text-green-950">{error}</p>}<button disabled={busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-green-700 font-bold text-white disabled:opacity-50">{busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={17} /></button></form><button onClick={() => { setError(''); setMode(mode === 'login' ? 'signup' : 'login'); }} className="mt-6 w-full text-sm font-bold text-green-700">{mode === 'login' ? 'Create an account' : 'Already have an account? Sign in'}</button></div></main>;
}
