const express = require('express')
const router = express.Router()
const axios = require('axios')
const jwt = require('jsonwebtoken')
const { getClient } = require('../lib/keycloak')

function getBaseUrl() {
  return `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect`
}

function decodeToken(raw) {
  if (!raw) return null
  const decoded = jwt.decode(raw, { complete: true })
  if (!decoded) return null
  const now = Math.floor(Date.now() / 1000)
  return {
    raw,
    header: decoded.header,
    payload: decoded.payload,
    expiresIn: decoded.payload.exp ? decoded.payload.exp - now : null,
  }
}

function requerAutenticacao(req, res, next) {
  if (!req.session.accessToken) {
    return res.status(401).json({ erro: 'Não autenticado. Faça login primeiro.' })
  }
  next()
}

/**
 * @swagger
 * /tokens/refresh:
 *   post:
 *     summary: Renovar access token usando refresh token
 *     description: |
 *       Solicita um novo access token ao Keycloak usando o refresh token armazenado na sessão.
 *
 *       **Por que renovar tokens?**
 *       Access tokens têm vida curta (ex: 5 min) por segurança.
 *       O refresh token (vida mais longa) permite obter novos access tokens sem pedir
 *       as credenciais do usuário novamente.
 *
 *       **Chamada HTTP real feita ao Keycloak:**
 *       ```
 *       POST /realms/cloudnative/protocol/openid-connect/token
 *       Content-Type: application/x-www-form-urlencoded
 *
 *       grant_type=refresh_token
 *       &refresh_token=<refresh_token>
 *       &client_id=demo-app
 *       &client_secret=demo-secret-123
 *       ```
 *     tags: [Tokens]
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       200:
 *         description: Novo access token emitido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem: { type: string }
 *                 accessToken: { $ref: '#/components/schemas/TokenDecodificado' }
 *                 requisicao: { type: object, description: Detalhes da chamada feita ao Keycloak }
 *                 resposta: { type: object, description: Resposta bruta do Keycloak }
 *       401:
 *         description: Não autenticado ou refresh token inválido
 */
router.post('/refresh', requerAutenticacao, async (req, res) => {
  const endpoint = `${getBaseUrl()}/token`

  const payload = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: req.session.refreshToken,
    client_id: process.env.KEYCLOAK_CLIENT_ID,
    client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
  })

  const requisicao = {
    metodo: 'POST',
    url: endpoint,
    corpo: {
      grant_type: 'refresh_token',
      refresh_token: `${req.session.refreshToken?.substring(0, 20)}... (truncado)`,
      client_id: process.env.KEYCLOAK_CLIENT_ID,
      client_secret: '*** (oculto)',
    },
  }

  try {
    console.log(`[Refresh] Renovando token via: ${endpoint}`)

    const { data } = await axios.post(endpoint, payload.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    // Atualizar sessão com novos tokens
    req.session.accessToken = data.access_token
    req.session.refreshToken = data.refresh_token
    req.session.expiresAt = Math.floor(Date.now() / 1000) + data.expires_in

    console.log(`[Refresh] Novo access token emitido! Expira em ${data.expires_in}s`)

    res.json({
      mensagem: 'Token renovado com sucesso',
      accessToken: decodeToken(data.access_token),
      requisicao,
      resposta: {
        token_type: data.token_type,
        expires_in: data.expires_in,
        scope: data.scope,
        access_token: `${data.access_token?.substring(0, 30)}... (truncado)`,
        refresh_token: `${data.refresh_token?.substring(0, 20)}... (truncado)`,
      },
    })
  } catch (err) {
    const status = err.response?.status || 500
    console.error('[Refresh] Erro:', err.response?.data || err.message)
    res.status(status).json({
      erro: 'Falha ao renovar token',
      detalhes: err.response?.data || err.message,
      requisicao,
    })
  }
})

