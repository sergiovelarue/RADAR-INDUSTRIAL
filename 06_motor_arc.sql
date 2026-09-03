-- ============================================================
-- RADAR COMERCIAL INDUSTRIA — Motor ARC (Análisis y Recomendación
-- Comercial con IA) — estructura de datos y control de acceso.
-- ------------------------------------------------------------
-- Pedido de Sergio (03-sep-2026): agente de IA que da recomendaciones
-- por cliente a cada asesor, análisis individual de asesor y análisis
-- del negocio completo para el administrador/director comercial.
-- Debe ser administrable por el Super Administrador: activar,
-- desactivar y configurar límites de uso para el resto de usuarios.
--
-- Este script NO conecta ninguna API de IA real todavía — solo deja
-- la estructura (configuración global + historial auditable) para
-- que la app funcione con la función apagada por defecto, mostrando
-- el aviso "próximamente disponible" a asesores/administradores hasta
-- que el Super Administrador la active.
--
-- Sigue el mismo patrón de control de acceso ya usado en
-- cerrar_rls_historial_y_usuarios_v1 (sistema-v1.js): funciones
-- SECURITY DEFINER que reciben email + teléfono de quien llama y
-- verifican su rol contra la tabla "usuarios" antes de actuar,
-- porque el proyecto no usa Supabase Auth — usa su propio login por
-- correo/teléfono ya registrado en la tabla "usuarios".
-- ============================================================

-- ------------------------------------------------------------
-- 1) Configuración global del Motor ARC (fila única)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.configuracion_motor_arc (
  id INTEGER PRIMARY KEY DEFAULT 1,
  activo BOOLEAN NOT NULL DEFAULT false,
  limite_diario_asesor INTEGER NOT NULL DEFAULT 15,
  limite_diario_admin INTEGER NOT NULL DEFAULT 10,
  modelo_ia TEXT NOT NULL DEFAULT 'claude-sonnet',
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_por TEXT,
  CONSTRAINT configuracion_motor_arc_singleton CHECK (id = 1)
);

INSERT INTO public.configuracion_motor_arc (id, activo)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.configuracion_motor_arc ENABLE ROW LEVEL SECURITY;

-- Lectura abierta: todos los roles necesitan saber si está activo
-- para mostrar el botón funcional o el aviso "próximamente
-- disponible" — no expone nada sensible, solo el estado on/off y los
-- límites.
CREATE POLICY "Lectura configuracion_motor_arc"
  ON public.configuracion_motor_arc
  FOR SELECT
  USING (true);

-- Sin política de INSERT/UPDATE directa: los cambios de configuración
-- pasan exclusivamente por la función actualizar_config_motor_arc_v1
-- (SECURITY DEFINER), que valida que quien llama sea Super
-- Administrador antes de tocar la fila.

-- ------------------------------------------------------------
-- 2) Historial auditable de análisis generados
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analisis_ia_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,              -- 'cliente' | 'asesor' | 'negocio'
  solicitado_por TEXT NOT NULL,    -- email de quien pidió el análisis
  rol_solicitante TEXT,            -- 'asesor' | 'administrador' | 'superadmin'
  referencia TEXT,                 -- NIT del cliente, nombre del asesor, o periodo (negocio)
  resultado TEXT NOT NULL,         -- texto generado por la IA
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT analisis_ia_log_tipo_valido CHECK (tipo IN ('cliente','asesor','negocio'))
);

CREATE INDEX IF NOT EXISTS idx_analisis_ia_log_solicitante ON public.analisis_ia_log (solicitado_por);
CREATE INDEX IF NOT EXISTS idx_analisis_ia_log_creado ON public.analisis_ia_log (creado_en);

ALTER TABLE public.analisis_ia_log ENABLE ROW LEVEL SECURITY;

