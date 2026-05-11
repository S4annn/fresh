import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { getUsageLabel, useSubscription } from '../services/subscription';
import { cancelSubscription } from '../api';
import {
  Settings, User, Bell, Shield, LogOut, Save,
  Globe, Smartphone, Mail, Check, CreditCard, Crown,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, logout, isFirebaseConfigured } = useAuth();
  const { setRole } = useRole();
  const { language, setLanguage, t } = useLanguage();
  const { subscription, plan, refreshSubscription } = useSubscription();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  const [prefs, setPrefs] = useState({
    name: user?.name || '',
    email: user?.email || '',
    language,
    expiryNotification: true,
    riskAlerts: true,
    weeklyReport: false,
    marketplaceUpdates: true,
  });

  function handleSave() {
    setLanguage(prefs.language);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleLanguageChange(e) {
    const nextLanguage = e.target.value;
    setPrefs({ ...prefs, language: nextLanguage });
    setLanguage(nextLanguage);
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  async function handleCancelSubscription() {
    setRole('personal');
    await cancelSubscription();
    refreshSubscription();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 lg:pb-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
          <Settings className="w-6 h-6 text-gray-600" />
          {t('profileSettings', 'Profile & Settings')}
        </h1>
        <p className="text-gray-500 mt-1">{t('settingsSubtitle', 'Manage your account and app preferences.')}</p>
      </div>

      {/* User Info */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-600" />
          {t('userInformation', 'User Information')}
        </h2>
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-emerald-500/25">
            {user?.photo ? (
              <img src={user.photo} alt={user.name} className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || 'U'
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">{user?.name || t('user', 'User')}</h3>
            <p className="text-gray-500">{user?.email || t('noEmail', 'No email')}</p>
            <span className={`badge mt-2 ${user?.provider === 'google' ? 'badge-info' : 'badge-safe'}`}>
              {user?.provider === 'google' ? t('googleAccount', 'Google Account') : t('demoAccount', 'Demo Account')}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="input-label">{t('displayName', 'Display Name')}</label>
            <input value={prefs.name} onChange={(e) => setPrefs({ ...prefs, name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="input-label">{t('email', 'Email')}</label>
            <input value={prefs.email} onChange={(e) => setPrefs({ ...prefs, email: e.target.value })} className="input-field" disabled={user?.provider === 'google'} />
          </div>
        </div>
      </div>

      {/* App Preferences */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
          <Settings className="w-5 h-5 text-violet-600" />
          {t('appPreferences', 'App Preferences')}
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-800">{t('language', 'Language')}</p>
                <p className="text-xs text-gray-500">{t('languageDesc', 'Select your preferred language')}</p>
              </div>
            </div>
            <select value={prefs.language} onChange={handleLanguageChange} className="input-field w-auto min-w-[120px]">
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </div>

        </div>
      </div>

      {/* Notification Settings */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" />
          {t('notificationSettings', 'Notification Settings')}
        </h2>
        <div className="space-y-3">
          {[
            { key: 'expiryNotification', label: t('expiryNotifications', 'Expiry Notifications'), desc: t('expiryNotificationsDesc', 'Get notified when food is about to expire') },
            { key: 'riskAlerts', label: t('riskAlerts', 'Risk Alerts'), desc: t('riskAlertsDesc', 'Receive alerts for high-risk food items') },
            { key: 'weeklyReport', label: t('weeklyReports', 'Weekly Reports'), desc: t('weeklyReportsDesc', 'Get weekly food waste reports via email') },
            { key: 'marketplaceUpdates', label: t('marketplaceUpdates', 'Marketplace Updates'), desc: t('marketplaceUpdatesDesc', 'Notifications for marketplace activity') },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <button
                onClick={() => setPrefs({ ...prefs, [item.key]: !prefs[item.key] })}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ${
                  prefs[item.key] ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                    prefs[item.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          {t('connectedAccounts', 'Connected Accounts')}
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <div>
                <p className="font-medium text-gray-800">Google</p>
                <p className="text-xs text-gray-500">
                  {user?.provider === 'google' ? t('connected', 'Connected') : isFirebaseConfigured ? t('notConnected', 'Not connected') : t('firebaseNotConfigured', 'Firebase not configured')}
                </p>
              </div>
            </div>
            {user?.provider === 'google' ? (
              <span className="badge badge-safe"><Check className="w-3 h-3 mr-1" /> {t('connected', 'Connected')}</span>
            ) : (
              <span className="badge bg-gray-100 text-gray-500">{t('notConnected', 'Not Connected')}</span>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-800">FastAPI Backend</p>
                <p className="text-xs text-gray-500">{import.meta.env.VITE_API_BASE_URL || t('notConfigured', 'Not configured')}</p>
              </div>
            </div>
            <span className="badge bg-gray-100 text-gray-500">API</span>
          </div>
        </div>
      </div>

      {/* Billing */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-600" />
          Billing & Subscription
        </h2>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 mb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Current plan</p>
              <h3 className="text-2xl font-extrabold text-gray-900">{plan.plan_name}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {subscription.status} · {subscription.billing_cycle} · Started {subscription.started_at}
              </p>
            </div>
            <span className="badge badge-safe"><Crown className="w-3 h-3 mr-1" /> {plan.limits.analytics_level} analytics</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
            <div className="rounded-xl bg-white/80 p-3">
              <p className="text-xs text-gray-500">AI scans</p>
              <p className="font-bold text-gray-800">{getUsageLabel('ai_scans_this_month')}</p>
            </div>
            <div className="rounded-xl bg-white/80 p-3">
              <p className="text-xs text-gray-500">Inventory</p>
              <p className="font-bold text-gray-800">{getUsageLabel('inventory_items')}</p>
            </div>
            <div className="rounded-xl bg-white/80 p-3">
              <p className="text-xs text-gray-500">Marketplace</p>
              <p className="font-bold text-gray-800">{getUsageLabel('marketplace_listings')}</p>
            </div>
            <div className="rounded-xl bg-white/80 p-3">
              <p className="text-xs text-gray-500">Donations</p>
              <p className="font-bold text-gray-800">{getUsageLabel('donation_listings')}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={() => navigate('/pricing')} className="btn-primary">
            Manage Plan
          </button>
          <button onClick={() => navigate('/pricing')} className="btn-secondary">
            Upgrade
          </button>
          <button onClick={handleCancelSubscription} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100 sm:col-span-2">
            Cancel Subscription
          </button>
        </div>

      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={handleSave} className="btn-primary flex-1">
          {saved ? <><Check className="w-4 h-4" /> {t('saved', 'Saved!')}</> : <><Save className="w-4 h-4" /> {t('saveChanges', 'Save Changes')}</>}
        </button>
        <button onClick={handleLogout} className="btn-danger flex-1 py-3 rounded-xl font-semibold">
          <LogOut className="w-4 h-4" />
          {t('signOut', 'Sign Out')}
        </button>
      </div>
    </div>
  );
}
