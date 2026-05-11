import { useEffect, useState } from 'react';

export const SUBSCRIPTION_STORAGE_KEY = 'fresh_user_subscription';
export const SUBSCRIPTION_UPDATED_EVENT = 'fresh_subscription_updated';
export const UNLIMITED = 'unlimited';

export const PLANS = {
  free: {
    plan_id: 'free',
    plan_name: 'Free Starter',
    target: 'Personal users',
    role: 'personal',
    price: 0,
    monthly_price: 0,
    yearly_price: 0,
    features: [
      'Up to 30 inventory items',
      '5 AI food scans per month',
      'Basic food expiry reminder',
      'Basic recommendations',
      'Browse marketplace',
      'Create donation listing',
      'Basic analytics',
    ],
    limits: {
      max_inventory_items: 30,
      max_ai_scans_per_month: 5,
      max_marketplace_listings: 2,
      max_donation_listings: 5,
      analytics_level: 'basic',
      business_features: false,
      multi_branch: false,
      sustainability_report: false,
      max_branches: 0,
    },
  },
  personal_plus: {
    plan_id: 'personal_plus',
    plan_name: 'Personal Plus',
    target: 'Advanced household users',
    role: 'personal',
    price: 29000,
    monthly_price: 29000,
    yearly_price: 278400,
    features: [
      'Unlimited inventory',
      '100 AI food scans per month',
      'Smart recipe recommendations',
      'Food waste analytics',
      'Priority reminders',
      'Marketplace selling',
      'Donation tracking',
      'Export personal report',
    ],
    limits: {
      max_inventory_items: UNLIMITED,
      max_ai_scans_per_month: 100,
      max_marketplace_listings: 20,
      max_donation_listings: UNLIMITED,
      analytics_level: 'advanced',
      business_features: false,
      multi_branch: false,
      sustainability_report: false,
      max_branches: 0,
    },
  },
  business_pro: {
    plan_id: 'business_pro',
    plan_name: 'Business Pro',
    target: 'Restaurants, hotels, cafes, catering, bakery, grocery',
    role: 'business',
    price: 149000,
    monthly_price: 149000,
    yearly_price: 1430400,
    features: [
      'Multi-branch inventory',
      'Unlimited AI scans',
      'Bulk stock management',
      'AI waste risk forecast',
      'Surplus marketplace',
      'Donation scheduling',
      'Orders/reservations',
      'Business analytics',
      'Sustainability report',
      'Team access ready',
    ],
    limits: {
      max_inventory_items: UNLIMITED,
      max_ai_scans_per_month: UNLIMITED,
      max_marketplace_listings: UNLIMITED,
      max_donation_listings: UNLIMITED,
      analytics_level: 'business',
      business_features: true,
      multi_branch: true,
      sustainability_report: true,
      max_branches: 5,
    },
  },
};

const ANALYTICS_RANK = { basic: 1, advanced: 2, business: 3 };

const DEMO_USAGE = {
  personal_demo: {
    inventory_items: 0,
    ai_scans_this_month: 0,
    marketplace_listings: 0,
    donation_listings: 0,
    branches: 0,
    // Demo limits - 3 uses per feature
    demo_inventory_add: 0,
    demo_ai_scan: 0,
    demo_marketplace_create: 0,
    demo_donation_create: 0,
    demo_predict_risk: 0,
    demo_recommendations: 0,
    demo_analytics_view: 0,
  },
  business_demo: {
    inventory_items: 0,
    ai_scans_this_month: 0,
    marketplace_listings: 0,
    donation_listings: 0,
    branches: 0,
    // Demo limits - 3 uses per feature
    demo_inventory_add: 0,
    demo_ai_scan: 0,
    demo_marketplace_create: 0,
    demo_donation_create: 0,
    demo_predict_risk: 0,
    demo_recommendations: 0,
    demo_analytics_view: 0,
    demo_business_inventory: 0,
    demo_business_orders: 0,
    demo_business_branches: 0,
    demo_business_analytics: 0,
  },
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function emitSubscriptionUpdated(subscription) {
  window.dispatchEvent(new CustomEvent(SUBSCRIPTION_UPDATED_EVENT, { detail: subscription }));
}

function normalizePlanId(planId, role = 'personal') {
  if (PLANS[planId]) return planId;
  return role === 'business' ? 'free' : 'free';
}

function buildSubscription(planId = 'free', role = PLANS[planId]?.role || 'personal', billingCycle = 'monthly') {
  const normalizedPlanId = normalizePlanId(planId, role);
  const plan = PLANS[normalizedPlanId] || PLANS.free;

  return {
    plan_id: plan.plan_id,
    plan_name: plan.plan_name,
    role: role || plan.role,
    status: 'active',
    billing_cycle: billingCycle,
    started_at: todayString(),
    expires_at: null,
    last_usage_reset_month: currentMonthKey(),
    usage: { ...(DEMO_USAGE[normalizedPlanId] || DEMO_USAGE.free) },
  };
}

export function getCurrentSubscription() {
  resetMonthlyUsageIfNeeded();
  const raw = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);

  if (!raw) {
    const role = localStorage.getItem('fresh_user_role') || 'personal';
    const fallback = buildSubscription('free', role);
    localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    const plan = PLANS[parsed.plan_id] || PLANS.free;
    return {
      ...buildSubscription(plan.plan_id, parsed.role || plan.role, parsed.billing_cycle || 'monthly'),
      ...parsed,
      plan_name: plan.plan_name,
      usage: {
        ...(DEMO_USAGE[plan.plan_id] || DEMO_USAGE.free),
        ...(parsed.usage || {}),
      },
    };
  } catch {
    const fallback = buildSubscription('free', 'personal');
    localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

export function saveSubscription(subscription) {
  if (!subscription || !subscription.plan_id) {
    return getCurrentSubscription();
  }

  const plan = PLANS[subscription.plan_id] || PLANS.free;
  const next = {
    ...buildSubscription(plan.plan_id, subscription.role || plan.role, subscription.billing_cycle || 'monthly'),
    ...subscription,
    plan_name: plan.plan_name,
    usage: {
      ...(DEMO_USAGE[plan.plan_id] || DEMO_USAGE.free),
      ...(subscription.usage || {}),
    },
  };

  localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(next));
  localStorage.setItem('fresh_user_role', next.role);
  emitSubscriptionUpdated(next);
  return next;
}

export function setCurrentSubscription(planId, role, billingCycle = 'monthly') {
  const plan = PLANS[planId] || PLANS.free;
  const previous = getCurrentSubscription();
  const next = {
    ...buildSubscription(plan.plan_id, role || plan.role, billingCycle),
    usage: {
      ...(DEMO_USAGE[plan.plan_id] || DEMO_USAGE.free),
      ...(previous?.plan_id === plan.plan_id ? previous.usage : {}),
    },
  };

  localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(next));
  localStorage.setItem('fresh_user_role', next.role);
  emitSubscriptionUpdated(next);
  return next;
}

