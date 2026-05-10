import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapTestPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Map Test</h1>
      <div style={{ height: '400px', width: '100%' }}>
        <MapContainer
          center={[-6.2088, 106.8456]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[-6.2088, 106.8456]}>
            <Popup>Jakarta — Map is working!</Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
