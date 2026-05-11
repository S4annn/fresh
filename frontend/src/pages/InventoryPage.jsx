import React, { useState, useEffect, useMemo } from 'react';
import { DUMMY_FOODS, FOOD_CATEGORIES, STORAGE_TYPES, UNITS } from '../data/dummyData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { canAddInventory, getPlanLimit, incrementUsage, isUnlimited, useSubscription } from '../services/subscription';
import DemoUsageIndicator, { DemoLimitWarning } from '../components/DemoUsageIndicator';
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
  const { isDemoMode } = useAuth();
  const { t, tv } = useLanguage();
  const { plan } = useSubscription();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [limitMessage, setLimitMessage] = useState('');
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
  }, [isDemoMode]);

  async function loadFoods() {
    setLoading(true);
    if (!isDemoMode) {
      setFoods([]);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getFoods();
      setFoods(Array.isArray(data) && data.length > 0 ? data : DUMMY_FOODS);
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
    if (!editingFood && !canAddInventory()) {
      setLimitMessage('Free plan supports up to 30 inventory items. Upgrade to Personal Plus for unlimited inventory.');
      setShowForm(false);
      return;
    }
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

    if (!isDemoMode) {
      if (editingFood) {
        setFoods(foods.map((f) => f.id === editingFood.id ? { ...f, ...newFood } : f));
      } else {
        setFoods([...foods, { ...newFood, id: 'f' + Date.now() }]);
        incrementUsage('inventory_items');
      }
      resetForm();
      return;
    }

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
        incrementUsage('inventory_items');
      } catch {
        setFoods([...foods, { ...newFood, id: 'f' + Date.now() }]);
        incrementUsage('inventory_items');
      }
    }
    resetForm();
  }

  async function handleDelete(id) {
    if (!window.confirm(t('deleteConfirm', 'Yakin ingin menghapus item ini?'))) return;
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

  const inventoryLimit = getPlanLimit('max_inventory_items');
  const isInventoryLimitReached = !canAddInventory();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{t('loadingInventory', 'Loading inventory...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      {/* Demo Limit Warning */}
      <DemoLimitWarning featureName="inventory_add" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            {t('foodInventory', 'Food Inventory')}
          </h1>
          <p className="text-gray-500 mt-1">{foods.length} {t('itemsTracked', 'items tracked')}</p>
          <DemoUsageIndicator featureName="inventory_add" className="mt-2" />
        </div>
        <button
          onClick={() => {
            setLimitMessage('');
            if (isInventoryLimitReached) {
              setLimitMessage('Free plan supports up to 30 inventory items. Upgrade to Personal Plus for unlimited inventory.');
              return;
            }
            resetForm();
            setShowForm(true);
          }}
          disabled={isInventoryLimitReached}
          className="btn-primary text-sm self-start disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          {t('addFoodItem', 'Add Food Item')}
        </button>
      </div>

      <div className="card flex flex-col gap-3 border-emerald-100 bg-emerald-50/70 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-800">Current plan: {plan.plan_name}</p>
          <p className="text-xs text-gray-600">
            Inventory limit: {isUnlimited(inventoryLimit) ? 'Unlimited' : `${inventoryLimit} items`}
          </p>
        </div>
        {!isUnlimited(inventoryLimit) && (
          <a href="/pricing" className="text-sm font-bold text-emerald-700 no-underline">Upgrade for unlimited inventory</a>
        )}
      </div>

      {limitMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
          {limitMessage} <a href="/pricing" className="ml-1 underline">View Pricing</a>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchFoodItems', 'Search food items...')}
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
            <option value="All">{t('allCategories', 'All Categories')}</option>
            {FOOD_CATEGORIES.map((c) => <option key={c} value={c}>{tv(c)}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field pr-10 appearance-none cursor-pointer min-w-[130px]"
          >
            <option value="All">{t('allStatus', 'All Status')}</option>
            <option value="Safe">{t('safe', 'Safe')}</option>
            <option value="Warning">{t('warning', 'Warning')}</option>
            <option value="High Risk">{t('highRisk', 'High Risk')}</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{editingFood ? t('editFoodItem', 'Edit Food Item') : t('addNewFoodItem', 'Add New Food Item')}</h2>
              <button onClick={resetForm} className="btn-icon hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="input-label">{t('foodName', 'Food Name')}</label>
                <input value={form.food_name} onChange={(e) => setForm({ ...form, food_name: e.target.value })} className="input-field" required placeholder="e.g. Susu Segar" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">{t('category', 'Category')}</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                    {FOOD_CATEGORIES.map((c) => <option key={c} value={c}>{tv(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">{t('storageType', 'Storage Type')}</label>
                  <select value={form.storage_type} onChange={(e) => setForm({ ...form, storage_type: e.target.value })} className="input-field">
                    {STORAGE_TYPES.map((s) => <option key={s} value={s}>{tv(s)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">{t('quantity', 'Quantity')}</label>
                  <input type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="input-label">{t('unit', 'Unit')}</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input-field">
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">{t('purchaseDate', 'Purchase Date')}</label>
                  <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="input-label">{t('expiryDate', 'Expiry Date')}</label>
                  <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="input-field" required />
                </div>
              </div>
              <div>
                <label className="input-label">{t('notes', 'Notes')}</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field resize-none" rows="2" placeholder={t('optionalNotes', 'Optional notes...')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary flex-1">{t('cancel', 'Cancel')}</button>
                <button type="submit" className="btn-primary flex-1">
                  <Save className="w-4 h-4" />
                  {editingFood ? t('update', 'Update') : t('save', 'Save')}
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
                <th>{t('foodItem', 'Food Item')}</th>
                <th>{t('category', 'Category')}</th>
                <th>{t('quantity', 'Quantity')}</th>
                <th>{t('storage', 'Storage')}</th>
                <th>{t('purchase', 'Purchase')}</th>
                <th>{t('expiry', 'Expiry')}</th>
                <th>{t('status', 'Status')}</th>
                <th>{t('actions', 'Actions')}</th>
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
                    <td><span className="badge badge-info">{tv(food.category)}</span></td>
                    <td>{food.quantity} {food.unit}</td>
                    <td className="text-sm">{tv(food.storage_type)}</td>
                    <td className="text-sm">{food.purchase_date}</td>
                    <td>
                      <div>
                        <p className="text-sm">{food.expiry_date}</p>
                        <p className={`text-xs ${daysLeft <= 1 ? 'text-red-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                          {daysLeft <= 0 ? t('expired', 'Expired') : `${daysLeft} ${t('daysLeft', 'days left')}`}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${food.risk_level === 'Safe' ? 'badge-safe' : food.risk_level === 'Warning' ? 'badge-warning' : 'badge-danger'}`}>
                        {tv(food.risk_level)}
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
                    <p className="text-gray-500 font-medium">{t('noFoodItemsFound', 'No food items found')}</p>
                    <p className="text-gray-400 text-sm">{t('adjustSearchFilters', 'Try adjusting your search or filters.')}</p>
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
