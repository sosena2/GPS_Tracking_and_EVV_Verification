import axios from 'axios'

// Base instance — all API calls use this
// so you never have to repeat the base URL
const api = axios.create({
  baseURL: 'http://localhost:5000'
})

// This interceptor runs before every request
// It automatically adds the token from localStorage
// so you don't have to add it manually to every call
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// This interceptor runs after every response
// If the server returns 401 (token expired/invalid)
// it automatically logs the user out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api