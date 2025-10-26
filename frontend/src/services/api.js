<<<<<<< Updated upstream
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('API Error:', error)
    
    if (error.response?.status === 404) {
      throw new Error('Resource not found')
    } else if (error.response?.status === 500) {
      throw new Error('Server error occurred')
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout')
    } else if (!error.response) {
      throw new Error('Network error - please check your connection')
    }
    
    throw error
  }
)

// Apps API
export const appsApi = {
  getAll: () => api.get('/apps'),
  getById: (id) => api.get(`/apps/${id}`),
  create: (app) => api.post('/apps', app),
  update: (id, app) => api.put(`/apps/${id}`, app),
  delete: (id) => api.delete(`/apps/${id}`),
  ignoreVersion: (id, version) => api.post(`/apps/${id}/ignore-version`, { version }),
}

// Updates API
export const updatesApi = {
  getRecent: (limit = 10) => api.get(`/updates?limit=${limit}`),
  checkAll: () => api.post('/updates/check-all'),
  checkSingle: (appId) => api.post('/updates/check', { appId }),
  getStats: () => api.get('/updates/stats'),
  markNotified: (updateId) => api.post(`/updates/${updateId}/mark-notified`),
}

// Health check
export const healthApi = {
  check: () => api.get('/health'),
}

=======
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('API Error:', error)
    
    if (error.response?.status === 404) {
      throw new Error('Resource not found')
    } else if (error.response?.status === 500) {
      throw new Error('Server error occurred')
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout')
    } else if (!error.response) {
      throw new Error('Network error - please check your connection')
    }
    
    throw error
  }
)

// Apps API
export const appsApi = {
  getAll: () => api.get('/apps'),
  getById: (id) => api.get(`/apps/${id}`),
  create: (app) => api.post('/apps', app),
  update: (id, app) => api.put(`/apps/${id}`, app),
  delete: (id) => api.delete(`/apps/${id}`),
  ignoreVersion: (id, version) => api.post(`/apps/${id}/ignore-version`, { version }),
  markAsUpdated: (id) => api.post(`/apps/${id}/mark-updated`),
}

// Updates API
export const updatesApi = {
  getRecent: (limit = 10) => api.get(`/updates?limit=${limit}`),
  checkAll: () => api.post('/updates/check-all'),
  checkSingle: (appId) => api.post('/updates/check', { appId }),
  getStats: () => api.get('/updates/stats'),
  markNotified: (updateId) => api.post(`/updates/${updateId}/mark-notified`),
}

// Health check
export const healthApi = {
  check: () => api.get('/health'),
}

>>>>>>> Stashed changes
export default api