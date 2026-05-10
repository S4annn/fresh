const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function getUserRole() {
  return localStorage.getItem('fresh_user_role') || 'personal';
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'API error');
  }
  return res.json();
}

// Multipart fetch for file uploads
async function apiFetchMultipart(path, formData) {
  const res = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', body: formData });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'API error');
  }
  return res.json();
}

// ─── Personal Food API ───────────────────────────────────────────────────────
export async function getFoods() { return apiFetch('/foods'); }
export async function createFood(data) { return apiFetch('/foods', { method: 'POST', body: JSON.stringify(data) }); }
export async function updateFood(id, data) { return apiFetch(`/foods/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function deleteFood(id) { return apiFetch(`/foods/${id}`, { method: 'DELETE' }); }
export async function predictRisk(data) { return apiFetch('/predict-risk', { method: 'POST', body: JSON.stringify(data) }); }
export async function getRecommendations() { return apiFetch('/recommendations'); }
export async function getMarketplaceItems(params = {}) {
  const query = new URLSearchParams();
  if (params.lat !== undefined && params.lat !== null) query.set('lat', params.lat);
  if (params.lng !== undefined && params.lng !== null) query.set('lng', params.lng);
  if (params.radius !== undefined && params.radius !== null) query.set('radius', params.radius);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch(`/marketplace/listings${suffix}`);
}
export async function createMarketplaceItem(data) { return apiFetch('/marketplace/listings', { method: 'POST', body: JSON.stringify(data) }); }
export async function getDonationItems() { return apiFetch('/donations'); }
export async function createDonationItem(data) { return apiFetch('/donations', { method: 'POST', body: JSON.stringify(data) }); }
export async function getAnalytics() { return apiFetch('/analytics'); }
export async function getDashboard() { return apiFetch('/dashboard'); }

// ─── AI Scanner ──────────────────────────────────────────────────────────────
export async function analyzeFoodImage(file) {
  // Try real API first
  const formData = new FormData();
  formData.append('image', file);
  try {
    return await apiFetchMultipart('/scan-food', formData);
  } catch {
    // Fallback: local classifier based on filename
    return localFoodClassifier(file.name);
  }
}

function localFoodClassifier(filename) {
  const name = filename.toLowerCase();
  const foodMap = [
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
    estimated_shelf_life_days: item.shelf,
    risk_label: item.risk,
    storage_advice: `Store in ${item.storage}. ${item.shelf <= 2 ? 'Use immediately.' : item.shelf <= 5 ? 'Use within a few days.' : 'Monitor regularly.'}`,
    recommendations: item.recs,
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
export async function getBusinessInventory() { return apiFetch('/business/inventory'); }
export async function createBusinessInventory(data) { return apiFetch('/business/inventory', { method: 'POST', body: JSON.stringify(data) }); }
export async function updateBusinessInventory(id, data) { return apiFetch(`/business/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function deleteBusinessInventory(id) { return apiFetch(`/business/inventory/${id}`, { method: 'DELETE' }); }
export async function getBusinessAnalytics() { return apiFetch('/business/analytics'); }
export async function getBusinessOrders() { return apiFetch('/business/orders'); }
export async function updateBusinessOrderStatus(id, status) { return apiFetch(`/business/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); }
export async function getBranches() { return apiFetch('/business/branches'); }
export async function createBranch(data) { return apiFetch('/business/branches', { method: 'POST', body: JSON.stringify(data) }); }

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
};
