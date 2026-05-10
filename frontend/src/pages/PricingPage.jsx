import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import {
  Leaf, Check, X, Zap, Building2, User, ChevronDown, ChevronUp,
  ArrowRight, Sparkles, Shield, Star,
} from 'lucide-react';

const plans = [
  {
    id: 'free',
    name: 'Free Starter',
    target: 'Personal users',
    price: 0,
    priceYearly: 0,
    color: 'from-gray-500 to-slate-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    badge: null,
    icon: User,
    features: [
      { text: 'Up to 30 inventory items', included: true },
      { text: 'Basic food expiry reminder', included: true },
      { text: 'AI food scanner (5/day)', included: true },
      { text: 'Basic recommendations', included: true },
      { text: 'Marketplace browse', included: true },
      { text: 'Donation listing', included: true },
      { text: 'Unlimited inventory', included: false },
      { text: 'Business analytics', included: false },
      { text: 'Multi-branch management', included: false },
    ],
    cta: 'Get Started Free',
    ctaStyle: 'btn-secondary',
    role: 'personal',
  },
  {
    id: 'personal',
    name: 'Personal Plus',
    target: 'Advanced household users',
    price: 29000,
    priceYearly: 290000,
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'Popular',
    icon: User,
    features: [
      { text: 'Unlimited inventory items', included: true },
      { text: 'Unlimited AI food scanner', included: true },
      { text: 'Smart recipe recommendations', included: true },
      { text: 'Food waste analytics', included: true },
      { text: 'Priority expiry reminders', included: true },
      { text: 'Marketplace selling', included: true },
      { text: 'Donation tracking', included: true },
      { text: 'Business analytics', included: false },
      { text: 'Multi-branch management', included: false },
    ],
    cta: 'Start Personal Plus',
    ctaStyle: 'btn-primary',
    role: 'personal',
  },
  {
    id: 'business',
    name: 'Business Pro',
    target: 'Restaurants, hotels, cafes, catering',
    price: 149000,
    priceYearly: 1490000,
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    badge: 'Best for Business',
    icon: Building2,
    features: [
      { text: 'Multi-branch inventory', included: true },
      { text: 'Bulk stock management', included: true },
      { text: 'AI waste risk forecast', included: true },
      { text: 'Surplus marketplace', included: true },
      { text: 'Donation scheduling', included: true },
      { text: 'Orders & reservations', included: true },
      { text: 'Business analytics', included: true },
      { text: 'Sustainability report', included: true },
      { text: 'Team access ready', included: true },
    ],
    cta: 'Start Business Pro',
    ctaStyle: 'btn-primary',
    role: 'business',
  },
];

const faqs = [
  { q: 'Is there a free plan?', a: 'Yes! The Free Starter plan is completely free with up to 30 inventory items, basic reminders, and limited AI scanner access.' },
  { q: 'Can I use F.R.E.S.H for my restaurant?', a: 'Absolutely. The Business Pro plan is designed for restaurants, hotels, cafes, catering, and grocery stores with multi-branch inventory and surplus management.' },
  { q: 'Does it support AI food scanning?', a: 'Yes. All plans include AI food scanning. Free plan has 5 scans/day, Personal Plus and Business Pro have unlimited scans.' },
  { q: 'Do I need Google Maps billing?', a: 'No. F.R.E.S.H uses Leaflet + OpenStreetMap which is completely free. No Google Maps billing required.' },
  { q: 'Can I donate surplus food?', a: 'Yes. All plans support food donation listings. Business Pro adds donation scheduling and pickup coordination.' },
];

