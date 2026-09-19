'use client';

import dynamic from 'next/dynamic';
import { LoaderCircle, MapPin, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from './LanguageProvider';

const TransitMap = dynamic(() => import('./TransitMap'), { ssr: false, loading: () => <div className="grid h-full place-items-center bg-green-50 text-sm font-semibold text-green-800">Loading map...</div> });
const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function PublicMapExplorer() {
  const { copy } = useLanguage();
  const [network, setNetwork] = useState<any>({ stops: [], depots: [], districts: [] });
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [departures, setDepartures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [focusPoint, setFocusPoint] = useState<[number, number] | undefined>();

  useEffect(() => {
    fetch(`${api}/stops/network`).then(response => { if (!response.ok) throw new Error('Network unavailable'); return response.json(); }).then(setNetwork).catch(() => setError('The public map is temporarily unavailable.')).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (query.trim().length < 2) { setSuggestions([]); return; }
    const local = (network.stops || []).filter((stop: any) => `${stop.name} ${stop.district}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6).map((stop: any) => ({ place_id: `local-${stop.code}`, display_name: stop.name, lat: String(stop.lat), lon: String(stop.lng), stop: { id: stop.code, name_en: stop.name, name_ml: '', lat: stop.lat, lng: stop.lng } }));
    setSuggestions(local);
  }, [query, network.stops]);
  useEffect(() => { if (!selected) return; fetch(`${api}/stops/${selected.id}/timetable`).then(response => response.json()).then(result => setDepartures(result.departures || [])).catch(() => setDepartures([])); }, [selected]);

  const choose = (place: any) => { const stop = place.stop || { id: `search-${place.place_id}`, name_en: place.display_name, name_ml: '', lat: Number(place.lat), lng: Number(place.lon) }; setSelected(stop); setFocusPoint([stop.lat, stop.lng]); setQuery(place.display_name); setSuggestions([]); };
  const networkStops = (network.stops || []).map((stop: any) => ({ code: stop.code, name: stop.name, district: stop.district, lat: stop.lat, lng: stop.lng }));
  const displayTime = (departure: any) => departure.time || departure.departure_time || departure.arrival_time?.slice(0, 5) || '—';

  return <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
    <div className="mb-8 max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.16em] text-green-600">Explore public bus data</p><h2 className="mt-3 text-3xl font-bold leading-tight text-green-950 md:text-5xl">Find a stop and see its available timings.</h2></div>
    <div className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
      <div className="min-w-0 space-y-4">
        <div className="relative z-20 flex gap-2"><div className="relative flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-green-100 bg-white px-4 py-3 shadow-[0_10px_30px_rgba(21,128,61,.08)]"><Search size={18} className="shrink-0 text-green-600" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.map.search} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-green-950 outline-none placeholder:text-green-950/45" />{query && <button onClick={() => { setQuery(''); setSuggestions([]); }} aria-label="Clear search"><X size={17} /></button>}{suggestions.length > 0 && <div className="absolute left-0 right-0 top-14 z-30 overflow-hidden rounded-2xl border border-green-100 bg-white shadow-xl">{suggestions.map(place => <button key={place.place_id} onClick={() => choose(place)} className="flex w-full items-center gap-3 border-b border-green-50 p-3 text-left text-sm font-semibold last:border-0 hover:bg-green-50"><MapPin size={16} className="text-green-700" />{place.display_name}</button>)}</div>}</div></div>
        <div className="h-[300px] overflow-hidden rounded-3xl border border-green-100 bg-green-50 shadow-[0_18px_50px_rgba(21,128,61,.08)] md:h-[460px]">{loading ? <div className="grid h-full place-items-center"><LoaderCircle className="animate-spin text-green-700" /></div> : error ? <p className="p-6 text-sm font-semibold text-red-700">{error}</p> : <TransitMap stops={[]} selectedId={selected?.id} onSelect={setSelected} networkStops={networkStops} depots={network.depots || []} districts={network.districts || []} focusPoint={focusPoint} />}</div>
      </div>
      <aside className="surface min-w-0 p-6 md:p-7">{selected ? <><p className="text-sm font-bold uppercase tracking-[.16em] text-green-600">{copy.map.selected}</p><h3 className="mt-2 text-2xl font-bold text-green-950">{selected.name_en}</h3><div className="mt-6 space-y-2">{departures.length ? departures.slice(0, 10).map((departure: any, index: number) => <div key={`${displayTime(departure)}-${index}`} className="flex items-center justify-between rounded-xl bg-green-50 px-3 py-3 text-sm"><span className="font-semibold text-green-950">{departure.route || 'Scheduled bus'}</span><strong className="text-green-700">{displayTime(departure)}</strong></div>) : <p className="text-sm text-green-950/60">{copy.map.empty}</p>}</div></> : <><p className="text-sm font-bold uppercase tracking-[.16em] text-green-600">{copy.map.title}</p><h3 className="mt-2 text-2xl font-bold text-green-950">{copy.map.selected}</h3><p className="mt-2 text-sm leading-6 text-green-950/60">{copy.map.empty}</p></>}</aside>
    </div>
  </section>;
}