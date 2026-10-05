import { cors, json, isAdmin, body } from "../../lib/http.js";
import { KINDS } from "../../lib/content.js";
import { writeDoc } from "../../lib/store.js";

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (!isAdmin(req)) return json(res, 401, { error: "Clave no válida" });
  if (req.method !== "PUT") return json(res, 405, { error: "method" });
  const { kind, data } = body(req);
  const k = KINDS[kind];
  if (!k) return json(res, 400, { error: "kind" });
  if (kind !== "settings" && !Array.isArray(data)) return json(res, 400, { error: "data debe ser una lista" });
  if (kind === "settings" && (typeof data !== "object" || Array.isArray(data))) return json(res, 400, { error: "data" });
  try {
    await writeDoc(k.path, data);
    json(res, 200, { ok: true });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: "No pude guardar" });
  }
}
