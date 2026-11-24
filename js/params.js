/* =========================================================
   Établissements & cartographie, utilisateurs & droits,
   paramètres, sauvegarde, journal, aide
   ========================================================= */
'use strict';
const TYPES_ETAB = { LYC: 'Lycée', LP: 'Lycée professionnel', SEP: 'Section d\'enseignement professionnel', LPO: 'Lycée polyvalent', LGT: 'Lycée général et technologique', SGT: 'Section générale et technologique', LG: 'Lycée général', CLG: 'Collège', SEGPA: 'SEGPA', EREA: 'EREA', ADM: 'Service administratif', CIO: 'CIO', RECT: 'Rectorat', DSDEN: 'DSDEN', AUTRE: 'Autre' };
const Etabs = {
  f: { q: '', type: '', statut: '', dep: '', adh: '', offre: '' },
  offre(e, k) {
    const has = re => (e.prebac || []).some(x => re.test(x.f));
    return { cap: has(/^CAP/i), bacpro: has(/baccalaur[ée]at professionnel/i), bma: has(/m[ée]tiers d'art/i), cs: has(/sp[ée]cialisation/i), prepa: !!e.prepaMetiers, greta: !!e.greta, app: !!e.apprentissage, postbac: (e.postbac || []).length > 0 }[k];
  },
  compte() { const m = {}; D.personnes.forEach(p => { if (p.archive) return; P.uais(p).forEach(u => { m[u] = m[u] || { adh: 0, aj: 0, symp: 0 }; if (p.categorie === 'adherent') { m[u].adh++; if (P.cotis(p) === 'ajour') m[u].aj++; } else m[u].symp++; }); }); return m; },
  filtered() {
    const f = Etabs.f, q = norm(f.q), cnt = Etabs.compte();
    return D.etablissements.filter(e => (!f.type || (f.type === 'PRO' ? ['LP', 'SEP', 'LPO'].includes(e.type) || e.pro : e.type === f.type)) && (!f.statut || e.statut === f.statut) && (!f.dep || e.dep === f.dep) && (!f.offre || Etabs.offre(e, f.offre)) && (!f.adh || (cnt[e.uai] && (cnt[e.uai].adh || cnt[e.uai].symp))) && (!q || norm(e.nom + ' ' + e.ville + ' ' + e.uai).includes(q)))
      .sort((a, b) => (a.service ? 0 : 1) - (b.service ? 0 : 1) || (a.dep + a.ville + a.nom < b.dep + b.ville + b.nom ? -1 : 1));
  },
  filtres(cb) {
    const f = Etabs.f;
    return `<div class="toolbar"><input type="search" placeholder="Nom, ville, UAI…" value="${esc(f.q)}" oninput="Etabs.f.q=this.value;${cb}Deb()" style="flex:1;min-width:180px">
      <select onchange="Etabs.f.statut=this.value;${cb}()">${UI.opts([['Public', 'Public'], ['Privé', 'Privé']], f.statut, 'Public et privé')}</select>
      <select onchange="Etabs.f.type=this.value;${cb}()">${UI.opts([['PRO', 'Voie pro (LP, SEP, LPO)'], ...Object.entries(TYPES_ETAB)], f.type, 'Tous types')}</select>
      <select onchange="Etabs.f.dep=this.value;${cb}()">${UI.opts(Object.entries(REF.departements).map(([k, v]) => [k, k + ' ' + v]), f.dep, 'Tous départements')}</select>
      <select onchange="Etabs.f.offre=this.value;${cb}()">${UI.opts([['cap', 'Propose un CAP'], ['bacpro', 'Propose un bac pro'], ['bma', 'Brevet des métiers d\'art'], ['cs', 'Certificat de spécialisation'], ['prepa', '3e prépa-métiers'], ['app', 'Apprentissage'], ['greta', 'GRETA'], ['postbac', 'Post-bac (BTS, CPGE…)']], f.offre, 'Toute offre de formation')}</select>
      <label class="chk"><input type="checkbox" ${f.adh ? 'checked' : ''} onchange="Etabs.f.adh=this.checked?'1':'';${cb}()"> avec adhérents / sympathisants</label></div>`;
  },
  page() {
    const ed = can('adm.params');
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Établissements & services</h1><div class="mut small">${D.etablissements.length} lieux : lycées de l'académie (ONISEP, formations post-bac Parcoursup 2026), rectorat et DSDEN.</div></div>
      <div class="actions"><a class="btn sec" href="#/carte">🗺 Carte</a>${ed ? `<button class="btn" onclick="Etabs.annuaire()">⇩ Collèges, SEGPA, EREA (annuaire officiel)</button><button class="btn sec" onclick="Etabs.edit()">+ Ajouter</button><button class="btn sec" onclick="Etabs.importer()">⇪ Importer une liste</button>` : ''}</div></div>
      <div class="card noprint">${Etabs.filtres('Etabs.renderList')}</div><div id="etlist"></div>`;
    Etabs.renderList();
  },
  renderListDeb: debounce(() => Etabs.renderList(), 200),
  renderList() {
    const l = Etabs.filtered(), cnt = Etabs.compte();
    $('#etlist').innerHTML = `<p class="small">${plural(l.length, 'lieu')} · ${l.filter(e => e.statut === 'Public').length} public(s), ${l.filter(e => e.statut === 'Privé').length} privé(s)</p><div class="tablewrap"><table><thead><tr><th>Établissement</th><th>Type</th><th>Statut</th><th>Ville</th><th>Dép.</th><th class="num">Adhérents (à jour)</th><th class="num">Sympath.</th></tr></thead><tbody>
      ${l.map(e => { const c = cnt[e.uai] || {}; return `<tr class="click" onclick="Etabs.voir('${esc(e.uai)}')"><td><b>${esc(e.nom)}</b><div class="small mut">${esc(e.service ? '' : e.uai)}</div></td><td><span class="tag ${e.service ? 'ko' : ['LP', 'SEP', 'EREA'].includes(e.type) || e.segpa ? 'w' : ''}">${esc(e.type || '')}${e.segpa ? ' + SEGPA' : ''}${e.ulis ? ' + ULIS' : ''}</span></td><td>${e.statut === 'Privé' ? '<span class="tag v">Privé</span>' : esc(e.statut || '')}</td><td>${esc(e.ville || '')}</td><td>${esc(e.dep || '')}</td><td class="num">${c.adh ? c.adh + ' (' + c.aj + ')' : ''}</td><td class="num">${c.symp || ''}</td></tr>`; }).join('')}</tbody></table></div>`;
  },
  voir(uai) {
    const e = D.etablissements.find(x => x.uai === uai); if (!e) return;
    const ps = P.visibles().filter(p => P.uais(p).includes(uai));
    UI.modal(e.nom, `<div class="kv"><div>Type</div><div>${esc(TYPES_ETAB[e.type] || e.type || '')}${e.segpa ? ' avec SEGPA' : ''}${e.ulis ? ' · ULIS' : ''} — <b>${esc(e.statut || '')}</b></div>${e.service ? '' : `<div>UAI</div><div>${esc(e.uai)}</div>`}<div>Adresse</div><div>${esc([e.adresse, e.cp, e.ville].filter(Boolean).join(', '))}</div>
      ${e.tel ? `<div>Téléphone</div><div><a href="tel:${esc(phoneIntl(e.tel))}">${esc(e.tel)}</a></div>` : ''}${e.mail ? `<div>Courriel</div><div><a href="mailto:${esc(e.mail)}">${esc(e.mail)}</a></div>` : ''}${e.site ? `<div>Site</div><div><a href="${esc(e.site)}" target="_blank" rel="noopener">${esc(e.site)}</a></div>` : ''}${e.onisep ? `<div>ONISEP</div><div><a href="${esc(e.onisep)}" target="_blank" rel="noopener">fiche ONISEP</a></div>` : ''}
      ${e.service || ['CLG', 'SEGPA', 'EREA'].includes(e.type) ? '' : `<div>Voie professionnelle</div><div>${e.pro ? 'oui' : 'non'}${e.apprentissage ? ' · apprentissage' : ''}</div>`}${e.ep ? `<div>Éducation prioritaire</div><div><b>${esc(e.ep)}</b></div>` : ''}${e.internat ? '<div>Internat</div><div>oui</div>' : ''}</div>
      ${e.service || !(e.prebac || []).length && !e.options ? '' : `<h3>Formations pré-bac</h3><div>${['prepaMetiers', 'greta', 'apprentissage'].filter(k => e[k]).map(k => `<span class="tag w">${{ prepaMetiers: '3e prépa-métiers', greta: 'GRETA', apprentissage: 'Apprentissage' }[k]}</span>`).join(' ')}</div>${(e.prebac || []).map(x => `<div class="small">• ${x.lien ? `<a href="${esc(x.lien)}" target="_blank" rel="noopener">${esc(x.f)}</a>` : esc(x.f)}${x.d ? ' : ' + esc(x.d) : ''}</div>`).join('')}${e.options ? `<p class="small mut"><b>Enseignements optionnels et langues :</b> ${esc(e.options)}</p>` : ''}`}
      ${e.postbac && e.postbac.length ? `<h3>Formations post-bac (Parcoursup 2026)</h3>${e.postbac.map(f => `<div class="small">• ${f.lien ? `<a href="${esc(f.lien)}" target="_blank" rel="noopener">${esc(f.f)}</a>` : esc(f.f)}${f.app ? ' <span class="tag">apprentissage</span>' : ''}</div>`).join('')}` : ''}
      <h3>Délégué·e(s) S1</h3>${Mandats.s1(uai).map(x => `<div><a href="#/fiche/${x.p.id}" onclick="UI.close()"><b>${esc(P.full(x.p))}</b></a> <span class="small mut">${esc(Mandats.type(x.m.type)[1])} ${esc(x.p.telPortable || '')}</span></div>`).join('') || `<p class="small" style="color:var(--bord)">Aucun délégué ${can('adh.modifier') ? `<button class="btn sm sec" onclick="UI.close();Mandats.designer({type:'S1',uai:'${esc(uai)}'})">Désigner</button>` : ''}</p>`}
      <h3>Nos contacts (${ps.length})</h3>${ps.map(p => `<div class="small"><a href="#/fiche/${p.id}" onclick="UI.close()">${esc(P.full(p))}</a> ${P.cotisTag(p)} <span class="mut">${esc(p.discipline || '')}</span></div>`).join('') || '<p class="mut small">Aucun</p>'}`,
      [{ label: 'Fermer' }, ...(can('adm.params') ? [{ label: 'Modifier', onClick: () => { setTimeout(() => Etabs.edit(uai), 30); } }] : []), { label: '🗺 Voir sur la carte', onClick: () => { Carte.focus = uai; App.go('carte'); } }], { wide: true });
  },
  /* Annuaire de l'Éducation nationale (open data officiel) : collèges, SEGPA, EREA, services, coordonnées GPS */
  async annuaire() {
    const base = 'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/exports/json';
    const acad = D.meta.syndicat.academie || 'Orléans-Tours';
    const inconnus = Array.from(new Set(D.personnes.flatMap(P.uais))).filter(u => /^\d{7}[A-Z]$/.test(u) && !D.etablissements.some(e => e.uai === u));
    UI.toast('Interrogation de l\'annuaire de l\'Éducation nationale…');
    const get = async url => { const r = await fetch(url); if (!r.ok) throw new Error('réponse ' + r.status); return r.json(); };
    let rows = [];
    try {
      rows = await get(base + '?where=' + encodeURIComponent('type_etablissement!="Ecole"') + '&refine=' + encodeURIComponent('libelle_academie:"' + acad + '"'));
      for (let i = 0; i < inconnus.length; i += 40) {
        const lot = inconnus.slice(i, i + 40).filter(u => !rows.some(r => Etabs._g(r, 'identifiant_de_l_etablissement') === u));
        if (lot.length) rows = rows.concat(await get(base + '?where=' + encodeURIComponent('identifiant_de_l_etablissement in (' + lot.map(u => '"' + u + '"').join(',') + ')')));
      }
    } catch (e) {
      return UI.modal('Annuaire indisponible', `<p>Impossible de joindre l'annuaire en ligne (${esc(e.message)}). Vérifie la connexion internet.</p><p>Autre solution : télécharge le fichier sur <a href="https://data.education.gouv.fr/explore/dataset/fr-en-annuaire-education/export/?refine.libelle_academie=${encodeURIComponent(acad)}" target="_blank" rel="noopener">data.education.gouv.fr</a> (export CSV), puis « Importer une liste ».</p>`, [{ label: 'OK' }]);
    }
    const res = Etabs.integrerAnnuaire(rows);
    UI.modal('Annuaire de l\'Éducation nationale', `<p>${rows.length} établissements lus : <b>${res.ajoutes}</b> ajoutés (dont ${res.clg} collèges, ${res.segpa} avec SEGPA, ${res.erea} EREA), ${res.maj} complétés (coordonnées GPS, téléphone…).</p>${inconnus.length ? `<p class="small">${inconnus.length - res.restants} des ${inconnus.length} codes UAI de ton fichier qui étaient inconnus ont été identifiés${res.restants ? ` ; ${res.restants} restent inconnus (établissements fermés ou hors annuaire)` : ''}.</p>` : ''}`, [{ label: 'OK' }]);
    App.route();
  },
  _g(r, k) { if (r[k] != null) return r[k]; const kk = Object.keys(r).find(x => norm(x) === norm(k)); return kk ? r[kk] : ''; },
  integrerAnnuaire(rows) {
    const g = Etabs._g; let ajoutes = 0, maj = 0, clg = 0, segpa = 0, erea = 0;
    rows.forEach(r => {
      const uai = normUAI(g(r, 'identifiant_de_l_etablissement')); if (!/^\d{7}[A-Z]$/.test(uai)) return;
      const t = norm(g(r, 'type_etablissement'));
      const type = /college/.test(t) ? 'CLG' : /erea/.test(t) ? 'EREA' : /lycee/.test(t) ? 'LYC' : /administratif/.test(t) ? 'ADM' : /orientation/.test(t) ? 'CIO' : 'AUTRE';
      const lat = parseFloat(g(r, 'latitude')), lon = parseFloat(g(r, 'longitude'));
      const o = { uai, nom: String(g(r, 'nom_etablissement') || uai).trim(), statut: /priv/i.test(g(r, 'statut_public_prive')) ? 'Privé' : 'Public', adresse: String(g(r, 'adresse_1') || '').trim(), cp: normCP(g(r, 'code_postal')), ville: String(g(r, 'nom_commune') || '').toUpperCase(), dep: String(g(r, 'code_departement') || '').replace(/^0/, '').slice(-2) || depFromUAI(uai), tel: normPhone(g(r, 'telephone')), mail: String(g(r, 'mail') || ''), segpa: String(g(r, 'segpa')) === '1', ulis: String(g(r, 'ulis')) === '1', source: 'Annuaire de l\'Éducation nationale' };
      const x = D.etablissements.find(e => e.uai === uai);
      if (x) { ['adresse', 'cp', 'ville', 'tel', 'mail'].forEach(k => { if (!x[k] && o[k]) x[k] = o[k]; }); if (!isNaN(lat) && !x.lat) { x.lat = lat; x.lon = lon; } x.segpa = x.segpa || o.segpa; x.ulis = x.ulis || o.ulis; maj++; }
      else { o.type = type; if (!isNaN(lat)) { o.lat = lat; o.lon = lon; } D.etablissements.push(o); ajoutes++; if (type === 'CLG') clg++; if (o.segpa) segpa++; if (type === 'EREA') erea++; }
    });
    // compléter les affectations des fiches (nom et ville de l'établissement)
    D.personnes.forEach(p => p.affectations.forEach(a => { const e = a.uai && D.etablissements.find(x => x.uai === a.uai); if (e) { if (!a.nom) a.nom = e.nom; if (!a.ville) a.ville = e.ville; } }));
    const restants = Array.from(new Set(D.personnes.flatMap(P.uais))).filter(u => /^\d{7}[A-Z]$/.test(u) && !D.etablissements.some(e => e.uai === u)).length;
    D.meta.annuaire = nowISO(); save(); log('Annuaire de l\'Éducation nationale', ajoutes + ' ajoutés, ' + maj + ' complétés');
    return { ajoutes, maj, clg, segpa, erea, restants };
  },
  edit(uai) {
    const e = uai ? D.etablissements.find(x => x.uai === uai) : { statut: 'Public', type: 'LP' };
    UI.modal(uai ? 'Modifier' : 'Nouvel établissement / lieu', `<div class="frow"><div class="f"><label>UAI (RNE) ou identifiant</label><input id="et_u" value="${esc(e.uai || '')}" ${uai ? 'disabled' : ''}></div><div class="f" style="grid-column:span 2"><label>Nom</label><input id="et_n" value="${esc(e.nom || '')}"></div></div>
      <div class="frow"><div class="f"><label>Type</label><select id="et_t">${UI.opts(Object.entries(TYPES_ETAB), e.type)}</select></div><div class="f"><label>Statut</label><select id="et_s">${UI.opts(['Public', 'Privé'], e.statut)}</select></div><div class="f"><label>Téléphone</label><input id="et_tel" value="${esc(e.tel || '')}"></div><div class="f"><label>Courriel</label><input id="et_m" value="${esc(e.mail || '')}"></div></div>
      <div class="frow"><div class="f" style="grid-column:span 2"><label>Adresse</label><input id="et_a" value="${esc(e.adresse || '')}"></div><div class="f"><label>CP</label><input id="et_cp" value="${esc(e.cp || '')}"></div><div class="f"><label>Ville</label><input id="et_v" value="${esc(e.ville || '')}"></div></div>`,
      [{ label: 'Annuler' }, {
        label: 'Enregistrer', onClick: m => {
          const u = uai || normUAI(m.querySelector('#et_u').value) || 'LIEU-' + uid(); if (!uai && D.etablissements.some(x => x.uai === u)) { UI.toast('Cet identifiant existe déjà', 'r'); return false; }
          Object.assign(e, { uai: u, nom: m.querySelector('#et_n').value.trim(), type: m.querySelector('#et_t').value, statut: m.querySelector('#et_s').value, tel: m.querySelector('#et_tel').value, mail: m.querySelector('#et_m').value, adresse: m.querySelector('#et_a').value, cp: normCP(m.querySelector('#et_cp').value), ville: m.querySelector('#et_v').value.toUpperCase(), manuel: true });
          e.dep = e.dep || depFromUAI(u) || depFromCP(e.cp); delete e.lat; delete e.lon;
          if (!uai) D.etablissements.push(e); save(); App.route();
        }
      }], { wide: true });
  },
  importer() {
    Mapper.open({
      titre: 'Liste d\'établissements — colonnes', profil: 'etabs', fields: [['uai', 'UAI / RNE', ['identifiant de l etablissement', 'uai', 'rne', 'code uai', 'numero uai']], ['nom', 'Nom', ['etablissement', 'nom', 'appellation officielle', 'nom etablissement', 'denomination']], ['type', 'Type', ['type', 'nature', 'type nature', 'type etablissement']], ['statut', 'Public / privé', ['statut', 'secteur', 'statut public prive', 'public prive']], ['adresse', 'Adresse', ['adresse', 'adresse 1']], ['cp', 'Code postal', ['code postal', 'cp']], ['ville', 'Commune', ['nom commune', 'commune', 'ville', 'localite']], ['tel', 'Téléphone', ['telephone', 'tel']], ['mail', 'Courriel', ['courriel', 'mail', 'email']], ['lat', 'Latitude', ['latitude', 'lat']], ['lon', 'Longitude', ['longitude', 'lon', 'lng']], ['segpa', 'SEGPA (1/0)', ['segpa']]],
      onDone: rows => {
        let n = 0, m = 0;
        rows.forEach(r => {
          const u = normUAI(r.uai); if (!/^\d{7}[A-Z]$/.test(u)) return;
          const t = String(r.type || '').toUpperCase(); const type = /SECTION D ENS.*PRO|^SEP/.test(t) ? 'SEP' : /PROFESSIONNEL|^LP$/.test(t) ? 'LP' : /POLYVALENT|^LPO/.test(t) ? 'LPO' : /SECTION.*GEN|^SGT/.test(t) ? 'SGT' : /GENERAL ET TECH|^LGT/.test(t) ? 'LGT' : /COLLEGE|^CLG/.test(t) ? 'CLG' : /EREA/.test(t) ? 'EREA' : /LYCEE.*GENERAL|^LG$/.test(t) ? 'LG' : (t.slice(0, 6) || 'AUTRE');
          const o = { uai: u, nom: String(r.nom || u).trim(), type: /^COLL/.test(t) ? 'CLG' : type, statut: /priv/i.test(r.statut) ? 'Privé' : 'Public', adresse: r.adresse || '', cp: normCP(r.cp), ville: String(r.ville || '').toUpperCase(), tel: normPhone(r.tel), mail: r.mail || '', dep: depFromUAI(u), segpa: String(r.segpa) === '1' || /oui/i.test(r.segpa || '') };
          if (!isNaN(parseFloat(r.lat)) && !isNaN(parseFloat(r.lon))) { o.lat = parseFloat(r.lat); o.lon = parseFloat(r.lon); }
          const x = D.etablissements.find(e => e.uai === u); if (x) { if (x.type && x.type !== 'AUTRE') delete o.type; Object.assign(x, o); m++; } else { D.etablissements.push(o); n++; }
        });
        save(); log('Import établissements', n + ' ajoutés, ' + m + ' mis à jour'); UI.toast(`${n} ajoutés, ${m} mis à jour`, 'g'); App.route();
      }
    });
  }
};
App.routes.etabs = () => Etabs.page();

/* ---------- Cartographie ---------- */
const Carte = {
  map: null, layer: null, focus: null, trajet: { a: null, b: null },
  couleur(e) { return e.service ? '#8c1c2c' : ['LP', 'SEP'].includes(e.type) ? '#e87400' : e.type === 'LPO' ? '#5f1a87' : '#1b2a4a'; },
  page() {
    const sansGeo = D.etablissements.filter(e => !e.lat).length;
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Cartographie</h1><div class="mut small">Lycées publics (pastille pleine) et privés (pastille creuse), rectorat et DSDEN. Taille = nombre de nos contacts.</div></div>
      <div class="actions">${sansGeo ? `<button class="btn" onclick="Carte.localiser()">📍 Localiser ${sansGeo} lieu(x) (internet)</button>` : ''}<a class="btn sec" href="#/etabs">Liste</a></div></div>
      <div class="card noprint" style="padding:.6rem">${Etabs.filtres('Carte.draw')}
      <div class="small"><span class="dot" style="background:#e87400"></span>LP / SEP <span class="dot" style="background:#5f1a87"></span>Lycée polyvalent <span class="dot" style="background:#1b2a4a"></span>LGT / LG / SGT <span class="dot" style="background:#8c1c2c"></span>Rectorat / DSDEN · <span class="dot" style="background:#fff;border:2px solid #1b2a4a"></span>privé</div></div>
      <div id="trajet" class="alert small noprint" style="display:none"></div>
      <div id="map" style="height:68vh;border-radius:10px;border:1px solid var(--line)"></div>
      <p class="small mut">Fond de carte : Plan IGN (Géoplateforme) ou CARTO / OpenStreetMap, au choix en haut à droite de la carte. Connexion internet nécessaire.</p>`;
    if (!window.L) { $('#map').innerHTML = '<div class="alert r">Bibliothèque cartographique non chargée.</div>'; return; }
    Carte.map = L.map('map').setView([47.4, 1.6], 8);
    // Fonds de carte utilisables depuis un fichier local (OpenStreetMap refuse les pages ouvertes hors site internet)
    const ign = L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', { maxZoom: 18, attribution: '© IGN – Géoplateforme' });
    const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', { maxZoom: 19, subdomains: 'abcd', attribution: '© OpenStreetMap © CARTO' });
    const fonds = { 'Plan IGN': ign, 'Carte CARTO (OpenStreetMap)': carto };
    if (/^https?:/.test(location.protocol)) fonds['OpenStreetMap'] = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' });
    const choix = fonds[localStorage.getItem('snetaa-fond')] || ign; choix.addTo(Carte.map);
    L.control.layers(fonds, null, { position: 'topright' }).addTo(Carte.map);
    Carte.map.on('baselayerchange', e => { try { localStorage.setItem('snetaa-fond', e.name); } catch (x) { } });
    Carte.layer = L.layerGroup().addTo(Carte.map);
    Carte.draw(); Carte.majTrajet();
  },
  drawDeb: debounce(() => Carte.draw(), 250),
  draw() {
    if (!Carte.layer) return; Carte.layer.clearLayers();
    const cnt = Etabs.compte(); const pts = [];
    Etabs.filtered().filter(e => e.lat).forEach(e => {
      const c = cnt[e.uai] || {}; const n = (c.adh || 0) + (c.symp || 0); const col = Carte.couleur(e);
      const mk = L.circleMarker([e.lat, e.lon], { radius: e.service ? 9 : 5 + Math.min(12, Math.sqrt(n) * 2.5), color: col, weight: 2, fillColor: col, fillOpacity: e.statut === 'Privé' ? 0.08 : 0.75 });
      mk.bindPopup(`<b>${esc(e.nom)}</b><br>${esc(TYPES_ETAB[e.type] || e.type || '')} — ${esc(e.statut || '')}<br>${esc([e.adresse, e.cp, e.ville].filter(Boolean).join(', '))}${e.tel ? '<br>☎ ' + esc(e.tel) : ''}<br>${Mandats.s1(e.uai).length ? 'S1 : <b>' + Mandats.s1(e.uai).map(x => esc(P.full(x.p))).join(', ') + '</b><br>' : ''}${c.adh ? `<b>${c.adh}</b> adhérent(s) dont ${c.aj} à jour<br>` : ''}${c.symp ? `<b>${c.symp}</b> sympathisant(s)<br>` : ''}
        <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap"><button class="btn sm sec" onclick="Etabs.voir('${esc(e.uai)}')">Fiche</button><button class="btn sm sec" onclick="Carte.setTrajet('a','${esc(e.uai)}')">Départ</button><button class="btn sm sec" onclick="Carte.setTrajet('b','${esc(e.uai)}')">Arrivée</button></div>`);
      mk.addTo(Carte.layer); pts.push([e.lat, e.lon]);
      if (Carte.focus === e.uai) { setTimeout(() => { Carte.map.setView([e.lat, e.lon], 13); mk.openPopup(); }, 100); }
    });
    if (pts.length && !Carte.focus) Carte.map.fitBounds(pts, { padding: [20, 20], maxZoom: 12 });
    Carte.focus = null;
  },
  async localiser() {
    const l = D.etablissements.filter(e => !e.lat); let ok = 0, ko = 0;
    UI.toast('Localisation de ' + l.length + ' lieux…');
    for (const e of l) {
      try { const g = await Geo.geocode([e.adresse, e.cp, e.ville].filter(Boolean).join(' ') || e.nom + ' ' + e.ville); e.lat = g.lat; e.lon = g.lon; ok++; }
      catch (err) { try { const g = await Geo.geocode(e.ville + ' ' + (e.cp || '')); e.lat = g.lat; e.lon = g.lon; e.geoApprox = true; ok++; } catch (e2) { ko++; } }
      if ((ok + ko) % 20 === 0) UI.toast(`${ok + ko} / ${l.length}…`);
      await new Promise(r => setTimeout(r, 60));
    }
    save(); UI.toast(`${ok} lieux localisés${ko ? ', ' + ko + ' introuvables' : ''}`, ko ? 'r' : 'g'); App.route();
  },
  setTrajet(k, uai) { Carte.trajet[k] = uai; Carte.majTrajet(); },
  async majTrajet() {
    const box = $('#trajet'); if (!box) return; const t = Carte.trajet;
    if (!t.a && !t.b) { box.style.display = 'none'; return; }
    const ea = D.etablissements.find(e => e.uai === t.a), eb = D.etablissements.find(e => e.uai === t.b);
    box.style.display = '';
    box.innerHTML = `<b>Déplacement :</b> ${esc(ea ? ea.nom : (ME.adresse ? 'Domicile' : '—'))} → ${esc(eb ? eb.nom : '…')} <span id="trkm"></span> <button class="btn sm ghost" onclick="Carte.trajet={a:null,b:null};Carte.majTrajet()">effacer</button>`;
    if ((ea || ME.adresse) && eb) {
      const adr = e => [e.adresse, e.cp, e.ville].filter(Boolean).join(' ');
      try {
        const r = await Geo.distance(ea ? adr(ea) : ME.adresse, adr(eb));
        $('#trkm').innerHTML = ` : <b>${r.km} km</b> ${r.route ? '(route)' : '(estimation)'} — <button class="btn sm" onclick="Carte.versFrais(${r.km})">🧾 Déclarer ce déplacement</button>`;
      } catch (e) { $('#trkm').textContent = ' : distance indisponible (' + e.message + ')'; }
    }
  },
  versFrais(km) {
    const ea = D.etablissements.find(e => e.uai === Carte.trajet.a), eb = D.etablissements.find(e => e.uai === Carte.trajet.b);
    Frais.cur = { date: todayISO(), userId: ME.id, objet: 'Déplacement — ' + (eb ? eb.nom : ''), reunionId: '', lignes: [{ type: 'km', depart: ea ? ea.nom + ' — ' + ea.ville : 'Domicile de ' + ME.prenom + ' ' + ME.nom, arrivee: eb ? eb.nom + ' — ' + eb.ville : '', km, ar: true }], statut: 'brouillon', justifs: [] };
    Frais.renderEdit();
  }
};
App.routes.carte = () => Carte.page();

