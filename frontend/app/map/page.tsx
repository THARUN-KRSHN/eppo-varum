'use client';

import dynamic from 'next/dynamic';
import { Bell, LocateFixed, MapPin, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { useLanguage } from '../../components/LanguageProvider';

const TransitMap = dynamic(() => import('../../components/TransitMap'), { ssr: false, loading: () => <div className="grid h-full place-items-center bg-green-50 text-sm font-semibold text-green-800">Loading map...</div> });
const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function MapPage() {
  const { token } = useAuth();
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
  const [alertMessage, setAlertMessage] = useState('');

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
    const timer = window.setTimeout(() => fetch(`${api}/stops/geocode?q=${encodeURIComponent(query.trim())}`).then(response => response.json()).then(remote => { const local = stops.slice(0, 5).map(stop => ({ place_id: `local-${stop.id}`, display_name: stop.name_en, lat: String(stop.lat), lon: String(stop.lng), stop })); setSuggestions([...local, ...remote.filter((place: any) => !local.some(item => item.display_name === place.display_name)).slice(0, 5)]); }).catch(() => setSuggestions([])), 350);
    return () => window.clearTimeout(timer);
  }, [query, stops]);
  useEffect(() => { if (!selected) return; fetch(`${api}/stops/${selected.id}/timetable`).then(response => response.json()).then(data => setDepartures(data.departures?.length ? data.departures : selected.timetable || [])).catch(() => setDepartures(selected.timetable || [])); }, [selected]);

  const chooseSuggestion = (place: any) => { const stop = place.stop || { id: `search-${place.place_id}`, name_en: place.display_name.split(',')[0], name_ml: '', lat: Number(place.lat), lng: Number(place.lon) }; setSelected(stop); setQuery(place.display_name); setSuggestions([]); setFocusPoint([Number(place.lat), Number(place.lon)]); };
  const locate = () => { if (!navigator.geolocation) { setLocationMessage('Live location is not available.'); return; } navigator.geolocation.getCurrentPosition(position => { const point: [number, number] = [position.coords.latitude, position.coords.longitude]; setUserLocation(point); setFocusPoint(point); setLocationMessage('Showing your location.'); }, () => setLocationMessage('Location permission was not granted.')); };
  const alertForNextBus = async () => {
    if (!selected || !departures.length) return;
    const response = await fetch(`${api}/notifications/subscriptions`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ stop_id: selected.id, route: departures[0].route || null, advance_minutes: 30 }) });
    if (!response.ok) { setAlertMessage('Could not save this reminder.'); return; }
    setAlertMessage(`Reminder set for 30 minutes before the next bus at ${selected.name_en}.`);
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
    if ('Notification' in window && Notification.permission === 'granted') new Notification('Bus reminder set', { body: `30 minutes before the next bus at ${selected.name_en}.` });
  };
  const mapStops = Array.from(new Map([...stops.filter(stop => stop.manual || stop.timetable), ...publishedStops].map(stop => [stop.id, stop])).values());

  return <main className="map-page relative h-[100dvh] w-screen overflow-hidden">
    <div className="absolute inset-0 z-0 h-full w-full bg-green-50">
      <TransitMap stops={mapStops} selectedId={selected?.id} onSelect={setSelected} onClearSelection={() => { setSelected(null); setAlertMessage(''); }} networkStops={network.stops || []} depots={network.depots || []} districts={network.districts || []} focusPoint={focusPoint} userLocation={userLocation}/>
    </div>
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="pointer-events-auto absolute right-4 top-5 z-[50] flex w-[min(430px,calc(100vw-2rem))] gap-2 md:right-8"><div className="relative min-w-0 flex-1"><div className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-4 shadow-xl backdrop-blur"><Search size={18} className="shrink-0 text-green-600"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search a bus stop or location" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-green-950 outline-none placeholder:text-green-950/45"/>{query && <button onClick={() => { setQuery(''); setSuggestions([]); }} aria-label="Clear search" className="grid min-h-10 min-w-10 place-items-center"><X size={17}/></button>}</div>{suggestions.length > 0 && <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[60] max-h-72 overflow-auto rounded-2xl border border-green-100 bg-white p-1 shadow-2xl">{suggestions.map(place => <button key={place.place_id} onClick={() => chooseSuggestion(place)} className="flex min-h-12 w-full items-start gap-3 border-b border-green-50 p-3 text-left last:border-0 hover:bg-green-50"><MapPin size={17} className="mt-0.5 shrink-0 text-green-700"/><span className="text-sm font-semibold text-green-950">{place.display_name}</span></button>)}</div>}</div><button onClick={locate} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/80 bg-white/95 text-green-700 shadow-xl backdrop-blur" aria-label="Use live location"><LocateFixed size={19}/></button></div>
      <div className="pointer-events-auto absolute bottom-[calc(6rem+env(safe-area-inset-bottom))] left-3 z-[70] max-h-[45vh] w-[calc(100vw-1.5rem)] max-w-[390px] overflow-y-auto md:bottom-6 md:left-6 md:w-[min(390px,calc(100vw-2rem))]">{selected ? <div className="surface bg-white/95 p-6 backdrop-blur"><Details selected={selected} departures={departures} onAlert={alertForNextBus}/>{alertMessage && <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">{alertMessage}</p>}</div> : <div className="hidden surface bg-white/95 p-6 backdrop-blur md:block"><p className="text-sm font-bold uppercase tracking-[.18em] text-green-600">Bus stop information</p><h1 className="mt-2 text-2xl font-bold text-green-950">Select a stop on the map</h1><p className="mt-2 text-sm text-green-950/60">The selected stop, route, timings, and reminder controls will appear here.</p></div>}</div>
      {locationMessage && <p className="pointer-events-auto absolute bottom-24 right-4 z-[20] rounded-full bg-white px-3 py-2 text-xs font-semibold text-green-800 shadow-lg md:bottom-6 md:left-auto md:right-6">{locationMessage}</p>}
    </div>
  </main>;
}

function Details({ selected, departures, onAlert }: { selected: any; departures: any[]; onAlert: () => void }) {
  return <><p className="text-sm font-bold uppercase tracking-[.18em] text-green-600">Bus stop</p><h2 className="mt-2 text-2xl font-bold text-green-950">{selected.name_en}</h2>{selected.origin && <p className="mt-2 text-sm text-green-950/60">{selected.origin} → {selected.destination}</p>}<button onClick={onAlert} disabled={!departures.length} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-green-950 disabled:cursor-not-allowed disabled:opacity-50"><Bell size={17}/> Alert me 30 min before</button><div className="mt-6 space-y-2">{departures.length ? departures.slice(0, 20).map((departure: any, index: number) => <div key={`${departure.time || departure.arrival_time}-${index}`} className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3"><span className="text-sm font-semibold text-green-950">{departure.route || 'Scheduled bus'}</span><strong className="text-green-700">{departure.time || departure.departure_time || departure.arrival_time?.slice(0, 5) || 'Time unavailable'}</strong></div>) : <p className="text-sm text-green-950/55">No published bus times for this stop yet.</p>}</div></>;
}
