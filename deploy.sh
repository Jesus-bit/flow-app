#!/bin/bash
set -euo pipefail

# ══════════════════════════════════════════════════════════════════════════════
#  deploy.sh — Deploy automatizado de Flow App en Raspberry Pi
#  Repo: https://github.com/Jesus-bit/flow-app
#  Usuario Pi: jesus-bit
#  Uso: sudo bash deploy.sh
# ══════════════════════════════════════════════════════════════════════════════

# ── Colores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Variables globales ────────────────────────────────────────────────────────
REPO_URL="https://github.com/Jesus-bit/flow-app"
PI_USER="${SUDO_USER:-jesus-bit}"
APP_DIR="/home/${PI_USER}/app"
USB_MOUNT="/mnt/usb"
DATA_DIR="${USB_MOUNT}/data"
LOG_FILE="/var/log/app-deploy.log"
API_SECRET=""
TAILSCALE_IP=""

# ── Funciones de logging ──────────────────────────────────────────────────────
log()   { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"; exit 1; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"; }
info()  { echo -e "${CYAN}[INFO]${NC} $1" | tee -a "$LOG_FILE"; }
ask()   { echo -e "${BLUE}[?]${NC} $1"; }
step()  { echo -e "\n${BOLD}${BLUE}━━━ $1 ━━━${NC}\n" | tee -a "$LOG_FILE"; }

# ── Verificaciones iniciales ──────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && { echo -e "${RED}[ERROR]${NC} Ejecuta con: sudo bash deploy.sh"; exit 1; }
[[ -z "$PI_USER" ]] && error "No se puede determinar el usuario. Ejecuta: sudo bash deploy.sh"

mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# ══════════════════════════════════════════════════════════════════════════════
#  CONFIRMACIÓN INICIAL
# ══════════════════════════════════════════════════════════════════════════════
clear
echo -e "${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║       🚀  DEPLOY AUTOMATIZADO — FLOW APP             ║"
echo "║          Raspberry Pi Setup Script                   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  Repositorio : ${CYAN}${REPO_URL}${NC}"
echo -e "  Usuario     : ${CYAN}${PI_USER}${NC}"
echo -e "  App dir     : ${CYAN}${APP_DIR}${NC}"
echo -e "  Datos USB   : ${CYAN}${DATA_DIR}${NC}"
echo -e "  Log         : ${CYAN}${LOG_FILE}${NC}"
echo ""
ask "¿Continuar con el deploy? [s/N]"
read -r CONFIRM
[[ "${CONFIRM,,}" != "s" && "${CONFIRM,,}" != "si" && "${CONFIRM,,}" != "y" && "${CONFIRM,,}" != "yes" ]] && {
    echo "Deploy cancelado."; exit 0
}

log "=== INICIO DE DEPLOY $(date) ==="

