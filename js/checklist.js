'use strict';

// ── Estado global ─────────────────────────────────────────────────────────────
let maquinaId = null;
let maquinaData = null;
let operarioData = null;
let sesionId = null;
let pinBuffer = '';
let modoActual = 'Mantenimiento'; // 'Mantenimiento' o 'Incidencia'
let selectedPhotos = [];

// ── Arranque ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  maquinaId = urlParams.get('maquinaId');
  console.log("ID de máquina recibido de la URL:", maquinaId);

  // --- VERIFICACIÓN DE SESIÓN ---
  const client = window.supabaseClient;
  const { data: { session } } = await client.auth.getSession();
  
  if (!session) {
    console.warn("Usuario no autenticado. Redirigiendo a login...");
    window.location.href = 'registro.html?redirect=operario.html' + (maquinaId ? '?maquinaId=' + maquinaId : '');
    return;
  }
  
  // Guardar datos del usuario logueado
  operarioData = {
    id: session.user.id,
    email: session.user.email,
    nombre: session.user.user_metadata?.nombre || session.user.email
  };

  if (!maquinaId) {
    showError('No se especificó ninguna máquina en la URL. Escanea el código QR de nuevo.');
    return;
  }

  try {
    const client = window.supabaseClient;
    console.log("Buscando máquina en Supabase con criterio:", maquinaId);
    
    // Búsqueda ESTRICTA solo por ID (UUID)
    let { data: maquina, error: mError } = await client
      .from('equipos')
      .select('*, salas(nombre)')
      .eq('id', maquinaId)
      .maybeSingle();
    
    if (mError && !maquina) {
      console.error("Error inicial de Supabase:", mError);
    }

    if (!maquina) {
      console.warn("No se encontró ninguna coincidencia para:", maquinaId);
      showError('No existe ninguna impresora con el ID o Nombre: "' + maquinaId + '". Verifica que esté registrada en el Panel de Administrador.');
      return;
    }

    console.log("Máquina cargada con éxito:", maquina);
    
    // Asignar datos de la máquina al estado global
    maquinaData = {
      ...maquina,
      id: maquina.id, 
      sala_nombre: maquina.salas ? maquina.salas.nombre : 'Sin sala'
    };
    maquinaId = maquinaData.id;

    // --- VERIFICACIÓN DE SEMÁFORO (INCIDENCIAS ABIERTAS) ---
    const { data: openInc, error: incError } = await client
      .from('registros')
      .select('id')
      .eq('maquina_id', maquinaId)
      .eq('tipo', 'Incidencia')
      .eq('resuelta', false)
      .limit(1);

    const banner = document.getElementById('statusBanner');
    const icon = document.getElementById('statusIcon');
    const text = document.getElementById('statusText');
    const maintCard = document.querySelector('.portal-card.maintenance');

    if (openInc && openInc.length > 0) {
      banner.className = 'status-banner status-repair';
      icon.textContent = '🔴';
      text.textContent = 'Máquina en Reparación / Parada';
      // Bloqueamos visualmente el mantenimiento preventivo
      if (maintCard) {
        maintCard.style.opacity = '0.4';
        maintCard.style.pointerEvents = 'none';
        maintCard.innerHTML += '<div style="font-size:10px; color:var(--accent-inc); margin-top:5px; font-weight:700;">⚠️ BLOQUEADO POR INCIDENCIA</div>';
      }
    } else {
      banner.className = 'status-banner status-operative';
      icon.textContent = '🟢';
      text.textContent = 'Máquina Operativa';
    }

    // Mostrar datos del usuario
    const dispName = document.getElementById('displayUserName');
    const dispEmail = document.getElementById('displayUserEmail');
    if (dispName) dispName.textContent = operarioData.nombre;
    if (dispEmail) dispEmail.textContent = operarioData.email;
    
    // Sincronizar inputs ocultos para compatibilidad
    if (document.getElementById('userNameInput')) document.getElementById('userNameInput').value = operarioData.nombre;
    if (document.getElementById('userEmailInput')) document.getElementById('userEmailInput').value = operarioData.email;

    // Verificar rol para mostrar botón Admin
    try {
      const { data: perfil } = await client.from('perfiles').select('rol').eq('id', operarioData.id).single();
      const rol = perfil?.rol || 'usuario';
      if (rol === 'admin' || rol === 'tecnico') {
        const btnAdminHtml = `<button onclick="window.location.href='dashboard.html'" style="background:rgba(79, 142, 247, 0.1); border:1px solid var(--accent-maint); color:var(--accent-maint); padding:8px 12px; border-radius:10px; font-size:11px; font-weight:700; cursor:pointer; white-space: nowrap;">🛡️ Admin</button>`;
        const navContainer = document.getElementById('portalNavButtons');
        if (navContainer) navContainer.innerHTML += btnAdminHtml;
      }
    } catch(e) { console.warn("No se pudo verificar el rol:", e); }

    const pNm = document.getElementById('portalMaquinaNombre');
    const pSl = document.getElementById('portalMaquinaSala');
    if (pNm) pNm.textContent = maquinaData.nombre;
    if (pSl) pSl.textContent = maquinaData.sala_nombre;

    showScreen('portal');
  } catch (e) {
    showError('Error de conexión con el servidor: ' + e.message);
  }
});

