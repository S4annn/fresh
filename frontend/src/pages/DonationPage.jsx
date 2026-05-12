import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { DUMMY_DONATIONS } from '../data/dummyData';
import { useAuth } from '../context/AuthContext';
import { calculateDistanceKm, formatDistance, getUserLocation, saveUserLocation, loadUserLocation } from '../utils/geo';
import FreshMap from '../components/FreshMap';
import FeatureGate from '../components/FeatureGate';
import * as api from '../api';
import { canCreateDonationListing, getPlanLimit, incrementUsage, isUnlimited, useSubscription } from '../services/subscription';
import {
  Heart, Plus, X, Save, MapPin, Clock, User, Package, Gift,
  CheckCircle2, TrendingUp, Users, Navigation, Loader2,
  SlidersHorizontal, ChevronDown, Map, List,
} from 'lucide-react';

// ─── Safe location helper ─────────────────────────────────────────────────────
const DEFAULT_LOC = { lat: -6.2088, lng: 106.8456, name: 'Jakarta (default)' };

function getSafeLocation() {
  try {
    const loc = loadUserLocation();
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') return loc;
  } catch (_) {}
  return DEFAULT_LOC;
}

// ─── React Error Boundary for Map ────────────────────────────────────────────
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
          style={{ height: this.props.height || 400 }}
          className="bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-3 text-gray-400 border border-gray-200"
        >
          <MapPin className="w-10 h-10" />
          <p className="text-sm font-medium">Map could not be loaded</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-red-500 underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Map wrapper with error boundary ─────────────────────────────────────────
