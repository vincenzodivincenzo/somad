import { cors, json, isAdmin } from "../../lib/http.js";
export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (!isAdmin(req)) return json(res, 401, { error: "Clave no válida" });
  json(res, 200, { ok: true });
}