export function ensureSubscriptionForRole(role = 'personal') {
  const raw = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
  if (raw) return getCurrentSubscription();
  return setCurrentSubscription('free', role, 'monthly');
}

export function getCurrentPlan() {
  const subscription = getCurrentSubscription();
  return PLANS[subscription.plan_id] || PLANS.free;
}

export function isUnlimited(value) {
  return value === UNLIMITED || value === Infinity || value === null;
}

export function getPlanLimit(limitName) {
  return getCurrentPlan().limits?.[limitName];
}

export function hasFeature(featureName) {
  const plan = getCurrentPlan();
  const limits = plan.limits;

  const featureMap = {
    business_features: limits.business_features,
    business_inventory: limits.business_features,
    business_orders: limits.business_features,
    business_branches: limits.multi_branch,
    business_analytics: limits.analytics_level === 'business',
    sustainability_report: limits.sustainability_report,
    multi_branch: limits.multi_branch,
    donation_scheduling: plan.plan_id === 'business_pro',
    donation_impact_report: plan.plan_id === 'business_pro',
    donation_partner_matching: plan.plan_id === 'business_pro',
    marketplace_bulk_listing: plan.plan_id === 'business_pro',
    marketplace_orders: plan.plan_id === 'business_pro',
    marketplace_suggested_discount: plan.plan_id === 'business_pro',
    marketplace_listing_analytics: plan.plan_id === 'business_pro',
    advanced_analytics: ANALYTICS_RANK[limits.analytics_level] >= ANALYTICS_RANK.advanced,
    business_reports: limits.sustainability_report,
    personal_report: plan.plan_id === 'personal_plus' || plan.plan_id === 'business_pro',
  };

  return Boolean(featureMap[featureName]);
}

export function canUseFeature(featureName) {
  return hasFeature(featureName);
}

export function canAddInventory(currentCount) {
  const limit = getPlanLimit('max_inventory_items');
  if (isUnlimited(limit)) return true;
  const usage = getCurrentSubscription().usage?.inventory_items || 0;
  return (typeof currentCount === 'number' ? currentCount : usage) < Number(limit);
}

export function canUseAiScan() {
  const limit = getPlanLimit('max_ai_scans_per_month');
  if (isUnlimited(limit)) return true;
  return (getCurrentSubscription().usage?.ai_scans_this_month || 0) < Number(limit);
}

export function canCreateMarketplaceListing() {
  const limit = getPlanLimit('max_marketplace_listings');
  if (isUnlimited(limit)) return true;
  return (getCurrentSubscription().usage?.marketplace_listings || 0) < Number(limit);
}

export function canCreateDonationListing() {
  const limit = getPlanLimit('max_donation_listings');
  if (isUnlimited(limit)) return true;
  return (getCurrentSubscription().usage?.donation_listings || 0) < Number(limit);
}

export function canAccessBusinessFeature() {
  return Boolean(getPlanLimit('business_features'));
}