# ══════════════════════════════════════════════════════════════════════════════
#  FASE 1: SISTEMA BASE
# ══════════════════════════════════════════════════════════════════════════════
phase1_system() {
    step "FASE 1: Sistema base"

    # Detectar modelo de Pi y RAM
    if [[ -f /proc/device-tree/model ]]; then
        PI_MODEL=$(tr -d '\0' < /proc/device-tree/model)
        log "Modelo detectado: ${PI_MODEL}"
    else
        warn "No se pudo detectar modelo de Raspberry Pi"
    fi

    TOTAL_RAM=$(awk '/MemTotal/ {printf "%.0f", $2/1024}' /proc/meminfo)
    log "RAM disponible: ${TOTAL_RAM} MB"

    # Actualizar sistema
    log "Actualizando lista de paquetes..."
    apt-get update -qq 2>&1 | tee -a "$LOG_FILE"

    log "Actualizando paquetes del sistema..."
    DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq 2>&1 | tee -a "$LOG_FILE"

    # Instalar dependencias base
    log "Instalando dependencias base..."
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
        curl git build-essential python3 make g++ \
        ca-certificates gnupg lsb-release \
        2>&1 | tee -a "$LOG_FILE"
    log "✓ Dependencias base instaladas"

    # Node.js 20 LTS via NodeSource
    if command -v node &>/dev/null && [[ "$(node --version | cut -d. -f1 | tr -d 'v')" -ge 20 ]]; then
        log "✓ Node.js $(node --version) ya instalado, saltando..."
    else
        log "Instalando Node.js 20 LTS via NodeSource..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>&1 | tee -a "$LOG_FILE"
        apt-get install -y -qq nodejs 2>&1 | tee -a "$LOG_FILE"
        log "✓ Node.js $(node --version) instalado"
    fi

    # Docker
    if command -v docker &>/dev/null; then
        log "✓ Docker $(docker --version | awk '{print $3}' | tr -d ',') ya instalado, saltando..."
    else
        log "Instalando Docker..."
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/debian/gpg \
            | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg

        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/debian \
$(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
            > /etc/apt/sources.list.d/docker.list

        apt-get update -qq 2>&1 | tee -a "$LOG_FILE"
        DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
            docker-ce docker-ce-cli containerd.io \
            docker-buildx-plugin docker-compose-plugin \
            2>&1 | tee -a "$LOG_FILE"
        log "✓ Docker $(docker --version | awk '{print $3}' | tr -d ',') instalado"
    fi

    # Docker Compose (plugin)
    if docker compose version &>/dev/null; then
        log "✓ Docker Compose $(docker compose version --short) disponible"
    else
        error "Docker Compose plugin no disponible después de la instalación"
    fi

    # Agregar usuario al grupo docker
    if id -nG "$PI_USER" | grep -qw docker; then
        log "✓ Usuario '${PI_USER}' ya está en el grupo docker"
    else
        usermod -aG docker "$PI_USER"
        log "✓ Usuario '${PI_USER}' agregado al grupo docker (requiere re-login para efecto completo)"
    fi

    # systemd: habilitar Docker al boot
    systemctl enable docker 2>&1 | tee -a "$LOG_FILE" || true
    systemctl start docker 2>&1 | tee -a "$LOG_FILE" || true

    # Resumen de versiones
    log "=== Versiones instaladas ==="
    log "  Node.js : $(node --version)"
    log "  npm     : $(npm --version)"
    log "  Docker  : $(docker --version | awk '{print $3}' | tr -d ',')"
    log "  Compose : $(docker compose version --short)"
    log "  Git     : $(git --version | awk '{print $3}')"
    log "✓ Fase 1 completada"
}

# ══════════════════════════════════════════════════════════════════════════════
#  FASE 2: USB/SSD EXTERNO
# ══════════════════════════════════════════════════════════════════════════════
phase2_usb() {
    step "FASE 2: USB / SSD externo"

    log "Discos disponibles:"
    lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT | tee -a "$LOG_FILE"
    echo ""

    ask "¿Cuál es el dispositivo USB/SSD? (ej: /dev/sda1, o ENTER para usar /mnt/usb en tarjeta SD)"
    read -r USB_DEVICE

    if [[ -z "$USB_DEVICE" ]]; then
        warn "No se especificó dispositivo USB. Los datos irán en la tarjeta SD (${DATA_DIR})."
        mkdir -p "${DATA_DIR}" "${DATA_DIR}/backups"
        chown -R 1000:1000 "${DATA_DIR}"
        log "✓ Directorio de datos creado en SD card: ${DATA_DIR}"
        return
    fi

    [[ ! -b "$USB_DEVICE" ]] && error "Dispositivo '${USB_DEVICE}' no encontrado. Verifica con lsblk."

    # Formatear
    ask "¿Formatear ${USB_DEVICE} como ext4? ⚠️  BORRARÁ TODO el contenido [s/N]"
    read -r FORMAT_CONFIRM
    if [[ "${FORMAT_CONFIRM,,}" == "s" || "${FORMAT_CONFIRM,,}" == "si" || "${FORMAT_CONFIRM,,}" == "y" ]]; then
        log "Formateando ${USB_DEVICE} como ext4..."
        # Desmontar si está montado
        umount "$USB_DEVICE" 2>/dev/null || true
        mkfs.ext4 -L appdata -F "$USB_DEVICE" 2>&1 | tee -a "$LOG_FILE"
        log "✓ Dispositivo formateado"
    else
        log "Saltando formateo — usando filesystem existente"
    fi

    # Montar
    mkdir -p "${USB_MOUNT}"

    if mountpoint -q "${USB_MOUNT}"; then
        log "✓ ${USB_MOUNT} ya montado, saltando..."
    else
        mount "$USB_DEVICE" "${USB_MOUNT}" 2>&1 | tee -a "$LOG_FILE"
        log "✓ Dispositivo montado en ${USB_MOUNT}"
    fi

    # fstab — agregar solo si no existe ya
    USB_UUID=$(blkid -s UUID -o value "$USB_DEVICE")
    if [[ -z "$USB_UUID" ]]; then
        error "No se pudo obtener UUID de ${USB_DEVICE}"
    fi
    log "UUID del dispositivo: ${USB_UUID}"

    if grep -q "$USB_UUID" /etc/fstab; then
        log "✓ Entrada de fstab ya existe para ${USB_UUID}, saltando..."
    else
        echo "UUID=${USB_UUID}  ${USB_MOUNT}  ext4  defaults,noatime,nofail  0  2" >> /etc/fstab
        log "✓ Entrada agregada a /etc/fstab"
    fi

    # Crear directorios de datos
    mkdir -p "${DATA_DIR}" "${DATA_DIR}/backups"
    chown -R 1000:1000 "${DATA_DIR}"
    chmod 755 "${DATA_DIR}"

    # Verificar escritura
    TEST_FILE="${DATA_DIR}/.write_test_$$"
    touch "$TEST_FILE" && rm "$TEST_FILE"
    log "✓ Escritura en ${DATA_DIR} verificada"
    log "✓ Fase 2 completada"
}

# ══════════════════════════════════════════════════════════════════════════════
#  FASE 3: CLONAR APLICACIÓN
# ══════════════════════════════════════════════════════════════════════════════
phase3_clone() {
    step "FASE 3: Clonar aplicación"

    if [[ -d "${APP_DIR}/.git" ]]; then
        log "Repositorio ya existe. Haciendo git pull..."
        sudo -u "$PI_USER" git -C "$APP_DIR" pull origin main 2>&1 | tee -a "$LOG_FILE"
        log "✓ Repositorio actualizado"
    else
        log "Clonando ${REPO_URL} en ${APP_DIR}..."
        sudo -u "$PI_USER" git clone "$REPO_URL" "$APP_DIR" 2>&1 | tee -a "$LOG_FILE"
        log "✓ Repositorio clonado"
    fi

    # Generar API_SECRET
    API_SECRET=$(openssl rand -hex 32)
    log "✓ API_SECRET generado"

    # Crear .env
    ENV_FILE="${APP_DIR}/.env"
    cat > "$ENV_FILE" <<EOF
API_SECRET=${API_SECRET}
DATABASE_PATH=/data/app-state.db
NODE_ENV=production
EOF
    chown "${PI_USER}:${PI_USER}" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    log "✓ Archivo .env creado en ${ENV_FILE}"

    # Guardar el token en archivo de respaldo
    SECRET_FILE="/home/${PI_USER}/api-secret.txt"
    cat > "$SECRET_FILE" <<EOF
Flow App — API Secret
Generado: $(date)
━━━━━━━━━━━━━━━━━━━━━━━━━━
API_SECRET=${API_SECRET}
━━━━━━━━━━━━━━━━━━━━━━━━━━
URL de login: http://localhost:3000/login
EOF
    chown "${PI_USER}:${PI_USER}" "$SECRET_FILE"
    chmod 600 "$SECRET_FILE"

    echo ""
    echo -e "${BOLD}${YELLOW}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${YELLOW}║   ⚠️   GUARDA ESTE TOKEN — NO LO PIERDAS         ║${NC}"
    echo -e "${BOLD}${YELLOW}╠══════════════════════════════════════════════════╣${NC}"
    echo -e "${BOLD}${YELLOW}║  API_SECRET: ${API_SECRET}  ║${NC}"
    echo -e "${BOLD}${YELLOW}╠══════════════════════════════════════════════════╣${NC}"
    echo -e "${BOLD}${YELLOW}║  Guardado en: ${SECRET_FILE}  ║${NC}"
    echo -e "${BOLD}${YELLOW}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    log "API_SECRET guardado en ${SECRET_FILE}"
    log "✓ Fase 3 completada"
}

# ══════════════════════════════════════════════════════════════════════════════
#  FASE 4: BUILD DOCKER
# ══════════════════════════════════════════════════════════════════════════════
phase4_docker() {
    step "FASE 4: Build Docker"

    TOTAL_RAM=$(awk '/MemTotal/ {printf "%.0f", $2/1024}' /proc/meminfo)

    # Crear swap si hay poca RAM
    if [[ $TOTAL_RAM -lt 2048 ]]; then
        warn "RAM disponible: ${TOTAL_RAM} MB (< 2GB). Creando swap de 2GB para el build..."

        if [[ ! -f /swapfile ]] || [[ $(stat -c%s /swapfile) -lt 2000000000 ]]; then
            swapoff /swapfile 2>/dev/null || true
            rm -f /swapfile
            fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 2>&1 | tee -a "$LOG_FILE"
            chmod 600 /swapfile
            mkswap /swapfile 2>&1 | tee -a "$LOG_FILE"
            swapon /swapfile 2>&1 | tee -a "$LOG_FILE"

            # Persistir en fstab
            if ! grep -q '/swapfile' /etc/fstab; then
                echo '/swapfile  none  swap  sw  0  0' >> /etc/fstab
            fi
            log "✓ Swap de 2GB activado"
        else
            swapon /swapfile 2>/dev/null || true
            log "✓ Swap existente activado"
        fi
    else
        log "✓ RAM suficiente (${TOTAL_RAM} MB), no se necesita swap extra"
    fi

    # Actualizar docker-compose.yml para apuntar a DATA_DIR correcto
    # El compose usa /mnt/usb/data:/data — verificamos que el directorio exista
    [[ ! -d "${DATA_DIR}" ]] && mkdir -p "${DATA_DIR}" && chown -R 1000:1000 "${DATA_DIR}"

    log "Construyendo imagen Docker (puede tardar varios minutos en Pi)..."
    cd "$APP_DIR"

    if ! docker compose --env-file .env build 2>&1 | tee -a "$LOG_FILE"; then
        warn "Build falló. Últimas 30 líneas del log:"
        tail -30 "$LOG_FILE"
        echo ""
        warn "Sugerencias:"
        warn "  - Verifica la conexión a internet"
        warn "  - Prueba: docker system prune -f && sudo bash deploy.sh"
        warn "  - Si hay error de memoria: reinicia la Pi y vuelve a ejecutar"
        error "Docker build falló"
    fi
    log "✓ Imagen construida"

    log "Iniciando contenedor..."
    docker compose --env-file .env up -d 2>&1 | tee -a "$LOG_FILE"

    log "Esperando 20 segundos para que la app arranque..."
    sleep 20

    # Verificar que el contenedor esté corriendo
    CONTAINER_STATUS=$(docker compose ps --format json 2>/dev/null | python3 -c "import sys,json; data=json.load(sys.stdin); print(data[0]['State'] if isinstance(data,list) else data['State'])" 2>/dev/null || docker compose ps | grep -c "Up" || echo "0")

    if docker compose ps | grep -q "Up\|running"; then
        log "✓ Contenedor corriendo"
    else
        warn "El contenedor no parece estar activo. Estado actual:"
        docker compose ps | tee -a "$LOG_FILE"
        warn "Logs del contenedor:"
        docker compose logs --tail=30 | tee -a "$LOG_FILE"
        error "El contenedor no arrancó correctamente"
    fi

    # Verificar health endpoint
    log "Verificando endpoint de salud..."
    HEALTH_RETRY=0
    HEALTH_OK=false
    while [[ $HEALTH_RETRY -lt 5 ]]; do
        if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
            HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
            log "✓ Health OK: ${HEALTH_RESPONSE}"
            HEALTH_OK=true
            break
        fi
        HEALTH_RETRY=$((HEALTH_RETRY + 1))
        warn "Intento ${HEALTH_RETRY}/5 fallido, esperando 5s..."
        sleep 5
    done

    [[ "$HEALTH_OK" == "false" ]] && {
        warn "Health endpoint no responde. La app puede tardar más en arrancar."
        warn "Verifica con: curl http://localhost:3000/api/health"
    }

    # Verificar SQLite
    sleep 5
    if [[ -f "${DATA_DIR}/app-state.db" ]]; then
        DB_SIZE=$(du -sh "${DATA_DIR}/app-state.db" | cut -f1)
        log "✓ SQLite creado en ${DATA_DIR}/app-state.db (${DB_SIZE})"
    else
        warn "SQLite aún no creado (se crea en el primer request a /api/state)"
    fi

    log "✓ Fase 4 completada"
}

# ══════════════════════════════════════════════════════════════════════════════
#  FASE 5: TAILSCALE
# ══════════════════════════════════════════════════════════════════════════════
phase5_tailscale() {
    step "FASE 5: Tailscale VPN"

    # Instalar Tailscale
    if command -v tailscale &>/dev/null; then
        log "✓ Tailscale $(tailscale version | head -1) ya instalado"
    else
        log "Instalando Tailscale..."
        curl -fsSL https://tailscale.com/install.sh | sh 2>&1 | tee -a "$LOG_FILE"
        log "✓ Tailscale instalado"
    fi

    # Verificar si ya está autenticado
    if tailscale status &>/dev/null 2>&1 && tailscale status | grep -q "^[0-9]"; then
        TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "")
        if [[ -n "$TAILSCALE_IP" ]]; then
            log "✓ Tailscale ya conectado. IP: ${TAILSCALE_IP}"
            return
        fi
    fi

    # Iniciar autenticación
    log "Iniciando Tailscale..."
    systemctl enable --now tailscaled 2>&1 | tee -a "$LOG_FILE" || true
    sleep 2

    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  Abre la URL que aparece abajo en tu navegador para${NC}"
    echo -e "${BOLD}  autenticar esta Raspberry Pi en tu cuenta Tailscale${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    tailscale up --accept-routes 2>&1 | tee -a "$LOG_FILE" &
    TAILSCALE_PID=$!

    # Esperar autenticación (máx 3 minutos)
    WAIT=0
    while [[ $WAIT -lt 36 ]]; do
        sleep 5
        WAIT=$((WAIT + 1))

        if tailscale status &>/dev/null 2>&1; then
            TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "")
            if [[ -n "$TAILSCALE_IP" ]]; then
                log "✓ Tailscale conectado! IP: ${TAILSCALE_IP}"
                kill $TAILSCALE_PID 2>/dev/null || true
                return
            fi
        fi
        info "Esperando autenticación de Tailscale... (${WAIT}/36 × 5s)"
    done

    kill $TAILSCALE_PID 2>/dev/null || true
    warn "Tiempo de espera agotado. Autentica manualmente con: tailscale up"
    warn "Luego obtén tu IP con: tailscale ip -4"
    TAILSCALE_IP="<pendiente-de-autenticar>"
    log "✓ Fase 5 completada (autenticación pendiente)"
}

