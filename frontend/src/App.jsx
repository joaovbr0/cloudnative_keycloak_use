import { useState, useEffect, useCallback } from 'react'
import TokenCard from './components/TokenCard'
import EndpointLog from './components/EndpointLog'
import {
  buscarSessao, fazerLogout, fazerLogoutLocal,
  renovarToken, introspectar, revogar, buscarUserInfo, buscarEndpoints,
  urlLogin, urlSwagger,
} from './api'
import { Key,Lock,BookText,RefreshCcw,IdCard ,UserKey, User,Search, DoorClosed, BookOpen, Trash2} from 'lucide-react';

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
     <img src="/favicon.svg" itemType='svg' alt="Cloud Native Demo" width={32} height={32} />
      <div>
        <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '0.08em', color: '#00B4E6' }}>CLOUD NATIVE</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em' }}>KEYCLOAK DEMO</div>
      </div>
    </div>
  )
}

// ── Tela de login ──────────────────────────────────────────
function TelaLogin() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        {/* Logo grande */}
        <div style={{ marginBottom: 40 }}>
          <img src="/favicon.svg" itemType='svg' alt="Cloud Native Demo" width={120} height={120} />
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#00B4E6', letterSpacing: '0.06em', marginBottom: 8 }}>
            CLOUD NATIVE DEMO
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Aula prática de autenticação com Keycloak + OIDC
          </p>
        </div>

        {/* Card de login */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Key/> Bem-vindo</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
            Faça login com o Keycloak para explorar os tokens OIDC e os endpoints OAuth 2.0.
          </p>

          <a href={urlLogin} style={{ display: 'block', textDecoration: 'none' }}>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '14px 24px' }}>
              <Lock/> Entrar com Keycloak
            </button>
          </a>

          <div className="divider" />

          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Usuários de teste
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { usuario: 'joao.banczek', senha: 'joao123', role: 'instrutor' },
                { usuario: 'maria.aluna', senha: 'maria123', role: 'aluno' },
              ].map(u => (
                <div key={u.usuario} style={{
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>{u.usuario}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>senha: {u.senha}</div>
                  </div>
                  <span className={`badge ${u.role === 'instrutor' ? 'badge-blue' : 'badge-green'}`}>{u.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <a href={urlSwagger} target="_blank" rel="noopener noreferrer">
          <button className="btn btn-outline" style={{ fontSize: 12 }}>
            <BookText/> Abrir Swagger UI
          </button>
        </a>
      </div>
    </div>
  )
}

// ── Dashboard principal ────────────────────────────────────
function Dashboard({ sessao, onAtualizar }) {
  const [abaToken, setAbaToken] = useState('access')
  const [resultado, setResultado] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [endpoints, setEndpoints] = useState(null)

  const executar = async (operacao, fn) => {
    setCarregando(true)
    setResultado(null)
    try {
      const { data } = await fn()
      setResultado({ operacao, sucesso: true, dados: data, timestamp: Date.now() })
      if (['Renovar Token', 'Revogar Refresh Token', 'Revogar Access Token'].includes(operacao)) {
        await onAtualizar()
      }
    } catch (err) {
      setResultado({
        operacao,
        sucesso: false,
        erro: err.response?.data || { mensagem: err.message },
        timestamp: Date.now(),
      })
    } finally {
      setCarregando(false)
    }
  }

  const logout = async () => {
    try {
      const { data } = await fazerLogout()
      window.location.href = data.logoutUrl
    } catch (err) {
      console.error('Erro no logout:', err)
    }
  }

  const logoutLocal = async () => {
    await fazerLogoutLocal()
    onAtualizar()
  }

  useEffect(() => {
    buscarEndpoints().then(({ data }) => setEndpoints(data)).catch(() => {})
  }, [])

  const { usuario, accessToken, idToken, refreshToken } = sessao

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: "var(--bg-primary)",
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right', marginRight: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{usuario?.nome || usuario?.preferredUsername}</div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                {usuario?.roles?.filter(r => !r.startsWith('default')).map(r => (
                  <span key={r} className={`badge ${r === 'instrutor' ? 'badge-blue' : 'badge-green'}`}>{r}</span>
                ))}
              </div>
            </div>
            <a href={urlSwagger} target="_blank" rel="noopener noreferrer">
              <button className="btn btn-ghost" style={{ fontSize: 12 }}><BookOpen height={16} width={16}/> Swagger</button>
            </a>
            <button className="btn btn-ghost" onClick={logoutLocal} style={{ fontSize: 12 }}>Logout Local</button>
            <button className="btn btn-danger" onClick={logout}> <DoorClosed height={16} width={16} /> Logout SSO</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>

        {/* Informações do usuário */}
        <div className="card fade-in" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 56, height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: 'white',
              flexShrink: 0,
            }}>
              {(usuario?.primeiroNome?.[0] || usuario?.preferredUsername?.[0] || '?').toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                {usuario?.nome || usuario?.preferredUsername}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 6 }}>{usuario?.email}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="badge badge-gray">sub: {usuario?.sub?.substring(0, 8)}...</span>
                {usuario?.roles?.filter(r => !r.startsWith('default')).map(r => (
                  <span key={r} className={`badge ${r === 'instrutor' ? 'badge-blue' : 'badge-green'}`}>{r}</span>
                ))}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              {sessao.sessao?.expiresIn !== null && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Access Token expira em</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: sessao.sessao.expiresIn > 60 ? 'var(--success)' : 'var(--danger)' }}>
                    {sessao.sessao.expiresIn}s
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>

          {/* Coluna esquerda — Tokens */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
               <IdCard width={16} height={16} /> Tokens OIDC
            </h2>

            <div className="tabs">
              <button style={{display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center'}} className={`tab ${abaToken === 'access' ? 'ativo' : ''}`} onClick={() => setAbaToken('access')}>
                <UserKey /> Access Token
              </button>
              <button style={{display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center'}} className={`tab ${abaToken === 'id' ? 'ativo' : ''}`} onClick={() => setAbaToken('id')}>
                <IdCard /> ID Token
              </button>
              <button style={{display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center'}} className={`tab ${abaToken === 'refresh' ? 'ativo' : ''}`} onClick={() => setAbaToken('refresh')}>
                <RefreshCcw/> Refresh Token
              </button>
            </div>

            {abaToken === 'access' && (
              <TokenCard titulo="Access Token" token={accessToken} tipo="access" />
            )}
            {abaToken === 'id' && (
              <TokenCard titulo="ID Token" token={idToken} tipo="id" />
            )}
            {abaToken === 'refresh' && (
              <TokenCard titulo="Refresh Token" token={refreshToken} tipo="refresh" />
            )}

            {/* Log da última operação */}
            {(resultado || carregando) && (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  📡 Última Chamada HTTP
                </h3>
                <EndpointLog resultado={resultado} carregando={carregando} />
              </div>
            )}
          </div>

          {/* Coluna direita — Ações */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ⚡ Operações
            </h2>

            {/* Grupo: Token */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 14, textTransform: 'uppercase' }}>
                Token
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-primary" style={{ justifyContent: 'flex-start' }}
                  onClick={() => executar('Renovar Token', renovarToken)} disabled={carregando}>
                  <RefreshCcw width={16} height={16}/>Renovar Token (refresh)
                </button>
                <button className="btn btn-outline" style={{ justifyContent: 'flex-start' }}
                  onClick={() => executar('Introspectar Access Token', () => introspectar('access_token'))} disabled={carregando}>
                   <Search width={16} height={16}/> Introspectar Access Token
                </button>
                <button className="btn btn-outline" style={{ justifyContent: 'flex-start' }}
                  onClick={() => executar('Introspectar Refresh Token', () => introspectar('refresh_token'))} disabled={carregando}>
                 <Search width={16} height={16}/>Introspectar Refresh Token
                </button>
                <button className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}
                  onClick={() => executar('UserInfo', buscarUserInfo)} disabled={carregando}>
                  <User width={16} height={16}/> Buscar UserInfo
                </button>
              </div>
            </div>

            {/* Grupo: Revogar */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 14, textTransform: 'uppercase' }}>
                Revogar Token
              </div>
              <div style={{
                background: 'var(--warning-bg)',
                border: '1px solid rgba(255,184,48,0.3)',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 11,
                color: 'var(--warning)',
                marginBottom: 12,
              }}>
                ⚠️ Após revogar, use "Introspectar" para confirmar <code>active: false</code>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-danger" style={{ justifyContent: 'flex-start' }}
                  onClick={() => executar('Revogar Refresh Token', () => revogar('refresh_token'))} disabled={carregando}>
                  <Trash2 height={16} width={16} /> Revogar Refresh Token
                </button>
                <button className="btn btn-danger" style={{ justifyContent: 'flex-start' }}
                  onClick={() => executar('Revogar Access Token', () => revogar('access_token'))} disabled={carregando}>
                  <Trash2 height={16} width={16} /> Revogar Access Token
                </button>
              </div>
            </div>

            {/* Grupo: Logout */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 14, textTransform: 'uppercase' }}>
                Logout
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={logoutLocal}>
                  <Lock height={16} width={16} /> Logout Local (mantém SSO)
                </button>
                <button className="btn btn-danger" style={{ justifyContent: 'flex-start' }} onClick={logout}>
                  <DoorClosed height={16} width={16} /> Logout SSO (encerra no Keycloak)
                </button>
              </div>
            </div>

            {/* Endpoints descobertos */}
            {endpoints && (
              <div className="card">
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 12, textTransform: 'uppercase' }}>
                  🌐 Endpoints OIDC
                </div>
                <a href={endpoints.discoveryUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', fontSize: 11, color: 'var(--accent)', marginBottom: 12, wordBreak: 'break-all' }}>
                  ⬡ .well-known/openid-configuration ↗
                </a>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(endpoints.endpoints).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
                      <a href={k === 'jwks' ? v : undefined} target="_blank" rel="noopener noreferrer"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                        {v}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// ── App principal ──────────────────────────────────────────
export default function App() {
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(true)
  // tick força re-render a cada segundo para countdown atualizar
  const [tick, setTick] = useState(0)

  const carregarSessao = useCallback(async () => {
    try {
      const { data } = await buscarSessao()
      setSessao(data.autenticado ? data : null)
    } catch {
      setSessao(null)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarSessao()
  }, [carregarSessao])

  // Atualiza countdown a cada segundo (re-calcula expiresIn do JWT localmente)
  useEffect(() => {
    if (!sessao) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [sessao])

  // Recalcula expiresIn localmente a partir do payload.exp do token
  const sessaoAtualizada = sessao ? (() => {
    const now = Math.floor(Date.now() / 1000)
    const recalc = (token) => {
      if (!token?.payload?.exp) return token
      return { ...token, expiresIn: token.payload.exp - now }
    }
    return {
      ...sessao,
      accessToken: recalc(sessao.accessToken),
      idToken: recalc(sessao.idToken),
      sessao: {
        ...sessao.sessao,
        expiresIn: sessao.accessToken?.payload?.exp
          ? sessao.accessToken.payload.exp - now
          : sessao.sessao?.expiresIn,
      },
    }
  })() : null

  if (carregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <span style={{ color: 'var(--text-muted)' }}>Verificando sessão...</span>
      </div>
    )
  }

  if (!sessaoAtualizada) return <TelaLogin />

  return <Dashboard sessao={sessaoAtualizada} onAtualizar={carregarSessao} />
}
