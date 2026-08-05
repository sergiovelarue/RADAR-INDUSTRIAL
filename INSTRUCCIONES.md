# Favicon / Ícono de app — Radar Comercial B2B

## 1. Archivos generados

| Archivo | Uso |
|---|---|
| `favicon.ico` | Pestaña del navegador (multi-resolución 16/32/48) |
| `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png` | Pestaña navegador (fallback PNG) |
| `apple-touch-icon.png` (180x180) | iPhone/iPad — "Agregar a inicio" (Safari) |
| `apple-touch-icon-precomposed.png` | Compatibilidad iOS antiguo |
| `apple-touch-icon-152x152.png`, `-167x167.png`, `-120x120.png` | Variantes iPad / iPhone retina |
| `android-chrome-192x192.png`, `android-chrome-512x512.png` | Ícono estándar Android/PWA |
| `maskable-icon-192x192.png`, `maskable-icon-512x512.png` | Ícono adaptativo Android (evita recorte en máscara circular/squircle) |
| `site.webmanifest` | Manifest PWA — define nombre, colores e íconos para instalación |

## 2. Dónde colocar los archivos

Copiar **todos** los archivos a la raíz pública del sitio (mismo nivel que `index.html`):

```
/ (raíz del repo)
├── index.html
├── favicon.ico
├── favicon-16x16.png
├── favicon-32x32.png
├── favicon-48x48.png
├── apple-touch-icon.png
├── apple-touch-icon-precomposed.png
├── apple-touch-icon-152x152.png
├── apple-touch-icon-167x167.png
├── apple-touch-icon-120x120.png
├── android-chrome-192x192.png
├── android-chrome-512x512.png
├── maskable-icon-192x192.png
├── maskable-icon-512x512.png
└── site.webmanifest
```

## 3. Código a insertar en `<head>` del `index.html`

```html
<!-- Favicon navegador -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">

<!-- iPhone / iPad - Agregar a inicio -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png">
<link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167x167.png">
<link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Radar B2B">

<!-- Android / PWA -->
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#01153F">
```

## 4. Notas técnicas (leer antes de desplegar)

- **iOS ignora la transparencia**: el `apple-touch-icon` se generó sin canal alfa (fondo blanco/azul sólido), tal como exige Apple; si se usara un PNG transparente, iOS lo rellenaría en negro.
- **Android aplica máscara automática** (círculo, squircle, etc. según el launcher). Por eso se generaron íconos `maskable-*` con el logo reducido al ~70% del lienzo y fondo azul (#01153F) de borde a borde — así el "R" y el texto "B2B" no se cortan al aplicar la máscara.
- El ícono `android-chrome-*` (no maskable) es el mismo diseño que subiste, sin recorte de seguridad — Chrome lo usa tal cual cuando el sistema no aplica máscara.
- Se usó la **variante clara/azul** del logo como ícono maestro (mejor contraste en fondos claros y oscuros del sistema). Si prefieres usar la variante oscura como ícono base, lo regenero — solo dime cuál.
- Verificación rápida post-deploy: `https://<tu-sitio>.netlify.app/site.webmanifest` debe responder 200 y las rutas de íconos deben cargar sin 404.

## 5. Pendiente de confirmar contigo

Este favicon dice "Radar Comercial B2B" genérico. Según tu portafolio de productos tienes **dos** Radar distintos:

- **(A) Radar Comercial B2B – Espumas Plásticas** → repo `radar` (sitio `radarcomercial-pika-068f14.netlify.app`)
- **(B) Radar Industrial** → repo `RADAR-INDUSTRIAL` (sitio `radar-com-conaccion-ind242f09.netlify.app`)

**¿Este set de íconos es para el repo (A) o para (B)?** El código de arriba es el mismo en ambos casos, pero necesito saber a qué `index.html` y a qué carpeta del repo lo llevas para que confirmes el push correcto (recuerda: tú haces el push, yo solo preparo el material).
