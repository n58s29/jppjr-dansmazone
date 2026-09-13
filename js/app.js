"use strict";

/* ---------- État global ---------- */
const activities = [];   // {name, ts, year, month, pts:Float32Array, bbox:[minLa,minLo,maxLa,maxLo], totalKm}
let zoneRing = null;     // [[lat,lng],...]
let lastResults = [];    // résultats du dernier calcul de zone
let chartYear = null, chartMonth = null;
const activeSports = new Set();
const activeAthletes = new Set();
let periodFrom = null, periodTo = null; // bornes en ms, null = pas de borne
function inPeriod(a) {
  if (periodFrom && a.ts < periodFrom) return false;
  if (periodTo && a.ts > periodTo) return false;
  return true;
}
function filtered() {
  return activities.filter(a => activeSports.has(a.sport) && activeAthletes.has(a.athlete) && inPeriod(a));
}

function buildAthleteFilters() {
  const counts = new Map();
  for (const a of activities) counts.set(a.athlete, (counts.get(a.athlete) || 0) + 1);
  const sorted = [...counts.entries()].sort((x, y) => y[1] - x[1]);
  activeAthletes.clear();
  const box = document.getElementById("athleteChips");
  box.innerHTML = "";
  for (const [ath, n] of sorted) {
    activeAthletes.add(ath);
    const chip = document.createElement("label");
    chip.className = "chip on";
    chip.dataset.athlete = ath;
    chip.innerHTML = "<input type='checkbox' checked> " + esc(ath) +
      " <span class='c'>" + n.toLocaleString("fr-FR") + "</span>";
    chip.querySelector("input").addEventListener("change", e => {
      if (e.target.checked) activeAthletes.add(ath); else activeAthletes.delete(ath);
      chip.classList.toggle("on", e.target.checked);
      refreshAfterFilter();
    });
    box.appendChild(chip);
  }
  document.getElementById("athleteFilters").classList.remove("hidden");
}

function buildFilters() {
  const counts = new Map();
  for (const a of activities) counts.set(a.sport, (counts.get(a.sport) || 0) + 1);
  const sorted = [...counts.entries()].sort((x, y) => y[1] - x[1]);
  activeSports.clear();
  const box = document.getElementById("chips");
  box.innerHTML = "";
  for (const [sport, n] of sorted) {
    activeSports.add(sport);
    const chip = document.createElement("label");
    chip.className = "chip on";
    chip.dataset.sport = sport;
    chip.innerHTML = "<input type='checkbox' checked> " + esc(sport) +
      " <span class='c'>" + n.toLocaleString("fr-FR") + "</span>";
    chip.querySelector("input").addEventListener("change", e => {
      if (e.target.checked) activeSports.add(sport); else activeSports.delete(sport);
      chip.classList.toggle("on", e.target.checked);
      refreshAfterFilter();
    });
    box.appendChild(chip);
  }
  document.getElementById("filters").classList.remove("hidden");
}

function setSports(predicate) {
  activeSports.clear();
  document.querySelectorAll("#chips .chip").forEach(chip => {
    const sport = chip.dataset.sport;
    const on = predicate(sport);
    if (on) activeSports.add(sport);
    chip.classList.toggle("on", on);
    chip.querySelector("input").checked = on;
  });
  refreshAfterFilter();
}
document.getElementById("btnRunOnly").addEventListener("click", () => setSports(s => s === "Course à pied"));
document.getElementById("btnAllSports").addEventListener("click", () => setSports(() => true));

function refreshAfterFilter() {
  drawHeatmap();
  if (zoneRing) computeZone(); else resetResults();
}
const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];

