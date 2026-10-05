// ─────────────────────────────────────────────────────────────
// SOMAD · Viajes
// Para añadir un viaje nuevo: copia un bloque, cambia los datos
// y ponlo arriba del todo. status: "upcoming" | "past" | "soon"
// Las fechas van en formato YYYY-MM-DD.
// ─────────────────────────────────────────────────────────────
window.SOMAD_TRIPS = [
  {
    id: "proximo",
    status: "soon",
    title: "Próximo viaje",
    place: "Destino por anunciar",
    country: "",
    flag: "🌊",
    start: null,
    end: null,
    dateLabel: "Invierno 2026 / 27",
    blurb: "Estamos cerrando fechas y destino. Apúntate a la lista y te avisamos antes que a nadie.",
    image: "assets/img/crew-boards.jpg",
    cta: "Quiero enterarme",
    tags: ["Lista de espera"]
  },
  {
    id: "asturias-oct-2026",
    status: "past",
    title: "Asturias",
    place: "Costa asturiana",
    country: "España",
    flag: "🇪🇸",
    start: "2026-10-02",
    end: "2026-10-04",
    dateLabel: "2 – 4 de octubre 2026",
    blurb: "Fin de semana largo en el Cantábrico: olas para todos los niveles, sidra y buena gente.",
    image: "assets/img/asturias-duo.jpg",
    tags: ["Fin de semana", "Todos los niveles"]
  },
  {
    id: "ericeira-2026",
    status: "past",
    title: "Ericeira",
    place: "Reserva Mundial de Surf",
    country: "Portugal",
    flag: "🇵🇹",
    start: "2026-07-01",
    end: null,
    dateLabel: "Verano 2026",
    blurb: "La única Reserva Mundial de Surf de Europa. Clases por la mañana, atardeceres en Ribeira d'Ilhas.",
    image: "assets/img/ericeira-boards.jpg",
    tags: ["Semana", "Clases + alojamiento"]
  },
  {
    id: "lanzarote-2026",
    status: "past",
    title: "Lanzarote",
    place: "Famara",
    country: "Islas Canarias",
    flag: "🇮🇨",
    start: "2026-03-01",
    end: null,
    dateLabel: "Primavera 2026",
    blurb: "Famara y sus 6 km de playa bajo el risco. Surf, volcán y cero frío.",
    image: "assets/img/surf-lesson.jpg",
    tags: ["Semana", "Clima perfecto"]
  },
  {
    id: "fuerteventura-2025",
    status: "past",
    title: "Fuerteventura",
    place: "Costa norte",
    country: "Islas Canarias",
    flag: "🇮🇨",
    start: "2025-10-01",
    end: null,
    dateLabel: "Otoño 2025",
    blurb: "Viento, dunas y picos para todos los gustos en la isla más salvaje.",
    image: "assets/img/beach-smile.jpg",
    tags: ["Semana"]
  },
  {
    id: "lanzarote-2025",
    status: "past",
    title: "Lanzarote",
    place: "Famara",
    country: "Islas Canarias",
    flag: "🇮🇨",
    start: "2025-03-01",
    end: null,
    dateLabel: "Primavera 2025",
    blurb: "Donde empezó todo. El primer SOMAD en Canarias.",
    image: "assets/img/ericeira-walk.jpg",
    tags: ["Semana", "El primero"]
  }
];

// Datos de contacto. Cambia aquí y se actualiza en toda la web.
window.SOMAD = {
  whatsapp: "34661163140",
  instagram: "somad.surftrips",
  email: "",
  followers: "1.8k"
};
