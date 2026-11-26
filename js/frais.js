/* =========================================================
   Déclarations de frais (déplacements syndicaux)
   ========================================================= */
'use strict';
const Frais = {
  TYPES: [['km', 'Kilomètres (véhicule personnel)'], ['train', 'Train / transports en commun'], ['peage', 'Péage'], ['parking', 'Parking'], ['repas', 'Repas'], ['hebergement', 'Hébergement'], ['autre', 'Autre']],
  STATUTS: { brouillon: ['Brouillon', ''], soumise: ['À valider', 'w'], validee: ['Validée', 'v'], payee: ['Payée', 'ok'], refusee: ['Refusée', 'ko'] },
  onglet: 'miens',
  total(f) { return f.lignes.reduce((s, l) => s + Frais.montant(l, f), 0); },
  montant(l, f) { return l.type === 'km' ? Math.round(num(l.km) * (l.ar ? 2 : 1) * num(f.taux != null ? f.taux : D.meta.frais.tauxKm) * 100) / 100 : num(l.montant); },
  page() {
    const val = can('frais.valider');
    const tabs = [['miens', 'Mes frais']]; if (val) tabs.push(['avalider', `À valider (${D.frais.filter(f => f.statut === 'soumise').length})`], ['tous', 'Toutes les déclarations']);
    if (!tabs.some(t => t[0] === Frais.onglet)) Frais.onglet = 'miens';
    const l = D.frais.filter(f => Frais.onglet === 'miens' ? f.userId === ME.id : Frais.onglet === 'avalider' ? f.statut === 'soumise' : true).sort((a, b) => a.date < b.date ? 1 : -1);
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Déclarations de frais</h1><div class="mut small">Barème kilométrique actuel : ${String(D.meta.frais.tauxKm).replace('.', ',')} €/km${can('adm.params') ? ' (<a href="#/params">modifier</a>)' : ''}</div></div><div class="actions"><button class="btn" onclick="Frais.edit()">+ Nouvelle déclaration</button></div></div>
      ${UI.tabs('frtabs', tabs, Frais.onglet, '(k=>{Frais.onglet=k;Frais.page()})')}
      <div class="tablewrap"><table><thead><tr><th>Date</th><th>Militant</th><th>Objet</th><th class="num">Montant</th><th>Statut</th></tr></thead><tbody>
      ${l.map(f => `<tr class="click" onclick="Frais.voir('${f.id}')"><td>${fmtDate(f.date)}</td><td>${esc(userName(f.userId))}</td><td>${esc(f.objet)}</td><td class="num">${fmtEUR(Frais.total(f))}</td><td><span class="tag ${Frais.STATUTS[f.statut][1]}">${Frais.STATUTS[f.statut][0]}</span></td></tr>`).join('') || '<tr><td colspan="5" class="mut">Aucune déclaration</td></tr>'}
      </tbody></table></div>`;
  },
  lieux() {
    const l = [];
    D.users.forEach(u => { if (u.adresse) l.push(['Domicile de ' + u.prenom + ' ' + u.nom, u.adresse]); });
    D.etablissements.forEach(e => l.push([e.nom + ' — ' + e.ville, [e.adresse, e.cp, e.ville].filter(Boolean).join(' '), e.uai]));
    return l;
  },
  edit(id, reunionId) {
    const f = id ? JSON.parse(JSON.stringify(D.frais.find(x => x.id === id))) : { date: todayISO(), userId: ME.id, objet: '', reunionId: reunionId || '', lignes: [{ type: 'km', depart: ME.adresse ? 'Domicile de ' + ME.prenom + ' ' + ME.nom : '', arrivee: '', km: '', ar: true }], statut: 'brouillon', justifs: [] };
    if (reunionId && !id) { const r = D.reunions.find(x => x.id === reunionId); if (r) { f.date = r.date; f.objet = r.titre + (r.lieu ? ' — ' + r.lieu : ''); f.lignes[0].arrivee = r.lieu || ''; } }
    Frais.cur = f; Frais.renderEdit();
  },
  renderEdit() {
    const f = Frais.cur;
    const lig = (l, i) => `<div class="card" style="padding:.6rem;margin-bottom:.5rem"><div class="frow" style="align-items:end"><div class="f"><label>Type</label><select onchange="Frais.cur.lignes[${i}].type=this.value;Frais.renderEdit()">${UI.opts(Frais.TYPES, l.type)}</select></div>
      ${l.type === 'km' ? `<div class="f" style="grid-column:span 2"><label>Départ</label><input list="dl_lieux" value="${esc(l.depart || '')}" onchange="Frais.cur.lignes[${i}].depart=this.value"></div><div class="f" style="grid-column:span 2"><label>Arrivée</label><input list="dl_lieux" value="${esc(l.arrivee || '')}" onchange="Frais.cur.lignes[${i}].arrivee=this.value"></div>
        <div class="f"><label>Km (aller)</label><input inputmode="decimal" value="${esc(l.km || '')}" onchange="Frais.cur.lignes[${i}].km=this.value;Frais.majTotal()"></div><div class="f"><label class="chk"><input type="checkbox" ${l.ar ? 'checked' : ''} onchange="Frais.cur.lignes[${i}].ar=this.checked;Frais.majTotal()"> aller-retour</label><button type="button" class="btn sm sec" onclick="Frais.calcKm(${i})">📍 Calculer</button></div>`
        : `<div class="f" style="grid-column:span 3"><label>Libellé</label><input value="${esc(l.libelle || '')}" onchange="Frais.cur.lignes[${i}].libelle=this.value"></div><div class="f"><label>Montant (€)</label><input inputmode="decimal" value="${esc(l.montant || '')}" onchange="Frais.cur.lignes[${i}].montant=this.value;Frais.majTotal()"></div>`}
      <div class="f"><button type="button" class="btn sm ghost" onclick="Frais.cur.lignes.splice(${i},1);Frais.renderEdit()">✕</button></div></div><div class="small mut" id="km_${i}"></div></div>`;
    UI.modal(f.id ? 'Modifier la déclaration' : 'Nouvelle déclaration de frais', `<datalist id="dl_lieux">${Frais.lieux().map(x => `<option value="${esc(x[0])}">`).join('')}</datalist>
      <div class="frow"><div class="f"><label>Date du déplacement</label><input type="date" value="${esc(f.date)}" onchange="Frais.cur.date=this.value"></div><div class="f" style="grid-column:span 2"><label>Objet (réunion, audience, visite d'établissement…)</label><input value="${esc(f.objet)}" onchange="Frais.cur.objet=this.value"></div>
      <div class="f"><label>Réunion liée</label><select onchange="Frais.cur.reunionId=this.value">${UI.opts(D.reunions.slice().sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 60).map(r => [r.id, fmtDate(r.date) + ' ' + r.titre]), f.reunionId, '—')}</select></div>
      ${can('frais.valider') ? `<div class="f"><label>Militant</label><select onchange="Frais.cur.userId=this.value">${UI.militantsOpts(f.userId)}</select></div>` : ''}</div>
      ${f.lignes.map(lig).join('')}<p><button type="button" class="btn sm sec" onclick="Frais.cur.lignes.push({type:'peage'});Frais.renderEdit()">+ Ajouter une ligne</button></p>
      <p><b>Total : <span id="fr_tot">${fmtEUR(Frais.total(f))}</span></b></p>
      <p>Justificatifs : ${f.justifs.map((j, i) => `<span class="tag">${esc(j.nom)} <a href="#" onclick="Frais.cur.justifs.splice(${i},1);Frais.renderEdit();return false">✕</a></span>`).join(' ')} <button type="button" class="btn sm sec" onclick="Frais.ajoutJustif()">📎 Ajouter (photo, PDF)</button></p>`,
      [{ label: 'Annuler' }, { label: 'Enregistrer le brouillon', onClick: () => Frais.save('brouillon') }, { label: 'Envoyer pour validation', onClick: () => Frais.save('soumise') }], { wide: true, nofocus: true });
  },
  majTotal() { const e = $('#fr_tot'); if (e) e.textContent = fmtEUR(Frais.total(Frais.cur)); },
  async calcKm(i) {
    const l = Frais.cur.lignes[i]; const box = $('#km_' + i);
    const adr = v => { const x = Frais.lieux().find(y => y[0] === v); return x ? x[1] : v; };
    if (!l.depart || !l.arrivee) return UI.toast('Indique le départ et l\'arrivée', 'r');
    box.textContent = 'Calcul en cours…';
    try {
      const r = await Geo.distance(adr(l.depart), adr(l.arrivee));
      l.km = r.km; box.textContent = `${r.km} km ${r.route ? 'par la route' : 'à vol d\'oiseau × 1,3 (itinéraire indisponible)'} — vérifie avant envoi.`;
      Frais.renderEdit(); setTimeout(() => { const b = $('#km_' + i); if (b) b.textContent = `${r.km} km ${r.route ? 'par la route' : 'estimés (vol d\'oiseau × 1,3)'} — à vérifier.`; }, 50);
    } catch (e) { box.textContent = 'Calcul impossible (connexion internet nécessaire) : ' + e.message; }
  },
  async ajoutJustif() {
    const f = await pickFile('image/*,.pdf'); if (!f) return;
    if (f.size > 3 * 1024 * 1024) return UI.toast('3 Mo maximum par justificatif', 'r');
    Frais.cur.justifs.push({ nom: f.name, data: await readFile(f, 'dataurl') }); Frais.renderEdit();
  },
  save(statut) {
    const f = Frais.cur;
    if (!f.objet) { UI.toast('Indique l\'objet du déplacement', 'r'); return false; }
    f.statut = statut; f.taux = D.meta.frais.tauxKm; f.historique = f.historique || []; f.historique.push({ d: nowISO(), u: ME.id, a: statut });
    if (!f.id) { f.id = uid(); D.frais.push(f); } else { const i = D.frais.findIndex(x => x.id === f.id); D.frais[i] = f; }
    save(); log('Frais ' + Frais.STATUTS[statut][0].toLowerCase(), f.objet + ' ' + fmtEUR(Frais.total(f))); UI.renderNav(); App.route();
  },
  voir(id) {
    const f = D.frais.find(x => x.id === id); const val = can('frais.valider'); const mine = f.userId === ME.id;
    const btns = [{ label: 'Fermer' }, { label: '🖨 Imprimer', onClick: () => { Frais.imprimer(id); return false; } }];
    if ((mine && ['brouillon', 'refusee'].includes(f.statut)) || val) btns.push({ label: 'Modifier', onClick: () => { setTimeout(() => Frais.edit(id), 30); } });
    if (mine && f.statut === 'brouillon') btns.push({ label: 'Supprimer', onClick: () => { D.frais = D.frais.filter(x => x.id !== id); save(); App.route(); } });
    if (val && f.statut === 'soumise') { btns.push({ label: 'Refuser', onClick: () => Frais.statut(id, 'refusee') }); btns.push({ label: '✓ Valider', onClick: () => Frais.statut(id, 'validee') }); }
    if (val && f.statut === 'validee') btns.push({ label: '€ Marquer comme payée', onClick: () => { setTimeout(() => Frais.payer(id), 30); } });
    UI.modal('Frais — ' + f.objet, `<div class="kv"><div>Militant</div><div>${esc(userName(f.userId))}</div><div>Date</div><div>${fmtDate(f.date)}</div><div>Statut</div><div><span class="tag ${Frais.STATUTS[f.statut][1]}">${Frais.STATUTS[f.statut][0]}</span></div></div>
      <table style="margin-top:.6rem"><thead><tr><th>Nature</th><th>Détail</th><th class="num">Montant</th></tr></thead><tbody>${f.lignes.map(l => `<tr><td>${esc((Frais.TYPES.find(t => t[0] === l.type) || ['', ''])[1])}</td><td>${l.type === 'km' ? esc(`${l.depart} → ${l.arrivee} : ${l.km} km${l.ar ? ' × 2 (A/R)' : ''} × ${String(f.taux).replace('.', ',')} €`) : esc(l.libelle || '')}</td><td class="num">${fmtEUR(Frais.montant(l, f))}</td></tr>`).join('')}<tr><td colspan="2"><b>Total</b></td><td class="num"><b>${fmtEUR(Frais.total(f))}</b></td></tr></tbody></table>
      ${f.justifs.length ? `<p>${f.justifs.map(j => `<a class="tag" href="${j.data}" download="${esc(j.nom)}">📎 ${esc(j.nom)}</a>`).join(' ')}</p>` : ''}
      <p class="small mut">${(f.historique || []).map(h => fmtDT(h.d) + ' ' + userName(h.u) + ' : ' + (Frais.STATUTS[h.a] || [h.a])[0]).join(' · ')}</p>`, btns, { wide: true });
  },
  statut(id, s) { const f = D.frais.find(x => x.id === id); f.statut = s; f.historique.push({ d: nowISO(), u: ME.id, a: s }); save(); log('Frais ' + Frais.STATUTS[s][0].toLowerCase(), f.objet); UI.renderNav(); App.route(); },
  payer(id) {
    const f = D.frais.find(x => x.id === id);
    if (!D.treso.comptes.length) return UI.toast('Crée d\'abord un compte dans Trésorerie', 'r');
    UI.modal('Paiement des frais', `<p>${esc(userName(f.userId))} — ${fmtEUR(Frais.total(f))}</p><div class="frow"><div class="f"><label>Compte</label><select id="py_c">${UI.opts(D.treso.comptes.map(c => [c.id, c.nom]))}</select></div><div class="f"><label>Date</label><input type="date" id="py_d" value="${todayISO()}"></div><div class="f"><label>Mode</label><select id="py_m">${UI.opts(REF.modesPaiement, 'Virement')}</select></div></div><label class="chk"><input type="checkbox" id="py_e" checked> Créer l'écriture dans la trésorerie</label>`,
      [{ label: 'Annuler' }, {
        label: 'Payer', onClick: m => {
          f.statut = 'payee'; f.historique.push({ d: nowISO(), u: ME.id, a: 'payee' });
          if (m.querySelector('#py_e').checked) { const cat = D.treso.categories.find(c => /frais|déplacement/i.test(c.nom) && c.sens === 'D'); const e = { id: uid(), date: m.querySelector('#py_d').value, compteId: m.querySelector('#py_c').value, libelle: 'Frais ' + userName(f.userId) + ' — ' + f.objet, categorieId: cat ? cat.id : '', montant: -Frais.total(f), mode: m.querySelector('#py_m').value, tiers: userName(f.userId), fraisId: f.id, par: ME.id }; D.treso.ecritures.push(e); f.ecritureId = e.id; }
          save(); log('Frais payés', f.objet); App.route();
        }
      }]);
  },
  imprimer(id) {
    const f = D.frais.find(x => x.id === id); const u = D.users.find(x => x.id === f.userId) || {};
    const w = window.open('', '_blank'); const base = location.href.replace(/#.*$/, '').replace(/[^/]*$/, '');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>État de frais</title><style>body{font:11pt system-ui,Arial;margin:1.5cm}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #999;padding:6px}th{background:#e8edf6;text-align:left}.r{text-align:right}h1{color:#1b2a4a;font-size:16pt}img{height:50px}.sig{display:flex;justify-content:space-between;margin-top:40px}</style></head><body>
      <div style="display:flex;gap:14px;align-items:center"><img src="${base}img/logo-snetaa.png"><div><b>SNETAA-FO ${esc(D.meta.syndicat.section)}</b><br>${esc(D.meta.syndicat.mail)}</div></div>
      <h1>État de frais de déplacement</h1><p><b>Militant :</b> ${esc(u.prenom + ' ' + u.nom)}${u.adresse ? '<br><b>Adresse :</b> ' + esc(u.adresse) : ''}<br><b>Date :</b> ${fmtDate(f.date)}<br><b>Objet :</b> ${esc(f.objet)}</p>
      <table><tr><th>Nature</th><th>Détail</th><th class="r">Montant</th></tr>${f.lignes.map(l => `<tr><td>${esc((Frais.TYPES.find(t => t[0] === l.type) || ['', ''])[1])}</td><td>${l.type === 'km' ? esc(`${l.depart} → ${l.arrivee} : ${l.km} km${l.ar ? ' × 2' : ''} × ${String(f.taux).replace('.', ',')} €/km`) : esc(l.libelle || '')}</td><td class="r">${fmtEUR(Frais.montant(l, f))}</td></tr>`).join('')}<tr><th colspan="2">TOTAL</th><th class="r">${fmtEUR(Frais.total(f))}</th></tr></table>
      <p>Statut : ${Frais.STATUTS[f.statut][0]} — ${f.justifs.length} justificatif(s) joint(s)</p>
      <div class="sig"><div>Signature du militant</div><div>Visa du trésorier</div></div><script>setTimeout(()=>print(),500)<\/script></body></html>`);
    w.document.close();
  }
};
App.routes.frais = () => Frais.page();

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
  async distance(a, b) {
    const pa = await Geo.point(a), pb = await Geo.point(b);
    try { // itinéraire IGN (Géoplateforme)
      const r = await fetch(`https://data.geopf.fr/navigation/itineraire?resource=bdtopo-osrm&profile=car&optimization=fastest&start=${pa.lon},${pa.lat}&end=${pb.lon},${pb.lat}&getSteps=false&distanceUnit=kilometer`);
      const j = await r.json(); if (j && j.distance) return { km: Math.round(num(j.distance)), route: true };
    } catch (e) { }
    try {
      const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${pa.lon},${pa.lat};${pb.lon},${pb.lat}?overview=false`);
      const j = await r.json(); if (j.routes && j.routes[0]) return { km: Math.round(j.routes[0].distance / 1000), route: true };
    } catch (e) { }
    return { km: Math.round(Geo.vol(pa, pb) * 1.3), route: false };
  }
};
