-- ============================================================
-- Radar Comercial Industria — Tabla "leads" (módulo de Prospección)
-- ------------------------------------------------------------
-- Ejecutar en: Supabase → tu proyecto → SQL Editor → New query → Run
-- Sigue el mismo patrón que la tabla "clientes" ya existente:
-- columnas propias para lo que se filtra/ordena seguido, y una
-- columna JSON (detalle) para el resto.
-- ============================================================

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  email text,
  asesor_id uuid references public.asesores(id),
  origen text,               -- Referido, Feria, Web, Llamada fría, Redes sociales, Otro
  ciudad text,
  departamento text,
  valor_potencial numeric default 0,
  estado text not null default 'Nuevo',  -- Nuevo, Contactado, Calificado, Convertido, Descartado
  comentario text,
  creado_por text,           -- email del usuario que registró el lead
  detalle jsonb default '{}'::jsonb,
  creado_en timestamptz default now(),
  actualizado_en timestamptz default now()
);

-- Búsquedas/filtros habituales: por asesor y por estado
create index if not exists idx_leads_asesor on public.leads(asesor_id);
create index if not exists idx_leads_estado on public.leads(estado);

-- RLS: mismo criterio abierto que el resto de tablas del proyecto
-- (la app ya controla permisos en el cliente con el rol de sesión).
alter table public.leads enable row level security;

create policy "Permitir lectura a todos" on public.leads
  for select using (true);

create policy "Permitir escritura a todos" on public.leads
  for insert with check (true);

create policy "Permitir actualización a todos" on public.leads
  for update using (true);

create policy "Permitir borrado a todos" on public.leads
  for delete using (true);
