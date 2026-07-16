# Radar Comercial ConAccion Industria

## V1.1 - Tres perfiles: Asesor / Administrador / Super Administrador

Se agrega un tercer nivel de acceso para separar "ver todo" de "poder configurar la aplicación":

- **Asesor** (sin cambios): al ingresar solo ve sus propios clientes y todos los cálculos (venta, meta, cumplimiento, faltante, Salud del Portafolio, etc.) quedan calculados únicamente sobre su cartera.
- **Administrador** (nuevo, autogestionado): cualquier correo que no sea `@comodisimos.com` puede elegir este rol en su primer ingreso. Ve la información de todos los asesores y puede filtrar por un asesor puntual, igual que antes. Mantiene acceso a Actualización diaria, exportaciones (asignación actualizada, historial de cambios, respaldo de sincronización) y edición de datos básicos de cualquier cliente (ciudad, departamento, canal, línea base). **No puede**: configurar el crecimiento esperado por clasificación, reasignar el asesor de un cliente, bloquear/desbloquear clientes, marcar VIP Gerencia, ni ver estadísticas de uso o descargar el log de accesos.
- **Super Administrador** (fijo: `sergiovelasquez@me.com`): todo lo anterior, más las funciones exclusivas de configuración: panel de crecimiento esperado por clasificación (A/B/C/E/N), reasignación de asesor, bloqueo/desbloqueo de clientes, marcado de VIP Gerencia, estadísticas de uso y descarga del log de accesos.

Detalles de implementación:
- El login ahora pide, solo en el primer ingreso de cada correo, elegir "Asesor" (y a qué asesor corresponde) o "Administrador". Esa elección se guarda localmente para los siguientes ingresos.
- Se agregó una etiqueta de sesión y el botón "Cerrar sesión" se movió al menú lateral (antes vivía dentro del panel de estadísticas de uso, por lo que solo el administrador único podía cerrar sesión desde la interfaz).
- No requiere cambios en ninguna base de datos compartida: toda la lógica de roles vive en el front-end (localStorage), igual que el resto de Radar Comercial hoy.

## V1.0 - Fork solo línea Espumas (industrial B2B)

Esta versión es un fork de Radar Comercial B2B V9.2 (ConAccion), hecho para negocios industriales B2B que solo manejan línea Espumas.

- Base de clientes filtrada: se excluyeron los 72 clientes con tipoCliente = Colchones. Quedan 566 clientes (473 Espumas, 93 Nuevo).
- Los clientes que antes eran "Mixto" (18) se reclasificaron como "Espumas"; sus campos de Colchones (venta actual, 2025, metas, histórico mensual) quedaron en cero y sus totales/metas se recalcularon en proporción a su venta de Espumas.
- Se eliminó del front-end la posibilidad de filtrar o cargar Colchones:
  - Vista Negocio: solo quedan "Total Radar" y "Solo Espumas".
  - Tipo Cliente: solo quedan "Todos", "Espumas", "Nuevo" y "Bloqueado".
  - Se quitó la tarjeta de tipo Colchones/Mixto y el desglose "Colchones actual" del tablero.
  - Se quitó el selector Espumas/Colchones del Dashboard Director (queda fijo en Espumas).
  - Se quitó el campo Meta S&OP Colchones.
  - La carga diaria de "Ventas Colchones 2026" quedó oculta (el archivo de referencia interno sigue existiendo mas no es visible ni se usa).
- Marca: renombrado a "Radar Comercial Industria" (ConAccion) en login y sidebar. Mismo favicon y mismo motor de acceso por asesor de la V9.2.
- El resto de funcionalidades (Hoja de Ruta, Dashboard Director, Segmentos Comerciales, Salud del Portafolio, Glosario, gestión de base maestra, log de uso) se mantiene igual que en Radar Comercial B2B V9.2.

---

# Radar Comercial B2B V8.0 (historial previo, versión ConAccion general)

Versión de prueba con arquitectura de datos separada.

## Fuentes cargadas
Base maestra:
- Asigancion de clientes Espuma y Colchones BD 2025.xlsx

Histórico congelado:
- Ventas Espuma 2025.xlsx
- Ventas colchones 2025.xlsx

Operación actual:
- Ventas espuma a mayo31 2026.xlsx
- Ventas Colchones a mayo31 2026.xlsx