function MapView({ center, zoom, markers, userLocation, userRadius, height = 400 }) {
  const mapKey = Array.isArray(center)
    ? `map-${Number(center[0]).toFixed(3)}-${Number(center[1]).toFixed(3)}`
    : 'map-default';
  return (
    <MapErrorBoundary height={height}>
      <FreshMap
        key={mapKey}
        center={center}
        zoom={zoom}
        markers={markers}
        userLocation={userLocation}
        userRadius={userRadius}
        height={height}
      />
    </MapErrorBoundary>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MARKER_COLORS = { donation: '#ef4444', reserved: '#f59e0b', sold: '#6b7280' };

const statusConfig = {
  Available: { color: 'badge-safe',    label: 'Available', markerColor: MARKER_COLORS.donation },
  Requested: { color: 'badge-warning', label: 'Requested', markerColor: MARKER_COLORS.reserved },
  Completed: { color: 'badge-info',    label: 'Completed', markerColor: MARKER_COLORS.sold },
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DonationPage() {
  const { isDemoMode } = useAuth();
  const { plan } = useSubscription();
  const location = useLocation();
  const prefillDonation = location.state?.prefillDonation;
  const [donations, setDonations]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [viewMode, setViewMode]         = useState('split');
  const [filterStatus, setFilterStatus] = useState('All');
  const [maxDistance, setMaxDistance]   = useState(999); // show all by default
  const [showFilters, setShowFilters]   = useState(false);
  const [userLocation, setUserLocation] = useState(getSafeLocation);
  const [locating, setLocating]         = useState(false);
  const [limitMessage, setLimitMessage] = useState('');
  const [form, setForm] = useState({
    food_name: '', quantity: 1, unit: 'porsi',
    pickup_location: '', expiry_date: new Date().toISOString().slice(0, 10),
    donor_name: '', notes: '',
  });

  useEffect(() => { loadDonations(); }, [isDemoMode]);

  useEffect(() => {
    if (!prefillDonation) return;
    setForm({
      food_name: prefillDonation.food_name || prefillDonation.name || '',
      quantity: prefillDonation.quantity || 1,
      unit: prefillDonation.unit || 'porsi',
      pickup_location: userLocation?.name || '',
      expiry_date: prefillDonation.expiry_date || prefillDonation.expiration_date || new Date().toISOString().slice(0, 10),
      donor_name: '',
      notes: prefillDonation.notes || prefillDonation.recommendation || '',
    });
    setShowForm(true);
  }, [prefillDonation, userLocation?.name]);

  async function loadDonations() {
    setLoading(true);
    try {
      const data = await api.getDonationItems();
      const nextDonations = Array.isArray(data) ? data : [];
      setDonations(nextDonations.length > 0 || !isDemoMode ? nextDonations : DUMMY_DONATIONS);
    } catch {
      setDonations(isDemoMode ? DUMMY_DONATIONS : []);
    } finally {
      setLoading(false);
    }
  }

  const handleGetLocation = useCallback(async () => {
    setLocating(true);
    try {
      const loc = await getUserLocation();
      const safe = (loc && typeof loc.lat === 'number') ? loc : DEFAULT_LOC;
      setUserLocation(safe);
      saveUserLocation(safe);
    } catch {
      setUserLocation(DEFAULT_LOC);
    } finally {
      setLocating(false);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canCreateDonationListing()) {
      setLimitMessage('Donation listing limit reached. Upgrade your plan to create more donation listings.');
      setShowForm(false);
      return;
    }
    const newDonation = {
      ...form,
      quantity: Number(form.quantity),
      status: 'Available',
      created_at: new Date().toISOString().slice(0, 10),
      latitude: userLocation?.lat ?? DEFAULT_LOC.lat,
      longitude: userLocation?.lng ?? DEFAULT_LOC.lng,
    };

    try {
      const saved = await api.createDonationItem(newDonation);
      setDonations((prev) => [saved, ...prev]);
    } catch {
      setDonations((prev) => [...prev, { ...newDonation, id: 'd' + Date.now() }]);
    }
    incrementUsage('donation_listings');
    setShowForm(false);
    setForm({ food_name: '', quantity: 1, unit: 'porsi', pickup_location: '', expiry_date: new Date().toISOString().slice(0, 10), donor_name: '', notes: '' });
  }

  const processedDonations = useMemo(() => {
    const lat = userLocation?.lat ?? DEFAULT_LOC.lat;
    const lng = userLocation?.lng ?? DEFAULT_LOC.lng;
    return donations
      .map((d) => ({
        ...d,
        distance_km: (d.latitude && d.longitude)
          ? calculateDistanceKm(lat, lng, d.latitude, d.longitude)
          : 999,
      }))
      .filter((d) => (filterStatus === 'All' || d.status === filterStatus) && d.distance_km <= maxDistance)
      .sort((a, b) => a.distance_km - b.distance_km);
  }, [donations, userLocation, filterStatus, maxDistance]);

  const mapMarkers = useMemo(() =>
    processedDonations
      .filter((d) => d.latitude && d.longitude)
      .map((d) => {
        const daysLeft = Math.ceil((new Date(d.expiry_date) - new Date()) / 86400000);
        const expiryText = daysLeft <= 0 ? 'Expired' : `Expires in ${daysLeft}d`;
        return {
          id: d.id,
          lat: d.latitude,
          lng: d.longitude,
          color: statusConfig[d.status]?.markerColor || MARKER_COLORS.donation,
          popupText: `<div style="min-width:170px;font-family:sans-serif;font-size:12px">
            <b style="font-size:13px">❤️ ${d.food_name}</b><br/>
            <span style="color:${d.status === 'Available' ? '#10b981' : '#f59e0b'}">${d.status}</span><br/><br/>
            📦 ${d.quantity} ${d.unit}<br/>
            📍 ${d.pickup_location}<br/>
            👤 ${d.donor_name}<br/>
            ⏰ <span style="color:${daysLeft <= 1 ? '#ef4444' : '#374151'}">${expiryText}</span><br/>
            📏 ${formatDistance(d.distance_km)} away
            ${d.notes ? `<br/><br/><i style="color:#6b7280">${d.notes}</i>` : ''}
          </div>`,
        };
      }),
  [processedDonations]);

  const availableCount = donations.filter((d) => d.status === 'Available').length;
  const completedCount = donations.filter((d) => d.status === 'Completed').length;
  const totalQuantity  = donations.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const donationLimit = getPlanLimit('max_donation_listings');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading donations...</p>
        </div>
      </div>
    );
  }

  // Center map on user GPS location, fallback to Jakarta
  const mapCenter = [
    userLocation?.lat ?? DEFAULT_LOC.lat,
    userLocation?.lng ?? DEFAULT_LOC.lng,
  ];

  return (
    <div className="space-y-4 pb-20 lg:pb-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500" />
            Food Donation
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {processedDonations.length} donations near you · sorted by nearest
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            {[
              { v: 'list',  icon: List,             label: 'List' },
              { v: 'split', icon: SlidersHorizontal, label: 'Split' },
              { v: 'map',   icon: Map,               label: 'Map' },
            ].map(({ v, icon: Icon, label }) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                title={label}
                className={`p-2 rounded-lg transition-all ${viewMode === v ? 'bg-white shadow text-red-500' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setLimitMessage('');
              if (!canCreateDonationListing()) {
                setLimitMessage('Donation listing limit reached. Upgrade your plan to create more donation listings.');
                return;
              }
              setShowForm(true);
            }}
            disabled={!canCreateDonationListing()}
            className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="w-4 h-4" /> Create Donation
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card border-red-100 bg-red-50/70">
          <p className="text-sm font-bold text-gray-800">Donation access: {plan.plan_name}</p>
          <p className="mt-1 text-xs text-gray-600">
            Listing limit: {isUnlimited(donationLimit) ? 'Unlimited' : donationLimit}. Business Pro unlocks scheduling and impact reports.
          </p>
        </div>
        <FeatureGate
          feature="donation_scheduling"
          requiredPlan="business_pro"
          title="Donation scheduling locked"
          description="Scheduled pickup, partner matching, and donation impact reports are available on Business Pro."
        >
          <div className="card border-emerald-100 bg-emerald-50">
            <p className="text-sm font-bold text-gray-800">Business donation scheduling active</p>
            <p className="mt-1 text-xs text-gray-600">Coordinate scheduled pickups and track donation impact.</p>
          </div>
        </FeatureGate>
      </div>

      {limitMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
          {limitMessage} <a href="/pricing" className="ml-1 underline">View Pricing</a>
        </div>
      )}

      {/* Impact Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Donations', value: donations.length, icon: Gift,         bg: 'bg-red-50',    text: 'text-red-500' },
          { label: 'Available Now',   value: availableCount,   icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-500' },
          { label: 'Completed',       value: completedCount,   icon: TrendingUp,   bg: 'bg-blue-50',   text: 'text-blue-500' },
          { label: 'Items Saved',     value: totalQuantity,    icon: Users,        bg: 'bg-purple-50', text: 'text-purple-500' },
        ].map(({ label, value, icon: Icon, bg, text }) => (
          <div key={label} className={`card ${bg} border-0`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Icon className={`w-5 h-5 ${text}`} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-800">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Impact Banner */}
      <div className="card bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-none">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Heart className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-bold mb-0.5">Donation Impact</h2>
            <p className="text-emerald-100 text-sm">
              {completedCount} completed donations · {totalQuantity}+ portions saved for communities in need.
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold">{totalQuantity}+</p>
            <p className="text-xs text-emerald-200">Portions Saved</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleGetLocation}
          disabled={locating}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl font-semibold text-sm hover:bg-blue-100 transition-colors disabled:opacity-60"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          {locating ? 'Locating...' : 'My Location'}
        </button>
        <div className="relative">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field pr-8 appearance-none cursor-pointer min-w-[140px] text-sm">
            <option value="All">All Status</option>
            <option value="Available">Available</option>
            <option value="Requested">Requested</option>
            <option value="Completed">Completed</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-colors ${showFilters ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'}`}
        >
          <SlidersHorizontal className="w-4 h-4" /> Distance
        </button>
        {showFilters && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-sm text-gray-600 whitespace-nowrap">Max:</span>
            <input type="range" min="1" max="100" value={maxDistance} onChange={(e) => setMaxDistance(Number(e.target.value))} className="w-24 accent-red-500" />
            <span className="text-sm font-semibold text-red-600 w-14">{maxDistance} km</span>
            <span className="text-xs text-gray-400">from {userLocation?.name || 'Jakarta'}</span>
          </div>
        )}
      </div>

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedDonations.map((d) => <DonationCard key={d.id} donation={d} />)}
          {processedDonations.length === 0 && <div className="col-span-full"><DonationEmpty /></div>}
        </div>
      )}

      {/* ── SPLIT VIEW — map left, cards right ── */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5 items-start">
          {/* Map column */}
          <div>
            <MapView center={mapCenter} zoom={11} markers={mapMarkers} userLocation={userLocation} userRadius={null} height={460} />
            <div className="flex items-center justify-between mt-2 px-1">
              <p className="text-xs text-gray-400">🗺️ OpenStreetMap · {mapMarkers.length} donations</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Available</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Requested</span>
              </div>
            </div>
          </div>
          {/* Cards column — scrollable */}
          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 520 }}>
            {processedDonations.map((d) => <DonationCard key={d.id} donation={d} />)}
            {processedDonations.length === 0 && <DonationEmpty />}
          </div>
        </div>
      )}

      {/* ── MAP ONLY ── */}
      {viewMode === 'map' && (
        <div>
          <MapView center={mapCenter} zoom={11} markers={mapMarkers} userLocation={userLocation} userRadius={null} height={560} />
          <p className="text-xs text-gray-400 text-center mt-2">🗺️ OpenStreetMap · Click red markers for donation details</p>
        </div>
      )}

      {/* ── CREATE DONATION MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Create Donation</h2>
              <button onClick={() => setShowForm(false)} className="btn-icon hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="input-label">Food Name</label>
                <input value={form.food_name} onChange={(e) => setForm({ ...form, food_name: e.target.value })} className="input-field" required placeholder="e.g. Nasi Kotak" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Quantity</label>
                  <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="input-label">Unit</label>
                  <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input-field" placeholder="porsi" />
                </div>
              </div>
              <div>
                <label className="input-label">Pickup Location</label>
                <input value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })} className="input-field" required placeholder="e.g. Kantin Kampus A, Jakarta" />
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700 flex items-center gap-2">
                <Navigation className="w-4 h-4 flex-shrink-0" />
                Pin location: <strong>{userLocation?.name || 'Jakarta (default)'}</strong>
              </div>
              <div>
                <label className="input-label">Expiry Date</label>
                <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="input-label">Donor Name</label>
                <input value={form.donor_name} onChange={(e) => setForm({ ...form, donor_name: e.target.value })} className="input-field" required placeholder="Your name or organization" />
              </div>
              <div>
                <label className="input-label">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field resize-none" rows="2" placeholder="Additional information..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1"><Save className="w-4 h-4" /> Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Donation Card ────────────────────────────────────────────────────────────
function DonationCard({ donation }) {
  const status   = statusConfig[donation.status] || statusConfig.Available;
  const daysLeft = Math.ceil((new Date(donation.expiry_date) - new Date()) / 86400000);

  return (
    <div className="card hover:-translate-y-1 group transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className={`badge ${status.color}`}>{status.label}</span>
        <div className="flex items-center gap-2">
          {donation.distance_km !== undefined && donation.distance_km < 999 && (
            <span className="flex items-center gap-1 text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-lg">
              <MapPin className="w-3 h-3" />
              {formatDistance(donation.distance_km)}
            </span>
          )}
          <span className="text-xs text-gray-400">{donation.created_at}</span>
        </div>
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-1">{donation.food_name}</h3>
      <div className="space-y-1.5 text-sm mb-4">
        <div className="flex items-center gap-2 text-gray-500">
          <Package className="w-3.5 h-3.5" /><span>{donation.quantity} {donation.unit}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{donation.pickup_location}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span className={daysLeft <= 1 ? 'text-red-500 font-semibold text-sm' : 'text-gray-500 text-sm'}>
            {daysLeft <= 0 ? 'Expired' : `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
          </span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <User className="w-3.5 h-3.5" /><span>{donation.donor_name}</span>
        </div>
      </div>
      {donation.notes && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 border border-gray-100 mb-3">{donation.notes}</p>
      )}
      {donation.status === 'Available' && (
        <button className="btn-primary w-full text-sm py-2.5">
          <Heart className="w-4 h-4" /> Request Donation
        </button>
      )}
    </div>
  );
}

function DonationEmpty() {
  return (
    <div className="text-center py-16">
      <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">No donations found nearby</p>
      <p className="text-gray-400 text-sm mt-1">Try increasing the max distance or be the first to donate!</p>
    </div>
  );
}
