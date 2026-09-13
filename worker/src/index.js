/**
 * Worker "Dans Ma Zone" — connexion Strava.
 *
 * Rôle : c'est le SEUL endroit qui connaît le client_secret Strava (impossible
 * à garder côté navigateur). Il gère :
 *   - la connexion OAuth (login / callback / logout)
 *   - la synchro des activités Strava vers D1, par petits lots
 *     (le plan gratuit Workers limite à 50 sous-requêtes par appel)
 *   - deux routes lues par le front-end : /api/me et /api/team-activities
 *
 * Tout le reste (dessin de la zone, calcul km/passages, graphiques, CSV)
 * continue de vivre dans index.html, exactement comme avant.
 */

const STRAVA_AUTH = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN = "https://www.strava.com/oauth/token";
const STRAVA_API = "https://www.strava.com/api/v3";

const SESSION_COOKIE = "dmz_session";
const STATE_COOKIE = "dmz_oauth_state";
const SESSION_DAYS = 90;

// Nb d'activités (= appels /streams) traités par appel à /api/sync.
// Un lot = 1 appel /athlete/activities + jusqu'à SYNC_BATCH appels /streams,
// à garder sous la limite de 50 sous-requêtes/appel du plan Workers gratuit.
const SYNC_BATCH = 20;

// ---------- Utilitaires HTTP ----------

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.CORS_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
}

function json(env, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}

function randomId(nBytes = 24) {
  const arr = new Uint8Array(nBytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > -1) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

// SameSite=None : nécessaire car le front-end (GitHub Pages) et le Worker
// sont sur des domaines différents, donc les appels fetch() sont "cross-site".
function sessionCookie(value, maxAgeSeconds) {
  let c = `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=None`;
  if (maxAgeSeconds !== undefined) c += `; Max-Age=${maxAgeSeconds}`;
  return c;
}

// ---------- Sport : mêmes règles que côté client (sportKeyword du front) ----------

function classifySport(sportType) {
  const t = (sportType || "").toLowerCase();
  if (/run|trail/.test(t)) return "Course à pied";
  if (/ride|bik|cycl|velo|vtt|gravel/.test(t)) return "Vélo";
  if (/hik|walk|march|rando/.test(t)) return "Marche / Rando";
  if (/swim|natation/.test(t)) return "Natation";
  if (/ski|snowboard/.test(t)) return "Ski / Neige";
  return "Autre";
}

// ---------- Géométrie : sous-échantillonnage (même seuil que le front, 12 m) ----------

const R = 6371000, RAD = Math.PI / 180, DOWNSAMPLE_M = 12;
function hav(la1, lo1, la2, lo2) {
  const dLa = (la2 - la1) * RAD, dLo = (lo2 - lo1) * RAD;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * RAD) * Math.cos(la2 * RAD) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function downsample(latlngPairs) {
  if (!latlngPairs || latlngPairs.length < 2) return { pts: [], totalM: 0 };
  const kept = [latlngPairs[0][0], latlngPairs[0][1]];
  let lastLa = latlngPairs[0][0], lastLo = latlngPairs[0][1], totalM = 0;
  for (let i = 1; i < latlngPairs.length; i++) {
    const [la, lo] = latlngPairs[i];
    const d = hav(lastLa, lastLo, la, lo);
    if (d >= DOWNSAMPLE_M) {
      if (d < 10000) totalM += d; // ignore les sauts GPS aberrants
      kept.push(la, lo);
      lastLa = la; lastLo = lo;
    }
  }
  return { pts: kept, totalM };
}

// ---------- Accès Strava ----------

async function getAthleteBySession(env, request) {
  const sid = parseCookies(request)[SESSION_COOKIE];
  if (!sid) return null;
  const row = await env.DB.prepare(
    `SELECT a.* FROM sessions s JOIN athletes a ON a.id = s.athlete_id
     WHERE s.session_id = ? AND s.expires_at > ?`
  ).bind(sid, Math.floor(Date.now() / 1000)).first();
  return row || null;
}

async function ensureFreshToken(env, athlete) {
  const now = Math.floor(Date.now() / 1000);
  if (athlete.expires_at > now + 300) return athlete.access_token;

  const res = await fetch(STRAVA_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: athlete.refresh_token,
    }),
  });
  const tok = await res.json();
  if (!res.ok) throw new Error("Échec du rafraîchissement du token Strava : " + JSON.stringify(tok));

  await env.DB.prepare(
    `UPDATE athletes SET access_token=?, refresh_token=?, expires_at=? WHERE id=?`
  ).bind(tok.access_token, tok.refresh_token, tok.expires_at, athlete.id).run();

  athlete.access_token = tok.access_token;
  athlete.expires_at = tok.expires_at;
  return tok.access_token;
}

