import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DUMMY_MARKETPLACE_NEARBY, FOOD_CATEGORIES, UNITS } from '../data/dummyData';
import {
  DEFAULT_LOCATION,
  calculateDistanceKm,
  filterNearbyListings,
  formatDistance,
  getUserLocation,
  inferLocationName,
  loadStoredUserLocation,
  saveUserLocation,
  sortByNearest,
} from '../utils/geo';
import FreshMap from '../components/FreshMap';
import * as api from '../api';
import {
  ArrowUpDown,
  BadgePercent,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  List,
  Loader2,
  Map,
  MapPin,
  Navigation,
  Package,
  Plus,
  Save,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Target,
  User,
  X,
} from 'lucide-react';

const RADIUS_OPTIONS = [1, 3, 5, 10, 20, 50];
const DEFAULT_RADIUS_KM = 10;
const MAP_ZOOM = 13;
const LISTING_FOCUS_ZOOM = 15;

const MARKER_COLORS = {
  available: '#10b981',
  reserved: '#f59e0b',
  sold: '#64748b',
};

const statusConfig = {
  Available: { color: 'badge-safe', text: 'text-emerald-700', label: 'Available', markerColor: MARKER_COLORS.available },
  Reserved: { color: 'badge-warning', text: 'text-amber-700', label: 'Reserved', markerColor: MARKER_COLORS.reserved },
  Sold: { color: 'badge-info', text: 'text-blue-700', label: 'Sold', markerColor: MARKER_COLORS.sold },
};

const SORT_OPTIONS = [
  { value: 'nearest', label: 'Nearest' },
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'expiry', label: 'Expiry Soon' },
  { value: 'discount', label: 'Biggest Discount' },
];

function getInitialLocation() {
  return loadStoredUserLocation() || DEFAULT_LOCATION;
}

function hasCoordinates(item) {
  return Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude));
}

function normalizeStatus(status) {
  const value = String(status || 'Available').toLowerCase();
  if (value === 'active' || value === 'available') return 'Available';
  if (value === 'reserved' || value === 'requested' || value === 'pending') return 'Reserved';
  if (value === 'sold' || value === 'completed') return 'Sold';
  return 'Available';
}

function normalizeMarketplaceItem(item, index = 0) {
  const latitude = Number(item.latitude ?? item.lat);
  const longitude = Number(item.longitude ?? item.lng);
  const status = normalizeStatus(item.status);
  const fallbackExpiry = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

  return {
    ...item,
    id: item.id ?? `listing-${index}`,
    food_name: item.food_name || item.title || item.name || 'Marketplace item',
    category: item.category || 'Other',
    quantity: Number(item.quantity ?? 1),
    unit: item.unit || 'pcs',
    location: item.location || item.location_name || 'Seller location',
    location_name: item.location_name || item.location || 'Seller location',
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    price: Number(item.price ?? 0),
    original_price: Number(item.original_price ?? item.originalPrice ?? 0),
    expiry_date: item.expiry_date || item.expiration_date || fallbackExpiry,
    seller: item.seller || item.seller_name || item.user_id || 'F.R.E.S.H seller',
    status,
    description: item.description || '',
  };
}

function normalizeMarketplaceItems(items = []) {
  return items.map(normalizeMarketplaceItem).filter(hasCoordinates);
}

function getDiscountPercent(item) {
  if (!item.original_price || item.original_price <= item.price) return 0;
  return Math.round(((item.original_price - item.price) / item.original_price) * 100);
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  });
}

function getDaysUntil(date) {
  const expiry = new Date(date);
  if (Number.isNaN(expiry.getTime())) return null;
  return Math.ceil((expiry - new Date()) / 86400000);
}

