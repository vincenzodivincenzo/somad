import { cors, json } from "../lib/http.js";
import { readContent } from "../lib/content.js";

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== "GET") return json(res, 405, { error: "method" });
  try {
    const data = await readContent();
    json(res, 200, data, { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: "No pude leer el contenido" });
  }
}
