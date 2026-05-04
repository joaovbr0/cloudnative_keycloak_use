import { useState } from 'react'
import {RefreshCcw,IdCard ,UserKey, User,Search, Lock, Check,Copy} from 'lucide-react';

function ExpiracaoContagem({ expiresIn }) {
  if (expiresIn === null || expiresIn === undefined) return null
  const cor = expiresIn > 60 ? 'badge-green' : expiresIn > 0 ? 'badge-red' : 'badge-red'
  const texto = expiresIn <= 0 ? 'Expirado' : `Expira em ${expiresIn}s`
  return <span className={`badge ${cor}`}>{texto}</span>
}

function ClaimRow({ chave, valor }) {
  const renderValor = () => {
    if (Array.isArray(valor)) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {valor.map((v, i) => <span key={i} className="badge badge-blue">{v}</span>)}
        </div>
      )
    }
    if (typeof valor === 'object' && valor !== null) {
      return <pre style={{background: 'var(--bg-secondary)', margin: 0, padding: '8px', fontSize: 11 }}>{JSON.stringify(valor, null, 2)}</pre>
    }
    if (chave === 'exp' || chave === 'iat' || chave === 'auth_time') {
      const data = new Date(valor * 1000)
      return (
        <span style={{ color: 'var(--text-primary)' }}>
          {data.toLocaleString('pt-BR')}
          <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 11 }}>({valor})</span>
        </span>
      )
    }
    return <span>{String(valor)}</span>
  }

  return (
    <div className="claim-row">
      <span className="claim-key">{chave}</span>
      <span className="claim-value">{renderValor()}</span>
    </div>
  )
}

export default function TokenCard({ titulo, token, tipo, cor = 'blue' }) {
  const [aba, setAba] = useState('claims')
  const [copiado, setCopiado] = useState(false)

  if (!token) {
    return (
      <div className="card" style={{ opacity: 0.5, textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}><Lock /></div>
        <div style={{ color: 'var(--text-muted)' }}>Não disponível</div>
      </div>
    )
  }

  const copiar = async () => {
    await navigator.clipboard.writeText(token.raw || '')
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const claimsImportantes = ['sub', 'name', 'email', 'preferred_username', 'iss', 'aud', 'exp', 'iat', 'scope', 'realm_access', 'resource_access', 'acr', 'session_state']

  const payload = token.payload || {}
  const claimsPrioritarias = {}
  const claimsExtras = {}
  Object.entries(payload).forEach(([k, v]) => {
    if (claimsImportantes.includes(k)) claimsPrioritarias[k] = v
    else claimsExtras[k] = v
  })

  return (
    <div className="card fade-in" >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>{tipo === 'access' ? <UserKey height={16} width={16} /> : tipo === 'id' ? <IdCard height={16} width={16} /> : <RefreshCcw  height={16} width={16}/>}</span>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{titulo}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {token.header?.alg && <span className="badge badge-gray">{token.header.alg}</span>}
            {token.expiresIn !== undefined && <ExpiracaoContagem expiresIn={token.expiresIn} />}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={copiar} style={{ fontSize: 12 }}>
          {copiado ? (<><Check height={16} width={16}/> Copiado</>) : (<><Copy height={16} width={16}/> Copiar JWT</>)}
        </button>
      </div>

      {token.raw && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>JWT Bruto</div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '10px 12px',
              wordBreak: 'break-all',
              color: 'var(--text-muted)',
              maxHeight: 64,
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
            }}
            onClick={copiar}
            title="Clique para copiar"
          >
            <span style={{ color: '#FF6B6B' }}>{token.raw?.split('.')[0]}</span>
            <span style={{ color: 'var(--text-dim)' }}>.</span>
            <span style={{ color: '#00B4E6' }}>{token.raw?.split('.')[1]}</span>
            <span style={{ color: 'var(--text-dim)' }}>.</span>
            <span style={{ color: '#00D2B4' }}>{token.raw?.split('.')[2]}</span>
          </div>
        </div>
      )}

      {/* Abas */}
      {token.payload && (
        <>
          <div className="tabs">
            <button className={`tab ${aba === 'claims' ? 'ativo' : ''}`} onClick={() => setAba('claims')}>Claims</button>
            <button className={`tab ${aba === 'header' ? 'ativo' : ''}`} onClick={() => setAba('header')}>Header</button>
            <button className={`tab ${aba === 'raw' ? 'ativo' : ''}`} onClick={() => setAba('raw')}>JSON Bruto</button>
          </div>

          {aba === 'claims' && (
            <div>
              {Object.entries(claimsPrioritarias).map(([k, v]) => (
                <ClaimRow key={k} chave={k} valor={v} />
              ))}
              {Object.keys(claimsExtras).length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: '4px 0' }}>
                    + {Object.keys(claimsExtras).length} claims adicionais
                  </summary>
                  {Object.entries(claimsExtras).map(([k, v]) => (
                    <ClaimRow key={k} chave={k} valor={v} />
                  ))}
                </details>
              )}
            </div>
          )}

          {aba === 'header' && (
            <div>
              {Object.entries(token.header || {}).map(([k, v]) => (
                <ClaimRow key={k} chave={k} valor={v} />
              ))}
            </div>
          )}

          {aba === 'raw' && (
            <pre style={{ background: 'var(--bg-secondary)', margin: 0, padding: '8px', fontSize: 11 }}>
              {JSON.stringify(token.payload, null, 2)}
            </pre>
          )}
        </>
      )}

      {/* Nota para refresh token */}
      {token.nota && (
        <div style={{
          background: 'var(--warning-bg)',
          border: '1px solid rgba(255,184,48,0.3)',
          borderRadius: 8,
          padding: '12px 16px',
          color: 'var(--warning)',
          fontSize: 12,
          marginTop: 8,
        }}>
          ℹ️ {token.nota}
          {token.raw && (
            <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 10, wordBreak: 'break-all', color: 'var(--text-muted)' }}>
              {token.raw.substring(0, 80)}...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
