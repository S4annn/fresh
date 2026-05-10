import React, { useEffect, useMemo, useRef } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const iconCache = {};

function makeIcon(color = '#10b981', isActive = false) {
  const key = `${color}-${isActive ? 'active' : 'default'}`;
  if (iconCache[key]) return iconCache[key];

  const size = isActive ? 34 : 28;
  const border = isActive ? 4 : 3;
  const shadow = isActive
    ? '0 8px 20px rgba(15,23,42,0.32), 0 0 0 7px rgba(16,185,129,0.18)'
    : '0 5px 14px rgba(15,23,42,0.24)';

  const icon = L.divIcon({
    className: 'fresh-leaflet-marker',
    html: `<div style="
      width:${size}px;
      height:${size}px;
      background:${color};
      border:${border}px solid #fff;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:${shadow};
    ">
      <span style="
        position:absolute;
        inset:7px;
        background:rgba(255,255,255,0.92);
        border-radius:999px;
        display:block;
      "></span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });

  iconCache[key] = icon;
  return icon;
}

function makeUserIcon() {
  if (iconCache.user) return iconCache.user;

  const icon = L.divIcon({
    className: 'fresh-user-marker',
    html: `
      <div style="position:relative;width:36px;height:36px;">
        <div style="
          position:absolute;
          inset:0;
          background:rgba(37,99,235,0.22);
          border-radius:999px;
          animation:freshPulse 2s ease-out infinite;
        "></div>
        <div style="
          position:absolute;
          top:50%;
          left:50%;
          transform:translate(-50%,-50%);
          width:17px;
          height:17px;
          background:#2563eb;
          border:3px solid #fff;
          border-radius:999px;
          box-shadow:0 4px 12px rgba(37,99,235,0.38);
        "></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });

  iconCache.user = icon;
  return icon;
}

export const MARKER_COLORS = {
  available: '#10b981',
  reserved: '#f59e0b',
  sold: '#64748b',
  completed: '#64748b',
  donation: '#ef4444',
  user: '#2563eb',
};

function ResizeMapFix({ watchKey }) {
  const map = useMap();

  useEffect(() => {
    const timers = [100, 350, 800].map((delay) =>
      setTimeout(() => map.invalidateSize({ animate: false }), delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [map, watchKey]);

  return null;
}

function ListingMarker({
  marker,
  isActive,
  focusRequest,
  focusZoom,
  onMarkerClick,
}) {
  const map = useMap();
  const markerRef = useRef(null);
  const lat = Number(marker.lat);
  const lng = Number(marker.lng);

  useEffect(() => {
    if (!isActive || !markerRef.current) return;
    map.flyTo([lat, lng], focusZoom, { animate: true, duration: 0.7 });
    window.setTimeout(() => markerRef.current?.openPopup(), 250);
  }, [focusRequest, focusZoom, isActive, lat, lng, map]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return (
    <Marker
      ref={markerRef}
      position={[lat, lng]}
      icon={makeIcon(marker.color || MARKER_COLORS.available, isActive)}
      zIndexOffset={isActive ? 800 : 0}
      eventHandlers={{
        click: () => onMarkerClick?.(marker.id),
      }}
    >
      {(marker.popupContent || marker.popupText) && (
        <Popup maxWidth={300} minWidth={210}>
          {marker.popupContent || <div dangerouslySetInnerHTML={{ __html: marker.popupText }} />}
        </Popup>
      )}
    </Marker>
  );
}

export default function FreshMap({
  center = [-6.2088, 106.8456],
  zoom = 12,
  markers = [],
  userLocation = null,
  userRadius = null,
  height = 420,
  className = '',
  selectedMarkerId = null,
  focusRequest = 0,
  focusZoom = 15,
  onMarkerClick,
}) {
  const safeCenter = useMemo(() => {
    if (
      Array.isArray(center) &&
      center.length === 2 &&
      Number.isFinite(Number(center[0])) &&
      Number.isFinite(Number(center[1]))
    ) {
      return [Number(center[0]), Number(center[1])];
    }

    return [-6.2088, 106.8456];
  }, [center]);

  const safeUser = useMemo(() => {
    if (
      userLocation &&
      Number.isFinite(Number(userLocation.lat)) &&
      Number.isFinite(Number(userLocation.lng))
    ) {
      return {
        ...userLocation,
        lat: Number(userLocation.lat),
        lng: Number(userLocation.lng),
      };
    }

    return null;
  }, [userLocation]);

  const markerWatchKey = `${markers.length}-${selectedMarkerId || 'none'}`;

  return (
    <div
      className={`fresh-map-wrapper ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #d1fae5',
        boxShadow: '0 2px 12px rgba(16,185,129,0.08)',
        zIndex: 1,
        background: '#f0fdf4',
      }}
    >
      <MapContainer
        center={safeCenter}
        zoom={zoom}
        minZoom={5}
        maxZoom={18}
        scrollWheelZoom
        zoomControl
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <ResizeMapFix watchKey={markerWatchKey} />

        {safeUser && (
          <>
            <Marker position={[safeUser.lat, safeUser.lng]} icon={makeUserIcon()} zIndexOffset={1200}>
              <Popup>
                <div className="text-sm font-semibold text-blue-700">
                  Your Location
                  {safeUser.name && (
                    <div className="mt-1 text-xs font-normal text-gray-500">{safeUser.name}</div>
                  )}
                </div>
              </Popup>
            </Marker>

            {userRadius && userRadius > 0 && userRadius < 200 && (
              <Circle
                center={[safeUser.lat, safeUser.lng]}
                radius={userRadius * 1000}
                pathOptions={{
                  color: '#2563eb',
                  fillColor: '#2563eb',
                  fillOpacity: 0.06,
                  weight: 1.5,
                  dashArray: '6 4',
                }}
              />
            )}
          </>
        )}

        {markers.map((marker) => (
          <ListingMarker
            key={marker.id}
            marker={marker}
            isActive={String(marker.id) === String(selectedMarkerId)}
            focusRequest={focusRequest}
            focusZoom={focusZoom}
            onMarkerClick={onMarkerClick}
          />
        ))}
      </MapContainer>
    </div>
  );
}
