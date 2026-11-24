/* =========================================================
   Fichier adhérents : liste, fiche, historique, signalements
   ========================================================= */
'use strict';
function mailto(to, subject, body, cc, bcc) {
  const q = []; if (cc) q.push('cc=' + encodeURIComponent(cc)); if (bcc) q.push('bcc=' + encodeURIComponent(bcc));
  q.push('subject=' + encodeURIComponent(subject || '')); q.push('body=' + encodeURIComponent(body || ''));
  return 'mailto:' + encodeURIComponent(to || '').replace(/%40/g, '@').replace(/%2C/g, ',') + '?' + q.join('&');
}
function openLink(url) { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); }

const Adh = {
  /* Champs transmis au national (comparaison avec le fichier importé) */
  FIELDS: [
    ['numAdherent', 'N° adhérent'], ['civilite', 'Civilité'], ['nom', 'Nom'], ['prenom', 'Prénom'], ['nomNaissance', 'Nom de naissance'], ['dateNaissance', 'Date de naissance'],
    ['email', 'Courriel'], ['emailPro', 'Courriel académique'], ['telPortable', 'Téléphone portable'], ['telFixe', 'Téléphone fixe'],
    ['adresse', 'Adresse'], ['cp', 'Code postal'], ['ville', 'Ville'], ['statut', 'Statut / corps'], ['discipline', 'Code discipline'], ['classe', 'Classe / grade'], ['echelon', 'Échelon'], ['indice', 'Indice majoré'], ['datePromo', 'Date d\'accès à l\'échelon'],
    ['etabUAI', 'UAI établissement'], ['etabNom', 'Établissement'], ['academie', 'Académie'], ['datePremiereAdhesion', 'Date de première adhésion'], ['calendrier', 'Calendrier d\'adhésion']
  ],
  f: { q: '', cat: '', cotis: '', statut: '', disc: '', dep: '', etab: '', mil: '', flag: '', sort: 'nom', lim: 300 },
  val(p, f) {
    if (f === 'etabUAI') { const a = p.affectations.find(x => x.principal) || p.affectations[0]; return a ? a.uai || '' : ''; }
    if (f === 'etabNom') { const a = p.affectations.find(x => x.principal) || p.affectations[0]; return a ? a.nom || '' : ''; }
    return p[f] == null ? '' : String(p[f]);
  },
  same(a, b) { return norm(a) === norm(b); },
  /* Différences entre la fiche et le dernier fichier national importé */
  diffs(p) {
    const snap = D.lastSnapshot && D.lastSnapshot.records[p.id];
    const out = [];
    if (!snap) return out;
    for (const [f, l] of Adh.FIELDS) {
      const toujours = ['classe', 'echelon', 'indice', 'datePromo'].includes(f); // informations de carrière : toujours transmises au national
      if (snap[f] === undefined && !toujours) continue;
      const cur = Adh.val(p, f), nat = snap[f] === undefined ? '' : snap[f];
      if (!cur && snap[f] === undefined) continue;
      if (!Adh.same(cur, nat) && p.signale[f] !== cur) out.push({ f, l, avant: nat, apres: cur });
    }
    return out;
  },
  aSignaler(p) {
    if (p.archive && !(p.changementAcademie && !p.changementAcademie.notifie)) return null;
    const r = { p, diffs: Adh.diffs(p), nouveau: false, academie: null, email: false, autreAcad: null };
    if (p.categorie === 'adherent' && p.ajoutManuel && !(D.lastSnapshot && D.lastSnapshot.records[p.id]) && !p.signale.__nouveau) r.nouveau = true;
    if (p.changementAcademie && !p.changementAcademie.notifie) r.academie = p.changementAcademie;
    if (p.autreAcademie && !p.autreAcademie.notifie) r.autreAcad = p.autreAcademie;
    if (p.emailInvalide && !p.emailInvalide.signale) r.email = true;
    return (r.diffs.length || r.nouveau || r.academie || r.email || r.autreAcad) ? r : null;
  },
  countDiffs() { return D.personnes.filter(p => Adh.aSignaler(p)).length; },
  filtreRapide(flag) { Adh.f = Object.assign({}, Adh.f, { flag, q: '', cat: '', cotis: '' }); App.go('adherents'); setTimeout(App.route, 0); },
  filtered() {
    const f = Adh.f, q = norm(f.q);
    let l = P.visibles().filter(p => {
      if (f.cat && p.categorie !== f.cat) return false;
      if (f.cotis && P.cotis(p) !== f.cotis) return false;
      if (f.statut && p.statut !== f.statut) return false;
      if (f.disc && p.discipline !== f.disc) return false;
      if (f.dep && P.dep(p) !== f.dep) return false;
      if (f.etab && !P.uais(p).includes(f.etab)) return false;
      if (f.mil === '_none' ? p.militant : (f.mil && p.militant !== f.mil)) return false;
      if (f.flag === 'emailInvalide' && !p.emailInvalide) return false;
      if (f.flag === 'sansEmail' && p.email) return false;
      if (f.flag === 'sansTel' && (p.telPortable || p.telFixe)) return false;
      if (f.flag === 'acad' && !p.changementAcademie && !p.autreAcademie) return false;
      if (f.flag === 'civil' && p.calendrier !== 'civil') return false;
      if (f.flag === 'diff' && !Adh.aSignaler(p)) return false;
      if (q && !norm([p.nom, p.prenom, p.nomNaissance, p.email, p.telPortable, p.ville, P.etabs(p), p.discipline, discLabel(p.discipline), p.numAdherent].join(' ')).includes(q)) return false;
      return true;
    });
    const s = f.sort;
    const key = { nom: p => norm(p.nom + ' ' + p.prenom), etab: p => norm(P.etab(p)), statut: p => p.statut || '', cotis: p => P.cotis(p), dep: p => P.dep(p), maj: p => p.maj || '' }[s.replace('-', '')] || (p => '');
    l.sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0); if (s.startsWith('-')) l.reverse();
    return l;
  },
  setF(k, v) { Adh.f[k] = v; if (k !== 'lim') Adh.f.lim = 300; Adh.renderList(); },
  page() {
    const f = Adh.f;
    const etabs = D.etablissements.length ? D.etablissements.map(e => [e.uai, e.nom + ' (' + (e.ville || '') + ')']) : Array.from(new Set(D.personnes.flatMap(P.uais))).map(u => [u, u]);
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Fichier adhérents</h1><div class="mut small" id="adhcount"></div></div>
      <div class="actions">${can('adh.modifier') ? `<button class="btn" onclick="Adh.edit()">+ Nouvelle fiche</button>` : ''}
      ${can('adh.exporter') ? `<button class="btn sec" onclick="Adh.exporter()">Exporter</button>` : ''}</div></div>
      <div class="card noprint"><div class="toolbar">
        <input type="search" placeholder="Nom, mail, établissement, discipline…" value="${esc(f.q)}" oninput="Adh.f.q=this.value;Adh.f.lim=300;Adh.renderListDeb()" style="min-width:240px;flex:1">
        <select onchange="Adh.setF('cat',this.value)">${UI.opts(Object.entries(REF.categories), f.cat, 'Toutes catégories')}</select>
        <select onchange="Adh.setF('cotis',this.value)">${UI.opts([['ajour', 'À jour'], ['retard', 'À relancer'], ['ancien', 'Anciens adhérents'], ['inconnu', 'Cotisation inconnue']], f.cotis, 'Cotisation : toutes')}</select>
        <select onchange="Adh.setF('statut',this.value)">${UI.opts(REF.statuts.map(s => [s[0], s[1]]), f.statut, 'Tous statuts')}</select>
        <select onchange="Adh.setF('disc',this.value)" style="max-width:220px">${UI.opts(D.disciplines.map(d => [d[0], d[0] + ' ' + d[1]]), f.disc, 'Toutes disciplines')}</select>
        <select onchange="Adh.setF('dep',this.value)">${UI.opts(Object.entries(REF.departements).map(([k, v]) => [k, k + ' ' + v]), f.dep, 'Tous départements')}</select>
        <select onchange="Adh.setF('etab',this.value)" style="max-width:220px">${UI.opts(etabs, f.etab, 'Tous établissements')}</select>
        <select onchange="Adh.setF('mil',this.value)">${UI.militantsOpts(f.mil, 'Tous militants')}<option value="_none" ${f.mil === '_none' ? 'selected' : ''}>Sans militant</option></select>
        <select onchange="Adh.setF('flag',this.value)">${UI.opts([['emailInvalide', 'Mail en erreur'], ['sansEmail', 'Sans mail'], ['sansTel', 'Sans téléphone'], ['acad', 'Changement d\'académie'], ['civil', 'Calendrier civil (ex-FO)'], ['diff', 'Modifs à signaler']], f.flag, 'Aucun signalement')}</select>
        <button class="btn ghost sm" onclick="Adh.f={q:'',cat:'',cotis:'',statut:'',disc:'',dep:'',etab:'',mil:'',flag:'',sort:'nom',lim:300};Adh.page()">Réinitialiser</button>
      </div>
      <div class="toolbar"><span id="selinfo" class="small mut"></span>
        ${can('com.envoyer') ? `<button class="btn sm sec" onclick="Comm.envoyerSelection(Adh.selIds())">✉ Mail / SMS type</button>` : ''}
        ${can('vot.repartir') ? `<button class="btn sm sec" onclick="Adh.bulkMilitant()">⚑ Attribuer un militant</button>` : ''}
        ${can('adh.modifier') ? `<button class="btn sm sec" onclick="Adh.bulkCategorie()">Changer de catégorie</button><button class="btn sm sec" onclick="Adh.bulkStatut()">Statut / classe / échelon</button>` : ''}
        ${can('adh.cotis') ? `<button class="btn sm sec" onclick="Cotis.bulkPaye(Adh.selIds())">€ Cotisation payée</button>` : ''}
        ${can('adh.exporter') ? `<button class="btn sm sec" onclick="Adh.exporter(Adh.selIds())">Exporter la sélection</button>` : ''}
      </div></div><div id="adhlist"></div>`;
    Adh.renderList();
  },
  selIds() { return UI.sel.size ? Array.from(UI.sel) : Adh.filtered().map(p => p.id); },
  renderListDeb: debounce(() => Adh.renderList(), 200),
  sortBy(k) { Adh.f.sort = Adh.f.sort === k ? '-' + k : k; Adh.renderList(); },
  renderList() {
    const l = Adh.filtered(), lim = Adh.f.lim;
    $('#adhcount').textContent = plural(l.length, 'fiche') + ' affichée' + (l.length > 1 ? 's' : '');
    const th = (k, t) => `<th class="sort" onclick="Adh.sortBy('${k}')">${t}${Adh.f.sort === k ? ' ▲' : Adh.f.sort === '-' + k ? ' ▼' : ''}</th>`;
    $('#adhlist').innerHTML = `<div class="tablewrap"><table><thead><tr><th><input type="checkbox" onclick="UI.selAll(${JSON.stringify(l.slice(0, lim).map(p => p.id)).replace(/"/g, '&quot;')},this.checked)"></th>${th('nom', 'Nom')}${th('statut', 'Statut / discipline')}${th('etab', 'Établissement')}${th('dep', 'Dép.')}${th('cotis', 'Cotisation')}<th class="hide-m">Contact</th><th class="hide-m">Militant</th></tr></thead><tbody>
      ${l.slice(0, lim).map(p => `<tr class="click" onclick="if(event.target.type!=='checkbox')App.go('fiche/${p.id}')">
        <td><input type="checkbox" class="rowsel" ${UI.sel.has(p.id) ? 'checked' : ''} onchange="UI.selToggle('${p.id}',this.checked)"></td>
        <td><b>${esc(P.full(p))}</b> ${Mandats.tags(p)}${p.calendrier === 'civil' ? ' <span class="tag v" title="Calendrier civil (1er janvier - 31 décembre)">civil</span>' : ''}${p.changementAcademie ? ' <span class="tag w">→ ' + esc(p.changementAcademie.nouvelle) + '</span>' : ''}</td>
        <td>${esc(STATUT(p.statut)[1] ? STATUT(p.statut)[0] : '')}${p.discipline ? ' · <span title="' + esc(discLabel(p.discipline)) + '">' + esc(p.discipline) + '</span>' : ''}</td>
        <td>${esc(P.etab(p)) || (p.statut === 'RETR' ? '<span class="mut">retraité·e</span>' : '')}</td><td>${esc(P.dep(p))}</td><td>${P.cotisTag(p)}${p.situationNat ? ' <span class="tag ko">' + esc(p.situationNat.toLowerCase()) + '</span>' : ''}</td>
        <td class="hide-m small">${p.email ? (p.emailInvalide ? '<span class="tag ko">mail ✗</span>' : '✉') : ''} ${p.telPortable ? '☎' : ''}</td>
        <td class="hide-m small">${esc(userName(p.militant))}</td></tr>`).join('')}
      </tbody></table></div>${l.length > lim ? `<p><button class="btn sec" onclick="Adh.setF('lim',${lim + 500})">Afficher plus (${l.length - lim} restantes)</button></p>` : ''}`;
    UI.selInfo();
  },
  exporter(ids) {
    const l = ids ? ids.map(P.get).filter(Boolean) : Adh.filtered();
    exportXLSX('adherents_' + todayISO() + '.xlsx', { Adhérents: l.map(Adh.row) });
    log('Export liste', plural(l.length, 'fiche'));
  },
  row(p) {
    return {
      'N° adhérent': p.numAdherent || '', Catégorie: REF.categories[p.categorie] || '', Civilité: p.civilite || '', Nom: (p.nom || '').toUpperCase(), Prénom: p.prenom || '', 'Nom de naissance': p.nomNaissance || '',
      'Date de naissance': fmtDate(p.dateNaissance), Courriel: p.email || '', 'Mail en erreur': p.emailInvalide ? 'oui' : '', 'Courriel académique': p.emailPro || '', Portable: p.telPortable || '', 'Téléphone fixe': p.telFixe || '',
      Adresse: p.adresse || '', CP: p.cp || '', Ville: p.ville || '', Statut: STATUT(p.statut)[1], 'Code discipline': p.discipline || '', Discipline: discLabel(p.discipline),
      'UAI': P.uais(p).join(', '), Établissement: P.etabs(p), Département: P.dep(p), Académie: p.academie || '',
      Calendrier: p.calendrier === 'civil' ? '1er janv. - 31 déc.' : '1er sept. - 31 août', 'Première adhésion': fmtDate(p.datePremiereAdhesion), 'Classe': Carriere.classe(p.classe), 'Échelon': p.echelon || '', 'Indice majoré': p.indice || '', 'Date échelon': fmtDate(p.datePromo), 'Cotisation attendue': Carriere.montant(p) || '', 'Dernière cotisation': P.derniere(p),
      'À jour': { ajour: 'oui', retard: 'non (à relancer)', ancien: 'non (ancien)', inconnu: '?', nonadh: '' }[P.cotis(p)], Militant: userName(p.militant), 'Intention de vote': intention(p.vote.intention)[1], 'A voté': p.vote.aVote ? 'oui' : ''
    };
  },
  bulkMilitant() {
    const ids = Adh.selIds();
    UI.modal('Attribuer un militant', `<p>${plural(ids.length, 'fiche')} concernée(s).</p><div class="f"><label>Militant</label><select id="bm">${UI.militantsOpts('', '— Aucun —')}</select></div>`,
      [{ label: 'Annuler' }, { label: 'Attribuer', onClick: m => { const v = m.querySelector('#bm').value; ids.forEach(id => { const p = P.get(id); if (p) { p.militant = v; P.touch(p); } }); log('Attribution militant', plural(ids.length, 'fiche') + ' → ' + userName(v)); UI.toast('Attribué', 'g'); App.route(); } }]);
  },
  bulkStatut() {
    const ids = Adh.selIds();
    UI.modal('Statut, discipline, classe et échelon', `<p>${plural(ids.length, 'fiche')} concernée(s). Laisser vide pour ne pas modifier.</p><div class="frow"><div class="f"><label>Statut</label><select id="bs">${UI.opts(REF.statuts.map(s => [s[0], s[1]]), '', '— inchangé —')}</select></div><div class="f"><label>Discipline (code)</label><input id="bd" list="dl_bd"><datalist id="dl_bd">${D.disciplines.map(d => `<option value="${esc(d[0])}">${esc(d[1])}</option>`).join('')}</datalist></div>
      <div class="f"><label>Classe</label><select id="bcl">${UI.opts(Carriere.CLASSES, '', '— inchangée —')}</select></div><div class="f"><label>Échelon</label><input id="bech" inputmode="numeric"></div></div><p class="small mut">L'indice majoré est complété d'après la grille (Paramètres) quand il est vide.</p>`,
      [{ label: 'Annuler' }, { label: 'Appliquer', onClick: m => { const s = m.querySelector('#bs').value, d = m.querySelector('#bd').value.trim().toUpperCase(), cl = m.querySelector('#bcl').value, ec = Carriere.echelonFromText(m.querySelector('#bech').value); ids.forEach(id => { const p = P.get(id); if (!p) return; const ch = []; if (s) { p.statut = s; ch.push('statut'); } if (d) { p.discipline = d; ch.push('discipline'); } if (cl) { p.classe = cl; ch.push('classe'); } if (ec) { p.echelon = ec; ch.push('echelon'); } if ((cl || ec) && !p.indice) { p.indice = Carriere.indiceGrille(p); if (p.indice) ch.push('indice'); } P.touch(p, ch); }); log('Mise à jour groupée', plural(ids.length, 'fiche')); App.route(); } }]);
  },
  bulkCategorie() {
    const ids = Adh.selIds();
    UI.modal('Changer de catégorie', `<p>${plural(ids.length, 'fiche')} concernée(s).</p><div class="f"><select id="bc">${UI.opts(Object.entries(REF.categories), '')}</select></div>`,
      [{ label: 'Annuler' }, { label: 'Appliquer', onClick: m => { const v = m.querySelector('#bc').value; ids.forEach(id => { const p = P.get(id); if (p) { p.categorie = v; P.touch(p); } }); log('Changement de catégorie', plural(ids.length, 'fiche')); App.route(); } }]);
  },

  /* ---------- Fiche ---------- */
  tab: 'id',
  fiche(id) {
    const p = P.get(id);
    if (!p || !P.visibles().includes(p)) { $('#main').innerHTML = '<div class="alert r">Fiche introuvable ou hors de votre périmètre.</div>'; return; }
    const st = STATUT(p.statut);
    const tel = p.telPortable || p.telFixe;
    let h = `<div class="pagehead noprint"><a href="#/adherents" class="btn ghost sm">← Liste</a></div>
    <div class="card"><div class="fiche-head"><div><div class="big">${esc(p.civilite ? p.civilite + ' ' : '')}${esc(P.full(p))}</div>
      <div class="mut">${esc(st[1])}${p.discipline ? ' — ' + esc(p.discipline + ' ' + discLabel(p.discipline)) : ''}${Carriere.resume(p) ? ' — ' + esc(Carriere.resume(p)) : ''}</div>
      <div style="margin-top:.3rem">${Mandats.tags(p)} ${P.cotisTag(p)} ${p.calendrier === 'civil' ? '<span class="tag v">Calendrier civil (ex-FO)</span>' : ''} ${p.emailInvalide ? '<span class="tag ko">Mail en erreur</span>' : ''} ${p.changementAcademie ? '<span class="tag w">Changement d\'académie → ' + esc(p.changementAcademie.nouvelle) + '</span>' : ''} ${p.autreAcademie ? '<span class="tag w">Encore inscrit à ' + esc(p.autreAcademie.academie) + '</span>' : ''} ${p.archive ? '<span class="tag ko">Archivée' + (p.archive === 'décès' ? ' (décès)' : '') + '</span>' : ''} ${p.situationNat ? '<span class="tag ko">National : ' + esc(p.situationNat) + '</span>' : ''} ${p.aJourNat ? '<span class="tag">À jour (national) : ' + esc(p.aJourNat) + '</span>' : ''} ${p.adresseInvalide ? '<span class="tag w">Adresse postale à vérifier</span>' : ''}</div></div>
      <div class="actions noprint" style="margin-left:auto;display:flex;flex-wrap:wrap;gap:.4rem">
        ${can('adh.modifier') ? `<button class="btn" onclick="Adh.edit('${p.id}')">Modifier</button>` : ''}
        ${p.email && can('com.envoyer') ? `<button class="btn sec" onclick="Comm.envoyerSelection(['${p.id}'],'mail')">✉ Mail</button>` : ''}
        ${tel && can('com.envoyer') ? `<button class="btn sec" onclick="Comm.envoyerSelection(['${p.id}'],'sms')">SMS</button><a class="btn sec" href="tel:${esc(phoneIntl(tel))}">☎ Appeler</a>` : ''}
        ${can('com.envoyer') && p.statut !== 'RETR' && (p.categorie !== 'adherent' || ['ancien', 'retard'].includes(P.cotis(p))) ? `<button class="btn ok" onclick="Comm.envoyerSelection(['${p.id}'],null,'adhesion')">Proposer l'adhésion</button>` : ''}
        ${can('adh.modifier') ? `<button class="btn sec" onclick="Adh.intervention('${p.id}')">+ Intervention</button><button class="btn sec" onclick="Adh.importMessage('${p.id}')">⇩ Archiver un message</button><button class="btn sec" onclick="Adh.menu('${p.id}')">Autres actions ▾</button>` : ''}
      </div></div></div>`;
    const tabs = [['id', 'Identité & affectation'], ['cotis', 'Adhésion & cotisations'], ['mand', `Mandats (${Mandats.de(p).length})`], ['hist', `Historique (${p.interventions.length + p.messages.length})`], ['vote', 'Élections'], ['reu', 'Réunions'], ['nat', 'Fichier national']];
    if (!can('adh.historique')) tabs.splice(tabs.findIndex(t => t[0] === 'hist'), 1);
    if (can('adm.users')) tabs.push(['acces', 'Accès & droits']);
    h += UI.tabs('ftabs', tabs, Adh.tab, `(k=>{Adh.tab=k;Adh.fiche('${p.id}')})`) + `<div id="ftab"></div>`;
    $('#main').innerHTML = h;
    $('#ftab').innerHTML = Adh['tab_' + Adh.tab] ? Adh['tab_' + Adh.tab](p) : Adh.tab_id(p);
  },
  tab_id(p) {
    const kv = (l, v) => v ? `<div>${esc(l)}</div><div>${v}</div>` : '';
    return `<div class="grid g2"><div class="card"><h3 style="margin-top:0">Coordonnées</h3><div class="kv">
      ${kv('Catégorie', esc(REF.categories[p.categorie]))}${kv('N° adhérent', esc(p.numAdherent))}${kv('Nom de naissance', esc(p.nomNaissance))}${kv('Date de naissance', fmtDate(p.dateNaissance))}
      ${kv('Courriel', p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>${p.emailInvalide ? ` <span class="tag ko">en erreur depuis le ${fmtDate(p.emailInvalide.date)}</span>` : ''}` : '')}
      ${kv('Courriel académique', esc(p.emailPro))}${kv('Portable', p.telPortable ? `<a href="tel:${esc(phoneIntl(p.telPortable))}">${esc(p.telPortable)}</a>` : '')}${kv('Fixe', esc(p.telFixe))}
      ${kv('Adresse', esc([p.adresse, [p.cp, p.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')))}</div></div>
      <div class="card"><h3 style="margin-top:0">Situation professionnelle</h3><div class="kv">
      ${kv('Statut', esc(STATUT(p.statut)[1]))}${kv('Discipline', esc(p.discipline ? p.discipline + ' — ' + discLabel(p.discipline) : ''))}
      ${kv('Carrière', esc(Carriere.resume(p)))}${kv('Cotisation attendue', Carriere.montant(p) ? fmtEUR(Carriere.montant(p)) : '')}${kv('Académie', esc(p.academie))}${kv('Département', esc(P.dep(p) ? P.dep(p) + ' ' + (REF.departements[P.dep(p)] || '') : ''))}
      ${kv('Militant référent', esc(userName(p.militant)))}</div>
      <h3>Affectation(s)</h3>${p.affectations.length ? p.affectations.map(a => `<div>${a.principal ? '★ ' : ''}<b>${esc(a.nom || '')}</b> <span class="mut">${esc(a.uai || '')} ${esc(a.ville || '')}${a.quotite ? ' — ' + esc(a.quotite) : ''}</span></div>`).join('') : '<span class="mut">Non renseignée</span>'}</div></div>
      ${p.notes ? `<div class="card"><h3 style="margin-top:0">Notes</h3><div class="msg">${esc(p.notes)}</div></div>` : ''}
      <p class="small mut">Fiche créée le ${fmtDT(p.created)}${p.maj ? ' — modifiée le ' + fmtDT(p.maj) + (p.majPar ? ' par ' + esc(userName(p.majPar)) : '') : ''}</p>`;
  },
  tab_cotis(p) {
    const l = p.cotisations.slice().sort((a, b) => a.periode < b.periode ? 1 : -1);
    return `<div class="card"><div class="kv">
      <div>Calendrier</div><div>${p.calendrier === 'civil' ? 'Civil : 1er janvier → 31 décembre (adhérent historique FO)' : 'Scolaire : 1er septembre → 31 août'}</div>
      <div>Période en cours</div><div>${P.periode(p.calendrier)}</div><div>Situation</div><div>${P.cotisTag(p)}</div>
      <div>Ancienneté</div><div>${esc(P.anciennete(p) || 'inconnue')}</div>
      <div>Carrière</div><div>${esc(Carriere.resume(p) || 'classe et échelon non renseignés')}</div>
      <div>Cotisation attendue</div><div>${Carriere.montant(p) ? `<b>${fmtEUR(Carriere.montant(p))}</b> <span class="small mut">(crédit d'impôt 66 % : ${fmtEUR(Carriere.credit(Carriere.montant(p)))}, coût réel ${fmtEUR(Carriere.montant(p) - Carriere.credit(Carriere.montant(p)))})</span>` : '<span class="mut">à calculer : renseigne la classe et l\'échelon, et le barème dans Paramètres</span>'}</div></div>
      ${can('adh.cotis') ? `<p class="noprint"><button class="btn" onclick="Cotis.ajouter('${p.id}')">+ Enregistrer une cotisation</button></p>` : ''}
      <div class="tablewrap"><table><thead><tr><th>Période</th><th>Date de paiement</th><th class="num">Montant</th><th>Mode</th><th>Source</th><th></th></tr></thead><tbody>
      ${l.map(c => `<tr><td>${esc(c.periode)} <span class="small mut">${/^\d{4}$/.test(c.periode) ? 'janv.-déc.' : 'sept.-août'}</span></td><td>${fmtDate(c.date)}</td><td class="num">${c.montant ? fmtEUR(c.montant) : ''}</td><td>${esc(c.mode || '')}</td><td class="small mut">${esc(c.source || '')}</td><td>${can('adh.cotis') ? `<button class="btn sm ghost" onclick="Cotis.suppr('${p.id}','${c.id}')">✕</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="mut">Aucune cotisation enregistrée</td></tr>'}
      </tbody></table></div></div>`;
  },
  tab_hist(p) {
    const items = [
      ...p.interventions.map(i => ({ d: i.date, k: 'i', o: i })),
      ...p.messages.map(m => ({ d: m.date, k: 'm', o: m })),
      ...p.vote.contacts.map(c => ({ d: c.date, k: 'c', o: c }))
    ].sort((a, b) => (a.d || '') < (b.d || '') ? 1 : -1);
    return `<div class="card"><div class="timeline">${items.map(it => {
      const o = it.o;
      if (it.k === 'i') return `<div class="it"><b>${fmtDate(o.date)} — ${esc(o.type || 'Intervention')}</b> <span class="tag">${esc((REF.canaux.find(c => c[0] === o.canal) || ['', o.canal || ''])[1])}</span> ${o.statut === 'en cours' ? '<span class="tag w">en cours</span>' : ''}<br>${o.objet ? '<b>' + esc(o.objet) + '</b><br>' : ''}<div class="msg">${esc(o.detail || '')}</div><span class="small mut">par ${esc(userName(o.auteur))}</span> ${can('adh.modifier') ? `<button class="btn sm ghost noprint" onclick="Adh.intervention('${p.id}','${o.id}')">Modifier</button><button class="btn sm ghost noprint" onclick="Adh.supprItem('${p.id}','interventions','${o.id}')">Supprimer</button>` : ''}</div>`;
      if (it.k === 'm') return `<div class="it ${o.canal === 'mail' ? 'mail' : o.canal === 'sms' ? 'sms' : o.canal === 'wa' ? 'wa' : ''}"><b>${fmtDT(o.date)} — ${esc({ mail: 'Mail', sms: 'SMS', wa: 'WhatsApp' }[o.canal] || o.canal)} ${o.sens === 'recu' ? 'reçu' : 'envoyé'}</b>${o.de ? ' <span class="mut small">de ' + esc(o.de) + '</span>' : ''}<br>${o.objet ? '<b>' + esc(o.objet) + '</b>' : ''}<div class="msg">${esc(o.contenu || '')}</div>${o.pj ? `<a class="small" href="${o.pj.data}" download="${esc(o.pj.nom)}">📎 ${esc(o.pj.nom)}</a>` : ''} ${can('adh.modifier') ? `<button class="btn sm ghost noprint" onclick="Adh.supprItem('${p.id}','messages','${o.id}')">Supprimer</button>` : ''}</div>`;
      return `<div class="it"><b>${fmtDate(o.date)} — Contact élections</b> (${esc((REF.canaux.find(c => c[0] === o.canal) || ['', o.canal])[1])}) par ${esc(userName(o.par))}<br>${esc(o.resultat || '')}</div>`;
    }).join('') || '<p class="mut">Aucun échange enregistré.</p>'}</div></div>`;
  },
  tab_mand(p) { return Mandats.tabFiche(p); },
  tab_acces(p) { return Droits.tabFiche(p); },
  tab_vote(p) { return (typeof Votants !== "undefined" && Votants) ? Votants.ficheVote(p) : ''; },
  tab_reu(p) {
    const l = D.reunions.filter(r => r.participants.some(x => x.pid === p.id)).sort((a, b) => a.date < b.date ? 1 : -1);
    return `<div class="card"><div class="tablewrap"><table><thead><tr><th>Date</th><th>Réunion</th><th>Présence</th></tr></thead><tbody>${l.map(r => { const x = r.participants.find(x => x.pid === p.id); return `<tr class="click" onclick="App.go('reunion/${r.id}')"><td>${fmtDate(r.date)}</td><td>${esc(r.titre)}</td><td>${esc(x.statut)}</td></tr>`; }).join('') || '<tr><td colspan="3" class="mut">Aucune réunion</td></tr>'}</tbody></table></div></div>`;
  },
  tab_nat(p) {
    const snap = D.lastSnapshot && D.lastSnapshot.records[p.id]; const diffs = Adh.diffs(p);
    return `<div class="card"><h3 style="margin-top:0">Comparaison avec le dernier fichier importé ${D.lastSnapshot ? '(' + fmtDT(D.lastSnapshot.date) + ')' : ''}</h3>
      ${!snap ? '<p class="mut">Cette fiche ne figure pas dans le dernier fichier importé.</p>' : diffs.length ? `<table><thead><tr><th>Champ</th><th>Fichier national</th><th>Fiche corrigée</th></tr></thead><tbody>${diffs.map(d => `<tr><td>${esc(d.l)}</td><td><span class="diffold">${esc(d.avant)}</span></td><td><span class="diffnew">${esc(d.apres)}</span></td></tr>`).join('')}</tbody></table>` : '<p>Aucune différence non signalée.</p>'}
      ${Object.keys(p.extra || {}).length ? `<h3>Autres colonnes du fichier importé</h3><div class="kv">${Object.entries(p.extra).map(([k, v]) => `<div>${esc(k)}</div><div>${esc(v)}</div>`).join('')}</div>` : ''}</div>`;
  },
  menu(id) {
    const p = P.get(id);
    const b = (l, fn, cls) => `<button class="btn ${cls || 'sec'}" style="width:100%;justify-content:flex-start;margin:.2rem 0" onclick="UI.close();${fn}">${l}</button>`;
    UI.modal('Actions sur la fiche', [
      p.emailInvalide ? b('✓ L\'adresse mail fonctionne à nouveau', `Adh.emailInvalide('${id}',false)`) : b('✗ Signaler l\'adresse mail comme fausse (retour en erreur)', `Adh.emailInvalide('${id}',true)`),
      can('adh.national') ? b('⇄ Changement d\'académie (mail au national et à l\'académie)', `Adh.changementAcademie('${id}')`) : '',
      can('adh.national') ? b('⇄ Adhérent encore enregistré dans une autre académie', `Adh.autreAcademie('${id}')`) : '',
      b('✉ Demander à l\'adhérent de vérifier ses informations', `MajAdh.demande(['${id}'])`),
      p.archive ? b('Désarchiver la fiche', `Adh.archiver('${id}',false)`) : b('Archiver la fiche (ne fait plus partie du fichier)', `Adh.archiver('${id}',true)`),
      can('adm.params') ? b('Supprimer définitivement', `Adh.supprimer('${id}')`, 'red') : ''
    ].join(''), []);
  },
  emailInvalide(id, on) {
    const p = P.get(id);
    if (on) { p.emailInvalide = { date: todayISO(), email: p.email, par: ME.id }; log('Mail en erreur', P.full(p) + ' ' + p.email); UI.toast('Adresse signalée comme fausse. Elle apparaîtra dans le récapitulatif pour le national.'); }
    else { p.emailInvalide = null; log('Mail rétabli', P.full(p)); }
    P.touch(p); App.route();
  },
  archiver(id, on) { const p = P.get(id); p.archive = on ? todayISO() : null; P.touch(p); log(on ? 'Fiche archivée' : 'Fiche désarchivée', P.full(p)); App.route(); },
  async supprimer(id) {
    const p = P.get(id); if (!await UI.confirm(`Supprimer définitivement la fiche de <b>${esc(P.full(p))}</b> et tout son historique ?`, 'Supprimer')) return;
    D.personnes = D.personnes.filter(x => x.id !== id); log('Fiche supprimée', P.full(p)); save(); App.go('adherents');
  },
  supprItem(id, coll, itemId) { const p = P.get(id); p[coll] = p[coll].filter(x => x.id !== itemId); P.touch(p); App.route(); },
  natMailBody(p, extra) {
    const s = D.meta.syndicat;
    return `Bonjour,\n\n${extra}\n\nAdhérent : ${P.full(p)}${p.civilite ? ' (' + p.civilite + ')' : ''}\nN° adhérent : ${p.numAdherent || 'non connu'}\nDate de naissance : ${fmtDate(p.dateNaissance) || '-'}\nStatut : ${STATUT(p.statut)[1] || '-'}\nDiscipline : ${p.discipline ? p.discipline + ' ' + discLabel(p.discipline) : '-'}\nÉtablissement : ${P.etabs(p) || '-'}\nCourriel : ${p.email || '-'}\nTéléphone : ${p.telPortable || p.telFixe || '-'}\nAdresse : ${[p.adresse, p.cp, p.ville].filter(Boolean).join(' ') || '-'}\nDernière cotisation : ${P.derniere(p) || '-'}\n\nBien cordialement,\n\n${s.signature}`;
  },
  changementAcademie(id) {
    const p = P.get(id); const c = p.changementAcademie || {};
    UI.modal('Changement d\'académie', `<div class="frow"><div class="f"><label>Nouvelle académie</label><select id="ca_ac">${UI.opts(REF.academies.filter(a => a !== D.meta.syndicat.academie), c.nouvelle, '—')}</select></div>
      <div class="f"><label>Date d'effet</label><input type="date" id="ca_d" value="${c.date || todayISO()}"></div></div>
      <div class="f"><label>Nouvel établissement (si connu)</label><input id="ca_e" value="${esc(c.etab || '')}"></div>
      <label class="chk"><input type="checkbox" id="ca_arch" checked> Archiver la fiche après envoi (l'adhérent quitte notre fichier)</label>`,
      [{ label: 'Annuler' }, {
        label: 'Préparer le mail', onClick: m => {
          const nv = m.querySelector('#ca_ac').value; if (!nv) { UI.toast('Choisis l\'académie', 'r'); return false; }
          p.changementAcademie = { ancienne: p.academie || D.meta.syndicat.academie, nouvelle: nv, date: m.querySelector('#ca_d').value, etab: m.querySelector('#ca_e').value, archiver: m.querySelector('#ca_arch').checked, notifie: null };
          P.touch(p, ['academie']); log('Changement d\'académie', P.full(p) + ' → ' + nv);
          setTimeout(() => Adh.mailAcademie(id, 'change'), 50);
        }
      }]);
  },
  autreAcademie(id) {
    const p = P.get(id); const c = p.autreAcademie || {};
    UI.modal('Adhérent encore enregistré dans une autre académie', `<p class="small mut">Cas d'un collègue affecté dans notre académie mais toujours rattaché à une autre académie dans le fichier national.</p>
      <div class="f"><label>Académie où il est encore enregistré</label><select id="aa_ac">${UI.opts(REF.academies.filter(a => a !== D.meta.syndicat.academie), c.academie, '—')}</select></div>`,
      [{ label: 'Annuler' }, { label: 'Préparer le mail', onClick: m => { const a = m.querySelector('#aa_ac').value; if (!a) return false; p.autreAcademie = { academie: a, date: todayISO(), notifie: null }; P.touch(p); log('Rattachement à corriger', P.full(p) + ' (' + a + ')'); setTimeout(() => Adh.mailAcademie(id, 'autre'), 50); } }]);
  },
  mailAcademie(id, mode) {
    const p = P.get(id); const M = D.meta;
    let acad, subj, txt;
    if (mode === 'change') {
      const c = p.changementAcademie; acad = c.nouvelle;
      subj = `[SNETAA-FO] Changement d'académie — ${P.full(p)} (${c.ancienne} → ${c.nouvelle})`;
      txt = `Nous vous informons que notre adhérent(e) ci-dessous quitte l'académie ${c.ancienne} pour l'académie ${c.nouvelle}${c.date ? ' à compter du ' + fmtDate(c.date) : ''}${c.etab ? ' (affectation : ' + c.etab + ')' : ''}.\nMerci de mettre à jour le fichier et de le/la rattacher à la section académique ${c.nouvelle}.`;
    } else {
      const c = p.autreAcademie; acad = c.academie;
      subj = `[SNETAA-FO] Rattachement académique à corriger — ${P.full(p)} (${c.academie} → ${M.syndicat.academie})`;
      txt = `Notre adhérent(e) ci-dessous est désormais affecté(e) dans l'académie ${M.syndicat.academie}, mais figure encore dans le fichier de l'académie ${c.academie}.\nMerci de le/la rattacher à la section académique ${M.syndicat.academie}.`;
    }
    const to = [M.mailNational, M.mailsAcademies[acad]].filter(Boolean).join(',');
    const body = Adh.natMailBody(p, txt);
    UI.modal('Mail au national et à l\'académie', `${!M.mailNational ? '<div class="alert w">Adresse du national non renseignée : <a href="#/params" onclick="UI.close()">Paramètres</a>.</div>' : ''}${!M.mailsAcademies[acad] ? `<div class="alert w">Adresse de la section ${esc(acad)} non renseignée (Paramètres → Adresses des académies).</div>` : ''}
      <div class="f"><label>Destinataires</label><input id="ma_to" value="${esc(to)}"></div><div class="f"><label>Copie</label><input id="ma_cc" value="${esc(M.ccNational || '')}"></div><div class="f"><label>Objet</label><input id="ma_s" value="${esc(subj)}"></div><div class="f"><label>Message</label><textarea id="ma_b" style="min-height:260px">${esc(body)}</textarea></div>`,
      [{ label: 'Fermer' }, { label: 'Copier le texte', onClick: m => { copyText(m.querySelector('#ma_b').value); return false; } },
      {
        label: 'Ouvrir dans ma messagerie et marquer comme envoyé', onClick: m => {
          openLink(mailto(m.querySelector('#ma_to').value, m.querySelector('#ma_s').value, m.querySelector('#ma_b').value, m.querySelector('#ma_cc').value));
          if (mode === 'change') { p.changementAcademie.notifie = todayISO(); p.academie = p.changementAcademie.nouvelle; if (p.changementAcademie.archiver) p.archive = todayISO(); }
          else { p.autreAcademie.notifie = todayISO(); p.academie = M.syndicat.academie; }
          p.interventions.push({ id: uid(), date: todayISO(), type: 'Adhésion / cotisation', canal: 'mail', objet: m.querySelector('#ma_s').value, detail: 'Signalement envoyé au national' + (M.mailsAcademies[acad] ? ' et à la section ' + acad : ''), auteur: ME.id });
          P.touch(p); log('Signalement académie envoyé', P.full(p)); App.route();
        }
      }], { wide: true });
  },

  /* ---------- Édition ---------- */
  edit(id, preset) {
    const p = id ? P.get(id) : P.nouveau(Object.assign({ categorie: 'adherent', ajoutManuel: true }, preset || {}));
    const isNew = !id;
    const etabList = `<datalist id="dl_etabs">${D.etablissements.map(e => `<option value="${esc(e.uai)}">${esc(e.nom + ' — ' + (e.ville || ''))}</option>`).join('')}</datalist>`;
    const aff = p.affectations.length ? p.affectations : [{ uai: '', nom: '', ville: '', principal: true }];
    const affRow = (a, i) => `<div class="frow affrow" style="align-items:end"><div class="f"><label>UAI (RNE)</label><input class="a_uai" list="dl_etabs" value="${esc(a.uai || '')}" onchange="Adh.fillEtab(this)"></div><div class="f"><label>Établissement</label><input class="a_nom" value="${esc(a.nom || '')}"></div><div class="f"><label>Ville</label><input class="a_ville" value="${esc(a.ville || '')}"></div><div class="f"><label>Quotité / précision</label><input class="a_q" value="${esc(a.quotite || '')}"></div><div class="f"><label class="chk"><input type="radio" name="a_pr" class="a_pr" ${a.principal ? 'checked' : ''}> principal</label><button type="button" class="btn sm ghost" onclick="this.closest('.affrow').remove()">Retirer</button></div></div>`;
    const html = `${etabList}<div class="frow">
      <div class="f"><label>Catégorie</label><select id="e_cat">${UI.opts(Object.entries(REF.categories), p.categorie)}</select></div>
      <div class="f"><label>Civilité</label><select id="e_civ">${UI.opts(['Mme', 'M.'], p.civilite, '—')}</select></div>
      <div class="f"><label>Nom *</label><input id="e_nom" value="${esc(p.nom)}"></div><div class="f"><label>Prénom</label><input id="e_prenom" value="${esc(p.prenom)}"></div></div>
      <div class="frow"><div class="f"><label>Nom de naissance</label><input id="e_nn" value="${esc(p.nomNaissance || '')}"></div><div class="f"><label>Date de naissance</label><input type="date" id="e_dn" value="${esc(p.dateNaissance || '')}"></div><div class="f"><label>N° adhérent</label><input id="e_num" value="${esc(p.numAdherent || '')}"></div></div>
      <h3>Contact</h3><div class="frow"><div class="f"><label>Courriel personnel</label><input id="e_mail" type="email" value="${esc(p.email || '')}"></div><div class="f"><label>Courriel académique</label><input id="e_mailpro" value="${esc(p.emailPro || '')}"></div><div class="f"><label>Portable</label><input id="e_tel" inputmode="tel" value="${esc(p.telPortable || '')}"></div><div class="f"><label>Fixe</label><input id="e_fixe" value="${esc(p.telFixe || '')}"></div></div>
      <div class="frow"><div class="f" style="grid-column:span 2"><label>Adresse</label><input id="e_adr" value="${esc(p.adresse || '')}"></div><div class="f"><label>Code postal</label><input id="e_cp" value="${esc(p.cp || '')}"></div><div class="f"><label>Ville</label><input id="e_ville" value="${esc(p.ville || '')}"></div></div>
      <h3>Situation</h3><div class="frow"><div class="f"><label>Statut / fonction</label><select id="e_st" onchange="document.getElementById('e_discw').style.display=(REF.statuts.find(s=>s[0]===this.value)||[0,0,1])[2]?'':'none'">${UI.opts(REF.statuts.map(s => [s[0], s[1]]), p.statut, '—')}</select></div>
      <div class="f" id="e_discw" style="${p.statut && !STATUT(p.statut)[2] ? 'display:none' : ''}"><label>Discipline (code)</label><input id="e_disc" list="dl_disc" value="${esc(p.discipline || '')}" placeholder="ex. P4100"><datalist id="dl_disc">${D.disciplines.map(d => `<option value="${esc(d[0])}">${esc(d[1])}</option>`).join('')}</datalist></div>
      <div class="f"><label>Académie</label><select id="e_acad">${UI.opts(REF.academies, p.academie || D.meta.syndicat.academie)}</select></div>
      <div class="f"><label>Militant référent</label><select id="e_mil">${UI.militantsOpts(p.militant, '—')}</select></div></div>
      ${Carriere.champs(p)}
      <h3>Affectation(s)</h3><div id="e_affs">${aff.map(affRow).join('')}</div><button type="button" class="btn sm sec" onclick="document.getElementById('e_affs').insertAdjacentHTML('beforeend',Adh._affRow({},9))">+ Ajouter un établissement</button>
      <h3>Adhésion</h3><div class="frow"><div class="f"><label>Calendrier d'adhésion</label><select id="e_cal">${UI.opts([['scolaire', 'Scolaire (1er sept. - 31 août)'], ['civil', 'Civil (1er janv. - 31 déc.) — ex-FO']], p.calendrier)}</select></div><div class="f"><label>Date de première adhésion</label><input type="date" id="e_dpa" value="${esc(p.datePremiereAdhesion || '')}"></div></div>
      ${isNew && can('adh.national') ? `<label class="chk"><input type="checkbox" id="e_autre" onchange="document.getElementById('e_autrew').style.display=this.checked?'':'none'"> Officiellement dans notre académie mais encore enregistré dans une autre académie</label><div class="f" id="e_autrew" style="display:none"><select id="e_autreac">${UI.opts(REF.academies.filter(a => a !== D.meta.syndicat.academie), '', '— académie d\'origine —')}</select></div>` : ''}
      <div class="f"><label>Notes</label><textarea id="e_notes">${esc(p.notes || '')}</textarea></div>`;
    Adh._affRow = affRow;
    UI.modal(isNew ? 'Nouvelle fiche' : 'Modifier la fiche', html, [{ label: 'Annuler' }, { label: 'Enregistrer', onClick: m => Adh.saveEdit(m, p, isNew) }], { wide: true });
  },
  fillEtab(inp) {
    const e = D.etablissements.find(x => x.uai === normUAI(inp.value)); if (!e) return;
    const row = inp.closest('.affrow'); inp.value = e.uai; row.querySelector('.a_nom').value = e.nom; row.querySelector('.a_ville').value = e.ville || '';
  },
  saveEdit(m, p, isNew) {
    const g = s => (m.querySelector(s) || {}).value || '';
    if (!g('#e_nom').trim()) { UI.toast('Le nom est obligatoire', 'r'); return false; }
    const before = {}; Adh.FIELDS.forEach(([f]) => before[f] = Adh.val(p, f));
    Object.assign(p, {
      categorie: g('#e_cat'), civilite: g('#e_civ'), nom: g('#e_nom').trim().toUpperCase(), prenom: cap(g('#e_prenom').trim()), nomNaissance: g('#e_nn').trim().toUpperCase(), dateNaissance: g('#e_dn'), numAdherent: g('#e_num').trim(),
      email: normEmail(g('#e_mail')), emailPro: normEmail(g('#e_mailpro')), telPortable: normPhone(g('#e_tel')), telFixe: normPhone(g('#e_fixe')), adresse: g('#e_adr').trim(), cp: normCP(g('#e_cp')), ville: g('#e_ville').trim().toUpperCase(),
      statut: g('#e_st'), discipline: (STATUT(g('#e_st'))[2] || !g('#e_st')) ? g('#e_disc').trim().toUpperCase() : '', academie: g('#e_acad'), militant: g('#e_mil'), calendrier: g('#e_cal'), datePremiereAdhesion: g('#e_dpa'), notes: g('#e_notes')
    });
    Carriere.lire(m, p);
    if (p.emailInvalide && p.emailInvalide.email !== p.email) p.emailInvalide = null;
    p.affectations = $$('.affrow', m).map(r => ({ uai: normUAI(r.querySelector('.a_uai').value), nom: r.querySelector('.a_nom').value.trim(), ville: r.querySelector('.a_ville').value.trim().toUpperCase(), quotite: r.querySelector('.a_q').value.trim(), principal: r.querySelector('.a_pr').checked })).filter(a => a.uai || a.nom);
    if (p.affectations.length && !p.affectations.some(a => a.principal)) p.affectations[0].principal = true;
    const changed = Adh.FIELDS.map(f => f[0]).filter(f => before[f] !== Adh.val(p, f));
    if (isNew) { D.personnes.push(p); log('Nouvelle fiche', P.full(p)); }
    else log('Fiche modifiée', P.full(p) + (changed.length ? ' (' + changed.join(', ') + ')' : ''));
    P.touch(p, changed);
    const autre = m.querySelector('#e_autre');
    if (autre && autre.checked && g('#e_autreac')) { p.autreAcademie = { academie: g('#e_autreac'), date: todayISO(), notifie: null }; setTimeout(() => Adh.mailAcademie(p.id, 'autre'), 80); }
    UI.toast('Fiche enregistrée', 'g');
    setTimeout(() => isNew ? App.go('fiche/' + p.id) : App.route(), 30);
  },
  intervention(pid, iid) {
    const p = P.get(pid); const it = iid ? p.interventions.find(x => x.id === iid) : { date: todayISO(), canal: 'tel', statut: 'terminée' };
    UI.modal(iid ? 'Modifier l\'intervention' : 'Nouvelle intervention', `<div class="frow"><div class="f"><label>Date</label><input type="date" id="i_d" value="${esc(it.date)}"></div><div class="f"><label>Type</label><select id="i_t">${UI.opts(REF.typesIntervention, it.type)}</select></div><div class="f"><label>Canal</label><select id="i_c">${UI.opts(REF.canaux, it.canal)}</select></div><div class="f"><label>Suivi</label><select id="i_s">${UI.opts(['terminée', 'en cours'], it.statut)}</select></div></div>
      <div class="f"><label>Objet</label><input id="i_o" value="${esc(it.objet || '')}"></div><div class="f"><label>Détail / suite donnée</label><textarea id="i_x" style="min-height:160px">${esc(it.detail || '')}</textarea></div>`,
      [{ label: 'Annuler' }, {
        label: 'Enregistrer', onClick: m => {
          Object.assign(it, { date: m.querySelector('#i_d').value, type: m.querySelector('#i_t').value, canal: m.querySelector('#i_c').value, statut: m.querySelector('#i_s').value, objet: m.querySelector('#i_o').value, detail: m.querySelector('#i_x').value });
          if (!iid) { it.id = uid(); it.auteur = ME.id; p.interventions.push(it); }
          P.touch(p); log('Intervention', P.full(p) + ' — ' + it.type); Adh.tab = 'hist'; App.route();
        }
      }], { wide: true });
  },

  /* ---------- Archivage de messages (mail, SMS, WhatsApp) ---------- */
  importMessage(pid) {
    const p = P.get(pid);
    UI.modal('Archiver un message dans la fiche', `<p class="small mut">Colle le texte d'un mail, d'un SMS ou d'une conversation WhatsApp, ou charge un fichier : mail enregistré (.eml), export WhatsApp (.txt), PDF ou image (capture d'écran).</p>
      <div class="frow"><div class="f"><label>Canal</label><select id="m_c">${UI.opts([['mail', 'Mail'], ['sms', 'SMS'], ['wa', 'WhatsApp'], ['autre', 'Autre']], 'mail')}</select></div><div class="f"><label>Sens</label><select id="m_s">${UI.opts([['recu', 'Reçu'], ['envoye', 'Envoyé']], 'recu')}</select></div><div class="f"><label>Date</label><input type="datetime-local" id="m_d" value="${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}"></div></div>
      <div class="frow"><div class="f"><label>De / à</label><input id="m_de" value="${esc(p.email || p.telPortable || '')}"></div><div class="f"><label>Objet</label><input id="m_o"></div></div>
      <div class="f"><label>Contenu</label><textarea id="m_x" style="min-height:200px"></textarea></div>
      <p><button class="btn sec sm" onclick="Adh.loadMsgFile()">📂 Charger un fichier (.eml, .txt, .pdf, image)</button> <span id="m_pj" class="small mut"></span></p>`,
      [{ label: 'Annuler' }, {
        label: 'Archiver', onClick: m => {
          const x = m.querySelector('#m_x').value.trim(); if (!x && !Adh._pj) { UI.toast('Message vide', 'r'); return false; }
          p.messages.push({ id: uid(), canal: m.querySelector('#m_c').value, sens: m.querySelector('#m_s').value, date: m.querySelector('#m_d').value, de: m.querySelector('#m_de').value, objet: m.querySelector('#m_o').value, contenu: x, pj: Adh._pj || null, par: ME.id });
          Adh._pj = null; P.touch(p); log('Message archivé', P.full(p)); Adh.tab = 'hist'; App.route();
        }
      }], { wide: true });
    Adh._pj = null;
  },
  async loadMsgFile() {
    const f = await pickFile('.eml,.txt,.pdf,.png,.jpg,.jpeg,.webp,.heic'); if (!f) return;
    if (/\.eml$/i.test(f.name)) {
      const e = Adh.parseEML(decodeText(await readFile(f)));
      $('#m_c').value = 'mail'; $('#m_o').value = e.subject; $('#m_de').value = e.from; $('#m_x').value = e.text;
      if (e.date) { const d = new Date(e.date); if (!isNaN(d)) $('#m_d').value = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
    } else if (/\.txt$/i.test(f.name)) {
      const t = decodeText(await readFile(f)); const wa = Adh.parseWhatsApp(t);
      if (wa.n) { $('#m_c').value = 'wa'; $('#m_x').value = wa.text; $('#m_o').value = 'Conversation WhatsApp (' + wa.n + ' messages)'; if (wa.first) $('#m_d').value = wa.first + 'T00:00'; }
      else $('#m_x').value = t;
    } else {
      if (f.size > 3 * 1024 * 1024) return UI.toast('Fichier trop lourd (3 Mo maximum)', 'r');
      Adh._pj = { nom: f.name, data: await readFile(f, 'dataurl') }; $('#m_pj').textContent = '📎 ' + f.name + ' joint';
    }
  },
  decodeWords(s) {
    return String(s || '').replace(/=\?([^?]+)\?([QBqb])\?([^?]*)\?=/g, (m, cs, enc, txt) => {
      try {
        let bytes;
        if (enc.toUpperCase() === 'B') bytes = Crypto.unb64(txt);
        else { const t = txt.replace(/_/g, ' '); const arr = []; for (let i = 0; i < t.length; i++) { if (t[i] === '=' && /^[0-9A-F]{2}$/i.test(t.substr(i + 1, 2))) { arr.push(parseInt(t.substr(i + 1, 2), 16)); i += 2; } else arr.push(t.charCodeAt(i)); } bytes = new Uint8Array(arr); }
        return new TextDecoder(cs).decode(bytes);
      } catch (e) { return txt; }
    }).replace(/\?=\s+=\?/g, '');
  },
  parseEML(raw) {
    const split = s => { const i = s.search(/\r?\n\r?\n/); return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i).replace(/^\r?\n\r?\n/, '')]; };
    const headers = h => { const o = {}; h.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/).forEach(l => { const i = l.indexOf(':'); if (i > 0) o[l.slice(0, i).toLowerCase().trim()] = l.slice(i + 1).trim(); }); return o; };
    const decodeBody = (body, hd) => {
      const enc = (hd['content-transfer-encoding'] || '').toLowerCase(); const cs = ((hd['content-type'] || '').match(/charset="?([^";]+)/i) || [])[1] || 'utf-8';
      let bytes;
      if (enc === 'base64') { try { bytes = Crypto.unb64(body.replace(/\s/g, '')); } catch (e) { return body; } }
      else if (enc === 'quoted-printable') { const t = body.replace(/=\r?\n/g, ''); const a = []; for (let i = 0; i < t.length; i++) { if (t[i] === '=' && /^[0-9A-F]{2}$/i.test(t.substr(i + 1, 2))) { a.push(parseInt(t.substr(i + 1, 2), 16)); i += 2; } else a.push(t.charCodeAt(i) & 255); } bytes = new Uint8Array(a); }
      else return body;
      try { return new TextDecoder(cs).decode(bytes); } catch (e) { return new TextDecoder('utf-8').decode(bytes); }
    };
    const findText = (hd, body) => {
      const ct = hd['content-type'] || 'text/plain';
      const bnd = (ct.match(/boundary="?([^";]+)"?/i) || [])[1];
      if (/multipart/i.test(ct) && bnd) {
        const parts = body.split('--' + bnd).slice(1).filter(x => !/^--/.test(x));
        let html = '';
        for (const part of parts) {
          const [ph, pb] = split(part.replace(/^\r?\n/, '')); const phd = headers(ph);
          const r = findText(phd, pb); if (r.plain) return r; if (r.html && !html) html = r.html;
        }
        return { html };
      }
      if (/text\/html/i.test(ct)) return { html: decodeBody(body, hd) };
      return { plain: decodeBody(body, hd) };
    };
    const [h, b] = split(raw); const hd = headers(h);
    const r = findText(hd, b);
    let text = r.plain || (r.html ? new DOMParser().parseFromString(r.html, 'text/html').body.innerText : '');
    return { from: Adh.decodeWords(hd.from), to: Adh.decodeWords(hd.to), subject: Adh.decodeWords(hd.subject), date: hd.date, text: text.trim() };
  },
  parseWhatsApp(t) {
    const re = /^\[?(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})[,\s]+(\d{1,2}:\d{2})(?::\d{2})?\]?\s*[-–]?\s*([^:]{1,60}):\s?(.*)$/;
    let n = 0, first = ''; const out = [];
    t.split(/\r?\n/).forEach(l => { const m = l.match(re); if (m) { n++; let y = +m[3]; if (y < 100) y += 2000; const iso = y + '-' + pad2(m[2]) + '-' + pad2(m[1]); if (!first) first = iso; out.push(`[${fmtDate(iso)} ${m[4]}] ${m[5].trim()} : ${m[6]}`); } else if (out.length) out[out.length - 1] += '\n' + l; });
    return { n, first, text: out.join('\n') };
  }
};
App.routes.adherents = () => Adh.page();
App.routes.fiche = id => Adh.fiche(id);

