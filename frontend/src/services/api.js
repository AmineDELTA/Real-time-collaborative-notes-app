import axios from "axios";

// Base configuration
const API_BASE_URL = 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const refreshResponse = await api.post('/auth/refresh');
        const { access_token } = refreshResponse.data;
        
        localStorage.setItem('access_token', access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  // Register new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const formData = new FormData();
    formData.append('username', credentials.email); // Backend expects 'username' field
    formData.append('password', credentials.password);
    
    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    const { access_token } = response.data;
    localStorage.setItem('access_token', access_token);
    
    return response.data;
  },

  // Refresh token
  refresh: async () => {
    const response = await api.post('/auth/refresh');
    const { access_token } = response.data;
    localStorage.setItem('access_token', access_token);
    return response.data;
  },

  // Logout (clear local storage)
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },

  // Get current user info - we'll use a different approach
  getCurrentUser: async () => {
    // Since there's no /users/me endpoint, we'll decode the JWT token
    // to get user info, or use the refresh endpoint which should return user info
    try {
      const response = await api.post('/auth/refresh');
      // The refresh endpoint should return user info, but if not, we'll handle it
      return response.data;
    } catch (error) {
      // If refresh fails, try to get user info from token
      const token = localStorage.getItem('access_token');
      if (token) {
        // Decode JWT token to get user email
        const payload = JSON.parse(atob(token.split('.')[1]));
        return { email: payload.sub };
      }
      throw error;
    }
  }
};

// Spaces API functions
export const spacesAPI = {
  // Get user's spaces
  getMySpaces: async () => {
    const response = await api.get('/spaces/my-spaces');
    return response.data;
  },

  // Get spaces with user roles
  getMySpacesWithRoles: async () => {
    const response = await api.get('/spaces/my-spaces-with-roles');
    return response.data;
  },

  // Create new space
  createSpace: async (spaceData) => {
    const response = await api.post('/spaces/', spaceData);
    return response.data;
  },

  // Get specific space
  getSpace: async (spaceId) => {
    const response = await api.get(`/spaces/${spaceId}`);
    return response.data;
  },

  // Update space
  updateSpace: async (spaceId, spaceData) => {
    const response = await api.put(`/spaces/${spaceId}`, spaceData);
    return response.data;
  },

  // Delete space
  deleteSpace: async (spaceId) => {
    const response = await api.delete(`/spaces/${spaceId}`);
    return response.data;
  }
};

// Blocks API functions
export const blocksAPI = {
  // Get blocks for a space
  getBlocksForSpace: async (spaceId) => {
    const response = await api.get(`/blocks/space/${spaceId}`);
    return response.data;
  },

  // Create new block
  createBlock: async (blockData) => {
    const response = await api.post('/blocks/', blockData);
    return response.data;
  },

  // Get specific block
  getBlock: async (blockId) => {
    const response = await api.get(`/blocks/${blockId}`);
    return response.data;
  },

  // Update block
  updateBlock: async (blockId, blockData) => {
    const response = await api.put(`/blocks/${blockId}`, blockData);
    return response.data;
  },

  // Delete block
  deleteBlock: async (blockId) => {
    const response = await api.delete(`/blocks/${blockId}`);
    return response.data;
  },

  // Refresh block order
  refreshBlockOrder: async (spaceId) => {
    const response = await api.post(`/blocks/space/${spaceId}/refresh-order`);
    return response.data;
  }
};

// User management API functions
export const usersAPI = {
  // Get user profile
  getUser: async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  // Update user profile
  updateUser: async (userId, userData) => {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  }
};

// Utility functions
export const apiUtils = {
  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },

  // Get stored token
  getToken: () => {
    return localStorage.getItem('access_token');
  },

  // Set user data
  setUser: (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
  },

  // Get user data
  getUser: () => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },

  // Get current user from token (simplified approach)
  getCurrentUser: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No token found');
    }
    
    try {
      // Decode JWT token to get user email
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { email: payload.sub };
    } catch (error) {
      throw new Error('Invalid token');
    }
  },

  // Clear all auth data
  clearAuth: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }
};

// Space Members API functions
export const spaceMembersAPI = {
  // Get space members
  getSpaceMembers: async (spaceId) => {
    const response = await api.get(`/user-in-space/space/${spaceId}/users`);
    return response.data;
  },

  // Change user role
  changeUserRole: async (spaceId, userId, role) => {
    const response = await api.put(`/user-in-space/space/${spaceId}/user/${userId}/role`, { role });
    return response.data;
  },

  // Remove user from space
  removeUserFromSpace: async (spaceId, userId) => {
    const response = await api.delete(`/user-in-space/space/${spaceId}/user/${userId}`);
    return response.data;
  },

  // Invite user to space
  inviteUserToSpace: async (spaceId, userEmail, role = 'PARTICIPANT') => {
    const response = await api.post(`/user-in-space/space/${spaceId}/invite?role=${role}`, { user_email: userEmail });
    return response.data;
  }
};

// Export the main api instance for custom requests
export default api;

