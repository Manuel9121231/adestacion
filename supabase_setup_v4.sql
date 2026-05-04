-- ============================================================
-- SQL para ejecutar en Supabase → SQL Editor
-- Proyecto: SGI Gestión de Impresoras v4.0
-- ============================================================

-- 1. AÑADIR COLUMNAS DE DIMENSIONES Y ESTADO OPERATIVO A equipos
ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS ancho_mm INTEGER,
  ADD COLUMN IF NOT EXISTS alto_mm INTEGER,
  ADD COLUMN IF NOT EXISTS profundidad_mm INTEGER,
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'activa',
  ADD COLUMN IF NOT EXISTS notas TEXT;

-- Actualizar estado por defecto si hay filas existentes
UPDATE equipos SET estado = 'activa' WHERE estado IS NULL;

-- 2. CREAR TABLA DE PERFILES DE USUARIO (vinculada a Supabase Auth)
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT,
  rol TEXT DEFAULT 'usuario',   -- 'usuario', 'tecnico', 'admin'
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 3. HABILITAR RLS (Row Level Security) en perfiles
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Política: cualquiera puede leer perfiles (para que el dashboard los liste)
DROP POLICY IF EXISTS "Lectura publica perfiles" ON perfiles;
CREATE POLICY "Lectura publica perfiles"
  ON perfiles FOR SELECT USING (true);

-- Política: el propio usuario puede insertar/actualizar su perfil
DROP POLICY IF EXISTS "Insertar propio perfil" ON perfiles;
CREATE POLICY "Insertar propio perfil"
  ON perfiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Política: el propio usuario o cualquiera autenticado con service_role puede actualizar
DROP POLICY IF EXISTS "Actualizar perfiles" ON perfiles;
CREATE POLICY "Actualizar perfiles"
  ON perfiles FOR UPDATE USING (true);

-- 4. TRIGGER AUTOMÁTICO: crear perfil al registrarse un nuevo usuario
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
-- CONFIGURACIÓN ADICIONAL EN SUPABASE DASHBOARD:
-- 
-- Authentication → Settings → Email:
--   ✅ Enable email confirmations = ON
--   ✅ Enable email OTP (para código de 6 dígitos) = ON
--   (Si dejas magic link, el usuario clica el link del email)
--
-- Authentication → URL Configuration:
--   Site URL: ruta donde está alojado tu index.html
-- ============================================================
