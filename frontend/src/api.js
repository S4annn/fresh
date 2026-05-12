import {
  getCurrentSubscription as getLocalSubscription,
  saveSubscription,
  upgradePlan as upgradeLocalPlan,
  downgradePlan,
  incrementUsage as incrementLocalUsage,
  isDemoUser,
  canUseDemoFeature,
  incrementDemoUsage,
  getDemoUsageLabel,
} from './services/subscription';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function getUserRole() {
  return localStorage.getItem('fresh_user_role') || 'personal';
}

function parseStoredJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function getStoredUser() {
  return (
    parseStoredJson('fresh_session_user') ||
    parseStoredJson('fresh_current_user') ||
    parseStoredJson('fresh_demo_user')
  );
}

export function getCurrentUserId() {
  const user = getStoredUser();
  return user?.uid || user?.id || localStorage.getItem('fresh_user_id') || 'demo-user';
}

export function withActor(data = {}) {
  return {
    ...data,
    user_id: data.user_id || getCurrentUserId(),
    role: data.role || getUserRole(),
  };
}

export function withBusinessActor(data = {}) {
  return {
    ...data,
    business_id: data.business_id || getCurrentUserId(),
  };
}

function normalizeSubscriptionResponse(response) {
  if (!response) return response;
  if (response.subscription) {
    return { ...response.subscription, message: response.message };
  }
  return response;
}