// ---------- Routes ----------

async function handleLogin(url, env) {
  const state = randomId(12);
  const redirectUri = url.origin + "/auth/callback";
  const authUrl = new URL(STRAVA_AUTH);
  authUrl.searchParams.set("client_id", env.STRAVA_CLIENT_ID);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("approval_prompt", "auto");
  // read : profil public. activity:read_all : inclut les activités "Uniquement
  // moi" et les zones de confidentialité — indispensable pour retrouver ce que
  // le GPX exportait.
  authUrl.searchParams.set("scope", "read,activity:read_all");
  authUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      // Cookie posé lors d'une navigation normale (clic utilisateur) : SameSite=Lax suffit.
      "Set-Cookie": `${STATE_COOKIE}=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}

async function handleCallback(url, env, request) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errParam = url.searchParams.get("error");
  if (errParam) return Response.redirect(env.FRONTEND_URL + "?strava=denied", 302);

  const cookies = parseCookies(request);
  if (!code || !state || state !== cookies[STATE_COOKIE]) {
    return new Response("État OAuth invalide ou expiré, réessaie la connexion.", { status: 400 });
  }

  const tokRes = await fetch(STRAVA_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  const tok = await tokRes.json();
  if (!tokRes.ok) {
    return new Response("Échec de l'échange OAuth avec Strava : " + JSON.stringify(tok), { status: 502 });
  }

  const ath = tok.athlete;
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO athletes (id, firstname, lastname, access_token, refresh_token, expires_at, scope, connected_at)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       firstname=excluded.firstname, lastname=excluded.lastname,
       access_token=excluded.access_token, refresh_token=excluded.refresh_token,
       expires_at=excluded.expires_at, scope=excluded.scope`
  ).bind(ath.id, ath.firstname, ath.lastname, tok.access_token, tok.refresh_token, tok.expires_at, tok.scope || "", now).run();

  const sid = randomId(24);
  const expiresAt = now + SESSION_DAYS * 86400;
  await env.DB.prepare(
    `INSERT INTO sessions (session_id, athlete_id, created_at, expires_at) VALUES (?,?,?,?)`
  ).bind(sid, ath.id, now, expiresAt).run();

  return new Response(null, {
    status: 302,
    headers: {
      Location: env.FRONTEND_URL,
      "Set-Cookie": sessionCookie(sid, SESSION_DAYS * 86400),
    },
  });
}

async function handleLogout(env, request) {
  const sid = parseCookies(request)[SESSION_COOKIE];
  if (sid) await env.DB.prepare(`DELETE FROM sessions WHERE session_id=?`).bind(sid).run();
  return new Response(null, {
    status: 302,
    headers: {
      Location: env.FRONTEND_URL,
      "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`,
    },
  });
}

async function handleMe(env, request) {
  const athlete = await getAthleteBySession(env, request);
  if (!athlete) return json(env, { connected: false });
  return json(env, {
    connected: true,
    athlete: { id: athlete.id, firstname: athlete.firstname, lastname: athlete.lastname },
    lastSyncedAt: athlete.last_synced_at,
  });
}