/**
 * @swagger
 * /tokens/introspect:
 *   post:
 *     summary: Introspectar token (verificar se está ativo no servidor)
 *     description: |
 *       Verifica o status do token diretamente no Keycloak (server-side validation).
 *
 *       **Por que usar introspeção?**
 *       - Validação local de JWT verifica apenas assinatura e expiração
 *       - Introspeção verifica se o token foi **revogado** (invalidade ativa)
 *       - Importante para sistemas que precisam revogar tokens antes da expiração natural
 *
 *       **Chamada HTTP real:**
 *       ```
 *       POST /realms/cloudnative/protocol/openid-connect/token/introspect
 *       Authorization: Basic base64(client_id:client_secret)
 *       Content-Type: application/x-www-form-urlencoded
 *
 *       token=<access_token>&token_type_hint=access_token
 *       ```
 *
 *       > **Nota**: Este é um endpoint **servidor-para-servidor** (não deve ser chamado do browser em produção).
 *     tags: [Tokens]
 *     security:
 *       - sessionCookie: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tipoToken:
 *                 type: string
 *                 enum: [access_token, refresh_token]
 *                 default: access_token
 *     responses:
 *       200:
 *         description: Resultado da introspeção
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ativo: { type: boolean, description: true = token válido e não revogado }
 *                 introspeccao: { type: object, description: Resposta completa do Keycloak }
 *                 requisicao: { type: object }
 */
router.post('/introspect', requerAutenticacao, async (req, res) => {
  const tipoToken = req.body?.tipoToken || 'access_token'
  const token = tipoToken === 'refresh_token' ? req.session.refreshToken : req.session.accessToken
  const endpoint = `${getBaseUrl()}/token/introspect`

  const credenciais = Buffer.from(
    `${process.env.KEYCLOAK_CLIENT_ID}:${process.env.KEYCLOAK_CLIENT_SECRET}`
  ).toString('base64')

  const payload = new URLSearchParams({
    token,
    token_type_hint: tipoToken,
  })

  const requisicao = {
    metodo: 'POST',
    url: endpoint,
    headers: {
      Authorization: `Basic base64(${process.env.KEYCLOAK_CLIENT_ID}:***senha***)`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    corpo: {
      token: `${token?.substring(0, 20)}... (truncado)`,
      token_type_hint: tipoToken,
    },
  }

  try {
    console.log(`[Introspect] Verificando ${tipoToken} em: ${endpoint}`)

    const { data } = await axios.post(endpoint, payload.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credenciais}`,
      },
    })

    console.log(`[Introspect] Token ativo: ${data.active}`)

    res.json({
      ativo: data.active,
      introspeccao: data,
      requisicao,
    })
  } catch (err) {
    console.error('[Introspect] Erro:', err.response?.data || err.message)
    res.status(500).json({
      erro: 'Falha na introspeção',
      detalhes: err.response?.data || err.message,
      requisicao,
    })
  }
})

/**
 * @swagger
 * /tokens/revoke:
 *   post:
 *     summary: Revogar token (invalidar permanentemente)
 *     description: |
 *       Revoga um token no Keycloak, tornando-o inválido imediatamente.
 *
 *       **Efeito da revogação:**
 *       - Revogar `refresh_token`: impossibilita renovação futura → logout efetivo
 *       - Revogar `access_token`: invalida chamadas imediatas (porém JWTs locais ainda passam em validação local)
 *
 *       **Demonstração recomendada:**
 *       1. Chamar `/tokens/introspect` → `active: true`
 *       2. Chamar `/tokens/revoke` com `refresh_token`
 *       3. Chamar `/tokens/introspect` novamente → `active: false` ✓
 *
 *       **Chamada HTTP real:**
 *       ```
 *       POST /realms/cloudnative/protocol/openid-connect/revoke
 *       Authorization: Basic base64(client_id:client_secret)
 *       Content-Type: application/x-www-form-urlencoded
 *
 *       token=<token>&token_type_hint=refresh_token
 *       ```
 *     tags: [Tokens]
 *     security:
 *       - sessionCookie: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tipoToken:
 *                 type: string
 *                 enum: [access_token, refresh_token]
 *                 default: refresh_token
 *     responses:
 *       200:
 *         description: Token revogado com sucesso
 *       401:
 *         description: Não autenticado
 */
router.post('/revoke', requerAutenticacao, async (req, res) => {
  const tipoToken = req.body?.tipoToken || 'refresh_token'
  const token = tipoToken === 'refresh_token' ? req.session.refreshToken : req.session.accessToken
  const endpoint = `${getBaseUrl()}/revoke`

  const credenciais = Buffer.from(
    `${process.env.KEYCLOAK_CLIENT_ID}:${process.env.KEYCLOAK_CLIENT_SECRET}`
  ).toString('base64')

  const payload = new URLSearchParams({
    token,
    token_type_hint: tipoToken,
    client_id: process.env.KEYCLOAK_CLIENT_ID,
    client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
  })

  const requisicao = {
    metodo: 'POST',
    url: endpoint,
    corpo: {
      token: `${token?.substring(0, 20)}... (truncado)`,
      token_type_hint: tipoToken,
      client_id: process.env.KEYCLOAK_CLIENT_ID,
      client_secret: '*** (oculto)',
    },
  }

  try {
    console.log(`[Revoke] Revogando ${tipoToken} em: ${endpoint}`)

    await axios.post(endpoint, payload.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credenciais}`,
      },
    })

    console.log(`[Revoke] Token ${tipoToken} revogado com sucesso`)

    // Limpar token da sessão se for refresh token
    if (tipoToken === 'refresh_token') {
      req.session.refreshToken = null
    }

    res.json({
      mensagem: `Token do tipo "${tipoToken}" revogado com sucesso`,
      dica: 'Chame /tokens/introspect agora para confirmar que active: false',
      requisicao,
    })
  } catch (err) {
    console.error('[Revoke] Erro:', err.response?.data || err.message)
    res.status(500).json({
      erro: 'Falha ao revogar token',
      detalhes: err.response?.data || err.message,
      requisicao,
    })
  }
})

