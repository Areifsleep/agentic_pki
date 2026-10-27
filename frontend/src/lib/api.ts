import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000, // 45s for YouTube extraction + Gemini synthesis
})

// Global response interceptor for extracting error message
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMessage = 'Terjadi kesalahan pada jaringan atau server.'
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.message) {
      errorMessage = error.message
    }
    return Promise.reject(new Error(errorMessage))
  }
)
