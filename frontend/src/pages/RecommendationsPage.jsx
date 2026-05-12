import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DUMMY_RECOMMENDATIONS, WASTE_TIPS, DUMMY_FOODS } from '../data/dummyData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import * as api from '../api';
import {
  Lightbulb, Clock, ShoppingBag, Heart, Utensils, ChefHat,
  ArrowRight, Sparkles, AlertTriangle, Flame, Info,
} from 'lucide-react';

const actionConfig = {
  use_today: { labelKey: 'useToday', fallback: 'Use Today', icon: Flame, color: 'bg-red-100 text-red-700', border: 'border-red-200' },
  cook_recipe: { labelKey: 'recipes', fallback: 'Cook Recipe', icon: ChefHat, color: 'bg-violet-100 text-violet-700', border: 'border-violet-200' },
  sell_marketplace: { labelKey: 'marketplace', fallback: 'Sell in Marketplace', icon: ShoppingBag, color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
  donate: { labelKey: 'donate', fallback: 'Donate', icon: Heart, color: 'bg-pink-100 text-pink-700', border: 'border-pink-200' },
};

export default function RecommendationsPage() {
  const { isDemoMode } = useAuth();
  const { t, tv } = useLanguage();
  const [recommendations, setRecommendations] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    loadRecommendations();
  }, [isDemoMode]);

  async function loadRecommendations() {
    setLoading(true);
    try {
      const [data, foodsData] = await Promise.all([api.getRecommendations(), api.getFoods()]);
      setRecommendations(Array.isArray(data) && (data.length > 0 || !isDemoMode) ? data : DUMMY_RECOMMENDATIONS);
      setFoods(Array.isArray(foodsData) && (foodsData.length > 0 || !isDemoMode) ? foodsData : DUMMY_FOODS);
    } catch {
      setRecommendations(isDemoMode ? DUMMY_RECOMMENDATIONS : []);
      setFoods(isDemoMode ? DUMMY_FOODS : []);
    } finally {
      setLoading(false);
    }
  }

  const filtered = activeFilter === 'all' ? recommendations : recommendations.filter((r) => r.urgency === activeFilter || r.action === activeFilter);

  const priorityFoods = foods
    .filter((f) => (f.risk_level || f.risk_label) !== 'Safe')
    .sort((a, b) => Number(b.risk_score || 0) - Number(a.risk_score || 0))
    .slice(0, 5);
  const tips = WASTE_TIPS;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{t('loadingFresh', 'Loading F.R.E.S.H...')}</p>
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
          {t('smartRecommendations', 'Smart Recommendations')}
        </h1>
        <p className="text-gray-500 mt-1">{t('recommendationsSubtitle', 'AI-powered suggestions to minimize food waste.')}</p>
      </div>

      {/* Priority Foods */}
      <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          {t('useTheseFirst', 'Use These First')}
        </h2>
        {priorityFoods.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {priorityFoods.map((food) => (
            <div key={food.id} className="flex-shrink-0 bg-white rounded-xl p-4 border border-amber-100 min-w-[160px]">
              <span className={`badge ${(food.risk_level || food.risk_label) === 'High Risk' ? 'badge-danger' : 'badge-warning'} mb-2`}>
                {tv(food.risk_level || food.risk_label)}
              </span>
              <p className="font-bold text-gray-800 text-sm">{food.food_name || food.name}</p>
              <p className="text-xs text-gray-500 mt-1">{food.quantity} {food.unit}</p>
              <p className={`text-xs mt-1 ${(food.risk_level || food.risk_label) === 'High Risk' ? 'text-red-500' : 'text-amber-500'}`}>
                {t('expiry', 'Expires')}: {food.expiry_date || food.expiration_date}
              </p>
            </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">{t('noPriorityFoods', 'No priority foods yet.')}</p>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: t('all', 'All') },
          { key: 'high', label: t('urgent', 'Urgent') },
          { key: 'use_today', label: t('useToday', 'Use Today') },
          { key: 'cook_recipe', label: t('recipes', 'Recipes') },
          { key: 'sell_marketplace', label: t('marketplace', 'Marketplace') },
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
                  {t(action.labelKey, action.fallback)}
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
                  <Link to="/marketplace" state={{ prefillListing: rec }} className="btn-ghost text-xs flex-1 no-underline">
                    <ShoppingBag className="w-3 h-3" /> Marketplace
                  </Link>
                )}
                {rec.urgency === 'high' && (
                  <Link to="/donation" state={{ prefillDonation: rec }} className="btn-ghost text-xs flex-1 no-underline">
                    <Heart className="w-3 h-3" /> {t('donate', 'Donate')}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3 text-center py-12 card">
            <Lightbulb className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">{t('noRecommendationsYet', 'No recommendations yet')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('addInventoryForSuggestions', 'Add inventory items to generate suggestions.')}</p>
          </div>
        )}
      </div>

      {/* Waste Reduction Tips */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          {t('foodWasteTips', 'Food Waste Reduction Tips')}
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
            <p className="text-sm text-gray-500">{t('noTipsAvailable', 'No tips available yet.')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
