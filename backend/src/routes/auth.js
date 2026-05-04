const express = require('express')
const router = express.Router()
const { getClient, generators } = require('../lib/keycloak')
const jwt = require('jsonwebtoken')

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

/**
 * @swagger
 * /auth/login:
 *   get:
 *     summary: Iniciar autenticação (Authorization Code + PKCE)
 *     description: |
 *       Redireciona o usuário para a tela de login do Keycloak.
 *
 *       **Conceito PKCE (Proof Key for Code Exchange):**
 *       1. Backend gera `code_verifier` (segredo aleatório)
 *       2. Backend deriva `code_challenge = SHA256(code_verifier)`
 *       3. Envia `code_challenge` ao Keycloak (pode ser interceptado — não é segredo)
 *       4. No callback, envia `code_verifier` para provar que é o mesmo cliente
 *
 *       Este mecanismo evita que um atacante use um `code` interceptado.
 *     tags: [Autenticação]
 *     responses:
 *       302:
 *         description: Redirecionamento para o Keycloak
 */
router.get('/login', async (req, res) => {
  try {
    const client = await getClient()

    // PKCE: gerar code_verifier e code_challenge
    const codeVerifier = generators.codeVerifier()
    const codeChallenge = generators.codeChallenge(codeVerifier)
    const state = generators.state()

    // Armazenar na sessão para verificar no callback
    req.session.codeVerifier = codeVerifier
    req.session.state = state

    const authUrl = client.authorizationUrl({
      scope: 'openid profile email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    console.log(`[Login] Redirecionando para Keycloak`)
    console.log(`[Login] code_challenge: ${codeChallenge}`)
    console.log(`[Login] state: ${state}`)

    res.redirect(authUrl)
  } catch (err) {
    console.error('[Login] Erro:', err.message)
    res.redirect(`${process.env.FRONTEND_URL}?erro=login_falhou`)
  }
})

/**
 * @swagger
 * /auth/callback:
 *   get:
 *     summary: Callback OAuth (uso interno — chamado pelo Keycloak)
 *     description: |
 *       Endpoint chamado automaticamente pelo Keycloak após login bem-sucedido.
 *
 *       **O que acontece aqui:**
 *       1. Keycloak retorna `code` e `state` na URL
 *       2. Backend valida o `state` (prevenção CSRF)
 *       3. Backend troca o `code` por tokens usando `code_verifier`
 *       4. Tokens são armazenados na sessão do servidor
 *       5. Usuário é redirecionado para o frontend
 *
 *       > **Nota**: Não chamar diretamente via Swagger — é chamado pelo Keycloak.
 *     tags: [Autenticação]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema: { type: string }
 *         description: Código de autorização emitido pelo Keycloak
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *         description: State para prevenção de CSRF
 *     responses:
 *       302:
 *         description: Redirecionamento para o frontend após autenticação
 */
router.get('/callback', async (req, res) => {
  try {
    const client = await getClient()
    const params = client.callbackParams(req)

    console.log(`[Callback] Recebido code: ${params.code?.substring(0, 20)}...`)
    console.log(`[Callback] State recebido: ${params.state}`)
    console.log(`[Callback] State esperado: ${req.session.state}`)

    // Trocar code por tokens (com verificação PKCE e state)
    const tokenSet = await client.callback(
      process.env.REDIRECT_URI,
      params,
      {
        code_verifier: req.session.codeVerifier,
        state: req.session.state,
      }
    )

    console.log(`[Callback] Access token recebido! Expira em ${tokenSet.expires_in}s`)
    console.log(`[Callback] Scopes: ${tokenSet.scope}`)

    // Armazenar tokens na sessão
    req.session.accessToken = tokenSet.access_token
    req.session.refreshToken = tokenSet.refresh_token
    req.session.idToken = tokenSet.id_token
    req.session.expiresAt = tokenSet.expires_at
    req.session.claims = tokenSet.claims()

    // Limpar dados PKCE da sessão
    delete req.session.codeVerifier
    delete req.session.state

    res.redirect(`${process.env.FRONTEND_URL}?login=sucesso`)
  } catch (err) {
    const msg = err?.message || err?.error_description || JSON.stringify(err) || 'erro desconhecido'
    console.error('[Callback] Erro na troca de tokens:', msg)
    console.error('[Callback] Stack/detalhes:', err)
    res.redirect(`${process.env.FRONTEND_URL}?erro=callback_falhou&detalhes=${encodeURIComponent(msg)}`)
  }
})

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Dados da sessão atual (tokens decodificados)
 *     description: |
 *       Retorna os dados da sessão atual com os tokens decodificados.
 *
 *       **Claims importantes do Access Token:**
 *       - `sub`: ID único do usuário no Keycloak
 *       - `exp`: timestamp de expiração (Unix)
 *       - `iat`: timestamp de emissão
 *       - `iss`: quem emitiu o token (Keycloak URL)
 *       - `aud`: para quem o token foi emitido (client_id)
 *       - `scope`: permissões concedidas
 *       - `realm_access.roles`: roles do realm
 *       - `resource_access`: roles por client
 *     tags: [Autenticação]
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       200:
 *         description: Sessão com tokens decodificados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessaoAtual'
 *       401:
 *         description: Não autenticado
 */
router.get('/me', (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ autenticado: false, mensagem: 'Não autenticado' })
  }

  const accessDecoded = decodeToken(req.session.accessToken)
  const idDecoded = decodeToken(req.session.idToken)

  res.json({
    autenticado: true,
    usuario: {
      sub: req.session.claims?.sub,
      nome: req.session.claims?.name,
      email: req.session.claims?.email,
      primeiroNome: req.session.claims?.given_name,
      sobrenome: req.session.claims?.family_name,
      roles: req.session.claims?.realm_access?.roles || [],
      preferredUsername: req.session.claims?.preferred_username,
    },
    accessToken: accessDecoded,
    idToken: idDecoded,
    refreshToken: {
      raw: req.session.refreshToken,
      nota: 'Refresh tokens são opacos — não são JWTs e não podem ser decodificados pelo cliente',
    },
    sessao: {
      expiresAt: req.session.expiresAt,
      expiresIn: req.session.expiresAt ? req.session.expiresAt - Math.floor(Date.now() / 1000) : null,
    },
  })
})

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout SSO (encerra sessão no Keycloak)
 *     description: |
 *       Realiza o logout completo, encerrando tanto a sessão local quanto a sessão SSO no Keycloak.
 *
 *       **Diferença entre tipos de logout:**
 *       - **Logout local**: apenas destrói a sessão neste servidor. Outros apps SSO continuam logados.
 *       - **Logout SSO (este endpoint)**: envia `id_token_hint` ao Keycloak, que encerra a sessão global.
 *         Todos os apps que usam o mesmo Keycloak realm também terão sua sessão encerrada.
 *
 *       Retorna a URL de redirecionamento para o frontend processar.
 *     tags: [Autenticação]
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       200:
 *         description: URL de logout do Keycloak
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logoutUrl:
 *                   type: string
 *                   description: URL para redirecionar o usuário (encerra sessão Keycloak)
 *       401:
 *         description: Não autenticado
 */