-- NOTA IMPORTANTE — mismo criterio ya usado en leads, consentimientos_
-- datos e historial_metas_mensuales: este proyecto no usa Supabase
-- Auth (no hay JWT de sesión), el login es propio por correo y
-- teléfono contra la tabla "usuarios". Por eso, igual que en el resto
-- del proyecto, la política de SELECT queda abierta a nivel de base
-- de datos (USING (true)); el control real de "quién ve el historial"
-- lo hace la app, mostrando el panel de auditoría solo dentro de la
-- pestaña Sistema (exclusiva Super Administrador, verificado también
-- del lado del servidor por sistemaEsSuperAdminV1()/RPCs). Se
-- documenta explícitamente para no asumir una seguridad de base de
-- datos que no existe todavía — es un riesgo aceptado y conocido de
-- esta fase del proyecto.
CREATE POLICY "Lectura analisis_ia_log"
  ON public.analisis_ia_log
  FOR SELECT
  USING (true);

-- Solo INSERT (nunca UPDATE/DELETE): un análisis generado es un hecho
-- histórico inmutable, mismo criterio que consentimientos_datos e
-- historial_metas_mensuales.
CREATE POLICY "Insercion analisis_ia_log"
  ON public.analisis_ia_log
  FOR INSERT
  WITH CHECK (true);

-- ------------------------------------------------------------
-- 3) Función: actualizar configuración (exclusivo Super Admin)
-- ------------------------------------------------------------
-- Sigue el mismo patrón de crear_o_editar_administrador_v1
-- (cerrar_rls_historial_y_usuarios_v1): recibe email+teléfono del
-- Super Admin que llama, verifica su rol contra "usuarios" del lado
-- del servidor (no confía en lo que diga el navegador), y solo
-- entonces aplica el cambio.
CREATE OR REPLACE FUNCTION public.actualizar_config_motor_arc_v1(
  p_super_email TEXT,
  p_super_telefono TEXT,
  p_activo BOOLEAN,
  p_limite_diario_asesor INTEGER,
  p_limite_diario_admin INTEGER,
  p_modelo_ia TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  es_super BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE email = lower(trim(p_super_email))
      AND rol = 'superadmin'
  ) INTO es_super;

  IF NOT es_super THEN
    RAISE EXCEPTION 'Solo el Super Administrador puede modificar la configuración del Motor ARC.';
  END IF;

  UPDATE public.configuracion_motor_arc
  SET activo = p_activo,
      limite_diario_asesor = GREATEST(1, p_limite_diario_asesor),
      limite_diario_admin = GREATEST(1, p_limite_diario_admin),
      modelo_ia = COALESCE(p_modelo_ia, modelo_ia),
      actualizado_en = now(),
      actualizado_por = lower(trim(p_super_email))
  WHERE id = 1;

  RETURN true;
END;
$$;

-- ------------------------------------------------------------
-- 4) Función: registrar un análisis en el historial
-- ------------------------------------------------------------
-- No requiere validar rol (cualquier usuario autenticado en la app
-- puede generar análisis de su propio ámbito) — la app ya restringe
-- qué botones ve cada rol. Esta función solo dispara el guardado.
CREATE OR REPLACE FUNCTION public.registrar_analisis_ia_v1(
  p_tipo TEXT,
  p_solicitado_por TEXT,
  p_rol_solicitante TEXT,
  p_referencia TEXT,
  p_resultado TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nuevo_id UUID;
BEGIN
  INSERT INTO public.analisis_ia_log (tipo, solicitado_por, rol_solicitante, referencia, resultado)
  VALUES (p_tipo, lower(trim(p_solicitado_por)), p_rol_solicitante, p_referencia, p_resultado)
  RETURNING id INTO nuevo_id;

  RETURN nuevo_id;
END;
$$;

-- ------------------------------------------------------------
-- 5) Función: contar análisis de hoy por usuario (para el límite diario)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.contar_analisis_ia_hoy_v1(
  p_email TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COUNT(*) INTO total
  FROM public.analisis_ia_log
  WHERE solicitado_por = lower(trim(p_email))
    AND creado_en >= date_trunc('day', now());

  RETURN total;
END;
$$;

-- Verificación post-ejecución (opcional):
-- SELECT * FROM public.configuracion_motor_arc;
-- SELECT tipo, solicitado_por, referencia, creado_en FROM public.analisis_ia_log ORDER BY creado_en DESC LIMIT 20;
