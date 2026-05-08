(function() {
  const theme = localStorage.getItem('sgi_theme') || 'light';
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  }

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

  // Inicializar botón al cargar el DOM
  document.addEventListener('DOMContentLoaded', () => {
    const isDark = document.body.classList.contains('dark-mode');
    const btn = document.getElementById('btnThemeToggle');
    if (btn) {
      btn.innerHTML = isDark ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
    }
  });
})();
