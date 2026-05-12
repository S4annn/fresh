import React, { useEffect, useState } from 'react';
import { DUMMY_ORDERS } from '../../data/businessDummyData';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../api';
import { ClipboardList, CheckCircle2, Clock, XCircle, Package, User, MapPin, DollarSign, ChevronDown } from 'lucide-react';

const statusConfig = {
  Pending: { color: 'badge-warning', bg: 'bg-amber-50', border: 'border-amber-100', icon: Clock, text: 'text-amber-600' },
  Confirmed: { color: 'badge-info', bg: 'bg-blue-50', border: 'border-blue-100', icon: CheckCircle2, text: 'text-blue-600' },
  Completed: { color: 'badge-safe', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: CheckCircle2, text: 'text-emerald-600' },
  Cancelled: { color: 'badge-danger', bg: 'bg-red-50', border: 'border-red-100', icon: XCircle, text: 'text-red-600' },
};

export default function BusinessOrdersPage() {
  const { isDemoMode } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    loadOrders();
  }, [isDemoMode]);

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await api.getBusinessOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders(isDemoMode ? DUMMY_ORDERS : []);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, newStatus) {
    try {
      const saved = await api.updateBusinessOrderStatus(id, newStatus);
      setOrders(orders.map((o) => o.id === id ? saved : o));
    } catch {
      setOrders(orders.map((o) => o.id === id ? { ...o, status: newStatus } : o));
    }
  }

  const filtered = filterStatus === 'All' ? orders : orders.filter((o) => o.status === filterStatus);

  const counts = {
    Pending: orders.filter((o) => o.status === 'Pending').length,
    Confirmed: orders.filter((o) => o.status === 'Confirmed').length,
    Completed: orders.filter((o) => o.status === 'Completed').length,
    Cancelled: orders.filter((o) => o.status === 'Cancelled').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-amber-500" />
          Orders & Reservations
        </h1>
        <p className="text-gray-500 mt-1">Manage marketplace orders and donation pickups.</p>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(counts).map(([status, count]) => {
          const cfg = statusConfig[status];
          const Icon = cfg.icon;
          return (
            <div key={status} className={`card ${cfg.bg} border ${cfg.border} cursor-pointer hover:-translate-y-0.5 transition-transform`} onClick={() => setFilterStatus(status === filterStatus ? 'All' : status)}>
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${cfg.text}`} />
                <div>
                  <p className="text-2xl font-extrabold text-gray-800">{count}</p>
                  <p className="text-xs text-gray-500">{status}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field pr-10 appearance-none cursor-pointer min-w-[150px]">
            <option value="All">All Orders</option>
            {Object.keys(statusConfig).map((s) => <option key={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <p className="text-sm text-gray-500">{filtered.length} orders</p>
      </div>

      {/* Orders Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((order) => {
          const cfg = statusConfig[order.status] || statusConfig.Pending;
          const StatusIcon = cfg.icon;
          return (
            <div key={order.id} className={`card border ${cfg.border} hover:-translate-y-1 transition-transform`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`badge ${cfg.color}`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {order.status}
                </span>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${order.type === 'donation' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  {order.type === 'donation' ? 'Donation' : 'Sale'}
                </span>
              </div>

              <h3 className="font-bold text-gray-800 mb-3">{order.food_item}</h3>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-gray-500">
                  <User className="w-3.5 h-3.5" />
                  <span className="truncate">{order.buyer}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Package className="w-3.5 h-3.5" />
                  <span>{order.quantity} {order.unit}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{order.pickup_time}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{order.branch}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-bold text-gray-800">{order.price > 0 ? `Rp${order.price.toLocaleString()}` : 'Free Donation'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {order.status === 'Pending' && (
                  <>
                    <button onClick={() => updateStatus(order.id, 'Confirmed')} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                      Confirm
                    </button>
                    <button onClick={() => updateStatus(order.id, 'Cancelled')} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                      Cancel
                    </button>
                  </>
                )}
                {order.status === 'Confirmed' && (
                  <button onClick={() => updateStatus(order.id, 'Completed')} className="w-full py-2 rounded-xl text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                    Mark Completed
                  </button>
                )}
                {(order.status === 'Completed' || order.status === 'Cancelled') && (
                  <div className="w-full py-2 rounded-xl text-xs font-semibold text-center text-gray-400 bg-gray-50">
                    {order.status}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}
