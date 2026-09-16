'use client';

import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';

const center: LatLngExpression = [10.25, 76.32];
export default function MapCanvas({ stops, selectedId, onSelect }: { stops: any[]; selectedId?: string; onSelect: (stop: any) => void }) {
  return <MapContainer center={center} zoom={9} scrollWheelZoom className="h-full min-h-[620px] w-full"><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{stops.map(stop => <Marker key={stop.id} position={[stop.lat, stop.lng]} eventHandlers={{ click: () => onSelect(stop) }} opacity={selectedId === stop.id ? 1 : .82}><Popup><b>{stop.name_en}</b><br/>{stop.name_ml}</Popup></Marker>)}</MapContainer>;
}
