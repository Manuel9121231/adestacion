-- =============================================================================
-- ESQUEMA DE BASE DE DATOS SQLITE - Sistema de Gestión de Máquinas
-- Migración desde Supabase
-- =============================================================================

-- =============================================================================
-- 1. TABLA: salas
-- Descripción: Almacena las salas o ubicaciones donde están los equipos
-- =============================================================================
CREATE TABLE IF NOT EXISTS salas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 2. TABLA: equipos (máquinas)
-- Descripción: Almacena la información de todas las máquinas/equipos
-- =============================================================================
CREATE TABLE IF NOT EXISTS equipos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    codigo TEXT UNIQUE NOT NULL,
    tipo TEXT,
    modelo TEXT,
    sala_id INTEGER,
    estado TEXT DEFAULT 'activa', -- 'activa', 'inactiva'
    frecuencia_dias INTEGER DEFAULT 7,
    ultimo_mantenimiento DATETIME,
    notas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE SET NULL
);

-- Índices para equipos
CREATE INDEX IF NOT EXISTS idx_equipos_sala ON equipos(sala_id);
CREATE INDEX IF NOT EXISTS idx_equipos_codigo ON equipos(codigo);
CREATE INDEX IF NOT EXISTS idx_equipos_estado ON equipos(estado);

-- =============================================================================
-- 3. TABLA: usuarios
-- Descripción: Usuarios del sistema (registro manual/autenticación custom)
-- =============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT, -- Para autenticación local (si no usa Supabase Auth)
    rol TEXT DEFAULT 'usuario', -- 'usuario', 'tecnico', 'admin'
    activo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- =============================================================================