/* ---------- Géométrie ---------- */
const R = 6371000, RAD = Math.PI / 180;
function hav(la1, lo1, la2, lo2) {
  const dLa = (la2 - la1) * RAD, dLo = (lo2 - lo1) * RAD;
  const a = Math.sin(dLa/2)**2 + Math.cos(la1*RAD) * Math.cos(la2*RAD) * Math.sin(dLo/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function pip(lat, lng, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i][0], xi = ring[i][1], yj = ring[j][0], xj = ring[j][1];
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

/* ---------- Construction d'une activité ---------- */
/* raw = tableau plat [lat,lng,lat,lng,...]. Vient désormais du Worker Strava
   (déjà sous-échantillonné côté serveur), mais la fonction reste générique :
   c'est elle qui calcule bbox et distance totale, donc on la garde telle quelle. */
const DOWNSAMPLE_M = 12; // on garde un point tous les ~12 m

function buildActivity(name, raw, ts, sport) {
  if (raw.length < 4) return null;
  // Downsampling + distance totale + bbox
  const kept = [raw[0], raw[1]];
  let lastLa = raw[0], lastLo = raw[1], totalM = 0;
  let minLa = lastLa, maxLa = lastLa, minLo = lastLo, maxLo = lastLo;
  for (let i = 2; i < raw.length; i += 2) {
    const la = raw[i], lo = raw[i+1];
    const d = hav(lastLa, lastLo, la, lo);
    if (d >= DOWNSAMPLE_M) {
      if (d < 10000) totalM += d; // ignore les sauts GPS aberrants (>10 km entre 2 points)
      kept.push(la, lo);
      lastLa = la; lastLo = lo;
      if (la < minLa) minLa = la; if (la > maxLa) maxLa = la;
      if (lo < minLo) minLo = lo; if (lo > maxLo) maxLo = lo;
    }
  }
  if (kept.length < 4) return null;
  const dt = isNaN(ts) || !ts ? null : new Date(ts);
  return {
    name: name.replace(/\.(gpx|tcx|fit)$/i, ""),
    sport,
    ts: dt ? ts : 0,
    year: dt ? dt.getFullYear() : 0,
    month: dt ? dt.getMonth() : 0,
    pts: Float32Array.from(kept),
    bbox: [minLa, minLo, maxLa, maxLo],
    totalKm: totalM / 1000
  };
}

/* Ancien parseur GPX/TCX/FIT retiré : les traces viennent maintenant du
   Worker Strava (voir plus bas), qui renvoie directement {name, sport, ts,
   pts, athlete} déjà prêts pour buildActivity(). */

/* ---------- Connexion & synchro Strava ---------- */
// ⚠️ À renseigner après le déploiement du Worker (voir README) :
const WORKER_URL = "https://dans-ma-zone-strava.gentillebelette.workers.dev";

// Le cookie de session ne suffit pas : beaucoup de navigateurs mobiles
// (Chrome Android, Safari…) bloquent les cookies "tiers" cross-site entre
// GitHub Pages et le Worker. On transporte donc la session via un token
// (renvoyé dans l'URL après la connexion Strava, puis stocké ici) envoyé
// en en-tête Authorization à chaque appel — insensible à ce blocage.
const SESSION_KEY = "dmz_session";

(function captureUrlParams() {
  const params = new URLSearchParams(location.search);
  const token = params.get("session");
  const strava = params.get("strava");
  if (!token && !strava) return;
  if (token) localStorage.setItem(SESSION_KEY, token);
  params.delete("session"); params.delete("strava");
  const qs = params.toString();
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  if (strava === "forbidden") showNotice("Ton compte Strava n'est pas (encore) dans la liste de l'équipe — demande à l'admin de la team (Mario) de t'ajouter, puis reconnecte-toi.");
  if (strava === "denied") showNotice("Connexion annulée : tu n'as pas autorisé l'accès à Strava. Réessaie quand tu veux.");
})();
function showNotice(msg) {
  const n = document.getElementById("notice");
  n.textContent = msg; n.classList.remove("hidden");
}

const statusEl = document.getElementById("status");
const progress = document.getElementById("progress");
const progressBar = document.getElementById("progressBar");
const btnConnect = document.getElementById("btnConnect");
const btnSync = document.getElementById("btnSync");
const btnLogout = document.getElementById("btnLogout");
const accountPill = document.getElementById("accountPill");
const subbar = document.getElementById("subbar");
let currentAthleteId = null;

function goConnect() {
  localStorage.setItem(ONBOARDED_KEY, "1");
  window.location.href = WORKER_URL + "/auth/login";
}
btnConnect.addEventListener("click", goConnect);
document.getElementById("btnHeroConnect").addEventListener("click", goConnect);
document.getElementById("btnOnboardingConnect").addEventListener("click", goConnect);
btnLogout.addEventListener("click", async () => {
  if (!confirm("Se déconnecter de Dans Ma Zone ?")) return;
  await apiPost("/auth/logout").catch(() => {});
  localStorage.removeItem(SESSION_KEY);
  location.reload();
});

function authHeaders() {
  const token = localStorage.getItem(SESSION_KEY);
  return token ? { Authorization: "Bearer " + token } : {};
}
async function apiGet(path) {
  const r = await fetch(WORKER_URL + path, { credentials: "include", headers: authHeaders() });
  return r.json();
}
async function apiPost(path, body) {
  const r = await fetch(WORKER_URL + path, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body || {})
  });
  return r.json();
}
async function apiDelete(path) {
  const r = await fetch(WORKER_URL + path, { method: "DELETE", credentials: "include", headers: authHeaders() });
  return r.json();
}

