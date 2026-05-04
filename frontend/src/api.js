import axios from 'axios'

// URLs relativas — proxy Vite (dev) ou Nginx (docker) encaminham para o backend
// Isso garante same-origin: cookies de sessão funcionam corretamente
const api = axios.create({
  baseURL: '',
  withCredentials: true,
})

export const buscarSessao    = ()                => api.get('/auth/me')
export const fazerLogout     = ()                => api.post('/auth/logout')
export const fazerLogoutLocal = ()               => api.post('/auth/logout-local')
export const renovarToken    = ()                => api.post('/tokens/refresh')
export const introspectar    = (tipoToken = 'access_token')  => api.post('/tokens/introspect', { tipoToken })
export const revogar         = (tipoToken = 'refresh_token') => api.post('/tokens/revoke', { tipoToken })
export const buscarUserInfo  = ()                => api.get('/tokens/userinfo')
export const buscarEndpoints = ()                => api.get('/tokens/endpoints')

// /auth/login — vai pelo proxy (mesmo origin)
export const urlLogin = '/auth/login'

// Swagger aponta direto pro backend (:3001) porque Express redireciona /api-docs → /api-docs/
// e o header Location fica sem porta quando passa pelo Nginx proxy.
// Port 3001 está exposta no docker-compose, então funciona em dev e docker.
const backendBase = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3001`
export const urlSwagger = `${backendBase}/api-docs`

export default api