export function canAccessAnalyticsLevel(requiredLevel = 'basic') {
  const currentLevel = getPlanLimit('analytics_level') || 'basic';
  return ANALYTICS_RANK[currentLevel] >= ANALYTICS_RANK[requiredLevel];
}

export function incrementUsage(type, amount = 1) {
  const subscription = getCurrentSubscription();
  const next = {
    ...subscription,
    usage: {
      ...subscription.usage,
      [type]: Number(subscription.usage?.[type] || 0) + amount,
    },
  };
  localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(next));
  emitSubscriptionUpdated(next);
  return next;
}

export function setUsage(type, value) {
  const subscription = getCurrentSubscription();
  const next = {
    ...subscription,
    usage: {
      ...subscription.usage,
      [type]: value,
    },
  };
  localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(next));
  emitSubscriptionUpdated(next);
  return next;
}

export function resetMonthlyUsageIfNeeded() {
  const raw = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const subscription = JSON.parse(raw);
    if (subscription.last_usage_reset_month === currentMonthKey()) return subscription;
    const next = {
      ...subscription,
      last_usage_reset_month: currentMonthKey(),
      usage: {
        ...(subscription.usage || {}),
        ai_scans_this_month: 0,
      },
    };
    localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

export function upgradePlan(planId, role, billingCycle = 'monthly') {
  return setCurrentSubscription(planId, role || PLANS[planId]?.role, billingCycle);
}

export function downgradePlan(planId = 'free') {
  return setCurrentSubscription(planId, 'personal', 'monthly');
}

export function getUsageLabel(type) {
  const subscription = getCurrentSubscription();
  const plan = getCurrentPlan();
  const usage = subscription.usage || {};

  const limitByType = {
    inventory_items: plan.limits.max_inventory_items,
    ai_scans_this_month: plan.limits.max_ai_scans_per_month,
    marketplace_listings: plan.limits.max_marketplace_listings,
    donation_listings: plan.limits.max_donation_listings,
    branches: plan.limits.max_branches,
  };

  const limit = limitByType[type];
  if (isUnlimited(limit)) return 'Unlimited';
  return `${usage[type] || 0}/${limit}`;
}

// Demo subscription functions
export function createDemoSubscription(role = 'personal') {
  const demoKey = role === 'business' ? 'business_demo' : 'personal_demo';
  return {
    plan_id: 'demo',
    plan_name: `${role === 'business' ? 'Business' : 'Personal'} Demo`,
    role: role,
    status: 'active',
    billing_cycle: 'monthly',
    started_at: todayString(),
    expires_at: null,
    is_demo: true,
    last_usage_reset_month: currentMonthKey(),
    usage: { ...(DEMO_USAGE[demoKey] || DEMO_USAGE.personal_demo) },
  };
}

export function isDemoUser() {
  const subscription = getCurrentSubscription();
  return Boolean(subscription.is_demo);
}

export function canUseDemoFeature(featureName) {
  if (!isDemoUser()) return true;
  
  const subscription = getCurrentSubscription();
  const usage = subscription.usage || {};
  const currentUsage = usage[`demo_${featureName}`] || 0;
  const limit = 3; // 3 uses per feature for demo
  
  return currentUsage < limit;
}

export function incrementDemoUsage(featureName) {
  if (!isDemoUser()) return getCurrentSubscription();
  
  const subscription = getCurrentSubscription();
  const usageKey = `demo_${featureName}`;
  const currentUsage = subscription.usage?.[usageKey] || 0;
  
  if (currentUsage >= 3) {
    throw new Error(`Demo limit reached for ${featureName}. Maximum 3 uses allowed.`);
  }
  
  return incrementUsage(usageKey);
}

export function getDemoUsageLabel(featureName) {
  if (!isDemoUser()) return null;
  
  const subscription = getCurrentSubscription();
  const usage = subscription.usage || {};
  const usageKey = `demo_${featureName}`;
  const currentUsage = usage[usageKey] || 0;
  const limit = 3;
  
  return `${currentUsage}/${limit}`;
}

export function resetDemoUsage() {
  if (!isDemoUser()) return getCurrentSubscription();
  
  const subscription = getCurrentSubscription();
  const role = subscription.role || 'personal';
  const demoKey = role === 'business' ? 'business_demo' : 'personal_demo';
  
  const next = {
    ...subscription,
    last_usage_reset_month: currentMonthKey(),
    usage: { ...(DEMO_USAGE[demoKey] || DEMO_USAGE.personal_demo) },
  };
  
  localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(next));
  emitSubscriptionUpdated(next);
  return next;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState(getCurrentSubscription);

  useEffect(() => {
    const handleUpdate = () => setSubscription(getCurrentSubscription());
    window.addEventListener(SUBSCRIPTION_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(SUBSCRIPTION_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return {
    subscription,
    plan: PLANS[subscription.plan_id] || PLANS.free,
    refreshSubscription: () => setSubscription(getCurrentSubscription()),
    isDemo: Boolean(subscription.is_demo),
    canUseDemoFeature,
    incrementDemoUsage,
    getDemoUsageLabel,
    resetDemoUsage,
  };
}