// --- FUNCIONES ADICIONALES ---

async function cerrarSesionOperario() {
  const client = window.supabaseClient;
  if (client) {
    await client.auth.signOut();
  }
  localStorage.removeItem('sgi_admin_session');
  localStorage.removeItem('sgi_user_session');
  window.location.href = 'index.html';
}

// ── Navegación ────────────────────────────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
}

function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  showScreen('error');
}

function seleccionarModo(modo) {
  modoActual = modo === 'incidencia' ? 'Incidencia' : 'Mantenimiento';
  iniciarSesion();
}

function setOpTipo(tipo) {
  modoActual = tipo;
  const mCard = document.getElementById('op-tipo-maint');
  const iCard = document.getElementById('op-tipo-inc');
  
  if (tipo === 'Mantenimiento') {
    if (mCard) mCard.classList.add('active');
    if (iCard) iCard.classList.remove('active-inc');
  } else {
    if (mCard) mCard.classList.remove('active');
    if (iCard) iCard.classList.add('active-inc');
  }
}

// ── Reporte ───────────────────────────────────────────────────────────────────
async function iniciarSesion() {
  const res = await apiFetch('/api/sesion/iniciar', {
    method: 'POST',
    body: { maquina_id: maquinaId },
  });

  if (res.ok) {
    sesionId = res.data.sesion_id;
    document.getElementById('checkMaquinaNombre').textContent = maquinaData.nombre;
    document.getElementById('checkSalaNombre').textContent = maquinaData.sala_nombre;
    setOpTipo(modoActual);
    document.getElementById('reporteTextarea').value = '';
    document.getElementById('reporteError').style.display = 'none';
    actualizarBoton('');
    showScreen('checklist');
  } else {
    showError('Error al iniciar reporte');
  }
}

function onReporteChange() {
  const texto = document.getElementById('reporteTextarea').value;
  document.getElementById('reporteError').style.display = 'none';
  actualizarBoton(texto);
}

function actualizarBoton(texto) {
  const btn = document.getElementById('btnEnviar');
  const isValid = texto.trim().length > 0;
  
  if (isValid) {
    btn.className = 'btn-enviar activo';
    btn.textContent = '✅ Enviar informe';
    btn.disabled = false;
  } else {
    btn.className = 'btn-enviar bloqueado';
    btn.textContent = '✏️ Rellena el reporte para continuar';
    btn.disabled = true;
  }
}

// ── Gestión de Fotos ─────────────────────────────────────────────────────────
function onPhotoSelected() {
  const file = document.getElementById('photoInput').files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    selectedPhotos.push(e.target.result);
    renderPhotoPreviews();
  };
  reader.readAsDataURL(file);
  document.getElementById('photoInput').value = '';
}

