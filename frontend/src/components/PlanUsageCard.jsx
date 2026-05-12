import React from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Zap, Package, Store, Heart, GitBranch, FileText } from 'lucide-react';
import { getUsageLabel, isUnlimited, useSubscription } from '../services/subscription';

function UsageBar({ label, value, limit, tone = 'emerald' }) {
  const unlimited = isUnlimited(limit);
  const percent = unlimited ? 100 : Math.min(100, Math.round((Number(value || 0) / Number(limit || 1)) * 100));
  const color = tone === 'blue' ? 'bg-blue-500' : tone === 'red' ? 'bg-red-500' : 'bg-emerald-500';

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-700">{unlimited ? 'Unlimited' : `${value || 0}/${limit}`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/70">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default function PlanUsageCard({ business = false }) {
  const { subscription, plan } = useSubscription();
  const usage = subscription.usage || {};
  const limits = plan.limits;

  return (
    <section className={`card border-2 ${business ? 'border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50' : 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50'}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-white ${business ? 'bg-blue-600' : 'bg-emerald-600'}`}>
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Paket Saat Ini</p>
            <h2 className="text-2xl font-extrabold text-gray-900">{plan.plan_name}</h2>
            <p className="mt-1 text-sm text-gray-600">
              {subscription.status} · {subscription.billing_cycle} billing
            </p>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
          <UsageBar label="AI Scans" value={usage.ai_scans_this_month} limit={limits.max_ai_scans_per_month} tone={business ? 'blue' : 'emerald'} />
          <UsageBar label="Inventory" value={usage.inventory_items} limit={limits.max_inventory_items} tone={business ? 'blue' : 'emerald'} />
          {business ? (
            <>
              <div className="flex items-center gap-2 rounded-xl bg-white/70 p-3 text-sm font-semibold text-gray-700">
                <GitBranch className="h-4 w-4 text-blue-600" /> Branches: {getUsageLabel('branches')}
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/70 p-3 text-sm font-semibold text-gray-700">
                <FileText className="h-4 w-4 text-emerald-600" /> Sustainability Report: {limits.sustainability_report ? 'Active' : 'Locked'}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-xl bg-white/70 p-3 text-sm font-semibold text-gray-700">
                <Store className="h-4 w-4 text-pink-600" /> Marketplace: {getUsageLabel('marketplace_listings')}
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/70 p-3 text-sm font-semibold text-gray-700">
                <Heart className="h-4 w-4 text-red-500" /> Donations: {getUsageLabel('donation_listings')}
              </div>
            </>
          )}
        </div>

        {plan.plan_id === 'free' && (
          <Link to="/pricing" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white no-underline shadow-lg shadow-emerald-500/20 hover:bg-emerald-700">
            <Zap className="h-4 w-4" /> Upgrade Plan
          </Link>
        )}
      </div>
    </section>
  );
}
