(function() {
  // Definir función global primero (antes de cualquier operación que pueda fallar)
  window.toggleTheme = function() {
    const isDark = document.body.classList.toggle('dark-mode');
    const newTheme = isDark ? 'dark' : 'light';
    localStorage.setItem('sgi_theme', newTheme);

    // Actualizar texto del botón si existe
    const btn = document.getElementById('btnThemeToggle');
    if (btn) {
      btn.innerHTML = isDark ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
    }
  };

  // Inicializar: SIEMPRE claro por defecto (ignorar localStorage para el inicio)
  // Solo aplicar modo oscuro si el usuario EXPLICITAMENTE lo activó en esta sesión
  document.addEventListener('DOMContentLoaded', () => {
    // Siempre iniciar en modo claro (eliminar dark-mode si existe)
    if (document.body) {
      document.body.classList.remove('dark-mode');
    }

    const btn = document.getElementById('btnThemeToggle');
    if (btn) {
      btn.innerHTML = '🌙 Modo Oscuro';
    }
  });
})();
