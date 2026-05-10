import React, { useEffect, useState } from 'react';
import { DUMMY_BRANCHES } from '../../data/businessDummyData';
import { useAuth } from '../../context/AuthContext';
import { GitBranch, Plus, X, Save, MapPin, User, Phone, Package, AlertTriangle, TrendingDown, ShoppingBag } from 'lucide-react';

export default function BusinessBranchesPage() {
  const { isDemoMode } = useAuth();
  const [branches, setBranches] = useState(() => isDemoMode ? DUMMY_BRANCHES : []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ branch_name: '', location: '', latitude: '', longitude: '', manager_name: '', contact: '' });

  useEffect(() => {
    setBranches(isDemoMode ? DUMMY_BRANCHES : []);
  }, [isDemoMode]);

  function handleSubmit(e) {
    e.preventDefault();
    setBranches([...branches, { ...form, id: 'br' + Date.now(), total_inventory: 0, high_risk_items: 0, waste_prevented: 0, marketplace_listings: 0, status: 'Active' }]);
    setForm({ branch_name: '', location: '', latitude: '', longitude: '', manager_name: '', contact: '' });
    setShowForm(false);
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-violet-600" />
            Branch Management
          </h1>
          <p className="text-gray-500 mt-1">{branches.length} active branches</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm self-start" style={{ background: 'linear-gradient(to right, #7c3aed, #6366f1)' }}>
          <Plus className="w-4 h-4" /> Add Branch
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Branches', value: branches.length, icon: GitBranch, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Total Stock Items', value: branches.reduce((s, b) => s + b.total_inventory, 0), icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'High Risk Items', value: branches.reduce((s, b) => s + b.high_risk_items, 0), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Waste Prevented', value: branches.reduce((s, b) => s + b.waste_prevented, 0), icon: TrendingDown, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-extrabold text-gray-800">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Branch Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {branches.map((branch) => (
          <div key={branch.id} className="card hover:-translate-y-1 transition-transform group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:scale-110 transition-transform">
                  <GitBranch className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{branch.branch_name}</h3>
                  <span className="badge badge-safe text-xs">{branch.status}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2 text-gray-500">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{branch.location}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <User className="w-3.5 h-3.5" />
                <span>{branch.manager_name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <Phone className="w-3.5 h-3.5" />
                <span>{branch.contact}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Stock Items', value: branch.total_inventory, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'High Risk', value: branch.high_risk_items, color: branch.high_risk_items > 0 ? 'text-red-600' : 'text-emerald-600', bg: branch.high_risk_items > 0 ? 'bg-red-50' : 'bg-emerald-50' },
                { label: 'Waste Prevented', value: branch.waste_prevented, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Listings', value: branch.marketplace_listings, color: 'text-pink-600', bg: 'bg-pink-50' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                  <p className={`text-lg font-extrabold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              <span>{branch.latitude?.toFixed(4)}, {branch.longitude?.toFixed(4)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Branch Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Add New Branch</h2>
              <button onClick={() => setShowForm(false)} className="btn-icon hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="input-label">Branch Name</label>
                <input value={form.branch_name} onChange={(e) => setForm({ ...form, branch_name: e.target.value })} className="input-field" required placeholder="e.g. F.R.E.S.H Cafe Surabaya" />
              </div>
              <div>
                <label className="input-label">Location</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-field" required placeholder="Full address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Latitude</label>
                  <input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="input-field" placeholder="-7.2575" />
                </div>
                <div>
                  <label className="input-label">Longitude</label>
                  <input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="input-field" placeholder="112.7521" />
                </div>
              </div>
              <div>
                <label className="input-label">Manager Name</label>
                <input value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} className="input-field" placeholder="Manager's full name" />
              </div>
              <div>
                <label className="input-label">Contact Number</label>
                <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="input-field" placeholder="+62 812..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" style={{ background: 'linear-gradient(to right, #7c3aed, #6366f1)' }}>
                  <Save className="w-4 h-4" /> Add Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
