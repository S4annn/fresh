import React from 'react';
import { DUMMY_BUSINESS_ANALYTICS } from '../../data/businessDummyData';
import { BarChart3, TrendingDown, DollarSign, Leaf, GitBranch, ShoppingBag, Heart, Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts';

export default function BusinessAnalyticsPage() {
  const data = DUMMY_BUSINESS_ANALYTICS;

  const kpis = [
    { title: 'Total Stock Items', value: data.total_stock_items, icon: BarChart3, bg: 'bg-blue-50', text: 'text-blue-600' },
    { title: 'High Risk Items', value: data.high_risk_items, icon: TrendingDown, bg: 'bg-red-50', text: 'text-red-600' },
    { title: 'Loss Prevented', value: `Rp${(data.estimated_loss_prevented / 1000000).toFixed(1)}M`, icon: DollarSign, bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { title: 'Surplus Listings', value: data.surplus_listings, icon: ShoppingBag, bg: 'bg-pink-50', text: 'text-pink-600' },
    { title: 'Active Branches', value: data.total_branches, icon: GitBranch, bg: 'bg-violet-50', text: 'text-violet-600' },
    { title: 'Sustainability Score', value: `${data.sustainability_score}/100`, icon: Leaf, bg: 'bg-teal-50', text: 'text-teal-600' },
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Business Analytics
        </h1>
        <p className="text-gray-500 mt-1">Operational insights and sustainability report.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="card group">
              <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 ${kpi.text}`} />
              </div>
              <p className="text-sm text-gray-500 mb-1">{kpi.title}</p>
              <p className="text-2xl font-extrabold text-gray-800">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Sustainability Banner */}
      <div className="card bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-none">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold mb-1">Sustainability Report</h2>
            <p className="text-emerald-100">Your business has prevented an estimated Rp{data.estimated_loss_prevented.toLocaleString()} in food loss this month, contributing to {data.monthly_waste_reduction}% waste reduction across all branches.</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-extrabold">{data.sustainability_score}</p>
            <p className="text-sm text-emerald-200">Sustainability Score</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Risk Distribution */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            Stock Risk Distribution
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.risk_distribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {data.risk_distribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            {data.risk_distribution.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-600">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Branch Performance */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-violet-500" />
            Branch Performance
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.branch_performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="waste_prevented" fill="#10b981" radius={[4, 4, 0, 0]} name="Waste Prevented" />
                <Bar dataKey="surplus_sold" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Surplus Sold" />
                <Bar dataKey="donations" fill="#ef4444" radius={[4, 4, 0, 0]} name="Donations" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Loss Prevention */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Monthly Loss Prevention (Rp)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthly_loss_prevention}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v / 1000000}M`} />
                <Tooltip formatter={(v) => [`Rp${v.toLocaleString()}`, 'Loss Prevented']} />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Waste */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Waste by Category (%)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.category_waste} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={70} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {data.category_waste.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
