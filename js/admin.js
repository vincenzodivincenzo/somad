/* SOMAD admin · publishes straight to the GitHub repo that serves the site. */
(function () {
  /* ───── config */
  const API = location.hostname.endsWith("github.io") ? "https://somadtrips.vercel.app" : "";
  const KEY = "somad_admin_key";
  let token = localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || "";
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

  /* ───── API */
  const headers = () => ({ "x-admin-key": token, "Content-Type": "application/json" });
  async function api(path, opts = {}) {
    const r = await fetch(`${API}${path}`, { cache: "no-store", ...opts, headers: { ...headers(), ...(opts.headers || {}) } });
    if (r.status === 401) throw Object.assign(new Error("La clave no es válida o ha cambiado. Vuelve a entrar."), { auth: true });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
    return j;
  }
  const putContent = (kind, data) => api("/api/admin/content", { method: "PUT", body: JSON.stringify({ kind, data }) });
  const putJson = (path, data) => putContent(path.includes("trips") ? "trips" : path.includes("gallery") ? "gallery" : "settings", data);

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
    const { url } = await api("/api/admin/upload", { method: "POST", body: JSON.stringify({ name: slug(name), type: "image/jpeg", data: await blobToB64(blob) }) });
    return url;
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
    const r = await fetch(`${API}/api/admin/ping`, { headers: { "x-admin-key": tok }, cache: "no-store" });
    if (r.status === 401) throw new Error("Clave no válida");
    if (!r.ok) throw new Error(`El servidor no responde (${r.status}). Prueba en un minuto.`);
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
      await tryLogin(token);
      const c = await api("/api/content");
      trips = c.trips || []; gallery = c.gallery || []; site = c.settings || {};
      $("#login").hidden = true; $("#app").hidden = false;
      renderTrips(); renderGallery(); fillSettings(); initLeads(); initBookings();
    } catch (e) {
      toast(e.message, true);
      localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); token = "";
      $("#login").hidden = false;
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
        <div><div class="row__title">${esc(t.title)}</div><div class="row__meta">${pill}<span>${esc(t.dateLabel || "sin fecha")}</span><span>· ${esc([t.place, t.country].filter(Boolean).join(", "))}</span>${t.spots ? `<span>· ${takenFor(t.id)}/${t.spots} plazas</span>` : ""}${t.price ? `<span>· ${t.price} €</span>` : ""}</div></div>
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
    await publish(() => putJson("data/trips.json", trips), "Orden guardado");
  });

  const dlg = $("#trip-dlg"), form = $("#trip-form");
  let pendingFile = null, editIndex = -1;
  function openTrip(i) {
    editIndex = i; pendingFile = null; form.reset();
    $("#trip-dlg-title").textContent = i < 0 ? "Nuevo viaje" : "Editar viaje";
    $("#trip-delete").hidden = i < 0;
    const t = i < 0 ? { country: "España", tags: [] } : trips[i];
    for (const k of ["id", "title", "place", "country", "start", "end", "dateLabel", "blurb", "image", "price", "deposit", "spots", "paymentLink"]) if (form[k]) form[k].value = t[k] ?? "";
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
    await publish(() => putJson("data/trips.json", trips), "Viaje borrado y publicado");
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
      tags: f.get("tags").split(",").map((s) => s.trim()).filter(Boolean),
      price: f.get("price") ? Number(f.get("price")) : null,
      deposit: f.get("deposit") ? Number(f.get("deposit")) : null,
      spots: f.get("spots") ? Number(f.get("spots")) : null,
      paymentLink: (f.get("paymentLink") || "").trim() || null
    };
    if (!t.image && !pendingFile) return toast("Elige una foto para el viaje", true);
    if (!form.soon.checked && !t.start) return toast("Pon la fecha de inicio o marca “sin fechas”", true);
    dlg.close();
    await publish(async () => {
      if (pendingFile) { busy(true, "Subiendo foto…"); t.image = await uploadImage(pendingFile, t.title); }
      busy(true, "Publicando viaje…");
      if (editIndex < 0) trips.unshift(t); else trips[editIndex] = t;
      await putJson("data/trips.json", trips);
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
      await putJson("data/gallery.json", gallery);
      galleryDirty = false; renderGallery();
    }, `${files.length} foto${files.length > 1 ? "s" : ""} publicada${files.length > 1 ? "s" : ""}`);
  });
  $("#save-gallery").addEventListener("click", () => publish(async () => { await putJson("data/gallery.json", gallery); galleryDirty = false; renderGallery(); }, "Fotos guardadas y publicadas"));

  /* ───── settings */
  const sf = $("#settings-form");
  function fillSettings() {
    for (const el of sf.elements) if (el.name) el.value = Array.isArray(site[el.name]) ? site[el.name].join(", ") : (site[el.name] || "");
  }
  sf.addEventListener("submit", async (e) => {
    e.preventDefault();
    for (const el of sf.elements) if (el.name) site[el.name] = el.value.trim();
    site.whatsapp = site.whatsapp.replace(/\D/g, "");
    site.instagram = site.instagram.replace(/^@/, "");
    site.polaroidCaptions = String(site.polaroidCaptions || "").split(",").map((x) => x.trim()).filter(Boolean);
    await publish(() => putJson("data/site.json", site), "Guardado y publicado");
  });

  /* ───── CRM */
  let leads = [], leadFilter = "all", leadQuery = "", editLead = null;
  const STATUS = { nuevo: "Nuevo", contactado: "Contactado", reservado: "Reservado", descartado: "Descartado" };
  const LEVEL = { nunca: "Nunca ha surfeado", principiante: "Principiante", intermedio: "Intermedio", avanzado: "Avanzado" };
  const dbReady = () => true;

  function initLeads() { $("#leads-setup").hidden = true; $("#leads-ui").hidden = false; loadLeads(); }
  async function loadLeads() {
    try {
      leads = await api("/api/leads");
      if (!leads.length) $("#leads-list").innerHTML = `<p class="empty">Nadie en la lista todavía. En cuanto alguien se apunte en la web aparece aquí.</p>`;
      renderLeads();
    } catch (e) { toast(e.message, true); }
  }
  const fmtDate = (iso) => { const d = new Date(iso); return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }); };
  const telDigits = (p) => (p || "").replace(/\D/g, "");
  function renderLeads() {
    const counts = { all: leads.length };
    for (const k of Object.keys(STATUS)) counts[k] = leads.filter((l) => l.status === k).length;
    $("#leads-stats").innerHTML = [["all", "En lista"], ["nuevo", "Sin contactar"], ["contactado", "Contactados"], ["reservado", "Reservados"]].map(([k, lab]) => `<div class="stat"><b>${counts[k]}</b><span>${lab}</span></div>`).join("");
    const badge = $("#leads-count"); badge.hidden = !counts.nuevo; badge.textContent = counts.nuevo;
    const q = leadQuery.toLowerCase();
    const list = leads.filter((l) => (leadFilter === "all" || l.status === leadFilter) && (!q || [l.name, l.email, l.phone, l.interest, l.message, l.notes].join(" ").toLowerCase().includes(q)));
    $("#leads-list").innerHTML = list.length ? list.map((l) => `
      <button class="lead" data-id="${l.id}">
        <div>
          <div class="lead__name">${esc(l.name)} <span class="pill pill--${esc(l.status)}">${STATUS[l.status] || esc(l.status)}</span></div>
          <div class="lead__meta"><span>${esc(l.interest || "")}</span><span>· ${LEVEL[l.level] || esc(l.level || "")}</span>${l.people > 1 ? `<span>· ${l.people} personas</span>` : ""}${l.phone ? `<span>· ${esc(l.phone)}</span>` : ""}${l.email ? `<span>· ${esc(l.email)}</span>` : ""}</div>
        </div>
        <div class="lead__when">${fmtDate(l.created_at)}</div>
        ${l.message || l.notes ? `<div class="lead__note">${l.message ? `💬 ${esc(l.message)}` : ""}${l.message && l.notes ? "<br>" : ""}${l.notes ? `📝 ${esc(l.notes)}` : ""}</div>` : ""}
      </button>`).join("") : (leads.length ? `<p class="empty">Nada con ese filtro.</p>` : $("#leads-list").innerHTML);
  }
  $("#leads-filters").addEventListener("click", (e) => {
    const b = e.target.closest(".filter"); if (!b) return;
    document.querySelectorAll("#leads-filters .filter").forEach((x) => x.classList.toggle("is-active", x === b));
    leadFilter = b.dataset.status; renderLeads();
  });
  $("#leads-search").addEventListener("input", (e) => { leadQuery = e.target.value; renderLeads(); });
  $("#leads-refresh").addEventListener("click", loadLeads);
  $("#leads-export").addEventListener("click", () => {
    const cols = ["created_at", "name", "email", "phone", "level", "interest", "people", "message", "status", "notes"];
    const csv = [cols.join(";"), ...leads.map((l) => cols.map((c) => `"${String(l[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })); a.download = `somad-lista-espera-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  });

  const ldlg = $("#lead-dlg"), lform = $("#lead-form");
  $("#leads-list").addEventListener("click", (e) => {
    const b = e.target.closest(".lead"); if (!b) return;
    editLead = leads.find((l) => l.id === b.dataset.id); if (!editLead) return;
    const l = editLead;
    $("#lead-name").textContent = l.name;
    $("#lead-facts").innerHTML = [["Email", l.email], ["WhatsApp", l.phone], ["Nivel", LEVEL[l.level] || l.level], ["Viaje", l.interest], ["Personas", l.people], ["Se apuntó", fmtDate(l.created_at)], ["Mensaje", l.message]].filter(([, v]) => v).map(([k, v]) => `<div><span>${k}</span>${esc(v)}</div>`).join("");
    const wa = telDigits(l.phone), msg = encodeURIComponent(`Hola ${l.name.split(" ")[0]}! Soy de SOMAD 🌊 Te apuntaste a la lista de espera para ${l.interest || "el próximo viaje"}. `);
    $("#lead-quick").innerHTML = [wa ? `<a class="btn btn--ink btn--sm" href="https://wa.me/${wa}?text=${msg}" target="_blank" rel="noopener">WhatsApp</a>` : "", l.email ? `<a class="btn btn--paper btn--sm" href="mailto:${encodeURIComponent(l.email)}?subject=${encodeURIComponent("SOMAD · próximo viaje")}">Email</a>` : ""].join("");
    lform.status.value = l.status; lform.notes.value = l.notes || "";
    ldlg.showModal();
  });
  $("#lead-cancel").addEventListener("click", () => ldlg.close());
  $("#lead-close").addEventListener("click", () => ldlg.close());
  lform.addEventListener("submit", async (e) => {
    e.preventDefault();
    const patch = { status: lform.status.value, notes: lform.notes.value.trim() || null };
    if (patch.status !== "nuevo" && !editLead.contacted_at) patch.contacted_at = new Date().toISOString();
    ldlg.close();
    await publish(async () => {
      const row = await api(`/api/leads?id=${editLead.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      Object.assign(editLead, row); renderLeads();
    }, "Guardado");
  });
  $("#lead-delete").addEventListener("click", async () => {
    if (!confirm(`¿Borrar a ${editLead.name} de la lista? No se puede deshacer.`)) return;
    ldlg.close();
    await publish(async () => {
      await api(`/api/leads?id=${editLead.id}`, { method: "DELETE" });
      leads = leads.filter((l) => l.id !== editLead.id); renderLeads();
    }, "Borrado");
  });

  /* ───── Bookings */
  let bookings = [], bookFilter = "all", bookTrip = "all", editBooking = null;
  const BSTATUS = { solicitada: "Solicitada", confirmada: "Confirmada", pagada: "Pagada", cancelada: "Cancelada" };
  function initBookings() { $("#bookings-setup").hidden = true; $("#bookings-ui").hidden = false; loadBookings(); }
  async function loadBookings() {
    try {
      bookings = await api("/api/bookings");
      const sel = $("#bookings-trip");
      const tripsSeen = [...new Map(bookings.map((b) => [b.trip_id, b.trip_title + (b.trip_date ? ` · ${b.trip_date}` : "")])).entries()];
      sel.innerHTML = `<option value="all">Todos los viajes</option>` + tripsSeen.map(([id, t]) => `<option value="${esc(id)}">${esc(t)}</option>`).join("");
      renderBookings(); renderTrips();
    } catch (e) { toast(e.message, true); }
  }
  const takenFor = (tripId) => bookings.filter((b) => b.trip_id === tripId && b.status !== "cancelada").reduce((n, b) => n + (b.people || 1), 0);
  function renderBookings() {
    const counts = { all: bookings.length };
    for (const k of Object.keys(BSTATUS)) counts[k] = bookings.filter((b) => b.status === k).length;
    const pax = bookings.filter((b) => b.status === "confirmada" || b.status === "pagada").reduce((n, b) => n + (b.people || 1), 0);
    $("#bookings-stats").innerHTML = [["solicitada", "Por confirmar"], ["confirmada", "Confirmadas"], ["pagada", "Pagadas"]].map(([k, lab]) => `<div class="stat"><b>${counts[k]}</b><span>${lab}</span></div>`).join("") + `<div class="stat"><b>${pax}</b><span>Personas confirmadas</span></div>`;
    const badge = $("#bookings-count"); badge.hidden = !counts.solicitada; badge.textContent = counts.solicitada;
    const list = bookings.filter((b) => (bookFilter === "all" || b.status === bookFilter) && (bookTrip === "all" || b.trip_id === bookTrip));
    $("#bookings-list").innerHTML = list.length ? list.map((b) => `
      <button class="lead" data-id="${b.id}">
        <div>
          <div class="lead__name">${esc(b.name)} <span class="pill pill--${esc(b.status)}">${BSTATUS[b.status] || esc(b.status)}</span>${b.people > 1 ? `<span class="pill">${b.people} pers.</span>` : ""}</div>
          <div class="lead__meta"><span>${esc(b.trip_title)}${b.trip_date ? ` · ${esc(b.trip_date)}` : ""}</span><span>· ${LEVEL[b.level] || esc(b.level || "")}</span>${b.phone ? `<span>· ${esc(b.phone)}</span>` : ""}${b.email ? `<span>· ${esc(b.email)}</span>` : ""}</div>
        </div>
        <div class="lead__when">${fmtDate(b.created_at)}</div>
        ${b.message || b.notes ? `<div class="lead__note">${b.message ? `💬 ${esc(b.message)}` : ""}${b.message && b.notes ? "<br>" : ""}${b.notes ? `📝 ${esc(b.notes)}` : ""}</div>` : ""}
      </button>`).join("") : `<p class="empty">${bookings.length ? "Nada con ese filtro." : "Todavía no hay reservas. Aparecen aquí cuando alguien pide plaza en un viaje con fecha."}</p>`;
  }
  $("#bookings-filters").addEventListener("click", (e) => {
    const b = e.target.closest(".filter"); if (!b) return;
    document.querySelectorAll("#bookings-filters .filter").forEach((x) => x.classList.toggle("is-active", x === b));
    bookFilter = b.dataset.status; renderBookings();
  });
  $("#bookings-trip").addEventListener("change", (e) => { bookTrip = e.target.value; renderBookings(); });
  $("#bookings-refresh").addEventListener("click", loadBookings);
  $("#bookings-export").addEventListener("click", () => {
    const cols = ["created_at", "trip_title", "trip_date", "name", "email", "phone", "level", "people", "message", "status", "notes"];
    const csv = [cols.join(";"), ...bookings.map((l) => cols.map((c) => `"${String(l[c] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })); a.download = `somad-reservas-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  });
  const bdlg = $("#booking-dlg"), bform = $("#booking-form");
  $("#bookings-list").addEventListener("click", (e) => {
    const el = e.target.closest(".lead"); if (!el) return;
    editBooking = bookings.find((b) => b.id === el.dataset.id); if (!editBooking) return;
    const b = editBooking, trip = trips.find((t) => t.id === b.trip_id);
    $("#booking-name").textContent = b.name;
    $("#booking-facts").innerHTML = [["Viaje", `${b.trip_title}${b.trip_date ? ` · ${b.trip_date}` : ""}`], ["Personas", b.people], ["Email", b.email], ["WhatsApp", b.phone], ["Nivel", LEVEL[b.level] || b.level], ["Pidió plaza", fmtDate(b.created_at)], ["Importe", trip && trip.price ? `${trip.price * (b.people || 1)} € (señal ${trip.deposit ? trip.deposit * (b.people || 1) : "—"} €)` : null], ["Mensaje", b.message]].filter(([, v]) => v).map(([k, v]) => `<div><span>${k}</span>${esc(v)}</div>`).join("");
    const wa = telDigits(b.phone), msg = encodeURIComponent(`Hola ${b.name.split(" ")[0]}! Soy de SOMAD 🌊 Sobre tu plaza en ${b.trip_title}${b.trip_date ? ` (${b.trip_date})` : ""}: `);
    $("#booking-quick").innerHTML = [wa ? `<a class="btn btn--ink btn--sm" href="https://wa.me/${wa}?text=${msg}" target="_blank" rel="noopener">WhatsApp</a>` : "", b.email ? `<a class="btn btn--paper btn--sm" href="mailto:${encodeURIComponent(b.email)}?subject=${encodeURIComponent("SOMAD · tu plaza en " + b.trip_title)}">Email</a>` : "", trip && trip.paymentLink ? `<a class="btn btn--paper btn--sm" href="${esc(trip.paymentLink)}" target="_blank" rel="noopener">Enlace de pago</a>` : ""].join("");
    bform.status.value = b.status; bform.notes.value = b.notes || "";
    bdlg.showModal();
  });
  $("#booking-cancel").addEventListener("click", () => bdlg.close());
  $("#booking-close").addEventListener("click", () => bdlg.close());
  bform.addEventListener("submit", async (e) => {
    e.preventDefault();
    const patch = { status: bform.status.value, notes: bform.notes.value.trim() || null };
    bdlg.close();
    await publish(async () => {
      const row = await api(`/api/bookings?id=${editBooking.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      Object.assign(editBooking, row); renderBookings(); renderTrips();
    }, "Guardado");
  });
  $("#booking-delete").addEventListener("click", async () => {
    if (!confirm(`¿Borrar la reserva de ${editBooking.name}? No se puede deshacer.`)) return;
    bdlg.close();
    await publish(async () => {
      await api(`/api/bookings?id=${editBooking.id}`, { method: "DELETE" });
      bookings = bookings.filter((b) => b.id !== editBooking.id); renderBookings(); renderTrips();
    }, "Borrada");
  });

  /* ───── publish wrapper */
  async function publish(fn, okMsg) {
    busy(true, "Guardando…");
    try { await fn(); toast(okMsg.replace(" · visible en 1-2 min", "")); }
    catch (err) { console.error(err); toast(err.message || "Algo falló. Vuelve a intentarlo.", true); }
    busy(false);
  }

  /* ───── boot */
  if (token) start(); else $("#login").hidden = false;
})();
