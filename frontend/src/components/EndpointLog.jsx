import { Check, X } from 'lucide-react'
import { useState } from 'react'

export default function EndpointLog({ resultado, carregando }) {
  const [expandido, setExpandido] = useState(true)

  if (carregando) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 20 }}>
        <div className="spinner" />
        <span style={{ color: 'var(--text-muted)' }}>Chamando Keycloak...</span>
      </div>
    )
  }

  if (!resultado) return null

  const { operacao, sucesso, dados, erro, timestamp } = resultado

  return (
    <div
      className="card fade-in"
      style={{ borderColor: sucesso ? 'rgba(0,210,180,0.3)' : 'rgba(255,77,109,0.3)' }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setExpandido(!expandido)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>{sucesso ? <Check   color='#00ff14' height={18} width={18} /> : <X color='#ff0622' height={18} width={18} />}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{operacao}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {new Date(timestamp).toLocaleTimeString('pt-BR')}
            </div>
          </div>
          <span className={`badge ${sucesso ? 'badge-green' : 'badge-red'}`}>
            {sucesso ? 'Sucesso' : 'Erro'}
          </span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{expandido ? '▲ Recolher' : '▼ Expandir'}</span>
      </div>

      {expandido && (
        <div style={{ marginTop: 16 }}>
          <div className="divider" />

          {/* Requisição */}
          {dados?.requisicao && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#FFFFFF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--accent)' }}>→</span> Requisição enviada ao Keycloak
              </div>
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: 8,
                padding: '12px 16px',
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  <span className="badge badge-blue">{dados.requisicao.metodo}</span>
                  <span style={{ color: 'var(--bg-primary)' }}>{dados.requisicao.url}</span>
                </div>
                {dados.requisicao.headers && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Headers:</div>
                    <pre style={{ margin: 0,background: 'var(--bg-secondary)' }}>{JSON.stringify(dados.requisicao.headers, null, 2)}</pre>
                  </div>
                )}
                {dados.requisicao.corpo && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Corpo:</div>
                    <pre style={{ margin: 0 ,background: 'var(--bg-secondary)'}}>{JSON.stringify(dados.requisicao.corpo, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resposta */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: sucesso ? 'var(--success)' : 'var(--danger)' }}>←</span> Resposta do Keycloak
            </div>
            <pre style={{background: 'var(--bg-secondary)'}}>{JSON.stringify(sucesso ? dados : erro, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