const comparison = [
  { feature: 'Inventory Items', free: '30 items', personal: 'Unlimited', business: 'Unlimited' },
  { feature: 'AI Food Scanner', free: '5/day', personal: 'Unlimited', business: 'Unlimited' },
  { feature: 'Expiry Reminders', free: 'Basic', personal: 'Priority', business: 'Priority' },
  { feature: 'Recipe Recommendations', free: 'Basic', personal: 'Smart AI', business: 'Smart AI' },
  { feature: 'Marketplace', free: 'Browse only', personal: 'Buy & Sell', business: 'Surplus Management' },
  { feature: 'Donation', free: 'List only', personal: 'Full tracking', business: 'Scheduling + Pickup' },
  { feature: 'Analytics', free: '—', personal: 'Personal', business: 'Business + Sustainability' },
  { feature: 'Multi-branch', free: '—', personal: '—', business: '✓' },
  { feature: 'Orders/Reservations', free: '—', personal: '—', business: '✓' },
  { feature: 'Team Access', free: '—', personal: '—', business: 'Ready' },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const { setRole } = useRole();
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  function handleCTA(plan) {
    setRole(plan.role);
    navigate('/signup');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30">
      {/* Navbar */}
      <nav className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-emerald-100/50 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-gray-800">F.R.E.S.H</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/signin" className="text-sm font-semibold text-gray-600 hover:text-emerald-600 no-underline">Sign In</Link>
            <Link to="/signup" className="btn-primary text-sm no-underline">Get Started</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100/80 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">Simple, Transparent Pricing</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
            Choose Your <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">F.R.E.S.H</span> Plan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Whether you're managing your home fridge or running a restaurant chain, we have the right plan for you.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-gray-100 rounded-2xl p-1.5">
            <button onClick={() => setYearly(false)} className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${!yearly ? 'bg-white shadow-md text-gray-800' : 'text-gray-500'}`}>Monthly</button>
            <button onClick={() => setYearly(true)} className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${yearly ? 'bg-white shadow-md text-gray-800' : 'text-gray-500'}`}>
              Yearly
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-lg">Save 17%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = yearly ? plan.priceYearly : plan.price;
            const isHighlighted = plan.id === 'business';
            return (
              <div key={plan.id} className={`relative rounded-3xl border-2 p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl
                ${isHighlighted ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl shadow-blue-500/15' : `${plan.border} bg-white`}`}>
                {plan.badge && (
                  <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${plan.color} shadow-lg`}>
                    {plan.badge === 'Best for Business' ? <><Star className="w-3 h-3 inline mr-1" />{plan.badge}</> : plan.badge}
                  </div>
                )}

                <div className={`w-14 h-14 bg-gradient-to-br ${plan.color} rounded-2xl flex items-center justify-center mb-5 shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-xl font-extrabold text-gray-800 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-5">{plan.target}</p>

                <div className="mb-6">
                  {price === 0 ? (
                    <p className="text-4xl font-extrabold text-gray-800">Free</p>
                  ) : (
                    <div>
                      <p className="text-4xl font-extrabold text-gray-800">
                        Rp{price.toLocaleString()}
                        <span className="text-base font-normal text-gray-500">/{yearly ? 'year' : 'month'}</span>
                      </p>
                      {yearly && <p className="text-sm text-emerald-600 font-medium mt-1">≈ Rp{Math.round(price / 12).toLocaleString()}/month</p>}
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, i) => (
                    <li key={i} className={`flex items-center gap-3 text-sm ${f.included ? 'text-gray-700' : 'text-gray-400'}`}>
                      {f.included
                        ? <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-emerald-600" /></div>
                        : <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0"><X className="w-3 h-3 text-gray-400" /></div>}
                      {f.text}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCTA(plan)}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                    ${isHighlighted
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25'
                      : plan.id === 'personal'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {plan.cta} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="mb-16">
          <h2 className="text-2xl font-extrabold text-gray-800 text-center mb-8">Feature Comparison</h2>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-gray-600">Feature</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-600">Free</th>
                    <th className="px-6 py-4 text-center font-semibold text-emerald-600">Personal Plus</th>
                    <th className="px-6 py-4 text-center font-semibold text-blue-600">Business Pro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {comparison.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-medium text-gray-700">{row.feature}</td>
                      <td className="px-6 py-3 text-center text-gray-500">{row.free}</td>
                      <td className="px-6 py-3 text-center text-emerald-600 font-medium">{row.personal}</td>
                      <td className="px-6 py-3 text-center text-blue-600 font-medium">{row.business}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-extrabold text-gray-800 text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="card cursor-pointer" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-800">{faq.q}</p>
                  {openFaq === i ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                </div>
                {openFaq === i && <p className="text-gray-600 mt-3 text-sm leading-relaxed">{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-12 text-white">
          <h2 className="text-3xl font-extrabold mb-4">Ready to Reduce Food Waste?</h2>
          <p className="text-emerald-200 mb-8 max-w-xl mx-auto">Start free today. No credit card required. Upgrade anytime.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => { setRole('personal'); navigate('/signup'); }} className="flex items-center gap-2 px-8 py-4 bg-white text-emerald-700 rounded-xl font-bold hover:bg-emerald-50 transition-colors">
              <User className="w-5 h-5" /> Use as Personal
            </button>
            <button onClick={() => { setRole('business'); navigate('/signup'); }} className="flex items-center gap-2 px-8 py-4 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors">
              <Building2 className="w-5 h-5" /> Use as Business
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
