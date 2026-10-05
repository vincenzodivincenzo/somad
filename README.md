# SOMAD · surftrips

Web de [@somad.surftrips](https://www.instagram.com/somad.surftrips/).
HTML + CSS + JS sin frameworks ni build. Se publica sola con GitHub Pages.

**Live:** https://vincenzodivincenzo.github.io/somad/
**Panel de administración:** https://vincenzodivincenzo.github.io/somad/admin.html

## Para SOMAD: cómo actualizar la web (sin tocar código)

1. Abre el **panel** (enlace arriba) y pega tus claves: la de publicación y la de lista de espera. Marca “Recordar” y no las vuelves a necesitar en ese dispositivo.
2. **Lista de espera** → cada persona que se apunta en la web aparece aquí con su nivel, viaje de interés y WhatsApp. Pulsa en una para cambiar el estado (nuevo → contactado → reservado), escribir notas o abrirle un WhatsApp con el mensaje ya empezado. “Exportar CSV” se abre en Excel o Google Sheets.
3. **Viajes** → “+ Nuevo viaje”: nombre, lugar, país, fechas, descripción, etiquetas y una foto. “Guardar y publicar”.
   - Si aún no hay fechas, marca “Todavía sin fechas (próximamente)”.
   - Cuando pasa la fecha, el viaje se mueve solo a “Donde ya hemos estado”.
   - Las flechas ↑↓ cambian el orden.
4. **Fotos** → “+ Añadir fotos” (puedes elegir varias). Se reducen solas. Pie de foto opcional. Las dos primeras salen grandes.
5. **Textos y contacto** → WhatsApp, Instagram, seguidores, aviso de la barra superior y frases de la portada.

Los cambios tardan **1 o 2 minutos** en verse. Si no los ves, recarga con Cmd+Shift+R.

## Para Vincenzo: poner en marcha la lista de espera (una vez, 10 min)

La web es estática, así que las solicitudes van a una base de datos gratuita en Supabase. Sólo pueden **insertar** desde la web; leer y editar exige la clave de lista de espera (cabecera `x-admin-key` comprobada por RLS).

1. Crea un proyecto en [supabase.com](https://supabase.com) (plan Free).
2. Abre `supabase/schema.sql`, cambia `CAMBIA-ESTA-CLAVE` por una clave larga y pega todo en **SQL Editor → Run**.
3. En **Project Settings → API** copia la *Project URL* y la *anon public key*.
4. Entra en el panel → “Textos y contacto” → pega URL y anon key → Guardar. La anon key es pública por diseño; la seguridad está en las políticas RLS del SQL.
5. Sal del panel y vuelve a entrar poniendo también la clave de lista de espera. Pásasela a SOMAD junto con la de publicación.

Hasta que esto esté configurado, el botón “Apuntarme a la lista” de la web abre WhatsApp con los datos del formulario ya escritos, así no se pierde nadie.

Para cambiar la clave más adelante: `update private.settings set value = 'NUEVA' where key = 'admin_key';` en el SQL Editor.

## Para Vincenzo: dar acceso a alguien (clave de publicación)

El panel escribe directamente en este repo usando la API de GitHub, con un token.

1. GitHub → Settings → Developer settings → **Fine-grained personal access tokens** → Generate new token.
2. Resource owner: `vincenzodivincenzo`. Repository access: **Only select repositories → somad**.
3. Permissions → Repository permissions → **Contents: Read and write**. Nada más.
4. Expiración: la máxima que te deje (o sin expiración). Copia el token y pásaselo a SOMAD por un canal privado.

Para revocar el acceso, borra el token en la misma pantalla. El panel guarda el token solo en el navegador de quien lo usa (localStorage).

## Estructura

| Qué | Dónde |
|---|---|
| Lista de espera | Tabla `leads` en Supabase (`supabase/schema.sql`); la web inserta, el panel gestiona |
| Viajes | `data/trips.json` (lo edita el panel) |
| Fotos de la galería | `data/gallery.json` + `assets/img/uploads/` |
| WhatsApp, Instagram, textos de portada, pies de polaroid, credenciales públicas de Supabase | `data/site.json` |
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
python3 -m http.server 8080
```
http://localhost:8080 (el panel funciona en local también, publica al repo real).

## Pendiente
- Fotos en alta resolución (las actuales son de Instagram a 640px).
- Fechas y precio del próximo viaje.
- Archivo vectorial original del logo, si existe.