class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{ height: this.props.height || 420 }}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-gray-100 text-gray-400"
        >
          <MapPin className="h-10 w-10" />
          <p className="text-sm font-medium">Map could not be loaded</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs font-semibold text-emerald-600 underline"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function MapView({
  center,
  markers,
  userLocation,
  userRadius,
  height = 480,
  selectedListingId,
  focusRequest,
  onMarkerClick,
}) {
  const mapKey = Array.isArray(center)
    ? `marketplace-map-${Number(center[0]).toFixed(3)}-${Number(center[1]).toFixed(3)}`
    : 'marketplace-map-default';

  return (
    <MapErrorBoundary height={height}>
      <FreshMap
        key={mapKey}
        center={center}
        zoom={MAP_ZOOM}
        markers={markers}
        userLocation={userLocation}
        userRadius={userRadius}
        height={height}
        selectedMarkerId={selectedListingId}
        focusRequest={focusRequest}
        focusZoom={LISTING_FOCUS_ZOOM}
        onMarkerClick={onMarkerClick}
      />
    </MapErrorBoundary>
  );
}

export default function MarketplacePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState('split');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [nearbyOnly, setNearbyOnly] = useState(true);
  const [sortBy, setSortBy] = useState('nearest');
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(getInitialLocation);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [form, setForm] = useState({
    food_name: '',
    category: 'Fruit',
    quantity: 1,
    unit: 'buah',
    location: '',
    price: '',
    original_price: '',
    expiry_date: new Date().toISOString().slice(0, 10),
    description: '',
  });

  const requestUserLocation = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLocating(true);

    try {
      const location = await getUserLocation();
      const isDefault =
        location.lat === DEFAULT_LOCATION.lat &&
        location.lng === DEFAULT_LOCATION.lng;
      const namedLocation = {
        ...location,
        name: isDefault ? DEFAULT_LOCATION.name : inferLocationName(location),
      };

      setUserLocation(namedLocation);
      setLocationMessage(isDefault ? 'Using Jakarta fallback location.' : 'Using your current location.');
      if (!isDefault) saveUserLocation(namedLocation);
    } catch {
      setUserLocation(DEFAULT_LOCATION);
      setLocationMessage('Using Jakarta fallback location.');
    } finally {
      if (!silent) setLocating(false);
    }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api.getMarketplaceItems();
      const normalized = normalizeMarketplaceItems(Array.isArray(data) ? data : []);
      setItems(normalized.length ? normalized : normalizeMarketplaceItems(DUMMY_MARKETPLACE_NEARBY));
    } catch {
      setItems(normalizeMarketplaceItems(DUMMY_MARKETPLACE_NEARBY));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!loadStoredUserLocation()) {
      requestUserLocation({ silent: true });
    }
  }, [requestUserLocation]);

  const itemsWithDistance = useMemo(() => {
    const lat = userLocation?.lat ?? DEFAULT_LOCATION.lat;
    const lng = userLocation?.lng ?? DEFAULT_LOCATION.lng;

    return items.map((item) => ({
      ...item,
      distance_km: calculateDistanceKm(lat, lng, item.latitude, item.longitude),
    }));
  }, [items, userLocation]);

  const categories = useMemo(() => {
    const all = new Set([...FOOD_CATEGORIES, ...itemsWithDistance.map((item) => item.category).filter(Boolean)]);
    return [...all];
  }, [itemsWithDistance]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return itemsWithDistance.filter((item) => {
      const matchesSearch = !query || item.food_name.toLowerCase().includes(query);
      const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
      const matchesCategory = filterCategory === 'All' || item.category === filterCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [filterCategory, filterStatus, itemsWithDistance, searchQuery]);

  const visibleItems = useMemo(() => {
    const location = userLocation || DEFAULT_LOCATION;
    const radiusFiltered = nearbyOnly
      ? filterNearbyListings(filteredItems, location, radiusKm)
      : sortByNearest(filteredItems);

    if (sortBy === 'nearest') return sortByNearest(radiusFiltered);
    if (sortBy === 'cheapest') {
      return [...radiusFiltered].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }
    if (sortBy === 'expiry') {
      return [...radiusFiltered].sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
    }
    if (sortBy === 'discount') {
      return [...radiusFiltered].sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));
    }

    return radiusFiltered;
  }, [filteredItems, nearbyOnly, radiusKm, sortBy, userLocation]);

  const closestItem = useMemo(() => sortByNearest(filteredItems).find((item) => Number.isFinite(item.distance_km)), [filteredItems]);
  const nearestVisibleId = visibleItems[0]?.id ?? null;
  const userLocationName = userLocation?.name || inferLocationName(userLocation) || 'Jakarta';

  const scrollListingIntoView = useCallback((id) => {
    window.setTimeout(() => {
      const element = document.getElementById(`marketplace-card-${id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  }, []);

  const focusListing = useCallback((item, { switchToSplit = false } = {}) => {
    if (!item) return;
    if (switchToSplit && viewMode === 'list') setViewMode('split');
    setSelectedListingId(item.id);
    setFocusRequest((value) => value + 1);
    scrollListingIntoView(item.id);
  }, [scrollListingIntoView, viewMode]);

  const handleMarkerClick = useCallback((id) => {
    setSelectedListingId(id);
    scrollListingIntoView(id);
  }, [scrollListingIntoView]);

  const handleReserve = useCallback((id) => {
    setItems((prev) =>
      prev.map((item) => item.id === id && item.status === 'Available'
        ? { ...item, status: 'Reserved' }
        : item
      )
    );
    setSelectedListingId(id);
  }, []);

  const mapMarkers = useMemo(() =>
    visibleItems.map((item) => ({
      id: item.id,
      lat: item.latitude,
      lng: item.longitude,
      color: statusConfig[item.status]?.markerColor || MARKER_COLORS.available,
      popupContent: (
        <ListingPopup
          item={item}
          onViewDetail={() => focusListing(item)}
          onReserve={() => handleReserve(item.id)}
        />
      ),
    })),
  [focusListing, handleReserve, visibleItems]);

  const mapCenter = [
    userLocation?.lat ?? DEFAULT_LOCATION.lat,
    userLocation?.lng ?? DEFAULT_LOCATION.lng,
  ];

  const useLargerRadius = () => {
    const nextRadius = RADIUS_OPTIONS.find((option) => option > radiusKm);
    if (nextRadius) {
      setNearbyOnly(true);
      setRadiusKm(nextRadius);
      return;
    }
    setNearbyOnly(false);
  };

  async function handleSubmit(e) {
    e.preventDefault();

    const newItem = normalizeMarketplaceItem({
      ...form,
      id: `m${Date.now()}`,
      quantity: Number(form.quantity),
      price: Number(form.price),
      original_price: Number(form.original_price) || 0,
      status: 'Available',
      seller: 'You',
      latitude: userLocation?.lat ?? DEFAULT_LOCATION.lat,
      longitude: userLocation?.lng ?? DEFAULT_LOCATION.lng,
      location_name: form.location || userLocationName,
      location: form.location || userLocationName,
    });

    setItems((prev) => [newItem, ...prev]);
    setSelectedListingId(newItem.id);
    setShowForm(false);
    setForm({
      food_name: '',
      category: 'Fruit',
      quantity: 1,
      unit: 'buah',
      location: '',
      price: '',
      original_price: '',
      expiry_date: new Date().toISOString().slice(0, 10),
      description: '',
    });

    try {
      await api.createMarketplaceItem({
        ...newItem,
        title: newItem.food_name,
        type: 'sale',
        location: newItem.location_name,
      });
    } catch {
      // Local optimistic item keeps the marketplace usable while the backend is offline.
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="text-gray-500">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 lg:pb-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-800">
            <ShoppingBag className="h-6 w-6 text-pink-500" />
            Food Marketplace
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Location-aware surplus food listings sorted by relevance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
            {[
              { value: 'split', icon: SlidersHorizontal, label: 'Split' },
              { value: 'list', icon: List, label: 'List' },
              { value: 'map', icon: Map, label: 'Map' },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setViewMode(value)}
                title={label}
                className={`rounded-lg p-2 transition-all ${viewMode === value ? 'bg-white text-emerald-600 shadow' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary py-2.5 text-sm">
            <Plus className="h-4 w-4" /> Add Listing
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by food name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-11"
            />
          </div>

          <button
            onClick={() => requestUserLocation()}
            disabled={locating}
            className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-60"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            {locating ? 'Locating...' : 'Use My Location'}
          </button>

          <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setNearbyOnly(true)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${nearbyOnly ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Nearby only
            </button>
            <button
              type="button"
              onClick={() => setNearbyOnly(false)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${!nearbyOnly ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Show all
            </button>
          </div>

          <button
            onClick={() => setShowFilters((value) => !value)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${showFilters ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'}`}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <SelectControl icon={ArrowUpDown} value={sortBy} onChange={setSortBy}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Sort by {option.label}
              </option>
            ))}
          </SelectControl>

          <SelectControl icon={MapPin} value={radiusKm} onChange={(value) => setRadiusKm(Number(value))} disabled={!nearbyOnly}>
            {RADIUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                Within {option} km
              </option>
            ))}
          </SelectControl>

          <SelectControl icon={Package} value={filterCategory} onChange={setFilterCategory}>
            <option value="All">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </SelectControl>

          <SelectControl icon={CheckCircle2} value={filterStatus} onChange={setFilterStatus}>
            <option value="All">All Status</option>
            <option value="Available">Available</option>
            <option value="Reserved">Reserved</option>
            <option value="Sold">Sold</option>
          </SelectControl>

          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterCategory('All');
              setFilterStatus('All');
              setSortBy('nearest');
              setRadiusKm(DEFAULT_RADIUS_KM);
              setNearbyOnly(true);
            }}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-emerald-300 hover:text-emerald-700"
          >
            Reset filters
          </button>
        </div>

        {showFilters && (
          <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm md:grid-cols-3">
            <SummaryTile
              icon={Target}
              label={nearbyOnly ? `Showing ${visibleItems.length} nearest listings within ${radiusKm} km` : `Showing all ${visibleItems.length} listings`}
              value={visibleItems.length ? 'Map and list are synced' : 'No matching markers'}
            />
            <SummaryTile
              icon={MapPin}
              label={closestItem ? `Closest item is ${formatDistance(closestItem.distance_km)} away` : 'Closest item unavailable'}
              value={closestItem?.food_name || 'Try a wider search'}
            />
            <SummaryTile
              icon={Navigation}
              label={`Your location: ${userLocationName}`}
              value={locationMessage || `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`}
            />
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          icon={Target}
          label={nearbyOnly ? `Showing ${visibleItems.length} nearest listings within ${radiusKm} km` : `Showing all ${visibleItems.length} listings`}
          value="Cards and markers use the same filtered data"
        />
        <SummaryTile
          icon={MapPin}
          label={closestItem ? `Closest item is ${formatDistance(closestItem.distance_km)} away` : 'Closest item unavailable'}
          value={closestItem?.food_name || 'Try increasing your radius'}
        />
        <SummaryTile
          icon={Navigation}
          label={`Your location: ${userLocationName}`}
          value={locationMessage || 'Saved or fallback location'}
        />
      </div>

      {viewMode === 'split' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-start">
          <MapPanel
            center={mapCenter}
            markers={mapMarkers}
            userLocation={userLocation}
            userRadius={nearbyOnly ? radiusKm : null}
            selectedListingId={selectedListingId}
            focusRequest={focusRequest}
            onMarkerClick={handleMarkerClick}
            markerCount={mapMarkers.length}
          />

          <ListingPanel
            items={visibleItems}
            nearestVisibleId={nearestVisibleId}
            selectedListingId={selectedListingId}
            onFocusListing={(item) => focusListing(item)}
            onViewOnMap={(item) => focusListing(item)}
            onReserve={handleReserve}
            onUseLargerRadius={useLargerRadius}
            onShowAll={() => setNearbyOnly(false)}
          />
        </div>
      )}

      {viewMode === 'list' && (
        <ListingGrid
          items={visibleItems}
          nearestVisibleId={nearestVisibleId}
          selectedListingId={selectedListingId}
          onFocusListing={(item) => focusListing(item, { switchToSplit: true })}
          onViewOnMap={(item) => focusListing(item, { switchToSplit: true })}
          onReserve={handleReserve}
          onUseLargerRadius={useLargerRadius}
          onShowAll={() => setNearbyOnly(false)}
        />
      )}

      {viewMode === 'map' && (
        <MapPanel
          center={mapCenter}
          markers={mapMarkers}
          userLocation={userLocation}
          userRadius={nearbyOnly ? radiusKm : null}
          selectedListingId={selectedListingId}
          focusRequest={focusRequest}
          onMarkerClick={handleMarkerClick}
          markerCount={mapMarkers.length}
          height={600}
        />
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800">Add to Marketplace</h2>
              <button onClick={() => setShowForm(false)} className="btn-icon hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="input-label">Food Name</label>
                <input value={form.food_name} onChange={(e) => setForm({ ...form, food_name: e.target.value })} className="input-field" required placeholder="e.g. Pisang Cavendish" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                    {FOOD_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Quantity</label>
                  <div className="flex gap-2">
                    <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input-field flex-1" />
                    <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input-field w-24">
                      {UNITS.map((unit) => <option key={unit}>{unit}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Selling Price (Rp)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-field" required placeholder="8000" />
                </div>
                <div>
                  <label className="input-label">Original Price (Rp)</label>
                  <input type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} className="input-field" placeholder="15000" />
                </div>
              </div>

              <div>
                <label className="input-label">Location Name</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-field" required placeholder="e.g. Bekasi Selatan" />
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
                <Navigation className="h-4 w-4 flex-shrink-0" />
                New listing pin uses: <strong>{userLocationName}</strong>
              </div>

              <div>
                <label className="input-label">Expiry Date</label>
                <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="input-field" required />
              </div>

              <div>
                <label className="input-label">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field resize-none" rows="2" placeholder="Describe your food item..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">
                  <Save className="h-4 w-4" /> Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectControl({ icon: Icon, value, onChange, children, disabled = false }) {
  return (
    <div className={disabled ? 'relative opacity-60' : 'relative'}>
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="input-field min-w-full appearance-none pl-9 pr-9 text-sm disabled:cursor-not-allowed"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white/80 p-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-800">{label}</p>
        <p className="truncate text-xs text-gray-500">{value}</p>
      </div>
    </div>
  );
}

function MapPanel({
  center,
  markers,
  userLocation,
  userRadius,
  selectedListingId,
  focusRequest,
  onMarkerClick,
  markerCount,
  height = 500,
}) {
  return (
    <section className="card p-3">
      <MapView
        center={center}
        markers={markers}
        userLocation={userLocation}
        userRadius={userRadius}
        selectedListingId={selectedListingId}
        focusRequest={focusRequest}
        onMarkerClick={onMarkerClick}
        height={height}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-gray-500">
        <span>OpenStreetMap - {markerCount} synced listing markers</span>
        <div className="flex flex-wrap items-center gap-3">
          <LegendDot color={MARKER_COLORS.available} label="Available" />
          <LegendDot color={MARKER_COLORS.reserved} label="Reserved" />
          <LegendDot color={MARKER_COLORS.sold} label="Sold" />
          <LegendDot color="#2563eb" label="Your Location" />
        </div>
      </div>
    </section>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function ListingPanel(props) {
  return (
    <section className="min-h-[300px] space-y-3 overflow-y-auto pr-1 lg:max-h-[585px]">
      {props.items.length > 0 ? (
        props.items.map((item) => (
          <ItemCard key={item.id} item={item} compact {...props} />
        ))
      ) : (
        <EmptyState onUseLargerRadius={props.onUseLargerRadius} onShowAll={props.onShowAll} />
      )}
    </section>
  );
}

function ListingGrid(props) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {props.items.length > 0 ? (
        props.items.map((item) => (
          <ItemCard key={item.id} item={item} {...props} />
        ))
      ) : (
        <div className="sm:col-span-2 xl:col-span-3">
          <EmptyState onUseLargerRadius={props.onUseLargerRadius} onShowAll={props.onShowAll} />
        </div>
      )}
    </section>
  );
}

function ItemCard({
  item,
  compact = false,
  nearestVisibleId,
  selectedListingId,
  onFocusListing,
  onViewOnMap,
  onReserve,
}) {
  const discount = getDiscountPercent(item);
  const status = statusConfig[item.status] || statusConfig.Available;
  const daysLeft = getDaysUntil(item.expiry_date);
  const isNearest = item.id === nearestVisibleId;
  const isSelected = String(item.id) === String(selectedListingId);

  return (
    <article
      id={`marketplace-card-${item.id}`}
      role="button"
      tabIndex={0}
      onClick={() => onFocusListing(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onFocusListing(item);
      }}
      className={`card cursor-pointer p-0 transition-all duration-200 ${isSelected ? 'border-emerald-400 ring-2 ring-emerald-100' : 'hover:-translate-y-0.5'} ${compact ? 'overflow-hidden' : 'overflow-hidden'}`}
    >
      <div className="flex gap-3 p-4">
        <div className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700">
          <span className="text-xl font-black">{item.category?.slice(0, 2).toUpperCase() || 'FO'}</span>
          <span className="mt-1 text-[10px] font-semibold text-emerald-600">Food</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-extrabold text-gray-800">{item.food_name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="badge badge-info text-[10px]">{item.category}</span>
                <span className={`badge ${status.color} text-[10px]`}>{status.label}</span>
                {isNearest && (
                  <span className="rounded-full bg-pink-100 px-2.5 py-1 text-[10px] font-bold text-pink-700">
                    Closest to you
                  </span>
                )}
              </div>
            </div>

            {discount > 0 && (
              <span className="flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-600">
                <BadgePercent className="h-3 w-3" />
                -{discount}%
              </span>
            )}
          </div>

          <div className="grid gap-1.5 text-xs text-gray-500 sm:grid-cols-2">
            <InfoLine icon={Package} text={`${item.quantity} ${item.unit}`} />
            <InfoLine icon={Clock} text={daysLeft === null ? item.expiry_date : daysLeft <= 0 ? 'Expired' : `${daysLeft}d until expiry`} danger={daysLeft !== null && daysLeft <= 1} />
            <InfoLine icon={User} text={item.seller} />
            <InfoLine icon={MapPin} text={`${formatDistance(item.distance_km)} away`} strong />
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
            <Store className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate">{item.location_name}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/70 px-4 py-3">
        <div>
          <p className="text-lg font-extrabold text-emerald-600">{formatCurrency(item.price)}</p>
          {item.original_price > 0 && (
            <p className="text-xs text-gray-400 line-through">{formatCurrency(item.original_price)}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onViewOnMap(item);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100"
          >
            <MapPin className="h-3.5 w-3.5" />
            View on Map
          </button>
          <button
            type="button"
            disabled={item.status !== 'Available'}
            onClick={(event) => {
              event.stopPropagation();
              onReserve(item.id);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Reserve
          </button>
        </div>
      </div>
    </article>
  );
}

function InfoLine({ icon: Icon, text, danger = false, strong = false }) {
  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${danger ? 'font-semibold text-red-500' : strong ? 'font-semibold text-blue-600' : ''}`}>
      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-current" />
      <span className="truncate">{text}</span>
    </div>
  );
}

function ListingPopup({ item, onViewDetail, onReserve }) {
  const status = statusConfig[item.status] || statusConfig.Available;

  return (
    <div className="min-w-[220px] space-y-2 text-sm">
      <div>
        <p className="font-extrabold text-gray-800">{item.food_name}</p>
        <p className="text-xs text-gray-500">{item.location_name}</p>
      </div>

      <div className="grid gap-1 text-xs text-gray-600">
        <span>Price: <strong className="text-emerald-600">{formatCurrency(item.price)}</strong></span>
        <span>Distance: <strong>{formatDistance(item.distance_km)} away</strong></span>
        <span>Expiry date: <strong>{item.expiry_date}</strong></span>
        <span>Status: <strong className={status.text}>{status.label}</strong></span>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onViewDetail}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-bold text-blue-700"
        >
          <Eye className="h-3 w-3" />
          View Detail
        </button>
        <button
          type="button"
          disabled={item.status !== 'Available'}
          onClick={onReserve}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-bold text-white disabled:bg-gray-200 disabled:text-gray-500"
        >
          Reserve
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onUseLargerRadius, onShowAll }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
      <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-gray-300" />
      <p className="font-bold text-gray-700">No nearby marketplace items found.</p>
      <p className="mt-1 text-sm text-gray-400">No nearby items found within this radius. Try increasing your radius.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button onClick={onUseLargerRadius} className="btn-secondary py-2 text-sm">
          Use larger radius
        </button>
        <button onClick={onShowAll} className="btn-primary py-2 text-sm">
          Show all listings
        </button>
      </div>
    </div>
  );
}
