import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import PlanUsageCard from '../components/PlanUsageCard';
import { DemoBanner } from '../components/DemoUsageIndicator';
import { DUMMY_FOODS, DUMMY_ANALYTICS, DUMMY_RECOMMENDATIONS } from '../data/dummyData';
import * as api from '../api';
import {
  Package, AlertTriangle, Clock, TrendingDown, Plus, Brain, ShoppingBag, Heart,
  ArrowRight, Sparkles, AlertCircle, CheckCircle2, Flame, ChevronRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isDemoMode } = useAuth();
  const { t, tv } = useLanguage();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [isDemoMode]);

  async function loadData() {
    setLoading(true);
    try {
      // Use API with demo tracking
      const foodsData = await api.getFoods();
      setFoods(foodsData || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Fallback to dummy data for demo
      setFoods(DUMMY_FOODS);
    } finally {
      setLoading(false);
    }
  }

  const totalItems = foods.length;
  const highRisk = foods.filter((f) => f.risk_level === 'High Risk').length;
  const warning = foods.filter((f) => f.risk_level === 'Warning').length;
  const safe = foods.filter((f) => f.risk_level === 'Safe').length;
  const expiringSoon = foods.filter((f) => {
    const days = Math.ceil((new Date(f.expiry_date) - new Date()) / 86400000);
    return days <= 2 && days >= 0;
  }).length;

  const statCards = [
    { title: t('totalFoodItems', 'Total Food Items'), value: totalItems, icon: Package, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-600' },
    { title: t('highRiskItems', 'High Risk Items'), value: highRisk, icon: AlertTriangle, color: 'from-red-500 to-rose-500', bg: 'bg-red-50', text: 'text-red-600' },
    { title: t('expiringSoon', 'Expiring Soon'), value: expiringSoon, icon: Clock, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-600' },
    { title: t('savedWasteEst', 'Saved Waste Est.'), value: `${isDemoMode ? DUMMY_ANALYTICS.total_waste_prevented : 0}`, icon: TrendingDown, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  ];

  const quickActions = [
    { label: t('addFood', 'Add Food'), icon: Plus, path: '/inventory', color: 'from-emerald-500 to-teal-500' },
    { label: t('predictRisk', 'Predict Risk'), icon: Brain, path: '/predict', color: 'from-violet-500 to-purple-500' },
    { label: t('marketplace', 'Marketplace'), icon: ShoppingBag, path: '/marketplace', color: 'from-pink-500 to-rose-500' },
    { label: t('createDonation', 'Create Donation'), icon: Heart, path: '/donation', color: 'from-red-500 to-rose-500' },
  ];

  const recentFoods = foods.slice(0, 5);
  const expiryAlerts = foods
    .filter((f) => f.risk_level !== 'Safe')
    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
    .slice(0, 4);

  const topRecommendations = isDemoMode ? DUMMY_RECOMMENDATIONS.slice(0, 3) : [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('goodMorning', 'Good Morning') : hour < 17 ? t('goodAfternoon', 'Good Afternoon') : t('goodEvening', 'Good Evening');

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
      {/* Demo Banner */}
      <DemoBanner />

      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">
            {greeting}, {user?.name?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-gray-500 mt-1">{t('todayOverview', "Here's your food management overview for today.")}</p>
        </div>
        <Link to="/inventory" className="btn-primary text-sm no-underline self-start">
          <Plus className="w-4 h-4" />
          {t('addFood', 'Add Food')}
        </Link>
      </div>

      <PlanUsageCard />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
              <p className="text-3xl font-extrabold text-gray-800">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* AI Risk Overview */}
        <div className="lg:col-span-3 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Brain className="w-5 h-5 text-emerald-600" />
              {t('aiRiskOverview', 'AI Risk Overview')}
            </h2>
            <Link to="/predict" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium no-underline flex items-center gap-1">
              {t('viewAll', 'View All')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-700">{safe}</p>
              <p className="text-xs text-emerald-600 font-medium">{t('safe', 'Safe')}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-700">{warning}</p>
              <p className="text-xs text-amber-600 font-medium">{t('warning', 'Warning')}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Flame className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-700">{highRisk}</p>
              <p className="text-xs text-red-600 font-medium">{t('highRisk', 'High Risk')}</p>
            </div>
          </div>

          {/* Risk Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{t('overallHealthScore', 'Overall Health Score')}</span>
              <span className="font-bold text-emerald-600">{totalItems > 0 ? Math.round((safe / totalItems) * 100) : 0}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full flex">
                {totalItems > 0 && (
                  <>
                    <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(safe / totalItems) * 100}%` }} />
                    <div className="bg-amber-400 transition-all duration-500" style={{ width: `${(warning / totalItems) * 100}%` }} />
                    <div className="bg-red-500 transition-all duration-500" style={{ width: `${(highRisk / totalItems) * 100}%` }} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            {t('quickActions', 'Quick Actions')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <Link
                  key={i}
                  to={action.path}
                  className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-emerald-50 hover:shadow-md transition-all duration-200 no-underline group"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Expiry Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {t('expiryAlerts', 'Expiry Alerts')}
            </h2>
            <Link to="/inventory" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium no-underline flex items-center gap-1">
              {t('viewAll', 'View All')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {expiryAlerts.length > 0 ? (
            <div className="space-y-3">
              {expiryAlerts.map((food) => {
                const daysLeft = Math.ceil((new Date(food.expiry_date) - new Date()) / 86400000);
                const isHighRisk = food.risk_level === 'High Risk';
                return (
                  <div key={food.id} className={`flex items-center gap-4 p-3 rounded-xl ${isHighRisk ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${isHighRisk ? 'bg-red-100' : 'bg-amber-100'}`}>
                      {food.category === 'Fruit' ? '🍎' : food.category === 'Meat' ? '🍗' : food.category === 'Vegetable' ? '🥬' : food.category === 'Dairy' ? '🥛' : '🍽️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{food.food_name}</p>
                      <p className={`text-xs ${isHighRisk ? 'text-red-600' : 'text-amber-600'}`}>
                        {daysLeft <= 0 ? t('expiredBang', 'Expired!') : `${t('expiresIn', 'Expires in')} ${daysLeft} ${daysLeft !== 1 ? t('days', 'days') : t('day', 'day')}`}
                      </p>
                    </div>
                    <span className={`badge ${isHighRisk ? 'badge-danger' : 'badge-warning'}`}>
                      {tv(food.risk_level)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">{t('noExpiryAlerts', 'No expiry alerts! All items are safe.')}</p>
            </div>
          )}
        </div>

        {/* Smart Recommendations */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              {t('smartRecommendations', 'Smart Recommendations')}
            </h2>
            <Link to="/recommendations" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium no-underline flex items-center gap-1">
              {t('viewAll', 'View All')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {topRecommendations.map((rec) => (
              <div key={rec.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50/50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${rec.urgency === 'high' ? 'bg-red-500' : 'bg-amber-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{rec.food_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{rec.recipe} - {t('expiresIn', 'Expires in')} {rec.expires_in}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                  rec.action === 'use_today' ? 'bg-red-100 text-red-700' :
                  rec.action === 'cook_recipe' ? 'bg-violet-100 text-violet-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {rec.action === 'use_today' ? t('useToday', 'Use Today') : rec.action === 'cook_recipe' ? t('cook', 'Cook') : t('sell', 'Sell')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Inventory */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            {t('recentInventory', 'Recent Inventory')}
          </h2>
          <Link to="/inventory" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium no-underline flex items-center gap-1">
            {t('viewAll', 'View All')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('foodItem', 'Food Item')}</th>
                <th>{t('category', 'Category')}</th>
                <th>{t('quantity', 'Quantity')}</th>
                <th>{t('expiryDate', 'Expiry Date')}</th>
                <th>{t('status', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {recentFoods.map((food) => (
                <tr key={food.id}>
                  <td className="font-semibold text-gray-800">{food.food_name}</td>
                  <td>{tv(food.category)}</td>
                  <td>{food.quantity} {food.unit}</td>
                  <td>{food.expiry_date}</td>
                  <td>
                    <span className={`badge ${
                      food.risk_level === 'Safe' ? 'badge-safe' :
                      food.risk_level === 'Warning' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {tv(food.risk_level)}
                    </span>
                  </td>
                </tr>
              ))}
              {recentFoods.length === 0 && (
                <tr><td colSpan="5" className="text-center text-gray-400 py-8">{t('noFoodItemsYet', 'No food items yet. Add your first item!')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
