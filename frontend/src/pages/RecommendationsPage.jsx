import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DUMMY_RECOMMENDATIONS, WASTE_TIPS, DUMMY_FOODS } from '../data/dummyData';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';
import {
  Lightbulb, Clock, ShoppingBag, Heart, Utensils, ChefHat,
  ArrowRight, Sparkles, AlertTriangle, Flame, Info,
} from 'lucide-react';

const actionConfig = {
  use_today: { label: 'Use Today', icon: Flame, color: 'bg-red-100 text-red-700', border: 'border-red-200' },
  cook_recipe: { label: 'Cook Recipe', icon: ChefHat, color: 'bg-violet-100 text-violet-700', border: 'border-violet-200' },
  sell_marketplace: { label: 'Sell in Marketplace', icon: ShoppingBag, color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
  donate: { label: 'Donate', icon: Heart, color: 'bg-pink-100 text-pink-700', border: 'border-pink-200' },
};

export default function RecommendationsPage() {
  const { isDemoMode } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    loadRecommendations();
  }, [isDemoMode]);

  async function loadRecommendations() {
    setLoading(true);
    if (!isDemoMode) {
      setRecommendations([]);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getRecommendations();
      setRecommendations(Array.isArray(data) && data.length > 0 ? data : DUMMY_RECOMMENDATIONS);
    } catch {
      setRecommendations(DUMMY_RECOMMENDATIONS);
    } finally {
      setLoading(false);
    }
  }

  const filtered = activeFilter === 'all' ? recommendations : recommendations.filter((r) => r.urgency === activeFilter || r.action === activeFilter);

  const priorityFoods = isDemoMode
    ? DUMMY_FOODS
      .filter((f) => f.risk_level !== 'Safe')
      .sort((a, b) => a.risk_score > b.risk_score ? -1 : 1)
      .slice(0, 5)
    : [];
  const tips = isDemoMode ? WASTE_TIPS : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-amber-500" />
          Smart Recommendations
        </h1>
        <p className="text-gray-500 mt-1">AI-powered suggestions to minimize food waste.</p>
      </div>

      {/* Priority Foods */}
      <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Use These First
        </h2>
        {priorityFoods.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {priorityFoods.map((food) => (
            <div key={food.id} className="flex-shrink-0 bg-white rounded-xl p-4 border border-amber-100 min-w-[160px]">
              <span className={`badge ${food.risk_level === 'High Risk' ? 'badge-danger' : 'badge-warning'} mb-2`}>
                {food.risk_level}
              </span>
              <p className="font-bold text-gray-800 text-sm">{food.food_name}</p>
              <p className="text-xs text-gray-500 mt-1">{food.quantity} {food.unit}</p>
              <p className={`text-xs mt-1 ${food.risk_level === 'High Risk' ? 'text-red-500' : 'text-amber-500'}`}>
                Expires: {food.expiry_date}
              </p>
            </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No priority foods yet.</p>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'All' },
          { key: 'high', label: 'Urgent' },
          { key: 'use_today', label: 'Use Today' },
          { key: 'cook_recipe', label: 'Recipes' },
          { key: 'sell_marketplace', label: 'Marketplace' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeFilter === f.key
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Recipe Suggestions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((rec) => {
          const action = actionConfig[rec.action] || actionConfig.use_today;
          const ActionIcon = action.icon;
          return (
            <div key={rec.id} className="card group hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <span className={`badge ${action.color}`}>
                  <ActionIcon className="w-3 h-3 mr-1" />
                  {action.label}
                </span>
                <span className={`text-xs font-bold ${rec.urgency === 'high' ? 'text-red-500' : 'text-amber-500'}`}>
                  {rec.expires_in}
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-800 mb-1">{rec.food_name}</h3>
              <div className="flex items-center gap-2 mb-3">
                <ChefHat className="w-4 h-4 text-emerald-500" />
                <p className="text-sm font-semibold text-emerald-700">{rec.recipe}</p>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{rec.recipe_description}</p>

              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600">{rec.tips}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                {rec.action === 'sell_marketplace' && (
                  <Link to="/marketplace" className="btn-ghost text-xs flex-1 no-underline">
                    <ShoppingBag className="w-3 h-3" /> Marketplace
                  </Link>
                )}
                {rec.urgency === 'high' && (
                  <Link to="/donation" className="btn-ghost text-xs flex-1 no-underline">
                    <Heart className="w-3 h-3" /> Donate
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3 text-center py-12 card">
            <Lightbulb className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No recommendations yet</p>
            <p className="text-gray-400 text-sm mt-1">Add inventory items to generate suggestions.</p>
          </div>
        )}
      </div>

      {/* Waste Reduction Tips */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          Food Waste Reduction Tips
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50/50 rounded-xl">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-emerald-600">{i + 1}</span>
              </div>
              <p className="text-sm text-gray-700">{tip}</p>
            </div>
          ))}
          {tips.length === 0 && (
            <p className="text-sm text-gray-500">No tips available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
