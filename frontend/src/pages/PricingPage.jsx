import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import CheckoutModal from '../components/CheckoutModal';
import { PLANS, setCurrentSubscription, useSubscription } from '../services/subscription';
import {
  Leaf, Check, ArrowRight, Sparkles, Star, User, Building2,
  CreditCard, Shield, CheckCircle2,
} from 'lucide-react';

const planTheme = {
  free: {
    icon: User,
    color: 'from-gray-600 to-slate-700',
    border: 'border-gray-200',
    button: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    badge: 'Starter',
  },
  personal_plus: {
    icon: User,
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-300',
    button: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25',
    badge: 'Popular',
  },
  business_pro: {
    icon: Building2,
    color: 'from-blue-500 to-indigo-600',
    border: 'border-blue-300',
    button: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25',
    badge: 'Best for Business',
  },
};

const comparison = [
  { feature: 'Inventory Items', free: '30 items', personal_plus: 'Unlimited', business_pro: 'Unlimited' },
  { feature: 'AI Food Scanner', free: '5/month', personal_plus: '100/month', business_pro: 'Unlimited' },
  { feature: 'Marketplace Listings', free: '2', personal_plus: '20', business_pro: 'Unlimited' },
  { feature: 'Donation Listings', free: '5', personal_plus: 'Unlimited', business_pro: 'Unlimited + schedule' },
  { feature: 'Analytics', free: 'Basic', personal_plus: 'Advanced', business_pro: 'Business' },
  { feature: 'Multi-branch', free: '-', personal_plus: '-', business_pro: '5 branches' },
  { feature: 'Sustainability Report', free: '-', personal_plus: '-', business_pro: 'Included' },
];

function formatPrice(value) {
  if (!value) return 'Rp0';
  return Number(value).toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  });
}

