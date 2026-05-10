export const DEFAULT_LOCATION = { lat: -6.2088, lng: 106.8456, name: 'Jakarta (default)' };

const STORAGE_KEY = 'fresh_user_location';
const KNOWN_AREAS = [
  { name: 'Jakarta', lat: -6.2088, lng: 106.8456 },
  { name: 'Bekasi', lat: -6.2383, lng: 106.9756 },
  { name: 'Depok', lat: -6.4025, lng: 106.7942 },
  { name: 'Bogor', lat: -6.5971, lng: 106.8060 },
  { name: 'Tangerang', lat: -6.1783, lng: 106.6319 },
  { name: 'Bandung', lat: -6.9175, lng: 107.6191 },
];

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLocation(location, fallbackName = 'Your Location') {
  if (!location) return null;
  const lat = toNumber(location.lat ?? location.latitude);
  const lng = toNumber(location.lng ?? location.longitude);
  if (lat === null || lng === null) return null;

  return {
    lat,
    lng,
    name: location.name || inferLocationName({ lat, lng }) || fallbackName,
  };
}

export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const fromLat = toNumber(lat1);
  const fromLon = toNumber(lon1);
  const toLat = toNumber(lat2);
  const toLon = toNumber(lon2);

  if (fromLat === null || fromLon === null || toLat === null || toLon === null) {
    return Number.POSITIVE_INFINITY;
  }

  const earthRadiusKm = 6371;
  const dLat = toRad(toLat - fromLat);
  const dLon = toRad(toLon - fromLon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(2));
}

export function formatDistance(km) {
  const value = Number(km);
  if (!Number.isFinite(value)) return 'Unknown distance';
  if (value < 1) return `${Math.round(value * 1000)} m`;
  if (value < 10) return `${value.toFixed(1)} km`;
  return `${Math.round(value)} km`;
}

export function inferLocationName(location) {
  const lat = toNumber(location?.lat ?? location?.latitude);
  const lng = toNumber(location?.lng ?? location?.longitude);
  if (lat === null || lng === null) return 'Jakarta';

  const nearest = KNOWN_AREAS
    .map((area) => ({
      ...area,
      distance: calculateDistanceKm(lat, lng, area.lat, area.lng),
    }))
    .sort((a, b) => a.distance - b.distance)[0];

  return nearest?.distance <= 35 ? nearest.name : 'Your Location';
}

export function getUserLocation() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(DEFAULT_LOCATION);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        resolve({
          ...location,
          name: inferLocationName(location) || 'Your Location',
        });
      },
      () => resolve(DEFAULT_LOCATION),
      { enableHighAccuracy: true, maximumAge: 300000, timeout: 8000 }
    );
  });
}

export function saveUserLocation(loc) {
  if (typeof localStorage === 'undefined') return;
  const normalized = normalizeLocation(loc);
  if (normalized) localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function loadUserLocation() {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_LOCATION;
    const saved = localStorage.getItem(STORAGE_KEY);
    return normalizeLocation(saved ? JSON.parse(saved) : null) || DEFAULT_LOCATION;
  } catch {
    return DEFAULT_LOCATION;
  }
}

export function loadStoredUserLocation() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const saved = localStorage.getItem(STORAGE_KEY);
    return normalizeLocation(saved ? JSON.parse(saved) : null);
  } catch {
    return null;
  }
}

export function sortByNearest(listings = []) {
  return [...listings].sort((a, b) => {
    const distanceA = Number.isFinite(Number(a.distance_km)) ? Number(a.distance_km) : Number.POSITIVE_INFINITY;
    const distanceB = Number.isFinite(Number(b.distance_km)) ? Number(b.distance_km) : Number.POSITIVE_INFINITY;
    return distanceA - distanceB;
  });
}

export function filterNearbyListings(listings = [], userLocation = DEFAULT_LOCATION, radiusKm = 10) {
  const location = normalizeLocation(userLocation) || DEFAULT_LOCATION;
  const radius = Number(radiusKm);

  return sortByNearest(
    listings
      .map((listing) => {
        const latitude = toNumber(listing.latitude ?? listing.lat);
        const longitude = toNumber(listing.longitude ?? listing.lng);
        const distance = latitude !== null && longitude !== null
          ? calculateDistanceKm(location.lat, location.lng, latitude, longitude)
          : Number.POSITIVE_INFINITY;

        return {
          ...listing,
          latitude,
          longitude,
          distance_km: distance,
        };
      })
      .filter((listing) => !Number.isFinite(radius) || listing.distance_km <= radius)
  );
}
