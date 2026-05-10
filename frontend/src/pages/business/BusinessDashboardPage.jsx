import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DUMMY_BUSINESS_INVENTORY, DUMMY_BRANCHES, DUMMY_ORDERS, DUMMY_BUSINESS_ANALYTICS } from '../../data/businessDummyData';
import {
  Package, AlertTriangle, TrendingDown, ShoppingBag, GitBranch, BarChart3,
  Plus, Brain, Heart, ClipboardList, ArrowRight, Sparkles, Flame,
  CheckCircle2, AlertCircle, ChevronRight, Scan, DollarSign, Leaf,
} from 'lucide-react';

export default function BusinessDashboardPage() {
  const { user } = useAuth();
  const [inventory] = useState(DUMMY_BUSINESS_INVENTORY);
  const analytics = DUMMY_BUSINESS_ANALYTICS;

  const highRisk = inventory.filter((i) => i.risk_level === 'High Risk').length;
  const warning = inventory.filter((i) => i.risk_level === 'Warning').length;
  const safe = inventory.filter((i) => i.risk_level === 'Safe').length;
  const totalLoss = inventory.reduce((sum, i) => sum + (i.estimated_loss || 0), 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const statCards = [
    { title: 'Total Stock Items', value: inventory.length, icon: Package, color: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50', text: 'text-blue-600', sub: 'Across all branches' },
    { title: 'High Risk Inventory', value: highRisk, icon: AlertTriangle, color: 'from-red-500 to-rose-500', bg: 'bg-red-50', text: 'text-red-600', sub: 'Needs immediate action' },
    { title: 'Est. Loss Prevented', value: `Rp${(analytics.estimated_loss_prevented / 1000000).toFixed(1)}M`, icon: TrendingDown, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600', sub: 'This month' },
    { title: 'Surplus Listings', value: analytics.surplus_listings, icon: ShoppingBag, color: 'from-pink-500 to-rose-500', bg: 'bg-pink-50', text: 'text-pink-600', sub: 'Active marketplace' },
    { title: 'Active Branches', value: DUMMY_BRANCHES.length, icon: GitBranch, color: 'from-violet-500 to-purple-500', bg: 'bg-violet-50', text: 'text-violet-600', sub: 'All operational' },
    { title: 'Waste Reduction', value: `${analytics.monthly_waste_reduction}%`, icon: Leaf, color: 'from-teal-500 to-cyan-500', bg: 'bg-teal-50', text: 'text-teal-600', sub: 'vs last month' },
  ];

  const quickActions = [
    { label: 'Scan Stock', icon: Scan, path: '/business/scanner', color: 'from-emerald-500 to-teal-500' },
    { label: 'Add Inventory', icon: Plus, path: '/business/inventory', color: 'from-blue-500 to-indigo-500' },
    { label: 'Create Listing', icon: ShoppingBag, path: '/business/marketplace', color: 'from-pink-500 to-rose-500' },
    { label: 'Schedule Donation', icon: Heart, path: '/business/donation', color: 'from-red-500 to-rose-500' },
    { label: 'View Orders', icon: ClipboardList, path: '/business/orders', color: 'from-amber-500 to-orange-500' },
    { label: 'Analytics', icon: BarChart3, path: '/business/analytics', color: 'from-violet-500 to-purple-500' },
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">Business Control Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">
            {greeting}, {user?.name?.split(' ')[0] || 'Manager'} 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's your operational overview for today.</p>
        </div>
        <Link to="/business/inventory" className="btn-primary text-sm no-underline self-start" style={{ background: 'linear-gradient(to right, #3b82f6, #6366f1)' }}>
          <Plus className="w-4 h-4" />
          Add Stock
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="card group">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-11 h-11 ${stat.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-5 h-5 ${stat.text}`} />
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 mb-0.5">{stat.title}</p>
              <p className="text-2xl font-extrabold text-gray-800">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* AI Risk Overview */}
        <div className="lg:col-span-3 card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              Stock Risk Overview
            </h2>
            <Link to="/business/predict" className="text-sm text-blue-600 hover:text-blue-700 font-medium no-underline flex items-center gap-1">
              Forecast <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { label: 'Safe', count: safe, icon: CheckCircle2, bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', textColor: 'text-emerald-700' },
              { label: 'Warning', count: warning, icon: AlertCircle, bg: 'bg-amber-50', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', textColor: 'text-amber-700' },
              { label: 'High Risk', count: highRisk, icon: Flame, bg: 'bg-red-50', iconBg: 'bg-red-100', iconColor: 'text-red-600', textColor: 'text-red-700' },
            ].map(({ label, count, icon: Icon, bg, iconBg, iconColor, textColor }) => (
              <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
                <div className={`w-10 h-10 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-2`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <p className={`text-2xl font-bold ${textColor}`}>{count}</p>
                <p className={`text-xs ${iconColor} font-medium`}>{label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Inventory Health Score</span>
              <span className="font-bold text-blue-600">{inventory.length > 0 ? Math.round((safe / inventory.length) * 100) : 0}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full flex">
                {inventory.length > 0 && (
                  <>
                    <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(safe / inventory.length) * 100}%` }} />
                    <div className="bg-amber-400 transition-all duration-500" style={{ width: `${(warning / inventory.length) * 100}%` }} />
                    <div className="bg-red-500 transition-all duration-500" style={{ width: `${(highRisk / inventory.length) * 100}%` }} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Estimated Loss */}
          <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-red-700">Estimated Loss at Risk</span>
              </div>
              <span className="text-lg font-extrabold text-red-700">Rp{totalLoss.toLocaleString()}</span>
            </div>
            <p className="text-xs text-red-500 mt-1">From high-risk and warning items across all branches</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <Link key={i} to={action.path} className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 hover:shadow-md transition-all duration-200 no-underline group">
                  <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 text-center">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* High Risk Items */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Urgent Stock Alerts
            </h2>
            <Link to="/business/inventory" className="text-sm text-blue-600 font-medium no-underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {inventory.filter((i) => i.risk_level !== 'Safe').slice(0, 4).map((item) => (
              <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl ${item.risk_level === 'High Risk' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${item.risk_level === 'High Risk' ? 'bg-red-100' : 'bg-amber-100'}`}>
                  {item.category === 'Protein' ? '🍗' : item.category === 'Dairy' ? '🥛' : item.category === 'Vegetable' ? '🥬' : item.category === 'Bakery' ? '🍞' : '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{item.item_name}</p>
                  <p className="text-xs text-gray-500">Batch {item.batch_code} · {item.branch.split(' ').slice(-1)[0]}</p>
                  <p className={`text-xs font-medium ${item.risk_level === 'High Risk' ? 'text-red-600' : 'text-amber-600'}`}>
                    Exp: {item.expiry_date} · Loss: Rp{item.estimated_loss?.toLocaleString()}
                  </p>
                </div>
                <span className={`badge ${item.risk_level === 'High Risk' ? 'badge-danger' : 'badge-warning'} text-xs`}>
                  {item.risk_level}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-500" />
              Recent Orders
            </h2>
            <Link to="/business/orders" className="text-sm text-blue-600 font-medium no-underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {DUMMY_ORDERS.map((order) => (
              <div key={order.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${order.status === 'Completed' ? 'bg-emerald-500' : order.status === 'Confirmed' ? 'bg-blue-500' : 'bg-amber-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{order.food_item}</p>
                  <p className="text-xs text-gray-500">{order.buyer} · {order.pickup_time}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">{order.price > 0 ? `Rp${order.price.toLocaleString()}` : 'Donation'}</p>
                  <span className={`text-xs font-medium ${order.status === 'Completed' ? 'text-emerald-600' : order.status === 'Confirmed' ? 'text-blue-600' : 'text-amber-600'}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Branch Overview */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-violet-500" />
            Branch Performance
          </h2>
          <Link to="/business/branches" className="text-sm text-blue-600 font-medium no-underline flex items-center gap-1">
            Manage <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {DUMMY_BRANCHES.map((branch) => (
            <div key={branch.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <GitBranch className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{branch.branch_name.split(' ').slice(-2).join(' ')}</p>
                  <p className="text-xs text-gray-500">{branch.location.split(',').pop().trim()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/70 rounded-lg p-2">
                  <p className="text-gray-500">Stock</p>
                  <p className="font-bold text-gray-800">{branch.total_inventory} items</p>
                </div>
                <div className="bg-white/70 rounded-lg p-2">
                  <p className="text-gray-500">High Risk</p>
                  <p className={`font-bold ${branch.high_risk_items > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{branch.high_risk_items}</p>
                </div>
                <div className="bg-white/70 rounded-lg p-2">
                  <p className="text-gray-500">Prevented</p>
                  <p className="font-bold text-emerald-600">{branch.waste_prevented}</p>
                </div>
                <div className="bg-white/70 rounded-lg p-2">
                  <p className="text-gray-500">Listings</p>
                  <p className="font-bold text-blue-600">{branch.marketplace_listings}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
