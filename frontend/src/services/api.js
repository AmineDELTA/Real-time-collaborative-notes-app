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

  // Get current user info with complete user data including ID
  getCurrentUser: async () => {
    try {
      // Call the users/me endpoint to get the complete user data including ID
      const response = await api.get('/users/me');
      console.log("User data from /users/me:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching user data:", error);
      
      // If the /users/me endpoint fails, try to refresh the token
      try {
        await api.post('/auth/refresh');
        // After refreshing, try /users/me again
        const retryResponse = await api.get('/users/me');
        console.log("User data after refresh:", retryResponse.data);
        return retryResponse.data;
      } catch (refreshError) {
        console.error("Refresh failed:", refreshError);
        // Last resort - try to get at least the email from the token
        const token = localStorage.getItem('access_token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return { email: payload.sub };
          } catch (tokenError) {
            console.error("Token parsing failed:", tokenError);
          }
        }
        throw error;
      }
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
  },

  // Method to get all members of a space
  getSpaceMembers: async (spaceId) => {
    const response = await api.get(`/spaces/${spaceId}/members`);
    return response.data;
  },

  // Method to invite a user to a space
  inviteToSpace: async (spaceId, email) => {
    const response = await api.post(`/spaces/${spaceId}/members`, { email });
    return response.data;
  },

  // Method to remove a user from a space
  removeFromSpace: async (spaceId, userId) => {
    const response = await api.delete(`/spaces/${spaceId}/members/${userId}`);
    return response.data;
  },
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

  // Remove user from space or delete space if owner leaves
  removeUserFromSpace: async (spaceId, userId) => {
    try {
      const response = await api.delete(`/user-in-space/space/${spaceId}/user/${userId}`);
      console.log("User removed successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error removing user from space:", error);
      
      // Check if there's a response with details
      if (error.response && error.response.data) {
        console.error("Server response error:", error.response.data);
        // If error contains a message about owner leaving, transform it to a clearer message
        if (error.response.data.detail && error.response.data.detail.includes('space owner')) {
          throw new Error('As the space owner, you cannot leave. Use the Delete Space option instead.');
        }
      }
      
      // Handle CORS errors specifically
      if (error.message === 'Network Error') {
        throw new Error('Connection error - please check that the backend server is running and CORS is properly configured.');
      }
      
      throw error;
    }
  },

  // Invite user to space
  inviteUserToSpace: async (spaceId, userEmail, role = 'PARTICIPANT') => {
    const response = await api.post(`/user-in-space/space/${spaceId}/invite?role=${role}`, { user_email: userEmail });
    return response.data;
  }
};

// Export the main api instance for custom requests
export default api;

