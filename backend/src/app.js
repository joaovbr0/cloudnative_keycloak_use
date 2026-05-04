require('dotenv').config()

const express = require('express')
const session = require('express-session')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./swagger')

const authRoutes = require('./routes/auth')
const tokenRoutes = require('./routes/tokens')

const app = express()
const PORT = process.env.PORT || 3001

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173'],
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Sessão em memória (apenas para demo — não usar em produção)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 3600 * 1000, // 1 hora
    sameSite: 'lax',
  },
}))

// ── Swagger UI ──────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Cloud Native Demo — API Docs',
  customCss: `
    .swagger-ui .topbar { background: #0D1B2A; }
    .swagger-ui .topbar-wrapper img { display: none; }
    .swagger-ui .topbar-wrapper::after {
      content: '☁ Cloud Native — Keycloak Demo';
      color: #00B4E6;
      font-size: 1.1rem;
      font-weight: 600;
      letter-spacing: 2px;
    }
    .swagger-ui .markdown code,
    .swagger-ui .renderedMarkdown code,
    .swagger-ui .markdown p code,
    .swagger-ui .markdown li code,
    .swagger-ui .renderedMarkdown p code,
    .swagger-ui .renderedMarkdown li code {
      font-size: 0.8em !important;
      padding: 2px 5px !important;
      border-radius: 3px !important;
      vertical-align: baseline !important;
    }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    tryItOutEnabled: true,
  },
}))

// ── Health ──────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }))

// ── Rotas ───────────────────────────────────────────────────
app.use('/auth', authRoutes)
app.use('/tokens', tokenRoutes)

/**
 * @swagger
 * /:
 *   get:
 *     summary: Status da API
 *     tags: [Info]
 *     responses:
 *       200:
 *         description: API online
 */
app.get('/', (req, res) => {
  res.json({
    api: 'Cloud Native Demo — Keycloak',
    status: 'online',
    versao: '1.0.0',
    docs: '/api-docs',
    endpoints: {
      autenticacao: {
        login: 'GET /auth/login',
        callback: 'GET /auth/callback',
        me: 'GET /auth/me',
        logout: 'POST /auth/logout',
        logoutLocal: 'POST /auth/logout-local',
      },
      tokens: {
        renovar: 'POST /tokens/refresh',
        introspectar: 'POST /tokens/introspect',
        revogar: 'POST /tokens/revoke',
        userinfo: 'GET /tokens/userinfo',
        endpoints: 'GET /tokens/endpoints',
      },
    },
  })
})

// ── Inicialização ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════╗')
  console.log('║   ☁  Cloud Native Demo — Backend API      ║')
  console.log('╚════════════════════════════════════════════╝\n')
  console.log(`🚀 Servidor: http://localhost:${PORT}`)
  console.log(`📖 Swagger:  http://localhost:${PORT}/api-docs`)
  console.log(`🔑 Keycloak: ${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`)
  console.log(`   Discovery: ${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/.well-known/openid-configuration\n`)
})
