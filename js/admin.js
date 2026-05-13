'use strict';

const API = 'https://script.google.com/macros/s/AKfycbwW2_UWpOS45F-3BbyVbUvtxIJ3b_OP_Pnl_cSgSwO-BXz9nSzqoTb8oxnh185za0M/exec'; // <--- URL DE LA WEB APP OPTIMIZADA
let datosSalas = [];
let datosMaquinas = [];
let datosUsuarios = [];
let datosHistorial = []; // Reutilizar datos ya cargados
let isCargando = false;
// Detectar base path (útil para GitHub Pages en subcarpetas)
let serverHost = window.location.href.substring(0, window.location.href.lastIndexOf('/'));

async function detectarServidor() {
  try {
    const res = await fetch('/api/info');
    const json = await res.json();
    if (json.ok && json.data.url) {
      serverHost = json.data.url;
      console.log("🔗 QR Host detectado:", serverHost);
    }
  } catch (e) {
    console.warn("⚠️ No se pudo obtener IP local del servidor, usando origin actual.");
  }
}

let rolActual = 'admin'; // Se actualiza al cargar la sesión

// ── Cargar rol del usuario desde sesión ──
async function cargarRolUsuario() {
  try {
    // Primero verificar si hay sesión de administrador
    const adminSessionStr = localStorage.getItem('sgi_admin_session');
    console.log('DEBUG - admin_session:', adminSessionStr);
    if (adminSessionStr) {
      const adminSession = JSON.parse(adminSessionStr);
      if (adminSession.type === 'superadmin') {
        rolActual = 'admin';
      } else if (adminSession.type) {
        rolActual = adminSession.type; // 'admin' o 'tecnico'
      } else if (adminSession.username || adminSession.nombre) {
        rolActual = 'admin';
      }
      console.log('DEBUG - Rol asignado desde admin_session:', rolActual);
      return;
    }

    // Si no hay sesión admin, verificar sesión de usuario normal
    const sessionStr = localStorage.getItem('sgi_user_session');
    console.log('DEBUG - user_session:', sessionStr);
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      rolActual = session.rol || 'usuario';
      console.log('DEBUG - Rol asignado desde user_session:', rolActual);
    }
  } catch (err) {
    console.error('Error al cargar rol:', err);
  }
}

// ── Obtener nombre del admin actual ──
function getNombreAdmin() {
  try {
    const s = JSON.parse(localStorage.getItem('sgi_admin_session') || '{}');
    return s.nombre || s.username || 'Administrador';
  } catch { return 'Administrador'; }
}


document.addEventListener('DOMContentLoaded', async () => {
  const adminSessionStr = localStorage.getItem('sgi_admin_session');
  const userSessionStr  = localStorage.getItem('sgi_user_session');
  detectarServidor(); // Cargar IP real para los QRs
  await cargarRolUsuario(); // Cargar rol del usuario

  // Si es usuario normal (no admin ni técnico), redirigir al portal
  if (rolActual === 'usuario') {
    window.location.href = 'seleccion.html';
    return;
  }

  // Prefer admin session; si no, permitir sesión de 'tecnico' (usuario) para entrar
  let sgiSession = null;
  if (adminSessionStr) {
    sgiSession = JSON.parse(adminSessionStr || '{}');
  } else if (userSessionStr && (rolActual === 'tecnico' || rolActual === 'admin')) {
    // Permitimos que técnicos accedan al panel; los permisos internos seguirán aplicándose
    try {
      sgiSession = JSON.parse(userSessionStr || '{}');
      sgiSession._isUserSession = true; // marca que viene de user_session
    } catch(e) { sgiSession = null; }
  } else {
    // No hay sesión adecuada: esperar a login admin
    return;
  }
  window.sgiAdminSession = sgiSession;

  try {
    isCargando = true;

    // Inyectar interfaz de forma segura
    const container = document.getElementById('dashboardContent');
    if (container) {
      container.innerHTML = DASHBOARD_HTML;
    }

    // Mostrar nombre y rol en sidebar footer
    const adminName = getNombreAdmin();
    const rolLabel = { superadmin: 'Administrador', admin: 'Administrador', tecnico: 'Técnico' }[rolActual] || 'Usuario';
    const footerVersion = container?.querySelector('.sidebar-footer div');
    if (footerVersion) {
      footerVersion.innerHTML = `👤 <strong>${adminName}</strong><br><span style="font-size:12px;opacity:1;color:var(--accent)">${rolLabel}</span>`;
    }

    // Ocultar solo usuarios para técnicos
    if (rolActual === 'tecnico') {
      const navUsuarios = document.getElementById('nav-usuarios');
      if (navUsuarios) navUsuarios.style.display = 'none';
    }

    // Ocultar controles sensibles para técnicos (solo admin puede verlos)
    if (rolActual !== 'admin') {
      ['btnBorrarMaquinaModal','btnNuevaMaquina','btnToggleEditarMaquina','btnGuardarMaquina','btnGestionarSalas'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
    }

    // Restaurar sección guardada al refrescar (si existe)
    const savedSection = localStorage.getItem('sgi_admin_section');
    if (savedSection && savedSection !== 'dashboard') {
      navigateTo(savedSection);
    }

    const grid = document.getElementById('gridMaquinas');
    if (grid) grid.innerHTML = skeletonMaquinas();
    const tbody = document.getElementById('dashboardUltimos');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)"><span class="spinner" style="display:inline-block;margin-right:8px"></span>Conectando con la base de datos...</td></tr>';

    // Cargar TODO en una sola llamada
    await cargarDatosBase();

    // Auto-sincronización cada 2 minutos
    setInterval(() => {
      recargarTodo();
    }, 120000);
  } catch (err) {
    console.error('Error durante la carga inicial:', err);
  } finally {
    isCargando = false;
  }
});

function skeletonMaquinas() {
  const card = `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:20px;animation:pulse 1.5s ease-in-out infinite">
    <div style="height:14px;background:var(--bg-secondary);border-radius:6px;width:60%;margin-bottom:12px"></div>
    <div style="height:10px;background:var(--bg-secondary);border-radius:6px;width:40%;margin-bottom:20px"></div>
    <div style="height:10px;background:var(--bg-secondary);border-radius:6px;width:80%;margin-bottom:8px"></div>
    <div style="height:10px;background:var(--bg-secondary);border-radius:6px;width:70%"></div>
  </div>`;
  const inner = Array(6).fill(card).join('');
  return `<div class="grid-maquinas-inner" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;display:grid">${inner}</div>`;
}

function skeletonTabla(cols = 5) {
  const row = `<tr>
    ${Array(cols).fill(`<td><div style="height:12px;background:var(--bg-secondary);border-radius:6px;width:80%;animation:pulse 1.5s ease-in-out infinite"></div></td>`).join('')}
  </tr>`;
  return Array(5).fill(row).join('');
}

async function cargarDatosBase() {
  console.time('Carga Inicial Bundled');
  // Una sola llamada para traerlo TODO
  const res = await apiFetch('/api/all-data');
  console.timeEnd('Carga Inicial Bundled');

  if (res.ok && res.data) {
    const d = res.data;
    datosSalas = d.salas || [];
    datosMaquinas = d.maquinas || [];
    datosUsuarios = d.usuarios || [];
    datosHistorial = d.historial || [];

    // Poblar dashboard con los datos ya recibidos
    actualizarVistaDashboard(d.dashboard, d.historial);
  }

  // Actualizar la vista actual ahora que los datos están listos
  renderActualSection();

  // Poblar selects de salas
  ['filtroSalaMaquinas', 'filtroSala', 'filtroSalaQR', 'nuevoMaquinaSala'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id !== 'nuevoMaquinaSala') {
      el.innerHTML = '<option value="">Todas las salas</option>';
    } else {
      el.innerHTML = '<option value="">Seleccione una sala...</option>';
    }
    datosSalas.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.nombre;
      el.appendChild(opt);
    });
  });

  // El filtro de operario ahora es un input de texto, no necesita población inicial

  // Actualizar badge alertas
  const alertas = datosMaquinas.filter(m =>
    m.estado_mantenimiento === 'vencido' || m.estado_mantenimiento === 'pendiente'
  ).length;
  const badge = document.getElementById('badge-alertas');
  if (badge) {
    if (alertas > 0) { badge.textContent = alertas; badge.style.display = 'inline'; }
    else badge.style.display = 'none';
  }

  // Badge máquinas total
  const maqBadge = document.getElementById('badge-maquinas');
  if (maqBadge) {
    maqBadge.textContent = datosMaquinas.length;
    maqBadge.style.display = datosMaquinas.length > 0 ? 'inline' : 'none';
  }

  // Badge incidencias pendientes (solo las sin resolver - rojas, no en seguimiento)
  const pendientesCount = datosHistorial.filter(r => r.tipo === 'Incidencia' && !r.resuelta && !r.en_seguimiento).length;
  const incBadge = document.getElementById('badge-incidencias');
  if (incBadge) {
    incBadge.textContent = pendientesCount;
    incBadge.style.display = pendientesCount > 0 ? 'inline-flex' : 'none';
  }
}

// ── Incidencias ─────────────────────────────────────────────────────────────
let filtroIncActual = 'todas';
let ordenIncActual = 'fecha-desc';

function cambiarOrdenInc(orden) {
  ordenIncActual = orden;
  renderIncidencias(filtroIncActual);
}

function toggleSeguimiento() {
  renderIncidencias('seguimiento');
}

