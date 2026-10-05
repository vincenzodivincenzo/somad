(function () {
  const TRIPS = window.SOMAD_TRIPS || [];
  const CFG = window.SOMAD || {};

  /* WhatsApp links: any element with data-wa="mensaje" */
  const waUrl = (msg) => `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(msg || "Hola SOMAD!")}`;
  document.querySelectorAll("[data-wa]").forEach((el) => {
    el.setAttribute("href", waUrl(el.dataset.wa));
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener");
  });

  /* Followers chip */
  const chip = document.getElementById("chip-followers");
  if (chip && CFG.followers) chip.textContent = `${CFG.followers} en la comunidad`;

  /* Year */
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  /* Mobile nav */
  const burger = document.getElementById("burger");
  const links = document.getElementById("nav-links");
  if (burger && links) {
    burger.addEventListener("click", () => {
      const open = links.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        links.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* Trips */
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parse = (d) => (d ? new Date(d + "T00:00:00") : null);
  const isUpcoming = (t) => t.status === "soon" || (t.status === "upcoming" && (parse(t.end) || parse(t.start)) >= today);

  const upcoming = TRIPS.filter(isUpcoming);
  const past = TRIPS.filter((t) => !isUpcoming(t));

  const badge = (t) => {
    if (t.status === "soon") return `<span class="trip__badge trip__badge--soon">Próximamente</span>`;
    if (isUpcoming(t)) return `<span class="trip__badge">Plazas abiertas</span>`;
    return `<span class="trip__badge trip__badge--past">Ya pasó</span>`;
  };

  const countdown = (t) => {
    const s = parse(t.start);
    if (!s || s < today) return "";
    const days = Math.round((s - today) / 86400000);
    const weeks = Math.floor(days / 7);
    return `<div class="countdown"><div><b>${days}</b><small>días</small></div><div><b>${weeks}</b><small>semanas</small></div></div>`;
  };

  const card = (t, featured) => {
    const kicker = [t.place, t.country].filter(Boolean).join(" · ");
    const ctaMsg = t.status === "soon"
      ? "Hola SOMAD! Quiero apuntarme a la lista del próximo viaje 🌊"
      : `Hola SOMAD! Quiero info del viaje a ${t.title} (${t.dateLabel}) 🏄`;
    const ctaLabel = t.cta || (isUpcoming(t) ? "Reservar plaza" : "Quiero uno igual");
    return `
      <article class="trip ${featured ? "trip--featured" : ""} reveal" data-country="${t.country}">
        <div class="trip__media">${badge(t)}<img src="${t.image}" alt="${t.title}" loading="lazy"></div>
        <div class="trip__body">
          <span class="trip__kicker">${t.flag || ""} ${kicker}</span>
          <h3>${t.title}</h3>
          <span class="trip__date">${t.dateLabel || ""}</span>
          <p class="trip__blurb">${t.blurb || ""}</p>
          ${featured ? countdown(t) : ""}
          <div class="trip__tags">${(t.tags || []).map((x) => `<span>${x}</span>`).join("")}</div>
          <div class="trip__foot">
            <a class="btn ${isUpcoming(t) ? "btn--primary" : "btn--ghost"} btn--sm" href="${waUrl(ctaMsg)}" target="_blank" rel="noopener">${ctaLabel}</a>
          </div>
        </div>
      </article>`;
  };

  const up = document.getElementById("trips-upcoming");
  const pa = document.getElementById("trips-past");
  if (up) up.innerHTML = upcoming.length ? upcoming.map((t, i) => card(t, i === 0)).join("") : `<p class="empty">Estamos cerrando el próximo destino. Escríbenos y te avisamos.</p>`;
  if (pa) pa.innerHTML = past.map((t) => card(t, false)).join("");

  /* Strip text follows the first upcoming trip */
  const stripText = document.getElementById("strip-text");
  if (stripText && upcoming[0]) {
    const t = upcoming[0];
    stripText.textContent = t.status === "soon" ? `${t.place} · ${t.dateLabel}` : `${t.title} · ${t.dateLabel}`;
  }

  /* Filters */
  document.querySelectorAll("#filters .filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#filters .filter").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const f = btn.dataset.filter;
      pa.querySelectorAll(".trip").forEach((c) => {
        c.style.display = f === "all" || c.dataset.country === f ? "" : "none";
      });
    });
  });

  /* Reveal on scroll */
  document.querySelectorAll(".dest__card,.step,.value,.faq details,.gallery a").forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();
