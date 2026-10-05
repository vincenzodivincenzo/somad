(async function () {
  const noCache = { cache: "no-store" };
  const load = (p, fallback) => fetch(p, noCache).then((r) => (r.ok ? r.json() : fallback)).catch(() => fallback);
  const [TRIPS, GALLERY, CFG] = await Promise.all([
    load("data/trips.json", []),
    load("data/gallery.json", []),
    load("data/site.json", { whatsapp: "34661163140", instagram: "somad.surftrips" })
  ]);

  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const FLAGS = { "España": "🇪🇸", "Portugal": "🇵🇹", "Islas Canarias": "🇮🇨", "Francia": "🇫🇷", "Marruecos": "🇲🇦" };

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
    const msg = t.status === "soon" ? "Hola SOMAD! Quiero apuntarme a la lista del próximo viaje 🌊" : `Hola SOMAD! Quiero info del viaje a ${t.title} (${t.dateLabel}) 🏄`;
    const label = t.cta || (t.status === "soon" ? "Quiero enterarme" : isUpcoming(t) ? "Reservar plaza" : "Quiero uno igual");
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
          <div class="trip__foot"><a class="btn ${isUpcoming(t) ? "btn--ink" : "btn--paper"} btn--sm" href="${waUrl(msg)}" target="_blank" rel="noopener">${esc(label)}</a></div>
        </div>
      </article>`;
  };

  const up = document.getElementById("trips-upcoming");
  const pa = document.getElementById("trips-past");
  if (up) up.innerHTML = upcoming.length ? upcoming.map((t, i) => card(t, i, i === 0)).join("") : `<p class="empty">Estamos cerrando el próximo destino. Escríbenos y te avisamos.</p>`;
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

  /* Reveal on scroll */
  document.querySelectorAll(".trip,.dest__card,.step,.value,.faq details,.gallery figure").forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();