/* ---------- Pop-up d'accueil ---------- */
const ONBOARDED_KEY = "dmz_onboarded";
const onboarding = document.getElementById("onboarding");
function openOnboarding() {
  document.getElementById("btnOnboardingConnect").classList.toggle("hidden", !!currentAthleteId);
  if (typeof onboarding.showModal === "function") onboarding.showModal();
  else onboarding.setAttribute("open", "");
}
function closeOnboarding() {
  if (typeof onboarding.close === "function") onboarding.close();
  else onboarding.removeAttribute("open");
}
onboarding.addEventListener("close", () => localStorage.setItem(ONBOARDED_KEY, "1"));
document.getElementById("btnHelp").addEventListener("click", openOnboarding);
document.getElementById("btnOnboardingClose").addEventListener("click", closeOnboarding);

async function loadTeamActivities() {
  const data = await apiGet("/api/team-activities");
  activities.length = 0;
  heatGroup.clearLayers();
  for (const o of (data.activities || [])) {
    const a = buildActivity(o.name || "Sans nom", o.pts, Date.parse(o.ts), o.sport || "Non renseigné");
    if (!a) continue;
    a.athlete = o.athlete;
    activities.push(a);
  }
  document.getElementById("step1").classList.add("done");
  const mapHint = document.getElementById("mapHint");

  if (!activities.length) {
    statusEl.innerHTML = "Aucune activité pour l'instant — clique sur <strong>Synchroniser Strava</strong>.";
    mapHint.style.display = "";
    mapHint.textContent = "Lance une synchro Strava : la carte se centrera sur les traces.";
    return;
  }

  const totalKm = activities.reduce((s, a) => s + a.totalKm, 0);
  statusEl.innerHTML = "<strong>" + activities.length + "</strong> activités · " + fmtKm(totalKm) + " km<span class='hide-sm'> dans l'équipe</span>";
  document.getElementById("hero").classList.add("hidden");
  document.getElementById("toolbar").classList.remove("hidden");

  buildFilters();
  buildAthleteFilters();
  drawHeatmap();
  if (zoneRing) computeZone(); else fitToData();
  mapHint.textContent = "Choisis une zone de l'équipe, ou « Dessiner une zone » sur la carte.";
  mapHint.style.display = "";
  setTimeout(() => mapHint.style.display = "none", 3500);
}

async function refreshMe() {
  const me = await apiGet("/api/me").catch(() => ({ connected: false }));
  if (me.connected) {
    currentAthleteId = me.athlete.id;
    btnConnect.classList.add("hidden");
    accountPill.classList.remove("hidden");
    subbar.classList.remove("hidden");
    document.getElementById("accountName").textContent = me.athlete.firstname;
    statusEl.textContent = "Chargement des activités…";
    await Promise.all([loadTeamActivities(), loadZones()]);
  } else {
    currentAthleteId = null;
    btnConnect.classList.remove("hidden");
    accountPill.classList.add("hidden");
    subbar.classList.add("hidden");
  }
  if (!localStorage.getItem(ONBOARDED_KEY)) openOnboarding();
}