-- 4. TABLA: perfiles
-- Descripción: Perfiles vinculados a Supabase Auth (opcional, si se mantiene auth externa)
-- Nota: El ID corresponde al UUID de auth.users de Supabase
-- =============================================================================
CREATE TABLE IF NOT EXISTS perfiles (
    id TEXT PRIMARY KEY, -- UUID vinculado a auth.users
    email TEXT,
    nombre TEXT,
    rol TEXT DEFAULT 'usuario',
    activo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_perfiles_email ON perfiles(email);

-- =============================================================================
-- 5. TABLA: registros
-- Descripción: Historial de mantenimientos e incidencias reportadas
-- =============================================================================
CREATE TABLE IF NOT EXISTS registros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    maquina_id INTEGER NOT NULL,
    usuario_id INTEGER, -- Usuario que reporta (si está autenticado)
    
    -- Datos denormalizados para historial (no dependen de equipos actuales)
    maquina_nombre TEXT,
    sala_nombre TEXT,
    operario_nombre TEXT NOT NULL, -- Nombre del operario que realizó el trabajo
    operario_email TEXT, -- Email para trazabilidad
    
    tipo TEXT NOT NULL, -- 'Mantenimiento', 'Incidencia'
    notas TEXT,
    photos TEXT, -- JSON array de URLs de fotos
    
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Gestión de incidencias
    resuelta BOOLEAN DEFAULT 0,
    comentario_resolucion TEXT,
    en_seguimiento BOOLEAN DEFAULT 0,
    
    FOREIGN KEY (maquina_id) REFERENCES equipos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Índices para registros
CREATE INDEX IF NOT EXISTS idx_registros_maquina ON registros(maquina_id);
CREATE INDEX IF NOT EXISTS idx_registros_usuario ON registros(usuario_id);
CREATE INDEX IF NOT EXISTS idx_registros_tipo ON registros(tipo);
CREATE INDEX IF NOT EXISTS idx_registros_timestamp ON registros(timestamp);
CREATE INDEX IF NOT EXISTS idx_registros_resuelta ON registros(resuelta);
CREATE INDEX IF NOT EXISTS idx_registros_seguimiento ON registros(en_seguimiento);

-- =============================================================================
-- 6. TABLA: operarios
-- Descripción: Operarios con PIN para acceso rápido en el taller
-- =============================================================================
CREATE TABLE IF NOT EXISTS operarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pin TEXT UNIQUE NOT NULL,
    nombre TEXT,
    activo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_operarios_pin ON operarios(pin);

-- =============================================================================
-- 7. TABLA: seguimientos
-- Descripción: Notas de seguimiento para incidencias en curso
-- =============================================================================
CREATE TABLE IF NOT EXISTS seguimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incidencia_id INTEGER NOT NULL,
    nota TEXT NOT NULL,
    usuario_nombre TEXT DEFAULT 'Administrador',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (incidencia_id) REFERENCES registros(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_seguimientos_incidencia ON seguimientos(incidencia_id);

-- =============================================================================
-- VISTAS ÚTILES
-- =============================================================================

-- Vista de equipos con información de sala
CREATE VIEW IF NOT EXISTS v_equipos_completo AS
SELECT 
    e.*,
    s.nombre as sala_nombre,
    CASE 
        WHEN e.ultimo_mantenimiento IS NULL THEN 'pendiente'
        WHEN (julianday('now') - julianday(e.ultimo_mantenimiento)) > e.frecuencia_dias THEN 'vencido'
        WHEN (julianday('now') - julianday(e.ultimo_mantenimiento)) > (e.frecuencia_dias * 0.8) THEN 'proximo'
        ELSE 'ok'
    END as estado_mantenimiento
FROM equipos e
LEFT JOIN salas s ON e.sala_id = s.id;

-- Vista de incidencias pendientes (no resueltas)
CREATE VIEW IF NOT EXISTS v_incidencias_pendientes AS
SELECT * FROM registros 
WHERE tipo = 'Incidencia' AND resuelta = 0;

-- Vista de mantenimientos del día
CREATE VIEW IF NOT EXISTS v_mantenimientos_hoy AS
SELECT * FROM registros 
WHERE tipo = 'Mantenimiento' 
AND date(timestamp) = date('now');

-- =============================================================================
-- DATOS INICIALES (Opcional - descomentar si se necesitan)
-- =============================================================================

-- Insertar sala por defecto
-- INSERT INTO salas (nombre) VALUES ('Sala Principal');

-- Insertar usuario admin por defecto (password: admin123)
-- Nota: En producción usar bcrypt u otro hash seguro
-- INSERT INTO usuarios (nombre, email, password_hash, rol, activo) 
-- VALUES ('Administrador', 'admin@example.com', '$2y$10$...', 'admin', 1);

-- =============================================================================
-- TRIGGERS PARA ACTUALIZAR updated_at
-- =============================================================================

CREATE TRIGGER IF NOT EXISTS trg_equipos_updated_at 
AFTER UPDATE ON equipos
BEGIN
    UPDATE equipos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_usuarios_updated_at 
AFTER UPDATE ON usuarios
BEGIN
    UPDATE usuarios SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_perfiles_updated_at 
AFTER UPDATE ON perfiles
BEGIN
    UPDATE perfiles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- =============================================================================
-- NOTAS SOBRE MIGRACIÓN DESDE SUPABASE
-- =============================================================================

/*
CAMBIOS IMPORTANTES AL MIGRAR A SQLITE:

1. UUID -> INTEGER: SQLite maneja mejor INTEGER PRIMARY KEY AUTOINCREMENT
   Los UUIDs de Supabase pueden guardarse como TEXT si se quiere mantener compatibilidad

2. JSON/ARRAY -> TEXT: Las columnas JSON (como 'photos') se almacenan como TEXT
   y se parsean en la aplicación con JSON.parse()/JSON.stringify()

3. BOOLEAN -> INTEGER: SQLite no tiene tipo BOOLEAN nativo, se usa 0/1

4. TIMESTAMP -> DATETIME: SQLite usa formato ISO8601 'YYYY-MM-DD HH:MM:SS'

5. STORAGE/FOTOS: Las fotos en Supabase Storage deben migrarse a un sistema
   de archivos local o a otro servicio de almacenamiento.

6. AUTH: La autenticación de Supabase Auth debe reemplazarse por un sistema
   propio (JWT, sesiones, etc.) o usar una biblioteca como Passport.js

7. ÍNDICES: Se han añadido índices en las columnas más consultadas para
   mantener el rendimiento.

MIGRACIÓN DE DATOS:
------------------
Para exportar desde Supabase:
1. SQL Editor -> New Query -> SELECT * FROM tabla
2. Exportar como CSV o JSON
3. Importar a SQLite usando scripts de conversión

O usar la API de Supabase para leer y el connector de SQLite para escribir.
*/
