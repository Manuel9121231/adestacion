-- ============================================================
-- SQL DE INICIALIZACIÓN COMPLETA PARA NUEVO PROYECTO SUPABASE
-- Proyecto: SGI Gestión de Impresoras (Proyecto "adestacion")
-- ============================================================

-- 1. SALAS
CREATE TABLE IF NOT EXISTS salas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EQUIPOS (Máquinas / Impresoras)
CREATE TABLE IF NOT EXISTS equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT,
  nombre TEXT NOT NULL,
  sala_id UUID REFERENCES salas(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas para equipos
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS modelo TEXT;
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'activa';
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS ancho_mm INTEGER;
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS alto_mm INTEGER;
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS profundidad_mm INTEGER;
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS frecuencia_dias INTEGER DEFAULT 7;
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS ultimo_mantenimiento TIMESTAMPTZ;

-- 3. USUARIOS (Para operarios que hacen auto-alta desde la tablet/móvil)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  rol TEXT DEFAULT 'usuario',
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 3b. OPERARIOS (Compatibilidad con PIN)
CREATE TABLE IF NOT EXISTS operarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  pin TEXT,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. REGISTROS (Mantenimientos e Incidencias)
CREATE TABLE IF NOT EXISTS registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id UUID REFERENCES equipos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas para registros (por si la tabla ya existía)
ALTER TABLE registros ADD COLUMN IF NOT EXISTS maquina_nombre TEXT;
ALTER TABLE registros ADD COLUMN IF NOT EXISTS sala_nombre TEXT;
ALTER TABLE registros ADD COLUMN IF NOT EXISTS operario_nombre TEXT;
ALTER TABLE registros ADD COLUMN IF NOT EXISTS operario_email TEXT;
ALTER TABLE registros ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE registros ADD COLUMN IF NOT EXISTS photos TEXT[];
ALTER TABLE registros ADD COLUMN IF NOT EXISTS resuelta BOOLEAN DEFAULT FALSE;
ALTER TABLE registros ADD COLUMN IF NOT EXISTS en_seguimiento BOOLEAN DEFAULT FALSE;
ALTER TABLE registros ADD COLUMN IF NOT EXISTS comentario_resolucion TEXT;

-- 5. SEGUIMIENTOS (Notas en el hilo de incidencias)
CREATE TABLE IF NOT EXISTS seguimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidencia_id UUID REFERENCES registros(id) ON DELETE CASCADE,
  nota TEXT NOT NULL,
  usuario_nombre TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PERFILES (Vinculado a Supabase Auth para acceso Admin/Técnico)
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT,
  rol TEXT DEFAULT 'usuario',   -- 'usuario', 'tecnico', 'admin'
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- ============================================================
-- SEGURIDAD (RLS) Y POLÍTICAS DE ACCESO
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- 1. POLÍTICAS PARA SALAS (Lectura pública, Escritura Admin)
DROP POLICY IF EXISTS "Lectura publica salas" ON salas;
CREATE POLICY "Lectura publica salas" ON salas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin total salas" ON salas;
CREATE POLICY "Admin total salas" ON salas FOR ALL USING (
  EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- 2. POLÍTICAS PARA EQUIPOS (Lectura pública, Escritura Admin)
DROP POLICY IF EXISTS "Lectura publica equipos" ON equipos;
CREATE POLICY "Lectura publica equipos" ON equipos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin total equipos" ON equipos;
CREATE POLICY "Admin total equipos" ON equipos FOR ALL USING (
  EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- 3. POLÍTICAS PARA USUARIOS (Lectura/Insert público para Auto-alta)
DROP POLICY IF EXISTS "Lectura publica usuarios" ON usuarios;
CREATE POLICY "Lectura publica usuarios" ON usuarios FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insertar publico usuarios" ON usuarios;
CREATE POLICY "Insertar publico usuarios" ON usuarios FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin total usuarios" ON usuarios;
CREATE POLICY "Admin total usuarios" ON usuarios FOR ALL USING (
  EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- 3b. POLÍTICAS PARA OPERARIOS (Lectura pública para PIN)
ALTER TABLE operarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica operarios" ON operarios;
CREATE POLICY "Lectura publica operarios" ON operarios FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin total operarios" ON operarios;
CREATE POLICY "Admin total operarios" ON operarios FOR ALL USING (
  EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- 4. POLÍTICAS PARA REGISTROS (Lectura pública, Insert público para reportes)
DROP POLICY IF EXISTS "Lectura publica registros" ON registros;
CREATE POLICY "Lectura publica registros" ON registros FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insertar publico registros" ON registros;
CREATE POLICY "Insertar publico registros" ON registros FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin total registros" ON registros;
CREATE POLICY "Admin total registros" ON registros FOR ALL USING (
  EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- 5. POLÍTICAS PARA SEGUIMIENTOS (Lectura pública, Insert Admin/Técnico)
DROP POLICY IF EXISTS "Lectura publica seguimientos" ON seguimientos;
CREATE POLICY "Lectura publica seguimientos" ON seguimientos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insertar seguimientos" ON seguimientos;
CREATE POLICY "Insertar seguimientos" ON seguimientos FOR INSERT WITH CHECK (true);

-- 6. POLÍTICAS PARA PERFILES (Ya definidas pero reforzadas)
DROP POLICY IF EXISTS "Lectura publica perfiles" ON perfiles;
CREATE POLICY "Lectura publica perfiles" ON perfiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin total perfiles" ON perfiles;
CREATE POLICY "Admin total perfiles" ON perfiles FOR ALL USING (
  EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- ============================================================
-- STORAGE: POLÍTICAS PARA EL BUCKET 'photos'
-- ============================================================
-- Nota: Esto asume que ya creaste el bucket llamado 'photos' manualmente.
-- Si no, ejecútalo después de crearlo.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Fotos acceso publico" ON storage.objects;
CREATE POLICY "Fotos acceso publico" ON storage.objects FOR SELECT USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "Fotos subida publica" ON storage.objects;
CREATE POLICY "Fotos subida publica" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos');

-- ============================================================
-- TRIGGER AUTOMÁTICO PARA REGISTRO DE AUTH
-- ============================================================

CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre, rol, activo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    'usuario',
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.crear_perfil_usuario();

-- ============================================================
-- DATOS INICIALES (Restauración de Salas e Impresoras)
-- ============================================================

-- Insertar Salas
INSERT INTO salas (id, nombre) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Espacio Maker'),
  ('22222222-2222-2222-2222-222222222222', 'Espacio Robot')
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- Insertar Impresoras de ejemplo
INSERT INTO equipos (nombre, tipo, modelo, sala_id, estado, frecuencia_dias) VALUES
  ('Prusa MK3S+ #1', 'FDM', 'Original Prusa MK3S+', '11111111-1111-1111-1111-111111111111', 'activa', 7),
  ('Bambu Lab X1C #1', 'FDM', 'Bambu Lab X1-Carbon', '11111111-1111-1111-1111-111111111111', 'activa', 7),
  ('Formlabs Form 3', 'SLA', 'Form 3+', '22222222-2222-2222-2222-222222222222', 'activa', 15)
ON CONFLICT DO NOTHING;
