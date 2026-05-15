import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { DUMMY_MARKETPLACE_NEARBY, FOOD_CATEGORIES, UNITS } from '../data/dummyData';
import { useAuth } from '../context/AuthContext';
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
import LocationAutocomplete from '../components/LocationAutocomplete';
import FeatureGate from '../components/FeatureGate';
import * as api from '../api';
import { getCurrentUserId } from '../api';
import { canCreateMarketplaceListing, getPlanLimit, incrementUsage, isUnlimited, useSubscription } from '../services/subscription';
import {
  ArrowUpDown,
  BadgePercent,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  Inbox,
  List,
  Loader2,
  Map,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Plus,
  Save,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Target,
  Trash2,
  User,
  Users,
  X,
  XCircle,
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
  const { isDemoMode } = useAuth();
  const { plan } = useSubscription();
  const location = useLocation();
  const prefillListing = location.state?.prefillListing;
  const currentUserId = getCurrentUserId();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'mine' ? 'mine' : 'browse';
  const setActiveTab = (tab) => setSearchParams(tab === 'browse' ? {} : { tab }, { replace: true });
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
  const [limitMessage, setLimitMessage] = useState('');
  const [focusRequest, setFocusRequest] = useState(0);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }
  const [reserveTarget, setReserveTarget] = useState(null); // item to reserve
  // My items state
  const [myItems, setMyItems] = useState([]);
  const [myReservations, setMyReservations] = useState([]); // reservations I made
  const [myLoading, setMyLoading] = useState(false);
  const [requestsByItem, setRequestsByItem] = useState({}); // {itemId: [reservations]}
  const [openRequestsFor, setOpenRequestsFor] = useState(null); // itemId whose requests panel is open
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
      setItems(normalized.length || !isDemoMode ? normalized : normalizeMarketplaceItems(DUMMY_MARKETPLACE_NEARBY));
    } catch {
      setItems(isDemoMode ? normalizeMarketplaceItems(DUMMY_MARKETPLACE_NEARBY) : []);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!loadStoredUserLocation()) {
      requestUserLocation({ silent: true });
    }
  }, [requestUserLocation]);

  useEffect(() => {
    if (!prefillListing) return;
    setForm({
      food_name: prefillListing.food_name || prefillListing.name || '',
      category: prefillListing.category || 'Fruit',
      quantity: prefillListing.quantity || 1,
      unit: prefillListing.unit || 'buah',
      location: userLocation?.name || '',
      price: '',
      original_price: '',
      expiry_date: prefillListing.expiry_date || prefillListing.expiration_date || new Date().toISOString().slice(0, 10),
      description: prefillListing.notes || prefillListing.recommendation || '',
      food_id: prefillListing.id,
    });
    setShowForm(true);
  }, [prefillListing, userLocation?.name]);

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
    // Exclude current user's own listings from the browse view.
    const notMine = filteredItems.filter((it) => String(it.user_id ?? '') !== String(currentUserId));
    const radiusFiltered = nearbyOnly
      ? filterNearbyListings(notMine, location, radiusKm)
      : sortByNearest(notMine);

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
  }, [currentUserId, filteredItems, nearbyOnly, radiusKm, sortBy, userLocation]);

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

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadMyItems = useCallback(async () => {
    setMyLoading(true);
    try {
      const [mine, reservations] = await Promise.all([
        api.getMyMarketplaceItems().catch(() => []),
        api.getMyMarketplaceReservations().catch(() => []),
      ]);
      setMyItems(Array.isArray(mine) ? mine : []);
      setMyReservations(Array.isArray(reservations) ? reservations : []);
    } finally {
      setMyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'mine') loadMyItems();
  }, [activeTab, loadMyItems]);

  const openReserveModal = useCallback((item) => {
    if (!item) return;
    if (String(item.user_id) === String(currentUserId)) {
      showToast('error', 'Anda tidak bisa reserve item sendiri.');
      return;
    }
    if (item.status !== 'Available') {
      showToast('error', `Item tidak tersedia (status: ${item.status}).`);
      return;
    }
    setReserveTarget(item);
  }, [currentUserId, showToast]);

  const handleReserveSubmit = useCallback(async (payload) => {
    if (!reserveTarget) return;
    try {
      await api.reserveMarketplaceItem(reserveTarget.id, payload);
      showToast('success', 'Reservasi berhasil dikirim ke seller.');
      setReserveTarget(null);
      // Optimistic visual update on browse list.
      setItems((prev) =>
        prev.map((it) => (it.id === reserveTarget.id ? { ...it, status: 'Available' } : it))
      );
    } catch (err) {
      const msg = err?.data?.detail || err?.message || 'Gagal membuat reservasi.';
      showToast('error', msg);
    }
  }, [reserveTarget, showToast]);

  const loadRequestsForItem = useCallback(async (itemId) => {
    try {
      const list = await api.getMarketplaceReservations(itemId);
      setRequestsByItem((prev) => ({ ...prev, [itemId]: Array.isArray(list) ? list : [] }));
    } catch (err) {
      showToast('error', err?.data?.detail || 'Gagal memuat permintaan.');
    }
  }, [showToast]);

  const toggleRequestsPanel = useCallback((itemId) => {
    setOpenRequestsFor((prev) => {
      const next = prev === itemId ? null : itemId;
      if (next) loadRequestsForItem(next);
      return next;
    });
  }, [loadRequestsForItem]);

  const handleReservationAction = useCallback(async (reservationId, action, itemId) => {
    try {
      const actionFn = {
        accept: api.acceptMarketplaceReservation,
        reject: api.rejectMarketplaceReservation,
        complete: api.completeMarketplaceReservation,
      }[action];
      if (!actionFn) return;
      await actionFn(reservationId);
      showToast('success', `Reservation ${action}ed.`);
      await Promise.all([loadRequestsForItem(itemId), loadMyItems()]);
    } catch (err) {
      showToast('error', err?.data?.detail || `Gagal ${action} reservasi.`);
    }
  }, [loadMyItems, loadRequestsForItem, showToast]);

  const handleMyItemStatusChange = useCallback(async (itemId, status) => {
    try {
      await api.updateMarketplaceStatus(itemId, status);
      showToast('success', `Status diubah ke ${status}.`);
      loadMyItems();
    } catch (err) {
      showToast('error', err?.data?.detail || 'Gagal mengubah status.');
    }
  }, [loadMyItems, showToast]);

  const handleMyItemDelete = useCallback(async (itemId) => {
    if (!window.confirm('Yakin ingin menghapus listing ini? Semua reservasi yang terkait juga akan dihapus.')) return;
    try {
      await api.deleteMarketplaceItem(itemId);
      showToast('success', 'Listing dihapus.');
      loadMyItems();
    } catch (err) {
      showToast('error', err?.data?.detail || 'Gagal menghapus listing.');
    }
  }, [loadMyItems, showToast]);

  const handleReserve = useCallback((id) => {
    const target = items.find((it) => it.id === id);
    if (target) openReserveModal(target);
  }, [items, openReserveModal]);

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
    if (!canCreateMarketplaceListing()) {
      setLimitMessage('Batas listing marketplace tercapai. Upgrade paket Anda untuk menambah listing.');
      setShowForm(false);
      return;
    }

    const newItem = normalizeMarketplaceItem({
      ...form,
      id: `m${Date.now()}`,
      quantity: Number(form.quantity),
      price: Number(form.price),
      original_price: Number(form.original_price) || 0,
      status: 'Available',
      seller: 'You',
      latitude: form._lat || userLocation?.lat || DEFAULT_LOCATION.lat,
      longitude: form._lng || userLocation?.lng || DEFAULT_LOCATION.lng,
      location_name: form.location || userLocationName,
      location: form.location || userLocationName,
    });

    try {
      const saved = await api.createMarketplaceItem({
        ...newItem,
        food_id: form.food_id,
        title: newItem.food_name,
        type: 'sale',
        location: newItem.location_name,
      });
      const normalized = normalizeMarketplaceItem(saved);
      setItems((prev) => [normalized, ...prev]);
      setSelectedListingId(normalized.id);
      incrementUsage('marketplace_listings');
      showToast('success', 'Listing berhasil dibuat.');
      loadItems();
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
        _lat: null,
        _lng: null,
      });
      // Refresh my items if we're on that tab
      if (activeTab === 'mine') loadMyItems();
    } catch (err) {
      console.error('Create marketplace failed:', err);
      const msg = err?.data?.detail || err?.message || 'Gagal membuat listing. Coba lagi.';
      showToast('error', typeof msg === 'string' ? msg : 'Gagal membuat listing.');
    }
  }

  const marketplaceLimit = getPlanLimit('max_marketplace_listings');

  const pendingRequestsCount = useMemo(
    () => Object.values(requestsByItem).reduce(
      (acc, list) => acc + (Array.isArray(list) ? list.filter((r) => r.status === 'pending').length : 0),
      0,
    ),
    [requestsByItem],
  );

  const mySummary = useMemo(() => {
    const total = myItems.length;
    const available = myItems.filter((i) => (i.status || '').toLowerCase() === 'available').length;
    const reserved = myItems.filter((i) => (i.status || '').toLowerCase() === 'reserved').length;
    const sold = myItems.filter((i) => (i.status || '').toLowerCase() === 'sold').length;
    return { total, available, reserved, sold };
  }, [myItems]);

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
          {activeTab === 'browse' && (
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
          )}
          <button
            onClick={() => {
              setLimitMessage('');
              if (!canCreateMarketplaceListing()) {
                setLimitMessage('Marketplace listing limit reached. Upgrade your plan to create more listings.');
                return;
              }
              setShowForm(true);
            }}
            disabled={!canCreateMarketplaceListing()}
            className="btn-primary py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Add Listing
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="inline-flex rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('browse')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'browse' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Search className="h-4 w-4" />
          Browse Marketplace
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mine')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'mine' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Store className="h-4 w-4" />
          See My Marketplace
        </button>
      </div>

      {toast && (
        <div
          className={`fixed right-4 top-20 z-[100] max-w-sm rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {activeTab === 'mine' ? (
        <MyMarketplaceView
          items={myItems}
          reservations={myReservations}
          requestsByItem={requestsByItem}
          openRequestsFor={openRequestsFor}
          loading={myLoading}
          summary={mySummary}
          onOpenRequests={toggleRequestsPanel}
          onStatusChange={handleMyItemStatusChange}
          onDelete={handleMyItemDelete}
          onReservationAction={handleReservationAction}
          onCreate={() => {
            setLimitMessage('');
            if (!canCreateMarketplaceListing()) {
              setLimitMessage('Marketplace listing limit reached. Upgrade your plan to create more listings.');
              return;
            }
            setShowForm(true);
          }}
          onReload={loadMyItems}
        />
      ) : (
      <>

      {/* Browse tab plan info */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card border-pink-100 bg-pink-50/70">
          <p className="text-sm font-bold text-gray-800">Marketplace access: {plan.plan_name}</p>
          <p className="mt-1 text-xs text-gray-600">
            Browsing is open to all plans. Listing limit: {isUnlimited(marketplaceLimit) ? 'Unlimited' : marketplaceLimit}.
          </p>
        </div>
        <FeatureGate
          feature="marketplace_bulk_listing"
          requiredPlan="business_pro"
          title="Business surplus tools locked"
          description="Bulk surplus listing, suggested discount, listing analytics, and orders management are available on Business Pro."
        >
          <div className="card border-blue-100 bg-blue-50">
            <p className="text-sm font-bold text-gray-800">Business Pro seller tools</p>
            <p className="mt-1 text-xs text-gray-600">Bulk listing, suggested discount, orders, and listing analytics are active.</p>
          </div>
        </FeatureGate>
      </div>

      {limitMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
          {limitMessage} <a href="/pricing" className="ml-1 underline">View Pricing</a>
        </div>
      )}

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
      </>
      )}

      {reserveTarget && (
        <ReserveModal
          item={reserveTarget}
          onClose={() => setReserveTarget(null)}
          onSubmit={handleReserveSubmit}
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

              <LocationAutocomplete
                value={form.location}
                onChange={(val) => setForm({ ...form, location: val })}
                onSelect={(loc) => setForm({ ...form, location: loc.location_name, _lat: loc.latitude, _lng: loc.longitude })}
                placeholder="Cari lokasi, mis. Bekasi Selatan"
                label="Lokasi"
              />

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


// ─── My Marketplace View ─────────────────────────────────────────────────────

function MyMarketplaceView({
  items,
  reservations,
  requestsByItem,
  openRequestsFor,
  loading,
  summary,
  onOpenRequests,
  onStatusChange,
  onDelete,
  onReservationAction,
  onCreate,
  onReload,
}) {
  const pendingIncomingCount = Object.values(requestsByItem).reduce(
    (acc, list) => acc + (Array.isArray(list) ? list.filter((r) => r.status === 'pending').length : 0),
    0,
  );
  const activeReservations = reservations.filter((r) => r.status === 'pending' || r.status === 'accepted');

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MyStatCard icon={Package} label="Total Listings" value={summary.total} color="text-emerald-600" bg="bg-emerald-50" />
        <MyStatCard icon={CheckCircle} label="Available" value={summary.available} color="text-emerald-600" bg="bg-emerald-50" />
        <MyStatCard icon={Clock} label="Reserved" value={summary.reserved} color="text-amber-600" bg="bg-amber-50" />
        <MyStatCard icon={ShoppingBag} label="Sold" value={summary.sold} color="text-blue-600" bg="bg-blue-50" />
        <MyStatCard icon={Inbox} label="Pending Requests" value={pendingIncomingCount} color="text-pink-600" bg="bg-pink-50" />
      </div>

      {activeReservations.length > 0 && (
        <section className="card border-emerald-100 bg-emerald-50/40">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <Users className="h-4 w-4 text-emerald-600" />
              Reservasi yang Anda buat ({activeReservations.length})
            </h3>
          </div>
          <div className="space-y-2">
            {activeReservations.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-white p-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-800">Item #{r.marketplace_item_id}</p>
                  <p className="text-xs text-gray-500">
                    Qty {r.quantity_requested} · Status <span className="font-semibold">{r.status}</span>
                  </p>
                </div>
                <span className={`badge ${r.status === 'accepted' ? 'badge-info' : 'badge-warning'}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <Store className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="font-bold text-gray-700">Belum ada listing.</p>
          <p className="mt-1 text-sm text-gray-400">Mulai jual surplus Anda ke komunitas F.R.E.S.H.</p>
          <button onClick={onCreate} className="btn-primary mt-5 py-2 text-sm">
            <Plus className="h-4 w-4" /> Create Listing
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <MyMarketplaceItemCard
              key={item.id}
              item={item}
              isRequestsOpen={openRequestsFor === item.id}
              requests={requestsByItem[item.id] || []}
              onOpenRequests={() => onOpenRequests(item.id)}
              onStatusChange={(status) => onStatusChange(item.id, status)}
              onDelete={() => onDelete(item.id)}
              onReservationAction={(rid, action) => onReservationAction(rid, action, item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MyStatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className={`card ${bg} border-0`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-extrabold text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function MyMarketplaceItemCard({
  item,
  isRequestsOpen,
  requests,
  onOpenRequests,
  onStatusChange,
  onDelete,
  onReservationAction,
}) {
  const [actionOpen, setActionOpen] = useState(false);
  const status = statusConfig[item.status] || statusConfig.Available;
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <article className="card p-0">
      <div className="flex flex-wrap items-start gap-3 p-4">
        <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700">
          <span className="text-lg font-black">{item.category?.slice(0, 2).toUpperCase() || 'FO'}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-extrabold text-gray-800">{item.food_name}</h3>
            <span className={`badge ${status.color} text-[10px]`}>{status.label}</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-700">
                {pendingCount} pending
              </span>
            )}
          </div>
          <div className="grid gap-1 text-xs text-gray-500 sm:grid-cols-2">
            <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{item.quantity} {item.unit}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{item.expiry_date || item.expiration_date}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{item.location_name || item.location}</span>
            <span className="flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" />Rp{Number(item.price || 0).toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenRequests}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100"
          >
            <Inbox className="h-3.5 w-3.5" />
            View Requests{requests.length ? ` (${requests.length})` : ''}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setActionOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Actions <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {actionOpen && (
              <div
                className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
                onMouseLeave={() => setActionOpen(false)}
              >
                <DropdownAction label="Mark Available" onClick={() => { setActionOpen(false); onStatusChange('Available'); }} />
                <DropdownAction label="Mark Reserved" onClick={() => { setActionOpen(false); onStatusChange('Reserved'); }} />
                <DropdownAction label="Mark Sold" onClick={() => { setActionOpen(false); onStatusChange('Sold'); }} />
                <DropdownAction label="Mark Cancelled" onClick={() => { setActionOpen(false); onStatusChange('Cancelled'); }} />
                <div className="border-t border-gray-100" />
                <DropdownAction label="Delete" danger onClick={() => { setActionOpen(false); onDelete(); }} icon={Trash2} />
              </div>
            )}
          </div>
        </div>
      </div>

      {isRequestsOpen && (
        <div className="border-t border-gray-100 bg-gray-50/70 p-4">
          {requests.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Belum ada permintaan untuk listing ini.</p>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <ReservationRequestRow
                  key={r.id}
                  reservation={r}
                  onAction={(action) => onReservationAction(r.id, action)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function DropdownAction({ label, onClick, danger = false, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold transition-colors ${danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />} {label}
    </button>
  );
}

function ReservationRequestRow({ reservation, onAction }) {
  const statusStyle = {
    pending: 'badge-warning',
    accepted: 'badge-info',
    rejected: 'badge-danger',
    completed: 'badge-safe',
  }[reservation.status] || 'badge-info';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-800">
            <User className="mr-1 inline h-3.5 w-3.5 text-gray-400" />
            {reservation.requester_name || reservation.requester_user_id}
          </p>
          {reservation.requester_email && (
            <p className="truncate text-xs text-gray-500">{reservation.requester_email}</p>
          )}
        </div>
        <span className={`badge ${statusStyle} text-[10px]`}>{reservation.status}</span>
      </div>

      <div className="mb-2 grid gap-1 text-xs text-gray-500 sm:grid-cols-2">
        <span>Qty: <strong className="text-gray-700">{reservation.quantity_requested}</strong></span>
        <span>Dibuat: <strong className="text-gray-700">{(reservation.created_at || '').slice(0, 10)}</strong></span>
      </div>

      {reservation.message && (
        <p className="mb-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
          <MessageSquare className="mr-1 inline h-3 w-3" /> {reservation.message}
        </p>
      )}

      {reservation.status === 'pending' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAction('accept')}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <CheckCircle className="h-3 w-3" /> Accept
          </button>
          <button
            type="button"
            onClick={() => onAction('reject')}
            className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600"
          >
            <XCircle className="h-3 w-3" /> Reject
          </button>
        </div>
      )}

      {reservation.status === 'accepted' && (
        <button
          type="button"
          onClick={() => onAction('complete')}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
        >
          <CheckCircle className="h-3 w-3" /> Mark Completed
        </button>
      )}
    </div>
  );
}

// ─── Reserve Modal ───────────────────────────────────────────────────────────

function ReserveModal({ item, onClose, onSubmit }) {
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [form, setForm] = useState({
    requester_name: '',
    requester_email: '',
    quantity_requested: 1,
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        requester_name: form.requester_name,
        requester_email: form.requester_email,
        quantity_requested: Number(form.quantity_requested) || 1,
        message: form.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Reserve Item</h2>
            <p className="text-xs text-gray-500">{item.food_name}</p>
          </div>
          <button onClick={onClose} className="btn-icon hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 p-5">
          <div>
            <label className="input-label">Nama Anda</label>
            <input
              value={form.requester_name}
              onChange={(e) => setForm({ ...form, requester_name: e.target.value })}
              className="input-field"
              placeholder="Nama lengkap"
            />
          </div>
          <div>
            <label className="input-label">Email (opsional)</label>
            <input
              type="email"
              value={form.requester_email}
              onChange={(e) => setForm({ ...form, requester_email: e.target.value })}
              className="input-field"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="input-label">Jumlah ({item.unit})</label>
            <input
              type="number"
              min="1"
              max={item.quantity || 1}
              value={form.quantity_requested}
              onChange={(e) => setForm({ ...form, quantity_requested: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="input-label">Pesan untuk seller</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="input-field resize-none"
              rows="3"
              placeholder="Kapan bisa ambil, detail tambahan..."
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-60">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
              {submitting ? 'Mengirim...' : 'Kirim Reservasi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
