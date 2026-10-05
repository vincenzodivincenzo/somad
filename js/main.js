(async function () {
  /* API lives on Vercel; the static copy on GitHub Pages calls it cross-origin */
  const API = location.hostname.endsWith("github.io") ? "https://somadtrips.vercel.app" : "";
  const noCache = { cache: "no-store" };
  const load = (p, fallback) => fetch(p, noCache).then((r) => (r.ok ? r.json() : fallback)).catch(() => fallback);
  let TRIPS, GALLERY, CFG;
  let hasDb = false;
  try {
    const r = await fetch(`${API}/api/content`, noCache);
    if (!r.ok) throw new Error(r.status);
    ({ trips: TRIPS, gallery: GALLERY, settings: CFG } = await r.json());
    hasDb = true;
  } catch (_) {
    [TRIPS, GALLERY, CFG] = await Promise.all([
      load("data/trips.json", []),
      load("data/gallery.json", []),
      load("data/site.json", { whatsapp: "34661163140", instagram: "somad.surftrips" })
    ]);
  }
  if (hasDb) {
    try {
      const r = await fetch(`${API}/api/counts`, noCache);
      if (r.ok) { const taken = await r.json(); TRIPS.forEach((t) => { if (t.spots) t.spotsLeft = Math.max(0, t.spots - (taken[t.id] || 0)); }); }
    } catch (_) { /* sin contador no pasa nada */ }
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const FLAGS = { "España": "🇪🇸", "Portugal": "🇵🇹", "Islas Canarias": "🇮🇨", "Francia": "🇫🇷", "Marruecos": "🇲🇦" };
  const DESTINATIONS = ["Asturias", "Ericeira", "Lanzarote", "Fuerteventura"];

  /* WhatsApp links */
  const waUrl = (msg) => `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(msg || "Hola SOMAD!")}`;
  document.querySelectorAll("[data-wa]").forEach((el) => {
    el.setAttribute("href", waUrl(el.dataset.wa));
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener");
  });

  /* Site copy from settings */
  const set = (id, v, html) => { const el = document.getElementById(id); if (el && v) html ? (el.innerHTML = v) : (el.textContent = v); };
  if (CFG.followers) set("chip-followers", `${CFG.followers} en la comunidad`);
  if (CFG.heroTitle) {
    const words = CFG.heroTitle.trim().split(" ");
    const tail = words.splice(-2).join(" ");
    set("hero-title", `${esc(words.join(" "))} <span class="hl">${esc(tail)}</span>`, true);
  }
  if (CFG.heroSub) set("hero-sub", CFG.heroSub);
  set("year", String(new Date().getFullYear()));
  if (Array.isArray(CFG.polaroidCaptions)) document.querySelectorAll(".polaroids .pol figcaption").forEach((c, i) => { if (CFG.polaroidCaptions[i]) c.textContent = CFG.polaroidCaptions[i]; });

  /* Hero reel: slow loop cut from their Instagram videos; skipped on reduced motion or data saver */
  const hv = document.getElementById("hero-video");
  if (hv && !matchMedia("(prefers-reduced-motion: reduce)").matches && !(navigator.connection && navigator.connection.saveData)) {
    const portrait = matchMedia("(max-aspect-ratio: 4/5)").matches;
    hv.poster = portrait ? "assets/video/poster-9x16.jpg" : "assets/video/poster-16x9.jpg";
    hv.src = portrait ? "assets/video/hero-9x16.mp4" : "assets/video/hero-16x9.mp4";
    const on = () => document.getElementById("hero").classList.add("hero--video");
    hv.addEventListener("playing", on, { once: true });
    hv.play().then(on).catch(() => {});
  }

  /* Mobile nav */
  const burger = document.getElementById("burger");
  const links = document.getElementById("nav-links");
  if (burger && links) {
    burger.addEventListener("click", () => {
      const open = links.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => { links.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); }));
  }

  /* Trips */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const parse = (d) => (d ? new Date(d + "T00:00:00") : null);
  const isUpcoming = (t) => t.status === "soon" || ((parse(t.end) || parse(t.start) || new Date(0)) >= today);
  const upcoming = TRIPS.filter(isUpcoming);
  const past = TRIPS.filter((t) => !isUpcoming(t));

  const badge = (t) => t.status === "soon"
    ? `<span class="trip__badge trip__badge--soon">Próximamente</span>`
    : isUpcoming(t) ? `<span class="trip__badge">Plazas abiertas</span>` : `<span class="trip__badge trip__badge--past">Ya pasó</span>`;

  const countdown = (t) => {
    const s = parse(t.start);
    if (!s || s < today) return "";
    const days = Math.round((s - today) / 86400000);
    return `<div class="countdown"><div><b>${days}</b><small>días</small></div><div><b>${Math.floor(days / 7)}</b><small>semanas</small></div></div>`;
  };

  const skin = ["sk", "sk sk--2", "sk sk--3"];
  const card = (t, i, featured) => {
    const kicker = [t.place, t.country].filter(Boolean).join(" · ");
    const flag = t.flag || FLAGS[t.country] || "🌊";
    const interest = t.status === "soon" ? "" : `${t.title} · ${t.dateLabel}`;
    const bookable = t.status !== "soon" && isUpcoming(t);
    const soldOut = bookable && t.spots && t.spotsLeft !== undefined && t.spotsLeft <= 0;
    const label = t.cta || (t.status === "soon" ? "Apuntarme a la lista" : soldOut ? "Lista de espera" : bookable ? "Reservar plaza" : "Avísame del próximo");
    const action = bookable && !soldOut ? `data-book="${esc(t.id)}"` : `data-list="${esc(interest)}"`;
    const price = t.price ? `<span class="trip__price">${esc(t.price)} €${t.deposit ? `<small> · señal ${esc(t.deposit)} €</small>` : ""}</span>` : "";
    const spots = bookable && t.spots ? `<span class="trip__spots">${soldOut ? "Completo" : t.spotsLeft !== undefined ? `${t.spotsLeft} plazas libres` : `${t.spots} plazas`}</span>` : "";
    return `
      <article class="trip ${skin[i % 3]} ${featured ? "trip--featured" : ""}" data-country="${esc(t.country)}">
        <div class="trip__media">${badge(t)}<img src="${esc(t.image)}" alt="${esc(t.title)}" loading="lazy"></div>
        <div class="trip__body">
          <span class="trip__kicker">${flag} ${esc(kicker)}</span>
          <h3>${esc(t.title)}</h3>
          <span class="trip__date">${esc(t.dateLabel)}</span>
          <p class="trip__blurb">${esc(t.blurb)}</p>
          ${featured ? countdown(t) : ""}
          <div class="trip__tags">${(t.tags || []).map((x) => `<span>${esc(x)}</span>`).join("")}</div>
          <div class="trip__foot"><a class="btn ${isUpcoming(t) ? "btn--sun" : "btn--paper"} btn--sm" ${action}>${esc(label)}</a><span>${price}${price && spots ? "<br>" : ""}${spots}</span></div>
        </div>
      </article>`;
  };

  const up = document.getElementById("trips-upcoming");
  const pa = document.getElementById("trips-past");
  if (up) up.innerHTML = upcoming.length ? upcoming.map((t, i) => card(t, i, i === 0)).join("") : `<p class="empty">Estamos cerrando el próximo destino. Apúntate a la lista y te avisamos.</p>`;
  if (pa) pa.innerHTML = past.map((t, i) => card(t, i, false)).join("");

  /* Announcement strip */
  const stripText = document.getElementById("strip-text");
  if (stripText) {
    if (CFG.announcement) stripText.textContent = CFG.announcement;
    else if (upcoming[0]) stripText.textContent = upcoming[0].status === "soon" ? `Próximo viaje: ${upcoming[0].place} · ${upcoming[0].dateLabel}` : `Próximo viaje: ${upcoming[0].title} · ${upcoming[0].dateLabel}`;
  }

  /* Marquee from destinations */
  const mq = document.getElementById("marquee");
  if (mq) {
    const names = [...new Set(TRIPS.filter((t) => t.status !== "soon").map((t) => `${t.title} ${FLAGS[t.country] || ""}`))];
    const items = [...names, "Surfing y buenos momentos 🌺"];
    const half = items.map((x) => `<span>${esc(x)}<svg class="star"><use href="#star"/></svg></span>`).join("");
    mq.innerHTML = half + half;
  }

  /* Filters */
  document.querySelectorAll("#filters .filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#filters .filter").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const f = btn.dataset.filter;
      pa.querySelectorAll(".trip").forEach((c) => { c.style.display = f === "all" || c.dataset.country === f ? "" : "none"; });
    });
  });

  /* Gallery */
  const g = document.getElementById("gallery");
  if (g) g.innerHTML = GALLERY.map((p) => `
    <figure><a href="https://www.instagram.com/${esc(CFG.instagram)}/" target="_blank" rel="noopener"><img src="${esc(p.src)}" alt="${esc(p.alt || p.caption || "SOMAD")}" loading="lazy"></a>${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ""}</figure>`).join("");

  /* ───────── Calendar: one month at a time */
  const cal = document.getElementById("calendar");
  if (cal) {
    const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const DOW = ["L", "M", "X", "J", "V", "S", "D"];
    const dated = TRIPS.filter((t) => t.status !== "soon" && t.start);
    const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayMap = {};
    dated.forEach((t) => {
      const a = parse(t.start), b = parse(t.end) || a;
      for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
        const k = key(d); if (!dayMap[k]) dayMap[k] = { t, first: +d === +a, last: +d === +b };
      }
    });
    const firstTrip = dated.map((t) => parse(t.start)).sort((a, b) => a - b)[0];
    const minMonth = new Date(Math.min(firstTrip || today, today)); minMonth.setDate(1);
    const maxMonth = new Date(today.getFullYear(), today.getMonth() + 18, 1);
    let cur = new Date(today.getFullYear(), today.getMonth(), 1);
    // if nothing upcoming is dated, still open on today
    const tripAction = (t) => {
      const upcoming = isUpcoming(t);
      const full = t.spots && t.spotsLeft !== undefined && t.spotsLeft <= 0;
      return upcoming && !full ? `data-book="${esc(t.id)}"` : `data-list="${esc(t.title + " · " + t.dateLabel)}"`;
    };
    const render = () => {
      const y = cur.getFullYear(), mi = cur.getMonth();
      document.getElementById("cal-month").textContent = MONTHS[mi];
      document.getElementById("cal-year").textContent = y;
      const first = (cur.getDay() + 6) % 7, days = new Date(y, mi + 1, 0).getDate();
      const prevDays = new Date(y, mi, 0).getDate();
      const cells = DOW.map((d) => `<span class="dow">${d}</span>`);
      for (let i = first - 1; i >= 0; i--) cells.push(`<span class="day out">${prevDays - i}</span>`);
      const here = new Map();
      for (let d = 1; d <= days; d++) {
        const date = new Date(y, mi, d), hit = dayMap[key(date)];
        const done = hit && !isUpcoming(hit.t);
        const cls = ["day", hit ? "trip" : "", hit && hit.first ? "first" : "", hit && hit.last ? "last" : "", done ? "done" : "", +date === +today ? "today" : "", date < today ? "past" : ""].filter(Boolean).join(" ");
        cells.push(`<span class="${cls}" ${hit ? tripAction(hit.t) : ""} ${hit ? `title="${esc(hit.t.title)}"` : ""}>${d}</span>`);
        if (hit) here.set(hit.t.id, hit.t);
      }
      const rest = (7 - ((first + days) % 7)) % 7;
      for (let i = 1; i <= rest; i++) cells.push(`<span class="day out">${i}</span>`);
      document.getElementById("cal-grid").innerHTML = cells.join("");
      const list = [...here.values()];
      document.getElementById("cal-list").innerHTML = list.length ? list.map((t) => {
        const done = !isUpcoming(t);
        const full = t.spots && t.spotsLeft !== undefined && t.spotsLeft <= 0;
        const label = done ? "Avísame del próximo" : full ? "Lista de espera" : "Reservar plaza";
        return `<div class="calone__trip ${done ? "calone__trip--done" : ""}" ${tripAction(t)}><div><b>${esc(t.title)}</b><small>${esc(t.dateLabel)}${t.place ? ` · ${esc(t.place)}` : ""}${t.price && !done ? ` · ${esc(t.price)} €` : ""}</small></div><span class="btn ${done ? "btn--paper" : "btn--sun"} btn--sm">${label}</span></div>`;
      }).join("") : `<p class="calone__empty">${mi === today.getMonth() && y === today.getFullYear() ? "Este mes no hay viaje. Apúntate a la lista y te avisamos del próximo." : "Sin viajes este mes."}</p>`;
      document.getElementById("cal-prev").disabled = cur <= minMonth;
      document.getElementById("cal-next").disabled = cur >= maxMonth;
      document.getElementById("cal-today").hidden = mi === today.getMonth() && y === today.getFullYear();
    };
    const go = (n) => { cur = new Date(cur.getFullYear(), cur.getMonth() + n, 1); render(); };
    document.getElementById("cal-prev").addEventListener("click", () => go(-1));
    document.getElementById("cal-next").addEventListener("click", () => go(1));
    document.getElementById("cal-today").addEventListener("click", () => { cur = new Date(today.getFullYear(), today.getMonth(), 1); render(); });
    cal.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); });
    let sx = null;
    cal.addEventListener("touchstart", (e) => (sx = e.touches[0].clientX), { passive: true });
    cal.addEventListener("touchend", (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); sx = null; });
    render();
  }

  /* ───────── Waiting list (CRM) */
  const dlg = document.getElementById("list-dlg");
  const form = document.getElementById("list-form");
  const okBox = document.getElementById("list-ok");
  const errBox = document.getElementById("list-err");
  const interestSel = document.getElementById("list-interest");
  if (interestSel) {
    const opts = [];
    upcoming.filter((t) => t.status !== "soon").forEach((t) => opts.push(`${t.title} · ${t.dateLabel}`));
    opts.push("El próximo, sea donde sea");
    DESTINATIONS.forEach((d) => opts.push(d));
    interestSel.innerHTML = opts.map((o) => `<option>${esc(o)}</option>`).join("");
    interestSel.value = "El próximo, sea donde sea";
  }

  let mode = "list", bookTrip = null;
  const el = (id) => document.getElementById(id);
  const setMode = (m, trip) => {
    mode = m; bookTrip = trip || null;
    const booking = m === "book";
    el("list-kicker").textContent = booking ? "Reserva" : "Lista de espera";
    el("list-title").textContent = booking ? `Tu plaza en ${trip.title}` : "Apúntate al próximo SOMAD";
    el("list-intro").textContent = booking ? "Rellena esto y te confirmamos la plaza. La reserva se cierra con la señal." : "Un minuto. Te escribimos cuando salga el viaje, con fechas y precio. Sin compromiso.";
    el("book-box").hidden = !booking;
    el("interest-field").hidden = booking;
    el("list-submit").textContent = booking ? "Solicitar plaza" : "Apuntarme";
    form.trip_id.value = booking ? trip.id : "";
    if (booking) {
      el("book-trip").textContent = trip.title;
      el("book-date").textContent = [trip.place, trip.dateLabel].filter(Boolean).join(" · ");
      el("book-price").innerHTML = trip.price ? `${esc(trip.price)} € / persona${trip.deposit ? `<small>señal ${esc(trip.deposit)} €</small>` : ""}` : `<small>precio por confirmar</small>`;
    }
  };
  const openList = (interest) => {
    if (!dlg) return;
    setMode("list");
    form.hidden = false; okBox.hidden = true; errBox.hidden = true;
    if (interest && interestSel && [...interestSel.options].some((o) => o.value === interest)) interestSel.value = interest;
    dlg.showModal();
    setTimeout(() => form.name.focus(), 50);
  };
  const openBook = (tripId) => {
    const trip = TRIPS.find((t) => t.id === tripId);
    if (!trip) return openList();
    setMode("book", trip);
    form.hidden = false; okBox.hidden = true; errBox.hidden = true;
    dlg.showModal();
    setTimeout(() => form.name.focus(), 50);
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-book]");
    if (b) { e.preventDefault(); openBook(b.dataset.book); return; }
    const t = e.target.closest("[data-list]");
    if (t) { e.preventDefault(); openList(t.dataset.list); return; }
    if (e.target.closest("[data-close]")) dlg.close();
  });
  if (dlg) dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

  const composeWa = (d) => `Hola SOMAD! ${mode === "book" ? `Quiero reservar plaza en ${bookTrip.title} (${bookTrip.dateLabel}) 🏄` : "Quiero apuntarme a la lista de espera 🌊"}\nNombre: ${d.name}\nNivel: ${d.level}${mode === "book" ? "" : `\nViaje: ${d.interest}`}\nSomos: ${d.people}${d.email ? `\nEmail: ${d.email}` : ""}${d.message ? `\nNota: ${d.message}` : ""}`;
  const showOk = () => {
    form.hidden = true; okBox.hidden = false;
    const booking = mode === "book";
    el("ok-title").textContent = booking ? "¡Plaza solicitada!" : "¡Estás dentro!";
    el("ok-text").textContent = booking
      ? (bookTrip.paymentLink ? `Te la guardamos ${bookTrip.deposit ? `al recibir la señal de ${bookTrip.deposit} €` : "al recibir la señal"}. Puedes pagarla ahora o esperar a que te escribamos.` : "Te escribimos en breve para confirmarla y mandarte cómo pagar la señal.")
      : "Te escribimos en cuanto salga el próximo viaje. Mientras tanto, síguenos para ver lo que se cuece.";
    const pay = el("ok-pay");
    pay.hidden = !(booking && bookTrip.paymentLink);
    if (!pay.hidden) pay.href = bookTrip.paymentLink;
  };

  if (form) form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errBox.hidden = true;
    const f = new FormData(form);
    const d = {
      name: (f.get("name") || "").trim(),
      email: (f.get("email") || "").trim(),
      phone: (f.get("phone") || "").trim(),
      level: f.get("level"),
      interest: f.get("interest"),
      people: Number(f.get("people")) || 1,
      message: (f.get("message") || "").trim(),
      consent: form.consent.checked,
      source: "web"
    };
    if (f.get("website")) { showOk(); return; } // honeypot
    if (d.name.length < 2) return showErr("Dinos tu nombre.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return showErr("Ese email no parece correcto.");
    if (!d.consent) return showErr("Necesitamos tu permiso para guardar los datos.");
    if (!hasDb) {
      window.open(waUrl(composeWa(d)), "_blank", "noopener");
      showOk();
      return;
    }
    let table = "leads", payload = d;
    if (mode === "book") {
      table = "bookings";
      const { interest, source, ...rest } = d;
      payload = { ...rest, trip_id: bookTrip.id, trip_title: bookTrip.title, trip_date: bookTrip.dateLabel || null };
    }
    const btn = document.getElementById("list-submit");
    btn.disabled = true; btn.textContent = "Enviando…";
    try {
      const r = await fetch(`${API}/api/${table}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || `HTTP ${r.status}`); }
      const keepMode = mode, keepTrip = bookTrip;
      form.reset(); if (interestSel) interestSel.value = "El próximo, sea donde sea";
      mode = keepMode; bookTrip = keepTrip;
      showOk();
    } catch (err) {
      console.error(err);
      showErr(/Email|nombre|consentimiento/.test(err.message) ? err.message : "No hemos podido guardarlo. Prueba otra vez o escríbenos por WhatsApp.");
    }
    btn.disabled = false; btn.textContent = mode === "book" ? "Solicitar plaza" : "Apuntarme";
  });
  function showErr(m) { errBox.textContent = m; errBox.hidden = false; }

  /* Reveal on scroll */
  document.querySelectorAll(".trip,.dest__card,.step,.value,.faq details,.gallery figure").forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();
