import React from 'react';
import { AlertCircle, Zap } from 'lucide-react';
import { useSubscription, getDemoUsageLabel } from '../services/subscription';

export default function DemoUsageIndicator({ featureName, className = '' }) {
  const { isDemo, canUseDemoFeature, getDemoUsageLabel } = useSubscription();
  
  if (!isDemo) return null;
  
  const canUse = canUseDemoFeature(featureName);
  const usageLabel = getDemoUsageLabel(featureName);
  
  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <Zap className="w-3 h-3 text-amber-500" />
      <span className="text-gray-600">Demo: {usageLabel}</span>
      {!canUse && (
        <div className="flex items-center gap-1 text-red-600">
          <AlertCircle className="w-3 h-3" />
          <span>Limit reached</span>
        </div>
      )}
    </div>
  );
}

export function DemoLimitWarning({ featureName, className = '' }) {
  const { isDemo, canUseDemoFeature } = useSubscription();
  
  if (!isDemo || canUseDemoFeature(featureName)) return null;
  
  return (
    <div className={`flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg ${className}`}>
      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-xs text-red-700 font-medium">Demo Limit Reached</p>
        <p className="text-xs text-red-600 mt-1">
          Maximum 3 uses allowed for demo. Sign up for full access to continue using this feature.
        </p>
      </div>
    </div>
  );
}

export function DemoBanner({ className = '' }) {
  const { isDemo } = useSubscription();
  
  if (!isDemo) return null;
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg ${className}`}>
      <Zap className="w-4 h-4 text-amber-500" />
      <div className="flex-1">
        <p className="text-xs text-amber-700 font-medium">Demo Mode Active</p>
        <p className="text-xs text-amber-600 mt-1">
          You're using demo mode with limited features. Data is not permanently stored.
        </p>
      </div>
    </div>
  );
}
