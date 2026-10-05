# SOMAD · surftrips

Web de [@somad.surftrips](https://www.instagram.com/somad.surftrips/).
HTML + CSS + JS sin frameworks ni build. Se publica sola con GitHub Pages.

**Live:** https://somad-nu.vercel.app (espejo estático en https://vincenzodivincenzo.github.io/somad/)
**Panel de administración:** https://somad-nu.vercel.app/admin.html

## Para SOMAD: cómo actualizar la web (sin tocar código)

1. Abre el **panel** y pega tu clave de acceso. Marca “Recordar” y no la vuelves a necesitar en ese dispositivo.
2. **Lista de espera** → cada persona que se apunta en la web aparece aquí con su nivel, viaje de interés y WhatsApp. Pulsa en una para cambiar el estado (nuevo → contactado → reservado), escribir notas o abrirle un WhatsApp con el mensaje ya empezado. “Exportar CSV” se abre en Excel o Google Sheets.
3. **Reservas** → solicitudes de plaza en viajes con fecha. Confirma cuando llegue la señal; las plazas libres de la web se recalculan solas.
4. **Viajes** → “+ Nuevo viaje”: nombre, lugar, país, fechas, descripción, etiquetas, precio, señal, plazas, enlace de pago y una foto. Si aún no hay fechas, marca “Todavía sin fechas”. Cuando pasa la fecha el viaje se mueve solo a “Donde ya hemos estado”. Las flechas ↑↓ cambian el orden.
5. **Fotos** → “+ Añadir fotos” (varias a la vez). Se reducen solas. Pie de foto opcional.
6. **Textos y contacto** → WhatsApp, Instagram, seguidores, aviso de la barra superior, frases de portada y pies de las polaroids.

Todo se ve en la web **al momento** (la copia de GitHub Pages puede tardar hasta un minuto en refrescar el contenido).

## Para Vincenzo: cómo está montado

- **Hosting + API:** Vercel, proyecto `somad` (team *Proper Brand*), desplegado desde este repo en cada push a `main`. La web también se sirve en GitHub Pages; esa copia llama a la API de Vercel cross-origin.
- **Datos:** Vercel Blob (store privado `somad-media`). Documentos JSON: `content/{trips,gallery,settings}.json`, `data/{leads,bookings}.json`. Escrituras con `ifMatch` (etag) para no pisar cambios concurrentes. Fotos subidas: `img/*` en el mismo store, servidas por `/api/media?p=…` con caché de un año.
- **Semilla:** si un documento no existe en Blob, la API devuelve el JSON del repo (`data/*.json`). Los JSON del repo son sólo el arranque; la verdad vive en Blob.
- **Auth del panel:** una sola clave, variable de entorno `ADMIN_KEY` en Vercel (cabecera `x-admin-key`, comparación en tiempo constante). Para rotarla: `vercel env rm ADMIN_KEY` + `vercel env add ADMIN_KEY` y avisar a SOMAD. La clave actual está en `../somad-CLAVES.txt` (fuera del repo; muévela a un gestor de contraseñas y borra el archivo).
- **API** (`/api`): `GET content`, `GET counts`, `POST leads|bookings` (público, con honeypot y validación), `GET|PATCH|DELETE leads|bookings?id=` (admin), `PUT admin/content`, `POST admin/upload`, `GET admin/ping`, `GET media`.
- **Local:** `vercel dev` levanta web + API con las variables de `.env.local` (`vercel env pull`).

## Estructura

| Qué | Dónde |
|---|---|
| Lista de espera y reservas | Blob `data/leads.json`, `data/bookings.json` (vía API) |
| Viajes, galería, ajustes | Blob `content/*.json` (vía panel); semilla en `data/*.json` |
| Fotos subidas desde el panel | Blob `img/*`, servidas por `/api/media` |
| Lógica del servidor | `api/*.js`, `lib/*.js` (Node 22, `@vercel/blob`) |
| Textos fijos, FAQ, destinos | `index.html` |
| Colores, fuentes, bordes a lápiz | `css/style.css` → bloque `:root` y `.sk` |
| Logo vectorizado | `assets/logo.svg` (completo), `assets/wordmark.svg` (solo SOMAD), `assets/star.svg`, `assets/favicon.svg` |

### Identidad
- Monocromo: tinta `#121212` sobre papel `#F3F1EA`. El color lo ponen las fotos (en gris hasta pasar el ratón).
- Logo vectorizado desde el original (potrace). La palabra “surftrips” del logo es texto en Nunito, para sustituir por el trazado original si aparece el archivo vectorial.
- Tipos: Shantell Sans (titulares, con ejes de rebote/informalidad) y Nunito (cuerpo).
- Bordes irregulares “a lápiz”: clase `.sk` (radios asimétricos + filtro SVG `#rough`).

## Local
```bash
vercel dev
```
Sólo estático (sin API, la web usa los JSON del repo y el formulario cae a WhatsApp): `python3 -m http.server 8080`.

## Pendiente
- Fotos en alta resolución (las actuales son de Instagram a 640px).
- Fechas y precio del próximo viaje.
- Archivo vectorial original del logo, si existe.