# ══════════════════════════════════════════════════════════════════════════════
#  FASE 6: UTILIDADES POST-DEPLOY
# ══════════════════════════════════════════════════════════════════════════════
phase6_utils() {
    step "FASE 6: Utilidades post-deploy"

    # ── update-app.sh ──────────────────────────────────────────────────────
    UPDATE_SCRIPT="/home/${PI_USER}/update-app.sh"
    cat > "$UPDATE_SCRIPT" <<EOF
#!/bin/bash
set -e
echo "[$(date '+%H:%M:%S')] Actualizando Flow App..."
cd ${APP_DIR}
git pull origin main
docker compose --env-file .env build
docker compose --env-file .env up -d
echo "[$(date '+%H:%M:%S')] ✓ App actualizada"
curl -s http://localhost:3000/api/health && echo ""
EOF
    chmod +x "$UPDATE_SCRIPT"
    chown "${PI_USER}:${PI_USER}" "$UPDATE_SCRIPT"
    log "✓ Script creado: ${UPDATE_SCRIPT}"

    # ── backup-db.sh ───────────────────────────────────────────────────────
    BACKUP_SCRIPT="/home/${PI_USER}/backup-db.sh"
    cat > "$BACKUP_SCRIPT" <<EOF
#!/bin/bash
set -e
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${DATA_DIR}/backups"
DB_FILE="${DATA_DIR}/app-state.db"

mkdir -p "\$BACKUP_DIR"

if [[ ! -f "\$DB_FILE" ]]; then
    echo "Base de datos no encontrada en \$DB_FILE"
    exit 1
fi

cp "\$DB_FILE" "\${BACKUP_DIR}/app-state_\${TIMESTAMP}.db"
echo "[$(date '+%H:%M:%S')] ✓ Backup creado: app-state_\${TIMESTAMP}.db"

# Eliminar backups de más de 30 días
find "\$BACKUP_DIR" -name "*.db" -mtime +30 -delete
TOTAL=\$(ls "\$BACKUP_DIR"/*.db 2>/dev/null | wc -l)
echo "[$(date '+%H:%M:%S')] Backups guardados: \$TOTAL"
EOF
    chmod +x "$BACKUP_SCRIPT"
    chown "${PI_USER}:${PI_USER}" "$BACKUP_SCRIPT"
    log "✓ Script creado: ${BACKUP_SCRIPT}"

    # ── Directorio de backups ──────────────────────────────────────────────
    mkdir -p "${DATA_DIR}/backups"
    chown -R 1000:1000 "${DATA_DIR}/backups"
    log "✓ Directorio de backups creado: ${DATA_DIR}/backups"

    # ── Cron: backup diario a las 2 AM ────────────────────────────────────
    CRON_BACKUP="0 2 * * * ${BACKUP_SCRIPT} >> /var/log/flow-backup.log 2>&1"
    (crontab -u "$PI_USER" -l 2>/dev/null | grep -v "backup-db.sh" ; echo "$CRON_BACKUP") \
        | crontab -u "$PI_USER" -
    log "✓ Cron de backup diario (2 AM) configurado"

    # ── Cron: auto-update opcional ─────────────────────────────────────────
    ask "¿Configurar auto-update diario a las 3 AM? [s/N]"
    read -r AUTO_UPDATE
    if [[ "${AUTO_UPDATE,,}" == "s" || "${AUTO_UPDATE,,}" == "si" || "${AUTO_UPDATE,,}" == "y" ]]; then
        CRON_UPDATE="0 3 * * * ${UPDATE_SCRIPT} >> /var/log/flow-update.log 2>&1"
        (crontab -u "$PI_USER" -l 2>/dev/null | grep -v "update-app.sh" ; echo "$CRON_UPDATE") \
            | crontab -u "$PI_USER" -
        log "✓ Auto-update diario (3 AM) configurado"
    else
        log "Auto-update no configurado"
    fi

    # Verificar crontab
    log "Crontab actual de ${PI_USER}:"
    crontab -u "$PI_USER" -l 2>/dev/null | tee -a "$LOG_FILE" || true

    log "✓ Fase 6 completada"
}

# ══════════════════════════════════════════════════════════════════════════════
#  FASE 7: RESUMEN FINAL
# ══════════════════════════════════════════════════════════════════════════════
phase7_summary() {
    step "FASE 7: Resumen final"

    LOCAL_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "127.0.0.1")
    TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "<no conectado>")
    SECRET_SHORT="${API_SECRET:0:16}..."
    DEPLOY_TIME=$(date)

    # Guardar resumen en log
    log "=== DEPLOY COMPLETADO: ${DEPLOY_TIME} ==="
    log "IP local: ${LOCAL_IP}"
    log "IP Tailscale: ${TAILSCALE_IP}"

    echo ""
    echo -e "${BOLD}${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║           ✅  DEPLOY COMPLETADO CON ÉXITO                   ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║                                                              ║"
    printf "║  🌐 URL Local     : %-40s║\n" "http://${LOCAL_IP}:3000"
    printf "║  🔒 URL Tailscale : %-40s║\n" "http://${TAILSCALE_IP}:3000"
    printf "║  🔑 API Secret    : %-40s║\n" "${SECRET_SHORT}"
    printf "║  💾 DB Location   : %-40s║\n" "${DATA_DIR}/app-state.db"
    printf "║  📋 Log deploy    : %-40s║\n" "${LOG_FILE}"
    echo "║                                                              ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║  📱 PRÓXIMOS PASOS EN TU CELULAR:                           ║"
    echo "║                                                              ║"
    echo "║  1. Instala Tailscale (App Store / Play Store)              ║"
    echo "║  2. Inicia sesión con tu misma cuenta de Tailscale          ║"
    printf "║  3. Abre: %-50s║\n" "http://${TAILSCALE_IP}:3000/login"
    echo "║  4. Ingresa tu API_SECRET como token de acceso              ║"
    echo "║  5. Menú del navegador → 'Agregar a pantalla de inicio'     ║"
    echo "║                                                              ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║  ⚙️  COMANDOS ÚTILES:                                        ║"
    echo "║                                                              ║"
    echo "║  ~/update-app.sh        - Actualizar la aplicación          ║"
    echo "║  ~/backup-db.sh         - Backup manual de la DB            ║"
    echo "║  docker compose logs -f - Ver logs en tiempo real           ║"
    echo "║  tailscale status       - Estado de la VPN                  ║"
    printf "║  cat %-55s║\n" "~/api-secret.txt  - Ver tu API Secret"
    echo "║                                                              ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║  ℹ️  Tu API Secret completo está guardado en:               ║"
    printf "║     %-56s║\n" "/home/${PI_USER}/api-secret.txt"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    # Guardar resumen en archivo
    SUMMARY_FILE="/home/${PI_USER}/deploy-summary.txt"
    cat > "$SUMMARY_FILE" <<EOF
Flow App — Resumen de Deploy
Fecha: ${DEPLOY_TIME}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URL Local    : http://${LOCAL_IP}:3000
URL Tailscale: http://${TAILSCALE_IP}:3000
API Secret   : ${API_SECRET}
DB           : ${DATA_DIR}/app-state.db
Log          : ${LOG_FILE}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Para actualizar: ~/update-app.sh
Para backup:     ~/backup-db.sh
EOF
    chown "${PI_USER}:${PI_USER}" "$SUMMARY_FILE"
    log "✓ Resumen guardado en ${SUMMARY_FILE}"
}

# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════
main() {
    log "Iniciando deploy de Flow App en Raspberry Pi..."
    log "Usuario: ${PI_USER} | App dir: ${APP_DIR}"

    phase1_system
    phase2_usb
    phase3_clone
    phase4_docker
    phase5_tailscale
    phase6_utils
    phase7_summary

    log "=== DEPLOY FINALIZADO EXITOSAMENTE $(date) ==="
}

main "$@"