async function handleSync(env, request) {
  const athlete = await getAthleteBySession(env, request);
  if (!athlete) return json(env, { error: "not_connected" }, 401);

  const body = await request.json().catch(() => ({}));
  const page = body.page || 1;
  const accessToken = await ensureFreshToken(env, athlete);

  const listUrl = new URL(STRAVA_API + "/athlete/activities");
  listUrl.searchParams.set("page", String(page));
  listUrl.searchParams.set("per_page", String(SYNC_BATCH));
  if (athlete.last_synced_at) listUrl.searchParams.set("after", String(athlete.last_synced_at));

  const listRes = await fetch(listUrl, { headers: { Authorization: "Bearer " + accessToken } });
  if (listRes.status === 429) {
    return json(env, { error: "rate_limited", retryAfter: retryAfterSeconds(listRes) });
  }
  if (!listRes.ok) return json(env, { error: "strava_list_failed", detail: await listRes.text() }, 502);
  const summaries = await listRes.json();

  let added = 0;
  for (const s of summaries) {
    const streamUrl = `${STRAVA_API}/activities/${s.id}/streams?keys=latlng&key_by_type=true`;
    const strRes = await fetch(streamUrl, { headers: { Authorization: "Bearer " + accessToken } });
    if (strRes.status === 429) {
      return json(env, { error: "rate_limited", retryAfter: retryAfterSeconds(strRes), added });
    }
    if (!strRes.ok) continue; // ex. activité manuelle sans trace GPS : on l'ignore
    const stream = await strRes.json();
    const latlng = stream.latlng && stream.latlng.data;
    if (!latlng || latlng.length < 2) continue;

    const { pts, totalM } = downsample(latlng);
    if (pts.length < 4) continue;

    await env.DB.prepare(
      `INSERT INTO activities (id, athlete_id, name, sport_type, start_date_local, distance_m, points)
       VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, sport_type=excluded.sport_type,
         start_date_local=excluded.start_date_local, distance_m=excluded.distance_m, points=excluded.points`
    ).bind(s.id, athlete.id, s.name, classifySport(s.sport_type || s.type), s.start_date_local, totalM, JSON.stringify(pts)).run();
    added++;
  }

  const done = summaries.length < SYNC_BATCH;
  if (done) {
    await env.DB.prepare(`UPDATE athletes SET last_synced_at=? WHERE id=?`)
      .bind(Math.floor(Date.now() / 1000), athlete.id).run();
  }
  return json(env, { added, done, nextPage: page + 1 });
}

function retryAfterSeconds(res) {
  const h = res.headers.get("Retry-After");
  return h ? parseInt(h, 10) : 900; // 900s = prochaine fenêtre de 15 min par défaut
}

async function handleTeamActivities(env, request) {
  const athlete = await getAthleteBySession(env, request);
  if (!athlete) return json(env, { error: "not_connected" }, 401);

  const rows = await env.DB.prepare(
    `SELECT act.name, act.sport_type, act.start_date_local, act.points,
            a.firstname, a.lastname
     FROM activities act JOIN athletes a ON a.id = act.athlete_id`
  ).all();

  const out = rows.results.map((r) => ({
    name: r.name,
    sport: r.sport_type,
    ts: r.start_date_local,
    pts: JSON.parse(r.points),
    athlete: (r.firstname || "") + (r.lastname ? " " + r.lastname[0] + "." : ""),
  }));
  return json(env, { activities: out });
}

// ---------- Point d'entrée ----------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }

    try {
      if (url.pathname === "/auth/login") return await handleLogin(url, env);
      if (url.pathname === "/auth/callback") return await handleCallback(url, env, request);
      if (url.pathname === "/auth/logout") return await handleLogout(env, request);
      if (url.pathname === "/api/me") return await handleMe(env, request);
      if (url.pathname === "/api/sync" && request.method === "POST") return await handleSync(env, request);
      if (url.pathname === "/api/team-activities") return await handleTeamActivities(env, request);
      return json(env, { error: "not_found" }, 404);
    } catch (e) {
      return json(env, { error: "server_error", detail: String(e && e.message || e) }, 500);
    }
  },
};