/* ---------- Cotisations & relances ---------- */
const Cotis = {
  f: 'retard',
  page() {
    const vis = P.visibles().filter(p => p.categorie === 'adherent');
    const by = k => vis.filter(p => P.cotis(p) === k);
    const l = Cotis.f === 'tous' ? vis : Cotis.f === 'carriere' ? Carriere.manquants(vis) : by(Cotis.f);
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Cotisations & relances</h1><div class="mut small">Période scolaire en cours : ${P.periode('scolaire')} · période civile (ex-FO) : ${P.periode('civil')}</div></div></div>
      <div class="tiles"><div class="tile g" onclick="Cotis.f='ajour';Cotis.page()"><div class="n">${by('ajour').length}</div><div class="l">à jour</div></div><div class="tile o" onclick="Cotis.f='retard';Cotis.page()"><div class="n">${by('retard').length}</div><div class="l">à relancer (payé l'an dernier)</div></div><div class="tile b" onclick="Cotis.f='ancien';Cotis.page()"><div class="n">${by('ancien').length}</div><div class="l">anciens adhérents</div></div><div class="tile" onclick="Cotis.f='inconnu';Cotis.page()"><div class="n">${by('inconnu').length}</div><div class="l">cotisation inconnue</div></div><div class="tile v" onclick="Cotis.f='tous';Cotis.page()"><div class="n">${vis.filter(p => p.calendrier === 'civil').length}</div><div class="l">au calendrier civil</div></div><div class="tile o" onclick="Cotis.f='carriere';Cotis.page()"><div class="n">${Carriere.manquants(vis).length}</div><div class="l">classe / échelon à compléter</div></div></div>
      <div class="toolbar"><b>${plural(l.length, 'personne')}</b> <span id="selinfo" class="small mut"></span>
        ${can('com.envoyer') ? `<button class="btn sm" onclick="Comm.envoyerSelection(Cotis.ids(),null,'relance-cotis')">✉ Relancer (mail / SMS type)</button>` : ''}
        <button class="btn sm sec" onclick="Cotis.bulkPaye(Cotis.ids())">€ Marquer comme payée</button>
        <button class="btn sm sec" onclick="exportXLSX('cotisations_${todayISO()}.xlsx',{Liste:Cotis.ids().map(id=>Adh.row(P.get(id)))})">Exporter</button></div>
      <div class="tablewrap"><table><thead><tr><th><input type="checkbox" onclick="UI.selAll(Cotis._ids,this.checked)"></th><th>Nom</th><th>Établissement</th><th>Calendrier</th><th>Dernière cotisation</th><th>Situation</th><th>Carrière</th><th class="num">Cotisation attendue</th><th>Ancienneté</th></tr></thead><tbody>
      ${l.slice(0, 1000).map(p => `<tr class="click" onclick="if(event.target.type!=='checkbox')App.go('fiche/${p.id}')"><td><input type="checkbox" class="rowsel" onchange="UI.selToggle('${p.id}',this.checked)"></td><td><b>${esc(P.full(p))}</b></td><td>${esc(P.etab(p))}</td><td>${p.calendrier === 'civil' ? 'civil' : 'scolaire'}</td><td>${esc(P.derniere(p))}</td><td>${P.cotisTag(p)}</td><td class="small">${esc(Carriere.resume(p)) || '<span class="tag w">à compléter</span>'}</td><td class="num">${Carriere.montant(p) ? fmtEUR(Carriere.montant(p)) : ''}</td><td class="small">${esc(P.anciennete(p))}</td></tr>`).join('')}</tbody></table></div>`;
    Cotis._ids = l.map(p => p.id); Cotis._all = Cotis._ids;
  },
  ids() { return UI.sel.size ? Array.from(UI.sel) : Cotis._all || []; },
  ajouter(pid) {
    const p = P.get(pid);
    UI.modal('Enregistrer une cotisation', `<div class="frow"><div class="f"><label>Période</label><input id="c_p" value="${P.periode(p.calendrier)}"></div><div class="f"><label>Date de paiement</label><input type="date" id="c_d" value="${todayISO()}"></div><div class="f"><label>Montant (€)</label><input id="c_m" inputmode="decimal" value="${Carriere.montant(p) ? String(Carriere.montant(p)).replace('.', ',') : ''}"></div><div class="f"><label>Mode</label><select id="c_mo">${UI.opts(REF.modesPaiement, 'Prélèvement')}</select></div></div><p class="small mut">Format de période : « 2026-2027 » (scolaire, sept.-août) ou « 2026 » (civil, janv.-déc.). Un adhérent peut passer d'un calendrier à l'autre : le calendrier de la fiche suit automatiquement la dernière cotisation.</p>`,
      [{ label: 'Annuler' }, { label: 'Enregistrer', onClick: m => { const per = P.normPeriode(m.querySelector('#c_p').value, p.calendrier); if (!per) { UI.toast('Période invalide', 'r'); return false; } p.cotisations.push({ id: uid(), periode: per, date: m.querySelector('#c_d').value, montant: num(m.querySelector('#c_m').value), mode: m.querySelector('#c_mo').value, source: 'saisie' }); P.syncCal(p); P.touch(p); log('Cotisation', P.full(p) + ' ' + per); App.route(); } }]);
  },
  suppr(pid, cid) { const p = P.get(pid); p.cotisations = p.cotisations.filter(c => c.id !== cid); P.touch(p); App.route(); },
  bulkPaye(ids) {
    UI.modal('Cotisation payée', `<p>${plural(ids.length, 'adhérent')} : enregistrer la cotisation de la période en cours (selon le calendrier de chacun).</p><div class="frow"><div class="f"><label>Date</label><input type="date" id="b_d" value="${todayISO()}"></div><div class="f"><label>Mode</label><select id="b_m">${UI.opts(REF.modesPaiement, 'Prélèvement')}</select></div></div>`,
      [{ label: 'Annuler' }, { label: 'Enregistrer', onClick: m => { ids.map(P.get).filter(p => p && p.categorie === 'adherent').forEach(p => { const per = P.periode(p.calendrier); if (!p.cotisations.some(c => c.periode === per)) p.cotisations.push({ id: uid(), periode: per, date: m.querySelector('#b_d').value, mode: m.querySelector('#b_m').value, montant: Carriere.montant(p) || 0, source: 'saisie groupée' }); P.touch(p); }); log('Cotisations groupées', plural(ids.length, 'fiche')); App.route(); } }]);
  }
};
App.routes.cotisations = () => Cotis.page();

/* ---------- Récapitulatif des différences pour le national ---------- */
const National = {
  page() {
    const l = D.personnes.map(Adh.aSignaler).filter(Boolean);
    const M = D.meta;
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Différences à signaler au national</h1><div class="mut small">Comparaison entre les fiches corrigées dans l'application et le dernier fichier importé${D.lastSnapshot ? ' (' + fmtDT(D.lastSnapshot.date) + ', ' + esc(D.lastSnapshot.fichier || '') + ')' : ''}.</div></div>
      <div class="actions"><button class="btn sec" onclick="National.exporter()">Exporter le récapitulatif (Excel)</button><button class="btn" onclick="National.mail()">✉ Préparer le mail au national</button></div></div>
      ${!D.lastSnapshot ? '<div class="alert w">Aucun fichier national importé pour l\'instant : seules les fiches ajoutées à la main, les changements d\'académie et les mails en erreur apparaissent.</div>' : ''}
      ${!M.mailNational ? '<div class="alert w">L\'adresse du national n\'est pas renseignée : <a href="#/params">Paramètres</a>.</div>' : ''}
      <p><b>${plural(l.length, 'fiche')}</b> à signaler.</p>
      <div class="tablewrap"><table><thead><tr><th>Adhérent</th><th>Nature</th><th>Fichier national</th><th>Valeur corrigée</th></tr></thead><tbody>
      ${l.map(r => {
      const rows = [];
      if (r.nouveau) rows.push(['Adhérent absent du fichier national', '', 'à créer']);
      if (r.autreAcad) rows.push(['Encore enregistré à ' + r.autreAcad.academie, r.autreAcad.academie, D.meta.syndicat.academie]);
      if (r.academie) rows.push(['Changement d\'académie', r.academie.ancienne, r.academie.nouvelle]);
      if (r.email) rows.push(['Adresse mail en erreur', r.p.emailInvalide.email || r.p.email, 'adresse à vérifier']);
      r.diffs.forEach(d => rows.push([d.l, d.avant, d.apres]));
      return rows.map((x, i) => `<tr>${i === 0 ? `<td rowspan="${rows.length}"><a href="#/fiche/${r.p.id}"><b>${esc(P.full(r.p))}</b></a><br><span class="small mut">${esc(r.p.numAdherent || '')}</span></td>` : ''}<td>${esc(x[0])}</td><td><span class="diffold">${esc(x[1])}</span></td><td><span class="diffnew">${esc(x[2])}</span></td></tr>`).join('');
    }).join('') || '<tr><td colspan="4" class="mut">Rien à signaler 👍</td></tr>'}
      </tbody></table></div>
      ${l.length ? `<p><button class="btn ok" onclick="National.marquer()">✓ Marquer tout comme signalé au national</button> <span class="small mut">(à faire après l'envoi : ces différences ne réapparaîtront plus, sauf nouvelle modification)</span></p>` : ''}`;
  },
  lignes() {
    const out = [];
    D.personnes.map(Adh.aSignaler).filter(Boolean).forEach(r => {
      const base = { 'N° adhérent': r.p.numAdherent || '', Nom: r.p.nom, Prénom: r.p.prenom, 'Date de naissance': fmtDate(r.p.dateNaissance) };
      if (r.nouveau) out.push(Object.assign({}, base, { Nature: 'Nouvel adhérent à créer', 'Valeur actuelle (fichier national)': '', 'Valeur corrigée': [STATUT(r.p.statut)[1], r.p.discipline, P.etabs(r.p), r.p.email, r.p.telPortable].filter(Boolean).join(' / ') }));
      if (r.autreAcad) out.push(Object.assign({}, base, { Nature: 'Rattachement académique', 'Valeur actuelle (fichier national)': r.autreAcad.academie, 'Valeur corrigée': D.meta.syndicat.academie }));
      if (r.academie) out.push(Object.assign({}, base, { Nature: 'Changement d\'académie', 'Valeur actuelle (fichier national)': r.academie.ancienne, 'Valeur corrigée': r.academie.nouvelle + (r.academie.date ? ' au ' + fmtDate(r.academie.date) : '') }));
      if (r.email) out.push(Object.assign({}, base, { Nature: 'Adresse mail en erreur', 'Valeur actuelle (fichier national)': r.p.emailInvalide.email || '', 'Valeur corrigée': r.p.email !== r.p.emailInvalide.email ? r.p.email : 'à vérifier' }));
      const lib = (f, v) => f === 'statut' ? STATUT(v)[1] : f === 'classe' ? Carriere.classe(v) : f === 'datePromo' ? fmtDate(v) : v;
      r.diffs.forEach(d => out.push(Object.assign({}, base, { Nature: d.l, 'Valeur actuelle (fichier national)': lib(d.f, d.avant), 'Valeur corrigée': lib(d.f, d.apres) })));
    });
    return out;
  },
  exporter() { const l = National.lignes(); exportXLSX(`SNETAA-FO_${D.meta.syndicat.academie.replace(/\W/g, '')}_mises-a-jour_${todayISO()}.xlsx`, { 'Mises à jour': l }); log('Export récapitulatif national', plural(l.length, 'ligne')); },
  mail() {
    const l = National.lignes(); const n = new Set(l.map(x => x.Nom + x.Prénom)).size; const M = D.meta;
    const body = `Bonjour,\n\nVeuillez trouver ci-joint le récapitulatif des mises à jour du fichier des adhérents de l'académie ${M.syndicat.academie} (${plural(n, 'adhérent')}, ${plural(l.length, 'modification')}), établi le ${fmtDate(todayISO())}.\n\nEn résumé :\n${l.slice(0, 40).map(x => `- ${x.Nom} ${x.Prénom} : ${x.Nature} → ${x['Valeur corrigée']}`).join('\n')}${l.length > 40 ? '\n- … (voir le fichier joint)' : ''}\n\nMerci de bien vouloir mettre à jour le fichier national.\n\nBien cordialement,\n\n${M.syndicat.signature}`;
    UI.modal('Mail au national', `<div class="alert">1) Exporte le récapitulatif Excel · 2) ouvre le mail · 3) joins le fichier exporté · 4) envoie, puis « Marquer tout comme signalé ».</div>
      <div class="f"><label>À</label><input id="n_to" value="${esc(M.mailNational)}"></div><div class="f"><label>Objet</label><input id="n_s" value="[SNETAA-FO] ${esc(M.syndicat.academie)} — mises à jour du fichier adhérents (${fmtDate(todayISO())})"></div><div class="f"><label>Message</label><textarea id="n_b" style="min-height:280px">${esc(body)}</textarea></div>`,
      [{ label: 'Fermer' }, { label: 'Exporter le fichier', onClick: () => { National.exporter(); return false; } }, { label: 'Copier', onClick: m => { copyText(m.querySelector('#n_b').value); return false; } }, { label: 'Ouvrir dans ma messagerie', onClick: m => { openLink(mailto(m.querySelector('#n_to').value, m.querySelector('#n_s').value, m.querySelector('#n_b').value, M.ccNational)); return false; } }], { wide: true });
  },
  async marquer() {
    if (!await UI.confirm('Considérer toutes ces différences comme transmises au national ?', 'Oui, c\'est envoyé')) return;
    D.personnes.forEach(p => {
      const r = Adh.aSignaler(p); if (!r) return;
      r.diffs.forEach(d => p.signale[d.f] = d.apres);
      if (r.nouveau) p.signale.__nouveau = todayISO();
      if (r.email) p.emailInvalide.signale = todayISO();
      if (r.academie) { p.changementAcademie.notifie = todayISO(); if (p.changementAcademie.archiver) p.archive = todayISO(); }
      if (r.autreAcad) p.autreAcademie.notifie = todayISO();
    });
    log('Récapitulatif transmis au national'); save(); App.refresh();
  }
};
App.routes.national = () => National.page();

/* ---------- Demande de mise à jour par l'adhérent ---------- */
const MajAdh = {
  CHAMPS: [['classe', 'Classe (normale, hors classe, exceptionnelle)'], ['echelon', 'Échelon'], ['indice', 'Indice majoré (bulletin de salaire)'], ['nom', 'Nom'], ['prenom', 'Prénom'], ['nomNaissance', 'Nom de naissance'], ['dateNaissance', 'Date de naissance'], ['email', 'Courriel personnel'], ['telPortable', 'Téléphone portable'], ['adresse', 'Adresse'], ['cp', 'Code postal'], ['ville', 'Ville'], ['statut', 'Statut'], ['discipline', 'Discipline'], ['etab', 'Établissement d\'affectation'], ['etab2', 'Autre établissement (si service partagé)']],
  valeur(p, f) {
    if (f === 'dateNaissance') return fmtDate(p.dateNaissance);
    if (f === 'statut') return STATUT(p.statut)[1];
    if (f === 'classe') return Carriere.classe(p.classe);
    if (f === 'discipline') return p.discipline ? p.discipline + ' ' + discLabel(p.discipline) : '';
    if (f === 'etab') { const a = p.affectations.find(x => x.principal) || p.affectations[0]; return a ? [a.nom, a.ville, a.uai].filter(Boolean).join(' - ') : ''; }
    if (f === 'etab2') { const a = p.affectations.filter(x => !x.principal)[0]; return a ? [a.nom, a.ville, a.uai].filter(Boolean).join(' - ') : ''; }
    return p[f] || '';
  },
  bloc(p) { return `===== VOS INFORMATIONS — Réf. SNETAA-OT #${p.id} =====\n` + MajAdh.CHAMPS.map(([f, l]) => `${l} : ${MajAdh.valeur(p, f)}`).join('\n') + `\n===== FIN =====`; },
  texte(p) {
    const s = D.meta.syndicat;
    return `Bonjour ${p.prenom || ''},\n\nAfin que nous puissions vous informer et vous défendre au mieux, nous mettons à jour notre fichier. Voici les informations dont nous disposons vous concernant.\n\nMerci de répondre simplement à ce mail en corrigeant directement les lignes ci-dessous (sans modifier les lignes « ===== » ni la référence), puis de nous le renvoyer.\n\n${MajAdh.bloc(p)}\n\nCes informations sont réservées à l'usage du SNETAA-FO et ne sont transmises à personne d'autre.\n\nBien syndicalement,\n\n${s.signature}`;
  },
  sujet() { return '[SNETAA-FO] Vos coordonnées sont-elles à jour ?'; },
  page() {
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Mise à jour des informations par l'adhérent</h1><div class="mut small">On envoie à l'adhérent les données dont on dispose ; il corrige et répond ; on colle sa réponse ici pour mettre à jour la fiche.</div></div></div>
    <div class="grid g2"><div class="card"><h2 style="margin-top:0">1. Envoyer les demandes</h2><p>Depuis le <a href="#/adherents">fichier adhérents</a>, sélectionne des personnes puis « Mail / SMS type », ou utilise les boutons ci-dessous :</p>
      <p><button class="btn" onclick="MajAdh.demande(Adh.filtered().filter(p=>p.email&&!p.emailInvalide).map(p=>p.id))">Préparer pour la liste filtrée actuelle</button></p>
      <p><button class="btn sec" onclick="MajAdh.publipostage(Adh.filtered().filter(p=>p.email&&!p.emailInvalide).map(p=>p.id))">Fichier de publipostage (Thunderbird Mail Merge)</button></p>
      <p class="small mut">Le publipostage produit un CSV avec une colonne « Texte » par adhérent. Dans Thunderbird avec l'extension <i>Mail Merge</i>, écris un mail dont le corps est {{Texte}} et dont le destinataire est {{Email}}.</p></div>
    <div class="card"><h2 style="margin-top:0">2. Intégrer une réponse</h2><p>Copie tout le mail de réponse de l'adhérent (ou seulement le bloc « VOS INFORMATIONS ») et colle-le ici :</p>
      <textarea id="maj_rep" style="min-height:220px" placeholder="Colle ici le mail de réponse…"></textarea><p><button class="btn" onclick="MajAdh.analyser($('#maj_rep').value)">Analyser la réponse</button></p></div></div>`;
  },
  demande(ids) {
    const l = ids.map(P.get).filter(p => p && p.email);
    if (!l.length) return UI.toast('Aucune personne avec une adresse mail valide', 'r');
    UI.modal(`Demandes de mise à jour (${l.length})`, `<p class="small mut">Clique sur chaque ligne pour ouvrir le mail prérempli dans ta messagerie. Pour un envoi en nombre, utilise le publipostage.</p>
      <div class="tablewrap" style="max-height:55vh"><table><tbody>${l.map(p => `<tr><td><b>${esc(P.full(p))}</b><br><span class="small mut">${esc(p.email)}</span></td><td class="right"><button class="btn sm" onclick="MajAdh.envoyer('${p.id}');this.textContent='✓ ouvert'">Ouvrir le mail</button> <button class="btn sm sec" onclick="copyText(MajAdh.texte(P.get('${p.id}')))">Copier</button></td></tr>`).join('')}</tbody></table></div>`,
      [{ label: 'Publipostage (CSV)', onClick: () => { MajAdh.publipostage(l.map(p => p.id)); return false; } }, { label: 'Fermer' }], { wide: true });
  },
  envoyer(id) {
    const p = P.get(id); openLink(mailto(p.email, MajAdh.sujet(), MajAdh.texte(p)));
    p.majDemandee = todayISO(); p.messages.push({ id: uid(), canal: 'mail', sens: 'envoye', date: new Date().toISOString().slice(0, 16), de: p.email, objet: MajAdh.sujet(), contenu: 'Demande de vérification des informations envoyée.', par: ME.id }); P.touch(p);
  },
  publipostage(ids) {
    const l = ids.map(P.get).filter(p => p && p.email);
    exportCSV('publipostage_maj_' + todayISO() + '.csv', l.map(p => ({ Email: p.email, Objet: MajAdh.sujet(), Prenom: p.prenom, Nom: p.nom, Texte: MajAdh.texte(p) })), ',');
    l.forEach(p => { p.majDemandee = todayISO(); }); save(); log('Publipostage mise à jour', plural(l.length, 'adhérent'));
  },
  analyser(txt) {
    const m = txt.match(/R[ée]f\.?\s*SNETAA-OT\s*#([a-z0-9]+)/i);
    let p = m && P.get(m[1]);
    const lines = txt.split(/\r?\n/).map(l => l.replace(/^[\s>]+/, ''));
    const vals = {};
    MajAdh.CHAMPS.forEach(([f, l]) => { const re = new RegExp('^' + l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]") + '\\s*:\\s*(.*)$', 'i'); const line = lines.find(x => re.test(x)); if (line) vals[f] = line.match(re)[1].trim(); });
    if (!p && vals.nom) p = D.personnes.find(x => norm(x.nom) === norm(vals.nom) && norm(x.prenom) === norm(vals.prenom || ''));
    if (!p) return UI.toast('Référence introuvable : vérifie que le bloc « VOS INFORMATIONS » est bien collé.', 'r');
    const ch = [];
    MajAdh.CHAMPS.forEach(([f, l]) => { if (vals[f] === undefined) return; const old = MajAdh.valeur(p, f); if (norm(old) !== norm(vals[f])) ch.push([f, l, old, vals[f]]); });
    if (!ch.length) { UI.toast('Aucune modification dans la réponse de ' + P.full(p), 'g'); p.majRecue = todayISO(); P.touch(p); return; }
    UI.modal('Modifications proposées par ' + P.full(p), `<table><thead><tr><th></th><th>Champ</th><th>Avant</th><th>Après</th></tr></thead><tbody>${ch.map((c, i) => `<tr><td><input type="checkbox" class="majck" data-i="${i}" checked></td><td>${esc(c[1])}</td><td><span class="diffold">${esc(c[2])}</span></td><td><input class="majv" data-i="${i}" value="${esc(c[3])}"></td></tr>`).join('')}</tbody></table><p class="small mut">Les champs modifiés apparaîtront ensuite dans le récapitulatif pour le national.</p>`,
      [{ label: 'Annuler' }, {
        label: 'Appliquer', onClick: md => {
          const fields = [];
          $$('.majck', md).forEach(ck => {
            if (!ck.checked) return; const c = ch[+ck.dataset.i]; const v = $(`.majv[data-i="${ck.dataset.i}"]`, md).value.trim(); const f = c[0];
            if (f === 'dateNaissance') { p.dateNaissance = parseDate(v); fields.push(f); }
            else if (f === 'statut') { const s = REF.statuts.find(s => norm(s[1]) === norm(v) || norm(s[0]) === norm(v)); if (s) p.statut = s[0]; else p.notes = (p.notes ? p.notes + '\n' : '') + 'Statut indiqué par l\'adhérent : ' + v; fields.push(f); }
            else if (f === 'classe') { p.classe = Carriere.classeFromText(v) || p.classe; fields.push(f); }
            else if (f === 'echelon') { p.echelon = Carriere.echelonFromText(v); fields.push(f); }
            else if (f === 'indice') { p.indice = v.replace(/\D/g, ''); fields.push(f); }
            else if (f === 'discipline') { const code = (v.match(/[PLEY]\d{4}/i) || [])[0]; const d = code ? [code.toUpperCase()] : D.disciplines.find(d => norm(v).includes(norm(d[1]))); p.discipline = d ? d[0] : v; fields.push(f); }
            else if (f === 'etab' || f === 'etab2') {
              const uai = (v.match(/\b\d{7}[A-Z]\b/i) || [])[0]; const e = uai ? D.etablissements.find(x => x.uai === uai.toUpperCase()) : D.etablissements.find(x => norm(v).includes(norm(x.nom)) && norm(v).includes(norm(x.ville)));
              const a = e ? { uai: e.uai, nom: e.nom, ville: e.ville } : { uai: uai ? uai.toUpperCase() : '', nom: v.split(' - ')[0], ville: (v.split(' - ')[1] || '').toUpperCase() };
              if (f === 'etab') { p.affectations = [Object.assign(a, { principal: true }), ...p.affectations.filter(x => !x.principal)]; fields.push('etabUAI', 'etabNom'); }
              else { p.affectations = [...p.affectations.filter(x => x.principal), Object.assign(a, { principal: false })]; }
            }
            else if (f === 'email') { p.email = normEmail(v); p.emailInvalide = null; fields.push(f); }
            else if (f === 'telPortable') { p.telPortable = normPhone(v); fields.push(f); }
            else if (f === 'cp') { p.cp = normCP(v); fields.push(f); }
            else if (f === 'nom' || f === 'nomNaissance' || f === 'ville') { p[f] = v.toUpperCase(); fields.push(f); }
            else if (f === 'prenom') { p.prenom = cap(v); fields.push(f); }
            else { p[f] = v; fields.push(f); }
          });
          p.majRecue = todayISO(); p.messages.push({ id: uid(), canal: 'mail', sens: 'recu', date: new Date().toISOString().slice(0, 16), de: p.email, objet: 'Réponse — mise à jour des informations', contenu: txt.slice(0, 5000), par: ME.id });
          P.touch(p, fields); log('Mise à jour par l\'adhérent', P.full(p)); UI.toast('Fiche mise à jour', 'g'); const r = $('#maj_rep'); if (r) r.value = '';
        }
      }], { wide: true });
  }
};
App.routes.majadh = () => MajAdh.page();
