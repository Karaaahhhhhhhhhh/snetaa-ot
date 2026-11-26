/* =========================================================
   Annuaire des sections académiques du SNETAA-FO
   (importé depuis un fichier Excel ; jamais inclus dans le code)
   ========================================================= */
'use strict';
const Sections = {
  q: '', zone: '', vue: 'liste', map: null,
  liste() { return D.sections || []; },
  COLS: { academie: ['academie', 'section', 'academie / section'], zone: ['zone'], mail: ['mail', 'courriel', 'email'], responsables: ['responsable', 'responsables', 'responsable(s)', 'secretaire'], tel: ['telephone', 'tel'], adresse: ['adresse'], site: ['site', 'site web'], remarque: ['remarque', 'note', 'notes'] },
  async importer() {
    const f = await pickFile('.xlsx,.xls,.csv'); if (!f) return;
    let sheets; try { sheets = await readSheetFile(f); } catch (e) { return UI.toast('Fichier illisible', 'r'); }
    const rows = Object.values(sheets)[0] || [];
    const hi = rows.findIndex(r => r.some(c => /acad|section/i.test(String(c))) && r.some(c => /mail/i.test(String(c))));
    if (hi < 0) return UI.toast('Colonnes « Académie / section » et « Mail » introuvables', 'r');
    const head = rows[hi].map(c => norm(String(c)));
    const idx = {}; Object.entries(Sections.COLS).forEach(([k, syn]) => { idx[k] = head.findIndex(h => syn.some(s => h === s || h.startsWith(s))); });
    const l = rows.slice(hi + 1).map(r => { const o = {}; Object.keys(idx).forEach(k => { o[k] = idx[k] >= 0 ? String(r[idx[k]] || '').trim() : ''; }); return o; })
      .filter(o => o.academie && (o.mail || o.tel) && !/^source/i.test(o.academie));
    if (!l.length) return UI.toast('Aucune section trouvée', 'r');
    // rapprochement avec la liste des académies (Caen et Rouen → Normandie)
    const acadDe = nom => { const n = norm(nom); if (/national/.test(n)) return '_national'; if (n === 'caen' || n === 'rouen') return 'Normandie'; return REF.academies.find(a => norm(a) === n) || ''; };
    const M = D.meta; M.mailsAcademies = M.mailsAcademies || {};
    let maj = 0, conflits = [];
    l.forEach(o => {
      o.cle = acadDe(o.academie); o.id = norm(o.academie).replace(/ /g, '-');
      if (o.cle === '_national') { if (!M.mailNational) { M.mailNational = o.mail; maj++; } return; }
      if (!o.cle || o.cle === M.syndicat.academie || !o.mail) return;
      if (o.cle === 'Normandie' && M.mailsAcademies.Normandie && !M.mailsAcademies.Normandie.includes(o.mail)) { M.mailsAcademies.Normandie += ',' + o.mail; maj++; return; }
      if (M.mailsAcademies[o.cle] && M.mailsAcademies[o.cle] !== o.mail) conflits.push(`${o.cle} : ${M.mailsAcademies[o.cle]} → ${o.mail}`);
      if (M.mailsAcademies[o.cle] !== o.mail) { M.mailsAcademies[o.cle] = o.mail; maj++; }
    });
    l.forEach(o => { const a = (D.sections || []).find(x => x.id === o.id && x.adresse === o.adresse && x.lat != null); if (a) { o.lat = a.lat; o.lon = a.lon; o.geoApprox = a.geoApprox; } });
    D.sections = l; D.meta.sectionsMaj = { date: nowISO(), fichier: f.name };
    save(); log('Annuaire des sections importé', l.length + ' sections');
    UI.modal('Annuaire des sections importé', `<p><b>${l.length}</b> sections importées.</p><p class="small"><b>${maj}</b> courriel(s) mis à jour dans Paramètres (adresse du national, adresses des sections pour les changements d'académie).</p>${conflits.length ? `<p class="small">Adresses remplacées :</p><ul class="small">${conflits.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}`, [{ label: 'Voir l\'annuaire', onClick: () => { App.go('sections'); setTimeout(App.route, 0); } }]);
  },
  de(acad) { return Sections.liste().find(o => o.cle === acad || norm(o.academie) === norm(acad || '')); },
  tels(t) { return String(t || '').split('|').map(x => x.trim()).filter(Boolean).map(x => { const num = (x.match(/[+\d][\d\s.]{7,}/) || [''])[0].trim(); return num ? `<a href="tel:${esc(num.replace(/[\s.]/g, ''))}">${esc(x)}</a>` : esc(x); }).join('<br>'); },
  zoneDe(o) { const z = typeof Agenda !== 'undefined' && Agenda.zoneDe(o.cle || o.academie); return z ? (['A', 'B', 'C'].includes(z) ? 'Zone ' + z : z === 'Corse' ? 'Corse' : 'Outre-mer') : (o.zone || ''); },
  couleur(o) { const z = (typeof Agenda !== 'undefined' && Agenda.zoneDe(o.cle || o.academie)) || ''; return (Carte.ZCOUL || {})[z] || (o.cle === '_national' ? '#601080' : '#1b2a4a'); },
  fiche(id) {
    const o = Sections.liste().find(x => x.id === id); if (!o) return;
    const lien = v => v ? `<a href="${esc(/^https?:/.test(v) ? v : 'https://' + v)}" target="_blank" rel="noopener">${esc(v)}</a>` : '';
    UI.modal(o.cle === '_national' ? o.academie : 'Section SNETAA-FO ' + o.academie, `<div class="kv">
      <div>Zone de congés</div><div><span class="dot" style="background:${Sections.couleur(o)}"></span>${esc(Sections.zoneDe(o) || '—')}</div>
      <div>Responsable(s)</div><div><b>${esc(o.responsables || '—')}</b></div>
      <div>Téléphone</div><div>${Sections.tels(o.tel) || '—'}</div>
      <div>Courriel</div><div>${o.mail ? `<a href="mailto:${esc(o.mail)}">${esc(o.mail)}</a>` : '—'}</div>
      <div>Adresse</div><div>${esc(o.adresse || '—')}</div>
      ${o.site ? `<div>Site</div><div>${lien(o.site)}</div>` : ''}${o.remarque ? `<div>Remarque</div><div class="small">${esc(o.remarque)}</div>` : ''}</div>`,
      [{ label: 'Fermer' }, { label: 'Copier', onClick: () => { copyText([o.academie, o.responsables, o.mail, o.tel, o.adresse].filter(Boolean).join(' — ')); UI.toast('Copié', 'g'); return false; } },
        ...(o.lat != null || Sections.centre(o) ? [{ label: '🗺 Sur la carte', onClick: () => { Sections.vue = 'carte'; Sections.focus = o.id; App.route(); } }] : [])]);
  },
  /* position de repli : centre de l'académie (métropole) */
  TER: { 'Nouvelle-Calédonie': [-22.276, 166.458], 'Polynésie française': [-17.535, -149.548], 'Wallis-et-Futuna': [-13.282, -176.174], 'Saint-Pierre-et-Miquelon': [46.78, -56.177] },
  REPLI: { Guadeloupe: [16.25, -61.58], Guyane: [4.93, -52.33], Martinique: [14.61, -61.07], Mayotte: [-12.78, 45.23], 'La Réunion': [-20.88, 55.45], _national: [48.846, 2.211] },
  centre(o) {
    if (Sections.TER[o.cle]) return Sections.TER[o.cle];
    if (Sections.REPLI[o.cle]) return Sections.REPLI[o.cle];
    const G = window.GEO_FR; if (!G) return null; const k = o.cle === 'Normandie' || /caen|rouen/i.test(o.academie) ? 'Normandie' : o.cle;
    const f = G.acads.features.find(x => x.properties.nom === k); if (!f) return null;
    const dec = /rouen/i.test(o.academie) ? [0.35, 0.5] : /caen/i.test(o.academie) ? [-0.15, -0.6] : [0, 0];
    return [f.properties.lat + dec[0], f.properties.lon + dec[1]];
  },
  pos(o) { return o.lat != null && !Sections.TER[o.cle] ? [o.lat, o.lon] : Sections.centre(o); },
  async localiser() {
    if (Sections._enCours || navigator.onLine === false) return; Sections._enCours = true; let n = 0;
    for (const o of Sections.liste().filter(x => x.lat == null && x.adresse && !Sections.TER[x.cle])) {
      const adr = String(o.adresse).replace(/^SNETAA[^-–—]*[-–—]\s*/i, '').replace(/[,\s]*\b(BP|B\.P\.|CS|TSA)\s*\d+/gi, '').replace(/\bcedex\b\s*\d*/gi, '').replace(/\s*[-–—|]\s*/g, ' ').trim();
      const cp = (String(o.adresse).match(/\b(\d{5})\b/) || [])[1] || '';
      try {
        let fs = await Geo.chercher(adr, ''); let f = fs.find(x => !cp || String(x.properties.postcode || '').slice(0, 2) === cp.slice(0, 2));
        if (!f && cp) { fs = await Geo.chercher(String(o.adresse).replace(/.*\d{5}\s*/, '').replace(/cedex.*/i, '').trim(), '&postcode=' + cp); f = fs[0]; }
        if (f) { o.lat = f.geometry.coordinates[1]; o.lon = f.geometry.coordinates[0]; o.geoApprox = (f.properties.score || 0) < 0.5 || f.properties.type === 'municipality'; n++; }
      } catch (x) { if (/indisponible/.test(x.message)) break; }
      await new Promise(r => setTimeout(r, 60));
    }
    Sections._enCours = false; if (n) { save(); if (Sections.vue === 'carte' && Sections.map) Sections.dessiner(); }
  },
  carte() {
    if (!window.L) return;
    if (Sections.map) { try { Sections.map.remove(); } catch (x) { } }
    const m = Sections.map = L.map('secmap').setView([46.6, 2.4], 6);
    L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', { maxZoom: 18, attribution: '© IGN – Géoplateforme' }).addTo(m);
    const fonds = Carte.fondsAdmin(m);
    ['Académies', 'Zones de congés scolaires'].forEach(k => fonds[k] && fonds[k].addTo(m));
    L.control.layers(null, fonds, { position: 'topright', collapsed: window.innerWidth < 700 }).addTo(m);
    Sections.couche = L.layerGroup().addTo(m);
    Sections.dessiner();
    if (Sections.liste().some(o => o.lat == null && o.adresse && !Sections.TER[o.cle])) setTimeout(() => Sections.localiser(), 400);
  },
  dessiner() {
    if (!Sections.couche) return; Sections.couche.clearLayers();
    const z = Sections.zone, q = norm(Sections.q);
    Sections.liste().filter(o => (!z || Sections.zoneDe(o) === z) && (!q || norm(Object.values(o).join(' ')).includes(q))).forEach(o => {
      const p = Sections.pos(o); if (!p) return;
      const nous = o.academie === D.meta.syndicat.academie, col = Sections.couleur(o);
      const mk = L.circleMarker(p, { radius: nous || o.cle === '_national' ? 11 : 8, color: '#fff', weight: 2, fillColor: col, fillOpacity: 0.95 });
      mk.bindTooltip(esc(o.academie), { direction: 'top' });
      mk.bindPopup(`<b>${esc(o.academie)}</b> <span class="small mut">${esc(Sections.zoneDe(o))}</span><br>${esc(o.responsables || '')}${o.tel ? '<br>' + Sections.tels(o.tel) : ''}${o.mail ? `<br><a href="mailto:${esc(o.mail)}">${esc(o.mail)}</a>` : ''}<br><span class="small">${esc(o.adresse || '')}${o.lat == null ? ' <i>(position indicative)</i>' : ''}</span><br><button class="btn sm sec" style="margin-top:4px" onclick="Sections.fiche('${esc(o.id)}')">Fiche de la section</button>`);
      mk.addTo(Sections.couche);
      if (Sections.focus === o.id) setTimeout(() => { Sections.map.setView(p, 9); mk.openPopup(); }, 150);
    });
    Sections.focus = null;
  },
  voler(id) { const o = Sections.liste().find(x => x.id === id), p = o && Sections.pos(o); if (!p) return Sections.fiche(id); Sections.map.setView(p, 8); Sections.couche.eachLayer(l => { const c = l.getLatLng(); if (Math.abs(c.lat - p[0]) < 1e-6 && Math.abs(c.lng - p[1]) < 1e-6) l.openPopup(); }); },
  page() {
    const q = norm(Sections.q), z = Sections.zone, all = Sections.liste();
    const l = all.filter(o => (!z || Sections.zoneDe(o) === z) && (!q || norm(Object.values(o).join(' ')).includes(q)));
    const zones = Array.from(new Set(all.map(Sections.zoneDe).filter(Boolean))).sort();
    $('#main').innerHTML = `<div class="ph"><div><h1>Sections académiques du SNETAA-FO</h1><p class="sub">${all.length ? `${all.length} sections${D.meta.sectionsMaj ? ' · importé le ' + fmtDate(D.meta.sectionsMaj.date) + ' (' + esc(D.meta.sectionsMaj.fichier) + ')' : ''}` : 'Annuaire pas encore importé.'}</p></div>
      <div class="actions">${all.length ? `<div class="seg"><button class="btn ${Sections.vue === 'liste' ? '' : 'sec'}" onclick="Sections.vue='liste';App.route()">☰ Liste</button><button class="btn ${Sections.vue === 'carte' ? '' : 'sec'}" onclick="Sections.vue='carte';App.route()">🗺 Carte</button></div>` : ''}${can('adm.params') ? '<button class="btn sec" onclick="Sections.importer()">⇪ Importer / mettre à jour (Excel)</button>' : ''}</div></div>
      ${all.length ? `<div class="card"><div class="toolbar"><input placeholder="Rechercher (académie, nom, ville…)" value="${esc(Sections.q)}" oninput="Sections.q=this.value;clearTimeout(Sections._t);Sections._t=setTimeout(()=>{if(Sections.vue==='carte'){Sections.dessiner();return}App.route();const i=document.querySelector('.toolbar input');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)" style="max-width:300px">
        <select onchange="Sections.zone=this.value;App.route()">${UI.opts(zones, z, 'Toutes les zones')}</select></div></div>
      ${Sections.vue === 'carte' ? `<div id="secmap" style="height:68vh;border-radius:10px;border:1px solid var(--line)"></div>
      <div class="small" style="margin:.4rem 0">${['A', 'B', 'C'].map(k => `<span class="dot" style="background:${Carte.ZCOUL[k]}"></span>zone ${k}`).join(' ')} <span class="dot" style="background:${Carte.ZCOUL.Corse}"></span>Corse · grosse pastille : notre section et le siège national · académies et zones à cocher en haut à droite</div>
      <div class="card"><b class="small">Aller à (outre-mer, siège) :</b> ${l.filter(o => !window.GEO_FR || !window.GEO_FR.acads.features.some(f => f.properties.nom === o.cle) || o.cle === '_national').filter(o => !/caen|rouen/i.test(o.academie)).map(o => `<button class="btn sm sec" style="margin:.15rem" onclick="Sections.voler('${esc(o.id)}')">${esc(o.academie)}</button>`).join('')}</div>` : `
      <div class="tablewrap"><table><thead><tr><th>Section</th><th>Responsable(s)</th><th>Contact</th><th>Adresse</th><th></th></tr></thead><tbody>
      ${l.map(o => `<tr ${o.academie === D.meta.syndicat.academie ? 'style="background:#f3f0f7"' : ''}><td><a href="#" onclick="Sections.fiche('${esc(o.id)}');return false"><b>${esc(o.academie)}</b></a><div class="small mut"><span class="dot" style="background:${Sections.couleur(o)}"></span>${esc(Sections.zoneDe(o))}</div></td><td>${esc(o.responsables || '')}</td>
        <td class="small">${o.mail ? `<a href="mailto:${esc(o.mail)}">${esc(o.mail)}</a><br>` : ''}${Sections.tels(o.tel)}</td><td class="small">${esc(o.adresse || '')}${o.remarque ? `<div class="mut">${esc(o.remarque)}</div>` : ''}</td>
        <td class="small nowrap">${o.site ? `<a href="${esc(/^https?:/.test(o.site) ? o.site : 'https://' + o.site)}" target="_blank" rel="noopener">site</a> · ` : ''}<a href="#" onclick="copyText(${JSON.stringify([o.academie, o.responsables, o.mail, o.tel, o.adresse].filter(Boolean).join(' — ')).replace(/"/g, '&quot;')});return false">copier</a></td></tr>`).join('') || '<tr><td colspan="5" class="mut">Aucun résultat</td></tr>'}</tbody></table></div>`}`
      : `<div class="card"><p>Importe le fichier Excel des sections (colonnes : Académie / section, Zone, Mail, Responsable(s), Téléphone, Adresse, Site, Remarque). Les adresses servent aussi aux mails de changement d'académie.</p></div>`}`;
  }
};
App.routes.sections = () => { Sections.page(); if (Sections.vue === 'carte' && document.getElementById('secmap')) Sections.carte(); };
