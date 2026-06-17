// Servidor sin dependencias: sirve la landing estática y expone una pequeña API
// REST para leer el ranking y registrar votos. Los votos se guardan en disco
// (data/votes.json) para que el ranking sea compartido entre todos los fans.

import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { SONGS } from "./data/songs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const VOTES_FILE = path.join(__dirname, "data", "votes.json");

const SONG_IDS = new Set(SONGS.map((s) => s.id));

// ---- Persistencia de votos -------------------------------------------------

let votes = {};            // { [songId]: number }
let writing = Promise.resolve(); // cola simple para evitar escrituras concurrentes

async function loadVotes() {
  if (existsSync(VOTES_FILE)) {
    try {
      votes = JSON.parse(await readFile(VOTES_FILE, "utf8"));
    } catch {
      votes = {};
    }
  }
  // Garantiza una entrada por canción conocida.
  for (const s of SONGS) if (typeof votes[s.id] !== "number") votes[s.id] = 0;
}

function persistVotes() {
  // Encadena las escrituras para que nunca se pisen entre sí.
  writing = writing.then(() =>
    writeFile(VOTES_FILE, JSON.stringify(votes, null, 2)).catch((err) =>
      console.error("No se pudo guardar votes.json:", err)
    )
  );
  return writing;
}

// ---- Lógica del ranking ----------------------------------------------------

function buildRanking() {
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const ranked = SONGS.map((song) => {
    const count = votes[song.id] || 0;
    return {
      ...song,
      votes: count,
      share: total ? +((count / total) * 100).toFixed(1) : 0,
    };
  }).sort((a, b) => b.votes - a.votes || a.title.localeCompare(b.title));

  return {
    totalVotes: total,
    songs: ranked.map((song, i) => ({ ...song, rank: i + 1 })),
  };
}

// ---- Utilidades HTTP -------------------------------------------------------

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

async function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  // Evita path traversal: resuelve dentro de PUBLIC_DIR.
  const filePath = path.join(PUBLIC_DIR, path.normalize(urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 — Página no encontrada");
  }
}

function readBody(req, limit = 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > limit) reject(new Error("payload demasiado grande"));
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

// ---- Router ----------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const { method, url } = req;
  const pathname = url.split("?")[0];

  // GET /api/ranking -> estado actual del ranking
  if (method === "GET" && pathname === "/api/ranking") {
    return sendJson(res, 200, buildRanking());
  }

  // POST /api/vote { id } -> suma un voto y devuelve el ranking actualizado
  if (method === "POST" && pathname === "/api/vote") {
    try {
      const body = await readBody(req);
      const { id } = JSON.parse(body || "{}");
      if (!SONG_IDS.has(id)) {
        return sendJson(res, 400, { error: "Canción desconocida." });
      }
      votes[id] = (votes[id] || 0) + 1;
      await persistVotes();
      return sendJson(res, 200, { ok: true, id, ...buildRanking() });
    } catch (err) {
      return sendJson(res, 400, { error: "Solicitud inválida." });
    }
  }

  if (pathname.startsWith("/api/")) {
    return sendJson(res, 404, { error: "No encontrado." });
  }

  return serveStatic(req, res);
});

async function main() {
  if (!existsSync(path.dirname(VOTES_FILE))) {
    await mkdir(path.dirname(VOTES_FILE), { recursive: true });
  }
  await loadVotes();
  server.listen(PORT, () => {
    console.log(`🎤 Swiftie Ranking corriendo en http://localhost:${PORT}`);
  });
}

main();
