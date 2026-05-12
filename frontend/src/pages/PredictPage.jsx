import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FOOD_CATEGORIES, STORAGE_TYPES, localPredictRisk } from '../data/dummyData';
import { useLanguage } from '../context/LanguageContext';
import * as api from '../api';
import {
  Brain, Sparkles, AlertTriangle, CheckCircle2, Shield, TrendingUp,
  Loader2, ChevronDown, BarChart3, Zap, ShoppingBag, Heart,
} from 'lucide-react';

function getDaysUntil(date) {
  const expiry = new Date(date);
  if (Number.isNaN(expiry.getTime())) return 5;
  return Math.max(0, Math.ceil((expiry - new Date()) / 86400000));
}

function buildInitialForm(prefillFood) {
  return {
    food_name: prefillFood?.food_name || prefillFood?.name || '',
    category: prefillFood?.category || 'Dairy',
    quantity: prefillFood?.quantity || 1,
    days_to_expiry: prefillFood ? getDaysUntil(prefillFood.expiry_date || prefillFood.expiration_date) : 5,
    storage_type: prefillFood?.storage_type || prefillFood?.storage_condition || 'Refrigerated',
    usage_frequency: 'normal',
    temperature: '',
  };
}

export default function PredictPage() {
  const { t, tv } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const prefillFood = location.state?.prefillFood || location.state?.prefillInventory;
  const [form, setForm] = useState(() => buildInitialForm(prefillFood));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        days_to_expiry: Number(form.days_to_expiry),
      };
      const data = await api.predictRisk(payload);
      setResult(data);
    } catch {
      // Fallback to local prediction
      const localResult = localPredictRisk(form);
      setResult(localResult);
    } finally {
      setLoading(false);
    }
  }

  function getRiskColor(label) {
    if (label === 'High Risk') return { gradient: 'from-red-500 to-rose-500', bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' };
    if (label === 'Warning') return { gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' };
    return { gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' };
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
          <Brain className="w-6 h-6 text-violet-600" />
          {t('aiFoodWastePrediction', 'AI Food Waste Prediction')}
        </h1>
        <p className="text-gray-500 mt-1">{t('predictSubtitle', 'Predict the risk of food waste using our AI model.')}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            {t('predictionInput', 'Prediction Input')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">{t('foodName', 'Food Name')}</label>
              <input
                type="text"
                value={form.food_name}
                onChange={(e) => setForm({ ...form, food_name: e.target.value })}
                className="input-field"
                placeholder="e.g. Pisang Cavendish"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">{t('category', 'Category')}</label>
                <div className="relative">
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field appearance-none pr-10">
                    {FOOD_CATEGORIES.map((c) => <option key={c} value={c}>{tv(c)}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="input-label">{t('quantity', 'Quantity')}</label>
                <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input-field" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">{t('daysToExpiry', 'Days to Expiry')}</label>
                <input type="number" min="0" value={form.days_to_expiry} onChange={(e) => setForm({ ...form, days_to_expiry: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="input-label">{t('storageType', 'Storage Type')}</label>
                <div className="relative">
                  <select value={form.storage_type} onChange={(e) => setForm({ ...form, storage_type: e.target.value })} className="input-field appearance-none pr-10">
                    {STORAGE_TYPES.map((s) => <option key={s} value={s}>{tv(s)}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">{t('usageFrequency', 'Usage Frequency')}</label>
                <div className="relative">
                  <select value={form.usage_frequency} onChange={(e) => setForm({ ...form, usage_frequency: e.target.value })} className="input-field appearance-none pr-10">
                    <option value="rarely">{t('rarely', 'Rarely')}</option>
                    <option value="normal">{t('normal', 'Normal')}</option>
                    <option value="often">{t('often', 'Often')}</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="input-label">{t('temperatureOptional', 'Temperature (optional)')}</label>
                <input type="text" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} className="input-field" placeholder="e.g. 4°C" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base mt-2">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('analyzing', 'Analyzing...')}
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  {t('predictRisk', 'Predict Risk')}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Result */}
        <div>
          {result ? (
            <div className="space-y-4 animate-slide-up">
              {/* Risk Score Card */}
              <div className={`card ${getRiskColor(result.risk_label).bg} border-2 ${
                result.risk_label === 'High Risk' ? 'border-red-200' : result.risk_label === 'Warning' ? 'border-amber-200' : 'border-emerald-200'
              }`}>
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4 ${
                    result.risk_label === 'High Risk' ? 'bg-red-100 text-red-700' :
                    result.risk_label === 'Warning' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {result.risk_label === 'High Risk' ? <AlertTriangle className="w-4 h-4" /> :
                     result.risk_label === 'Warning' ? <Shield className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {tv(result.risk_label)}
                  </div>

                  <p className="text-sm text-gray-500 mb-2">{t('riskScore', 'Risk Score')}</p>
                  <div className="relative inline-flex items-center justify-center w-40 h-40">
                    <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" stroke="#e5e7eb" strokeWidth="10" fill="none" />
                      <circle
                        cx="60" cy="60" r="52"
                        stroke={result.risk_label === 'High Risk' ? '#ef4444' : result.risk_label === 'Warning' ? '#f59e0b' : '#10b981'}
                        strokeWidth="10" fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${(result.risk_score / 100) * 327} 327`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-4xl font-extrabold ${getRiskColor(result.risk_label).text}`}>{result.risk_score}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{t('lowRisk', 'Low Risk')}</span>
                    <span>{t('highRisk', 'High Risk')}</span>
                  </div>
                  <div className="h-3 bg-white/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getRiskColor(result.risk_label).bar} transition-all duration-1000`}
                      style={{ width: `${result.risk_score}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Explanation */}
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  {t('analysis', 'Analysis')}
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">{result.explanation}</p>

                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  {t('suggestedAction', 'Suggested Action')}
                </h3>
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
                  <p className="text-violet-700 font-medium">{result.suggested_action}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/marketplace', { state: { prefillListing: { ...prefillFood, ...form, risk_label: result.risk_label } } })}
                    className="btn-secondary justify-center"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Sell
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/donation', { state: { prefillDonation: { ...prefillFood, ...form, risk_label: result.risk_label } } })}
                    className="btn-secondary justify-center"
                  >
                    <Heart className="w-4 h-4" />
                    Donate
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-3">{t('predictionDetails', 'Prediction Details')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">{t('foodName', 'Food Name')}</p>
                    <p className="font-semibold text-gray-800">{result.food_name || form.food_name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">{t('daysToExpiry', 'Days to Expiry')}</p>
                    <p className="font-semibold text-gray-800">{result.days_to_expiry || form.days_to_expiry} {t('days', 'days')}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">{t('storage', 'Storage')}</p>
                    <p className="font-semibold text-gray-800">{tv(form.storage_type)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">{t('usage', 'Usage')}</p>
                    <p className="font-semibold text-gray-800 capitalize">{t(form.usage_frequency, form.usage_frequency)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-10 h-10 text-violet-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{t('readyToPredict', 'Ready to Predict')}</h3>
                <p className="text-gray-500 max-w-xs mx-auto">{t('readyToPredictDesc', 'Fill in the food details and click "Predict Risk" to get AI-powered waste analysis.')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
