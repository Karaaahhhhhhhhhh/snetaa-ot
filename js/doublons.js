/* =========================================================
   Doublons : détection et fusion de fiches
   ========================================================= */
'use strict';
const Doublons = {
  CHAMPS: [['categorie', 'Catégorie'], ['civilite', 'Civilité'], ['nom', 'Nom'], ['prenom', 'Prénom'], ['nomNaissance', 'Nom de naissance'], ['dateNaissance', 'Date de naissance'], ['numAdherent', 'N° adhérent'],
    ['email', 'Courriel'], ['emailPro', 'Courriel académique'], ['telPortable', 'Portable'], ['telFixe', 'Fixe'], ['adresse', 'Adresse'], ['cp', 'Code postal'], ['ville', 'Ville'],
    ['statut', 'Statut'], ['discipline', 'Discipline'], ['classe', 'Classe'], ['echelon', 'Échelon'], ['indice', 'Indice'], ['datePromo', 'Date échelon'], ['academie', 'Académie'],
    ['calendrier', 'Calendrier'], ['datePremiereAdhesion', 'Première adhésion'], ['militant', 'Militant référent'], ['notes', 'Notes']],
  cle(a, b) { return [a, b].sort().join('|'); },
  ignores() { return (D.meta.nonDoublons = D.meta.nonDoublons || []); },
  detecter() {
    const l = D.personnes.filter(p => !p.archive || p.archive !== 'décès');
    const idx = {}, paires = {};
    const add = (k, p) => { if (!k) return; (idx[k] = idx[k] || []).push(p); };
    l.forEach(p => {
      const n = norm(p.nom), pr = norm(p.prenom);
      if (p.numAdherent) add('num:' + String(p.numAdherent).trim(), p);
      if (n && pr) { add('np:' + n + '|' + pr, p); if (p.nomNaissance) add('np:' + norm(p.nomNaissance) + '|' + pr, p); }
      if (p.email) add('mail:' + normEmail(p.email), p);
      const t = String(p.telPortable || '').replace(/\D/g, ''); if (t.length === 10) add('tel:' + t, p);
    });
    const motif = { num: 'même n° adhérent', np: 'même nom et prénom', mail: 'même courriel', tel: 'même portable' };
    Object.entries(idx).forEach(([k, ps]) => {
      if (ps.length < 2 || ps.length > 6) return;
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j]; if (a === b) continue;
        if (a.dateNaissance && b.dateNaissance && a.dateNaissance !== b.dateNaissance && k.startsWith('np:')) continue; // homonymes
        const c = Doublons.cle(a.id, b.id); if (Doublons.ignores().includes(c)) continue;
        (paires[c] = paires[c] || { a, b, motifs: new Set() }).motifs.add(motif[k.split(':')[0]]);
      }
    });
    return Object.values(paires).sort((x, y) => y.motifs.size - x.motifs.size);
  },
  page() {
    const l = Doublons.detecter().filter(x => P.visibles().includes(x.a) && P.visibles().includes(x.b));
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Doublons</h1><div class="mut small">Fiches qui semblent concerner la même personne (même n° d'adhérent, même nom et prénom, même courriel ou même portable).</div></div></div>
      <p><b>${plural(l.length, 'doublon possible', 'doublons possibles')}</b>${Doublons.ignores().length ? ` · <a href="#" onclick="D.meta.nonDoublons=[];save();App.route();return false">réafficher les ${Doublons.ignores().length} paire(s) écartée(s)</a>` : ''}</p>
      <div class="tablewrap"><table><thead><tr><th>Fiche 1</th><th>Fiche 2</th><th>Motif</th><th></th></tr></thead><tbody>
      ${l.map(x => `<tr><td>${Doublons.resume(x.a)}</td><td>${Doublons.resume(x.b)}</td><td class="small">${esc(Array.from(x.motifs).join(', '))}</td>
        <td class="nowrap"><button class="btn sm" onclick="Doublons.comparer('${x.a.id}','${x.b.id}')">Comparer et fusionner</button> <button class="btn sm ghost" onclick="Doublons.ecarter('${x.a.id}','${x.b.id}')">Pas un doublon</button></td></tr>`).join('') || '<tr><td colspan="4" class="mut">Aucun doublon détecté 👍</td></tr>'}</tbody></table></div>
      <p class="small mut">Tu peux aussi fusionner deux fiches depuis une fiche : « Autres actions » → « Fusionner avec une autre fiche ».</p>`;
  },
  resume(p) { return `<a href="#/fiche/${p.id}"><b>${esc(P.full(p))}</b></a> ${P.cotisTag(p)}<div class="small mut">${esc([p.numAdherent ? 'n° ' + p.numAdherent : '', fmtDate(p.dateNaissance), P.etab(p), p.email].filter(Boolean).join(' · '))}</div>`; },
  ecarter(a, b) { Doublons.ignores().push(Doublons.cle(a, b)); save(); App.route(); },
  choisirAutre(id) {
    const p = P.get(id);
    UI.modal('Fusionner ' + P.full(p) + ' avec…', `<input id="db_q" placeholder="Nom de l'autre fiche" oninput="Doublons._cherche('${id}',this.value)"><div id="db_r" style="max-height:50vh;overflow:auto;margin-top:.5rem"></div>`, [{ label: 'Annuler' }]);
  },
  _cherche(id, q) {
    q = norm(q); const l = q.length < 2 ? [] : P.visibles().filter(p => p.id !== id && norm(P.full(p) + ' ' + (p.nomNaissance || '')).includes(q)).slice(0, 30);
    $('#db_r').innerHTML = l.map(p => `<div style="padding:.3rem 0;border-bottom:1px solid var(--line)">${Doublons.resume(p)} <button class="btn sm" onclick="UI.close();setTimeout(()=>Doublons.comparer('${id}','${p.id}'),30)">Choisir</button></div>`).join('');
  },
  valeur(p, f) {
    if (f === 'statut') return STATUT(p.statut)[1]; if (f === 'classe') return Carriere.classe(p.classe); if (f === 'militant') return userName(p.militant);
    if (f === 'dateNaissance' || f === 'datePromo' || f === 'datePremiereAdhesion') return fmtDate(p[f]); if (f === 'categorie') return REF.categories[p.categorie] || '';
    return p[f] == null ? '' : String(p[f]);
  },
  score(p) { return (p.numAdherent ? 4 : 0) + (D.lastSnapshot && D.lastSnapshot.records[p.id] ? 3 : 0) + p.cotisations.length + p.interventions.length + (p.categorie === 'adherent' ? 2 : 0); },
  comparer(ida, idb, force) {
    let a = P.get(ida), b = P.get(idb); if (!a || !b) return;
    if (!force && Doublons.score(b) > Doublons.score(a)) [a, b] = [b, a];
    Doublons._ab = [a, b];
    const lignes = Doublons.CHAMPS.map(([f, l]) => {
      const va = Doublons.valeur(a, f), vb = Doublons.valeur(b, f);
      if (!va && !vb) return '';
      const def = va ? 'a' : 'b';
      return `<tr><td class="small">${esc(l)}</td><td><label class="chk"><input type="radio" name="dbf_${f}" value="a" ${def === 'a' ? 'checked' : ''}> ${esc(va) || '<span class="mut">—</span>'}</label></td><td><label class="chk"><input type="radio" name="dbf_${f}" value="b" ${def === 'b' ? 'checked' : ''} ${va === vb ? 'disabled' : ''}> ${va === vb ? '<span class="mut">identique</span>' : (esc(vb) || '<span class="mut">—</span>')}</label></td></tr>`;
    }).join('');
    UI.modal('Fusionner deux fiches', `<p class="small">La fiche 1 est conservée ; la fiche 2 est supprimée après fusion. Choisis pour chaque information la valeur à garder. Sont toujours regroupés : affectations, cotisations, historique, messages, contacts de campagne, mandats, présences aux réunions, compte d'accès.</p>
      <div class="tablewrap" style="max-height:55vh"><table><thead><tr><th></th><th>Fiche 1 (conservée)</th><th>Fiche 2</th></tr></thead><tbody>
      <tr><td></td><td>${Doublons.resume(a)}</td><td>${Doublons.resume(b)}</td></tr>${lignes}
      <tr><td class="small">Affectations</td><td class="small">${esc(P.etabs(a))}</td><td class="small">${esc(P.etabs(b))}</td></tr>
      <tr><td class="small">Cotisations</td><td class="small">${esc(a.cotisations.map(c => c.periode).join(', '))}</td><td class="small">${esc(b.cotisations.map(c => c.periode).join(', '))}</td></tr></tbody></table></div>`,
      [{ label: 'Annuler' }, { label: 'Inverser (garder la fiche 2)', onClick: () => { setTimeout(() => Doublons.comparer(b.id, a.id, true), 30); } }, { label: '✓ Fusionner', cls: 'ok', onClick: m => Doublons.fusionner(m) }], { wide: true, nofocus: true });
  },
  fusionner(m) {
    const [a, b] = Doublons._ab;
    Doublons.CHAMPS.forEach(([f]) => { const r = m.querySelector(`input[name="dbf_${f}"]:checked`); if (r && r.value === 'b') { a[f] = b[f]; a.localEdits[f] = nowISO(); } });
    if (b.notes && a.notes !== b.notes && !(a.notes || '').includes(b.notes)) a.notes = [a.notes, b.notes].filter(Boolean).join('\n');
    // regroupements
    b.affectations.forEach(x => { if (!a.affectations.some(y => (y.uai && y.uai === x.uai) || (!y.uai && y.nom === x.nom))) a.affectations.push(Object.assign({}, x, { principal: a.affectations.length ? false : x.principal })); });
    b.cotisations.forEach(c => { if (!a.cotisations.some(x => x.periode === c.periode)) a.cotisations.push(c); }); P.syncCal(a);
    ['interventions', 'messages'].forEach(k => { const ids = new Set(a[k].map(x => x.id)); b[k].forEach(x => { if (!ids.has(x.id)) a[k].push(x); }); });
    const cids = new Set(a.vote.contacts.map(x => x.id)); b.vote.contacts.forEach(x => { if (!cids.has(x.id)) a.vote.contacts.push(x); });
    if (!a.vote.intention || (b.vote.intMaj || '') > (a.vote.intMaj || '')) { if (b.vote.intention) { a.vote.intention = b.vote.intention; a.vote.intMaj = b.vote.intMaj; } }
    if (b.vote.aVote && !a.vote.aVote) { a.vote.aVote = true; a.vote.dateVote = b.vote.dateVote; a.vote.sourceVote = b.vote.sourceVote; }
    if (b.vote.electeur && !a.vote.electeur) a.vote.electeur = b.vote.electeur;
    a.mandats = (a.mandats || []).concat((b.mandats || []).filter(x => !(a.mandats || []).some(y => y.id === x.id)));
    ['emailInvalide', 'changementAcademie', 'autreAcademie', 'adresseInvalide', 'situationNat', 'aJourNat'].forEach(k => { if (!a[k] && b[k]) a[k] = b[k]; });
    a.extra = Object.assign({}, b.extra, a.extra);
    if (!a.militant && b.militant) a.militant = b.militant;
    if (a.archive && !b.archive) a.archive = null;
    // références ailleurs dans la base
    D.reunions.forEach(r => r.participants.forEach(x => { if (x.pid === b.id) x.pid = a.id; }));
    D.reunions.forEach(r => { const vus = new Set(); r.participants = r.participants.filter(x => !x.pid || (vus.has(x.pid) ? false : vus.add(x.pid))); });
    D.users.forEach(u => { if (u.pid === b.id) { if (D.users.some(v => v.pid === a.id)) u.pid = null; else u.pid = a.id; } });
    if (D.lastSnapshot) { if (!D.lastSnapshot.records[a.id] && D.lastSnapshot.records[b.id]) D.lastSnapshot.records[a.id] = D.lastSnapshot.records[b.id]; delete D.lastSnapshot.records[b.id]; }
    if (b.numAdherent && String(b.numAdherent) !== String(a.numAdherent || '')) { a.fusions = a.fusions || []; a.fusions.push({ num: b.numAdherent, nom: P.full(b), date: todayISO(), signale: null }); }
    D.personnes = D.personnes.filter(p => p.id !== b.id);
    P.touch(a); log('Fusion de fiches', P.full(a) + ' ← ' + P.full(b));
    UI.toast('Fiches fusionnées', 'g'); setTimeout(() => App.go('fiche/' + a.id), 30);
  }
};
App.routes.doublons = () => Doublons.page();
