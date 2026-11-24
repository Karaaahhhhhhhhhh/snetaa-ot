/* =========================================================
   Élections professionnelles : cahier de votants, répartition,
   paquets militants, listes de votants (émargement), bilan
   ========================================================= */
'use strict';
const Votants = {
  /* Les retraités ne votent pas aux élections professionnelles : ils sont exclus du cahier de votants */
  ep(p) { return !p.archive && p.statut !== 'RETR'; },
  vis() { return P.visibles().filter(Votants.ep); },
  f: { q: '', cat: '', int: '', mil: '', etab: '', dep: '', contact: '', vote: '', lim: 300 },
  lastContact(p) { const c = p.vote.contacts; return c.length ? c.reduce((a, b) => (a.date || '') > (b.date || '') ? a : b) : null; },
  filtered() {
    const f = Votants.f, q = norm(f.q);
    return Votants.vis().filter(p => {
      if (f.cat === 'ajour' && !(p.categorie === 'adherent' && P.cotis(p) === 'ajour')) return false;
      if (f.cat === 'nonajour' && !(p.categorie === 'adherent' && P.cotis(p) !== 'ajour')) return false;
      if (['sympathisant', 'contact'].includes(f.cat) && p.categorie !== f.cat) return false;
      if (f.int === '_vide' ? p.vote.intention : (f.int && p.vote.intention !== f.int)) return false;
      if (f.mil === '_none' ? p.militant : (f.mil && p.militant !== f.mil)) return false;
      if (f.etab && !P.uais(p).includes(f.etab) && P.etab(p) !== f.etab) return false;
      if (f.dep && P.dep(p) !== f.dep) return false;
      if (f.contact === 'oui' && !p.vote.contacts.length) return false;
      if (f.contact === 'non' && p.vote.contacts.length) return false;
      if (f.vote === 'oui' && !p.vote.aVote) return false;
      if (f.vote === 'non' && p.vote.aVote) return false;
      if (q && !norm([p.nom, p.prenom, P.etabs(p), p.discipline, p.email, p.telPortable].join(' ')).includes(q)) return false;
      return true;
    }).sort((a, b) => norm(P.etab(a) + P.full(a)) < norm(P.etab(b) + P.full(b)) ? -1 : 1);
  },
  etabOptions() {
    const m = new Map(); P.visibles().forEach(p => p.affectations.forEach(a => { const k = a.uai || a.nom; if (k && !m.has(k)) m.set(k, (a.nom || a.uai) + (a.ville ? ' (' + a.ville + ')' : '')); }));
    return Array.from(m.entries()).sort((a, b) => a[1] < b[1] ? -1 : 1);
  },
  setF(k, v) { Votants.f[k] = v; Votants.f.lim = 300; Votants.renderList(); },
  page() {
    const f = Votants.f;
    const paquet = D.meta.paquet;
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Cahier de votants</h1><div class="mut small">Élections professionnelles du ${fmtDate(D.meta.elections.debut)} au ${fmtDate(D.meta.elections.fin)}</div></div>
      <div class="actions">${can('vot.modifier') ? `<button class="btn" onclick="Votants.saisieRapide()">+ Saisie rapide d'un sympathisant</button>` : ''}
      <button class="btn sec" onclick="Votants.imprimer()">🖨 Imprimer le cahier</button>
      ${can('adh.exporter') ? `<button class="btn sec" onclick="Votants.exporter()">Exporter</button>` : ''}
      ${paquet ? `<button class="btn red" onclick="Votants.exporterRetour()">⇧ Renvoyer mon retour au responsable</button>` : ''}</div></div>
      ${paquet ? `<div class="alert">Paquet reçu le ${fmtDate(paquet.date)} de ${esc(paquet.de || 'la section')}. Quand tu as fait tes appels, clique sur « Renvoyer mon retour » et transmets le fichier obtenu.</div>` : ''}
      <p class="small mut noprint">Les adhérents retraités (${P.visibles().filter(p => p.statut === 'RETR').length}) ne votent pas aux élections professionnelles : ils n'apparaissent pas dans le cahier.</p>
      <div class="card noprint"><div class="toolbar">
        <input type="search" placeholder="Rechercher…" value="${esc(f.q)}" oninput="Votants.f.q=this.value;Votants.renderDeb()" style="flex:1;min-width:200px">
        <select onchange="Votants.setF('cat',this.value)">${UI.opts([['ajour', 'Adhérents à jour'], ['nonajour', 'Adhérents non à jour / anciens'], ['sympathisant', 'Sympathisants'], ['contact', 'Contacts']], f.cat, 'Tout le monde')}</select>
        <select onchange="Votants.setF('int',this.value)">${UI.opts(REF.intentions.filter(i => i[0]).map(i => [i[0], i[1]]), f.int, 'Toutes intentions')}<option value="_vide" ${f.int === '_vide' ? 'selected' : ''}>Non renseignée</option></select>
        <select onchange="Votants.setF('etab',this.value)" style="max-width:240px">${UI.opts(Votants.etabOptions(), f.etab, 'Tous établissements')}</select>
        <select onchange="Votants.setF('dep',this.value)">${UI.opts(Object.entries(REF.departements).map(([k, v]) => [k, k + ' ' + v]), f.dep, 'Tous dép.')}</select>
        ${can('adh.voir_tout') ? `<select onchange="Votants.setF('mil',this.value)">${UI.militantsOpts(f.mil, 'Tous militants')}<option value="_none" ${f.mil === '_none' ? 'selected' : ''}>Sans militant</option></select>` : ''}
        <select onchange="Votants.setF('contact',this.value)">${UI.opts([['oui', 'Déjà contactés'], ['non', 'Jamais contactés']], f.contact, 'Contactés ou non')}</select>
        <select onchange="Votants.setF('vote',this.value)">${UI.opts([['oui', 'A voté'], ['non', 'N\'a pas (encore) voté']], f.vote, 'Vote : tous')}</select>
      </div><div class="toolbar"><span id="selinfo" class="small mut"></span>
        ${can('com.envoyer') ? `<button class="btn sm sec" onclick="Comm.envoyerSelection(Votants.ids())">✉ Mail / SMS type</button>` : ''}
        ${can('vot.modifier') ? `<button class="btn sm sec" onclick="Votants.bulkIntention()">Intention de vote</button>` : ''}
        ${can('vot.repartir') ? `<button class="btn sm sec" onclick="UI.sel.size||Votants.ids().forEach(id=>UI.sel.add(id));Adh.bulkMilitant()">⚑ Attribuer un militant</button>` : ''}
      </div></div><div id="votlist"></div>`;
    Votants.renderList();
  },
  ids() { return UI.sel.size ? Array.from(UI.sel) : Votants.filtered().map(p => p.id); },
  renderDeb: debounce(() => Votants.renderList(), 200),
  renderList() {
    const l = Votants.filtered(), lim = Votants.f.lim;
    const nContact = l.filter(p => p.vote.contacts.length).length, nVote = l.filter(p => p.vote.aVote).length, nSur = l.filter(p => ['sur', 'probable'].includes(p.vote.intention)).length;
    const ed = can('vot.modifier');
    $('#votlist').innerHTML = `<p class="small"><b>${plural(l.length, 'personne')}</b> · ${nContact} contactée(s) · ${nSur} vote FO sûr ou probable · <b>${nVote} ont voté</b></p>
      <div class="tablewrap"><table><thead><tr><th><input type="checkbox" onclick="UI.selAll(Votants._ids,this.checked)"></th><th>Nom</th><th class="hide-m">Situation</th><th>Établissement</th><th>Intention de vote</th><th class="hide-m">Dernier contact</th><th class="hide-m">Militant</th><th>Voté</th><th></th></tr></thead><tbody>
      ${l.slice(0, lim).map(p => {
      const lc = Votants.lastContact(p), it = intention(p.vote.intention), tel = p.telPortable || p.telFixe;
      return `<tr><td><input type="checkbox" class="rowsel" ${UI.sel.has(p.id) ? 'checked' : ''} onchange="UI.selToggle('${p.id}',this.checked)"></td>
        <td><a href="#/fiche/${p.id}"><b>${esc(P.full(p))}</b></a><div class="small mut">${esc(p.discipline || STATUT(p.statut)[0] || '')}${tel ? ` · <a href="tel:${esc(phoneIntl(tel))}">${esc(tel)}</a>` : ''}</div></td>
        <td class="hide-m">${P.cotisTag(p)}</td><td class="small">${esc(P.etab(p))}</td>
        <td>${ed ? `<select style="border-left:6px solid ${it[2]};min-width:150px" onchange="Votants.setInt('${p.id}',this.value);this.style.borderLeftColor=intention(this.value)[2]">${UI.opts(REF.intentions.map(i => [i[0], i[1]]), p.vote.intention)}</select>` : `<span class="dot" style="background:${it[2]}"></span>${esc(it[1])}`}</td>
        <td class="small hide-m">${lc ? fmtDate(lc.date) + ' · ' + esc((REF.canaux.find(c => c[0] === lc.canal) || ['', ''])[1]) : '<span class="mut">—</span>'}</td>
        <td class="small hide-m">${esc(userName(p.militant))}</td>
        <td>${p.vote.aVote ? `<span class="tag ok" title="${fmtDate(p.vote.dateVote)}">✔ ${fmtDate(p.vote.dateVote).slice(0, 5)}</span>` : ''}</td>
        <td class="nowrap">${ed ? `<button class="btn sm sec" onclick="Votants.contact('${p.id}')">+ contact</button>` : ''}</td></tr>`;
    }).join('')}</tbody></table></div>${l.length > lim ? `<p><button class="btn sec" onclick="Votants.f.lim+=500;Votants.renderList()">Afficher plus (${l.length - lim})</button></p>` : ''}`;
    Votants._ids = l.slice(0, lim).map(p => p.id); UI.selInfo();
  },
  setInt(id, v) { const p = P.get(id); p.vote.intention = v; p.vote.intMaj = nowISO(); P.touch(p); },
  bulkIntention() {
    const ids = Votants.ids();
    UI.modal('Intention de vote', `<p>${plural(ids.length, 'personne')}.</p><select id="bi">${UI.opts(REF.intentions.map(i => [i[0], i[1]]), '')}</select>`, [{ label: 'Annuler' }, { label: 'Appliquer', onClick: m => { ids.forEach(id => Votants.setInt(id, m.querySelector('#bi').value)); App.route(); } }]);
  },
  contact(id) {
    const p = P.get(id);
    UI.modal('Contact avec ' + P.full(p), `<div class="frow"><div class="f"><label>Date</label><input type="date" id="vc_d" value="${todayISO()}"></div><div class="f"><label>Canal</label><select id="vc_c">${UI.opts(REF.canaux, 'tel')}</select></div><div class="f"><label>Intention de vote</label><select id="vc_i">${UI.opts(REF.intentions.map(i => [i[0], i[1]]), p.vote.intention)}</select></div></div>
      <div class="f"><label>Résultat / remarques</label><div class="pill-select" style="margin-bottom:.4rem">${['Pas de réponse, message laissé', 'Va voter FO', 'Besoin d\'aide pour voter (identifiants)', 'A déjà voté', 'À rappeler', 'Ne souhaite pas être contacté'].map(t => `<button type="button" onclick="document.getElementById('vc_r').value=this.textContent">${esc(t)}</button>`).join('')}</div><textarea id="vc_r"></textarea></div>
      <label class="chk"><input type="checkbox" id="vc_v" ${p.vote.aVote ? 'checked' : ''}> A déjà voté (déclaratif)</label>`,
      [{ label: 'Annuler' }, {
        label: 'Enregistrer', onClick: m => {
          p.vote.contacts.push({ id: uid(), date: m.querySelector('#vc_d').value, canal: m.querySelector('#vc_c').value, resultat: m.querySelector('#vc_r').value, par: ME.id });
          p.vote.intention = m.querySelector('#vc_i').value; p.vote.intMaj = nowISO();
          if (m.querySelector('#vc_v').checked && !p.vote.aVote) { p.vote.aVote = true; p.vote.dateVote = todayISO(); p.vote.sourceVote = 'déclaratif'; }
          P.touch(p); log('Contact élections', P.full(p)); App.route();
        }
      }]);
  },
  ficheVote(p) {
    const ed = can('vot.modifier');
    return `<div class="card"><div class="kv"><div>Intention de vote</div><div>${ed ? `<select style="max-width:260px" onchange="Votants.setInt('${p.id}',this.value)">${UI.opts(REF.intentions.map(i => [i[0], i[1]]), p.vote.intention)}</select>` : esc(intention(p.vote.intention)[1])}</div>
      <div>Militant référent</div><div>${can('vot.repartir') ? `<select style="max-width:260px" onchange="P.get('${p.id}').militant=this.value;P.touch(P.get('${p.id}'))">${UI.militantsOpts(p.militant, '—')}</select>` : esc(userName(p.militant))}</div>
      <div>Inscrit sur la liste électorale</div><div>${p.vote.electeur ? 'oui (' + fmtDate(p.vote.electeur) + ')' : '<span class="mut">non vérifié</span>'}</div>
      <div>A voté</div><div>${p.vote.aVote ? `<span class="tag ok">oui</span> le ${fmtDate(p.vote.dateVote)} <span class="small mut">(${esc(p.vote.sourceVote || '')})</span>` : 'pas encore'} ${ed ? `<button class="btn sm ghost" onclick="Votants.toggleVote('${p.id}')">${p.vote.aVote ? 'annuler' : 'marquer a voté'}</button>` : ''}</div></div>
      ${ed ? `<p><button class="btn" onclick="Votants.contact('${p.id}')">+ Noter un contact</button></p>` : ''}
      <h3>Contacts de campagne</h3>${p.vote.contacts.slice().reverse().map(c => `<div class="small" style="margin:.3rem 0"><b>${fmtDate(c.date)}</b> · ${esc((REF.canaux.find(x => x[0] === c.canal) || ['', c.canal])[1])} · ${esc(userName(c.par))} — ${esc(c.resultat || '')}</div>`).join('') || '<p class="mut">Aucun contact</p>'}</div>`;
  },
  toggleVote(id) { const p = P.get(id); p.vote.aVote = !p.vote.aVote; p.vote.dateVote = p.vote.aVote ? todayISO() : ''; p.vote.sourceVote = 'manuel'; P.touch(p); App.route(); },

  /* Saisie rapide (en chaîne) */
  saisieRapide() {
    const dl = `<datalist id="dl_vetab">${D.etablissements.map(e => `<option value="${esc(e.nom + ' — ' + (e.ville || '') + ' — ' + e.uai)}">`).join('')}${Votants.etabOptions().filter(e => !D.etablissements.some(x => x.uai === e[0])).map(e => `<option value="${esc(e[1])}">`).join('')}</datalist>`;
    const html = `${dl}<div class="frow"><div class="f"><label>Nom *</label><input id="sr_nom" autocomplete="off"></div><div class="f"><label>Prénom</label><input id="sr_prenom" autocomplete="off"></div><div class="f"><label>Catégorie</label><select id="sr_cat">${UI.opts([['sympathisant', 'Sympathisant'], ['contact', 'Contact'], ['adherent', 'Adhérent']], Votants._lastCat || 'sympathisant')}</select></div></div>
      <div class="frow"><div class="f"><label>Statut</label><select id="sr_st">${UI.opts(REF.statuts.map(s => [s[0], s[1]]), Votants._lastSt || 'PLP')}</select></div><div class="f"><label>Discipline</label><input id="sr_disc" list="dl_disc2" placeholder="code ou nom"><datalist id="dl_disc2">${D.disciplines.map(d => `<option value="${esc(d[0])}">${esc(d[1])}</option>`).join('')}</datalist></div>
      <div class="f" style="grid-column:span 2"><label>Établissement</label><input id="sr_etab" list="dl_vetab" value="${esc(Votants._lastEtab || '')}"></div></div>
      <div class="frow"><div class="f"><label>Portable</label><input id="sr_tel" inputmode="tel"></div><div class="f"><label>Courriel</label><input id="sr_mail" type="email"></div><div class="f"><label>Intention de vote</label><select id="sr_int">${UI.opts(REF.intentions.map(i => [i[0], i[1]]), '')}</select></div><div class="f"><label>Militant</label><select id="sr_mil">${UI.militantsOpts(Votants._lastMil || ME.id, '—')}</select></div></div>
      <div class="f"><label>Remarque</label><input id="sr_note"></div><div id="sr_warn"></div><p class="small mut" id="sr_count"></p>`;
    UI.modal('Saisie rapide', html, [{ label: 'Fermer' }, { label: 'Enregistrer et fermer', onClick: m => Votants.srSave(m, false) }, { label: 'Enregistrer et suivant ↵', onClick: m => Votants.srSave(m, true) }], { wide: true });
    $('#sr_nom').addEventListener('input', () => { const n = norm($('#sr_nom').value); const l = n.length > 2 ? D.personnes.filter(p => norm(p.nom) === n) : []; $('#sr_warn').innerHTML = l.length ? `<div class="alert w small">Déjà dans le fichier : ${l.slice(0, 5).map(p => `<a href="#/fiche/${p.id}" onclick="UI.close()">${esc(P.full(p))}</a> (${esc(P.etab(p))})`).join(', ')}</div>` : ''; });
  },
  srSave(m, next) {
    const g = s => m.querySelector(s).value.trim();
    if (!g('#sr_nom')) { UI.toast('Nom obligatoire', 'r'); return false; }
    const ev = g('#sr_etab'); let aff = [];
    if (ev) { const uai = (ev.match(/\b\d{7}[A-Z]\b/i) || [])[0]; const e = uai ? D.etablissements.find(x => x.uai === uai.toUpperCase()) : null; aff = [e ? { uai: e.uai, nom: e.nom, ville: e.ville, principal: true } : { uai: uai || '', nom: ev.split(' — ')[0].replace(/\s*\([^)]*\)\s*$/, ''), ville: ((ev.match(/\(([^)]*)\)\s*$/) || [])[1] || ''), principal: true }]; }
    const st = g('#sr_st');
    const p = P.nouveau({ categorie: g('#sr_cat'), nom: g('#sr_nom').toUpperCase(), prenom: cap(g('#sr_prenom')), statut: st, discipline: Import.discFromText(g('#sr_disc'), st) || g('#sr_disc').toUpperCase(), affectations: aff, telPortable: normPhone(g('#sr_tel')), email: normEmail(g('#sr_mail')), militant: g('#sr_mil'), notes: g('#sr_note'), ajoutManuel: g('#sr_cat') === 'adherent' });
    p.vote.intention = g('#sr_int');
    D.personnes.push(p); P.touch(p); log('Saisie rapide', P.full(p));
    Votants._lastEtab = ev; Votants._lastSt = st; Votants._lastMil = g('#sr_mil'); Votants._lastCat = g('#sr_cat');
    Votants._nSaisis = (Votants._nSaisis || 0) + 1;
    if (next) { ['#sr_nom', '#sr_prenom', '#sr_tel', '#sr_mail', '#sr_note', '#sr_disc'].forEach(s => m.querySelector(s).value = ''); m.querySelector('#sr_int').value = ''; $('#sr_warn').innerHTML = ''; $('#sr_count').textContent = Votants._nSaisis + ' fiche(s) saisie(s) dans cette série — dernière : ' + P.full(p); m.querySelector('#sr_nom').focus(); if ($('#votlist')) Votants.renderList(); return false; }
    App.route();
  },
  exporter() {
    exportXLSX('cahier_votants_' + todayISO() + '.xlsx', { 'Cahier de votants': Votants.filtered().map(p => { const lc = Votants.lastContact(p); return Object.assign(Adh.row(p), { 'Dernier contact': lc ? fmtDate(lc.date) + ' ' + (lc.resultat || '') : '', 'Nb contacts': p.vote.contacts.length, 'Date du vote': fmtDate(p.vote.dateVote) }); }) });
  },
  imprimer() {
    const l = Votants.filtered(); const groups = {};
    l.forEach(p => { const k = P.etab(p) || 'Sans établissement'; (groups[k] = groups[k] || []).push(p); });
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cahier de votants</title><style>body{font:10pt system-ui,Arial;margin:1cm}h1{font-size:14pt;color:#1b2a4a}h2{font-size:11pt;background:#e8edf6;padding:3px 6px;margin:14px 0 4px;color:#1b2a4a;page-break-after:avoid}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:3px 5px;font-size:9pt;text-align:left}th{background:#f2f2f2}.c{width:22px}img{height:40px}</style></head><body>
      <div style="display:flex;align-items:center;gap:12px"><img src="${new URL('img/logo-snetaa.png', location.href).href}"><h1>Cahier de votants — ${esc(D.meta.syndicat.academie)} — édité le ${fmtDate(todayISO())}</h1></div>
      ${Object.entries(groups).sort().map(([e, ps]) => `<h2>${esc(e)} (${ps.length})</h2><table><tr><th>Nom</th><th>Statut / disc.</th><th>Téléphone</th><th>Situation</th><th>Intention</th><th>Militant</th><th class="c">Contacté</th><th class="c">A voté</th></tr>${ps.map(p => `<tr><td><b>${esc(P.full(p))}</b></td><td>${esc(STATUT(p.statut)[0] + ' ' + (p.discipline || ''))}</td><td>${esc(p.telPortable || p.telFixe || '')}</td><td>${esc(p.categorie === 'adherent' ? ({ ajour: 'Adh. à jour', retard: 'Adh. à relancer', ancien: 'Ancien adh.', inconnu: 'Adhérent' }[P.cotis(p)]) : REF.categories[p.categorie])}</td><td>${esc(p.vote.intention ? intention(p.vote.intention)[1] : '')}</td><td>${esc(userName(p.militant))}</td><td class="c">${p.vote.contacts.length ? '✔' : '☐'}</td><td class="c">${p.vote.aVote ? '✔' : '☐'}</td></tr>`).join('')}</table>`).join('')}
      <script>setTimeout(()=>print(),400)<\/script></body></html>`);
    w.document.close();
  },

  /* ---------- Répartition entre militants & paquets ---------- */
  repartition() {
    const vis = P.visibles();
    const users = D.users.filter(u => u.actif !== false);
    const stat = uid => { const l = vis.filter(p => p.militant === uid); return [l.length, l.filter(p => p.vote.contacts.length).length, l.filter(p => ['sur', 'probable'].includes(p.vote.intention)).length, l.filter(p => p.vote.aVote).length]; };
    const sans = vis.filter(p => !p.militant);
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Répartition entre militants</h1><div class="mut small">Chaque militant contacte les personnes qui lui sont attribuées.</div></div>
      <div class="actions"><button class="btn" onclick="Droits.choisirMilitant()">+ Désigner un militant</button> <button class="btn sec" onclick="App.go('users')">Comptes et droits</button></div></div>
      <div class="tablewrap"><table><thead><tr><th>Militant</th><th>Établissements suivis</th><th class="num">Attribués</th><th class="num">Contactés</th><th class="num">FO sûr/probable</th><th class="num">Ont voté</th><th></th></tr></thead><tbody>
      ${users.map(u => { const s = stat(u.id); const et = Droits.perimetre(u).etabs; return `<tr><td><b>${esc(u.prenom + ' ' + u.nom)}</b><div class="small mut">${esc(Droits.libelle(u))}${u.tel ? ' · ' + esc(u.tel) : ''}</div></td><td class="small">${et.map(x => esc((D.etablissements.find(e => e.uai === x) || { nom: x }).nom)).join(', ') || '<span class="mut">—</span>'} <button class="btn sm ghost" onclick="Votants.etabsMilitant('${u.id}')">modifier</button></td><td class="num">${s[0]}</td><td class="num">${s[1]}</td><td class="num">${s[2]}</td><td class="num">${s[3]}</td><td class="nowrap"><button class="btn sm sec" onclick="Votants.filtreMil('${u.id}')">Voir</button> <button class="btn sm" onclick="Votants.exporterPaquet('${u.id}')">⇩ Paquet</button></td></tr>`; }).join('')}
      <tr><td><i>Sans militant</i></td><td></td><td class="num"><b>${sans.length}</b></td><td colspan="3"></td><td><button class="btn sm sec" onclick="Votants.filtreMil('_none')">Voir</button></td></tr></tbody></table></div>
      <div class="grid g2" style="margin-top:1rem"><div class="card"><h3 style="margin-top:0">Attribution automatique</h3>
        <p class="small">1) Indique pour chaque militant les établissements qu'il suit (bouton « modifier »). 2) Attribue d'un coup toutes les personnes <b>sans militant</b> de ces établissements.</p>
        <button class="btn" onclick="Votants.autoEtab()">Attribuer selon les établissements</button>
        <p class="small" style="margin-top:1rem">Ou répartir équitablement les personnes sans militant entre plusieurs militants (en gardant ensemble les collègues d'un même établissement) :</p>
        <button class="btn sec" onclick="Votants.autoEquitable()">Répartition équitable…</button></div>
      <div class="card"><h3 style="margin-top:0">Paquets militants (travail hors ligne)</h3>
        <p class="small">Le bouton « Paquet » crée un fichier qui ne contient <b>que les contacts du militant</b>, protégé par un mot de passe. Le militant l'ouvre dans l'application sur son téléphone ou son ordinateur (« Ouvrir un paquet militant » sur l'écran de connexion), fait ses appels, puis te renvoie son « retour ».</p>
        <button class="btn" onclick="Votants.importerRetour()">⇧ Intégrer un retour de militant</button></div></div>`;
  },
  filtreMil(id) { Votants.f = Object.assign({}, Votants.f, { mil: id, q: '', cat: '', int: '', etab: '', contact: '', vote: '' }); App.go('votants'); },
  etabsMilitant(uid) {
    const u = D.users.find(x => x.id === uid); u.perimetre = u.perimetre || { etabs: [], deps: [] };
    const opts = Votants.etabOptions();
    UI.modal('Établissements suivis par ' + u.prenom + ' ' + u.nom, `<input placeholder="Filtrer…" oninput="$$('.emil').forEach(l=>l.style.display=norm(l.textContent).includes(norm(this.value))?'':'none')"><div style="max-height:50vh;overflow:auto;margin-top:.5rem">${opts.map(([k, l]) => `<label class="chk emil"><input type="checkbox" value="${esc(k)}" ${u.perimetre.etabs.includes(k) ? 'checked' : ''}> ${esc(l)}</label>`).join('') || '<p class="mut">Aucun établissement : importe le fichier adhérents ou la liste des établissements.</p>'}</div>`,
      [{ label: 'Annuler' }, { label: 'Enregistrer', onClick: m => { u.perimetre.etabs = $$('.emil input', m).filter(c => c.checked).map(c => c.value); save(); App.route(); } }]);
  },
  autoEtab() {
    let n = 0;
    D.personnes.filter(p => !p.militant && !p.archive).forEach(p => {
      const u = D.users.find(u => u.actif !== false && Droits.perimetre(u).etabs.some(e => P.uais(p).includes(e) || P.etab(p) === e));
      if (u) { p.militant = u.id; n++; }
    });
    save(); log('Attribution automatique', n + ' personnes'); UI.toast(plural(n, 'personne') + ' attribuée(s)', 'g'); App.route();
  },
  autoEquitable() {
    UI.modal('Répartition équitable', `<p class="small">Les personnes sans militant seront réparties entre les militants cochés, établissement par établissement.</p>${D.users.filter(u => u.actif !== false).map(u => `<label class="chk"><input type="checkbox" class="aeq" value="${u.id}" ${u.role === 'militant' ? 'checked' : ''}> ${esc(u.prenom + ' ' + u.nom)}</label>`).join('')}`,
      [{ label: 'Annuler' }, {
        label: 'Répartir', onClick: m => {
          const us = $$('.aeq', m).filter(c => c.checked).map(c => c.value); if (!us.length) return false;
          const load = Object.fromEntries(us.map(u => [u, D.personnes.filter(p => p.militant === u).length]));
          const groups = {}; D.personnes.filter(p => !p.militant && !p.archive).forEach(p => { const k = P.etab(p) || '?'; (groups[k] = groups[k] || []).push(p); });
          Object.values(groups).sort((a, b) => b.length - a.length).forEach(g => { const u = us.reduce((a, b) => load[a] <= load[b] ? a : b); g.forEach(p => p.militant = u); load[u] += g.length; });
          save(); log('Répartition équitable'); App.route();
        }
      }]);
  },
  async exporterPaquet(uid) {
    const u = D.users.find(x => x.id === uid);
    const l = D.personnes.filter(p => p.militant === uid && !p.archive);
    if (!l.length) return UI.toast('Aucun contact attribué à ce militant', 'r');
    const pass = await UI.modal('Paquet pour ' + u.prenom + ' ' + u.nom, `<p>${plural(l.length, 'contact')}. Le fichier contient des données personnelles : protège-le par un mot de passe que tu communiqueras au militant <b>par un autre canal</b> (SMS, téléphone).</p><div class="f"><label>Mot de passe du paquet</label><input id="pk_p" type="text" value="${Math.random().toString(36).slice(2, 8)}"></div><label class="chk"><input type="checkbox" id="pk_h"> Inclure l'historique des interventions</label>`,
      [{ label: 'Annuler', value: null }, { label: 'Créer le paquet', onClick: m => ({ p: m.querySelector('#pk_p').value, h: m.querySelector('#pk_h').checked }) }]);
    if (!pass) return;
    const keep = ['id', 'civilite', 'nom', 'prenom', 'categorie', 'statut', 'discipline', 'affectations', 'email', 'emailInvalide', 'telPortable', 'telFixe', 'calendrier', 'cotisations', 'militant', 'vote', 'notes', 'academie'];
    const paquet = {
      type: 'paquet-militant', version: 1, date: nowISO(), de: ME.prenom + ' ' + ME.nom,
      militant: { id: u.id, prenom: u.prenom, nom: u.nom, email: u.email, tel: u.tel },
      personnes: l.map(p => { const o = {}; keep.forEach(k => o[k] = p[k]); if (pass.h) o.interventions = p.interventions; return o; }),
      modeles: D.modeles, meta: { syndicat: D.meta.syndicat, elections: D.meta.elections }, etablissements: D.etablissements.filter(e => l.some(p => P.uais(p).includes(e.uai))), disciplines: D.disciplines
    };
    const txt = pass.p && Crypto.ok() ? await Crypto.encrypt(paquet, pass.p) : JSON.stringify(paquet);
    download(`paquet_${norm(u.prenom + '_' + u.nom).replace(/ /g, '_')}_${todayISO()}.snetaa`, txt, 'application/json');
    log('Paquet militant exporté', u.prenom + ' ' + u.nom + ' (' + l.length + ')');
  },
  /* sur l'appareil du militant */
  async ouvrirPaquetDepuisLogin() {
    const f = await pickFile('.snetaa,.json'); if (!f) return;
    let pk; try { pk = await readJSONMaybeEncrypted(f); } catch (e) { return UI.toast(e.message, 'r'); }
    if (!pk || pk.type !== 'paquet-militant') return UI.toast('Ce fichier n\'est pas un paquet militant', 'r');
    const existing = D.users.find(u => u.id === pk.militant.id);
    if (D.users.length && !existing) { if (!await UI.confirm('Cette application contient déjà d\'autres données. Ajouter quand même le paquet ?', 'Ajouter')) return; }
    let user = existing;
    if (!user) {
      const pin = await UI.prompt('Bienvenue ' + pk.militant.prenom, 'Choisis un code PIN (4 à 8 chiffres) pour protéger l\'accès :', '', 'password');
      if (!pin || !/^\d{4,8}$/.test(pin)) return UI.toast('PIN invalide', 'r');
      const salt = uid(); user = Object.assign({}, pk.militant, { role: 'militant', salt, pin: await Auth.hashPin(pin, salt), actif: true, perimetre: { etabs: [], deps: [] } });
      D.users.push(user);
    }
    pk.personnes.forEach(np => { const p = P.get(np.id); if (p) { p.vote = np.vote; Object.assign(p, { email: np.email, telPortable: np.telPortable, affectations: np.affectations, militant: np.militant }); } else D.personnes.push(P.fix(np)); });
    if (!D.modeles.length || pk.modeles) D.modeles = pk.modeles || D.modeles;
    D.meta.syndicat = pk.meta.syndicat; D.meta.elections = pk.meta.elections; D.meta.paquet = { date: pk.date, de: pk.de };
    (pk.etablissements || []).forEach(e => { if (!D.etablissements.some(x => x.uai === e.uai)) D.etablissements.push(e); });
    if (pk.disciplines) D.disciplines = pk.disciplines;
    await _saveNow(); UI.toast('Paquet ouvert : ' + plural(pk.personnes.length, 'contact'), 'g'); Auth.render();
  },
  async exporterRetour() {
    const l = D.personnes.filter(p => p.militant === ME.id || p.created > (D.meta.paquet && D.meta.paquet.date || ''));
    const pass = await UI.prompt('Renvoyer mon retour', 'Mot de passe pour protéger le fichier (le même que celui du paquet, par exemple) :', '', 'text');
    if (pass == null) return;
    const ret = { type: 'retour-militant', version: 1, date: nowISO(), militant: { id: ME.id, prenom: ME.prenom, nom: ME.nom }, personnes: l.map(p => ({ id: p.id, nom: p.nom, prenom: p.prenom, civilite: p.civilite, categorie: p.categorie, statut: p.statut, discipline: p.discipline, affectations: p.affectations, email: p.email, telPortable: p.telPortable, telFixe: p.telFixe, notes: p.notes, vote: p.vote, interventions: p.interventions, messages: p.messages, created: p.created, localEdits: p.localEdits })) };
    const txt = pass && Crypto.ok() ? await Crypto.encrypt(ret, pass) : JSON.stringify(ret);
    download(`retour_${norm(ME.prenom + '_' + ME.nom).replace(/ /g, '_')}_${todayISO()}.snetaa`, txt, 'application/json');
    UI.modal('Retour prêt', `<p>Le fichier a été téléchargé. Envoie-le par mail au responsable (${esc(D.meta.syndicat.mail)}) et communique-lui le mot de passe par SMS.</p>`, [{ label: 'OK' }]);
  },
  async importerRetour() {
    const f = await pickFile('.snetaa,.json'); if (!f) return;
    let r; try { r = await readJSONMaybeEncrypted(f); } catch (e) { return UI.toast(e.message, 'r'); }
    if (!r || r.type !== 'retour-militant') return UI.toast('Ce fichier n\'est pas un retour de militant', 'r');
    let nMaj = 0, nNew = 0, nContacts = 0;
    r.personnes.forEach(np => {
      let p = P.get(np.id);
      if (!p) { p = P.fix(Object.assign({}, np, { militant: np.militant || r.militant.id, ajoutManuel: np.categorie === 'adherent' })); D.personnes.push(p); nNew++; return; }
      const ids = new Set(p.vote.contacts.map(c => c.id));
      np.vote.contacts.forEach(c => { if (!ids.has(c.id)) { p.vote.contacts.push(c); nContacts++; } });
      if ((np.vote.intMaj || '') >= (p.vote.intMaj || '')) { p.vote.intention = np.vote.intention; p.vote.intMaj = np.vote.intMaj; }
      if (np.vote.aVote && !p.vote.aVote) { p.vote.aVote = true; p.vote.dateVote = np.vote.dateVote; p.vote.sourceVote = np.vote.sourceVote; }
      const ch = [];
      ['email', 'telPortable', 'telFixe'].forEach(k => { if (np[k] && np[k] !== p[k]) { p[k] = np[k]; ch.push(k); } });
      if (np.notes && np.notes !== p.notes) p.notes = np.notes;
      ['interventions', 'messages'].forEach(k => { const s = new Set(p[k].map(x => x.id)); (np[k] || []).forEach(x => { if (!s.has(x.id)) p[k].push(x); }); });
      if (ch.length) P.touch(p, ch); nMaj++;
    });
    save(); log('Retour militant intégré', `${r.militant.prenom} ${r.militant.nom} : ${nMaj} fiches, ${nNew} nouvelles, ${nContacts} contacts`);
    UI.modal('Retour intégré', `<p>Retour de <b>${esc(r.militant.prenom + ' ' + r.militant.nom)}</b> du ${fmtDT(r.date)} :</p><ul><li>${nMaj} fiches mises à jour</li><li>${nContacts} nouveaux contacts notés</li><li>${nNew} nouvelles personnes ajoutées</li></ul>`, [{ label: 'OK' }]);
    App.route();
  },

  /* ---------- Listes de votants (émargement quotidien) ---------- */
  emargement() {
    const h = D.emargements.slice().reverse();
    const vis = Votants.vis(); const nous = vis.filter(p => p.categorie === 'adherent' && P.cotis(p) !== 'ancien' || p.categorie === 'sympathisant');
    const nonVot = nous.filter(p => !p.vote.aVote);
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Qui a voté ?</h1><div class="mut small">Chaque jour du ${fmtDate(D.meta.elections.debut)} au ${fmtDate(D.meta.elections.fin)}, importe la liste des personnes ayant voté : elle est croisée avec le fichier adhérents et le cahier de votants.</div></div>
      <div class="actions"><button class="btn" onclick="Votants.importEmarg('votants')">⇪ Importer la liste des votants du jour</button><button class="btn sec" onclick="Votants.importEmarg('electeurs')">Importer la liste électorale</button></div></div>
      <div class="tiles"><div class="tile g"><div class="n">${nous.length - nonVot.length}</div><div class="l">adhérents & sympathisants ayant voté</div></div><div class="tile o" onclick="Votants.f=Object.assign(Votants.f,{vote:'non',cat:''});App.go('votants')"><div class="n">${nonVot.length}</div><div class="l">pas encore voté → à relancer</div></div>
      <div class="tile"><div class="n">${nous.length ? Math.round((nous.length - nonVot.length) / nous.length * 100) : 0} %</div><div class="l">participation de nos contacts</div></div></div>
      <div class="card"><h3 style="margin-top:0">Relancer ceux qui n'ont pas encore voté</h3><div class="toolbar">
        <button class="btn sm" onclick="Comm.envoyerSelection(Votants.nonVotants('ajour'),null,'relance-vote')">Adhérents à jour (${Votants.nonVotants('ajour').length})</button>
        <button class="btn sm" onclick="Comm.envoyerSelection(Votants.nonVotants('adh'),null,'relance-vote')">Tous les adhérents non votants (${Votants.nonVotants('adh').length})</button>
        <button class="btn sm" onclick="Comm.envoyerSelection(Votants.nonVotants('fo'),null,'relance-vote')">Votes FO sûrs/probables non votants (${Votants.nonVotants('fo').length})</button>
        <button class="btn sm" onclick="Comm.envoyerSelection(Votants.nonVotants('symp'),null,'relance-vote')">Sympathisants non votants (${Votants.nonVotants('symp').length})</button>
        <button class="btn sm sec" onclick="Votants.exportNonVotants()">Exporter par militant</button></div></div>
      <h2>Historique des imports</h2><div class="tablewrap"><table><thead><tr><th>Date de la liste</th><th>Type</th><th>Fichier</th><th class="num">Lignes</th><th class="num">Reconnues dans notre fichier</th><th class="num">Nouveaux votants parmi nos contacts</th></tr></thead><tbody>
      ${h.map(e => `<tr><td>${fmtDate(e.dateListe)}</td><td>${e.type === 'electeurs' ? 'Liste électorale' : 'Votants'}</td><td class="small">${esc(e.fichier)}</td><td class="num">${e.lignes}</td><td class="num">${e.reconnus}</td><td class="num">${e.nouveaux}</td></tr>`).join('') || '<tr><td colspan="6" class="mut">Aucune liste importée</td></tr>'}</tbody></table></div>`;
  },
  nonVotants(k) {
    return Votants.vis().filter(p => !p.vote.aVote && (
      k === 'ajour' ? p.categorie === 'adherent' && P.cotis(p) === 'ajour' :
        k === 'adh' ? p.categorie === 'adherent' :
          k === 'fo' ? ['sur', 'probable'].includes(p.vote.intention) :
            p.categorie === 'sympathisant')).map(p => p.id);
  },
  exportNonVotants() {
    const sheets = {}; const l = Votants.vis().filter(p => !p.vote.aVote && (p.categorie !== 'adherent' || P.cotis(p) !== 'ancien'));
    l.forEach(p => { const k = userName(p.militant) || 'Sans militant'; (sheets[k] = sheets[k] || []).push({ Nom: P.full(p), Établissement: P.etab(p), Portable: p.telPortable, Courriel: p.email, Situation: p.categorie === 'adherent' ? 'Adhérent' : REF.categories[p.categorie], Intention: intention(p.vote.intention)[1] }); });
    exportXLSX('non_votants_' + todayISO() + '.xlsx', sheets);
  },
  importEmarg(type) {
    Mapper.open({
      titre: type === 'electeurs' ? 'Liste électorale — colonnes' : 'Liste des votants — colonnes', profil: 'emarg-' + type,
      intro: type === 'votants' ? 'Si le fichier contient une colonne « a voté » (oui/non), associe-la ; sinon toutes les lignes seront considérées comme ayant voté.' : '',
      fields: [['nom', 'Nom', ['nom', 'nom usage', 'nom d usage']], ['prenom', 'Prénom', ['prenom']], ['nomNaissance', 'Nom de naissance', ['nom de naissance', 'nom patronymique']], ['dateNaissance', 'Date de naissance', ['date de naissance', 'date naissance', 'naissance']], ['etab', 'Établissement ou UAI', ['etablissement', 'uai', 'rne', 'affectation']], ['aVote', 'A voté (oui/non)', ['a vote', 'vote', 'votant', 'emargement', 'statut vote']], ['dateVote', 'Date du vote', ['date vote', 'date du vote', 'date emargement', 'horodatage']]],
      onDone: (rows, info) => Votants.croiser(rows, info, type)
    });
  },
  async croiser(rows, info, type) {
    const dl = await UI.prompt('Date de la liste', 'Date à laquelle la liste a été arrêtée (AAAA-MM-JJ) :', todayISO(), 'date');
    if (!dl) return;
    const byKey = {}, byLoose = {};
    D.personnes.forEach(p => { if (p.dateNaissance) byKey[P.key(p)] = p; [P.keyLoose(p), p.nomNaissance ? norm(p.nomNaissance) + '|' + norm(p.prenom) : null].filter(Boolean).forEach(k => (byLoose[k] = byLoose[k] || []).push(p)); });
    let rec = 0, nouv = 0; const nonTrouves = [];
    rows.forEach(r => {
      const o = { nom: String(r.nom || '').toUpperCase(), prenom: String(r.prenom || ''), dateNaissance: parseDate(r.dateNaissance) };
      if (!o.nom) return;
      if (type === 'votants' && r.aVote !== undefined && r.aVote !== '' && /^(non|n|0|false|faux|non vote)$/i.test(String(r.aVote).trim())) return;
      let p = o.dateNaissance && byKey[P.key(o)];
      if (!p) {
        let l = (byLoose[P.keyLoose(o)] || []).concat(r.nomNaissance ? (byLoose[norm(r.nomNaissance) + '|' + norm(o.prenom)] || []) : []);
        l = Array.from(new Set(l)).filter(x => !o.dateNaissance || !x.dateNaissance || x.dateNaissance === o.dateNaissance);
        if (l.length > 1 && r.etab) { const e = norm(r.etab); l = l.filter(x => P.uais(x).some(u => norm(u) === e) || norm(P.etab(x)).includes(e) || e.includes(norm(P.etab(x)))); }
        if (l.length === 1) p = l[0];
      }
      if (!p) { nonTrouves.push(o); return; }
      rec++;
      if (type === 'electeurs') { p.vote.electeur = dl; }
      else if (!p.vote.aVote) { p.vote.aVote = true; p.vote.dateVote = parseDate(r.dateVote) || dl; p.vote.sourceVote = 'liste du ' + fmtDate(dl); nouv++; }
    });
    D.emargements.push({ id: uid(), date: nowISO(), dateListe: dl, type, fichier: info.fichier, lignes: rows.length, reconnus: rec, nouveaux: nouv, par: ME.id });
    log(type === 'electeurs' ? 'Liste électorale importée' : 'Liste des votants importée', `${info.fichier} : ${rec} reconnus, ${nouv} nouveaux votants`);
    save(); App.route();
    UI.modal('Croisement terminé', `<p><b>${rec}</b> personnes de la liste figurent dans notre fichier${type === 'votants' ? `, dont <b>${nouv}</b> nouveaux votants depuis la dernière liste` : ''}.</p><p class="small mut">${nonTrouves.length} lignes ne correspondent à personne de notre fichier (collègues non adhérents ni sympathisants : normal).</p>`, [{ label: 'OK' }]);
  },

  /* ---------- Tableau de bord élections ---------- */
  bilan() {
    const vis = Votants.vis();
    const adhAJ = vis.filter(p => p.categorie === 'adherent' && P.cotis(p) === 'ajour');
    const symp = vis.filter(p => p.categorie === 'sympathisant');
    const tous = vis.filter(p => p.categorie !== 'adherent' || P.cotis(p) !== 'ancien');
    const pct = (a, b) => b ? Math.round(a / b * 100) + ' %' : '—';
    const voted = l => l.filter(p => p.vote.aVote).length;
    const parInt = REF.intentions.map(i => [i[1], tous.filter(p => (p.vote.intention || '') === i[0]).length, i[2]]);
    const mils = D.users.filter(u => u.actif !== false).map(u => { const l = tous.filter(p => p.militant === u.id); return [u.prenom + ' ' + u.nom, l.length, l.filter(p => p.vote.contacts.length).length, voted(l)]; }).filter(x => x[1]);
    const etabs = {}; tous.forEach(p => { const k = P.etab(p) || '?'; etabs[k] = etabs[k] || [0, 0, 0]; etabs[k][0]++; if (p.vote.aVote) etabs[k][1]++; if (['sur', 'probable'].includes(p.vote.intention)) etabs[k][2]++; });
    const jours = D.emargements.filter(e => e.type === 'votants').sort((a, b) => a.dateListe < b.dateListe ? -1 : 1);
    let cum = 0; const evol = jours.map(e => { cum += e.nouveaux; return [fmtDate(e.dateListe), cum]; });
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Tableau de bord élections</h1><div class="mut small">${fmtDate(D.meta.elections.debut)} → ${fmtDate(D.meta.elections.fin)}</div></div><div class="actions"><button class="btn sec" onclick="window.print()">🖨 Imprimer</button></div></div>
      <div class="tiles"><div class="tile"><div class="n">${adhAJ.length}</div><div class="l">adhérents à jour</div></div><div class="tile g"><div class="n">${pct(voted(adhAJ), adhAJ.length)}</div><div class="l">des adhérents à jour ont voté (${voted(adhAJ)})</div></div>
      <div class="tile v"><div class="n">${symp.length}</div><div class="l">sympathisants</div></div><div class="tile g"><div class="n">${pct(voted(symp), symp.length)}</div><div class="l">des sympathisants ont voté (${voted(symp)})</div></div>
      <div class="tile o"><div class="n">${pct(tous.filter(p => p.vote.contacts.length).length, tous.length)}</div><div class="l">de nos contacts déjà joints</div></div></div>
      <div class="grid g2"><div class="card"><h3 style="margin-top:0">Intentions de vote (${tous.length} personnes)</h3>${UI.bars(parInt, tous.length)}</div>
      <div class="card"><h3 style="margin-top:0">Votes de nos contacts, jour après jour</h3>${evol.length ? UI.bars(evol) : '<p class="mut">Aucune liste de votants importée.</p>'}</div></div>
      <div class="card"><h3 style="margin-top:0">Par militant</h3><div class="tablewrap"><table><thead><tr><th>Militant</th><th class="num">Contacts</th><th class="num">Joints</th><th class="num">Ont voté</th><th>Avancement des appels</th></tr></thead><tbody>${mils.map(m => `<tr><td>${esc(m[0])}</td><td class="num">${m[1]}</td><td class="num">${m[2]}</td><td class="num">${m[3]}</td><td style="min-width:140px"><div class="bar"><span style="width:${m[1] ? m[2] / m[1] * 100 : 0}%"></span></div></td></tr>`).join('') || '<tr><td colspan="5" class="mut">Aucune répartition</td></tr>'}</tbody></table></div></div>
      <div class="card"><h3 style="margin-top:0">Par établissement</h3><div class="tablewrap" style="max-height:60vh"><table><thead><tr><th>Établissement</th><th class="num">Contacts</th><th class="num">FO sûr/probable</th><th class="num">Ont voté</th><th class="num">Participation</th></tr></thead><tbody>${Object.entries(etabs).sort((a, b) => b[1][0] - a[1][0]).map(([e, v]) => `<tr><td>${esc(e)}</td><td class="num">${v[0]}</td><td class="num">${v[2]}</td><td class="num">${v[1]}</td><td class="num">${pct(v[1], v[0])}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
};
App.routes.votants = () => Votants.page();
App.routes.repartition = () => Votants.repartition();
App.routes.emargement = () => Votants.emargement();
App.routes.bilan = () => Votants.bilan();
