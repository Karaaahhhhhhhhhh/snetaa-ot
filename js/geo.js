/* =========================================================
   Géolocalisation et distances (Géoplateforme IGN, nécessite internet)
   ========================================================= */
'use strict';
/* ---------- Géolocalisation et distances (nécessite internet) ---------- */
const Geo = {
  cache: {},
  async geocode(q) {
    if (Geo.cache[q]) return Geo.cache[q];
    let j = null;
    for (const base of ['https://data.geopf.fr/geocodage/search?limit=1&q=', 'https://api-adresse.data.gouv.fr/search/?limit=1&q=']) {
      try { const r = await fetch(base + encodeURIComponent(q)); if (r.ok) { j = await r.json(); break; } } catch (e) { }
    }
    if (!j) throw new Error('service d\'adresses indisponible');
    const f = j.features && j.features[0];
    if (!f) throw new Error('adresse introuvable : ' + q);
    const res = { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], label: f.properties.label, score: f.properties.score };
    Geo.cache[q] = res; return res;
  },
  /* Cadres des départements de l'académie (marge comprise) */
  DEPS: { '18': [46.38, 47.68, 1.72, 3.13], '28': [47.90, 49.00, 0.70, 2.04], '36': [46.30, 47.33, 0.81, 2.26], '37': [46.68, 47.76, 0.00, 1.42], '41': [47.13, 48.19, 0.53, 2.30], '45': [47.43, 48.40, 1.46, 3.18] },
  depDe(e) { return e.dep || depFromUAI(e.uai) || depFromCP(e.cp) || ''; },
  dansDep(lat, lon, dep) { const b = Geo.DEPS[dep]; if (!b) return lat > 46.2 && lat < 49.1 && lon > -0.2 && lon < 3.3; return lat >= b[0] && lat <= b[1] && lon >= b[2] && lon <= b[3]; },
  coordOk(e) { return e.lat != null && !isNaN(e.lat) && Geo.dansDep(+e.lat, +e.lon, Geo.depDe(e)); },
  async chercher(q, params) {
    const k = q + '|' + params; if (Geo.cache[k]) return Geo.cache[k];
    let j = null;
    for (const base of ['https://api-adresse.data.gouv.fr/search/?', 'https://data.geopf.fr/geocodage/search?']) {
      try { const r = await fetch(base + 'limit=10&q=' + encodeURIComponent(q) + params); if (r.ok) { j = await r.json(); break; } } catch (e) { }
    }
    if (!j) throw new Error('service d\'adresses indisponible');
    return (Geo.cache[k] = j.features || []);
  },
  /* Localisation stricte d'un établissement : le point trouvé doit être dans son département (et sa commune si possible) */
  async etab(e) {
    const dep = Geo.depDe(e), cp = normCP(e.cp), ville = String(e.ville || '').trim();
    const bon = f => { const pr = f.properties || {}, c = f.geometry.coordinates; return (!dep || String(pr.citycode || '').startsWith(dep) || String(pr.postcode || '').startsWith(dep)) && Geo.dansDep(c[1], c[0], dep); };
    const memeVille = f => !ville || norm(f.properties.city || '') === norm(ville) || (cp && f.properties.postcode === cp);
    const essais = [];
    // adresse nettoyée : sans code postal / ville répétés, ni boîte postale (BP, CS, TSA) ni CEDEX
    const adr = String(e.adresse || '').replace(/,?\s*\d{5}.*$/, '').replace(/[,\s]*\b(BP|B\.P\.|CS|TSA|CP)\s*\d+/gi, '').replace(/\bcedex\b\s*\d*/gi, '').replace(/\s*,\s*$/, '').replace(/\s{2,}/g, ' ').trim();
    if (adr) { if (cp) essais.push([adr + ' ' + cp + ' ' + ville, '&postcode=' + cp, 'adresse']); essais.push([adr + ' ' + ville, '', 'adresse']); }
    if (ville) { if (cp) essais.push([ville, '&postcode=' + cp + '&type=municipality', 'commune']); essais.push([ville, '&type=municipality', 'commune']); }
    for (const [q, pa, niv] of essais) {
      let fs; try { fs = await Geo.chercher(q, pa); } catch (x) { if (/indisponible/.test(x.message)) throw x; continue; }
      const f = fs.find(f => bon(f) && memeVille(f) && (niv === 'commune' || (f.properties.score || 0) >= 0.4)) || (niv === 'commune' && !ville ? fs.find(bon) : null);
      if (f) return { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], approx: niv === 'commune' || f.properties.type === 'municipality' };
    }
    throw new Error('introuvable dans son département : ' + e.nom);
  },
  async point(v) { // v: adresse ou établissement déjà géolocalisé
    const e = D.etablissements.find(x => [x.adresse, x.cp, x.ville].filter(Boolean).join(' ') === v && x.lat);
    return e ? { lat: e.lat, lon: e.lon } : Geo.geocode(v);
  },
  vol(a, b) { const R = 6371, t = x => x * Math.PI / 180; const dl = t(b.lat - a.lat), dn = t(b.lon - a.lon); const h = Math.sin(dl / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); },
  /* Itinéraire routier IGN (Géoplateforme, 5 requêtes/s max) entre deux points {lat, lon} : seules les coordonnées sont envoyées */
  async itineraire(pa, pb) {
    const r = await fetch(`https://data.geopf.fr/navigation/itineraire?resource=bdtopo-osrm&profile=car&optimization=fastest&start=${pa.lon},${pa.lat}&end=${pb.lon},${pb.lat}&getSteps=false&distanceUnit=kilometer`);
    if (!r.ok) throw new Error('calcul d\'itinéraire indisponible (' + r.status + ')');
    const j = await r.json(); if (!j || !j.distance) throw new Error('itinéraire introuvable');
    return Math.round(num(j.distance));
  },
  async distance(a, b) {
    const pa = await Geo.point(a), pb = await Geo.point(b);
    try { // itinéraire IGN (Géoplateforme)
      const r = await fetch(`https://data.geopf.fr/navigation/itineraire?resource=bdtopo-osrm&profile=car&optimization=fastest&start=${pa.lon},${pa.lat}&end=${pb.lon},${pb.lat}&getSteps=false&distanceUnit=kilometer`);
      const j = await r.json(); if (j && j.distance) return { km: Math.round(num(j.distance)), route: true };
    } catch (e) { }
    return { km: Math.round(Geo.vol(pa, pb) * 1.3), route: false };
  }
};
