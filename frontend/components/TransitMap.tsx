'use client';

import 'leaflet/dist/leaflet.css';
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';

type Stop = { id: string; name_en: string; name_ml: string; lat: number; lng: number; origin?: string; destination?: string; departure_time?: string; timetable?: any[]; manual?: boolean };
type NetworkStop = { code: string; name: string; district: string; lat: number; lng: number; type?: string; is_major?: boolean; routes_operated?: number; bus_count?: number };
type District = { code: string; name: string; headquarters: string; lat: number; lng: number };
const markerIcon = (selected: boolean) => L.divIcon({ className: '', html: `<span style="display:grid;place-items:center;width:${selected ? 38 : 32}px;height:${selected ? 38 : 32}px;border:4px solid white;border-radius:50%;background:${selected ? '#facc15' : '#15803d'};box-shadow:0 4px 12px rgba(0,0,0,.22);color:${selected ? '#123c29' : 'white'};font:700 16px sans-serif">•</span>`, iconSize: [selected ? 38 : 32, selected ? 38 : 32], iconAnchor: [selected ? 19 : 16, selected ? 19 : 16] });

function FitStops({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => { if (points.length) map.fitBounds(points, { padding: [42, 42], maxZoom: 12 }); }, [map, points]);
  return null;
}
function FocusPoint({ point }: { point?: [number, number] }) {
  const map = useMap();
  useEffect(() => { if (point) map.flyTo(point, 14, { duration: .7 }); }, [map, point]);
  return null;
}
function ClearSelectionOnMapInteraction({ onClearSelection }: { onClearSelection?: () => void }) {
  useMapEvents({ click: onClearSelection, dragstart: onClearSelection });
  return null;
}

export default function TransitMap({ stops, selectedId, onSelect, onClearSelection, networkStops, depots, districts, focusPoint, userLocation }: { stops: Stop[]; selectedId?: string; onSelect: (stop: Stop) => void; onClearSelection?: () => void; networkStops: NetworkStop[]; depots: NetworkStop[]; districts: District[]; focusPoint?: [number, number]; userLocation?: [number, number] }) {
  const points = useMemo(() => [...networkStops, ...depots, ...districts, ...stops].map(point => [point.lat, point.lng] as [number, number]), [networkStops, depots, districts, stops]);
  const selectMarker = (stop: Stop) => (event: any) => { L.DomEvent.stopPropagation(event.originalEvent); onSelect(stop); };
  return <div className="h-full w-full [&_.leaflet-control-attribution]:text-[9px]"><MapContainer center={[10.25, 76.32]} zoom={9} scrollWheelZoom zoomControl className="!h-full !w-full"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><ClearSelectionOnMapInteraction onClearSelection={onClearSelection} /><FitStops points={points} /><FocusPoint point={focusPoint} />{userLocation && <CircleMarker center={userLocation} radius={9} pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: .9 }} />}{districts.map(district => <CircleMarker key={district.code} center={[district.lat, district.lng]} radius={8} pathOptions={{ color: '#f59e0b', fillColor: '#facc15', fillOpacity: .75 }} />)}{depots.map(depot => <Marker key={`depot-${depot.code}`} position={[depot.lat, depot.lng]} icon={markerIcon(false)} eventHandlers={{ click: selectMarker({ id: depot.code, name_en: depot.name, name_ml: '', lat: depot.lat, lng: depot.lng }) }} />)}{networkStops.map(stop => <Marker key={`network-${stop.code}`} position={[stop.lat, stop.lng]} icon={markerIcon(stops.some(item => item.id === stop.code && item.id === selectedId))} eventHandlers={{ click: selectMarker({ id: stop.code, name_en: stop.name, name_ml: '', lat: stop.lat, lng: stop.lng }) }} />)}{stops.filter(stop => stop.manual || stop.timetable).map(stop => <Marker key={`published-${stop.id}`} position={[stop.lat, stop.lng]} icon={markerIcon(stop.id === selectedId)} eventHandlers={{ click: selectMarker(stop) }} />)}</MapContainer></div>;
}
