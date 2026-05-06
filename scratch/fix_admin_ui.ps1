$path = "c:\Users\holamundo\Documents\GitHub\adestacion\js\admin.js"
$lines = Get-Content $path
$startLine = 897 # Line 898 is index 897
$endLine = 967 # Line 968 is index 967

$newContent = @"
  container.innerHTML = `
    <div class="detail-modern">
      <!-- Cabecera de Estado -->
      <div class="detail-hero" style="background: ${isInc ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)'}; border-left: 4px solid ${isInc ? 'var(--danger)' : 'var(--success)'}">
        <div class="detail-hero-content">
          <div class="hero-icon">${isInc ? '🚨' : '🔧'}</div>
          <div>
            <h2 class="hero-title">${sesion.maquina}</h2>
            <div class="hero-subtitle">📍 ${sesion.sala} · ${formatFechaHora(sesion.completado_en)}</div>
          </div>
        </div>
        <div class="hero-badges">
          <span class="badge ${isInc ? 'badge-danger' : 'badge-success'}">${isInc ? 'INCIDENCIA' : 'MANTENIMIENTO'}</span>
          ${isInc ? `<span class="badge ${resuelta ? 'badge-success' : 'badge-warning'}">${resuelta ? 'RESUELTA' : 'PENDIENTE'}</span>` : ''}
        </div>
      </div>

      <div class="detail-grid">
        <!-- Información del Operario -->
        <div class="detail-info-card">
          <div class="info-label">👷 Responsable del Reporte</div>
          <div class="info-value">${sesion.operario}</div>
        </div>

        <!-- Descripción / Notas -->
        <div class="detail-info-card full-width">
          <div class="info-label">${isInc ? '🚩 Descripción del Fallo' : '📝 Tareas Realizadas'}</div>
          <div class="info-notes">${sesion.observaciones || 'Sin observaciones registradas.'}</div>
        </div>

        ${sesion.comentario_resolucion ? `
        <div class="detail-info-card full-width resolution">
          <div class="info-label">✅ Resolución Técnica</div>
          <div class="info-notes">${sesion.comentario_resolucion}</div>
        </div>
        ` : ''}

        <!-- Fotos / Evidencias -->
        <div class="detail-info-card full-width">
          <div class="info-label">🖼️ Evidencias Fotográficas (${sesion.fotos?.length || 0})</div>
          ${sesion.fotos && sesion.fotos.length > 0 ? `
            <div class="detail-gallery">
              ${sesion.fotos.map(f => `
                <div class="gallery-item" onclick="window.open('${f}')">
                  <img src="${f}" loading="lazy">
                  <div class="gallery-overlay"><span class="icon">🔍</span></div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="empty-gallery">No se adjuntaron fotos en este reporte</div>
          `}
        </div>
      </div>

      <!-- Acciones de Gestión -->
      <div class="detail-actions">
        <div class="management-buttons">
          ${isInc && !resuelta ? `
            <button class="btn btn-primary" onclick="toggleResolucionIncidencia('${sesion.id}', true)">
              <span>✅ Marcar como Resuelta</span>
            </button>
            <button class="btn btn-outline" onclick="editarDescripcionIncidencia('${sesion.id}')">
              <span>✏️ Editar Descripción</span>
            </button>
          ` : ''}
        </div>
        <div class="secondary-buttons">
          <button class="btn btn-outline btn-sm" onclick="cerrarModal('modalDetalle'); verHistorialMaquina('${sesion.maquina}')">
            <span>📋 Historial de la Máquina</span>
          </button>
          <button class="btn btn-danger btn-sm" onclick="eliminarIncidencia('${sesion.id}')" title="Eliminar este registro">
            <span>🗑️ Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  `;
"@

$finalLines = $lines[0..($startLine-1)]
$finalLines += $newContent -split "`r`n"
$finalLines += $lines[($endLine+1)..($lines.Length-1)]

Set-Content -Path $path -Value $finalLines -Encoding UTF8