/**
 * @swagger
 * /tokens/userinfo:
 *   get:
 *     summary: Buscar informações do usuário via UserInfo endpoint
 *     description: |
 *       Chama o endpoint UserInfo do Keycloak com o access token para obter informações do usuário.
 *
 *       **Diferença entre claims do JWT e UserInfo:**
 *       - **JWT claims**: embutidas no token, disponíveis offline (sem chamada de rede)
 *       - **UserInfo endpoint**: chamada de rede ao Keycloak, sempre retorna dados **atualizados**
 *
 *       Use UserInfo quando precisar garantir que os dados do usuário estão frescos
 *       (ex: nome ou email foi alterado após emissão do token).
 *
 *       **Chamada HTTP real:**
 *       ```
 *       GET /realms/cloudnative/protocol/openid-connect/userinfo
 *       Authorization: Bearer <access_token>
 *       ```
 *     tags: [Tokens]
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       200:
 *         description: Informações do usuário do Keycloak
 */
router.get('/userinfo', requerAutenticacao, async (req, res) => {
  const endpoint = `${getBaseUrl()}/userinfo`

  const requisicao = {
    metodo: 'GET',
    url: endpoint,
    headers: {
      Authorization: `Bearer ${req.session.accessToken?.substring(0, 20)}... (truncado)`,
    },
  }

  try {
    console.log(`[UserInfo] Consultando: ${endpoint}`)

    const { data } = await axios.get(endpoint, {
      headers: { Authorization: `Bearer ${req.session.accessToken}` },
    })

    res.json({ userinfo: data, requisicao })
  } catch (err) {
    console.error('[UserInfo] Erro:', err.response?.data || err.message)
    res.status(err.response?.status || 500).json({
      erro: 'Falha ao buscar UserInfo',
      detalhes: err.response?.data || err.message,
      requisicao,
    })
  }
})

/**
 * @swagger
 * /tokens/endpoints:
 *   get:
 *     summary: Listar todos os endpoints do Keycloak (OIDC Discovery)
 *     description: |
 *       Retorna os endpoints descobertos via OIDC Discovery Document.
 *
 *       O Keycloak publica automaticamente todos os seus endpoints em:
 *       `{url}/realms/{realm}/.well-known/openid-configuration`
 *
 *       Esta descoberta automática é um dos recursos mais poderosos do OIDC —
 *       clients não precisam saber URLs de antemão.
 *     tags: [Info]
 *     responses:
 *       200:
 *         description: Endpoints do Keycloak
 */
router.get('/endpoints', async (req, res) => {
  try {
    const client = await getClient()
    const issuer = client.issuer

    res.json({
      discoveryUrl: `${issuer.issuer}/.well-known/openid-configuration`,
      endpoints: {
        authorization: issuer.authorization_endpoint,
        token: issuer.token_endpoint,
        userinfo: issuer.userinfo_endpoint,
        introspection: issuer.introspection_endpoint,
        revocation: issuer.revocation_endpoint,
        endSession: issuer.end_session_endpoint,
        jwks: issuer.jwks_uri,
        deviceAuthorization: issuer.device_authorization_endpoint,
      },
    })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

module.exports = router
