import { timingSafeEqual } from "node:crypto";

const ALLOWED = [
  "https://vincenzodivincenzo.github.io",
  "https://somad-nu.vercel.app",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

export function cors(req, res) {
  const origin = req.headers.origin || "";
  const ok = ALLOWED.includes(origin) || /^https:\/\/somad(-[a-z0-9-]+)?(-vincenzodivincenzos-projects)?\.vercel\.app$/.test(origin);
  if (ok) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return true; }
  return false;
}

export function json(res, status, body, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export function isAdmin(req) {
  const given = String(req.headers["x-admin-key"] || "");
  const want = String(process.env.ADMIN_KEY || "");
  if (!want || given.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(want));
}

export function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}

export const str = (v, max = 500) => String(v ?? "").trim().slice(0, max);
export const uuid = () => globalThis.crypto.randomUUID();
export const now = () => new Date().toISOString();
