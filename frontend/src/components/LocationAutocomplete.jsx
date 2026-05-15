import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, Navigation, X } from 'lucide-react';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const DEBOUNCE_MS = 500;
const MIN_CHARS = 3;

export default function LocationAutocomplete({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Cari lokasi...',
  label = 'Lokasi',
  showUseMyLocation = true,
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocation = useCallback(async (q) => {
    if (!q || q.length < MIN_CHARS) {
      setResults([]);
      setOpen(false);
      return;
    }

    // Abort previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        q,
        format: 'json',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'id',
      });
      const res = await fetch(`${NOMINATIM_URL}?${params}`, {
        signal: controller.signal,
        headers: { 'Accept-Language': 'id' },
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data || []);
      setOpen(data.length > 0);
      setActiveIndex(-1);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Saran lokasi tidak tersedia. Ketik manual.');
        setResults([]);
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (onChange) onChange(val);

    // Debounce search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocation(val), DEBOUNCE_MS);
  };

  const handleSelect = (item) => {
    const locationData = {
      display_name: item.display_name,
      location_name: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      raw: item,
    };
    setQuery(item.display_name);
    setOpen(false);
    setResults([]);
    if (onChange) onChange(item.display_name);
    if (onSelect) onSelect(locationData);
  };

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung browser ini.');
      return;
    }

    setLocating(true);
    setError('');

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: 'json',
        addressdetails: '1',
      });
      const res = await fetch(`${REVERSE_URL}?${params}`, {
        headers: { 'Accept-Language': 'id' },
      });
      const data = await res.json();

      const displayName = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      setQuery(displayName);
      if (onChange) onChange(displayName);
      if (onSelect) onSelect({
        display_name: displayName,
        location_name: displayName,
        latitude,
        longitude,
        raw: data,
      });
    } catch (err) {
      if (err.code === 1) {
        setError('Izin lokasi ditolak. Ketik lokasi secara manual.');
      } else {
        setError('Gagal mendapatkan lokasi. Coba lagi.');
      }
    } finally {
      setLocating(false);
    }
  };

  const clearInput = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    if (onChange) onChange('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="input-label">{label}</label>}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder}
          className="input-field pl-9 pr-16"
          autoComplete="off"
          required
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />}
          {query && !loading && (
            <button type="button" onClick={clearInput} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Use My Location button */}
      {showUseMyLocation && (
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
        >
          {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
          {locating ? 'Mencari lokasi...' : 'Gunakan lokasi saya saat ini'}
        </button>
      )}

      {/* Error */}
      {error && <p className="mt-1 text-xs text-amber-600">{error}</p>}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg max-h-64 overflow-y-auto">
          {results.map((item, index) => {
            const parts = item.display_name.split(',');
            const mainName = parts[0]?.trim() || item.display_name;
            const subName = parts.slice(1, 3).join(',').trim();

            return (
              <button
                key={item.place_id || index}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors border-b border-gray-50 last:border-0 ${
                  index === activeIndex ? 'bg-emerald-50' : 'hover:bg-gray-50'
                }`}
              >
                <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{mainName}</p>
                  {subName && <p className="text-xs text-gray-500 truncate">{subName}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* No results */}
      {open && results.length === 0 && !loading && query.length >= MIN_CHARS && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg p-4 text-center">
          <p className="text-sm text-gray-500">Lokasi tidak ditemukan</p>
          <p className="text-xs text-gray-400 mt-1">Coba kata kunci lain</p>
        </div>
      )}
    </div>
  );
}