function renderIncidencias(filtro = 'todas') {
  filtroIncActual = filtro;
  const grid = document.getElementById('gridTicketsIncidencias');
  const empty = document.getElementById('incidenciasEmpty');
  if (!grid) return;

  // Actualizar todos los botones
  ['todas', 'pendientes', 'resueltas'].forEach(f => {
    const btn = document.getElementById(`btn-inc-${f}`);
    if (btn) {
      btn.classList.toggle('active', f === filtro);
      btn.style.opacity = (f === 'resueltas' && filtro !== 'resueltas') ? '0.5' : '1';
    }
  });
  const btnSeg = document.getElementById('btn-inc-seguimiento');
  if (btnSeg) btnSeg.classList.toggle('active', filtro === 'seguimiento');

  let lista = datosHistorial.filter(r => r.tipo === 'Incidencia');

  // Cálculo de KPIs
  const totalPendientes = lista.filter(r => !r.resuelta && !r.en_seguimiento).length;
  const totalResueltas  = lista.filter(r => r.resuelta).length;
  const totalSeguimiento = lista.filter(r => !r.resuelta && r.en_seguimiento).length;

  if (document.getElementById('kpi-inc-pendientes')) document.getElementById('kpi-inc-pendientes').textContent = totalPendientes;
  if (document.getElementById('kpi-inc-resueltas'))  document.getElementById('kpi-inc-resueltas').textContent  = totalResueltas;
  if (document.getElementById('kpi-inc-seguimiento')) document.getElementById('kpi-inc-seguimiento').textContent = totalSeguimiento;

  if (filtro === 'resueltas') {
    lista = lista.filter(r => r.resuelta);
  } else if (filtro === 'pendientes') {
    lista = lista.filter(r => !r.resuelta && !r.en_seguimiento);
  } else if (filtro === 'seguimiento') {
    lista = lista.filter(r => !r.resuelta && r.en_seguimiento);
  } else {
    // 'todas' — activas sin resueltas
    lista = lista.filter(r => !r.resuelta);
  }

  // Ordenar según criterio seleccionado
  const ordenSelect = document.getElementById('select-inc-orden');
  if (ordenSelect) ordenSelect.value = ordenIncActual;
  if (ordenIncActual === 'fecha-desc') {
    lista.sort((a, b) => new Date(b.completado_en) - new Date(a.completado_en));
  } else if (ordenIncActual === 'fecha-asc') {
    lista.sort((a, b) => new Date(a.completado_en) - new Date(b.completado_en));
  } else if (ordenIncActual === 'tipo') {
    const prioridad = r => r.resuelta ? 2 : (r.en_seguimiento ? 1 : 0);
    lista.sort((a, b) => prioridad(a) - prioridad(b));
  } else if (ordenIncActual === 'maquina') {
    lista.sort((a, b) => (a.maquina || '').localeCompare(b.maquina || ''));
  }

  if (!lista.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = lista.map(r => {
    const resuelta = r.resuelta || false;
    const esSeguimiento = !resuelta && r.en_seguimiento;
    const statusClass = resuelta ? 'resuelto' : (esSeguimiento ? 'seguimiento' : 'urgente');
    const statusText = resuelta ? '✅ Finalizado' : (esSeguimiento ? '📝 En Seguimiento' : '🚨 Sin resolver');

    // Buscar estado actual de la máquina
    const maq = datosMaquinas.find(m => m.id === r.maquina_id);
    const maquinaEstado = maq ? maq.estado : 'activa';

    return `
      <div class="ticket-card ${statusClass} fade-in" onclick="verDetalleSesion('${r.id}')">
        <div class="ticket-header">
          <div style="display:flex; flex-direction:column; gap:2px">
            <div class="ticket-machine-name">${r.maquina}</div>
            <div style="font-size:10px; color:var(--text-muted)">Máquina: <span class="estado-badge ${maquinaEstado === 'activa' ? 'ok' : (maquinaEstado === 'inactiva' ? 'gris' : 'naranja')}" style="font-size:8px; padding:0 4px">${maquinaEstado || 'activa'}</span></div>
          </div>
          <span class="estado-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="ticket-body">
          <div class="ticket-sala">📍 ${r.sala}</div>
          <div class="ticket-desc">${truncate(r.observaciones || 'Sin descripción detallada', 120)}</div>
          <div class="ticket-date">🗓️ Reportado: ${formatFechaHora(r.completado_en)}</div>
          <div class="ticket-date">👷 Operario: ${r.operario}</div>
          
          ${esSeguimiento ? `
            <div class="ticket-last-note">
              Última nota: Revisión técnica en curso...
            </div>
          ` : ''}
        </div>
        <div class="ticket-footer">
          <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); verDetalleSesion('${r.id}')">Gestionar</button>
          ${!resuelta ? `
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); toggleResolucionIncidencia('${r.id}', true)">Cerrar Ticket</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ── Navegación ────────────────────────────────────────────────────────────────
const sectionTitles = {
  dashboard: ['Panel General', 'Resumen del sistema'],
  maquinas: ['Máquinas', 'Estado y gestión de todas las máquinas'],
  incidencias: ['Centro de Incidencias', 'Gestión de fallos técnicos y reparaciones'],
  historial: ['Historial', 'Registro de mantenimientos e incidencias'],
  qrcodes: ['Códigos QR', 'QR individuales para el operario móvil'],
  usuarios: ['Usuarios del Sistema', 'Gestión de accesos y privilegios de usuario']
};

function navigateTo(section, machineId = null, incFilter = null) {
  // Verificación de roles (solo admin puede ver gestión de usuarios y QR codes)
  // Técnicos pueden ver todo excepto usuarios y qrcodes
  const rutasRestringidasParaTecnico = ['usuarios'];
  let idToShow = section;

  if (rolActual === 'tecnico' && rutasRestringidasParaTecnico.includes(section)) {
    idToShow = 'restringido';
  } else if (rolActual !== 'admin' && rolActual !== 'tecnico' && (section === 'usuarios' || section === 'qrcodes')) {
    idToShow = 'restringido';
  }

  // Guardar máquina seleccionada si se proporciona
  if (machineId) {
    localStorage.setItem('sgi_selected_machine', machineId);
  } else if (section === 'maquinas') {
    localStorage.removeItem('sgi_selected_machine');
  }

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('section-' + idToShow).classList.add('active');
  if (idToShow !== 'restringido') {
    const navItem = document.getElementById('nav-' + section);
    if (navItem) navItem.classList.add('active');
  } else {
    document.getElementById('topbarTitle').textContent = 'Acceso Denegado';
    document.getElementById('topbarSubtitle').textContent = 'Sección restringida por permisos';
    return;
  }

  const [title, sub] = sectionTitles[section] || [section, ''];
  document.getElementById('topbarTitle').textContent = title;
  document.getElementById('topbarSubtitle').textContent = sub;

  // Guardar sección actual para persistencia al refrescar
  localStorage.setItem('sgi_admin_section', section);

  // Cargar datos bajo demanda
  if (section === 'maquinas') renderMaquinas();
  if (section === 'incidencias') renderIncidencias(incFilter || filtroIncActual);
  if (section === 'historial') { cargarHistorial(); poblarFiltroMaquinasHistorial(); }
  if (section === 'usuarios') renderUsuarios();
  if (section === 'qrcodes') renderQRs();
}

function renderActualSection() {
  const activeSection = document.querySelector('.section.active');
  if (!activeSection) return;
  const id = activeSection.id.replace('section-', '');
  if (id === 'maquinas') renderMaquinas();
  if (id === 'incidencias') renderIncidencias();
  if (id === 'historial') cargarHistorial();
  if (id === 'usuarios') renderUsuarios();
  if (id === 'qrcodes') renderQRs();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  sidebar.classList.toggle('open');
  if (backdrop) backdrop.classList.toggle('open');
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function cargarDashboard() {
  // Ahora es solo un wrapper por si se llama manualmente
  const res = await apiFetch('/api/dashboard');
  if (res.ok) {
    const histRes = await apiFetch('/api/historial?');
    actualizarVistaDashboard(res.data, histRes.ok ? histRes.data : []);
  }
}

function actualizarVistaDashboard(stats, historial) {
  if (!stats) return;

  const d = stats;
  const kpiHoy = document.getElementById('kpi-hoy');
  if (kpiHoy) kpiHoy.textContent = d.hoy;
  const kpiSem = document.getElementById('kpi-semana');
  if (kpiSem) kpiSem.textContent = d.semana;
  const kpiPen = document.getElementById('kpi-pendientes');
  if (kpiPen) kpiPen.textContent = d.pendientes;
  const kpiProx = document.getElementById('kpi-proximos');
  if (kpiProx) kpiProx.textContent = d.proximos;

  // KPI Sin resolver y En seguimiento
  const sinResolver = (historial || []).filter(r => r.tipo === 'Incidencia' && !r.resuelta && !r.en_seguimiento).length;
  const enSeguimiento = (historial || []).filter(r => r.tipo === 'Incidencia' && !r.resuelta && r.en_seguimiento).length;
  const kpiSinResolver = document.getElementById('kpi-sin-resolver');
  if (kpiSinResolver) kpiSinResolver.textContent = sinResolver;
  const kpiSeg = document.getElementById('kpi-en-seguimiento-dash');
  if (kpiSeg) kpiSeg.textContent = enSeguimiento;

  // KPI Máquinas
  const maqActivas = datosMaquinas.filter(m => m.estado === 'activa').length;
  const listaMaqInactivas = datosMaquinas.filter(m => m.estado === 'inactiva');
  const kpiMaqAct = document.getElementById('kpi-maq-activas');
  if (kpiMaqAct) kpiMaqAct.textContent = maqActivas;
  const kpiMaqInact = document.getElementById('kpi-maq-inactivas');
  if (kpiMaqInact) kpiMaqInact.textContent = listaMaqInactivas.length;
  if (kpiMaqInact) kpiMaqInact.style.color = 'var(--text-muted)';
  const maqInactivasEl = document.getElementById('dashboardMaqInactivas');
  if (maqInactivasEl) {
    maqInactivasEl.innerHTML = listaMaqInactivas.length
      ? listaMaqInactivas.map(m => `
          <div onclick="navigateTo('maquinas', '${m.id}')" style="cursor:pointer;padding:5px 8px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;font-size:11px;color:var(--text-muted);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${m.nombre} · ${m.sala_nombre}">
            🖨️ ${m.nombre} · ${m.sala_nombre}
          </div>`).join('')
      : `<div style="font-size:11px;color:var(--success);text-align:center;padding:4px">✅ Todas operativas</div>`;
  }

  // Mini-lista incidencias sin resolver
  const incPendientes = (historial || []).filter(r => r.tipo === 'Incidencia' && !r.resuelta);
  renderIncPendientesDashboard(incPendientes.slice(0, 5));

  // Últimos reportes
  if (historial) renderUltimosMantenimientos(historial.slice(0, 8));
}

function renderIncPendientesDashboard(lista) {
  const tbody = document.getElementById('dashboardIncPendientes');
  const empty = document.getElementById('dashboardIncEmpty');
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  tbody.innerHTML = lista.map(r => `
    <tr onclick="verDetalleSesion('${r.id}')" style="cursor:pointer">
      <td><span style="font-weight:600;color:var(--danger)">🚨 ${r.maquina}</span></td>
      <td><span class="text-muted">${r.sala}</span></td>
      <td>${r.operario}</td>
      <td>${formatFechaHora(r.completado_en)}</td>
      <td><button class="btn btn-outline btn-sm" onclick="event.stopPropagation();verDetalleSesion('${r.id}')">Gestionar</button></td>
    </tr>
  `).join('');
}

function renderBarChart(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container || !items.length) {
    container.innerHTML = '<div class="empty-state" style="padding:24px"><div class="icon">📊</div><p>Sin datos aún</p></div>';
    return;
  }
  const max = Math.max(...items.map(i => i.value), 1);
  container.innerHTML = items.map(i => `
    <div class="chart-bar-row">
      <div class="chart-bar-label" title="${i.label}">${truncate(i.label, 12)}</div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${(i.value / max * 100).toFixed(1)}%"></div>
      </div>
      <div class="chart-bar-val">${i.value}</div>
    </div>
  `).join('');
}

function renderUltimosMantenimientos(registros) {
  const tbody = document.getElementById('dashboardUltimos');
  if (!registros.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">Sin reportes aún</td></tr>';
    return;
  }
  tbody.innerHTML = registros.map(r => {
    const isIncidencia = r.tipo === 'Incidencia';
    const resuelta = r.resuelta || false;
    const tipoBadge = isIncidencia
      ? `<span class="estado-badge ${resuelta ? 'ok' : 'vencido'}" style="font-size:10px">🚨 Incidencia</span>`
      : `<span class="estado-badge ok" style="font-size:10px;background:rgba(79,142,247,0.15);color:var(--accent)">🛠️ Mantenimiento</span>`;

    const maq = datosMaquinas.find(m => m.id === r.maquina_id);
    const maquinaEstado = maq ? maq.estado : 'activa';
    const maqStatusClass = maquinaEstado === 'activa' ? 'ok' : (maquinaEstado === 'inactiva' ? 'gris' : 'naranja');

    return `
      <tr onclick="verDetalleSesion('${r.id}')" style="cursor:pointer">
        <td data-label="Máquina">
          <div style="display:flex;flex-direction:column;gap:2px">
            <span style="${isIncidencia && !resuelta ? 'color:var(--danger);font-weight:600' : ''}">${r.maquina}</span>
            <span class="estado-badge ${maqStatusClass}" style="font-size:8px;padding:0 4px;width:fit-content">${maquinaEstado || 'activa'}</span>
          </div>
        </td>
        <td data-label="Tipo">${tipoBadge}</td>
        <td data-label="Sala"><span class="text-muted">${r.sala}</span></td>
        <td data-label="Operario">${r.operario}</td>
        <td data-label="Fecha y hora">${formatFechaHora(r.completado_en)}</td>
        <td data-label="Estado">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
            <span class="estado-badge ${isIncidencia ? (resuelta ? 'ok' : 'vencido') : 'ok'}" style="font-size:10px">
              ${isIncidencia ? (resuelta ? 'Resuelta' : 'Sin resolver') : 'Completado'}
            </span>
            ${r.tiene_fotos ? `<img src="${r.fotos[0]}" style="width:24px;height:24px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Máquinas ──────────────────────────────────────────────────────────────────
function renderMaquinas() {
  const salaFiltro = document.getElementById('filtroSalaMaquinas') ? document.getElementById('filtroSalaMaquinas').value : '';
  const searchQ = (document.getElementById('searchMaquinas')?.value || '').toLowerCase().trim();
  const grid = document.getElementById('gridMaquinas');

  if (isCargando && !datosMaquinas.length) {
    grid.innerHTML = skeletonMaquinas();
    return;
  }

  function normalize(s) { return s.toLowerCase().replace(/[\s\-_.]/g, ''); }
  function strictMatch(q, text) {
    return normalize(text).includes(q) || text.toLowerCase().includes(searchQ);
  }
  function fuzzyMatch(q, text) {
    const pattern = q.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    return new RegExp(pattern, 'i').test(text);
  }

  const normQ = normalize(searchQ);
  let lista = salaFiltro
    ? datosMaquinas.filter(m => String(m.sala_id) === String(salaFiltro))
    : datosMaquinas;
  if (searchQ) {
    // Try strict first
    let filtered = lista.filter(m =>
      strictMatch(normQ, m.nombre || '') ||
      strictMatch(normQ, m.tipo || '') ||
      strictMatch(normQ, m.sala_nombre || '') ||
      strictMatch(normQ, m.etiqueta || '')
    );
    // Fallback to fuzzy if strict gives no results
    if (!filtered.length) {
      filtered = lista.filter(m =>
        fuzzyMatch(searchQ, m.nombre || '') ||
        fuzzyMatch(searchQ, m.tipo || '') ||
        fuzzyMatch(searchQ, m.sala_nombre || '') ||
        fuzzyMatch(searchQ, m.etiqueta || '')
      );
    }
    lista = filtered;
  }

  if (!lista.length) {
    grid.innerHTML = '<div class="empty-state"><div class="icon">🖨️</div><p>No hay máquinas registradas</p></div>';
    return;
  }

  function tarjetaMaquina(m) {
    const ultimo = m.ultimo_mantenimiento
      ? `Último: ${formatFechaHora(m.ultimo_mantenimiento)}`
      : 'Sin mantenimiento registrado';

    const selectedId = localStorage.getItem('sgi_selected_machine');
    const isSelected = selectedId === String(m.id);
    const highlightStyle = isSelected ? 'border:3px solid var(--accent);box-shadow:0 0 0 4px rgba(79,142,247,0.2)' : '';

    return `
        <div class="maquina-card fade-in"
             draggable="true"
             ondragstart="handleDragStart(event, '${m.id}')"
             onclick="verDetalleMaquina('${m.id}')"
             style="cursor:grab;${highlightStyle}" title="Haz clic para ver detalles">
        <div class="maquina-header">
          <div>
            <div class="maquina-nombre">${m.nombre}</div>
            <div class="maquina-tipo" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap">
              <span>${m.codigo || 'S/ID'} · ${m.tipo}</span>
              <span class="estado-badge ${m.estado === 'activa' ? 'ok' : (m.estado === 'inactiva' ? 'gris' : 'naranja')}" style="font-size:9px; padding:1px 6px">
                ${m.estado || 'activa'}
              </span>
            </div>
          </div>
        </div>
        <div class="maquina-info">
          <span style="font-size:11px; color:var(--accent)">📍 ${m.sala_nombre || 'Sin sala'}</span>
          <span>⚙️ ${m.modelo || 'Sin modelo'}</span>
        </div>
          <div class="maquina-actions">
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); verDetalleMaquina('${m.id}')">Ver</button>
            ${rolActual === 'admin' ? `<button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="event.stopPropagation(); eliminarMaquina('${m.id}')">Eliminar</button>` : ''}
          </div>
      </div>
    `;
  }

  function seccionEspacio(idSala, titulo, icono, color, maquinas) {
    return `
      <div class="espacio-section drop-zone" 
           ondragover="handleDragOver(event)" 
           ondragleave="handleDragLeave(event)"
           ondrop="handleDrop(event, '${idSala}')"
           style="margin-bottom:32px; padding:16px; border-radius:16px; border: 2px dashed transparent; background: ${color}">
        <div class="espacio-header" style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <span style="font-size:22px">${icono}</span>
          <div>
            <div style="font-size:16px;font-weight:700;color:var(--text-primary)">${titulo}</div>
            <div style="font-size:12px;color:var(--text-muted)">${maquinas.length} máquina${maquinas.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="grid-maquinas-inner" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; display: grid;">
          ${maquinas.map(tarjetaMaquina).join('')}
        </div>
      </div>
    `;
  }

  let htmlResult = '';
  const commonBg = 'var(--bg-secondary)';
  const iconos = [''];
  datosSalas.forEach((sala, index) => {
    if (salaFiltro && String(sala.id) !== String(salaFiltro)) return;
    const maquinasSala = lista.filter(m => m.sala_id === sala.id);
    const color = commonBg;
    const icono = iconos[index % iconos.length];
    htmlResult += seccionEspacio(sala.id, sala.nombre, icono, color, maquinasSala);
  });

  // Sección para máquinas sin sala asignada
  const sinSala = lista.filter(m => !m.sala_id);
  if (sinSala.length > 0 && !salaFiltro) {
    htmlResult += seccionEspacio('', 'Sin Sala Asignada', '❓', 'rgba(100,100,100,0.05)', sinSala);
  }

  grid.innerHTML = htmlResult;

  // Scroll hacia la máquina seleccionada si existe
  const selectedId = localStorage.getItem('sgi_selected_machine');
  if (selectedId) {
    setTimeout(() => {
      const selectedCard = document.querySelector(`[onclick*="verDetalleMaquina('${selectedId}')"]`);
      if (selectedCard) {
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  // Limpiar máquina seleccionada después de mostrar el resaltado
  localStorage.removeItem('sgi_selected_machine');
}

// ── Lógica Drag & Drop ──────────────────────────────────────────────────────
function handleDragStart(e, id) {
  e.dataTransfer.setData('text/plain', id);
  e.currentTarget.style.opacity = '0.4';
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = 'var(--accent)';
  e.currentTarget.style.background = 'rgba(79,142,247,0.1)';
}

function handleDragLeave(e) {
  e.currentTarget.style.borderColor = 'transparent';
  e.currentTarget.style.background = ''; // Se restaura por CSS o inline original
}

async function handleDrop(e, idSalaDestino) {
  e.preventDefault();
  const idMaquina = e.dataTransfer.getData('text/plain');
  e.currentTarget.style.borderColor = 'transparent';
  e.currentTarget.style.background = '';

  if (!idMaquina) return;

  try {
    const { error } = await window.supabaseClient
      .from('equipos')
      .update({ sala_id: idSalaDestino || null })
      .eq('id', idMaquina);

    if (error) throw error;

    await recargarTodo();
    renderMaquinas();
  } catch (err) {
    showFeedback('Error al mover', 'No se ha podido cambiar la máquina de sala.', '❌');
  }
}

function filtrarMaquinas() { renderMaquinas(); }

async function verDetalleMaquina(id) {
  const maq = datosMaquinas.find(m => m.id === id);
  if (!maq) return;
  document.getElementById('editMaquinaId').value = id;
  document.getElementById('editNombre').value = maq.nombre;
  document.getElementById('editModelo').value = maq.modelo || '';
  document.getElementById('editEstado').value = maq.estado || 'activa';
  document.getElementById('editNotas').value = maq.notas || '';

  // Configurar opciones del select de tipo según el rol
  const tipoSelect = document.getElementById('editTipo');
  const crearNuevoOption = tipoSelect.querySelector('option[value="__CREAR_NUEVO__"]');

  // Solo el administrador puede ver la opción "Crear nuevo tipo"
  if (crearNuevoOption) {
    crearNuevoOption.style.display = (rolActual === 'admin') ? '' : 'none';
    // Restaurar texto original
    crearNuevoOption.textContent = '+ Crear nuevo tipo';
  }

  // Resetear variable de tipo personalizado
  nuevoTipoPersonalizado = null;

  // Establecer valor del tipo (si no existe en las opciones, se mantendrá el valor actual)
  tipoSelect.value = maq.tipo;

  // Añadir event listener para manejar cambio de tipo
  tipoSelect.onchange = handleTipoChangeEdit;

  // Por defecto, abrir en modo lectura
  setModoEdicionMaquina(false);

  abrirModal('modalMaquina');
}

// Manejar cambio en el select de tipo en edición
async function handleTipoChangeEdit() {
  const tipoSelect = document.getElementById('editTipo');

  if (tipoSelect.value === '__CREAR_NUEVO__') {
    // Solo permitir a administradores crear nuevos tipos
    if (rolActual !== 'admin') {
      showFeedback('Acceso denegado', 'Solo los administradores pueden crear nuevos tipos de máquina.', '❌');
      tipoSelect.value = 'Impresora FDM';
      return;
    }

    const nuevoTipo = await customPrompt('Crear nuevo tipo', 'Ingrese el nombre del nuevo tipo de máquina:');
    if (nuevoTipo && nuevoTipo.trim()) {
      nuevoTipoPersonalizado = nuevoTipo.trim();
      // Cambiar el texto de la opción seleccionada temporalmente
      const option = tipoSelect.options[tipoSelect.selectedIndex];
      option.textContent = `+ Crear: ${nuevoTipoPersonalizado}`;
    } else {
      // Si cancela, volver al valor por defecto
      tipoSelect.value = 'Impresora FDM';
      nuevoTipoPersonalizado = null;
    }
  } else {
    nuevoTipoPersonalizado = null;
  }
}

function setModoEdicionMaquina(editando) {
  const inputs = ['editNombre', 'editTipo', 'editModelo', 'editEstado', 'editNotas'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.readOnly = !editando;
    if (el.tagName === 'SELECT') el.disabled = !editando;
    el.style.opacity = editando ? '' : '0.65';
    el.style.cursor = editando ? '' : 'default';
  });

  // Bloquear interacción completa del body del modal en modo lectura
  const modalBody = document.querySelector('#modalMaquina .modal-body');
  if (modalBody) {
    modalBody.style.pointerEvents = editando ? '' : 'none';
    modalBody.style.userSelect = editando ? '' : 'none';
  }
  
  const btnToggle = document.getElementById('btnToggleEditarMaquina');
  if (btnToggle) {
    if (editando) {
      btnToggle.innerHTML = '❌ Cancelar';
      btnToggle.className = 'btn btn-outline btn-sm';
      btnToggle.style.cssText = 'padding: 8px 16px; font-size:13px; font-weight:600; min-width:80px; border-radius:8px; transition:all 0.2s ease; border-color:var(--danger); color:var(--danger);';
    } else {
      btnToggle.innerHTML = '✏️ Editar';
      btnToggle.className = 'btn btn-primary btn-sm';
      btnToggle.style.cssText = 'padding: 8px 16px; font-size:13px; font-weight:600; min-width:80px; border-radius:8px; box-shadow:0 2px 8px rgba(59,130,246,0.3); transition:all 0.2s ease;';
    }
  }
  
  const btnGuardar = document.getElementById('btnGuardarMaquina');
  if (btnGuardar) btnGuardar.style.display = editando ? 'block' : 'none';
}

function toggleModoEdicionMaquina() {
  const isReadOnly = document.getElementById('editNombre').readOnly;
  setModoEdicionMaquina(isReadOnly);
}

async function editarMaquina(id) {
  await verDetalleMaquina(id);
  setModoEdicionMaquina(true);
}

async function guardarMaquina() {
  if (rolActual !== 'admin') {
    showFeedback('Acceso denegado', 'Solo los administradores pueden guardar cambios en máquinas.', '🔒');
    return;
  }
  const id = document.getElementById('editMaquinaId').value;
  let tipo = document.getElementById('editTipo').value;

  // Manejar tipo personalizado
  if (tipo === '__CREAR_NUEVO__') {
    if (rolActual !== 'admin') {
      showFeedback('Acceso denegado', 'Solo los administradores pueden crear nuevos tipos de máquina.', '❌');
      return;
    }
    if (nuevoTipoPersonalizado) {
      tipo = nuevoTipoPersonalizado;
    } else {
      showFeedback('Error', 'Debe especificar un nombre para el nuevo tipo.', '❌');
      return;
    }
  }

  const datos = {
    nombre: document.getElementById('editNombre').value.trim(),
    tipo: tipo,
    modelo: document.getElementById('editModelo').value.trim(),
    estado: document.getElementById('editEstado').value,
    notas: document.getElementById('editNotas').value.trim() || null,
  };
  if (!datos.nombre) {
    showFeedback('Error', 'El nombre de la máquina es obligatorio.', '❌');
    return;
  }
  const res = await apiFetch(`/api/maquina/${id}`, { method: 'PUT', body: datos });
  if (res.ok) {
    cerrarModal('modalMaquina');
    await cargarDatosBase();
    renderMaquinas();
    showFeedback('Máquina guardada', 'Los cambios se han guardado correctamente.', '✅');
  } else {
    showFeedback('Error al guardar', (res.error || 'No se pudieron guardar los cambios.'), '❌');
  }
}

function abrirModalNuevaMaquina() {
  document.getElementById('nuevoMaquinaCodigo').value = '';
  document.getElementById('nuevoMaquinaNombre').value = '';
  document.getElementById('nuevoMaquinaModelo').value = '';
  document.getElementById('nuevoMaquinaAncho').value = '';
  document.getElementById('nuevoMaquinaAlto').value = '';
  document.getElementById('nuevoMaquinaProfundidad').value = '';
  document.getElementById('nuevoMaquinaNotas').value = '';
  const estadoEl = document.getElementById('nuevoMaquinaEstado');
  if (estadoEl) estadoEl.value = 'activa';
  document.getElementById('msgNuevaMaquina').innerHTML = '';

  // Configurar opciones del select de tipo según el rol
  const tipoSelect = document.getElementById('nuevoMaquinaTipo');
  const crearNuevoOption = tipoSelect.querySelector('option[value="__CREAR_NUEVO__"]');

  // Solo el administrador puede ver la opción "Crear nuevo tipo"
  if (crearNuevoOption) {
    crearNuevoOption.style.display = (rolActual === 'admin') ? '' : 'none';
    // Restaurar texto original
    crearNuevoOption.textContent = '+ Crear nuevo tipo';
  }

  // Resetear variable de tipo personalizado
  nuevoTipoPersonalizado = null;

  // Resetear a valor por defecto
  tipoSelect.value = 'Impresora FDM';

  // Añadir event listener para manejar cambio de tipo (eliminar anterior si existe)
  tipoSelect.onchange = handleTipoChange;

  abrirModal('modalNuevaMaquina');
}

// Variable para almacenar el tipo personalizado creado
let nuevoTipoPersonalizado = null;

// Manejar cambio en el select de tipo
async function handleTipoChange() {
  const tipoSelect = document.getElementById('nuevoMaquinaTipo');

  if (tipoSelect.value === '__CREAR_NUEVO__') {
    // Solo permitir a administradores crear nuevos tipos
    if (rolActual !== 'admin') {
      showFeedback('Acceso denegado', 'Solo los administradores pueden crear nuevos tipos de máquina.', '❌');
      tipoSelect.value = 'Impresora FDM';
      return;
    }

    const nuevoTipo = await customPrompt('Crear nuevo tipo', 'Ingrese el nombre del nuevo tipo de máquina:');
    if (nuevoTipo && nuevoTipo.trim()) {
      nuevoTipoPersonalizado = nuevoTipo.trim();
      // Cambiar el texto de la opción seleccionada temporalmente
      const option = tipoSelect.options[tipoSelect.selectedIndex];
      option.textContent = `+ Crear: ${nuevoTipoPersonalizado}`;
    } else {
      // Si cancela, volver al valor por defecto
      tipoSelect.value = 'Impresora FDM';
      nuevoTipoPersonalizado = null;
    }
  } else {
    nuevoTipoPersonalizado = null;
  }
}

async function crearMaquina() {
  if (rolActual !== 'admin') {
    showFeedback('Acceso denegado', 'Solo los administradores pueden crear máquinas.', '🔒');
    return;
  }
  const nombre = document.getElementById('nuevoMaquinaNombre').value.trim();
  const sala_id = document.getElementById('nuevoMaquinaSala').value;
  let tipo = document.getElementById('nuevoMaquinaTipo').value;
  const modelo = document.getElementById('nuevoMaquinaModelo').value.trim();
  const estado = document.getElementById('nuevoMaquinaEstado')?.value || 'activa';
  const ancho_mm = parseInt(document.getElementById('nuevoMaquinaAncho').value) || null;
  const alto_mm = parseInt(document.getElementById('nuevoMaquinaAlto').value) || null;
  const profundidad_mm = parseInt(document.getElementById('nuevoMaquinaProfundidad').value) || null;
  const notas = document.getElementById('nuevoMaquinaNotas').value.trim() || null;
  const msg = document.getElementById('msgNuevaMaquina');

  console.log('DEBUG crearMaquina - rolActual:', rolActual, 'tipo:', tipo, 'nuevoTipoPersonalizado:', nuevoTipoPersonalizado);

  if (!nombre || !sala_id) {
    msg.innerHTML = '<div class="alert alert-warning">⚠️ Nombre y Sala son obligatorios</div>';
    return;
  }

  // Manejar tipo personalizado
  if (tipo === '__CREAR_NUEVO__') {
    if (rolActual !== 'admin') {
      msg.innerHTML = '<div class="alert alert-danger">❌ Solo los administradores pueden crear nuevos tipos de máquina</div>';
      return;
    }
    if (nuevoTipoPersonalizado) {
      tipo = nuevoTipoPersonalizado;
    } else {
      msg.innerHTML = '<div class="alert alert-warning">⚠️ Debe especificar un nombre para el nuevo tipo</div>';
      return;
    }
  }

  console.log('DEBUG - Tipo final:', tipo);

  const res = await apiFetch('/api/maquinas', {
    method: 'POST',
    body: {
      codigo: document.getElementById('nuevoMaquinaCodigo').value.trim(),
      nombre, sala_id, tipo, modelo, estado,
      ancho_mm, alto_mm, profundidad_mm, notas
    }
  });

  if (res.ok) {
    cerrarModal('modalNuevaMaquina');
    await cargarDatosBase();
    renderMaquinas();
  } else {
    msg.innerHTML = `<div class="alert alert-danger">❌ ${res.error}</div>`;
  }
}

async function eliminarMaquina(id) {
  if (rolActual !== 'admin') {
    showFeedback('Acceso denegado', 'Solo los administradores pueden eliminar máquinas.', '🔒');
    return;
  }
  const ok = await customConfirm(
    'Eliminar máquina',
    '¿Estás seguro? Se eliminarán también todos sus registros de mantenimiento. Esta acción no se puede deshacer.',
    '🗑️'
  );
  if (!ok) return;
  const res = await apiFetch(`/api/maquina/${id}`, { method: 'DELETE' });
  if (res.ok) {
    await cargarDatosBase();
    renderMaquinas();
    showFeedback('Máquina eliminada', 'La máquina y sus registros asociados han sido eliminados.', '✅');
  } else {
    showFeedback('Error al eliminar', res.error, '❌');
  }
}

// ── QR Codes ──────────────────────────────────────────────────────────────────
function renderQRs() {
  const salaFiltro = document.getElementById('filtroSalaQR').value;
  const lista = salaFiltro
    ? datosMaquinas.filter(m => String(m.sala_id) === String(salaFiltro))
    : datosMaquinas;

  const grid = document.getElementById('gridQRs');
  if (isCargando && !datosMaquinas.length) {
    grid.innerHTML = skeletonMaquinas();
    return;
  }

  grid.innerHTML = lista.map(m => `
    <div class="maquina-card fade-in" style="cursor:pointer" onclick="verQR('${m.id}', '${escapar(m.nombre)}', '${escapar(m.sala_nombre)}')">
      <div class="maquina-header">
        <div>
          <div class="maquina-nombre">${m.nombre}</div>
          <div class="maquina-tipo">${m.sala_nombre} · ${m.tipo}</div>
        </div>
        <span style="font-size:32px">📱</span>
      </div>
      <div style="text-align:center;padding:8px 0;color:var(--text-muted);font-size:13px">
        Haz clic para ver el código QR
      </div>
    </div>
  `).join('');
}

function filtrarQRs() { renderQRs(); }

async function verQR(id, nombre, sala) {
  document.getElementById('qrNombre').textContent = nombre;
  document.getElementById('qrSala').textContent = sala;
  const qrContainer = document.getElementById('qrImgContainer');
  qrContainer.innerHTML = '';
  qrContainer.style.cursor = 'pointer';

  const targetUrl = `${serverHost}/operario.html?maquinaId=${id}`;
  qrContainer.onclick = () => window.open(targetUrl, '_blank');

  document.getElementById('qrUrl').textContent = 'Generando...';
  abrirModal('modalQR');

  const qrUrlEl = document.getElementById('qrUrl');
  qrUrlEl.textContent = targetUrl;
  qrUrlEl.href = targetUrl;
  qrUrlEl.style.textDecoration = 'underline'; // Asegurar que parezca clickeable

  new QRCode(qrContainer, {
    text: targetUrl,
    width: 320,
    height: 320,
    colorDark: "#1a1a2e",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.L,
    quietZone: 20
  });
}

function imprimirTodosLosQRs() {
  const salaFiltro = document.getElementById('filtroSalaQR').value;
  const lista = salaFiltro
    ? datosMaquinas.filter(m => String(m.sala_id) === String(salaFiltro))
    : datosMaquinas;

  if (!lista.length) return showFeedback('Sin máquinas', 'No hay máquinas seleccionadas para imprimir.', '⚠️');

  const printWindow = window.open('', '_blank');
  let baseOrigin = serverHost;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Imprimir todos los QRs</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      <style>
        body { font-family: sans-serif; display: flex; flex-wrap: wrap; gap: 20px; padding: 20px; justify-content: center; }
        .qr-label { border: 1px solid #eee; padding: 15px; border-radius: 8px; text-align: center; width: 220px; page-break-inside: avoid; }
        .qr-name { font-weight: bold; font-size: 16px; margin-bottom: 4px; }
        .qr-sala { font-size: 12px; color: #666; margin-bottom: 10px; }
        .qr-canvas { display: flex; justify-content: center; }
        @media print { body { padding: 10px; } }
      </style>
    </head>
    <body>
      ${lista.map(m => `
        <div class="qr-label">
          <div class="qr-name">${m.nombre}</div>
          <div class="qr-sala">${m.sala_nombre}</div>
          <div class="qr-canvas" id="canvas-${m.id}"></div>
        </div>
      `).join('')}
      <script>
        window.onload = () => {
          const maquinas = ${JSON.stringify(lista)};
          maquinas.forEach(m => {
            new QRCode(document.getElementById('canvas-' + m.id), {
              text: "${baseOrigin}/operario.html?maquinaId=" + m.id,
              width: 220,
              height: 220,
              correctLevel: QRCode.CorrectLevel.L,
              quietZone: 12
            });
          });
          setTimeout(() => { window.print(); window.close(); }, 1200);
        };
      </script>
    </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
}

function imprimirQR() {
  const nombre = document.getElementById('qrNombre').textContent;
  const sala = document.getElementById('qrSala').textContent;
  const container = document.getElementById('qrImgContainer');
  const imgElement = container.querySelector('img');
  const img = imgElement ? imgElement.src : '';

  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>QR - ${nombre}</title>
    <style>body{font-family:sans-serif;text-align:center;padding:40px}
    h2{margin-bottom:4px}p{color:#666;font-size:14px;margin-bottom:20px}
    img{border:3px solid #000;border-radius:8px;width:280px}
    </style></head><body>
    <h2>${nombre}</h2><p>${sala}</p>
    <img src="${img}">
    <script>window.onload=()=>{setTimeout(()=>window.print(),500)}</script>
    </body></html>`);
  w.document.close();
}

// ── Historial ─────────────────────────────────────────────────────────────────
async function poblarFiltroMaquinasHistorial() {
  const sel = document.getElementById('filtroMaquina');
  if (!sel) return;
  sel.innerHTML = '<option value="">Todas las máquinas</option>';
  datosMaquinas.forEach(m => {
    const opt = document.createElement('option');
    const label = m.codigo ? `[${m.codigo}] ${m.nombre}` : m.nombre;
    opt.value = m.id; opt.textContent = `${label} (${m.sala_nombre})`;
    sel.appendChild(opt);
  });
}

async function cargarHistorial() {
  const params = new URLSearchParams();
  const sala = document.getElementById('filtroSala')?.value;
  const maquina = document.getElementById('filtroMaquina')?.value;
  const operario = document.getElementById('filtroOperario')?.value.trim();
  const desde = document.getElementById('filtroDesde')?.value;
  const hasta = document.getElementById('filtroHasta')?.value;

  if (sala) params.append('sala_id', sala);
  if (maquina) params.append('maquina_id', maquina);
  if (operario) params.append('operario_nombre', operario);
  if (desde) params.append('desde', desde);
  if (hasta) params.append('hasta', hasta);

  const tbody = document.getElementById('tablaHistorial');
  const empty = document.getElementById('historialEmpty');
  const hasFilters = sala || maquina || operario || desde || hasta;

  if (!hasFilters && datosHistorial.length > 0) {
    const mantenimientos = datosHistorial.filter(r => r.tipo === 'Mantenimiento');
    renderizarContenidoHistorial(mantenimientos, tbody, empty);
    return;
  }

  if (tbody) tbody.innerHTML = skeletonTabla(8);
  const res = await apiFetch('/api/historial?' + params.toString());

  if (!res.ok || !res.data.length) {
    if (tbody) tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  const mantenimientosRes = res.data.filter(r => r.tipo === 'Mantenimiento');
  if (mantenimientosRes.length === 0) {
    if (tbody) tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  renderizarContenidoHistorial(mantenimientosRes, tbody, empty);
}

function renderizarContenidoHistorial(data, tbody, empty) {
  if (!tbody) return;
  if (empty) empty.style.display = 'none';
  tbody.innerHTML = data.map(r => {
    const isInc = r.tipo === 'Incidencia';
    const resuelta = r.resuelta || false;

    // Badge de resolución para incidencias
    let resBadge = '';
    if (isInc) {
      resBadge = resuelta
        ? `<span class="estado-badge ok" style="margin-left:8px;font-size:10px">✅ Resuelta</span>`
        : `<span class="estado-badge vencido" style="margin-left:8px;font-size:10px">🚨 Sin resolver</span>`;
    }

    return `
      <tr style="${isInc && !resuelta ? 'background: rgba(239, 68, 68, 0.03)' : ''}">
        <td data-label="Tipo">
          <span class="estado-badge ${isInc ? 'vencido' : 'ok'}" style="font-size:10px">
            ${isInc ? '⚡ INCIDENCIA' : '🔧 MANT.'}
          </span>
        </td>
        <td data-label="Máquina">
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px">
            <span style="font-weight:600; color:var(--text-primary)">${r.maquina}</span>
            ${resBadge}
          </div>
        </td>
        <td data-label="Sala">${r.sala}</td>
        <td data-label="Operario" style="max-width: 150px; white-space: normal; word-break: break-word;">
          <div style="font-weight:700">${r.operario}</div>
          <div style="font-size:10px; color:var(--text-muted)">${r.operario_email || '–'}</div>
        </td>
        <td data-label="Fecha" style="font-size:11px">${formatFechaHora(r.completado_en)}</td>
        <td data-label="Observ." style="font-size:11px;color:var(--text-muted)">
          <div style="display:flex;align-items:center;gap:12px;justify-content:space-between">
            <span style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.observaciones || '–'}</span>
            ${r.tiene_fotos ? `<img src="${r.fotos[0]}" style="width:26px;height:26px;object-fit:cover;border-radius:6px;cursor:pointer" onclick="event.stopPropagation(); window.open('${r.fotos[0]}','_blank')">` : ''}
          </div>
        </td>
        <td data-label="Acciones"><button class="btn btn-outline btn-sm" onclick="verDetalleSesion('${r.id}')">Detalles</button></td>
      </tr>
    `;
  }).join('');
}

async function toggleResolucionIncidencia(id, nuevoEstado) {
  let comentario = '';
  if (nuevoEstado) {
    comentario = await customPrompt('Resolver Incidencia', 'Escribe un breve comentario sobre la solución (opcional):');
    if (comentario === null) return; // Cancelado
  }

  const res = await apiFetch(`/api/sesion/${id}/resolver`, {
    method: 'PUT',
    body: {
      resuelta: nuevoEstado,
      comentario_resolucion: comentario
    }
  });

  if (res.ok) {
    await cargarDatosBase();
    if (document.getElementById('section-historial').classList.contains('active')) await cargarHistorial();
    if (document.getElementById('section-incidencias').classList.contains('active')) {
      const filtroActual = document.querySelector('.btn-outline.btn-sm.active[id^="btn-inc-"]')?.id.replace('btn-inc-', '') || 'todas';
      renderIncidencias(filtroActual);
    }
  } else {
    showFeedback('Error de estado', 'No se pudo actualizar el estado de la incidencia: ' + res.error, '❌');
  }
}

async function verDetalleSesion(id) {
  cerrarModal('modalHistorialMaquina');
  const container = document.getElementById('detalleContenido');
  const titleEl = document.querySelector('#modalDetalle .modal-title');
  if (!container) return;
  container.innerHTML = '<div style="padding:40px;text-align:center"><span class="spinner"></span> Cargando...</div>';
  abrirModal('modalDetalle');

  const res = await apiFetch(`/api/sesion/${id}/detalle`);
  if (!res.ok) {
    container.innerHTML = `<div class="alert alert-danger">Error: ${res.error}</div>`;
    return;
  }

  const { sesion } = res.data;
  const isInc = sesion.tipo === 'Incidencia';
  const resuelta = sesion.resuelta || false;

  // Cambiar título del modal dinámicamente
  if (titleEl) titleEl.textContent = isInc ? 'Detalles de la Incidencia' : 'Detalles del Mantenimiento';

  container.innerHTML = `
    <div class="detail-container">
      <div class="detail-header-info" style="${isInc ? 'border-bottom: 2px solid var(--danger)' : ''}; margin-bottom: 20px;">
        <div class="detail-machine">
          <div class="machine-icon" style="font-size:28px">${isInc ? '🚨' : '🛠️'}</div>
          <div>
            <div class="machine-name">${sesion.maquina}</div>
            <div class="machine-sala">📍 ${sesion.sala}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <div class="estado-badge ${isInc ? 'vencido' : 'ok'}">${isInc ? 'Incidencia' : 'Mantenimiento'}</div>
          ${isInc ? `<div class="estado-badge ${resuelta ? 'ok' : 'vencido'}">${resuelta ? '✅ Resuelta' : '🚨 Sin resolver'}</div>` : ''}
          ${rolActual === 'admin' ? `<button class="btn btn-icon" style="background:transparent;border:none;color:var(--danger);padding:4px;font-size:16px;cursor:pointer;" onclick="eliminarIncidencia('${sesion.id}')" title="Eliminar registro">❌</button>` : ''}
        </div>
      </div>

      <div class="detail-layout-grid">
        <!-- Columna Izquierda: Información Principal -->
        <div>
          <div class="detail-stats-grid" style="margin-bottom: 16px;">
            <div class="detail-stat"><div class="label">👷 Operario</div><div class="value">${sesion.operario}</div></div>
            <div class="detail-stat"><div class="label">📅 Fecha</div><div class="value">${formatFechaHora(sesion.completado_en)}</div></div>
          </div>
          
          <div class="detail-section" style="margin-bottom: 16px;">
            <div class="section-label">${isInc ? '🚩 Informe de Fallo' : '📝 Observaciones'}</div>
            <div class="detail-notes" style="font-size:13px; ${isInc ? 'background:rgba(239, 68, 68, 0.05); border-left:4px solid var(--danger)' : ''}">
              ${sesion.observaciones || 'Sin notas'}
            </div>
          </div>

          ${sesion.comentario_resolucion ? `
            <div class="detail-section" style="margin-bottom: 16px;">
              <div class="section-label">✅ Solución / Resolución</div>
              <div class="detail-notes" style="font-size:13px; background:rgba(16, 185, 129, 0.05); border-left:4px solid var(--success); color:var(--success); font-weight:600">
                ${sesion.comentario_resolucion}
              </div>
            </div>
          ` : ''}

          <div style="display:flex; gap:10px; margin-top: 12px">
            ${isInc && !resuelta ? `
              <button class="btn btn-outline btn-sm flex-1" onclick="editarDescripcionIncidencia('${sesion.id}')">✏️ Editar Reporte</button>
              <button class="btn btn-primary btn-sm flex-1" onclick="toggleResolucionIncidencia('${sesion.id}', true)">✅ Resolver</button>
            ` : ''}
          </div>
        </div>

        <!-- Columna Derecha: Fotos y Acciones rápidas -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${sesion.fotos && sesion.fotos.length > 0 ? `
            <div>
              <div class="section-label" style="margin-bottom: 8px">🖼️ Evidencias (${sesion.fotos.length})</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                ${sesion.fotos.map(f => `<img src="${f}" onclick="abrirLightbox('${f}')" style="width:100%; height: 80px; object-fit: cover; border-radius:8px; cursor:zoom-in; border:1px solid var(--border); transition:transform .15s" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'" loading="lazy">`).join('')}
              </div>
            </div>
          ` : `
            <div style="text-align:center; padding: 20px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed var(--border)">
              <div style="font-size:24px; opacity: 0.3; margin-bottom: 4px">📷</div>
              <div style="font-size:11px; color: var(--text-muted)">Sin fotos adjuntas</div>
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  // --- Manejo de Seguimientos ---
  const seccionSeg = document.getElementById('seccionSeguimiento');
  const timeline = document.getElementById('seguimientoTimeline');

  if (isInc && seccionSeg && timeline) {
    seccionSeg.style.display = 'block';
    timeline.innerHTML = '<div style="text-align:center;padding:10px;opacity:0.5">Cargando hilo de seguimiento...</div>';

    // Guardar ID actual para la nueva nota
    window.currentIncidenciaId = id;

    // Cargar seguimientos desde la API
    const segRes = await apiFetch(`/api/incidencia/${id}/seguimientos`);
    if (segRes.ok && segRes.data) {
      const notas = segRes.data;
      if (notas.length === 0) {
        timeline.innerHTML = '<div style="text-align:center;padding:10px;opacity:0.5;font-size:12px">No hay notas registradas aún.</div>';
      } else {
        timeline.classList.add('timeline-compact');
        timeline.innerHTML = notas.map(n => `
          <div class="timeline-item">
            <div class="timeline-meta">
              <b>${n.usuario_nombre || 'Técnico'}</b>
              <span>${formatFechaHora(n.timestamp)}</span>
            </div>
            <div class="timeline-content">
              <div class="timeline-text">${n.nota}</div>
            </div>
          </div>
        `).join('');
        // Hacer scroll al final
        timeline.scrollTop = timeline.scrollHeight;
      }
    } else {
      timeline.innerHTML = '<div style="color:var(--danger);font-size:12px">Error al cargar el historial de seguimiento.</div>';
    }
  } else if (seccionSeg) {
    seccionSeg.style.display = 'none';
  }
}

async function guardarNuevaNota() {
  const input = document.getElementById('nuevaNotaSeguimiento');
  const btn = document.getElementById('btnGuardarNota');
  const nota = input.value.trim();
  const id = window.currentIncidenciaId;

  if (!nota || !id) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-sm"></span> Guardando...';

  const res = await apiFetch(`/api/incidencia/${id}/seguimientos`, {
    method: 'POST',
    body: { nota }
  });

  if (res.ok) {
    input.value = '';
    // Recargar el detalle para ver la nueva nota
    verDetalleSesion(id);
  } else {
    showFeedback('Error al anotar', 'No se ha podido guardar la nota de seguimiento: ' + res.error, '❌');
  }
  btn.disabled = false;
  btn.innerHTML = '<span>➕ Añadir Nota</span>';
}

async function editarDescripcionIncidencia(id) {
  const resDet = await apiFetch(`/api/sesion/${id}/detalle`);
  let currentDesc = '';
  if (resDet.ok && resDet.data.sesion) {
    currentDesc = resDet.data.sesion.observaciones;
  }
  const nuevaDesc = await customPrompt('Editar Reporte', 'Edita el reporte de la incidencia:', currentDesc);
  if (nuevaDesc === null) return;

  const res = await apiFetch(`/api/incidencia/${id}/editar`, {
    method: 'PUT',
    body: { notas: nuevaDesc }
  });

  if (res.ok) {
    showFeedback('Reporte actualizado', 'La descripción del reporte se ha modificado correctamente.', '✅');
    // Recargar datos y refrescar vista
    await cargarDatosBase();
    verDetalleSesion(id);
  } else {
    showFeedback('Error al editar', res.error, '❌');
  }
}

async function eliminarIncidencia(id) {
  if (rolActual !== 'admin') {
    showFeedback('Acceso denegado', 'Solo los administradores pueden eliminar registros.', '🔒');
    return;
  }
  const ok = await customConfirm(
    'Eliminar registro',
    '¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.',
    '🗑️'
  );
  if (!ok) return;

  const res = await apiFetch(`/api/sesion/${id}`, { method: 'DELETE' });
  if (res.ok) {
    cerrarModal('modalDetalle');
    showFeedback('Registro eliminado', 'La incidencia ha sido eliminada correctamente.', '✅');
    await cargarDatosBase();
    cargarHistorial();
    renderIncidencias();
  } else {
    showFeedback('Error al eliminar', res.error, '❌');
  }
}

async function verHistorialMaquina(nombreMaquina) {
  document.getElementById('historialMaquinaTitulo').textContent = nombreMaquina;
  const tbody = document.getElementById('tablaHistorialMaquina');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px"><span class="spinner"></span></td></tr>';
  abrirModal('modalHistorialMaquina');

  const filtrados = datosHistorial.filter(r => r.maquina === nombreMaquina);
  if (!filtrados.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px">Sin registros</td></tr>';
    return;
  }
  tbody.innerHTML = filtrados.map(r => `
    <tr>
      <td data-label="Fecha">${formatFechaHora(r.completado_en)}</td>
      <td data-label="Operario">${r.operario}</td>
      <td data-label="Tipo"><span class="estado-badge ${r.tipo === 'Incidencia' ? 'vencido' : 'ok'}">${r.tipo}</span></td>
      <td data-label="Nota">${truncate(r.observaciones || '', 20)}</td>
      <td><button class="btn btn-outline btn-sm" onclick="verDetalleSesion('${r.id}')">Detalles</button></td>
    </tr>
  `).join('');
}

function exportarCSV() {
  const rows = [['ID', 'Máquina', 'Sala', 'Operario', 'Fecha', 'Observaciones']];
  datosHistorial.forEach(r => rows.push([r.id, r.maquina, r.sala, r.operario, r.completado_en, r.observaciones || '']));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `historial_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// ── Usuarios / Administradores ────────────────────────────────────────────────
const ROL_BADGES = {
  admin: { label: '🛡️ Administrador', cls: 'azul' },
  tecnico: { label: '🔧 Técnico', cls: 'verde' },
  usuario: { label: '👤 Usuario', cls: '' },
};

function toggleRolesHelp() {
  const pop = document.getElementById('rolesHelpPopover');
  if (!pop) return;
  const visible = pop.style.display !== 'none';
  pop.style.display = visible ? 'none' : 'block';
  if (!visible) {
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!pop.contains(e.target) && e.target.id !== 'btnRolesHelp') {
          pop.style.display = 'none';
        }
        document.removeEventListener('click', handler);
      });
    }, 0);
  }
}

async function renderUsuarios() {
  const container = document.getElementById('tablaUsuarios');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px"><span class="spinner" style="display:inline-block"></span> Cargando usuarios...</td></tr>';

  try {
    const client = window.supabaseClient;
    const { data: perfiles, error } = await client
      .from('perfiles')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error) throw error;

    if (!perfiles || !perfiles.length) {
      container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted)">No hay usuarios registrados aún</td></tr>';
      return;
    }

    const session = window.sgiAdminSession || {};
    const esAdmin = session.type === 'superadmin' || session.type === 'admin';

    container.innerHTML = perfiles.map(u => {
      const rol = ROL_BADGES[u.rol] || { label: u.rol || 'usuario', cls: '' };
      const fecha = u.creado_en ? new Date(u.creado_en).toLocaleDateString('es-ES') : '–';
      return `
      <tr>
        <td data-label="Nombre"><b>${u.nombre || '–'}</b><div style="font-size:11px;color:var(--text-muted)">${u.email}</div></td>
        <td data-label="Rol"><span class="estado-badge ${rol.cls}">${rol.label}</span></td>
        <td data-label="Estado"><span class="estado-badge ok">✅ Activo</span></td>
        <td data-label="Registro" style="font-size:11px">${fecha}</td>
        <td data-label="Acciones">
          ${esAdmin ? `
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${u.rol !== 'admin' ? `<button class="btn btn-outline btn-sm" style="color:var(--accent);border-color:var(--accent)" onclick="cambiarRolUsuario('${u.id}','admin')">🛡️ Hacer Admin</button>` : ''}
              ${u.rol === 'admin' ? `<button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="cambiarRolUsuario('${u.id}','usuario')">👤 Quitar Admin</button>` : ''}
              ${u.rol !== 'tecnico' ? `<button class="btn btn-outline btn-sm" style="color:var(--success);border-color:var(--success)" onclick="cambiarRolUsuario('${u.id}','tecnico')">🔧 Hacer Técnico</button>` : ''}
              ${session.type === 'superadmin' ? `<button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);padding:4px 8px" onclick="eliminarUsuario('${u.id}')" title="Eliminar usuario permanentemente">🗑️ Eliminar</button>` : ''}
            </div>
          ` : '<span style="color:var(--text-muted);font-size:12px">Solo los administradores pueden cambiar roles</span>'}
        </td>
      </tr>`;
    }).join('');

  } catch (err) {
    console.error('Error cargando perfiles:', err);
    container.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--danger)">⚠️ Error al cargar usuarios: ${err.message}<br><br><small>Asegúrate de haber creado la tabla <code>perfiles</code> en Supabase.</small></td></tr>`;
  }
}

async function eliminarUsuario(userId) {
  const session = window.sgiAdminSession || {};
  if (session.type !== 'superadmin') {
    showFeedback('Acceso Denegado', 'Solo el administrador principal puede eliminar usuarios.', '🔒');
    return;
  }
  const ok = await customConfirm(
    'Eliminar Usuario',
    '¿Estás seguro de que deseas eliminar este usuario? Su perfil y accesos se borrarán del sistema. Esta acción no se puede deshacer.',
    '⚠️'
  );
  if (!ok) return;

  try {
    const client = window.supabaseClient;

    // Primero, intentamos eliminar el usuario del sistema de Auth usando una función RPC
    const { error: rpcError } = await client.rpc('eliminar_usuario_auth', { user_id: userId });

    // Luego eliminamos su perfil de la base de datos pública
    const { error } = await client.from('perfiles').delete().eq('id', userId);

    if (error && error.code !== 'PGRST116') throw error;
    if (rpcError) console.warn("No se pudo eliminar de Auth, pero sí del perfil:", rpcError);

    showFeedback('Usuario Eliminado', 'El perfil de usuario ha sido eliminado correctamente.', '✅');
    renderUsuarios();
  } catch (err) {
    showFeedback('Error', 'No se pudo eliminar el usuario: ' + err.message, '❌');
  }
}

async function cambiarRolUsuario(userId, nuevoRol) {
  const session = window.sgiAdminSession || {};
  // Allow both admin and superadmin to change roles
  if (session.type !== 'superadmin' && session.type !== 'admin') {
    showFeedback('Acceso Denegado', 'Solo los administradores pueden gestionar roles de usuario.', '🔒');
    return;
  }
  const rolLabel = { admin: 'Administrador', tecnico: 'Técnico', usuario: 'Usuario' }[nuevoRol] || nuevoRol;
  const ok = await customConfirm(
    'Cambiar rol de usuario',
    `¿Confirmas el cambio de rol a "${rolLabel}"? El usuario recibirá los nuevos permisos de inmediato.`,
    '🛡️'
  );
  if (!ok) return;

  try {
    const client = window.supabaseClient;
    const { error } = await client.from('perfiles').update({ rol: nuevoRol }).eq('id', userId);
    if (error) throw error;
    renderUsuarios();
  } catch (err) {
    showFeedback('Error de permisos', 'No se ha podido cambiar el rol: ' + err.message, '❌');
  }
}

// ── Utilidades de Red (Supabase Wrapper) ──────────────────────────────────────
function isAdminLoggedIn() {
  return localStorage.getItem('sgi_admin_session') !== null;
}

async function apiFetch(url, options = {}) {
  const method = options.method || 'GET';
  const payload = options.body;
  const client = window.supabaseClient;

  if (!isAdminLoggedIn() && url !== '/api/login-admin') {
    return { ok: false, error: 'No autorizado' };
  }

  try {
    if (url === '/api/login-admin') {
      return { ok: isAdminLoggedIn() };
    }

    if (url.includes('/api/all-data')) {
      const [salas, equipos, registros] = await Promise.all([
        client.from('salas').select('*').order('nombre'),
        client.from('equipos').select('*, salas(nombre)').order('nombre'),
        client.from('registros').select('*').order('timestamp', { ascending: false }).limit(500)
      ]);

      if (salas.error) throw salas.error;
      if (equipos.error) throw equipos.error;
      if (registros.error) throw registros.error;

      const regs = registros.data || [];
      const formattedMaquinas = (equipos.data || []).map(m => {
        const frec = m.frecuencia_dias || 7;
        let estadoMant = 'pendiente';
        if (m.ultimo_mantenimiento) {
          const dif = (new Date() - new Date(m.ultimo_mantenimiento)) / (1000 * 60 * 60 * 24);
          if (dif > frec) estadoMant = 'vencido'; else if (dif > frec * 0.8) estadoMant = 'proximo'; else estadoMant = 'ok';
        }
        return { ...m, sala_nombre: m.salas ? m.salas.nombre : 'Sin sala', estado_mantenimiento: estadoMant };
      });

      const porDiaMap = {}; const porMaquinaMap = {};
      regs.forEach(r => {
        if (r.timestamp) {
          const dia = r.timestamp.split('T')[0];
          porDiaMap[dia] = (porDiaMap[dia] || 0) + 1;
        }
        if (r.maquina_nombre) {
          porMaquinaMap[r.maquina_nombre] = (porMaquinaMap[r.maquina_nombre] || 0) + 1;
        }
      });

      return {
        ok: true,
        data: {
          salas: salas.data,
          maquinas: formattedMaquinas,
          historial: regs.map(r => ({
            id: r.id,
            maquina: r.maquina_nombre || 'Desconocida',
            sala: r.sala_nombre || 'Sin sala',
            operario: r.operario_nombre || 'Anónimo',
            iniciado_en: r.timestamp,
            completado_en: r.timestamp,
            observaciones: r.notas || '',
            tipo: r.tipo,
            resuelta: r.resuelta || false,
            en_seguimiento: r.en_seguimiento || false,
            comentario_resolucion: r.comentario_resolucion,
            fotos: r.photos || [],
            tiene_fotos: (r.photos && r.photos.length > 0)
          })),
          dashboard: {
            hoy: regs.filter(r => r.timestamp && r.timestamp.startsWith(new Date().toISOString().split('T')[0])).length,
            semana: regs.filter(r => r.timestamp && new Date(r.timestamp) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
            pendientes: formattedMaquinas.filter(m => m.estado_mantenimiento === 'vencido' || m.estado_mantenimiento === 'pendiente').length,
            proximos: formattedMaquinas.filter(m => m.estado_mantenimiento === 'proximo').length,
            porDia: Object.entries(porDiaMap).map(([dia, total]) => ({ dia, total })).sort((a, b) => a.dia.localeCompare(b.dia)),
            porMaquina: Object.entries(porMaquinaMap).map(([nombre, total_sesiones]) => ({ nombre, total_sesiones })).sort((a, b) => b.total_sesiones - a.total_sesiones)
          }
        }
      };
    }

    if (url.includes('/api/maquinas') && method === 'POST') {
      const { data, error } = await client.from('equipos').insert(payload).select().single();
      if (error) throw error; return { ok: true, data };
    }

    if (url.includes('/api/maquina/') && !url.includes('/qr')) {
      const id = url.split('/')[3];
      if (method === 'PUT') { await client.from('equipos').update(payload).eq('id', id); return { ok: true }; }
      if (method === 'DELETE') { await client.from('equipos').delete().eq('id', id); return { ok: true }; }
    }

    if (url.includes('/api/historial')) {
      const searchParams = new URL(url, window.location.origin).searchParams;
      let query = client.from('registros').select('*');
      if (searchParams.get('sala_id')) query = query.eq('sala_id', searchParams.get('sala_id'));
      if (searchParams.get('maquina_id')) query = query.eq('maquina_id', searchParams.get('maquina_id'));
      if (searchParams.get('operario_nombre')) query = query.ilike('operario_nombre', `%${searchParams.get('operario_nombre')}%`);
      if (searchParams.get('desde')) query = query.gte('timestamp', searchParams.get('desde'));
      if (searchParams.get('hasta')) query = query.lte('timestamp', searchParams.get('hasta') + 'T23:59:59');
      const { data, error } = await query.order('timestamp', { ascending: false });
      if (error) throw error;
      return { ok: true, data: (data || []).map(r => ({ id: r.id, maquina: r.maquina_nombre, sala: r.sala_nombre, operario: r.operario_nombre, iniciado_en: r.timestamp, completado_en: r.timestamp, observaciones: r.notas || '', tipo: r.tipo, resuelta: r.resuelta || false, fotos: r.photos || [], tiene_fotos: (r.photos && r.photos.length > 0) })) };
    }

    if (url.includes('/api/sesion/') && method === 'DELETE') {
      const id = url.split('/')[3];
      const { error } = await client.from('registros').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    }

    if (url.includes('/api/sesion/') && url.includes('/resolver')) {
      const id = url.split('/')[3];
      const { error } = await client.from('registros').update({
        resuelta: payload.resuelta,
        comentario_resolucion: payload.comentario_resolucion
      }).eq('id', id);
      if (error) throw error;
      return { ok: true };
    }

    if (url.includes('/api/sesion/') && url.includes('/detalle')) {
      const id = url.split('/')[3];
      const { data: reg, error } = await client.from('registros').select('*').eq('id', id).single();
      if (error) throw error;
      return { ok: true, data: { sesion: { id: reg.id, maquina: reg.maquina_nombre, sala: reg.sala_nombre, operario: reg.operario_nombre, iniciado_en: reg.timestamp, completado_en: reg.timestamp, observaciones: reg.notas || '', tipo: reg.tipo, resuelta: reg.resuelta || false, comentario_resolucion: reg.comentario_resolucion, fotos: reg.photos || [] }, items: [] } };
    }

    if (url.includes('/api/incidencia/') && url.includes('/seguimientos')) {
      const id = url.split('/')[3];
      if (method === 'GET') {
        const { data, error } = await client
          .from('seguimientos')
          .select('*')
          .eq('incidencia_id', id)
          .order('timestamp', { ascending: true });

        if (error) {
          console.warn('Tabla seguimientos no encontrada o error:', error);
          return { ok: true, data: [] };
        }
        return { ok: true, data };
      }

      if (method === 'POST') {
        const { data, error } = await client
          .from('seguimientos')
          .insert({
            incidencia_id: id,
            nota: payload.nota,
            usuario_nombre: 'Administrador',
            timestamp: new Date().toISOString()
          })
          .select()
          .single();

        // Actualizar automáticamente a "en seguimiento" si no estaba resuelta
        await client.from('registros').update({ en_seguimiento: true }).eq('id', id);

        if (error) throw error;
        return { ok: true, data };
      }
    }

    if (url.includes('/api/incidencia/') && url.includes('/editar')) {
      const id = url.split('/')[3];
      const { error } = await client.from('registros').update({ notas: payload.notas }).eq('id', id);
      if (error) throw error;
      return { ok: true };
    }

    return { ok: false, error: 'Endpoint not implemented' };
  } catch (err) {
    console.error('🔴 Error apiFetch:', err);
    // Si es un error de columna faltante, dar una pista clara
    if (err.message && err.message.includes('maquina_nombre')) {
      showFeedback('Error Crítico', "La base de datos no tiene la columna 'maquina_nombre'. Por favor, ejecuta el script SQL de reparación.", '🚨');
    }
    return { ok: false, error: err.message };
  }
}

async function intentarLogin() {
  const usernameInput = document.getElementById('adminUsernameInput');
  const passwordInput = document.getElementById('adminPinInput');
  const errorEl = document.getElementById('loginError');
  const card = document.getElementById('loginCard');
  const btn = document.getElementById('btnLoginAdmin');

  const username = (usernameInput?.value || '').trim();
  const password = (passwordInput?.value || '').trim();

  if (!username || !password) {
    errorEl.innerHTML = '⚠️ Introduce usuario y contraseña.';
    return;
  }

  errorEl.innerHTML = 'Verificando...';
  if (btn) btn.disabled = true;

  // 1. Superadmin (Credenciales específicas del usuario)
  if (username === 'adestacion' && password === '') {
    const sessionData = {
      type: 'superadmin',
      username: 'adestacion',
      nombre: 'Administrador Principal',
      loginTime: new Date().getTime()
    };
    localStorage.setItem('sgi_admin_session', JSON.stringify(sessionData));
    location.reload();
    return;
  }

  // 2. Supabase Auth + verificar rol admin en tabla perfiles
  try {
    const client = window.supabaseClient;
    if (!client) throw new Error('Sin conexión al servidor');

    const { data, error } = await client.auth.signInWithPassword({
      email: username,
      password: password
    });
    if (error) throw error;

    let perfil = null;
    try {
      const { data: p } = await client.from('perfiles').select('*').eq('id', data.user.id).single();
      perfil = p;
    } catch (e) { console.warn('Perfil no encontrado:', e.message); }

    const rol = perfil?.rol || 'usuario';
    if (rol !== 'admin' && rol !== 'tecnico') {
      await client.auth.signOut();
      throw new Error('No tienes permisos de administrador o técnico.');
    }

    localStorage.setItem('sgi_admin_session', JSON.stringify({
      type: rol,
      userId: data.user.id,
      email: data.user.email,
      nombre: perfil?.nombre || data.user.email
    }));
    localStorage.removeItem('admin_pin');
    location.reload();

  } catch (err) {
    console.error('Login error:', err);
    const msg = err.message?.includes('permisos') ? `❌ ${err.message}` : '❌ Credenciales incorrectas.';
    errorEl.innerHTML = msg;
    card?.classList.add('shake');
    setTimeout(() => card?.classList.remove('shake'), 400);
    if (btn) btn.disabled = false;
  }
}

function cerrarSesionAdmin() {
  localStorage.removeItem('sgi_admin_session');
  localStorage.removeItem('admin_pin');
  if (window.supabaseClient) window.supabaseClient.auth.signOut();
  location.reload();
}
function abrirModal(id) { document.getElementById(id)?.classList.add('open'); }
function cerrarModal(id) { document.getElementById(id)?.classList.remove('open'); }
function abrirLightbox(src) {
  const existing = document.getElementById('lightbox-overlay');
  if (existing) existing.remove();

  // Outer overlay (never scrolls)
  const lb = document.createElement('div');
  lb.id = 'lightbox-overlay';
  lb.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;cursor:default';

  // Inner scrollable viewport (only this scrolls)
  const viewport = document.createElement('div');
  viewport.id = 'lightbox-viewport';
  viewport.style.cssText = 'flex:1;overflow:hidden;display:flex;align-items:center;justify-content:center;box-sizing:border-box';

  // Inject wider scrollbar style scoped to this viewport
  const scrollStyle = document.createElement('style');
  scrollStyle.id = 'lightbox-scrollbar-style';
  scrollStyle.textContent = `
    #lightbox-viewport::-webkit-scrollbar { width: 12px; height: 12px; }
    #lightbox-viewport::-webkit-scrollbar-track { background: rgba(255,255,255,0.08); border-radius: 6px; }
    #lightbox-viewport::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.45); border-radius: 6px; border: 2px solid transparent; background-clip: padding-box; }
    #lightbox-viewport::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.7); border-radius: 6px; border: 2px solid transparent; background-clip: padding-box; }
    #lightbox-viewport { scrollbar-width: auto; scrollbar-color: rgba(255,255,255,0.45) rgba(255,255,255,0.08); }
  `;
  document.head.appendChild(scrollStyle);

  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'display:block;max-width:100%;max-height:100%;object-fit:contain;cursor:zoom-in';

  viewport.appendChild(img);

  // Bottom bar with controls
  const bar = document.createElement('div');
  bar.style.cssText = 'flex-shrink:0;display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(0,0,0,0.7);padding:10px 16px';

  function mkBtn(html, title) {
    const b = document.createElement('button');
    b.innerHTML = html;
    b.title = title;
    b.style.cssText = 'background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:8px;padding:6px 14px;font-size:18px;cursor:pointer;line-height:1';
    return b;
  }

  const btnZoomIn  = mkBtn('🔍+', 'Ampliar');
  const btnZoomOut = mkBtn('🔍−', 'Reducir');
  const btnClose   = document.createElement('button');
  btnClose.innerHTML = '✕&nbsp;Cerrar';
  btnClose.style.cssText = 'background:#fff;border:none;color:#111;border-radius:8px;padding:7px 18px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);margin-left:8px';

  bar.appendChild(btnZoomOut);
  bar.appendChild(btnZoomIn);
  bar.appendChild(btnClose);

  lb.appendChild(viewport);
  lb.appendChild(bar);
  document.body.appendChild(lb);

  let scale = 1;
  const FIT = 1; // we'll set to fitScale after load

  function fitScale() {
    return Math.min(1,
      viewport.clientWidth  / img.naturalWidth,
      viewport.clientHeight / img.naturalHeight
    );
  }

  function applyZoom(newScale, focalX, focalY) {
    const oldScale = scale;
    scale = Math.max(fitScale() * 0.9, Math.min(8, newScale));
    const w = Math.round(img.naturalWidth  * scale);
    const h = Math.round(img.naturalHeight * scale);

    if (scale <= fitScale() * 1.01) {
      // Fit mode: centered, no scroll
      viewport.style.overflow       = 'hidden';
      viewport.style.alignItems     = 'center';
      viewport.style.justifyContent = 'center';
      img.style.width     = '';
      img.style.height    = '';
      img.style.maxWidth  = '100%';
      img.style.maxHeight = '100%';
      img.style.margin    = '';
      img.style.cursor    = 'zoom-in';
    } else {
      // Zoomed mode: scrollable
      const wasZoomed = oldScale > fitScale() * 1.01;

      // Capture focal ratio BEFORE resize
      let ratioX = 0.5, ratioY = 0.5;
      if (wasZoomed && focalX !== undefined) {
        // focal is in viewport client coords
        const cx = focalX - viewport.getBoundingClientRect().left;
        const cy = focalY - viewport.getBoundingClientRect().top;
        const totalW = img.naturalWidth  * oldScale;
        const totalH = img.naturalHeight * oldScale;
        const marginX = Math.max(0, (viewport.clientWidth  - totalW) / 2);
        const marginY = Math.max(0, (viewport.clientHeight - totalH) / 2);
        ratioX = (viewport.scrollLeft + cx - marginX) / totalW;
        ratioY = (viewport.scrollTop  + cy - marginY) / totalH;
      } else if (!wasZoomed) {
        // Coming from fit: keep center
        ratioX = 0.5; ratioY = 0.5;
      } else {
        // No focal: keep current center of viewport
        const totalW = img.naturalWidth  * oldScale;
        const totalH = img.naturalHeight * oldScale;
        const marginX = Math.max(0, (viewport.clientWidth  - totalW) / 2);
        const marginY = Math.max(0, (viewport.clientHeight - totalH) / 2);
        ratioX = (viewport.scrollLeft + viewport.clientWidth  / 2 - marginX) / totalW;
        ratioY = (viewport.scrollTop  + viewport.clientHeight / 2 - marginY) / totalH;
      }

      viewport.style.overflow       = 'auto';
      viewport.style.alignItems     = 'flex-start';
      viewport.style.justifyContent = 'flex-start';
      img.style.maxWidth  = 'none';
      img.style.maxHeight = 'none';
      img.style.width     = w + 'px';
      img.style.height    = h + 'px';
      img.style.margin    = '0 auto';
      img.style.cursor    = 'zoom-out';

      requestAnimationFrame(() => {
        const newMarginX = Math.max(0, (viewport.clientWidth  - w) / 2);
        const newMarginY = Math.max(0, (viewport.clientHeight - h) / 2);
        const cx = focalX !== undefined ? focalX - viewport.getBoundingClientRect().left : viewport.clientWidth  / 2;
        const cy = focalY !== undefined ? focalY - viewport.getBoundingClientRect().top  : viewport.clientHeight / 2;
        viewport.scrollLeft = newMarginX + ratioX * w - cx;
        viewport.scrollTop  = newMarginY + ratioY * h - cy;
      });
    }
  }

  img.addEventListener('load', () => applyZoom(fitScale()), { once: true });
  if (img.complete && img.naturalWidth) applyZoom(fitScale());

  // Click image: toggle fit ↔ 100%
  img.addEventListener('click', e => {
    e.stopPropagation();
    applyZoom(scale <= fitScale() * 1.01 ? 1 : fitScale(), e.clientX, e.clientY);
  });

  btnZoomIn.addEventListener('click',  e => { e.stopPropagation(); applyZoom(scale * 1.5); });
  btnZoomOut.addEventListener('click', e => { e.stopPropagation(); applyZoom(scale / 1.5); });
  btnClose.addEventListener('click', closeLb);

  lb.addEventListener('click', e => { if (e.target === lb || e.target === viewport) closeLb(); });

  function escHandler(e) { if (e.key === 'Escape') closeLb(); }
  document.addEventListener('keydown', escHandler);

  function closeLb() {
    lb.remove();
    document.getElementById('lightbox-scrollbar-style')?.remove();
    document.removeEventListener('keydown', escHandler);
  }
}

function formatFechaHora(str) { if (!str) return '–'; const d = new Date(str); return d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); }

function formatFechaDia(str) { if (!str) return '–'; const [y, m, d] = str.split('-'); return `${d}/${m}`; }
function truncate(str, len) { return str.length > len ? str.slice(0, len) + '…' : str; }
function escapar(str) { return String(str).replace(/'/g, "\\'"); }
async function recargarTodo() { await cargarDatosBase(); }

document.querySelectorAll('.overlay').forEach(ov => ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); }));

function iniciarTour() {
  const driverInstance = window.driver?.js?.driver || window.driver;
  if (!driverInstance) return;

  const driverObj = driverInstance({
    showProgress: true,
    animate: true,
    steps: [
      {
        popover: {
          title: '✨ Bienvenido',
          description: 'Recorrido rápido por el panel de administración del sistema.'
        },
        onHighlightStarted: () => navigateTo('dashboard')
      },
      {
        element: '#kpiGrid',
        popover: {
          title: '📊 Resumen General',
          description: 'Aquí verás el estado actual del sistema en tiempo real.'
        },
        onHighlightStarted: () => navigateTo('dashboard')
      },
      {
        element: '#nav-maquinas',
        popover: {
          title: '🖨️ Máquinas',
          description: 'Gestiona todo tu inventario de impresoras y su estado.'
        }
      },
      {
        element: '#gridQRs',
        popover: {
          title: '📱 Códigos QR',
          description: 'Desde aquí generas los códigos para que los operarios escaneen con su móvil.'
        },
        onHighlightStarted: () => {
          navigateTo('qrcodes');
          // Esperamos a que la sección sea visible y se renderice el contenido para re-enfocar
          setTimeout(() => {
            if (driverObj.refresh) driverObj.refresh();
          }, 400);
        }
      },
      {
        element: '#nav-historial',
        popover: {
          title: '📋 Historial',
          description: 'Accede a todos los registros de mantenimiento e incidencias pasadas.'
        },
        onHighlightStarted: () => navigateTo('historial')
      }
    ]
  });
  driverObj.drive();
}

// ── Gestión de Salas ────────────────────────────────────────────────────────
function abrirModalGestionSalas() {
  abrirModal('modalGestionSalas');
  renderListaSalas();
}

function renderListaSalas() {
  const tbody = document.getElementById('listaSalasGestion');
  if (!tbody) return;

  if (datosSalas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:20px;color:var(--text-muted)">No hay salas creadas.</td></tr>';
    return;
  }

  tbody.innerHTML = datosSalas.map(s => `
    <tr>
      <td style="padding:10px">
        <input type="text" class="form-control" value="${s.nombre}" 
          style="padding:4px 8px; font-weight:600; background:transparent"
          onchange="editarSala('${s.id}', this.value)"
        >
      </td>
      <td style="padding:10px;text-align:right">
        <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:rgba(239,68,68,0.2);font-weight:bold" 
          onclick="borrarSala('${s.id}', '${s.nombre}')">
          ✕
        </button>
      </td>
    </tr>
  `).join('');
}

async function editarSala(id, nuevoNombre) {
  if (rolActual !== 'admin') {
    showFeedback('Acceso denegado', 'Solo los administradores pueden editar salas.', '🔒');
    return;
  }
  if (!nuevoNombre.trim()) return;
  try {
    const { error } = await window.supabaseClient
      .from('salas')
      .update({ nombre: nuevoNombre })
      .eq('id', id);

    if (error) throw error;
    await recargarTodo();
    poblarSelectsSalas();
  } catch (err) {
    console.error("Error al editar sala:", err);
  }
}

async function crearSala() {
  if (rolActual !== 'admin') {
    showFeedback('Acceso denegado', 'Solo los administradores pueden crear salas.', '🔒');
    return;
  }
  const input = document.getElementById('nuevaSalaNombre');
  const nombre = input.value.trim();
  if (!nombre) return showFeedback('Nombre requerido', "Debes escribir un nombre para la nueva sala.", '⚠️');

  try {
    const { data, error } = await window.supabaseClient
      .from('salas')
      .insert([{ nombre }])
      .select();

    if (error) throw error;

    input.value = '';
    await recargarTodo();
    renderListaSalas();
    poblarSelectsSalas();
    showFeedback('Sala creada', 'La nueva sala se ha registrado correctamente en el sistema.', '✅');
  } catch (err) {
    showFeedback('Error al crear', "No se ha podido registrar la sala en la base de datos.", '❌');
  }
}

async function borrarSala(id, nombre) {
  if (rolActual !== 'admin') {
    showFeedback('Acceso denegado', 'Solo los administradores pueden eliminar salas.', '🔒');
    return;
  }
  const maquinasEnSala = datosMaquinas.filter(m => m.sala_id === id);
  if (maquinasEnSala.length > 0) {
    return showFeedback('Sala con Máquinas', `No puedes borrar la sala "${nombre}" porque tiene ${maquinasEnSala.length} máquinas asociadas.`, '⚠️');
  }

  try {
    const { error } = await window.supabaseClient
      .from('salas')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await recargarTodo();
    renderListaSalas();
    poblarSelectsSalas();
  } catch (err) {
    console.error("Error al borrar sala:", err);
  }
}

function poblarSelectsSalas() {
  ['filtroSalaMaquinas', 'filtroSala', 'filtroSalaQR', 'nuevoMaquinaSala'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const currentVal = el.value;
    if (id !== 'nuevoMaquinaSala') {
      el.innerHTML = '<option value="">Todas las salas</option>';
    } else {
      el.innerHTML = '<option value="">Seleccione una sala...</option>';
    }
    datosSalas.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.nombre;
      el.appendChild(opt);
    });
    el.value = currentVal;
  });
}

// ── Helpers de UI (Nuevos) ───────────────────────────────────────────────────
function customConfirm(titulo, msg, icon = '⚠️') {
  return new Promise((resolve) => {
    document.getElementById('confirmTitle').textContent = titulo;
    document.getElementById('confirmMsg').textContent = msg;
    document.getElementById('confirmIcon').textContent = icon;
    abrirModal('modalConfirm');

    window.confirmResolve = () => {
      cerrarModal('modalConfirm');
      resolve(true);
    };
    window.confirmReject = () => {
      cerrarModal('modalConfirm');
      resolve(false);
    };
  });
}

function customPrompt(titulo, label, defaultValue = '') {
  return new Promise((resolve) => {
    document.getElementById('promptTitle').textContent = titulo;
    document.getElementById('promptLabel').textContent = label;
    const input = document.getElementById('promptInput');
    input.value = defaultValue;

    abrirModal('modalPrompt');
    setTimeout(() => input.focus(), 100);

    window.promptResolve = () => {
      const val = input.value.trim();
      cerrarModal('modalPrompt');
      resolve(val);
    };

    window.promptReject = () => {
      cerrarModal('modalPrompt');
      resolve(null);
    };
  });
}

function showFeedback(titulo, msg, icon = '✅') {
  document.getElementById('feedbackTitle').textContent = titulo;
  document.getElementById('feedbackMsg').textContent = msg;
  document.getElementById('feedbackIcon').textContent = icon;
  abrirModal('modalFeedback');
}