function renderPhotoPreviews() {
  const grid = document.getElementById('photoPreviewsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  
  selectedPhotos.forEach((src, index) => {
    const container = document.createElement('div');
    container.style = "position:relative; width:80px; height:80px; flex-shrink:0";
    container.innerHTML = `
      <img src="${src}" style="width:100%; height:100%; object-fit:cover; border-radius:12px; border:2px solid var(--accent-maint)">
      <div onclick="removePhoto(${index})" style="position:absolute; top:-8px; right:-8px; background:var(--accent-inc); color:white; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; cursor:pointer; border:2px solid #0f0f1a">✕</div>
    `;
    grid.appendChild(container);
  });
  
  const text = document.getElementById('photoText');
  const icon = document.getElementById('photoIcon');
  if (selectedPhotos.length > 0) {
    if (text) text.textContent = `Añadir otra foto (${selectedPhotos.length})`;
    if (icon) icon.textContent = '📸';
  } else {
    if (text) text.textContent = 'Añadir foto de evidencia';
    if (icon) icon.textContent = '📷';
  }
}

function removePhoto(index) {
  selectedPhotos.splice(index, 1);
  renderPhotoPreviews();
}

async function enviarChecklist() {
  const reporte = document.getElementById('reporteTextarea').value.trim();

  if (reporte.length < 1) {
    document.getElementById('reporteError').style.display = 'block';
    return;
  }

  const btn = document.getElementById('btnEnviar');
  btn.disabled = true;
  btn.textContent = '⏳ Enviando reporte...';

  const res = await apiFetch(`/api/sesion/${sesionId}/completar`, {
    method: 'POST',
    body: { 
      observaciones: reporte,
      usuario_id: operarioData.id,
      nombre_usuario: operarioData.nombre, 
      email_usuario: operarioData.email,
      fotos: selectedPhotos 
    },
  });

  if (res.ok) {
    document.getElementById('exitoMaquina').textContent = maquinaData.nombre;
    document.getElementById('exitoOperario').textContent = operarioData.nombre;
    document.getElementById('exitoFecha').textContent = new Date().toLocaleString('es-ES');
    showScreen('exito');
  } else {
    btn.disabled = false;
    btn.className = 'btn-enviar activo';
    btn.textContent = '⚠️ Error al enviar. Reintentar';
    alert('Error: ' + (res.error || 'No se pudo enviar el informe'));
  }
}

function reiniciar() {
  sesionId = null;
  selectedPhotos = [];
  modoActual = 'Mantenimiento';
  const reportTxt = document.getElementById('reporteTextarea');
  if (reportTxt) reportTxt.value = '';
  const btn = document.getElementById('btnEnviar');
  if (btn) {
    btn.disabled = true;
    btn.className = 'btn-enviar bloqueado';
    btn.textContent = '✏️ Rellena el reporte para continuar';
  }
  const errDiv = document.getElementById('reporteError');
  if (errDiv) errDiv.style.display = 'none';
  renderPhotoPreviews();
  showScreen('portal');
}

async function handlePhotoUploads(base64Photos) {
  const client = window.supabaseClient;
  const urls = [];
  for (let i = 0; i < base64Photos.length; i++) {
    try {
      const b64 = base64Photos[i];
      const blob = await (await fetch(b64)).blob();
      const fileName = `${Date.now()}_${i}.jpg`;
      const { data, error } = await client.storage
        .from('photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });
      if (error) continue;
      const { data: { publicUrl } } = client.storage.from('photos').getPublicUrl(data.path);
      urls.push(publicUrl);
    } catch (e) {}
  }
  return urls;
}

async function apiFetch(url, options = {}) {
  const method = options.method || 'GET';
  const payload = options.body;
  const client = window.supabaseClient;

  try {
    if (url.includes('/api/sesion/iniciar')) {
      return { ok: true, data: { sesion_id: 'temp_sesion' } };
    }

    if (url.includes('/api/sesion/') && url.includes('/completar')) {
      let photoUrls = [];
      if (payload.fotos && payload.fotos.length > 0) {
        photoUrls = await handlePhotoUploads(payload.fotos);
      }

      const registroPayload = {
        maquina_id: maquinaId,
        usuario_id: payload.usuario_id,
        maquina_nombre: maquinaData?.nombre || 'Desconocida',
        sala_nombre: maquinaData?.sala_nombre || 'Sin sala',
        operario_nombre: payload.nombre_usuario || 'Anonimo', 
        operario_email: payload.email_usuario || 'desconocido@email.com',
        tipo: modoActual,
        notas: payload.observaciones,
        photos: photoUrls, 
        timestamp: new Date().toISOString()
      };

      const { data: registro, error: rError } = await client
        .from('registros')
        .insert(registroPayload)
        .select()
        .single();

      if (rError) throw rError;

      await client.from('equipos')
        .update({ ultimo_mantenimiento: new Date().toISOString() })
        .eq('id', maquinaId);

      return { ok: true, data: registro };
    }
    return { ok: false, error: 'Endpoint not implemented' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