router.post('/logout', async (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ erro: 'Não autenticado' })
  }

  try {
    const client = await getClient()
    const idToken = req.session.idToken

    // Construir URL de logout SSO com id_token_hint
    const logoutUrl = client.endSessionUrl({
      id_token_hint: idToken,
      post_logout_redirect_uri: process.env.FRONTEND_URL,
    })

    console.log(`[Logout] URL de encerramento de sessão SSO gerada`)

    // Destruir sessão local
    req.session.destroy()

    res.json({ logoutUrl })
  } catch (err) {
    console.error('[Logout] Erro:', err.message)
    res.status(500).json({ erro: 'Falha no logout', detalhes: err.message })
  }
})

/**
 * @swagger
 * /auth/logout-local:
 *   post:
 *     summary: Logout apenas local (mantém sessão Keycloak ativa)
 *     description: |
 *       Destrói apenas a sessão neste servidor, **sem** encerrar a sessão SSO no Keycloak.
 *
 *       Use este endpoint para demonstrar a diferença entre logout local e SSO:
 *       após este logout, ao clicar em "Login" novamente, o Keycloak não pedirá credenciais
 *       (pois a sessão SSO ainda está ativa) — o login acontece automaticamente via SSO.
 *     tags: [Autenticação]
 *     security:
 *       - sessionCookie: []
 *     responses:
 *       200:
 *         description: Sessão local encerrada
 */
router.post('/logout-local', (req, res) => {
  req.session.destroy()
  res.json({ mensagem: 'Sessão local encerrada. Sessão SSO no Keycloak ainda está ativa.' })
})

module.exports = router
