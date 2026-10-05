import { cors, json } from "../lib/http.js";
import { readDoc } from "../lib/store.js";

export default async function handler(req, res) {
  if (cors(req, res, { open: true })) return;
  if (req.method !== "GET") return json(res, 405, { error: "method" });
  try {
    const { data } = await readDoc("data/bookings.json", []);
    const taken = {};
    for (const b of data) if (b.status !== "cancelada") taken[b.trip_id] = (taken[b.trip_id] || 0) + (Number(b.people) || 1);
    json(res, 200, taken, { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: "No pude contar plazas" });
  }
}
