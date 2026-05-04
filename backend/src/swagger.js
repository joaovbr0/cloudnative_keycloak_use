const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cloud Native Demo — API Keycloak',
      version: '1.0.0',
      description: `
## Aula: Keycloak com OIDC / OAuth 2.0

Esta API demonstra os principais endpoints utilizados no fluxo de autenticação com Keycloak.

### Fluxo Principal (Authorization Code + PKCE)
\`\`\`
Usuário → GET /auth/login → Keycloak (tela de login)
Keycloak → GET /auth/callback (com code) → troca por tokens
Frontend → GET /auth/me → recebe dados da sessão
\`\`\`

### Endpoints de Token
- **Renovar**: emite novo access token sem re-login
- **Introspectar**: verifica se token está ativo no servidor
- **Revogar**: invalida o token permanentemente

### Usuários de Teste
| Usuário | Senha | Role |
|---------|-------|------|
| joao.banczek | joao123 | instrutor |
| maria.aluna | maria123 | aluno |
      `,
      contact: {
        name: 'João Banczek',
        email: 'joao.banczek@cloudnative.dev',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Servidor de desenvolvimento',
      },
    ],
    tags: [
      { name: 'Autenticação', description: 'Login, logout e dados da sessão' },
      { name: 'Tokens', description: 'Operações sobre tokens OIDC' },
      { name: 'Info', description: 'Informações do servidor' },
    ],
    components: {
      securitySchemes: {
        sessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Cookie de sessão (criado automaticamente após login)',
        },
      },
      schemas: {
        TokenDecodificado: {
          type: 'object',
          properties: {
            raw: { type: 'string', description: 'JWT completo (header.payload.signature)' },
            header: { type: 'object', description: 'Header decodificado' },
            payload: { type: 'object', description: 'Payload com todas as claims' },
            expiresIn: { type: 'number', description: 'Segundos até expirar' },
          },
        },
        SessaoAtual: {
          type: 'object',
          properties: {
            autenticado: { type: 'boolean' },
            usuario: { type: 'object' },
            accessToken: { $ref: '#/components/schemas/TokenDecodificado' },
            idToken: { $ref: '#/components/schemas/TokenDecodificado' },
            refreshToken: { type: 'object' },
          },
        },
        ErroResposta: {
          type: 'object',
          properties: {
            erro: { type: 'string' },
            detalhes: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
}

module.exports = swaggerJsdoc(options)
