# =============================================================
# Dockerfile — Keycloak com tema cloudnative-theme embutido
# Uso: para deploy em produção / Kubernetes
#
# Build:  docker build -t cloudnative-keycloak ./keycloak
# Run:    docker run -p 8080:8080 \
#           -e KEYCLOAK_ADMIN=admin \
#           -e KEYCLOAK_ADMIN_PASSWORD=admin123 \
#           cloudnative-keycloak
# =============================================================

# ---- Stage 1: build otimizado ----
FROM quay.io/keycloak/keycloak:26.2 AS builder

WORKDIR /opt/keycloak

# Copia o tema customizado
COPY themes/cloudnative-theme /opt/keycloak/themes/cloudnative-theme

# Executa o build do Keycloak (gera artefato otimizado)
RUN /opt/keycloak/bin/kc.sh build

# ---- Stage 2: imagem final ----
FROM quay.io/keycloak/keycloak:26.2

# Copia o artefato otimizado do stage anterior
COPY --from=builder /opt/keycloak/ /opt/keycloak/

# Copia o realm para import automático na primeira inicialização
COPY realm-export.json /opt/keycloak/data/import/realm-export.json

ENV KC_HOSTNAME_STRICT=false
ENV KC_HTTP_ENABLED=true
ENV KC_HEALTH_ENABLED=true

EXPOSE 8080

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
# start (modo produção) — use start-dev apenas para desenvolvimento
CMD ["start", "--import-realm"]
