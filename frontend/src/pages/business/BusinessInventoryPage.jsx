import React, { useEffect, useMemo, useState } from 'react';
import { DUMMY_BUSINESS_INVENTORY, DUMMY_BRANCHES, BUSINESS_TYPES } from '../../data/businessDummyData';
import { FOOD_CATEGORIES, UNITS } from '../../data/dummyData';
import { useAuth } from '../../context/AuthContext';
import {
  Package, Plus, Search, Edit3, Trash2, X, Save, ChevronDown, AlertTriangle, CheckCircle2, Flame,
} from 'lucide-react';

const today = new Date().toISOString().slice(0, 10);

export default function BusinessInventoryPage() {
  const { isDemoMode } = useAuth();
  const branches = isDemoMode ? DUMMY_BRANCHES : [];
  const [inventory, setInventory] = useState(() => isDemoMode ? DUMMY_BUSINESS_INVENTORY : []);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterRisk, setFilterRisk] = useState('All');

  const [form, setForm] = useState({
    item_name: '', category: 'Protein', batch_code: '', quantity: 1, unit: 'kg',
    supplier: '', purchase_date: today, expiry_date: today,
    branch: branches[0]?.branch_name || '', storage_area: '',
    cost_per_unit: '', selling_price: '', status: 'Safe',
  });

  useEffect(() => {
    setInventory(isDemoMode ? DUMMY_BUSINESS_INVENTORY : []);
  }, [isDemoMode]);

  const filtered = useMemo(() => inventory.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      (item.item_name.toLowerCase().includes(q) || item.batch_code.toLowerCase().includes(q)) &&
      (filterBranch === 'All' || item.branch === filterBranch) &&
      (filterCategory === 'All' || item.category === filterCategory) &&
      (filterRisk === 'All' || item.risk_level === filterRisk)
    );
  }), [inventory, searchQuery, filterBranch, filterCategory, filterRisk]);

  function resetForm() {
    setForm({ item_name: '', category: 'Protein', batch_code: '', quantity: 1, unit: 'kg', supplier: '', purchase_date: today, expiry_date: today, branch: branches[0]?.branch_name || '', storage_area: '', cost_per_unit: '', selling_price: '', status: 'Safe' });
    setEditingItem(null);
    setShowForm(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const daysToExpiry = Math.ceil((new Date(form.expiry_date) - new Date()) / 86400000);
    const risk_level = daysToExpiry <= 1 ? 'High Risk' : daysToExpiry <= 3 ? 'Warning' : 'Safe';
    const estimated_loss = risk_level !== 'Safe' ? Number(form.cost_per_unit || 0) * Number(form.quantity || 0) : 0;
    const newItem = { ...form, quantity: Number(form.quantity), cost_per_unit: Number(form.cost_per_unit), selling_price: Number(form.selling_price), risk_level, risk_score: Math.max(0, 100 - daysToExpiry * 12), estimated_loss, suggested_action: risk_level === 'High Risk' ? 'Prioritize for today. Apply discount or donate.' : risk_level === 'Warning' ? 'Plan usage within 2 days.' : 'Stock is safe.' };
    if (editingItem) {
      setInventory(inventory.map((i) => i.id === editingItem.id ? { ...i, ...newItem } : i));
    } else {
      setInventory([...inventory, { ...newItem, id: 'bi' + Date.now() }]);
    }
    resetForm();
  }

  function handleEdit(item) {
    setForm({ item_name: item.item_name, category: item.category, batch_code: item.batch_code, quantity: item.quantity, unit: item.unit, supplier: item.supplier, purchase_date: item.purchase_date, expiry_date: item.expiry_date, branch: item.branch, storage_area: item.storage_area, cost_per_unit: item.cost_per_unit, selling_price: item.selling_price, status: item.status });
    setEditingItem(item);
    setShowForm(true);
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this item?')) return;
    setInventory(inventory.filter((i) => i.id !== id));
  }

  const branchNames = ['All', ...branches.map((b) => b.branch_name)];

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Business Inventory
          </h1>
          <p className="text-gray-500 mt-1">{inventory.length} stock items across {branches.length} branches</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm self-start" style={{ background: 'linear-gradient(to right, #3b82f6, #6366f1)' }}>
          <Plus className="w-4 h-4" /> Add Stock
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search item or batch code..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-field pl-11" />
        </div>
        {[
          { value: filterBranch, setter: setFilterBranch, options: branchNames, label: 'Branch' },
          { value: filterCategory, setter: setFilterCategory, options: ['All', ...FOOD_CATEGORIES], label: 'Category' },
          { value: filterRisk, setter: setFilterRisk, options: ['All', 'Safe', 'Warning', 'High Risk'], label: 'Risk' },
        ].map(({ value, setter, options, label }) => (
          <div key={label} className="relative">
            <select value={value} onChange={(e) => setter(e.target.value)} className="input-field pr-10 appearance-none cursor-pointer min-w-[130px]">
              {options.map((o) => <option key={o}>{o === 'All' ? `All ${label}s` : o}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Item', 'Batch', 'Branch', 'Quantity', 'Expiry', 'Risk', 'Est. Loss', 'Suggested Action', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((item) => {
                const daysLeft = Math.ceil((new Date(item.expiry_date) - new Date()) / 86400000);
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{item.item_name}</p>
                      <p className="text-xs text-gray-400">{item.category} · {item.supplier}</p>
                    </td>
                    <td className="px-4 py-3"><span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{item.batch_code}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[120px] truncate">{item.branch.split(' ').slice(-2).join(' ')}</td>
                    <td className="px-4 py-3">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{item.expiry_date}</p>
                      <p className={`text-xs ${daysLeft <= 1 ? 'text-red-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                        {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${item.risk_level === 'Safe' ? 'badge-safe' : item.risk_level === 'Warning' ? 'badge-warning' : 'badge-danger'}`}>
                        {item.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold text-sm ${item.estimated_loss > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {item.estimated_loss > 0 ? `Rp${item.estimated_loss.toLocaleString()}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="text-xs text-gray-600 line-clamp-2">{item.suggested_action}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(item)} className="btn-icon bg-blue-50 hover:bg-blue-100 text-blue-600"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(item.id)} className="btn-icon bg-red-50 hover:bg-red-100 text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="9" className="text-center py-12 text-gray-400">No items found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={resetForm}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{editingItem ? 'Edit Stock Item' : 'Add Stock Item'}</h2>
              <button onClick={resetForm} className="btn-icon hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Item Name</label>
                  <input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} className="input-field" required placeholder="e.g. Chicken Breast" />
                </div>
                <div>
                  <label className="input-label">Batch Code</label>
                  <input value={form.batch_code} onChange={(e) => setForm({ ...form, batch_code: e.target.value })} className="input-field" placeholder="e.g. A102" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="input-label">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                    {FOOD_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Quantity</label>
                  <input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="input-label">Unit</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input-field">
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Branch</label>
                  <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className="input-field">
                    {branches.map((b) => <option key={b.id} value={b.branch_name}>{b.branch_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Storage Area</label>
                  <input value={form.storage_area} onChange={(e) => setForm({ ...form, storage_area: e.target.value })} className="input-field" placeholder="e.g. Cold Storage A" />
                </div>
              </div>
              <div>
                <label className="input-label">Supplier</label>
                <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="input-field" placeholder="Supplier name" />
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Cost per Unit (Rp)</label>
                  <input type="number" value={form.cost_per_unit} onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })} className="input-field" placeholder="45000" />
                </div>
                <div>
                  <label className="input-label">Selling Price (Rp)</label>
                  <input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} className="input-field" placeholder="75000" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" style={{ background: 'linear-gradient(to right, #3b82f6, #6366f1)' }}>
                  <Save className="w-4 h-4" /> {editingItem ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
