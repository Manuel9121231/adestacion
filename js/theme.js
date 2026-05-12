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

  // Inicializar: cargar tema guardado o usar claro por defecto
  document.addEventListener('DOMContentLoaded', () => {
    // Cargar tema guardado desde localStorage
    const savedTheme = localStorage.getItem('sgi_theme');
    const isDark = savedTheme === 'dark';
    
    if (document.body) {
      if (isDark) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    }

    const btn = document.getElementById('btnThemeToggle');
    if (btn) {
      btn.innerHTML = isDark ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
    }
  });
})();
