import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const d = err.response?.data?.detail
    let message = err.message
    if (typeof d === 'string') message = d
    else if (Array.isArray(d)) message = d.map((x) => x.msg || JSON.stringify(x)).join(', ')
    else if (d && typeof d === 'object' && d.msg) message = d.msg
    return Promise.reject(new Error(message || 'Request failed'))
  }
)

export const api = {
  auth: {
    login: (email, password) =>
      apiClient.post('/auth/login', { email, password }).then((r) => r.data),
    me: () => apiClient.get('/auth/me').then((r) => r.data),
  },
  admin: {
    createEmployee: (body) =>
      apiClient.post('/admin/create-employee', body).then((r) => r.data),
    users: () => apiClient.get('/admin/users').then((r) => r.data),
  },
  analytics: {
    summary: () => apiClient.get('/analytics/summary').then((r) => r.data),
    me: () => apiClient.get('/analytics/me').then((r) => r.data),
  },
  employees: {
    list: (params = {}) =>
      apiClient.get('/employees', { params }).then((r) => r.data),
    get: (id) => apiClient.get(`/employees/${id}`).then((r) => r.data),
    create: (body) => apiClient.post('/employees', body).then((r) => r.data),
    update: (id, body) => apiClient.put(`/employees/${id}`, body).then((r) => r.data),
    delete: (id) => apiClient.delete(`/employees/${id}`),
  },
  attendance: {
    list: (params = {}) => apiClient.get('/attendance', { params }).then((r) => r.data),
    byEmployee: (employeeId) =>
      apiClient.get(`/attendance/employee/${employeeId}`).then((r) => r.data),
    mark: (body) => apiClient.post('/attendance', body).then((r) => r.data),
    patch: (id, body) => apiClient.patch(`/attendance/${id}`, body).then((r) => r.data),
  },
  leaves: {
    list: (params = {}) => apiClient.get('/leaves', { params }).then((r) => r.data),
    apply: (body) => apiClient.post('/leaves', body).then((r) => r.data),
    setStatus: (id, status) =>
      apiClient.patch(`/leaves/${id}/status`, { status }).then((r) => r.data),
  },
}