function getFreshHeaders() {
  const subscription = getLocalSubscription();
  const user = getStoredUser();
  const token = localStorage.getItem('fresh_auth_token');
  const headers = {
    'X-Fresh-User-Id': getCurrentUserId(),
    'X-Fresh-Role': getUserRole() || subscription.role || 'personal',
    'X-Fresh-Plan-Id': subscription.plan_id || 'free',
    'X-Fresh-Demo': user?.provider === 'demo' || subscription.is_demo ? 'true' : 'false',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// Demo tracking wrapper
function withDemoTracking(featureName, apiCall) {
  return async (...args) => {
    // Check if demo user and if feature can be used
    if (isDemoUser()) {
      if (!canUseDemoFeature(featureName)) {
        throw new Error(`Demo limit reached for ${featureName}. Maximum 3 uses allowed. Please sign up for full access.`);
      }
      
      // Increment demo usage before making the API call
      try {
        const result = await apiCall(...args);
        incrementDemoUsage(featureName);
        return result;
      } catch (error) {
        // Don't increment usage if API call failed
        throw error;
      }
    }
    
    // Non-demo users proceed normally
    return apiCall(...args);
  };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...getFreshHeaders(), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    const error = new Error(text || 'API error');
    error.isBackendError = true;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

// Multipart fetch for file uploads
async function apiFetchMultipart(path, formData) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: getFreshHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    const error = new Error(text || 'API error');
    error.isBackendError = true;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

// ─── Personal Food API ───────────────────────────────────────────────────────
export const getFoods = () => apiFetch('/foods');
export const createFood = withDemoTracking('inventory_add', (data) => apiFetch('/foods', { method: 'POST', body: JSON.stringify(withActor(data)) }));
export const updateFood = (id, data) => apiFetch(`/foods/${id}`, { method: 'PUT', body: JSON.stringify(withActor(data)) });
export const deleteFood = (id) => apiFetch(`/foods/${id}`, { method: 'DELETE' });
export const predictRisk = withDemoTracking('predict_risk', (data) => apiFetch('/predict-risk', { method: 'POST', body: JSON.stringify({ ...data, role: data.role || getUserRole() }) }));
export const getRecommendations = withDemoTracking('recommendations', () => apiFetch('/recommendations'));
export const getMarketplaceItems = (params = {}) => {
  const query = new URLSearchParams();
  if (params.lat !== undefined && params.lat !== null) query.set('lat', params.lat);
  if (params.lng !== undefined && params.lng !== null) query.set('lng', params.lng);
  if (params.radius !== undefined && params.radius !== null) query.set('radius', params.radius);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch(`/marketplace/listings${suffix}`);
};
export const createMarketplaceItem = withDemoTracking('marketplace_create', (data) => apiFetch('/marketplace/listings', { method: 'POST', body: JSON.stringify(withActor(data)) }));
export const getDonationItems = () => apiFetch('/donations');
export const createDonationItem = withDemoTracking('donation_create', (data) => apiFetch('/donations', { method: 'POST', body: JSON.stringify(withActor(data)) }));
export const getAnalytics = withDemoTracking('analytics_view', () => apiFetch('/analytics'));
export const getDashboard = withDemoTracking('analytics_view', () => apiFetch('/dashboard'));

// Subscription API with localStorage fallback for MVP.
export async function getSubscription() {
  try {
    return saveSubscription(normalizeSubscriptionResponse(await apiFetch('/subscription')));
  } catch {
    return getLocalSubscription();
  }
}

export async function upgradeSubscription(planId, role, billingCycle = 'monthly') {
  try {
    return saveSubscription(normalizeSubscriptionResponse(await apiFetch('/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify({ user_id: getCurrentUserId(), plan_id: planId, role, billing_cycle: billingCycle }),
    })));
  } catch {
    return upgradeLocalPlan(planId, role, billingCycle);
  }
}

export async function cancelSubscription() {
  try {
    return saveSubscription(normalizeSubscriptionResponse(await apiFetch('/subscription/cancel', {
      method: 'POST',
      body: JSON.stringify({ user_id: getCurrentUserId() }),
    })));
  } catch {
    return downgradePlan('free');
  }
}

export async function getSubscriptionUsage() {
  try {
    return await apiFetch('/subscription/usage');
  } catch {
    return getLocalSubscription().usage;
  }
}

export async function incrementSubscriptionUsage(type) {
  try {
    return saveSubscription(normalizeSubscriptionResponse(await apiFetch('/subscription/usage/increment', {
      method: 'POST',
      body: JSON.stringify({ user_id: getCurrentUserId(), type }),
    })));
  } catch {
    return incrementLocalUsage(type);
  }
}

// ─── AI Scanner ──────────────────────────────────────────────────────────────
export const analyzeFoodImage = withDemoTracking('ai_scan', async (file) => {
  // Always try the real backend first.
  // Only fall back to local classifier if the network request fails entirely
  // (backend offline, CORS error, network error).
  const formData = new FormData();
  formData.append('image', file);

  try {
    const data = await apiFetchMultipart('/scan-food', formData);
    // Ensure source field is set so UI can show the correct badge
    if (!data.source) {
      data.source = 'tensorflow_vision_model';
    }
    return data;
  } catch (err) {
    if (err.isBackendError) {
      console.warn(`[Scanner] Backend /scan-food returned ${err.status}: ${err.message}`);
      return backendErrorFallback(`Backend /scan-food returned ${err.status}: ${err.message}`);
    }
    console.warn('[Scanner] Backend unavailable, using local fallback:', err.message);
    // Fallback: local classifier based on filename only
    return localFoodClassifier(file.name);
  }
});

export async function getScannerLabels() {
  return apiFetch('/debug-labels');
}

function backendErrorFallback(error) {
  return {
    detected_food: 'Unknown Food',
    category: 'Other',
    confidence: 0,
    is_low_confidence: true,
    needs_review: true,
    confidence_threshold: 0.6,
    estimated_shelf_life_days: 5,
    risk_label: 'Warning',
    source: 'fallback_no_model',
    error,
    storage_advice: 'Store appropriately based on the food type.',
    recommendations: [
      'Check /debug-model for backend model details',
      'Verify TensorFlow, model file, labels, and metadata are available',
      'Try again after restarting the backend',
    ],
    top_predictions: [],
    suggested_inventory: {
      food_name: 'Unknown Food',
      category: 'Other',
      quantity: 1,
      unit: 'pcs',
      storage_type: 'Refrigerator',
      days_to_expiry: 5,
    },
  };
}

function localFoodClassifier(filename) {
  const name = filename.toLowerCase();
  const foodMap = [
    { keywords: ['beef', 'sapi', 'daging-sapi'], food: 'Beef', category: 'Protein', shelf: 2, storage: 'Refrigerator', confidence: 0.86, risk: 'High Risk', recs: ['Keep refrigerated and cook soon', 'Freeze if not using today', 'Avoid leaving raw meat at room temperature'] },
    { keywords: ['fish', 'ikan'], food: 'Fish', category: 'Protein', shelf: 1, storage: 'Refrigerator', confidence: 0.86, risk: 'High Risk', recs: ['Cook today for best quality', 'Keep cold and sealed', 'Freeze immediately for longer storage'] },
    { keywords: ['goat', 'goatmeat', 'goat-meat', 'kambing'], food: 'Goat Meat', category: 'Protein', shelf: 2, storage: 'Refrigerator', confidence: 0.86, risk: 'High Risk', recs: ['Keep refrigerated and cook soon', 'Freeze if not using today', 'Store separately from ready-to-eat foods'] },
    { keywords: ['tofu', 'tahu'], food: 'Tofu', category: 'Protein', shelf: 3, storage: 'Refrigerator', confidence: 0.84, risk: 'Warning', recs: ['Keep submerged in clean water if opened', 'Change water daily', 'Use within a few days'] },
    { keywords: ['tempeh', 'tempe'], food: 'Tempeh', category: 'Protein', shelf: 4, storage: 'Refrigerator', confidence: 0.84, risk: 'Warning', recs: ['Keep refrigerated', 'Cook while aroma and texture are still fresh', 'Freeze for longer storage'] },
    { keywords: ['shrimp', 'udang'], food: 'Shrimp', category: 'Seafood', shelf: 1, storage: 'Refrigerator', confidence: 0.86, risk: 'High Risk', recs: ['Cook today', 'Keep cold and sealed', 'Freeze immediately if storing longer'] },
    { keywords: ['greenbeans', 'greenbean', 'green-beans', 'green-bean', 'beans', 'bean', 'buncis'], food: 'Bean', category: 'Vegetable', shelf: 5, storage: 'Refrigerator', confidence: 0.72, risk: 'Warning', recs: ['Store in a sealed container in the refrigerator', 'Use for stir-fry, soup, or vegetable mix', 'Use within 3-5 days for best freshness'] },
    { keywords: ['banana', 'pisang'], food: 'Banana', category: 'Fruit', shelf: 3, storage: 'Room Temperature', confidence: 0.88, risk: 'Warning', recs: ['Use within 2-3 days', 'Make banana smoothie or banana bread', 'Freeze sliced banana for later use', 'If still fresh, list in marketplace or donate'] },
    { keywords: ['apple', 'apel'], food: 'Apple', category: 'Fruit', shelf: 7, storage: 'Refrigerator', confidence: 0.91, risk: 'Safe', recs: ['Store in refrigerator to extend freshness', 'Make apple juice or apple crumble', 'Great for snacking or salads'] },
    { keywords: ['tomato', 'tomat'], food: 'Tomato', category: 'Vegetable', shelf: 5, storage: 'Room Temperature', confidence: 0.85, risk: 'Warning', recs: ['Use within 3-5 days', 'Make homemade tomato sauce', 'Add to salads or sandwiches'] },
    { keywords: ['milk', 'susu'], food: 'Milk', category: 'Dairy', shelf: 3, storage: 'Refrigerator', confidence: 0.93, risk: 'Warning', recs: ['Keep refrigerated at all times', 'Use for cooking, smoothies, or cereal', 'Check expiry date before consuming'] },
    { keywords: ['egg', 'telur'], food: 'Egg', category: 'Protein', shelf: 14, storage: 'Refrigerator', confidence: 0.95, risk: 'Safe', recs: ['Store in refrigerator', 'Versatile for cooking — scrambled, boiled, or fried', 'Check freshness with water float test'] },
    { keywords: ['bread', 'roti'], food: 'Bread', category: 'Bakery', shelf: 4, storage: 'Room Temperature', confidence: 0.87, risk: 'Warning', recs: ['Store in cool dry place', 'Freeze if not using within 2 days', 'Make french toast or bread pudding'] },
    { keywords: ['chicken', 'ayam'], food: 'Chicken', category: 'Protein', shelf: 2, storage: 'Refrigerator', confidence: 0.90, risk: 'High Risk', recs: ['Cook immediately or freeze', 'Do not leave at room temperature', 'Marinate and cook today for best quality'] },
    { keywords: ['spinach', 'bayam'], food: 'Spinach', category: 'Vegetable', shelf: 2, storage: 'Refrigerator', confidence: 0.82, risk: 'High Risk', recs: ['Use immediately — spinach wilts fast', 'Make stir-fry or soup today', 'Blanch and freeze if not using now'] },
    { keywords: ['cheese', 'keju'], food: 'Cheese', category: 'Dairy', shelf: 10, storage: 'Refrigerator', confidence: 0.89, risk: 'Safe', recs: ['Keep wrapped tightly in refrigerator', 'Great for sandwiches, pasta, or snacking', 'Check for mold before consuming'] },
    { keywords: ['yogurt'], food: 'Yogurt', category: 'Dairy', shelf: 5, storage: 'Refrigerator', confidence: 0.91, risk: 'Warning', recs: ['Keep refrigerated', 'Great for breakfast with fruits', 'Use as base for smoothies or dips'] },
  ];

  const match = foodMap.find((f) => f.keywords.some((k) => name.includes(k)));
  const item = match || { food: 'Unknown Food', category: 'Other', shelf: 5, storage: 'Refrigerator', confidence: 0.45, risk: 'Warning', recs: ['Identify the food item manually', 'Check expiry date on packaging', 'Store appropriately based on food type'] };

  return {
    detected_food: item.food,
    category: item.category,
    confidence: item.confidence,
    is_low_confidence: item.confidence < 0.6,
    needs_review: item.confidence < 0.6,
    confidence_threshold: 0.6,
    estimated_shelf_life_days: item.shelf,
    risk_label: item.risk,
    source: 'local_fallback',           // clearly marks this as frontend fallback
    classifier: 'frontend_filename_fallback',
    storage_advice: `Store in ${item.storage}. ${item.shelf <= 2 ? 'Use immediately.' : item.shelf <= 5 ? 'Use within a few days.' : 'Monitor regularly.'}`,
    recommendations: item.recs,
    top_predictions: [{ label: item.food, confidence: item.confidence }],
    suggested_inventory: {
      food_name: item.food,
      category: item.category,
      quantity: 1,
      unit: 'pcs',
      storage_type: item.storage,
      days_to_expiry: item.shelf,
    },
  };
}

// ─── Business Inventory API ───────────────────────────────────────────────────
export const getBusinessInventory = withDemoTracking('business_inventory', () => apiFetch('/business/inventory'));
export const createBusinessInventory = withDemoTracking('business_inventory', (data) => apiFetch('/business/inventory', { method: 'POST', body: JSON.stringify(withBusinessActor(data)) }));
export const updateBusinessInventory = withDemoTracking('business_inventory', (id, data) => apiFetch(`/business/inventory/${id}`, { method: 'PUT', body: JSON.stringify(withBusinessActor(data)) }));
export const deleteBusinessInventory = withDemoTracking('business_inventory', (id) => apiFetch(`/business/inventory/${id}`, { method: 'DELETE' }));
export const getBusinessAnalytics = withDemoTracking('business_analytics', () => apiFetch('/business/analytics'));
export const getBusinessOrders = withDemoTracking('business_orders', () => apiFetch('/business/orders'));
export const updateBusinessOrderStatus = withDemoTracking('business_orders', (id, status) => apiFetch(`/business/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }));
export const getBranches = withDemoTracking('business_branches', () => apiFetch('/business/branches'));
export const createBranch = withDemoTracking('business_branches', (data) => apiFetch('/business/branches', { method: 'POST', body: JSON.stringify(withBusinessActor(data)) }));

// ─── Location API ─────────────────────────────────────────────────────────────
export async function getNearbyMarketplaceItems(lat, lng) { return apiFetch(`/marketplace/listings?lat=${lat}&lng=${lng}`); }
export async function getNearbyDonationItems(lat, lng) { return apiFetch(`/donations?lat=${lat}&lng=${lng}`); }
export async function updateUserLocation(lat, lng) { return apiFetch('/user/location', { method: 'POST', body: JSON.stringify({ lat, lng }) }); }

// ─── Legacy compatibility ─────────────────────────────────────────────────────
export const api = {
  dashboard: getDashboard,
  listFoods: getFoods,
  createFood,
  updateFood,
  deleteFood,
  predict: predictRisk,
  listings: getMarketplaceItems,
  createListing: createMarketplaceItem,
  donations: getDonationItems,
  createDonation: createDonationItem,
  analytics: getAnalytics,
  recommendations: getRecommendations,
  getSubscription,
  upgradeSubscription,
  cancelSubscription,
  incrementSubscriptionUsage,
};
