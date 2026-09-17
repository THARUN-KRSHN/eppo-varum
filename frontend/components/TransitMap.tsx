'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

type Stop = { id: string; name_en: string; name_ml: string; lat: number; lng: number; origin?: string; destination?: string; departure_time?: string };
const markerIcon = (selected: boolean) => L.divIcon({ className: '', html: `<span style="display:grid;place-items:center;width:${selected ? 38 : 32}px;height:${selected ? 38 : 32}px;border:4px solid white;border-radius:50%;background:${selected ? '#facc15' : '#15803d'};box-shadow:0 4px 12px rgba(0,0,0,.22);color:${selected ? '#123c29' : 'white'};font:700 16px sans-serif">•</span>`, iconSize: [selected ? 38 : 32, selected ? 38 : 32], iconAnchor: [selected ? 19 : 16, selected ? 19 : 16] });

function FitStops({ stops }: { stops: Stop[] }) {
  const map = useMap();
  useEffect(() => { if (stops.length) map.fitBounds(stops.map(stop => [stop.lat, stop.lng] as [number, number]), { padding: [42, 42], maxZoom: 12 }); }, [map, stops]);
  return null;
}

export default function TransitMap({ stops, selectedId, onSelect }: { stops: Stop[]; selectedId?: string; onSelect: (stop: Stop) => void }) {
  return <div className="min-h-[620px] [&_.leaflet-control-attribution]:text-[9px]"><MapContainer center={[10.25, 76.32]} zoom={9} scrollWheelZoom className="!min-h-[620px] !w-full"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><FitStops stops={stops}/>{stops.map(stop => <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={markerIcon(stop.id === selectedId)} eventHandlers={{ click: () => onSelect(stop) }}><Popup><strong>{stop.name_en}</strong><br/>{stop.name_ml}</Popup></Marker>)}</MapContainer></div>;
}
