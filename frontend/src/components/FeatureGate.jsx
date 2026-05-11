import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowUpRight } from 'lucide-react';
import { canUseFeature, PLANS, useSubscription, isDemoUser } from '../services/subscription';

export default function FeatureGate({
  feature,
  requiredPlan = 'personal_plus',
  title = 'Upgrade Required',
  description,
  children,
  className = '',
}) {
  const { plan } = useSubscription();
  const isDemo = isDemoUser();

  // In demo mode, allow all features
  if (isDemo) return children;
  
  if (canUseFeature(feature)) return children;

  const required = PLANS[requiredPlan] || PLANS.personal_plus;

  return (
    <LockedFeatureCard
      className={className}
      title={title}
      currentPlan={plan.plan_name}
      requiredPlan={required.plan_name}
      description={description || `This feature is available on ${required.plan_name}.`}
    />
  );
}

export function LockedFeatureCard({
  title = 'Upgrade Required',
  description,
  currentPlan,
  requiredPlan,
  className = '',
  compact = false,
}) {
  return (
    <div className={`rounded-2xl border-2 border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 text-center ${className}`}>
      <div className={`mx-auto flex items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm ${compact ? 'mb-3 h-10 w-10' : 'mb-4 h-14 w-14'}`}>
        <Lock className={compact ? 'h-5 w-5' : 'h-7 w-7'} />
      </div>
      <h3 className={`${compact ? 'text-base' : 'text-xl'} font-extrabold text-gray-800`}>{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
        {description || `This feature is available on ${requiredPlan}.`}
      </p>
      {(currentPlan || requiredPlan) && (
        <p className="mt-3 text-xs font-semibold text-gray-500">
          Current plan: <span className="text-gray-800">{currentPlan}</span>
          {requiredPlan && <> · Required: <span className="text-emerald-700">{requiredPlan}</span></>}
        </p>
      )}
      <Link to="/pricing" className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white no-underline shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-700">
        View Pricing <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function LockedPreview({ children, ...props }) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none select-none blur-sm opacity-50">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/70 p-4 backdrop-blur-[2px]">
        <LockedFeatureCard compact {...props} />
      </div>
    </div>
  );
}
