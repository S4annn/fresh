// API client for user authentication and management
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Store JWT token in localStorage
const TOKEN_KEY = 'fresh_auth_token';
const USER_KEY = 'fresh_current_user';

// Get auth headers for API requests
function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

// Store auth data
function storeAuthData(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Clear auth data
function clearAuthData() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Get current user from localStorage
function getCurrentUser() {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

// Get current token
function getCurrentToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Check if user is authenticated
function isAuthenticated() {
  return !!getCurrentToken() && !!getCurrentUser();
}

// API Functions
export const authAPI = {
  // Register new user
  async register(userData) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    return response.json();
  },

  // Login user
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    
    // Get user info
    const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${data.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const user = await userResponse.json();
    
    // Store auth data
    storeAuthData(data.access_token, user);
    
    return { token: data.access_token, user, expiresIn: data.expires_in };
  },

  // Get current user info
  async getCurrentUser() {
    const token = getCurrentToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid, clear auth data
        clearAuthData();
        throw new Error('Session expired');
      }
      throw new Error('Failed to get user info');
    }

    const user = await response.json();
    
    // Update stored user data
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    
    return user;
  },

  // Logout user
  async logout() {
    const token = getCurrentToken();
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });
      } catch (error) {
        console.warn('Logout API call failed:', error);
      }
    }
    
    // Clear local auth data
    clearAuthData();
  },

  // Check authentication status
  checkAuth() {
    return isAuthenticated();
  },

  // Get stored user data
  getStoredUser() {
    return getCurrentUser();
  },

  // Get stored token
  getStoredToken() {
    return getCurrentToken();
  },

  // Refresh user data
  async refreshUserData() {
    try {
      const user = await this.getCurrentUser();
      return user;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      throw error;
    }
  }
};

// Helper function to make authenticated API calls
export async function authenticatedFetch(url, options = {}) {
  const token = getCurrentToken();
  if (!token) {
    throw new Error('No authentication token');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Token expired, clear auth data
    clearAuthData();
    throw new Error('Session expired');
  }

  return response;
}
