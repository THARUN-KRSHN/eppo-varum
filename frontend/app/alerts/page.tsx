'use client';

import { Bell, Check, Clock3, Info, MapPin, Play } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../../components/LanguageProvider';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function Alerts() {
  const { copy } = useLanguage();
  const [message, setMessage] = useState('');
  const [enabled, setEnabled] = useState(false);
  const trigger = async () => {
    const response = await fetch(`${api}/notifications/demo-trigger`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stop_id: '2', advance_minutes: 30 }) });
    const data = await response.json();
    setMessage(data.message || copy.alerts.enabled);
  };
  return <main className="mx-auto max-w-5xl px-5 pb-28 pt-32 md:pt-40">
    <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.18em] text-yellow-700">{copy.alerts.demo}</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-green-950 md:text-6xl">{copy.alerts.title}</h1><p className="mt-4 text-lg text-green-950/60">{copy.alerts.subtitle}</p></div>
    <div className="mt-10 grid gap-6 md:grid-cols-[1fr_.82fr]">
      <section className="surface p-7 md:p-9"><div className="flex items-start justify-between"><div><span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-green-950"><span className="h-2 w-2 animate-pulse rounded-full bg-yellow-600" /> {copy.alerts.demo}</span><h2 className="mt-6 text-2xl font-bold text-green-950">{copy.alerts.demoTitle}</h2><p className="mt-2 text-sm text-green-950/60">{copy.alerts.demoDescription}</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-green-100 text-green-700"><Bell size={23} /></div></div>
        <div className="mt-8 space-y-3"><div className="flex items-center gap-3 rounded-2xl border border-green-100 p-4"><MapPin className="text-green-700" size={19} /><div><p className="text-xs text-green-950/50">{copy.alerts.stop}</p><p className="font-bold">Mannuthy · മണ്ണുത്തി</p></div></div><div className="flex items-center gap-3 rounded-2xl border border-green-100 p-4"><Clock3 className="text-green-700" size={19} /><div><p className="text-xs text-green-950/50">{copy.alerts.sampleArrival}</p><p className="font-bold">07:20 · 06:50</p></div></div></div>
        <button onClick={() => setEnabled(!enabled)} className={`mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full font-bold ${enabled ? 'bg-green-100 text-green-800' : 'bg-green-700 text-white hover:bg-green-800'}`}>{enabled ? <><Check size={18} /> {copy.alerts.enabled}</> : <><Bell size={18} /> {copy.alerts.enable}</>}</button>{message && <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">{message}</p>}
      </section>
      <aside><section className="rounded-3xl bg-green-800 p-7 text-white"><div className="flex items-center gap-3"><Info size={21} /><h2 className="text-xl font-bold">{copy.alerts.howTitle}</h2></div><ol className="mt-5 space-y-4 text-sm leading-6 text-white/80">{copy.alerts.howSteps.map((step, index) => <li key={step}><strong className="text-white">{index + 1}.</strong> {step}</li>)}</ol><button onClick={trigger} className="mt-7 inline-flex items-center gap-2 rounded-full bg-yellow-300 px-4 py-3 text-sm font-bold text-green-950"><Play size={16} /> {copy.alerts.trigger}</button></section></aside>
    </div>
  </main>;
}