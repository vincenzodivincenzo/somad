# SOMAD · surftrips

Web de [@somad.surftrips](https://www.instagram.com/somad.surftrips/).
HTML + CSS + JS sin frameworks ni build. Se publica sola con GitHub Pages.

**Live:** https://vincenzodivincenzo.github.io/somad/
**Panel de administración:** https://vincenzodivincenzo.github.io/somad/admin.html

## Para SOMAD: cómo actualizar la web (sin tocar código)

1. Abre el **panel** (enlace arriba) y pega tu clave de acceso. Marca “Recordar” y no la vuelves a necesitar en ese dispositivo.
2. **Viajes** → “+ Nuevo viaje”: nombre, lugar, país, fechas, descripción, etiquetas y una foto. “Guardar y publicar”.
   - Si aún no hay fechas, marca “Todavía sin fechas (próximamente)”.
   - Cuando pasa la fecha, el viaje se mueve solo a “Donde ya hemos estado”.
   - Las flechas ↑↓ cambian el orden.
3. **Fotos** → “+ Añadir fotos” (puedes elegir varias). Se reducen solas. Pie de foto opcional. Las dos primeras salen grandes.
4. **Textos y contacto** → WhatsApp, Instagram, seguidores, aviso de la barra superior y frases de la portada.

Los cambios tardan **1 o 2 minutos** en verse. Si no los ves, recarga con Cmd+Shift+R.

## Para Vincenzo: dar acceso a alguien

El panel escribe directamente en este repo usando la API de GitHub, con un token.

1. GitHub → Settings → Developer settings → **Fine-grained personal access tokens** → Generate new token.
2. Resource owner: `vincenzodivincenzo`. Repository access: **Only select repositories → somad**.
3. Permissions → Repository permissions → **Contents: Read and write**. Nada más.
4. Expiración: la máxima que te deje (o sin expiración). Copia el token y pásaselo a SOMAD por un canal privado.

Para revocar el acceso, borra el token en la misma pantalla. El panel guarda el token solo en el navegador de quien lo usa (localStorage).

## Estructura

| Qué | Dónde |
|---|---|
| Viajes | `data/trips.json` (lo edita el panel) |
| Fotos de la galería | `data/gallery.json` + `assets/img/uploads/` |
| WhatsApp, Instagram, textos de portada | `data/site.json` |
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
