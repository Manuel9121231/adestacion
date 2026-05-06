$path = "c:\Users\holamundo\Documents\GitHub\adestacion\registro.html"
$lines = Get-Content $path
$startLine = 622 # Line 623 is index 622
$endLine = 626 # Line 627 is index 626

$newContent = @"
    // ─── Reenviar código ───
    async function reenviarCodigo() {
      const email = emailRegistro || localStorage.getItem('sgi_reg_email') || '';
      if (!email) return;

      try {
        const client = window.supabaseClient;
        await client.auth.resend({ type: 'signup', email });
        showMsg('msgOtp', '✅ Código reenviado. Revisa tu email.', 'success');
      } catch(e) {
        showMsg('msgOtp', '❌ No se pudo reenviar: ' + e.message);
      }
    }

    // ─── Inicio de sesión ───
    async function iniciarSesion() {
      const email = document.getElementById('loginEmail').value.trim();
      const pass = document.getElementById('loginPassword').value;
      const btn = document.getElementById('btnLogin');

      hideMsg('msgLogin');

      if (!email || !pass) return showMsg('msgLogin', '⚠️ Rellena todos los campos.');

      // 1. Verificar bloqueo local por tiempo de espera
      const blockTime = parseInt(localStorage.getItem('sgi_block_time') || '0');
      if (Date.now() < blockTime) {
        const remainingSecs = Math.ceil((blockTime - Date.now()) / 1000);
        const mins = Math.floor(remainingSecs / 60);
        const secs = remainingSecs % 60;
        return showMsg('msgLogin', "❌ Demasiados intentos. Espera " + mins + "m " + secs + "s para volver a probar.");
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Verificando...';

      try {
        const client = window.supabaseClient;
        if (!client) throw new Error('No se pudo conectar al servidor.');

        // 2. Intentar autenticación con Supabase
        const { data, error } = await client.auth.signInWithPassword({ email, password: pass });

        if (error) {
          // --- GESTIÓN DE ERRORES / INTENTOS FALLIDOS ---
          if (error.message?.includes('Invalid login') || error.message?.includes('credentials')) {
            let failedAttempts = parseInt(localStorage.getItem('sgi_failed_attempts') || '0') + 1;
            localStorage.setItem('sgi_failed_attempts', failedAttempts.toString());

            // Bloqueo temporal progresivo (5, 10, 15... min hasta 120)
            const waitMinutes = Math.min(failedAttempts * 5, 120);
            const newBlockTime = Date.now() + waitMinutes * 60 * 1000;
            localStorage.setItem('sgi_block_time', newBlockTime.toString());

            let errorMsg = "❌ Credenciales incorrectas. Intento " + failedAttempts + "/5.";
            
            // Bloqueo permanente al 5º intento
            if (failedAttempts >= 5) {
              errorMsg = '🚨 Cuenta bloqueada por seguridad. Contacta con un Administrador para desbloquearla.';
              // Marcar como inactivo en la base de datos (solo si el usuario existe)
              try {
                await client.from('perfiles').update({ activo: false }).eq('email', email);
              } catch(e) { console.warn('No se pudo bloquear en DB:', e.message); }
            } else {
              errorMsg += " Espera " + waitMinutes + " min para reintentar.";
            }
            
            throw new Error(errorMsg);
          }
          throw error;
        }

        // 3. Verificar si la cuenta está activa en la tabla perfiles
        const user = data.user;
        const { data: perfil, error: pError } = await client
          .from('perfiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (perfil && perfil.activo === false) {
          await client.auth.signOut();
          throw new Error('🚨 Tu cuenta está bloqueada. Contacta con un Administrador.');
        }

        // 4. ÉXITO: Resetear contadores y guardar sesión
        localStorage.removeItem('sgi_failed_attempts');
        localStorage.removeItem('sgi_block_time');

        const rol = perfil?.rol || 'usuario';
        const nombre = perfil?.nombre || user.email;

        localStorage.setItem('sgi_user_session', JSON.stringify({
          userId: user.id,
          email: user.email,
          nombre: nombre,
          rol: rol
        }));

        document.getElementById('loginWelcomeTitle').textContent = "👋 ¡Hola, " + nombre.split(' ')[0] + "!";

        if (rol === 'admin') {
          document.getElementById('loginWelcomeMsg').innerHTML =
            'Has iniciado sesión como <strong>Administrador</strong>. Puedes acceder al panel de administración.';
          document.getElementById('btnLoginRedirect').textContent = '🔐 Ir al Panel de Administración';
          document.getElementById('btnLoginRedirect').onclick = () => {
            localStorage.setItem('sgi_admin_session', JSON.stringify({
              type: 'admin', userId: user.id, email: user.email, nombre: nombre
            }));
            window.location.href = 'dashboard.html';
          };
        } else {
          document.getElementById('loginWelcomeMsg').innerHTML =
            "Tu cuenta está activa con rol <strong>" + rol + "</strong>. Un administrador puede asignarte más privilegios.";
          document.getElementById('btnLoginRedirect').textContent = '🏠 Ir al inicio';
          document.getElementById('btnLoginRedirect').onclick = () => window.location.href = 'index.html';
        }

        activarStep('panelLogin', 'loginStep2');

      } catch (err) {
        console.error(err);
        let msg = err.message || 'Error al iniciar sesión.';
        if (err.message?.includes('confirmed')) {
          msg = '⚠️ Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.';
        }
        showMsg('msgLogin', (msg.startsWith('❌') || msg.startsWith('🚨') ? msg : '❌ ' + msg));
      }

      btn.disabled = false;
      btn.innerHTML = '🔑 Iniciar Sesión';
    }
"@

$finalLines = $lines[0..($startLine-1)]
$finalLines += $newContent -split "`r`n"
$finalLines += $lines[($endLine+1)..($lines.Length-1)]

Set-Content -Path $path -Value $finalLines -Encoding UTF8
