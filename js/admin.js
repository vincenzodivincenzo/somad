/* SOMAD admin · publishes straight to the GitHub repo that serves the site. */
(function () {
  /* ───── config: detect owner/repo from the GitHub Pages URL, with a fallback */
  const host = location.hostname;
  const seg = location.pathname.split("/").filter(Boolean);
  const OWNER = host.endsWith(".github.io") ? host.split(".")[0] : "vincenzodivincenzo";
  const REPO = host.endsWith(".github.io") && seg[0] && !seg[0].endsWith(".html") ? seg[0] : "somad";
  const BRANCH = "main";
  const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/`;
  const KEY = "somad_admin_token";
  const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  let token = localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || "";
  const shas = {};
  let trips = [], gallery = [], site = {};
  let galleryDirty = false;

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ───── UI helpers */
  const busy = (on, text) => { $("#busy").hidden = !on; if (text) $("#busy-text").textContent = text; };
  let toastT;
  const toast = (msg, err) => {
    const t = $("#toast"); t.textContent = msg; t.className = "toast" + (err ? " toast--err" : ""); t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), err ? 7000 : 4000);
  };

  /* ───── GitHub API */
  const headers = () => ({ Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" });
  const utf8ToB64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
  const b64ToUtf8 = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

  async function getJson(path) {
    const r = await fetch(API + path + `?ref=${BRANCH}&t=${Date.now()}`, { headers: headers(), cache: "no-store" });
    if (r.status === 404) return null;
    if (r.status === 401 || r.status === 403) throw new Error("Tu clave ha caducado o no es válida. Vuelve a entrar.");
    if (!r.ok) throw new Error(`No pude leer ${path} (${r.status})`);
    const j = await r.json();
    shas[path] = j.sha;
    return JSON.parse(b64ToUtf8(j.content));
  }

  async function putFile(path, contentB64, message, retry = true) {
    const body = { message, content: contentB64, branch: BRANCH };
    if (shas[path]) body.sha = shas[path];
    const r = await fetch(API + path, { method: "PUT", headers: headers(), body: JSON.stringify(body) });
    if (r.status === 409 || r.status === 422) {
      if (!retry) throw new Error(`Conflicto guardando ${path}`);
      const cur = await fetch(API + path + `?ref=${BRANCH}&t=${Date.now()}`, { headers: headers(), cache: "no-store" });
      if (cur.ok) shas[path] = (await cur.json()).sha; else delete shas[path];
      return putFile(path, contentB64, message, false);
    }
    if (!r.ok) throw new Error(`Error ${r.status} guardando ${path}`);
    const j = await r.json();
    shas[path] = j.content.sha;
    return j;
  }
  const putJson = (path, data, msg) => putFile(path, utf8ToB64(JSON.stringify(data, null, 2) + "\n"), msg);

  /* ───── image resize (max 1600px, JPEG) */
  function resizeImage(file, max = 1600, q = 0.82) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => (b ? res(b) : rej(new Error("No pude procesar la imagen"))), "image/jpeg", q);
      };
      img.onerror = () => rej(new Error("Imagen no válida"));
      img.src = URL.createObjectURL(file);
    });
  }
  const blobToB64 = (blob) => new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result.split(",")[1]); fr.readAsDataURL(blob); });
  const slug = (s) => (s || "foto").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
  async function uploadImage(file, name) {
    const blob = await resizeImage(file);
    const path = `assets/img/uploads/${slug(name)}-${Date.now().toString(36)}.jpg`;
    await putFile(path, await blobToB64(blob), `Foto: ${path}`);
    return path;
  }

  /* ───── dates */
  const fmtRange = (a, b) => {
    if (!a) return "";
    const d1 = new Date(a + "T00:00:00"), d2 = b ? new Date(b + "T00:00:00") : null;
    const m1 = MONTHS[d1.getMonth()], y1 = d1.getFullYear();
    if (!d2 || b === a) return `${d1.getDate()} ${m1} ${y1}`;
    const m2 = MONTHS[d2.getMonth()], y2 = d2.getFullYear();
    if (y1 !== y2) return `${d1.getDate()} ${m1} ${y1} – ${d2.getDate()} ${m2} ${y2}`;
    if (m1 !== m2) return `${d1.getDate()} ${m1} – ${d2.getDate()} ${m2} ${y1}`;
    return `${d1.getDate()} – ${d2.getDate()} ${m1} ${y1}`;
  };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const state = (t) => t.status === "soon" ? "soon" : (new Date((t.end || t.start || "1970-01-01") + "T00:00:00") >= today() ? "upcoming" : "past");

  /* ───── login */
  async function tryLogin(tok) {
    const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, { headers: { Authorization: `Bearer ${tok}`, Accept: "application/vnd.github+json" } });
    if (!r.ok) throw new Error(r.status === 401 ? "Clave no válida" : `No tengo acceso al sitio (${r.status})`);
    const j = await r.json();
    if (!j.permissions || !j.permissions.push) throw new Error("Esta clave no tiene permiso para publicar");
  }
  $("#login-btn").addEventListener("click", async () => {
    const tok = $("#token").value.trim();
    if (!tok) return;
    $("#login-err").textContent = "";
    busy(true, "Comprobando…");
    try {
      await tryLogin(tok);
      token = tok;
      ($("#remember").checked ? localStorage : sessionStorage).setItem(KEY, tok);
      await start();
    } catch (e) { $("#login-err").textContent = e.message; }
    busy(false);
  });
  $("#token").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#login-btn").click(); });
  $("#logout").addEventListener("click", () => { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); location.reload(); });

  async function start() {
    busy(true, "Cargando…");
    try {
      [trips, gallery, site] = await Promise.all([getJson("data/trips.json"), getJson("data/gallery.json"), getJson("data/site.json")]);
      trips = trips || []; gallery = gallery || []; site = site || {};
      $("#login").hidden = true; $("#app").hidden = false;
      renderTrips(); renderGallery(); fillSettings();
    } catch (e) {
      toast(e.message, true);
      localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); token = "";
    }
    busy(false);
  }

  /* ───── tabs */
  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest(".tab"); if (!b) return;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-active", t === b));
    document.querySelectorAll(".pane").forEach((p) => p.classList.toggle("is-active", p.id === `pane-${b.dataset.tab}`));
  });

  /* ───── trips */
  function renderTrips() {
    const L = $("#trip-list");
    if (!trips.length) { L.innerHTML = `<p class="empty">Todavía no hay viajes. Crea el primero.</p>`; return; }
    L.innerHTML = trips.map((t, i) => {
      const st = state(t);
      const pill = st === "soon" ? `<span class="pill pill--soon">Próximamente</span>` : st === "upcoming" ? `<span class="pill">Próximo</span>` : `<span class="pill pill--past">Ya pasó</span>`;
      return `<div class="row" data-i="${i}">
        <img src="${esc(t.image)}" alt="">
        <div><div class="row__title">${esc(t.title)}</div><div class="row__meta">${pill}<span>${esc(t.dateLabel || "sin fecha")}</span><span>· ${esc([t.place, t.country].filter(Boolean).join(", "))}</span></div></div>
        <div class="row__actions">
          <button class="icon-btn" data-act="up" title="Subir" ${i === 0 ? "disabled" : ""}>↑</button>
          <button class="icon-btn" data-act="down" title="Bajar" ${i === trips.length - 1 ? "disabled" : ""}>↓</button>
          <button class="btn btn--paper btn--sm" data-act="edit">Editar</button>
        </div></div>`;
    }).join("");
  }
  $("#trip-list").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const i = +b.closest(".row").dataset.i;
    if (b.dataset.act === "edit") return openTrip(i);
    const j = b.dataset.act === "up" ? i - 1 : i + 1;
    [trips[i], trips[j]] = [trips[j], trips[i]];
    renderTrips();
    await publish(() => putJson("data/trips.json", trips, "Reordenar viajes"), "Orden guardado");
  });

  const dlg = $("#trip-dlg"), form = $("#trip-form");
  let pendingFile = null, editIndex = -1;
  function openTrip(i) {
    editIndex = i; pendingFile = null; form.reset();
    $("#trip-dlg-title").textContent = i < 0 ? "Nuevo viaje" : "Editar viaje";
    $("#trip-delete").hidden = i < 0;
    const t = i < 0 ? { country: "España", tags: [] } : trips[i];
    for (const k of ["id", "title", "place", "country", "start", "end", "dateLabel", "blurb", "image"]) if (form[k]) form[k].value = t[k] || "";
    form.tags.value = (t.tags || []).join(", ");
    form.soon.checked = t.status === "soon";
    const pv = $("#trip-preview"); pv.hidden = !t.image; if (t.image) pv.src = t.image;
    toggleDates();
    dlg.showModal();
  }
  const toggleDates = () => { $(".dates").style.opacity = form.soon.checked ? ".4" : "1"; };
  form.soon.addEventListener("change", toggleDates);
  const autoLabel = () => { if (!form.dateLabel.dataset.touched) form.dateLabel.value = fmtRange(form.start.value, form.end.value); };
  form.start.addEventListener("change", autoLabel); form.end.addEventListener("change", autoLabel);
  form.dateLabel.addEventListener("input", () => (form.dateLabel.dataset.touched = "1"));
  dlg.addEventListener("close", () => delete form.dateLabel.dataset.touched);
  $("#new-trip").addEventListener("click", () => openTrip(-1));
  $("#trip-cancel").addEventListener("click", () => dlg.close());
  $("#trip-close").addEventListener("click", () => dlg.close());
  $("#trip-file").addEventListener("change", (e) => {
    pendingFile = e.target.files[0] || null;
    if (pendingFile) { const pv = $("#trip-preview"); pv.src = URL.createObjectURL(pendingFile); pv.hidden = false; }
  });
  $("#trip-delete").addEventListener("click", async () => {
    if (!confirm(`¿Borrar el viaje "${trips[editIndex].title}"? Esto no se puede deshacer.`)) return;
    trips.splice(editIndex, 1); dlg.close(); renderTrips();
    await publish(() => putJson("data/trips.json", trips, "Borrar viaje"), "Viaje borrado y publicado");
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const t = {
      id: f.get("id") || `${slug(f.get("title"))}-${Date.now().toString(36)}`,
      status: form.soon.checked ? "soon" : "dated",
      title: f.get("title").trim(), place: f.get("place").trim(), country: f.get("country"),
      start: form.soon.checked ? "" : f.get("start"), end: form.soon.checked ? "" : f.get("end"),
      dateLabel: f.get("dateLabel").trim() || fmtRange(f.get("start"), f.get("end")),
      blurb: f.get("blurb").trim(),
      image: f.get("image"),
      tags: f.get("tags").split(",").map((s) => s.trim()).filter(Boolean)
    };
    if (!t.image && !pendingFile) return toast("Elige una foto para el viaje", true);
    if (!form.soon.checked && !t.start) return toast("Pon la fecha de inicio o marca “sin fechas”", true);
    dlg.close();
    await publish(async () => {
      if (pendingFile) { busy(true, "Subiendo foto…"); t.image = await uploadImage(pendingFile, t.title); }
      busy(true, "Publicando viaje…");
      if (editIndex < 0) trips.unshift(t); else trips[editIndex] = t;
      await putJson("data/trips.json", trips, `Viaje: ${t.title}`);
      renderTrips();
    }, "Viaje publicado · visible en 1-2 min");
  });

  /* ───── gallery */
  function renderGallery() {
    $("#photo-grid").innerHTML = gallery.map((p, i) => `<div class="photo" data-i="${i}">
      <img src="${esc(p.src)}" alt="">
      <input value="${esc(p.caption || "")}" placeholder="Pie de foto (opcional)" data-cap>
      <div class="photo__actions">
        <span><button class="icon-btn" data-act="left" ${i === 0 ? "disabled" : ""}>←</button> <button class="icon-btn" data-act="right" ${i === gallery.length - 1 ? "disabled" : ""}>→</button></span>
        <button class="icon-btn" data-act="del" title="Quitar">✕</button>
      </div></div>`).join("") || `<p class="empty">No hay fotos todavía.</p>`;
    $("#save-gallery").disabled = !galleryDirty;
  }
  const markDirty = () => { galleryDirty = true; $("#save-gallery").disabled = false; };
  $("#photo-grid").addEventListener("input", (e) => { if (e.target.matches("[data-cap]")) { gallery[+e.target.closest(".photo").dataset.i].caption = e.target.value; markDirty(); } });
  $("#photo-grid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const i = +b.closest(".photo").dataset.i;
    if (b.dataset.act === "del") gallery.splice(i, 1);
    else { const j = b.dataset.act === "left" ? i - 1 : i + 1; [gallery[i], gallery[j]] = [gallery[j], gallery[i]]; }
    markDirty(); renderGallery();
  });
  $("#photo-files").addEventListener("change", async (e) => {
    const files = [...e.target.files]; e.target.value = "";
    if (!files.length) return;
    await publish(async () => {
      let n = 0;
      for (const f of files) { busy(true, `Subiendo foto ${++n} de ${files.length}…`); gallery.push({ src: await uploadImage(f, f.name.replace(/\.[^.]+$/, "")), alt: "SOMAD", caption: "" }); }
      busy(true, "Publicando…");
      await putJson("data/gallery.json", gallery, `Fotos: +${files.length}`);
      galleryDirty = false; renderGallery();
    }, `${files.length} foto${files.length > 1 ? "s" : ""} publicada${files.length > 1 ? "s" : ""}`);
  });
  $("#save-gallery").addEventListener("click", () => publish(async () => { await putJson("data/gallery.json", gallery, "Actualizar fotos"); galleryDirty = false; renderGallery(); }, "Fotos guardadas y publicadas"));

  /* ───── settings */
  const sf = $("#settings-form");
  function fillSettings() { for (const el of sf.elements) if (el.name) el.value = site[el.name] || ""; }
  sf.addEventListener("submit", async (e) => {
    e.preventDefault();
    for (const el of sf.elements) if (el.name) site[el.name] = el.value.trim();
    site.whatsapp = site.whatsapp.replace(/\D/g, "");
    site.instagram = site.instagram.replace(/^@/, "");
    await publish(() => putJson("data/site.json", site, "Actualizar textos y contacto"), "Guardado y publicado");
  });

  /* ───── publish wrapper */
  async function publish(fn, okMsg) {
    busy(true, "Publicando…");
    try { await fn(); toast(okMsg); }
    catch (err) { console.error(err); toast(err.message || "Algo falló. Vuelve a intentarlo.", true); }
    busy(false);
  }

  /* ───── boot */
  if (token) start(); else $("#login").hidden = false;
})();
