$path = "c:\Users\holamundo\Documents\GitHub\adestacion\js\admin.js"
$lines = Get-Content $path
$lines[928] = '          <div class="info-label">${isInc ? "🚩 Descripción del Fallo" : "📝 Tareas Realizadas"}</div>'
$lines[941] = '          <div class="info-label">🖼️ Evidencias Fotográficas (${sesion.fotos?.length || 0})</div>'
$lines[947] = '                  <div class="gallery-overlay"><span class="icon">🔍</span></div>'
Set-Content $path $lines -Encoding UTF8
