import { get, put, del, list, head, BlobPreconditionFailedError } from "@vercel/blob";

const OPTS = { access: "private" };

export async function readDoc(path, fallback) {
  const h = await head(path, OPTS).catch(() => null);
  if (!h) return { data: structuredClone(fallback), etag: null };
  const r = await get(path, { ...OPTS, useCache: false });
  if (!r || !r.stream) return { data: structuredClone(fallback), etag: null };
  const text = await new Response(r.stream).text();
  return { data: JSON.parse(text), etag: r.etag || h.etag || null };
}

/* media lives in the same private store and is streamed by /api/media */
export async function readFile(path) {
  const r = await get(path, { ...OPTS, useCache: true });
  if (!r || !r.stream) return null;
  return r;
}

export async function writeDoc(path, data, etag) {
  return put(path, JSON.stringify(data, null, 2), {
    ...OPTS,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    ...(etag ? { ifMatch: etag } : {}),
  });
}

/* read-modify-write with optimistic concurrency (etag) */
export async function updateDoc(path, fallback, fn) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, etag } = await readDoc(path, fallback);
    const next = await fn(data);
    try {
      await writeDoc(path, next, etag);
      return next;
    } catch (e) {
      if (e instanceof BlobPreconditionFailedError || /precondition|412/i.test(String(e?.message))) continue;
      throw e;
    }
  }
  throw new Error("No he podido guardar por conflicto. Vuelve a intentarlo.");
}

export async function putFile(path, buffer, contentType) {
  const r = await put(path, buffer, { ...OPTS, addRandomSuffix: false, contentType });
  return r.pathname;
}

export { del, list };
