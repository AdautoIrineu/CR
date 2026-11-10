import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const MAX_DOC_BYTES = 300_000;
const MAX_PHOTO_BYTES = 4_000_000;
const PHOTO_ID = /^[a-f0-9-]{36}$/;

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

const readJsonObject = async (req: Request) => {
  const text = await req.text();
  if (text.length > MAX_DOC_BYTES) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
};

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const expected = Netlify.env.get("LISTA_KEY");
  const key = req.headers.get("x-key") ?? url.searchParams.get("k");
  if (!expected || key !== expected) return json({ error: "link inválido" }, 401);

  const store = getStore({ name: "lista-lisboa", consistency: "strong" });
  const [resource, id] = url.pathname.replace(/^\/api\//, "").split("/").filter(Boolean);

  if (resource === "lista" && req.method === "GET") {
    const [data, comprado] = await Promise.all([
      store.get("lista", { type: "json" }),
      store.get("comprado", { type: "json" }),
    ]);
    return json({ data, comprado: comprado ?? {} });
  }

  if ((resource === "lista" || resource === "comprado") && req.method === "PUT") {
    const body = await readJsonObject(req);
    if (!body) return json({ error: "dados inválidos" }, 400);
    await store.setJSON(resource, body);
    return json({ ok: true });
  }

  if (resource === "foto" && req.method === "POST") {
    const type = req.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return json({ error: "envie uma imagem" }, 400);
    const bytes = await req.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_PHOTO_BYTES) {
      return json({ error: "imagem grande demais" }, 413);
    }
    const photoId = crypto.randomUUID();
    await store.set(`foto/${photoId}`, bytes, { metadata: { type } });
    return json({ id: photoId });
  }

  if (resource === "foto" && id && PHOTO_ID.test(id)) {
    if (req.method === "GET") {
      const entry = await store.getWithMetadata(`foto/${id}`, { type: "arrayBuffer" });
      if (entry === null) return json({ error: "não encontrada" }, 404);
      return new Response(entry.data, {
        headers: {
          "content-type": String(entry.metadata?.type ?? "image/jpeg"),
          "cache-control": "private, max-age=31536000, immutable",
        },
      });
    }
    if (req.method === "DELETE") {
      await store.delete(`foto/${id}`);
      return json({ ok: true });
    }
  }

  return json({ error: "não encontrado" }, 404);
};

export const config: Config = { path: "/api/*" };
