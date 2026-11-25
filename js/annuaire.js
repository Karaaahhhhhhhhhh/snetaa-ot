/* =========================================================
   Import des fiches de l'annuaire académique (copier-coller texte)
   Fiables : établissement (affectation actuelle), grade (classe),
   discipline de recrutement. Courriels : ajoutés. Noms : au cas par cas.
   ========================================================= */
'use strict';
const Annuaire = {
  /* ---------- Lecture du texte ---------- */
  lire(txt) {
    const blocs = String(txt || '').replace(/\r/g, '').split(/\n\s*\w?onsultation Gestion de la fiche de /i);
    const val = (b, lab) => { const m = b.match(new RegExp(lab + ':\\s*\\t?[ \\t]*\\t?[ \\t]*([^\\t\\n]*)', 'i')); const v = m ? m[1].trim() : ''; return /^(non trouv|-$)/i.test(v) ? '' : v; };
    return blocs.map(b => {
      if (!/Fiche individuelle/i.test(b)) return null;
      const o = { nom: val(b, 'Nom'), prenom: val(b, 'Prénom / Organisme'), civilite: val(b, 'Civilité'), grade: val(b, 'Grade'), fonctions: val(b, 'Fonctions'), mail: val(b, 'Mail').toLowerCase(), etab: val(b, "Numéro d'établissement"), disc: val(b, 'Discipline'), tel: val(b, 'Numéro de téléphone'), adresse: val(b, 'Adresse géographique') };
      const u = o.etab.match(/^(\d{7}[A-Z])\s*-\s*(.*)$/); o.uai = u ? u[1] : ''; o.etabNom = u ? u[2].trim() : '';
      const d = o.disc.match(/^(.*)-([A-Z0-9]{4,6})$/); o.discCode = d ? d[2] : ''; o.discLib = d ? d[1].trim() : o.disc;
      if (/^SANS DISCIPLINE|^DIRECTION/i.test(o.discLib)) { o.discCode = ''; }
      o.classe = /HORS CLASSE/i.test(o.grade) ? 'HC' : /EXCEPT/i.test(o.grade) ? 'CE' : /CL\.? NORMALE|CLASSE NORMALE/i.test(o.grade) ? 'CN' : '';
      o.statut = /LYCEES PROF/i.test(o.grade) ? 'PLP' : /CERTIFIE/i.test(o.grade) ? 'CERT' : /AGREGE/i.test(o.grade) ? 'AGREG' : /ECOLES/i.test(o.grade) ? 'PE' : /ASSISTANT D'EDUCATION|-AED/i.test(o.grade + ' ' + o.fonctions) ? 'AED' : /DIRECTION-DIR/i.test(o.fonctions) ? 'PERDIR' : /CHEF DE TRAVAUX|DDF/i.test(o.fonctions) ? 'DDFPT' : '';
      return o.nom ? o : null;
    }).filter(Boolean);
  },
  /* ---------- Choix des noms préparés à l'avance ----------
     Bloc en fin de fichier texte :  === MES CHOIX POUR LES NOMS ===
     puis une ligne par cas : nom dans le fichier ; nom dans l'annuaire ; choix
     ou tableau Excel (onglet « Noms à arbitrer » : fichier | annuaire | choix) */
  MARQUE: /^\s*=+\s*MES CHOIX POUR LES NOMS\s*=+\s*$/im,
  separer(txt) {
    const t = String(txt || ''), m = t.match(Annuaire.MARQUE);
    if (!m) return { texte: t, choix: [] };
    const fin = t.slice(m.index + m[0].length);
    const choix = fin.split(/\r?\n/).map(l => l.split(/\s*[;|\t]\s*/)).filter(c => c.length >= 3 && c[0].trim()).map(c => Annuaire.ligneChoix(c[0], c[1], c[2])).filter(Boolean);
    return { texte: t.slice(0, m.index), choix };
  },
  ligneChoix(f, a, c) {
    const n = norm(c || ''); const v = /deux/.test(n) ? 'deux' : /annuaire/.test(n) ? 'annuaire' : /fichier/.test(n) ? 'fichier' : '';
    return v && String(f || '').trim() ? { f: String(f).trim(), a: String(a || '').trim(), v } : null;
  },
  async choixExcel() {
    const f = await pickFile('.xlsx,.xls,.ods,.csv'); if (!f) return;
    Annuaire.choixDepuis(await readSheetFile(f), f.name);
  },
  choixDepuis(sh, fname) {
    const nom = Object.keys(sh).find(n => /arbitr/i.test(n)) || Object.keys(sh).find(n => (sh[n][0] || []).some(h => /choix/i.test(h)));
    if (!nom) return UI.toast('Aucun onglet « Noms à arbitrer » dans ce fichier', 'r');
    const rows = sh[nom], h = (rows[0] || []).map(x => norm(String(x)));
    const iF = Math.max(0, h.findIndex(x => /fichier/.test(x))), iA = h.findIndex(x => /annuaire/.test(x)), iC = h.findIndex(x => /choix/.test(x));
    Annuaire._choix = rows.slice(1).map(r => Annuaire.ligneChoix(r[iF], r[iA < 0 ? 1 : iA], r[iC < 0 ? 2 : iC])).filter(Boolean);
    const z = document.getElementById('an_ch'); if (z) z.innerHTML = `✔ ${plural(Annuaire._choix.length, 'choix chargé')} depuis « ${esc(fname)} »`;
  },
  choixPour(x, n) {
    const c = Annuaire.cle, l = Annuaire._choix || [];
    const ok = k => l.find(k);
    const r = ok(z => c(z.a) === c(n.apres) && (c(z.f) === c(n.avant) || c(z.f).includes(c(n.avant)) || c(n.avant).includes(c(z.f))))
      || ok(z => c(z.a) === c(n.apres) && c(z.f).includes(c(x.p.nom)));
    return r ? r.v : '';
  },
  /* ---------- Rapprochement avec les fiches ---------- */
  cle: s => norm(s).replace(/[^a-z]/g, ''),
  trouver(o) {
    const ps = D.personnes.filter(p => !p.archive || true), m = o.mail;
    let p = m && ps.find(x => normEmail(x.emailPro || '') === m || normEmail(x.email || '') === m || (x.emailsAutres || []).includes(m));
    if (p) return { p, par: 'courriel' };
    const n = Annuaire.cle(o.nom), pr = Annuaire.cle(o.prenom);
    p = ps.find(x => Annuaire.cle(x.nom) === n && Annuaire.cle(x.prenom) === pr) || ps.find(x => Annuaire.cle(x.nomNaissance || '') === n && Annuaire.cle(x.prenom) === pr);
    if (p) return { p, par: 'nom' };
    // nom composé / prénom composé (Bonanno-Vila ↔ Bonanno, Jean-Christophe ↔ Jean-Chris)
    const premier = s => Annuaire.cle(String(s).split(/[-\s]/)[0]);
    p = ps.find(x => premier(x.nom) === premier(o.nom) && (premier(x.prenom) === premier(o.prenom)));
    if (p) return { p, par: 'nom approché' };
    // nom figurant dans le courriel (nom de naissance / d'usage)
    const loc = m ? m.split('@')[0].split('.') : [];
    if (loc.length >= 2) { const lp = Annuaire.cle(loc[0]), ln = Annuaire.cle(loc.slice(1).join('').replace(/\d+$/, '')); p = ps.find(x => Annuaire.cle(x.prenom) === pr && (Annuaire.cle(x.nom) === ln || Annuaire.cle(x.nomNaissance || '') === ln) && lp === pr); if (p) return { p, par: 'courriel (nom d\'usage)' }; }
    return null;
  },
  /* ---------- Préparation des modifications ---------- */
  analyser(l) {
    return l.map((o, i) => {
      const t = Annuaire.trouver(o); if (!t) return { i, o, p: null, ch: [], noms: [] };
      const p = t.p, ch = [], noms = [];
      const a = (p.affectations || []).find(x => x.principal) || (p.affectations || [])[0];
      if (o.uai && (!a || a.uai !== o.uai)) ch.push({ k: 'uai', lib: 'Établissement', avant: a ? (a.uai + ' ' + (a.nom || P.etab(p))) : '—', apres: o.uai + ' ' + o.etabNom });
      if (o.mail && ![p.emailPro, p.email, ...(p.emailsAutres || [])].map(x => normEmail(x || '')).includes(o.mail)) ch.push({ k: 'mail', lib: p.emailPro ? 'Courriel académique (ajouté)' : 'Courriel académique', avant: p.emailPro || '—', apres: o.mail });
      if (o.classe && o.classe !== p.classe) ch.push({ k: 'classe', lib: 'Classe', avant: p.classe || '—', apres: o.classe });
      if (o.statut && o.statut !== p.statut && !(o.statut === 'PLP' && p.statut === 'PLP_STAG')) ch.push({ k: 'statut', lib: 'Corps / statut', avant: STATUT(p.statut)[1] || p.statut || '—', apres: STATUT(o.statut)[1] || o.statut });
      if (o.discCode && o.discCode !== p.discipline && !(p.disciplinesAutres || []).includes(o.discCode)) ch.push({ k: 'disc', lib: p.discipline ? 'Discipline (ajoutée)' : 'Discipline', avant: p.discipline ? p.discipline + ' ' + discLabel(p.discipline) : '—', apres: o.discCode + ' ' + o.discLib });
      if (Annuaire.cle(o.nom) !== Annuaire.cle(p.nom)) noms.push({ k: 'nom', avant: p.nom, apres: o.nom });
      if (Annuaire.cle(o.prenom) !== Annuaire.cle(p.prenom)) noms.push({ k: 'prenom', avant: p.prenom, apres: o.prenom });
      return { i, o, p, par: t.par, ch, noms };
    });
  },
  /* ---------- Interface ---------- */
  async ouvrir(pre) {
    pre = typeof pre === 'string' ? pre : '';
    const txt = await UI.modal('Importer des fiches de l\'annuaire académique', `<p class="small">Colle ici les fiches copiées depuis l'annuaire du rectorat (« Consultation Gestion de la fiche de… »), ou choisis le fichier texte.</p>
      <p><button class="btn" onclick="pickFile('.txt,.md,.text').then(f=>f&&readFile(f,'text')).then(t=>{if(t)document.getElementById('an_t').value=t})">1. Choisir le fichier de l'annuaire…</button>
      <button class="btn sec" onclick="Annuaire.choixExcel()">2. (facultatif) Charger mes choix de noms (Excel)…</button></p>
      <p class="small mut" id="an_ch">${(Annuaire._choix || []).length ? `✔ ${plural(Annuaire._choix.length, 'choix chargé')}` : ''} Si le fichier texte contient déjà le bloc « MES CHOIX POUR LES NOMS », tes choix sont repris automatiquement : rien d'autre à faire.</p>
      <div class="f"><textarea id="an_t" style="min-height:240px;font-family:monospace;font-size:.75rem">${esc(pre)}</textarea></div>
      <p class="small mut">Repris comme fiables : établissement (affectation actuelle), classe (normale, hors classe, exceptionnelle) et discipline de recrutement. Les courriels et disciplines différents sont <b>ajoutés</b> sans rien effacer. Les différences de nom ou de prénom te sont soumises une par une.</p>`,
      [{ label: 'Annuler', value: null }, { label: 'Analyser', onClick: m => m.querySelector('#an_t').value }], { wide: true });
    if (!txt) { Annuaire._choix = null; return; }
    const sp = Annuaire.separer(txt); if (sp.choix.length) Annuaire._choix = sp.choix;
    const l = Annuaire.lire(sp.texte); if (!l.length) return UI.toast('Aucune fiche reconnue dans ce texte', 'r');
    Annuaire._r = Annuaire.analyser(l); Annuaire.apercu();
  },
  apercu() {
    const r = Annuaire._r, ok = r.filter(x => x.p), mods = ok.filter(x => x.ch.length), noms = ok.filter(x => x.noms.length), inc = r.filter(x => !x.p);
    let nPre = 0; noms.forEach(x => x.noms.forEach(n => { n.pre = Annuaire.choixPour(x, n); if (n.pre) nPre++; }));
    const vu = new Set(); const doublonsAnn = ok.filter(x => { if (vu.has(x.p.id)) return true; vu.add(x.p.id); return false; });
    UI.modal(`Annuaire : ${r.length} fiche(s) lue(s)`, `<div class="tiles"><div class="tile"><div class="n">${ok.length}</div><div class="l">retrouvées</div></div><div class="tile"><div class="n">${mods.length}</div><div class="l">à mettre à jour</div></div><div class="tile"><div class="n">${noms.length}</div><div class="l">noms à arbitrer</div></div><div class="tile"><div class="n">${inc.length}</div><div class="l">non trouvées</div></div></div>
      ${doublonsAnn.length ? `<div class="alert w small">${doublonsAnn.length} fiche(s) de l'annuaire correspondent à une même personne du fichier : vérifie-les.</div>` : ''}
      ${nPre ? `<div class="alert g small">✔ ${plural(nPre, 'choix de nom repris', 'choix de noms repris')} de ton fichier (déjà cochés ci-dessous).</div>` : ''}
      ${noms.length ? `<h3>Noms et prénoms différents — à toi de choisir</h3><div class="tablewrap"><table><thead><tr><th>Fiche</th><th>Fichier</th><th>Annuaire</th><th>Choix</th></tr></thead><tbody>${noms.map(x => x.noms.map(n => `<tr><td class="small">${esc(P.full(x.p))}<div class="mut">${esc(x.par)}</div></td><td>${esc(n.avant)}</td><td>${esc(n.apres)}</td><td class="small nowrap">
        <label><input type="radio" name="an_${x.i}_${n.k}" value="fichier" ${!n.pre || n.pre === 'fichier' ? 'checked' : ''}> garder le fichier</label><br><label><input type="radio" name="an_${x.i}_${n.k}" value="annuaire" ${n.pre === 'annuaire' ? 'checked' : ''}> prendre l'annuaire</label><br><label><input type="radio" name="an_${x.i}_${n.k}" value="deux" ${n.pre === 'deux' ? 'checked' : ''}> garder les deux</label></td></tr>`).join('')).join('')}</tbody></table></div>` : ''}
      <h3>Mises à jour (${mods.length})</h3><p class="small"><a href="#" onclick="$$('.an_c').forEach(c=>c.checked=true);return false">tout cocher</a> · <a href="#" onclick="$$('.an_c').forEach(c=>c.checked=false);return false">tout décocher</a></p>
      <div class="tablewrap" style="max-height:45vh"><table><thead><tr><th></th><th>Fiche</th><th>Modification</th><th>Fichier</th><th>Annuaire</th></tr></thead><tbody>${mods.map(x => x.ch.map((c, j) => `<tr><td><input type="checkbox" class="an_c" data-i="${x.i}" data-k="${c.k}" checked></td><td class="small">${j ? '' : `<b>${esc(P.full(x.p))}</b>`}</td><td class="small">${esc(c.lib)}</td><td class="small mut">${esc(c.avant)}</td><td class="small">${esc(c.apres)}</td></tr>`).join('')).join('')}</tbody></table></div>
      ${inc.length ? `<h3>Non trouvées dans le fichier (${inc.length})</h3><p class="small mut">Coche celles à créer comme <b>contacts</b> (collègues de l'annuaire), sinon elles sont ignorées.</p><div class="tablewrap" style="max-height:30vh"><table><tbody>${inc.map(x => `<tr><td><input type="checkbox" class="an_n" data-i="${x.i}"></td><td><b>${esc((x.o.nom || '').toUpperCase())} ${esc(x.o.prenom)}</b></td><td class="small">${esc(x.o.etabNom || '')}</td><td class="small">${esc(x.o.grade || x.o.fonctions || '')}</td><td class="small">${esc(x.o.mail)}</td></tr>`).join('')}</tbody></table></div>` : ''}`,
      [{ label: 'Annuler', value: null }, { label: 'Appliquer', onClick: m => { Annuaire.appliquer(m); } }], { wide: true });
  },
  appliquer(m) {
    const r = Annuaire._r; let nMod = 0, nNew = 0; const touches = new Set();
    const coche = $$('.an_c', m).filter(c => c.checked).map(c => [+c.dataset.i, c.dataset.k]);
    coche.forEach(([i, k]) => {
      const { o, p } = r[i]; touches.add(p.id);
      if (k === 'uai') {
        p.affectations = p.affectations || [];
        let a = p.affectations.find(x => x.uai === o.uai);
        if (!a) { a = { uai: o.uai, nom: D.etablissements.some(e => e.uai === o.uai) ? '' : o.etabNom, ville: '' }; p.affectations.unshift(a); }
        p.affectations.forEach(x => { x.principal = x === a; }); p.affectations = [a, ...p.affectations.filter(x => x !== a)];
      }
      if (k === 'mail') { if (!p.emailPro) p.emailPro = o.mail; else { p.emailsAutres = p.emailsAutres || []; if (!p.emailsAutres.includes(o.mail)) p.emailsAutres.push(o.mail); } }
      if (k === 'classe') p.classe = o.classe;
      if (k === 'statut') { if (p.statut && p.statut !== o.statut) { p.statutsAnterieurs = p.statutsAnterieurs || []; p.statutsAnterieurs.push(p.statut); } p.statut = o.statut; }
      if (k === 'disc') {
        if (!D.disciplines.some(d => d[0] === o.discCode)) D.disciplines.push([o.discCode, o.discLib.charAt(0) + o.discLib.slice(1).toLowerCase()]);
        if (!p.discipline) p.discipline = o.discCode; else { p.disciplinesAutres = p.disciplinesAutres || []; if (!p.disciplinesAutres.includes(o.discCode)) p.disciplinesAutres.push(o.discCode); }
      }
    });
    r.filter(x => x.p && x.noms.length).forEach(x => x.noms.forEach(n => {
      const el = m.querySelector(`input[name="an_${x.i}_${n.k}"]:checked`); const v = el ? el.value : 'fichier'; if (v === 'fichier') return;
      const p = x.p; touches.add(p.id);
      if (n.k === 'nom') { if (v === 'annuaire') { p.nomsAutres = Array.from(new Set([...(p.nomsAutres || []), p.nom])); p.nom = n.apres.toUpperCase(); } else { if (!p.nomNaissance) p.nomNaissance = n.apres.toUpperCase(); else p.nomsAutres = Array.from(new Set([...(p.nomsAutres || []), n.apres.toUpperCase()])); } }
      else { if (v === 'annuaire') { p.prenomsAutres = Array.from(new Set([...(p.prenomsAutres || []), p.prenom])); p.prenom = n.apres; } else p.prenomsAutres = Array.from(new Set([...(p.prenomsAutres || []), n.apres])); }
    }));
    $$('.an_n', m).filter(c => c.checked).forEach(c => {
      const o = r[+c.dataset.i].o;
      const p = P.nouveau({ categorie: 'contact', nom: o.nom.toUpperCase(), prenom: o.prenom, civilite: /^M\.?$/.test(o.civilite) ? 'M.' : 'Mme', emailPro: o.mail, statut: o.statut, classe: o.classe, discipline: o.discCode, affectations: o.uai ? [{ uai: o.uai, nom: D.etablissements.some(e => e.uai === o.uai) ? '' : o.etabNom, ville: '', principal: true }] : [], origine: 'annuaire', dateAjout: todayISO() });
      if (o.discCode && !D.disciplines.some(d => d[0] === o.discCode)) D.disciplines.push([o.discCode, o.discLib.charAt(0) + o.discLib.slice(1).toLowerCase()]);
      D.personnes.push(p); nNew++;
    });
    touches.forEach(id => { const p = P.get(id); p.interventions = p.interventions || []; p.interventions.push({ id: uid(), date: todayISO(), type: 'Autre', canal: 'autre', objet: 'Mise à jour depuis l\'annuaire académique', detail: '', auteur: ME.id }); P.touch(p); nMod++; });
    Annuaire._choix = null;
    save(); log('Import annuaire académique', `${nMod} fiche(s) mise(s) à jour, ${nNew} contact(s) créé(s)`);
    UI.toast(`${nMod} fiche(s) mise(s) à jour, ${nNew} contact(s) créé(s)`, 'g'); setTimeout(App.route, 50);
  }
};