export default function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { role, setRole } = useRole();
  const { subscription, plan: currentPlan, refreshSubscription } = useSubscription();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [checkoutPlanId, setCheckoutPlanId] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }

  function redirectAfterPlan(nextRole) {
    navigate(isAuthenticated ? (nextRole === 'business' ? '/business/dashboard' : '/dashboard') : '/signup');
  }

  function handlePlanClick(plan) {
    if (currentPlan.plan_id === plan.plan_id) return;

    if (plan.plan_id === 'free') {
      setRole('personal');
      setCurrentSubscription('free', 'personal', billingCycle);
      refreshSubscription();
      showToast('Free Starter is now active.');
      redirectAfterPlan('personal');
      return;
    }

    if (plan.plan_id === 'business_pro' && role !== 'business') {
      setRole('business');
      showToast('Switched to Business account for Business Pro checkout.');
    } else {
      setRole(plan.role);
    }
    setCheckoutPlanId(plan.plan_id);
  }

  function handleCheckoutSuccess(nextSubscription) {
    refreshSubscription();
    setCheckoutPlanId(null);
    showToast('Payment successful. Your plan has been upgraded.');
    redirectAfterPlan(nextSubscription.role);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30">
      {toast && (
        <div className={`fixed right-6 top-6 z-[80] flex items-center gap-3 rounded-2xl px-5 py-3.5 text-white shadow-xl ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      <nav className="sticky top-0 z-50 border-b border-emerald-100/50 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-gray-800">F.R.E.S.H</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to={isAuthenticated ? (role === 'business' ? '/business/dashboard' : '/dashboard') : '/signin'} className="text-sm font-semibold text-gray-600 no-underline hover:text-emerald-600">
              {isAuthenticated ? 'Dashboard' : 'Sign In'}
            </Link>
            <Link to="/signup" className="btn-primary text-sm no-underline">Get Started</Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-4 py-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">Plan-based access is active</span>
          </div>
          <h1 className="mb-4 text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Choose Your <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">F.R.E.S.H</span> Plan
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
            Start free, then unlock more scans, analytics, marketplace capacity, and business workflows when you grow.
          </p>

          <div className="inline-flex items-center gap-3 rounded-2xl bg-gray-100 p-1.5">
            <button onClick={() => setBillingCycle('monthly')} className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500'}`}>
              Monthly
            </button>
            <button onClick={() => setBillingCycle('yearly')} className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition-all ${billingCycle === 'yearly' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500'}`}>
              Yearly <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Save 20%</span>
            </button>
          </div>

          <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
            <Shield className="h-4 w-4 text-emerald-600" />
            Current plan: <span className="font-bold text-gray-800">{currentPlan.plan_name}</span>
          </div>
        </div>

        <section className="mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(PLANS).map((plan) => {
            const theme = planTheme[plan.plan_id];
            const Icon = theme.icon;
            const isCurrent = subscription.plan_id === plan.plan_id;
            const price = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;

            return (
              <article key={plan.plan_id} className={`relative rounded-3xl border-2 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${theme.border} ${plan.plan_id === 'business_pro' ? 'bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl shadow-blue-500/10' : ''}`}>
                <div className="absolute right-5 top-5 flex items-center gap-2">
                  {isCurrent && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Current Plan</span>}
                  {theme.badge && !isCurrent && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{theme.badge}</span>}
                </div>

                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.color} shadow-lg`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>

                <h3 className="mb-1 text-xl font-extrabold text-gray-800">{plan.plan_name}</h3>
                <p className="mb-5 text-sm text-gray-500">{plan.target}</p>

                <div className="mb-6">
                  <p className="text-4xl font-extrabold text-gray-800">
                    {formatPrice(price)}
                    <span className="text-base font-normal text-gray-500">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                  </p>
                  {billingCycle === 'yearly' && price > 0 && (
                    <p className="mt-1 text-sm font-medium text-emerald-600">about {formatPrice(Math.round(price / 12))}/month</p>
                  )}
                </div>

                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-gray-700">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                        <Check className="h-3 w-3 text-emerald-600" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {plan.plan_id === 'business_pro' && role === 'personal' && !isCurrent && (
                  <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
                    This plan uses Business mode. We will switch your account before checkout.
                  </div>
                )}

                <button
                  onClick={() => handlePlanClick(plan)}
                  disabled={isCurrent}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:bg-emerald-100 disabled:text-emerald-700 ${theme.button}`}
                >
                  {isCurrent ? 'Current Plan' : plan.plan_id === 'free' ? 'Get Started Free' : plan.plan_id === 'personal_plus' ? 'Upgrade to Personal Plus' : 'Start Business Pro'}
                  {!isCurrent && <ArrowRight className="h-4 w-4" />}
                </button>
              </article>
            );
          })}
        </section>

        <section className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-extrabold text-gray-800">Plan Comparison</h2>
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-gray-600">Feature</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-600">Free Starter</th>
                    <th className="px-6 py-4 text-center font-semibold text-emerald-600">Personal Plus</th>
                    <th className="px-6 py-4 text-center font-semibold text-blue-600">Business Pro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {comparison.map((row) => (
                    <tr key={row.feature} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-medium text-gray-700">{row.feature}</td>
                      <td className="px-6 py-3 text-center text-gray-500">{row.free}</td>
                      <td className="px-6 py-3 text-center font-medium text-emerald-600">{row.personal_plus}</td>
                      <td className="px-6 py-3 text-center font-medium text-blue-600">{row.business_pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-10 text-center text-white">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <CreditCard className="h-7 w-7" />
          </div>
          <h2 className="mb-3 text-3xl font-extrabold">Sandbox billing today. Payment-ready tomorrow.</h2>
          <p className="mx-auto mb-7 max-w-2xl text-emerald-100">
            This MVP uses dummy checkout and localStorage, with clear hooks ready for Midtrans or Xendit transaction sessions.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button onClick={() => handlePlanClick(PLANS.free)} className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-emerald-700 hover:bg-emerald-50">
              Start Free <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => handlePlanClick(PLANS.business_pro)} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 font-bold text-white hover:bg-blue-600">
              <Star className="h-4 w-4" /> Start Business Pro
            </button>
          </div>
        </section>
      </main>

      {checkoutPlanId && (
        <CheckoutModal
          planId={checkoutPlanId}
          billingCycle={billingCycle}
          role={PLANS[checkoutPlanId]?.role}
          onClose={() => setCheckoutPlanId(null)}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}
