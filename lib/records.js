import { cors, json, isAdmin, body, str, uuid, now } from "./http.js";
import { readDoc, updateDoc } from "./store.js";

/* Shared handler for leads and bookings: public POST, admin GET/PATCH/DELETE */
export function recordsHandler({ path, validate, statuses, defaultStatus }) {
  return async function handler(req, res) {
    if (cors(req, res)) return;
    const url = new URL(req.url, "http://x");
    const id = url.searchParams.get("id");

    try {
      if (req.method === "POST") {
        const b = body(req);
        if (str(b.website)) return json(res, 201, { ok: true }); // honeypot: pretend success
        const rec = validate(b);
        if (rec.error) return json(res, 400, { error: rec.error });
        const record = { id: uuid(), created_at: now(), updated_at: now(), status: defaultStatus, notes: null, ...rec.value };
        await updateDoc(path, [], (list) => { list.unshift(record); return list.slice(0, 5000); });
        return json(res, 201, { ok: true, id: record.id });
      }

      if (!isAdmin(req)) return json(res, 401, { error: "Clave no válida" });

      if (req.method === "GET") {
        const { data } = await readDoc(path, []);
        return json(res, 200, data, { "Cache-Control": "no-store" });
      }
      if (req.method === "PATCH" && id) {
        const b = body(req);
        let updated = null;
        await updateDoc(path, [], (list) => {
          const r = list.find((x) => x.id === id);
          if (!r) return list;
          if (b.status !== undefined) { if (!statuses.includes(b.status)) throw Object.assign(new Error("Estado no válido"), { status: 400 }); r.status = b.status; }
          if (b.notes !== undefined) r.notes = str(b.notes, 4000) || null;
          if (b.status && b.status !== defaultStatus && !r.contacted_at) r.contacted_at = now();
          r.updated_at = now();
          updated = r;
          return list;
        });
        return updated ? json(res, 200, updated) : json(res, 404, { error: "No existe" });
      }
      if (req.method === "DELETE" && id) {
        await updateDoc(path, [], (list) => list.filter((x) => x.id !== id));
        return json(res, 200, { ok: true });
      }
      return json(res, 405, { error: "method" });
    } catch (e) {
      console.error(e);
      return json(res, e.status || 500, { error: e.message || "Error" });
    }
  };
}

const email = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const LEVELS = ["nunca", "principiante", "intermedio", "avanzado"];

export function validateLead(b) {
  const v = {
    name: str(b.name, 120), email: str(b.email, 200).toLowerCase(), phone: str(b.phone, 40),
    level: LEVELS.includes(b.level) ? b.level : "nunca", interest: str(b.interest, 160),
    people: Math.min(20, Math.max(1, Number(b.people) || 1)), message: str(b.message, 2000),
    consent: b.consent === true, source: "web",
  };
  if (v.name.length < 2) return { error: "Falta el nombre" };
  if (!email(v.email)) return { error: "Email no válido" };
  if (!v.consent) return { error: "Falta el consentimiento" };
  return { value: v };
}

export function validateBooking(b) {
  const v = {
    trip_id: str(b.trip_id, 120), trip_title: str(b.trip_title, 120), trip_date: str(b.trip_date, 80) || null,
    name: str(b.name, 120), email: str(b.email, 200).toLowerCase(), phone: str(b.phone, 40),
    level: LEVELS.includes(b.level) ? b.level : "nunca",
    people: Math.min(20, Math.max(1, Number(b.people) || 1)), message: str(b.message, 2000),
    consent: b.consent === true,
  };
  if (!v.trip_id || !v.trip_title) return { error: "Falta el viaje" };
  if (v.name.length < 2) return { error: "Falta el nombre" };
  if (!email(v.email)) return { error: "Email no válido" };
  if (!v.consent) return { error: "Falta el consentimiento" };
  return { value: v };
}