/* ---------- Période ---------- */
const dateFrom = document.getElementById("dateFrom"), dateTo = document.getElementById("dateTo");
function fmtInput(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function setPeriod(from, to, presetKey) {
  periodFrom = from ? from.getTime() : null;
  periodTo = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime() : null;
  dateFrom.value = from ? fmtInput(from) : "";
  dateTo.value = to ? fmtInput(to) : "";
  document.querySelectorAll("#presets .chip").forEach(c => c.classList.toggle("on", c.dataset.preset === presetKey));
  refreshAfterFilter();
}
document.getElementById("presets").addEventListener("click", e => {
  const btn = e.target.closest("[data-preset]");
  if (!btn) return;
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  switch (btn.dataset.preset) {
    case "all":      setPeriod(null, null, "all"); break;
    case "year":     setPeriod(new Date(y, 0, 1), now, "year"); break;
    case "lastyear": setPeriod(new Date(y - 1, 0, 1), new Date(y - 1, 11, 31), "lastyear"); break;
    case "12m":      setPeriod(new Date(y - 1, m, now.getDate()), now, "12m"); break;
    case "month":    setPeriod(new Date(y, m, 1), now, "month"); break;
  }
});
function readPeriodInputs() {
  const f = dateFrom.value ? new Date(dateFrom.value + "T00:00:00") : null;
  const t = dateTo.value ? new Date(dateTo.value + "T00:00:00") : null;
  setPeriod(f, t, (!f && !t) ? "all" : null);
}
dateFrom.addEventListener("change", readPeriodInputs);
dateTo.addEventListener("change", readPeriodInputs);

/* ---------- Zones de l'équipe ---------- */
let teamZones = [], currentZoneId = null;
const zoneChips = document.getElementById("zoneChips");
const zoneSave = document.getElementById("zoneSave");
const zoneNameInput = document.getElementById("zoneName");

async function loadZones() {
  const data = await apiGet("/api/zones").catch(() => ({}));
  teamZones = data.zones || [];
  renderZoneChips();
}

function renderZoneChips() {
  zoneChips.innerHTML = "";
  if (!teamZones.length) {
    zoneChips.innerHTML = "<span class='muted'>Aucune zone enregistrée pour l'instant. Dessine une zone sur la carte, puis donne-lui un nom ici pour la partager.</span>";
    return;
  }
  for (const z of teamZones) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip zone" + (z.id === currentZoneId ? " on" : "");
    chip.innerHTML = esc(z.name) + " <span class='by'>· " + esc(z.createdByName || "?") + "</span>";
    chip.addEventListener("click", () => applyZone(z));
    if (z.createdBy === currentAthleteId) {
      const x = document.createElement("span");
      x.className = "x"; x.title = "Supprimer cette zone"; x.textContent = "×";
      x.addEventListener("click", async ev => {
        ev.stopPropagation();
        if (!confirm("Supprimer la zone « " + z.name + " » pour toute l'équipe ?")) return;
        await apiDelete("/api/zones?id=" + z.id).catch(() => {});
        if (currentZoneId === z.id) clearZone();
        await loadZones();
      });
      chip.appendChild(x);
    }
    zoneChips.appendChild(chip);
  }
}

function applyZone(z) {
  setZone(z.ring, z.id);
  map.fitBounds(z.ring, { padding: [30, 30] });
}

async function saveZone() {
  if (!zoneRing) return;
  const name = zoneNameInput.value.trim();
  if (!name) { zoneNameInput.focus(); return; }
  const btn = document.getElementById("btnSaveZone");
  btn.disabled = true;
  const r = await apiPost("/api/zones", { name, ring: zoneRing }).catch(() => ({ error: "réseau" }));
  btn.disabled = false;
  if (r.error) { alert("Impossible d'enregistrer la zone (" + r.error + ")."); return; }
  currentZoneId = r.id;
  zoneNameInput.value = "";
  zoneSave.classList.add("hidden");
  await loadZones();
}
document.getElementById("btnSaveZone").addEventListener("click", saveZone);
zoneNameInput.addEventListener("keydown", e => { if (e.key === "Enter") saveZone(); });

btnSync.addEventListener("click", async () => {
  btnSync.disabled = true;
  progress.style.display = "block";
  let page = 1, done = false, added = 0, guard = 0;
  while (!done && guard++ < 500) { // garde-fou anti-boucle infinie
    const r = await apiPost("/api/sync", { page });
    if (r.error === "rate_limited") {
      const wait = r.retryAfter || 60;
      statusEl.textContent = "Limite Strava atteinte, reprise dans " + wait + " s…";
      await new Promise(res => setTimeout(res, wait * 1000));
      continue;
    }
    if (r.error) { statusEl.textContent = "Erreur de synchro : " + r.error; break; }
    added += r.added; page = r.nextPage; done = r.done;
    progressBar.style.width = (done ? 100 : 60) + "%";
    statusEl.textContent = "Synchro… " + added + " activités reçues";
  }
  progress.style.display = "none";
  progressBar.style.width = "0";
  btnSync.disabled = false;
  await loadTeamActivities();
});

refreshMe();

