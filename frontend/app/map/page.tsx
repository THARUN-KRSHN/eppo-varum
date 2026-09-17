'use client';

import dynamic from 'next/dynamic';
import { LocateFixed, MapPin, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '../../components/LanguageProvider';

const TransitMap = dynamic(() => import('../../components/TransitMap'), { ssr: false, loading: () => <div className="grid h-[calc(100svh-5rem)] min-h-[620px] place-items-center bg-green-50 text-sm font-semibold text-green-800">Loading OpenStreetMap...</div> });
const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function MapPage() {
  const { copy } = useLanguage();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [manualRoutes, setManualRoutes] = useState<any[]>([]);
  const [publishedStops, setPublishedStops] = useState<any[]>([]);
  const [network, setNetwork] = useState<any>({ districts: [], stops: [], depots: [], routes: [] });
  const [selected, setSelected] = useState<any>(null);
  const [departures, setDepartures] = useState<any[]>([]);
  const [focusPoint, setFocusPoint] = useState<[number, number] | undefined>();
  const [userLocation, setUserLocation] = useState<[number, number] | undefined>();
  const [locationMessage, setLocationMessage] = useState('');

  useEffect(() => { Promise.all([fetch(`${api}/stops/network`).then(response => response.json()), fetch(`${api}/stops/manual-routes`).then(response => response.json()), fetch(`${api}/stops/published-timetable`).then(response => response.json())]).then(([networkData, manualData, publishedData]) => { setNetwork(networkData); setManualRoutes(manualData); setPublishedStops(publishedData); }).catch(() => undefined); }, []);
  useEffect(() => {
    const queryValue = query.trim().toLowerCase();
    const catalogStops = (network.stops || []).filter((stop: any) => !queryValue || `${stop.name} ${stop.district} ${stop.code}`.toLowerCase().includes(queryValue)).map((stop: any) => ({ id: stop.code, name_en: stop.name, name_ml: '', lat: stop.lat, lng: stop.lng }));
    const manual = manualRoutes.filter(route => !queryValue || route.name_en.toLowerCase().includes(queryValue));
    const published = publishedStops.filter(route => !queryValue || route.name_en.toLowerCase().includes(queryValue));
    setStops([...catalogStops, ...manual, ...published]);
  }, [query, manualRoutes, network, publishedStops]);
  useEffect(() => {
    if (query.trim().length < 3) { setSuggestions([]); return; }
    const timer = window.setTimeout(() => fetch(`${api}/stops/geocode?q=${encodeURIComponent(query.trim())}`).then(response => response.json()).then(remote => {
      const local = stops.slice(0, 5).map(stop => ({ place_id: `local-${stop.id}`, display_name: stop.name_en, lat: String(stop.lat), lon: String(stop.lng), stop }));
      setSuggestions([...local, ...remote.filter((place: any) => !local.some(item => item.display_name === place.display_name)).slice(0, 5)]);
    }).catch(() => setSuggestions(stops.slice(0, 5).map(stop => ({ place_id: `local-${stop.id}`, display_name: stop.name_en, lat: String(stop.lat), lon: String(stop.lng), stop })))), 350);
    return () => window.clearTimeout(timer);
  }, [query, stops]);
  useEffect(() => { if (!selected) return; fetch(`${api}/stops/${selected.id}/timetable`).then(response => response.json()).then(data => setDepartures(data.departures?.length ? data.departures : selected.timetable || [])).catch(() => setDepartures(selected.timetable || [])); }, [selected]);

  const chooseSuggestion = (place: any) => {
    const stop = place.stop || { id: `search-${place.place_id}`, name_en: place.display_name.split(',')[0], name_ml: '', lat: Number(place.lat), lng: Number(place.lon) };
    setSelected(stop); setQuery(place.display_name); setSuggestions([]); setFocusPoint([Number(place.lat), Number(place.lon)]);
  };
  const locate = () => {
    if (!navigator.geolocation) { setLocationMessage('Live location is not available in this browser.'); return; }
    navigator.geolocation.getCurrentPosition(position => { const point: [number, number] = [position.coords.latitude, position.coords.longitude]; setUserLocation(point); setFocusPoint(point); setLocationMessage('Showing your location.'); }, () => setLocationMessage('Location permission was not granted.'));
  };
  const mapStops = [...stops.filter(stop => stop.manual || stop.timetable), ...publishedStops];

  return <main className="min-h-screen pb-20 md:px-5 md:pb-28 md:pt-36"><div className="mx-auto max-w-7xl"><div className="mb-8 hidden md:block"><p className="text-sm font-bold uppercase tracking-[.18em] text-green-600">OpenStreetMap + KSRTC</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-green-950 md:text-5xl">{copy.map.title}</h1><p className="mt-3 text-green-950/60">{copy.map.subtitle} Explore stops and verified bus timings.</p></div><div className="relative overflow-hidden border-y border-green-100 bg-green-50 shadow-[0_20px_60px_rgba(21,128,61,.09)] md:rounded-[28px] md:border"><div className="absolute left-4 right-4 top-4 z-20 flex gap-2 md:left-5 md:right-5"><div className="relative flex min-w-0 flex-1 items-center gap-3 rounded-full border border-green-100 bg-white px-4 py-3 shadow-lg"><Search size={18} className="shrink-0 text-green-600" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.map.search} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-green-950 outline-none placeholder:text-green-950/45" />{query && <button onClick={() => { setQuery(''); setSuggestions([]); }} aria-label="Clear search"><X size={17} /></button>}{suggestions.length > 0 && <div className="absolute left-0 right-0 top-14 max-h-72 overflow-auto rounded-2xl border border-green-100 bg-white shadow-xl">{suggestions.map(place => <button key={place.place_id} onClick={() => chooseSuggestion(place)} className="flex w-full items-start gap-3 border-b border-green-50 p-3 text-left last:border-0 hover:bg-green-50"><MapPin size={17} className="mt-0.5 shrink-0 text-green-700" /><span className="text-sm font-semibold">{place.display_name}</span></button>)}</div>}</div><button onClick={locate} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-green-100 bg-white text-green-700 shadow-lg" aria-label="Use live location"><LocateFixed size={19} /></button></div><TransitMap stops={mapStops} selectedId={selected?.id} onSelect={setSelected} networkStops={network.stops || []} depots={network.depots || []} districts={network.districts || []} focusPoint={focusPoint} userLocation={userLocation} />{locationMessage && <p className="absolute bottom-4 left-4 z-20 rounded-full bg-white px-3 py-2 text-xs font-semibold text-green-800 shadow-lg">{locationMessage}</p>}</div><aside className="surface mt-5 hidden h-fit overflow-hidden p-6 md:block">{selected ? <Details selected={selected} departures={departures} /> : <p className="text-sm text-green-950/60">Select a map point to see bus times.</p>}</aside>{selected && <div className="fixed inset-x-3 bottom-20 z-40 max-h-[58svh] overflow-auto rounded-3xl border border-green-100 bg-white p-5 shadow-2xl md:hidden"><button onClick={() => setSelected(null)} className="absolute right-4 top-4 rounded-full bg-green-50 p-2 text-green-800" aria-label="Close bus details"><X size={18} /></button><Details selected={selected} departures={departures} /></div>}</div></main>;
}

function Details({ selected, departures }: { selected: any; departures: any[] }) {
  return <><p className="text-sm font-bold uppercase tracking-[.18em] text-green-600">Bus stop</p><h2 className="mt-2 pr-8 text-2xl font-bold text-green-950">{selected.name_en}</h2>{selected.origin && <p className="mt-2 text-sm text-green-950/60">{selected.origin} → {selected.destination}</p>}<div className="mt-5 space-y-2">{departures.length ? departures.slice(0, 12).map((departure: any, index: number) => <div key={`${departure.time}-${index}`} className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3"><span className="text-sm font-semibold text-green-950">{departure.route || 'Scheduled bus'}</span><strong className="text-green-700">{departure.time || departure.departure_time || departure.arrival_time?.slice(0, 5) || 'Time unavailable'}</strong></div>) : <p className="text-sm text-green-950/55">No published bus times for this stop yet.</p>}</div></>;
}
