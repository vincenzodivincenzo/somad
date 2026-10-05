import { cors, json, isAdmin, body, str } from "../../lib/http.js";
import { putFile } from "../../lib/store.js";

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (!isAdmin(req)) return json(res, 401, { error: "Clave no válida" });
  if (req.method !== "POST") return json(res, 405, { error: "method" });
  const b = body(req);
  const type = ["image/jpeg", "image/png", "image/webp"].includes(b.type) ? b.type : "image/jpeg";
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const base = str(b.name, 60).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "foto";
  if (typeof b.data !== "string" || b.data.length < 100) return json(res, 400, { error: "Sin imagen" });
  try {
    const buf = Buffer.from(b.data, "base64");
    if (buf.length > 3 * 1024 * 1024) return json(res, 413, { error: "Imagen demasiado grande" });
    const pathname = await putFile(`img/${base}-${Date.now().toString(36)}.${ext}`, buf, type);
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    json(res, 200, { url: `https://${host}/api/media?p=${encodeURIComponent(pathname)}` });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: "No pude subir la foto" });
  }
}
