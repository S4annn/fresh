// Database API client for F.R.E.S.H. PostgreSQL integration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Get current user info from AuthContext or localStorage
function getCurrentUserInfo() {
  try {
    // Try to get from AuthContext first (if available)
    const authUser = window.authUser || JSON.parse(localStorage.getItem('fresh_current_user') || '{}');
    const userId = authUser?.uid || localStorage.getItem('fresh_user_id') || 'demo-user';
    const role = authUser?.role || localStorage.getItem('fresh_user_role') || 'personal';
    
    return { userId, role };
  } catch (error) {
    console.warn('Error getting user info:', error);
    return { userId: 'demo-user', role: 'personal' };
  }
}

// Food Items API
export const foodAPI = {
  async getFoods(userId = null, includeFinished = false) {
    const { userId: defaultUserId } = getCurrentUserInfo();
    const targetUserId = userId || defaultUserId;
    
    return apiCall(`/foods?user_id=${targetUserId}&include_finished=${includeFinished}`);
  },

  async createFood(foodData) {
    const { userId, role } = getCurrentUserInfo();
    
    const payload = {
      user_id: userId,
      role: role,
      ...foodData,
    };
    
    return apiCall('/foods', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateFood(id, foodData) {
    return apiCall(`/foods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(foodData),
    });
  },

  async deleteFood(id) {
    return apiCall(`/foods/${id}`, {
      method: 'DELETE',
    });
  },
};

// Marketplace API
export const marketplaceAPI = {
  async getMarketplaceItems() {
    return apiCall('/marketplace');
  },

  async createMarketplaceItem(itemData) {
    const { userId, role } = getCurrentUserInfo();
    
    const payload = {
      user_id: userId,
      role: role,
      ...itemData,
    };
    
    return apiCall('/marketplace', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateMarketplaceItem(id, itemData) {
    return apiCall(`/marketplace/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  },

  async deleteMarketplaceItem(id) {
    return apiCall(`/marketplace/${id}`, {
      method: 'DELETE',
    });
  },

  async getMarketplaceItem(id) {
    return apiCall(`/marketplace/${id}`);
  },
};

// Donations API
export const donationAPI = {
  async getDonationItems() {
    return apiCall('/donations');
  },

  async createDonationItem(itemData) {
    const { userId, role } = getCurrentUserInfo();
    
    const payload = {
      user_id: userId,
      role: role,
      ...itemData,
    };
    
    return apiCall('/donations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateDonationItem(id, itemData) {
    return apiCall(`/donations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  },

  async deleteDonationItem(id) {
    return apiCall(`/donations/${id}`, {
      method: 'DELETE',
    });
  },

  async getDonationItem(id) {
    return apiCall(`/donations/${id}`);
  },
};

// Subscription API
export const subscriptionAPI = {
  async getSubscription(userId = null) {
    const { userId: defaultUserId, role } = getCurrentUserInfo();
    const targetUserId = userId || defaultUserId;
    
    return apiCall(`/subscription?user_id=${targetUserId}&role=${role}`);
  },

  async upgradeSubscription(planId, userId = null) {
    const { userId: defaultUserId } = getCurrentUserInfo();
    const targetUserId = userId || defaultUserId;
    
    return apiCall('/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify({
        user_id: targetUserId,
        plan_id: planId,
      }),
    });
  },

  async incrementUsage(usageType, userId = null) {
    const { userId: defaultUserId } = getCurrentUserInfo();
    const targetUserId = userId || defaultUserId;
    
    return apiCall('/subscription/usage/increment', {
      method: 'POST',
      body: JSON.stringify({
        user_id: targetUserId,
        usage_type: usageType,
      }),
    });
  },
};

// Scan History API
export const scanHistoryAPI = {
  async getScanHistory(userId = null) {
    const { userId: defaultUserId } = getCurrentUserInfo();
    const targetUserId = userId || defaultUserId;
    
    return apiCall(`/scan-history?user_id=${targetUserId}`);
  },

  async createScanHistory(scanData) {
    const { userId } = getCurrentUserInfo();
    
    const payload = {
      user_id: userId,
      ...scanData,
    };
    
    return apiCall('/scan-history', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// Business API
export const businessAPI = {
  // Inventory
  async getInventory(businessId = null) {
    const targetBusinessId = businessId || getCurrentUserInfo().userId;
    
    return apiCall(`/business/inventory?business_id=${targetBusinessId}`);
  },

  async createInventoryItem(itemData) {
    const { userId } = getCurrentUserInfo();
    
    const payload = {
      business_id: userId,
      ...itemData,
    };
    
    return apiCall('/business/inventory', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateInventoryItem(id, itemData) {
    return apiCall(`/business/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  },

  async deleteInventoryItem(id) {
    return apiCall(`/business/inventory/${id}`, {
      method: 'DELETE',
    });
  },

  // Orders
  async getOrders(businessId = null) {
    const targetBusinessId = businessId || getCurrentUserInfo().userId;
    
    return apiCall(`/business/orders?business_id=${targetBusinessId}`);
  },

  async updateOrderStatus(id, status, notes = null) {
    return apiCall(`/business/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        notes,
      }),
    });
  },

  // Branches
  async getBranches(businessId = null) {
    const targetBusinessId = businessId || getCurrentUserInfo().userId;
    
    return apiCall(`/business/branches?business_id=${targetBusinessId}`);
  },

  async createBranch(branchData) {
    const { userId } = getCurrentUserInfo();
    
    const payload = {
      business_id: userId,
      ...branchData,
    };
    
    return apiCall('/business/branches', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Analytics
  async getAnalytics(businessId = null) {
    const targetBusinessId = businessId || getCurrentUserInfo().userId;
    
    return apiCall(`/business/analytics?business_id=${targetBusinessId}`);
  },

  async getReport(businessId = null) {
    const targetBusinessId = businessId || getCurrentUserInfo().userId;
    
    return apiCall(`/business/report?business_id=${targetBusinessId}`);
  },
};

// Analytics API
export const analyticsAPI = {
  async getAnalytics(userId = null) {
    const { userId: defaultUserId, role } = getCurrentUserInfo();
    const targetUserId = userId || defaultUserId;
    
    return apiCall(`/analytics?user_id=${targetUserId}&role=${role}`);
  },

  async getMapsData(type = 'marketplace') {
    return apiCall(`/maps/${type}`);
  },
};

// Health check
export const healthAPI = {
  async checkHealth() {
    return apiCall('/health');
  },

  async getDatabaseInfo() {
    return apiCall('/database/info');
  },
};

// Error handling wrapper
export const safeAPICall = async (apiFunction, ...args) => {
  try {
    return await apiFunction(...args);
  } catch (error) {
    console.error('API Call Failed:', error);
    
    // Try localStorage fallback for critical data
    if (typeof window !== 'undefined') {
      console.warn('Attempting localStorage fallback...');
      return getLocalStorageFallback(apiFunction.name, ...args);
    }
    
    throw error;
  }
};

// LocalStorage fallback helper
function getLocalStorageFallback(functionName, ...args) {
  try {
    switch (functionName) {
      case 'getFoods':
        return JSON.parse(localStorage.getItem('fresh_foods') || '[]');
      case 'getMarketplaceItems':
        return JSON.parse(localStorage.getItem('fresh_marketplace') || '[]');
      case 'getDonationItems':
        return JSON.parse(localStorage.getItem('fresh_donations') || '[]');
      case 'getSubscription':
        return JSON.parse(localStorage.getItem('fresh_user_subscription') || '{}');
      default:
        return null;
    }
  } catch (error) {
    console.error('LocalStorage fallback failed:', error);
    return null;
  }
}

export default {
  food: foodAPI,
  marketplace: marketplaceAPI,
  donation: donationAPI,
  subscription: subscriptionAPI,
  scanHistory: scanHistoryAPI,
  business: businessAPI,
  analytics: analyticsAPI,
  health: healthAPI,
  safeCall: safeAPICall,
};
