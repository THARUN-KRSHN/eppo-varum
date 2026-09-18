'use client';

import { Check, LoaderCircle, MapPin, Save, ShieldCheck, Trash2, TriangleAlert, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { useLanguage } from '../../components/LanguageProvider';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function Verify() {
  const { copy } = useLanguage();
  const { token, ready } = useAuth();
  const router = useRouter();
  const [documentId, setDocumentId] = useState('');
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [publishNotice, setPublishNotice] = useState('');
  const [busyAction, setBusyAction] = useState('');

  const errorMessage = (detail: any) => typeof detail === 'string' ? detail : detail?.message || detail?.detail?.message || detail?.warnings?.map((warning: any) => warning.message).filter(Boolean).join(' ') || 'Please review the highlighted timetable fields.';

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('document') || localStorage.getItem('eppo-varum-last-document') || localStorage.getItem('transitlens-last-document');
    if (id) setDocumentId(id);
  }, []);
  useEffect(() => {
    if (!token || !documentId) { if (ready) setLoading(false); return; }
    fetch(`${api}/documents/${documentId}/extraction`, { headers: { Authorization: `Bearer ${token}` } }).then(response => response.json()).then(result => {
      if (result.detail) setMessage(result.detail); else { setData(result); setLocationQuery(result.stop_location?.name || result.route?.origin || ''); }
    }).catch(() => setMessage('We could not load this extraction.')).finally(() => setLoading(false));
  }, [token, documentId, ready]);
  useEffect(() => {
    const query = locationQuery.trim();
    if (query.length < 3 || data?.stop_location?.name === query) { setLocationSuggestions([]); return; }
    const timer = window.setTimeout(() => fetch(`${api}/stops/geocode?q=${encodeURIComponent(query)}`).then(response => response.json()).then(setLocationSuggestions).catch(() => setLocationSuggestions([])), 350);
    return () => window.clearTimeout(timer);
  }, [locationQuery, data?.stop_location?.name]);

  const update = (index: number, field: string, value: string) => setData((current: any) => ({ ...current, stops: current.stops.map((stop: any, stopIndex: number) => stopIndex === index ? { ...stop, [field]: value } : stop) }));
  const saveCorrection = async (index: number, field: string, value: any) => {
    if (!token || !data) return;
    setBusyAction(`save-${index}-${field}`);
    try {
      const response = await fetch(`${api}/documents/${documentId}/extraction`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ sequence: index + 1, field, value }) });
      const result = await response.json();
      if (!response.ok) setMessage(errorMessage(result.detail)); else { setData(result.data); setMessage(copy.verify.saved); }
    } finally { setBusyAction(''); }
  };
  const removeRow = async (index: number) => {
    if (!token || !data) return;
    setBusyAction(`remove-${index}`);
    try {
      const response = await fetch(`${api}/documents/${documentId}/extraction`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ sequence: index + 1, field: 'remove_row', value: true }) });
      const result = await response.json();
      if (!response.ok) setMessage(errorMessage(result.detail)); else { setData(result.data); setMessage('Row removed from this timetable.'); }
    } finally { setBusyAction(''); }
  };
  const chooseLocation = (place: any) => {
    const location = { name: place.display_name, lat: Number(place.lat), lng: Number(place.lon) };
    setLocationQuery(location.name); setLocationSuggestions([]); setData((current: any) => ({ ...current, stop_location: location })); saveCorrection(0, 'stop_location', location);
  };
  const publish = async () => {
    if (!token) return;
    setBusyAction('publish');
    try {
      const response = await fetch(`${api}/documents/${documentId}/verify`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json(); if (!response.ok) setMessage(errorMessage(result.detail)); else { setPublishNotice(result.warnings?.length ? `${result.warnings.length} missing time field(s) were estimated for review.` : 'All timetable values were verified.'); setModal(true); window.setTimeout(() => router.push('/profile'), 900); }
    } finally { setBusyAction(''); }
  };

  if (!ready || loading) return <main className="grid min-h-screen place-items-center"><LoaderCircle className="animate-spin text-green-700" size={30} /></main>;
  if (!data) return <main className="mx-auto max-w-xl px-5 pb-28 pt-40 text-center"><TriangleAlert className="mx-auto text-yellow-600" size={34} /><h1 className="mt-5 text-3xl font-bold text-green-950">No extraction selected</h1><p className="mt-3 text-green-950/60">Upload a timetable first, then open its verification result.</p></main>;

  return <main className="mx-auto max-w-6xl px-5 pb-28 pt-32 md:pt-40">
    <div className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-[.18em] text-green-600">{copy.verify.extracted}</p><h1 className="mt-3 text-4xl font-bold text-green-950 md:text-6xl">{data.route.origin} <span className="text-yellow-500">→</span> {data.route.destination}</h1><p className="mt-4 text-lg text-green-950/60">{copy.verify.subtitle}</p></div>
    <section className="surface mt-10 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-green-600">{copy.verify.extracted}</p><p className="mt-2 text-2xl font-bold text-green-950">{Math.round(data.overall_confidence * 100)}% confidence · {data.verification_status}</p></div><span className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-bold text-green-950">{data.warnings?.length || 0} fields need attention</span></div>
      <div className="relative mt-7 rounded-2xl border border-green-100 bg-green-50/60 p-4 md:p-5"><div className="flex items-center gap-2 text-sm font-bold text-green-800"><MapPin size={18} /> Verified bus stop location</div><div className="mt-3 flex gap-2"><input value={locationQuery} onChange={event => setLocationQuery(event.target.value)} placeholder="Search and select the stop location" className="min-w-0 flex-1 rounded-xl border border-green-100 bg-white px-3 py-3 outline-none focus:border-green-500" />{locationQuery && <button onClick={() => { setLocationQuery(''); setData((current: any) => ({ ...current, stop_location: null })); }} aria-label="Clear location"><X size={18} /></button>}</div>{locationSuggestions.length > 0 && <div className="absolute left-4 right-4 top-[105px] z-10 overflow-hidden rounded-xl border border-green-100 bg-white shadow-xl">{locationSuggestions.slice(0, 5).map(place => <button key={place.place_id} onClick={() => chooseLocation(place)} className="flex w-full items-start gap-3 border-b border-green-50 p-3 text-left last:border-0 hover:bg-green-50"><MapPin size={17} className="mt-0.5 shrink-0 text-green-700" /><span className="text-sm font-semibold">{place.display_name}</span></button>)}</div>}{data.stop_location && <p className="mt-2 text-xs font-semibold text-green-700">Saved: {data.stop_location.name} · {Number(data.stop_location.lat).toFixed(5)}, {Number(data.stop_location.lng).toFixed(5)}</p>}</div>
      <div className="mt-7 overflow-x-auto rounded-2xl border border-green-100"><div className="grid min-w-[520px] grid-cols-[1fr_112px_112px_116px] gap-3 bg-green-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-green-700"><span>Stop</span><span>Arrival</span><span>Departure</span><span>Actions</span></div>{data.stops.map((stop: any, index: number) => <div key={stop.sequence} className="grid min-w-[520px] grid-cols-[1fr_112px_112px_116px] items-center gap-3 border-t border-green-100 px-4 py-4"><div><p className="font-bold text-green-950">{stop.name_en}</p><p className="text-xs text-green-950/55">{stop.name_ml || 'Malayalam name not available'}</p></div><input disabled={busyAction !== ''} aria-label={`Arrival time for ${stop.name_en}`} type="time" value={stop.arrival_time?.slice(0, 5) || ''} onChange={event => update(index, 'arrival_time', event.target.value)} onBlur={event => saveCorrection(index, 'arrival_time', event.target.value)} className="w-full rounded-xl border border-green-100 px-2 py-2 font-bold outline-none focus:border-green-500 disabled:opacity-60" /><input disabled={busyAction !== ''} aria-label={`Departure time for ${stop.name_en}`} type="time" value={stop.departure_time?.slice(0, 5) || ''} onChange={event => update(index, 'departure_time', event.target.value)} onBlur={event => saveCorrection(index, 'departure_time', event.target.value)} className="w-full rounded-xl border border-green-100 px-2 py-2 font-bold outline-none focus:border-green-500 disabled:opacity-60" /><div className="flex gap-2"><button disabled={busyAction !== ''} aria-label="Save timetable row" onClick={() => { saveCorrection(index, 'arrival_time', stop.arrival_time); saveCorrection(index, 'departure_time', stop.departure_time); }} className="grid h-10 w-10 place-items-center rounded-xl bg-green-100 text-green-700 disabled:opacity-50">{busyAction.startsWith(`save-${index}`) ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}</button><button disabled={busyAction !== ''} aria-label={`Remove ${stop.name_en || 'timetable row'}`} onClick={() => removeRow(index)} className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-600 disabled:opacity-50">{busyAction === `remove-${index}` ? <LoaderCircle size={17} className="animate-spin" /> : <Trash2 size={17} />}</button></div></div>)}</div>
      {message && <p className="mt-4 text-sm font-semibold text-green-700">{message}</p>}<button disabled={busyAction !== ''} onClick={publish} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-green-700 px-5 font-bold text-white hover:bg-green-800 disabled:cursor-wait disabled:opacity-70">{busyAction === 'publish' ? <LoaderCircle size={18} className="animate-spin" /> : <ShieldCheck size={18} />} {busyAction === 'publish' ? 'Publishing...' : 'Verify and publish'}</button>
    </section>
    {modal && <div className="fixed inset-0 z-50 grid place-items-center bg-green-950/35 p-5"><div className="surface max-w-md p-8 text-center"><Check className="mx-auto text-green-600" size={40} /><h2 className="mt-4 text-2xl font-bold text-green-950">Published</h2><p className="mt-2 text-green-950/60">The verified timetable is now available at this bus stop.</p>{publishNotice && <p className="mt-4 rounded-xl bg-yellow-50 p-3 text-left text-sm font-semibold text-yellow-900">{publishNotice}</p>}<button onClick={() => setModal(false)} className="mt-6 rounded-xl bg-green-700 px-5 py-3 font-bold text-white">Close</button></div></div>}
  </main>;
}