## Asesores normalizados
ALBEIRO GIRALDO, CRISTIAN LONDOÑO, HERCILIA MUÑOZ, KATHERIN VILLAMIZAR, NATALIA GARCIA, RUBEN ALFONSO, YESICA MUÑOZ

## Resumen inicial
Clientes totales: 638
Tipos cliente: {'Nuevo': 93, 'Espumas': 455, 'Colchones': 72, 'Mixto': 18}
Clientes por asesor: {'SIN ASIGNACION': 86, 'CRISTIAN LONDOÑO': 85, 'RUBEN ALFONSO': 83, 'NATALIA GARCIA': 244, 'YESICA MUÑOZ': 37, 'ALBEIRO GIRALDO': 31, 'KATHERIN VILLAMIZAR': 10, 'HERCILIA MUÑOZ': 62}

## Prueba de filtros
1. Cambia Vista negocio: Total Radar / Solo Espumas / Solo Colchones.
2. Filtra por Asesor.
3. Filtra por Tipo cliente.
4. Carga ventas 2026 y valida/procesa.


## V8.1 - Recuperación de funciones operativas

- Perfil Administrador / Asesor.
- Asesor solo ve sus propios clientes.
- Administrador puede ver todo y filtrar por asesor.
- Selector de mes de hoja de ruta.
- Ordenamiento por venta 2025, faltante, venta actual, cumplimiento y cliente.
- Botón Detalle por cliente.
- Registro de meta personal, próxima acción, fecha de seguimiento y comentario.


## V8.2

- Panel administrador para definir crecimiento esperado por clasificación A/B/C/E/N.
- Recalculo de metas sugeridas según clasificación.
- Detalle de cliente ampliado:
  - Promedio 2025.
  - Promedio 2026.
  - Meses compra 2025 / 12.
  - Meses compra 2026 / meses corridos.
  - Venta actual.
  - Meta.
  - Faltante.
  - Cumplimiento.
  - Clasificación.
  - Estado.
- Estados incluidos: Activo, Inactivo, Posible Baja, Baja, Nuevo, Reingresado.
- No se incluye estado Bloqueado.


## V8.3 - Selector de mes funcional

- El selector de mes ahora cambia los cálculos mensuales.
- Enero a mayo usan venta real 2026 cargada desde archivos operativos.
- Meses posteriores al último mes disponible en 2026 muestran venta actual = 0.
- Todos los meses comparan contra el mismo mes de 2025.
- La meta sugerida se calcula con base en la venta del mismo mes 2025 y el crecimiento por clasificación.
- La meta personal del asesor queda guardada por mes.
- La actualización diaria guarda ventas 2026 por mes, no solo el mes actual.


## V8.4 - Acceso, perfiles y log de uso

- Pantalla de acceso con correo autorizado y teléfono.
- Validación de formato de correo y teléfono de 10 dígitos.
- Identificación automática:
  - Administrador: Sergio.
  - Asesor: según correo autorizado.
- Asesor solo ve sus propios clientes.
- Administrador ve toda la información y funciones administrativas.
- Log de accesos guardado localmente.
- Dashboard de uso solo administrador.
- Descarga CSV del log de accesos.


## V8.5 - Corrección filtros

- Se elimina visualmente el filtro Tipo Cliente por redundante.
- Vista Negocio queda como filtro principal:
  - Total Radar
  - Solo Espumas
  - Solo Colchones
  - Solo Mixto
- La Hoja de Ruta, KPIs y tarjetas responden a Vista Negocio.
- Asesor, Estado, Mes, Ordenamiento y Búsqueda se conservan.


## V8.6 - Base viva de clientes
- Edición de datos maestros desde detalle.
- Administrador puede reasignar asesor.
- Asesor puede completar sus clientes.
- Bitácora y descargas administrativas.


## V8.7
- Departamento y ciudad en listas desplegables filtradas.
- Bloqueo administrativo de clientes.
- Bloqueados no cuentan ni aparecen para asesores; administrador los ve con Estado = Bloqueado.


## V8.8 - Ajustes para prueba completa

- Canal pasa a lista desplegable con opciones:
  - B2B
  - B2P
  - TIENDA
  - INDUSTRIA
