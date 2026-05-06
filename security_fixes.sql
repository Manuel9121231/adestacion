-- ============================================================
-- SCRIPT DE SEGURIDAD COMPLETO — adestacion
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================
-- Estado actual: RLS DESACTIVADO en todas las tablas.
-- Este script activa RLS y crea las políticas mínimas necesarias
-- para que la app funcione correctamente sin exponer datos.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PASO 0 — Activar RLS en todas las tablas
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.equipos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seguimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios     ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- PASO 1 — Función helper (evita recursión infinita en usuarios)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_current_user_rol()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT rol FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$;


-- ────────────────────────────────────────────────────────────
-- PASO 2 — Políticas para: equipos
-- Lectura pública (página de estado), escritura solo admins
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Lectura publica equipos"  ON equipos;
DROP POLICY IF EXISTS "Escritura admin equipos"  ON equipos;

CREATE POLICY "Lectura publica equipos" ON equipos
  FOR SELECT USING (true);

CREATE POLICY "Escritura admin equipos" ON equipos
  FOR ALL USING (
    public.get_current_user_rol() = 'admin'
  );


-- ────────────────────────────────────────────────────────────
-- PASO 3 — Políticas para: salas
-- Lectura pública, escritura solo admins
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Lectura publica salas"  ON salas;
DROP POLICY IF EXISTS "Escritura admin salas"  ON salas;

CREATE POLICY "Lectura publica salas" ON salas
  FOR SELECT USING (true);

CREATE POLICY "Escritura admin salas" ON salas
  FOR ALL USING (
    public.get_current_user_rol() = 'admin'
  );


-- ────────────────────────────────────────────────────────────
-- PASO 4 — Políticas para: registros
-- INSERT anónimo (operarios reportan sin cuenta)
-- SELECT/UPDATE/DELETE solo admins
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Insert publico registros"  ON registros;
DROP POLICY IF EXISTS "Lectura admin registros"   ON registros;
DROP POLICY IF EXISTS "Escritura admin registros" ON registros;

CREATE POLICY "Insert publico registros" ON registros
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Lectura admin registros" ON registros
  FOR SELECT USING (
    public.get_current_user_rol() IN ('admin', 'tecnico')
  );

CREATE POLICY "Escritura admin registros" ON registros
  FOR ALL USING (
    public.get_current_user_rol() = 'admin'
  );


-- ────────────────────────────────────────────────────────────
-- PASO 5 — Políticas para: seguimientos
-- Solo admins/técnicos
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Lectura admin seguimientos"   ON seguimientos;
DROP POLICY IF EXISTS "Escritura admin seguimientos" ON seguimientos;

CREATE POLICY "Lectura admin seguimientos" ON seguimientos
  FOR SELECT USING (
    public.get_current_user_rol() IN ('admin', 'tecnico')
  );

CREATE POLICY "Escritura admin seguimientos" ON seguimientos
  FOR ALL USING (
    public.get_current_user_rol() IN ('admin', 'tecnico')
  );


-- ────────────────────────────────────────────────────────────
-- PASO 6 — Políticas para: usuarios
-- INSERT anónimo (auto-alta de operarios en checklist)
-- SELECT solo admins/técnicos
-- UPDATE solo admins (cambio de rol)
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Lectura publica usuarios"   ON usuarios;
DROP POLICY IF EXISTS "Solo admins leen usuarios"  ON usuarios;
DROP POLICY IF EXISTS "Insert publico usuarios"    ON usuarios;
DROP POLICY IF EXISTS "Update admin usuarios"      ON usuarios;
DROP POLICY IF EXISTS "Delete admin usuarios"      ON usuarios;

CREATE POLICY "Insert publico usuarios" ON usuarios
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Solo admins leen usuarios" ON usuarios
  FOR SELECT USING (
    public.get_current_user_rol() IN ('admin', 'tecnico')
  );

CREATE POLICY "Update admin usuarios" ON usuarios
  FOR UPDATE USING (
    public.get_current_user_rol() = 'admin'
  );

CREATE POLICY "Delete admin usuarios" ON usuarios
  FOR DELETE USING (
    public.get_current_user_rol() = 'admin'
  );


-- ────────────────────────────────────────────────────────────
-- PASO 7 — Índices en registros (aditivos, riesgo cero)
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_registros_maquina_id ON registros (maquina_id);
CREATE INDEX IF NOT EXISTS idx_registros_timestamp  ON registros (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_registros_tipo       ON registros (tipo);
CREATE INDEX IF NOT EXISTS idx_registros_resuelta   ON registros (resuelta) WHERE tipo = 'Incidencia';


-- ────────────────────────────────────────────────────────────
-- PASO 8 — Verificar datos antes de añadir CHECK constraints
-- Ejecuta primero estas queries y revisa los resultados:
-- ────────────────────────────────────────────────────────────
SELECT DISTINCT tipo   FROM registros;
SELECT DISTINCT estado FROM equipos;
SELECT DISTINCT rol    FROM usuarios;

-- Si los valores son correctos, descomenta y ejecuta:
/*
ALTER TABLE registros ADD CONSTRAINT chk_tipo_registro
  CHECK (tipo IN ('Mantenimiento', 'Incidencia'));

ALTER TABLE equipos ADD CONSTRAINT chk_estado_equipo
  CHECK (estado IN ('activa', 'en_revision', 'averiada', 'inactiva'));

ALTER TABLE usuarios ADD CONSTRAINT chk_rol_usuario
  CHECK (rol IN ('operario', 'tecnico', 'admin'));
*/
