import React, { useState, useEffect, useMemo } from 'react';
import { DUMMY_FOODS, FOOD_CATEGORIES, STORAGE_TYPES, UNITS } from '../data/dummyData';
import * as api from '../api';
import {
  Package, Plus, Search, Filter, Edit3, Trash2, X, Save, AlertTriangle,
  CheckCircle2, Clock, ChevronDown,
} from 'lucide-react';

const today = new Date().toISOString().slice(0, 10);

function getRiskFromDays(daysToExpiry) {
  if (daysToExpiry <= 1) return 'High Risk';
  if (daysToExpiry <= 3) return 'Warning';
  return 'Safe';
}

export default function InventoryPage() {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [form, setForm] = useState({
    food_name: '',
    category: 'Dairy',
    quantity: 1,
    unit: 'buah',
    purchase_date: today,
    expiry_date: today,
    storage_type: 'Refrigerated',
    notes: '',
  });

  useEffect(() => {
    loadFoods();
  }, []);

  async function loadFoods() {
    setLoading(true);
    try {
      const data = await api.getFoods();
      setFoods(data);
    } catch {
      setFoods(DUMMY_FOODS);
    } finally {
      setLoading(false);
    }
  }

  const filteredFoods = useMemo(() => {
    return foods.filter((food) => {
      const matchesSearch = food.food_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'All' || food.category === filterCategory;
      const matchesStatus = filterStatus === 'All' || food.risk_level === filterStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [foods, searchQuery, filterCategory, filterStatus]);

  function resetForm() {
    setForm({
      food_name: '',
      category: 'Dairy',
      quantity: 1,
      unit: 'buah',
      purchase_date: today,
      expiry_date: today,
      storage_type: 'Refrigerated',
      notes: '',
    });
    setEditingFood(null);
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const daysToExpiry = Math.ceil((new Date(form.expiry_date) - new Date()) / 86400000);
    const riskLevel = getRiskFromDays(daysToExpiry);
    const riskScore = Math.max(0, 100 - daysToExpiry * 12);

    const newFood = {
      ...form,
      quantity: Number(form.quantity),
      risk_level: riskLevel,
      risk_score: Math.min(100, riskScore),
      recommendation: riskLevel === 'High Risk' ? 'Segera gunakan atau donasikan.' : riskLevel === 'Warning' ? 'Rencanakan penggunaan segera.' : 'Stok aman.',
    };

    if (editingFood) {
      try {
        await api.updateFood(editingFood.id, newFood);
        await loadFoods();
      } catch {
        setFoods(foods.map((f) => f.id === editingFood.id ? { ...f, ...newFood } : f));
      }
    } else {
      try {
        await api.createFood(newFood);
        await loadFoods();
      } catch {
        setFoods([...foods, { ...newFood, id: 'f' + Date.now() }]);
      }
    }
    resetForm();
  }

  async function handleDelete(id) {
    if (!window.confirm('Yakin ingin menghapus item ini?')) return;
    try {
      await api.deleteFood(id);
      await loadFoods();
    } catch {
      setFoods(foods.filter((f) => f.id !== id));
    }
  }

  function handleEdit(food) {
    setForm({
      food_name: food.food_name,
      category: food.category,
      quantity: food.quantity,
      unit: food.unit,
      purchase_date: food.purchase_date,
      expiry_date: food.expiry_date,
      storage_type: food.storage_type,
      notes: food.notes || '',
    });
    setEditingFood(food);
    setShowForm(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            Food Inventory
          </h1>
          <p className="text-gray-500 mt-1">{foods.length} items tracked</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm self-start">
          <Plus className="w-4 h-4" />
          Add Food Item
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search food items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-11"
          />
        </div>
        <div className="relative">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-field pr-10 appearance-none cursor-pointer min-w-[140px]"
          >
            <option value="All">All Categories</option>
            {FOOD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field pr-10 appearance-none cursor-pointer min-w-[130px]"
          >
            <option value="All">All Status</option>
            <option value="Safe">Safe</option>
            <option value="Warning">Warning</option>
            <option value="High Risk">High Risk</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{editingFood ? 'Edit Food Item' : 'Add New Food Item'}</h2>
              <button onClick={resetForm} className="btn-icon hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="input-label">Food Name</label>
                <input value={form.food_name} onChange={(e) => setForm({ ...form, food_name: e.target.value })} className="input-field" required placeholder="e.g. Susu Segar" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                    {FOOD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Storage Type</label>
                  <select value={form.storage_type} onChange={(e) => setForm({ ...form, storage_type: e.target.value })} className="input-field">
                    {STORAGE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Quantity</label>
                  <input type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="input-label">Unit</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input-field">
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Purchase Date</label>
                  <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="input-label">Expiry Date</label>
                  <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="input-field" required />
                </div>
              </div>
              <div>
                <label className="input-label">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field resize-none" rows="2" placeholder="Optional notes..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">
                  <Save className="w-4 h-4" />
                  {editingFood ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Food Item</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Storage</th>
                <th>Purchase</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFoods.map((food) => {
                const daysLeft = Math.ceil((new Date(food.expiry_date) - new Date()) / 86400000);
                return (
                  <tr key={food.id}>
                    <td>
                      <div>
                        <p className="font-semibold text-gray-800">{food.food_name}</p>
                        {food.notes && <p className="text-xs text-gray-400 mt-0.5">{food.notes}</p>}
                      </div>
                    </td>
                    <td><span className="badge badge-info">{food.category}</span></td>
                    <td>{food.quantity} {food.unit}</td>
                    <td className="text-sm">{food.storage_type}</td>
                    <td className="text-sm">{food.purchase_date}</td>
                    <td>
                      <div>
                        <p className="text-sm">{food.expiry_date}</p>
                        <p className={`text-xs ${daysLeft <= 1 ? 'text-red-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                          {daysLeft <= 0 ? 'Expired' : `${daysLeft} days left`}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${food.risk_level === 'Safe' ? 'badge-safe' : food.risk_level === 'Warning' ? 'badge-warning' : 'badge-danger'}`}>
                        {food.risk_level}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(food)} className="btn-icon bg-blue-50 hover:bg-blue-100 text-blue-600">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(food.id)} className="btn-icon bg-red-50 hover:bg-red-100 text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredFoods.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-12">
                    <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No food items found</p>
                    <p className="text-gray-400 text-sm">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
