const { Issuer, generators } = require('openid-client')

let oidcClient = null

async function getClient() {
  if (oidcClient) return oidcClient

  const issuerUrl = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`

  console.log(`[Keycloak] Descobrindo issuer em: ${issuerUrl}`)
  console.log('[Keycloak] Esta URL é o endpoint de descoberta OIDC (.well-known/openid-configuration)')

  const issuer = await Issuer.discover(issuerUrl)

  console.log('[Keycloak] Endpoints descobertos:')
  console.log(`  authorization_endpoint: ${issuer.authorization_endpoint}`)
  console.log(`  token_endpoint:         ${issuer.token_endpoint}`)
  console.log(`  userinfo_endpoint:      ${issuer.userinfo_endpoint}`)
  console.log(`  end_session_endpoint:   ${issuer.end_session_endpoint}`)
  console.log(`  introspection_endpoint: ${issuer.introspection_endpoint}`)
  console.log(`  revocation_endpoint:    ${issuer.revocation_endpoint}`)
  console.log(`  jwks_uri:               ${issuer.jwks_uri}`)

  oidcClient = new issuer.Client({
    client_id: process.env.KEYCLOAK_CLIENT_ID,
    client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
    redirect_uris: [process.env.REDIRECT_URI],
    post_logout_redirect_uris: [process.env.FRONTEND_URL],
    response_types: ['code'],
  })

  return oidcClient
}

module.exports = { getClient, generators }