- Orden visual en datos maestros:
  - Departamento
  - Ciudad / municipio
  - Canal
- Cliente VIP Gerencia:
  - Solo visible para administrador.
  - No aparece en hoja de ruta de asesores.
  - No se incluye en sus KPIs.
  - Administrador puede filtrar Todos / Solo VIP / Excluir VIP.
- Descarga de asignación incluye campos VIP Gerencia.

## V8.9
- Al abrir Radar, inicia automáticamente en el mes actual del sistema.
- Muestra la fecha actual en la parte superior.
- El usuario puede cambiar manualmente el mes.


## V8.10 - Corrección de filtros y mes
- Mes inicial = mes actual del sistema.
- Cambio de mes recalcula venta actual, 2025, meta, cumplimiento y faltante.
- Admin: Mes, Vista negocio, Asesor, Estado y Buscar.
- Asesor: Mes, Vista negocio, Estado y Buscar.
- Ordenar solo ordena lo ya filtrado.
- El filtro asesor se conserva al combinar filtros.


## V8.11

- Oculta para asesores:
  - Carga de ventas diarias.
  - Configuración de crecimiento.
  - Gestión de base maestra.
  - Estadísticas de uso.
  - Descargas administrativas.
- Mantiene para asesor:
  - Hoja de Ruta.
  - Mes.
  - Vista negocio.
  - Estado.
  - Buscar.
  - Detalle y seguimiento de clientes asignados.
- Agrega exportación de respaldo Radar para administrador.

Nota importante:
En Netlify estático/localStorage, los cambios del administrador no se sincronizan automáticamente en otros navegadores o equipos.
Para sincronización real entre administrador y asesores se requiere una base compartida centralizada.


## V8.12 - Dashboard Director
- Vista ejecutiva con KPI, gráficos, Pareto general, top 10 por asesor y lectura estratégica.


## V8.13 - Mejoras Dashboard Director
- Filtro Espumas/Colchones.
- Asesores 2025 vs 2026.
- Clasificación con clientes y venta mes.
- Estados con número de clientes.
- Top 10 asesor con 2026, 2025 y crecimiento.
- Clientes facturando y orden promedio mensual.


## V8.14 - Salud del Portafolio de Clientes
- Nueva sección en Dashboard Director.
- Gráfica de evolución del portafolio de clientes.
- KPI: cumplimiento mes, clientes activos, orden promedio, índice de actividad, recuperación y pérdida.
- Evolución A-B-C-E-N con mediana visible.
- Glosario comercial Radar.


## V9.0 - Dirección Comercial y S&OP
- Meta S&OP mensual por línea: Espumas y Colchones.
- Cumplimiento S&OP y Gap S&OP.
- Top 10 por asesor con selector individual.
- Salud del Portafolio de Clientes calculada con ventana móvil de 12 meses.
- Glosario ampliado con Meta S&OP, Gap S&OP, portafolio gestionable y ventana móvil.


## V9.2 - Rebrand ConAccion y acceso abierto por asesor

- Marca visible pasa de Comodísimos a ConAccion (login y sidebar).
- Favicon agregado (placeholder "R" azul; pendiente reemplazo por el ícono real del Calculador).
- Footer con "Todos los derechos reservados. Sergio Velásquez." y marca discreta "23:1".
- Control de acceso reescrito:
  - Único administrador: sergiovelasquez@me.com.
  - Dominio @comodisimos.com bloqueado explícitamente.
  - Cualquier otro correo puede ingresar; en su primer ingreso selecciona a qué asesor corresponde (selector en el login) y esa asociación queda guardada localmente para próximos ingresos desde ese correo.
  - Se elimina la lista fija AUTH_USERS_V84 de correos por asesor.


## V9.1 - Segmentos Comerciales

Se incorpora una nueva dimensión de análisis en Dashboard Director:

- Industria: Hercilia Muñoz y Albeiro Giraldo.
- B2B: Cristian Londoño, Rubén Alfonso, Yesica Muñoz y Katherine Villamizar.
- B2P/B2C: Natalia García.

Incluye:
- Evolución mensual por segmento.
- Venta acumulada por segmento.
- Activación por segmento.
- Tabla de venta, clientes facturando, ticket y participación.
- Salud del portafolio por segmento.
