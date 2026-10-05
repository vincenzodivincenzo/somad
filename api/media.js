import { readFile } from "../lib/store.js";

export default async function handler(req, res) {
  const url = new URL(req.url, "http://x");
  const p = url.searchParams.get("p") || "";
  if (!/^img\/[a-z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(p)) { res.statusCode = 400; return res.end("bad path"); }
  try {
    const r = await readFile(p);
    if (!r) { res.statusCode = 404; return res.end("not found"); }
    res.statusCode = 200;
    res.setHeader("Content-Type", r.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
    res.setHeader("Access-Control-Allow-Origin", "*");
    const buf = Buffer.from(await new Response(r.stream).arrayBuffer());
    res.setHeader("Content-Length", String(buf.length));
    res.end(buf);
  } catch (e) {
    console.error(e); res.statusCode = 500; res.end("error");
  }
}