/* ---------- Carte ---------- */
const map = L.map("map", { zoomControl: true }).setView([46.6, 2.4], 6); // France entière
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; contributeurs OpenStreetMap', maxZoom: 19
}).addTo(map);

const canvasRenderer = L.canvas({ padding: 0.3 });
const heatGroup = L.layerGroup().addTo(map);

const zoneStyle = { color: "#E31837", weight: 2, fillColor: "#E31837", fillOpacity: 0.08 };

/* ---------- Dessin de la zone (sans plugin) ---------- */
let drawing = false, drawPts = [], zoneLayer = null;
let tempLine = null, tempMarkers = [], drawTip = null;
const btnDraw = document.getElementById("btnDraw");
const btnClearZone = document.getElementById("btnClearZone");
const mapWrap = document.querySelector(".map-wrap");

btnDraw.addEventListener("click", () => drawing ? finishDraw() : startDraw());
btnClearZone.addEventListener("click", () => drawing ? cancelDraw() : clearZone());
document.addEventListener("keydown", e => { if (e.key === "Escape" && drawing) cancelDraw(); });

function startDraw() {
  clearZone();
  drawing = true; drawPts = [];
  map.doubleClickZoom.disable();
  mapWrap.classList.add("drawing");
  btnDraw.textContent = "Terminer la zone";
  btnClearZone.textContent = "Annuler";
  btnClearZone.classList.remove("hidden");
  document.getElementById("mapHint").style.display = "none";
  drawTip = document.createElement("div");
  drawTip.className = "draw-tip";
  drawTip.textContent = "Touche la carte pour poser les sommets, puis « Terminer la zone » (ou re-touche le 1er point).";
  mapWrap.appendChild(drawTip);
}

map.on("click", e => {
  if (!drawing) return;
  drawPts.push([e.latlng.lat, e.latlng.lng]);
  if (tempLine) tempLine.setLatLngs(drawPts);
  else tempLine = L.polyline(drawPts, { color: "#E31837", weight: 2, dashArray: "6 4" }).addTo(map);
  const mk = L.circleMarker(e.latlng, {
    radius: drawPts.length === 1 ? 8 : 5, color: "#E31837",
    fillColor: "#fff", fillOpacity: 1, weight: 2
  }).addTo(map);
  if (drawPts.length === 1) mk.on("click", ev => { L.DomEvent.stopPropagation(ev); finishDraw(); });
  tempMarkers.push(mk);
});
map.on("dblclick", () => { if (drawing) finishDraw(); });

function cleanupDraw() {
  drawing = false;
  map.doubleClickZoom.enable();
  mapWrap.classList.remove("drawing");
  btnDraw.textContent = "Dessiner une zone";
  btnClearZone.textContent = "Supprimer la zone";
  if (!zoneRing) btnClearZone.classList.add("hidden");
  if (tempLine) { map.removeLayer(tempLine); tempLine = null; }
  tempMarkers.forEach(m => map.removeLayer(m)); tempMarkers = [];
  if (drawTip) { drawTip.remove(); drawTip = null; }
}

function cancelDraw() { cleanupDraw(); drawPts = []; }

function finishDraw() {
  // retire les doublons consécutifs (le double-clic génère deux clics au même endroit)
  const pts = drawPts.filter((p, i) => i === 0 || p[0] !== drawPts[i-1][0] || p[1] !== drawPts[i-1][1]);
  cleanupDraw();
  if (pts.length < 3) { drawPts = []; return; }
  setZone(pts, null);
}

// Zone courante : dessinée à la main (id null → proposer l'enregistrement)
// ou chargée depuis les zones de l'équipe (id renseigné).
function setZone(ring, id) {
  if (zoneLayer) map.removeLayer(zoneLayer);
  zoneRing = ring;
  currentZoneId = id ?? null;
  zoneLayer = L.polygon(ring, zoneStyle).addTo(map);
  btnClearZone.textContent = "Supprimer la zone";
  btnClearZone.classList.remove("hidden");
  document.getElementById("step2").classList.add("done");
  zoneSave.classList.toggle("hidden", currentZoneId !== null);
  renderZoneChips();
  computeZone();
}

function clearZone() {
  if (zoneLayer) { map.removeLayer(zoneLayer); zoneLayer = null; }
  zoneRing = null;
  currentZoneId = null;
  btnClearZone.classList.add("hidden");
  zoneSave.classList.add("hidden");
  renderZoneChips();
  resetResults();
}

