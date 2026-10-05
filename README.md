# SOMAD · Surf Trips

Web estática de [@somad.surftrips](https://www.instagram.com/somad.surftrips/).
Sin frameworks, sin build: HTML + CSS + JS. Se publica con GitHub Pages.

**Live:** https://vincenzodivincenzo.github.io/somad/

## Editar contenido

| Qué | Dónde |
|---|---|
| Viajes (próximos y pasados) | `data/trips.js` |
| Número de WhatsApp, Instagram, seguidores | `data/trips.js` → bloque `window.SOMAD` |
| Textos, FAQ, destinos | `index.html` |
| Colores, fuentes | `css/style.css` → bloque `:root` |
| Fotos | `assets/img/` |

### Añadir un viaje nuevo
1. Abre `data/trips.js`.
2. Copia un bloque `{ ... }` y pégalo arriba del todo.
3. Pon `status: "upcoming"`, las fechas en `start`/`end` (`YYYY-MM-DD`) y un `dateLabel` legible.
4. Cuando pase la fecha, la web lo mueve sola a "Donde ya hemos estado".

El bloque con `status: "soon"` es el placeholder de "próximo viaje por anunciar". Bórralo cuando haya un viaje real con fechas.

### Fotos
Las de `assets/img/` vienen del Instagram de SOMAD a 640px (lo máximo que da IG sin login).
Para que la web luzca, sustitúyelas por los originales a 1600px de ancho, mismo nombre de archivo.

## Pendiente (necesita input de SOMAD)
- Fechas, destino y precio del próximo viaje.
- Fotos en alta resolución.
- Revisar textos de FAQ y "Qué incluye".
- Opcional: dominio propio (`somadsurftrips.com` → CNAME en Settings → Pages).

## Local
```bash
python3 -m http.server 8080
```
y abre http://localhost:8080