/* ---------- Utilisateurs & droits ---------- */
const Users = {
  page() {
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Utilisateurs & droits</h1><div class="mut small">Les droits sont accordés selon la fonction (S3, S2, S1, trésorier) : désigne la personne dans « Mandats », puis ouvre son accès dans l'onglet « Accès & droits » de sa fiche, où tu peux aussi ajuster ses droits.</div></div><div class="actions"><button class="btn sec" onclick="Users.edit()">+ Compte sans fiche</button></div></div>
      <div class="tablewrap"><table><thead><tr><th>Nom</th><th>Droits accordés par</th><th>Contact</th><th>Périmètre</th><th>Actif</th></tr></thead><tbody>${D.users.map(u => `<tr class="click" onclick="${u.pid ? `Adh.tab='acces';App.go('fiche/${u.pid}')` : `Users.edit('${u.id}')`}"><td><b>${esc(u.prenom + ' ' + u.nom)}</b>${u.id === ME.id ? ' <span class="tag">vous</span>' : ''}${u.pid ? '' : ' <span class="tag w" title="Compte non relié à une fiche : ses mandats ne lui donnent pas de droits">sans fiche</span>'}</td><td>${esc(Droits.libelle(u))}</td><td class="small">${esc([u.email, u.tel].filter(Boolean).join(' · '))}</td><td class="small">${esc([...Droits.perimetre(u).deps.map(d => 'dép. ' + d), Droits.perimetre(u).etabs.length ? (Droits.perimetre(u).etabs.length + ' établissement(s)') : ''].filter(Boolean).join(', ') || (Droits.perms(u).has('adh.voir_tout') ? 'tout' : 'ses contacts'))}</td><td>${u.actif !== false ? '✔' : '—'}</td></tr>`).join('')}</tbody></table></div>
      <h2>Rôles et droits</h2><p class="small mut">Coche les droits de chaque rôle. L'administrateur principal a toujours tous les droits.</p>
      <div class="tablewrap"><table><thead><tr><th>Droit</th>${Object.entries(D.roles).map(([k, r]) => `<th class="small" style="white-space:normal;min-width:90px">${esc(r.label)}</th>`).join('')}</tr></thead><tbody>
      ${PERMS.map(([k, l, g], i) => `${i === 0 || PERMS[i - 1][2] !== g ? `<tr><th colspan="${Object.keys(D.roles).length + 1}">${esc(g)}</th></tr>` : ''}<tr><td class="small">${esc(l)}</td>${Object.entries(D.roles).map(([rk, r]) => `<td style="text-align:center"><input type="checkbox" ${r.perms.includes(k) ? 'checked' : ''} ${r.locked ? 'disabled' : ''} onchange="Users.perm('${rk}','${k}',this.checked)"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p><button class="btn sec" onclick="Users.nouveauRole()">+ Nouveau rôle</button></p>`;
  },
  perm(r, k, on) { const p = D.roles[r].perms; if (on && !p.includes(k)) p.push(k); if (!on) D.roles[r].perms = p.filter(x => x !== k); save(); log('Droits modifiés', D.roles[r].label + ' : ' + k + (on ? ' +' : ' −')); },
  async nouveauRole() { const n = await UI.prompt('Nouveau rôle', 'Nom du rôle :'); if (!n) return; D.roles['r' + uid()] = { label: n, perms: ['adh.voir', 'vot.voir'] }; save(); App.route(); },
  edit(id) {
    const u = id ? D.users.find(x => x.id === id) : { prenom: '', nom: '', role: 'militant', actif: true, perimetre: { etabs: [], deps: [] } };
    u.perimetre = u.perimetre || { etabs: [], deps: [] };
    const self = id === ME.id;
    UI.modal(id ? 'Utilisateur' : 'Nouvel utilisateur', `<div class="frow"><div class="f"><label>Prénom</label><input id="u_p" value="${esc(u.prenom)}"></div><div class="f"><label>Nom</label><input id="u_n" value="${esc(u.nom)}"></div><div class="f"><label>Rôle</label><select id="u_r" ${self && u.role === 'admin' ? 'disabled' : ''}>${UI.opts(Object.entries(D.roles).map(([k, r]) => [k, r.label]), u.role)}</select></div></div>
      <div class="frow"><div class="f"><label>Courriel</label><input id="u_m" value="${esc(u.email || '')}"></div><div class="f"><label>Téléphone (utilisé dans les SMS types)</label><input id="u_t" value="${esc(u.tel || '')}"></div><div class="f" style="grid-column:span 2"><label>Adresse de départ (frais de déplacement)</label><input id="u_a" value="${esc(u.adresse || '')}"></div></div>
      <div class="f"><label>Périmètre : départements visibles (si le rôle ne voit pas tout le fichier)</label><div class="pill-select">${Object.entries(REF.departements).map(([k, v]) => `<button type="button" class="${u.perimetre.deps.includes(k) ? 'on' : ''}" data-dep="${k}" onclick="this.classList.toggle('on')">${k} ${v}</button>`).join('')}</div><p class="small mut">Les établissements suivis se règlent dans « Répartition militants ». Un militant voit toujours les personnes qui lui sont attribuées.</p></div>
      <div class="frow"><div class="f"><label>${id ? 'Nouveau code PIN (laisser vide pour ne pas changer)' : 'Code PIN provisoire (4 à 8 chiffres)'}</label><input id="u_pin" inputmode="numeric" type="password"></div><div class="f"><label class="chk"><input type="checkbox" id="u_act" ${u.actif !== false ? 'checked' : ''} ${self ? 'disabled' : ''}> Compte actif</label></div></div>`,
      [{ label: 'Annuler' }, {
        label: 'Enregistrer', onClick: async m => {
          const pin = m.querySelector('#u_pin').value.trim();
          if ((!id && !/^\d{4,8}$/.test(pin)) || (pin && !/^\d{4,8}$/.test(pin))) { UI.toast('PIN : 4 à 8 chiffres', 'r'); return false; }
          Object.assign(u, { prenom: m.querySelector('#u_p').value.trim(), nom: m.querySelector('#u_n').value.trim().toUpperCase(), email: m.querySelector('#u_m').value.trim(), tel: normPhone(m.querySelector('#u_t').value), adresse: m.querySelector('#u_a').value.trim(), actif: self ? true : m.querySelector('#u_act').checked });
          if (!(self && u.role === 'admin')) u.role = m.querySelector('#u_r').value;
          u.perimetre.deps = $$('[data-dep]', m).filter(b => b.classList.contains('on')).map(b => b.dataset.dep);
          if (pin) { u.salt = uid(); u.pin = await Auth.hashPin(pin, u.salt); }
          if (!id) { u.id = uid(); u.created = nowISO(); D.users.push(u); }
          save(); log(id ? 'Utilisateur modifié' : 'Utilisateur créé', u.prenom + ' ' + u.nom); if (self) UI.renderUser(); App.route();
        }
      }], { wide: true });
  }
};
App.routes.users = () => Users.page();

/* ---------- Paramètres ---------- */
const Params = {
  page() {
    const M = D.meta, s = M.syndicat;
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Paramètres</h1></div></div>
      <div class="grid g2"><div class="card"><h3 style="margin-top:0">Section</h3>
        <div class="frow"><div class="f"><label>Section</label><input value="${esc(s.section)}" onchange="D.meta.syndicat.section=this.value;save()"></div><div class="f"><label>Académie</label><select onchange="D.meta.syndicat.academie=this.value;save()">${UI.opts(REF.academies, s.academie)}</select></div></div>
        <div class="frow"><div class="f"><label>Courriel de la section</label><input value="${esc(s.mail)}" onchange="D.meta.syndicat.mail=this.value;save()"></div><div class="f"><label>Téléphone</label><input value="${esc(s.tel)}" onchange="D.meta.syndicat.tel=this.value;save()"></div></div>
        <div class="f"><label>Signature des mails</label><textarea onchange="D.meta.syndicat.signature=this.value;save()">${esc(s.signature)}</textarea></div></div>
      <div class="card"><h3 style="margin-top:0">Élections professionnelles</h3><div class="frow"><div class="f"><label>Ouverture du vote</label><input type="date" value="${esc(M.elections.debut)}" onchange="D.meta.elections.debut=this.value;save()"></div><div class="f"><label>Clôture</label><input type="date" value="${esc(M.elections.fin)}" onchange="D.meta.elections.fin=this.value;save()"></div></div>
        <h3>Frais et trésorerie</h3><div class="frow"><div class="f"><label>Barème kilométrique (€/km)</label><input inputmode="decimal" value="${esc(String(M.frais.tauxKm).replace('.', ','))}" onchange="D.meta.frais.tauxKm=num(this.value);save()"></div><div class="f"><label>Début d'exercice comptable</label><select onchange="D.meta.exerciceDebutMois=+this.value;save()">${UI.opts([[9, 'Septembre'], [1, 'Janvier']], M.exerciceDebutMois)}</select></div></div>
        <h3>Sécurité</h3><div class="f"><label>Verrouillage après inactivité (minutes, 0 = jamais)</label><input type="number" min="0" value="${M.lockMinutes}" onchange="D.meta.lockMinutes=+this.value;save()"></div></div></div>
      <div class="card"><h3 style="margin-top:0">Adresses pour les signalements</h3><div class="frow"><div class="f"><label>Courriel du national (mises à jour du fichier)</label><input value="${esc(M.mailNational)}" onchange="D.meta.mailNational=this.value.trim();save()" placeholder="à renseigner"></div><div class="f"><label>Copie systématique</label><input value="${esc(M.ccNational)}" onchange="D.meta.ccNational=this.value.trim();save()"></div></div>
        <details><summary>Courriels des sections académiques SNETAA-FO (changements d'académie)</summary><div class="frow" style="margin-top:.6rem">${REF.academies.filter(a => a !== s.academie).map(a => `<div class="f"><label>${esc(a)}</label><input value="${esc(M.mailsAcademies[a] || '')}" onchange="D.meta.mailsAcademies['${esc(a).replace(/'/g, "\\'")}']=this.value.trim();save()"></div>`).join('')}</div></details></div>
      ${Carriere.carte()}
      ${Scrutins.carte()}
      ${Liens.paramCarte()}
      <div class="card"><h3 style="margin-top:0">Disciplines (${D.disciplines.length})</h3><p class="small mut">Codes de la nomenclature de l'Éducation nationale (P = PLP, L = certifiés et agrégés). Ajoute ceux qui manquent.</p>
        <div class="toolbar"><input id="dc_c" placeholder="Code (ex. P4100)" style="width:130px"><input id="dc_l" placeholder="Libellé" style="flex:1"><button class="btn sm" onclick="Params.addDisc()">Ajouter</button></div>
        <div style="max-height:260px;overflow:auto;columns:2;font-size:.85rem">${D.disciplines.map((d, i) => `<div><b>${esc(d[0])}</b> ${esc(d[1])} <a href="#" onclick="D.disciplines.splice(${i},1);save();Params.page();return false" title="Retirer">✕</a></div>`).join('')}</div></div>
      <div class="card"><h3 style="margin-top:0">Modèles</h3><button class="btn sec" onclick="Params.resetModeles()">Ajouter les modèles de mails et SMS d'origine</button></div>`;
  },
  addDisc() { const c = $('#dc_c').value.trim().toUpperCase(), l = $('#dc_l').value.trim(); if (!c || !l) return; D.disciplines = D.disciplines.filter(d => d[0] !== c); D.disciplines.push([c, l]); D.disciplines.sort((a, b) => a[0] < b[0] ? -1 : 1); save(); Params.page(); },
  resetModeles() { const ids = new Set(D.modeles.map(m => m.id)); Comm.defaultModeles().forEach(m => { if (!ids.has(m.id)) D.modeles.push(m); }); save(); UI.toast('Modèles d\'origine ajoutés', 'g'); },
  sauvegarde() {
    const taille = new Blob([JSON.stringify(D)]).size;
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Sauvegarde</h1><div class="mut small">Dernière sauvegarde : ${D.meta.lastBackup ? fmtDT(D.meta.lastBackup) : 'jamais'} · volume des données : ${(taille / 1024 / 1024).toFixed(1)} Mo</div></div></div>
      <div class="alert w">Les données sont enregistrées <b>dans ce navigateur, sur cet appareil</b>. Si tu vides les données du navigateur ou changes d'ordinateur, seule une sauvegarde permet de tout retrouver. Fais-en une au moins chaque semaine et range-la en lieu sûr.</div>
      <div class="grid g2"><div class="card"><h3 style="margin-top:0">Sauvegarder</h3><div class="f"><label>Mot de passe de chiffrement (recommandé)</label><input id="bk_p" type="password" placeholder="laisser vide = fichier non chiffré"></div><button class="btn" onclick="Params.sauver()">💾 Télécharger la sauvegarde complète</button>
        <p><button class="btn sec" onclick="Params.exportExcel()">Exporter tout en Excel (lecture)</button></p></div>
      <div class="card"><h3 style="margin-top:0">Restaurer</h3><p class="small">Remplace <b>toutes</b> les données de cet appareil par celles d'une sauvegarde. Sert aussi à transférer l'application sur un autre ordinateur.</p><button class="btn red" onclick="Params.restaurer()">Restaurer une sauvegarde…</button></div></div>`;
  },
  async sauver() {
    const pass = $('#bk_p') ? $('#bk_p').value : '';
    D.meta.lastBackup = nowISO();
    const txt = pass && Crypto.ok() ? await Crypto.encrypt(D, pass) : JSON.stringify(D);
    download(`sauvegarde_SNETAA-FO_OT_${todayISO()}.snetaa`, txt, 'application/json');
    save(); log('Sauvegarde', pass ? 'chiffrée' : 'non chiffrée'); App.route();
  },
  async restaurerTexte(txt) {
    let o; try { o = JSON.parse(txt); } catch (e) { return UI.toast('Fichier illisible', 'r'); }
    if (o && o.snetaaEnc) { const pass = await UI.prompt('Sauvegarde chiffrée', 'Mot de passe de la sauvegarde :', '', 'password'); if (pass == null) return; try { o = await Crypto.decrypt(txt, pass); } catch (e) { return UI.toast('Mot de passe incorrect', 'r'); } }
    return Params._appliquer(o);
  },
  async restaurer() {
    const f = await pickFile('.snetaa,.json'); if (!f) return;
    return Params.restaurerTexte(await readFile(f, 'text'));
  },
  async _appliquer(o) {
    if (!o || !o.meta || !Array.isArray(o.personnes) || !Array.isArray(o.users)) return UI.toast('Ce fichier n\'est pas une sauvegarde de l\'application', 'r');
    if (D.users.length && !await UI.confirm(`Remplacer toutes les données actuelles par la sauvegarde du ${fmtDT(o.meta.lastBackup)} (${o.personnes.length} fiches) ?`, 'Restaurer')) return;
    D = o; migrate(); await _saveNow(); sessionStorage.removeItem('snetaa-session'); UI.toast('Sauvegarde restaurée : reconnecte-toi', 'g'); ME = null; Auth.render(); return true;
  },
  exportExcel() {
    exportXLSX('SNETAA-FO_OT_export_' + todayISO() + '.xlsx', {
      Personnes: D.personnes.map(Adh.row), Établissements: D.etablissements.map(e => ({ UAI: e.uai, Nom: e.nom, Type: e.type, Statut: e.statut, Adresse: e.adresse, CP: e.cp, Ville: e.ville, Téléphone: e.tel, Courriel: e.mail })),
      Réunions: D.reunions.map(r => ({ Date: fmtDate(r.date), Titre: r.titre, Type: r.type, Lieu: r.lieu, Inscrits: r.participants.length, Présents: r.participants.filter(x => x.statut === 'présent').length })),
      Frais: D.frais.map(f => ({ Date: fmtDate(f.date), Militant: userName(f.userId), Objet: f.objet, Montant: Frais.total(f), Statut: Frais.STATUTS[f.statut][0] })),
      Trésorerie: D.treso.ecritures.map(e => ({ Date: fmtDate(e.date), Libellé: e.libelle, Montant: num(e.montant), Catégorie: Treso.cat(e.categorieId).nom }))
    });
  },
  journal() {
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Journal des actions</h1><div class="mut small">${D.journal.length} entrées (les 3 000 dernières sont conservées)</div></div></div>
      <div class="tablewrap"><table><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Détail</th></tr></thead><tbody>${D.journal.slice(0, 1000).map(j => `<tr><td class="nowrap small">${fmtDT(j.d)}</td><td>${esc(userName(j.u))}</td><td>${esc(j.a)}</td><td class="small">${esc(j.x)}</td></tr>`).join('')}</tbody></table></div>`;
  },
  aide() {
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Aide & démarrage</h1></div></div>
      <div class="card"><h2 style="margin-top:0">Démarrer le cahier de votants ce soir</h2><ol>
        <li><a href="#/import">Import & assainissement</a> : sélectionne ensemble tes fichiers <i>Fichier_Adresses.xls</i> et <i>Fichier_Adresses_FO.xls</i>. Vérifie les colonnes, regarde l'onglet « Assainissement », puis applique.</li>
        <li>Le fichier national ne contient ni statut ni discipline : dans le <a href="#/adherents">fichier adhérents</a>, sélectionne (par exemple tous les collègues d'un LP) puis « Statut / discipline » pour compléter en une fois.</li>
        <li><a href="#/votants">Cahier de votants</a> → « Saisie rapide » pour entrer les sympathisants à la chaîne.</li>
        <li><a href="#/users">Utilisateurs</a> : crée les comptes des militants (rôle « Militant »), puis <a href="#/repartition">Répartition</a>.</li>
        <li>Du 3 au 10 décembre : <a href="#/emargement">Qui a voté ?</a> chaque matin, puis relances ciblées.</li></ol></div>
      <div class="card"><h2 style="margin-top:0">Où sont mes données ?</h2><p>Dans le navigateur de cet appareil (stockage local), jamais sur un serveur. Conséquences : 1) sauvegarde régulièrement (<a href="#/sauvegarde">Sauvegarde</a>) ; 2) un autre appareil ne voit pas les mêmes données — pour travailler à plusieurs, on échange des <b>paquets militants</b> chiffrés (Répartition) ou des sauvegardes.</p>
        <p>Ouvre toujours l'application <b>depuis le même dossier et avec le même navigateur</b> (Chrome, Edge ou Firefox) : les données sont rattachées à l'emplacement du fichier.</p></div>
      <div class="card"><h2 style="margin-top:0">Raccourci avec icône (Windows)</h2><p>Dans le dossier de l'application, double-clique sur <b>Creer-raccourci-Windows.cmd</b> : un raccourci « SNETAA-FO Orléans-Tours » avec l'icône dédiée est créé sur le bureau et dans le menu Démarrer. L'application s'ouvre alors dans sa propre fenêtre, sans barre d'adresse. Choisis le navigateur que tu utilises déjà (les données y sont enregistrées). Clic droit sur le raccourci → « Épingler à la barre des tâches ».</p>
        <p><b>Changer l'icône :</b> enregistre l'image choisie (carrée, 1024 × 1024 de préférence) sous <code>img\icone-source.png</code> en remplaçant l'ancienne, double-clique sur <b>Changer-icone-Windows.cmd</b>, puis relance <b>Creer-raccourci-Windows.cmd</b>.</p></div>
      <div class="card"><h2 style="margin-top:0">Installer l'application sur téléphone</h2>
        <p><b>Installation complète (ordinateur et téléphone, avec icône) :</b> l'application doit être servie par une adresse <code>https://</code>. Le dossier peut être déposé tel quel sur un hébergement statique (GitHub Pages par exemple) : seule l'application est en ligne, <b>les données restent sur chaque appareil</b>. Ensuite : sur Android/Chrome, menu ⋮ → « Installer l'application » ; sur iPhone/Safari, Partager → « Sur l'écran d'accueil ».</p></div>
      <div class="card"><h2 style="margin-top:0">Protection des données (RGPD)</h2><p class="small">L'appartenance syndicale est une donnée sensible. Bonnes pratiques intégrées : accès par code PIN et rôles, verrouillage automatique, paquets militants limités à leurs contacts et chiffrés, sauvegardes chiffrables, identifiants et mots de passe du fichier national jamais importés, journal des actions. À ta charge : choisir des PIN et mots de passe solides, ne pas laisser l'ordinateur ouvert, transmettre les mots de passe des paquets par un autre canal que le fichier.</p></div>`;
  }
};
App.routes.params = () => Params.page();
App.routes.journal = () => Params.journal();
App.routes.aide = () => Params.aide();