function drawHeatmap() {
  heatGroup.clearLayers();
  for (const a of filtered()) {
    const pts = a.pts;
    const stride = Math.max(1, Math.floor(pts.length / 2 / 300)); // ~300 pts max affichés par trace
    const latlngs = [];
    for (let i = 0; i < pts.length; i += 2 * stride) latlngs.push([pts[i], pts[i+1]]);
    L.polyline(latlngs, { renderer: canvasRenderer, color: "#E31837", weight: 2, opacity: 0.13, interactive: false })
      .addTo(heatGroup);
  }
}
document.getElementById("chkHeat").addEventListener("change", e => {
  if (e.target.checked) map.addLayer(heatGroup); else map.removeLayer(heatGroup);
});

function fitToData() {
  if (!activities.length) return;
  let minLa = 90, minLo = 180, maxLa = -90, maxLo = -180;
  for (const a of activities) {
    if (a.bbox[0] < minLa) minLa = a.bbox[0];
    if (a.bbox[1] < minLo) minLo = a.bbox[1];
    if (a.bbox[2] > maxLa) maxLa = a.bbox[2];
    if (a.bbox[3] > maxLo) maxLo = a.bbox[3];
  }
  map.fitBounds([[minLa, minLo], [maxLa, maxLo]], { padding: [30, 30] });
}

/* ---------- Calcul de zone ---------- */
function computeZone() {
  if (!zoneRing || !activities.length) return;

  let zMinLa = 90, zMinLo = 180, zMaxLa = -90, zMaxLo = -180;
  for (const [la, lo] of zoneRing) {
    if (la < zMinLa) zMinLa = la; if (la > zMaxLa) zMaxLa = la;
    if (lo < zMinLo) zMinLo = lo; if (lo > zMaxLo) zMaxLo = lo;
  }

  lastResults = [];
  for (const a of filtered()) {
    const [bMinLa, bMinLo, bMaxLa, bMaxLo] = a.bbox;
    if (bMaxLa < zMinLa || bMinLa > zMaxLa || bMaxLo < zMinLo || bMinLo > zMaxLo) continue;

    const pts = a.pts;
    let m = 0, passages = 0;
    let prevLa = pts[0], prevLo = pts[1];
    let prevIn = pip(prevLa, prevLo, zoneRing);
    if (prevIn) passages = 1;
    for (let i = 2; i < pts.length; i += 2) {
      const la = pts[i], lo = pts[i+1];
      const curIn = pip(la, lo, zoneRing);
      if (curIn || prevIn) {
        const d = hav(prevLa, prevLo, la, lo);
        if (d < 10000) m += (curIn && prevIn) ? d : d / 2;
      }
      if (curIn && !prevIn) passages++;
      prevLa = la; prevLo = lo; prevIn = curIn;
    }
    if (m > 0) lastResults.push({ a, km: m / 1000, passages });
  }
  lastResults.sort((x, y) => y.km - x.km);
  renderResults();
}

function resetResults() {
  lastResults = [];
  document.getElementById("kpis").classList.add("hidden");
  document.getElementById("charts").classList.add("hidden");
  document.getElementById("tableCard").classList.add("hidden");
  document.getElementById("btnCsv").classList.add("hidden");
}

/* ---------- Rendu résultats ---------- */
function fmtKm(v) { return v >= 100 ? Math.round(v).toLocaleString("fr-FR") : v.toFixed(1).replace(".", ","); }

