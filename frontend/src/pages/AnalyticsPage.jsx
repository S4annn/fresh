import React, { useState, useEffect } from 'react';
import { DUMMY_ANALYTICS } from '../data/dummyData';
import { useAuth } from '../context/AuthContext';
import * as apiModule from '../api';
import { LockedPreview } from '../components/FeatureGate';
import { canAccessAnalyticsLevel, useSubscription } from '../services/subscription';
import {
  BarChart3, TrendingDown, Heart, ShoppingBag, DollarSign, Leaf, Sparkles,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Legend, AreaChart, Area, LineChart, Line,
} from 'recharts';

const EMPTY_ANALYTICS = {
  total_items: 0,
  total_waste_prevented: 0,
  total_donations: 0,
  total_marketplace: 0,
  money_saved: 0,
  co2_reduced: 0,
  risk_distribution: [],
  category_distribution: [],
  weekly_waste: [],
  monthly_savings: [],
};

const RISK_COLORS = {
  Safe: '#10b981',
  Warning: '#f59e0b',
  'High Risk': '#ef4444',
};

function normalizeAnalytics(result, fallback = EMPTY_ANALYTICS) {
  const riskDistribution = result?.risk_distribution || fallback.risk_distribution || [];
  return {
    ...fallback,
    total_items: result?.total_items ?? result?.total_food_items ?? fallback.total_items ?? 0,
    total_waste_prevented: result?.total_waste_prevented ?? result?.estimated_waste_prevented_kg ?? fallback.total_waste_prevented ?? 0,
    total_donations: result?.total_donations ?? fallback.total_donations ?? 0,
    total_marketplace: result?.total_marketplace ?? result?.total_marketplace_listings ?? fallback.total_marketplace ?? 0,
    money_saved: result?.money_saved ?? result?.estimated_money_saved ?? fallback.money_saved ?? 0,
    co2_reduced: result?.co2_reduced ?? result?.estimated_co2e_reduced ?? fallback.co2_reduced ?? 0,
    risk_distribution: riskDistribution.map((item) => ({
      ...item,
      color: item.color || RISK_COLORS[item.name] || '#64748b',
    })),
    category_distribution: result?.category_distribution || fallback.category_distribution || [],
    weekly_waste: result?.weekly_waste || fallback.weekly_waste || [],
    monthly_savings: result?.monthly_savings || fallback.monthly_savings || [],
  };
}

export default function AnalyticsPage() {
  const { isDemoMode } = useAuth();
  const { plan } = useSubscription();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [isDemoMode]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const result = await apiModule.getAnalytics();
      setData(normalizeAnalytics(result, isDemoMode ? DUMMY_ANALYTICS : EMPTY_ANALYTICS));
    } catch {
      setData(isDemoMode ? normalizeAnalytics(DUMMY_ANALYTICS, DUMMY_ANALYTICS) : EMPTY_ANALYTICS);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const insightCards = [
    { title: 'Total Items Tracked', value: data.total_items, icon: BarChart3, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-600' },
    { title: 'Waste Prevented', value: `${data.total_waste_prevented} items`, icon: TrendingDown, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { title: 'Total Donations', value: data.total_donations, icon: Heart, color: 'from-red-500 to-rose-500', bg: 'bg-red-50', text: 'text-red-600' },
    { title: 'Marketplace Listings', value: data.total_marketplace, icon: ShoppingBag, color: 'from-pink-500 to-rose-500', bg: 'bg-pink-50', text: 'text-pink-600' },
    { title: 'Money Saved', value: `Rp${data.money_saved?.toLocaleString()}`, icon: DollarSign, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-600' },
    { title: 'CO₂ Reduced', value: `${data.co2_reduced} kg`, icon: Leaf, color: 'from-teal-500 to-cyan-500', bg: 'bg-teal-50', text: 'text-teal-600' },
  ];
  const hasAdvancedAnalytics = canAccessAnalyticsLevel('advanced');

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-500" />
          Dasbor Analitik
        </h1>
        <p className="text-gray-500 mt-1">Pantau dampak dan wawasan pengelolaan makanan Anda.</p>
      </div>

      <div className="card border-emerald-100 bg-emerald-50/70">
        <p className="text-sm font-bold text-gray-800">Analytics level: {plan.limits.analytics_level}</p>
        <p className="mt-1 text-xs text-gray-600">
          {hasAdvancedAnalytics ? 'Advanced analytics are unlocked for this plan.' : 'Free plan includes basic analytics. Upgrade to Personal Plus for money saved, trend, donation, and marketplace activity charts.'}
        </p>
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {insightCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`card group ${!hasAdvancedAnalytics && i >= 2 ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-5 h-5 ${card.text}`} />
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">{card.title}</p>
              <p className="text-2xl font-extrabold text-gray-800">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Risk Distribution */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            Risk Distribution
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.risk_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {data.risk_distribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            {data.risk_distribution.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-600">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution */}
        {hasAdvancedAnalytics ? (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Food Categories
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.category_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {data.category_distribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        ) : (
          <LockedPreview
            currentPlan={plan.plan_name}
            requiredPlan="Personal Plus"
            description="Category breakdown is available on Personal Plus."
          >
            <div className="card h-96" />
          </LockedPreview>
        )}

        {/* Weekly Waste Prevention */}
        {hasAdvancedAnalytics ? (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-emerald-500" />
            Weekly Waste Prevention
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.weekly_waste}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="prevented" stroke="#10b981" fill="#d1fae5" strokeWidth={2} name="Prevented" />
                <Area type="monotone" dataKey="wasted" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} name="Wasted" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        ) : (
          <LockedPreview
            currentPlan={plan.plan_name}
            requiredPlan="Personal Plus"
            description="Monthly trend charts are available on Personal Plus."
          >
            <div className="card h-96" />
          </LockedPreview>
        )}

        {/* Monthly Savings */}
        {hasAdvancedAnalytics ? (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-500" />
            Monthly Savings
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthly_savings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value / 1000}K`} />
                <Tooltip formatter={(value) => [`Rp${value.toLocaleString()}`, 'Savings']} />
                <Line type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', strokeWidth: 2, r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        ) : (
          <LockedPreview
            currentPlan={plan.plan_name}
            requiredPlan="Personal Plus"
            description="Money saved analytics are available on Personal Plus."
          >
            <div className="card h-96" />
          </LockedPreview>
        )}
      </div>
    </div>
  );
}