function renderResults() {
  const totalKm = lastResults.reduce((s, r) => s + r.km, 0);
  const totalPass = lastResults.reduce((s, r) => s + r.passages, 0);
  const n = lastResults.length;

  const byYear = new Map(), byMonth = new Array(12).fill(0);
  for (const r of lastResults) {
    const y = r.a.year || 0;
    if (!byYear.has(y)) byYear.set(y, { km: 0, n: 0 });
    const e = byYear.get(y); e.km += r.km; e.n++;
    byMonth[r.a.month] += r.km;
  }
  let bestYear = "—", bestKm = 0;
  for (const [y, e] of byYear) if (y && e.km > bestKm) { bestKm = e.km; bestYear = y; }

  document.getElementById("kKm").innerHTML = fmtKm(totalKm) + " <small>km</small>";
  document.getElementById("kActs").textContent = n.toLocaleString("fr-FR");
  document.getElementById("kPass").textContent = totalPass.toLocaleString("fr-FR");
  document.getElementById("kAvg").innerHTML = fmtKm(n ? totalKm / n : 0) + " <small>km</small>";
  document.getElementById("kBest").textContent = bestYear;
  document.getElementById("kBestL").textContent = bestYear === "—" ? "année la plus active" :
    "année la plus active · " + fmtKm(bestKm) + " km";

  document.getElementById("kpis").classList.remove("hidden");
  document.getElementById("charts").classList.remove("hidden");
  document.getElementById("tableCard").classList.remove("hidden");
  document.getElementById("btnCsv").classList.remove("hidden");
  document.getElementById("step3").classList.add("done");

  // Graphique années
  const years = [...byYear.keys()].filter(y => y).sort();
  const kmData = years.map(y => +byYear.get(y).km.toFixed(1));
  const nData = years.map(y => byYear.get(y).n);
  if (chartYear) chartYear.destroy();
  chartYear = new Chart(document.getElementById("chartYear"), {
    data: {
      labels: years,
      datasets: [
        { type: "bar", label: "km en zone", data: kmData, backgroundColor: "#E31837", borderRadius: 4, yAxisID: "y" },
        { type: "line", label: "activités", data: nData, borderColor: "#1D9E6F", backgroundColor: "#1D9E6F", pointRadius: 3, tension: .25, yAxisID: "y2" }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { labels: { boxWidth: 12, font: { size: 12 } } } },
      scales: {
        y: { title: { display: true, text: "km" }, grid: { color: "#ECE8E1" } },
        y2: { position: "right", grid: { display: false }, title: { display: true, text: "activités" }, ticks: { precision: 0 } },
        x: { grid: { display: false } }
      }
    }
  });

  // Graphique saisonnalité
  if (chartMonth) chartMonth.destroy();
  chartMonth = new Chart(document.getElementById("chartMonth"), {
    type: "bar",
    data: { labels: MONTHS, datasets: [{ label: "km en zone", data: byMonth.map(v => +v.toFixed(1)), backgroundColor: "#F2A3AF", hoverBackgroundColor: "#E31837", borderRadius: 4 }] },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { grid: { color: "#ECE8E1" } }, x: { grid: { display: false } } }
    }
  });

  // Tableau (200 premières lignes)
  const MAXROWS = 200;
  const body = document.getElementById("tableBody");
  body.innerHTML = "";
  for (const r of lastResults.slice(0, MAXROWS)) {
    const tr = document.createElement("tr");
    const d = r.a.ts ? new Date(r.a.ts).toLocaleDateString("fr-FR") : "—";
    tr.innerHTML = "<td>" + d + "</td>" +
      "<td><span class='fname'>" + esc(r.a.name) + "</span></td>" +
      "<td class='muted'>" + esc(r.a.sport) + "</td>" +
      "<td class='muted'>" + esc(r.a.athlete || "—") + "</td>" +
      "<td class='r km-cell'>" + fmtKm(r.km) + "</td>" +
      "<td class='r'>" + fmtKm(r.a.totalKm) + "</td>" +
      "<td class='r'>" + r.passages + "</td>";
    body.appendChild(tr);
  }
  document.getElementById("tableInfo").textContent =
    n > MAXROWS ? "· " + MAXROWS + " affichées sur " + n + " (CSV complet via l'export)" : "· " + n + " activités";
}

function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

/* ---------- Export CSV ---------- */
document.getElementById("btnCsv").addEventListener("click", () => {
  let csv = "date;activite;sport;athlete;km_zone;km_total;passages\n";
  for (const r of lastResults) {
    const d = r.a.ts ? new Date(r.a.ts).toISOString().slice(0, 10) : "";
    csv += d + ";\"" + r.a.name.replace(/"/g, '""') + "\";" +
      "\"" + r.a.sport.replace(/"/g, '""') + "\";" +
      "\"" + (r.a.athlete || "").replace(/"/g, '""') + "\";" +
      r.km.toFixed(2).replace(".", ",") + ";" +
      r.a.totalKm.toFixed(2).replace(".", ",") + ";" + r.passages + "\n";
  }
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const aEl = document.createElement("a");
  aEl.href = URL.createObjectURL(blob);
  aEl.download = "dans-ma-zone.csv";
  aEl.click();
  URL.revokeObjectURL(aEl.href);
});
