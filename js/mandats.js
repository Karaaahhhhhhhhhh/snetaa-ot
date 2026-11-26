/* =========================================================
   Mandats : délégués d'établissement (S1), secrétaires
   départementaux (S2), secrétaire académique (S3), bureau
   ========================================================= */
'use strict';
const Mandats = {
  TYPES: [
    ['S1', 'Délégué·e d\'établissement (S1)', 'etab'], ['S1A', 'Délégué·e d\'établissement suppléant·e (S1)', 'etab'],
    ['S2', 'Secrétaire départemental·e (S2)', 'dep'], ['S2A', 'Secrétaire départemental·e adjoint·e (S2)', 'dep'],
    ['S3', 'Secrétaire académique (S3)', 'acad'], ['S3A', 'Secrétaire académique adjoint·e (S3)', 'acad'],
    ['TRES', 'Trésorier·e académique', 'acad'], ['TRESA', 'Trésorier·e adjoint·e', 'acad'], ['SEC', 'Membre du secrétariat académique', 'acad'], ['BUR', 'Membre du bureau académique', 'acad'], ['CSA', 'Membre du conseil syndical académique', 'acad'],
    ['REP', 'Représentant·e désigné·e (instance)', 'acad']
  ],
  ADJ: /^(S[123]|TRES)A$/,
  court(t) { return { SEC: 'Secrétariat', BUR: 'Bureau', CSA: 'Conseil synd.', REP: 'Représ.' }[t] || t.replace(Mandats.ADJ, '$1 adj.'); },
  type(k) { return Mandats.TYPES.find(t => t[0] === k) || [k, k, 'acad']; },
  actif(m) { return !m.fin || m.fin >= todayISO(); },
  tous() { const l = []; D.personnes.forEach(p => (p.mandats || []).forEach(m => l.push({ p, m }))); return l; },
  actifs() { return Mandats.tous().filter(x => Mandats.actif(x.m) && !x.p.archive); },
  de(p) { return (p.mandats || []).filter(Mandats.actif); },
  libelle(m) {
    const t = Mandats.type(m.type);
    if (t[2] === 'etab') { const e = D.etablissements.find(x => x.uai === m.uai); return t[1] + ' — ' + (e ? e.nom + ' (' + e.ville + ')' : m.uai); }
    if (t[2] === 'dep') return t[1] + ' — ' + m.dep + ' ' + (REF.departements[m.dep] || '');
    return t[1] + (m.precision ? ' — ' + m.precision : '');
  },
  tags(p) { return Mandats.de(p).map(m => `<span class="tag v" title="${esc(Mandats.libelle(m))}">${esc(Mandats.court(m.type))}${m.dep ? ' ' + esc(m.dep) : ''}</span>`).join(' '); },
  s1(uai) { return Mandats.actifs().filter(x => x.m.uai === uai && /^S1/.test(x.m.type)); },
  s2(dep) { return Mandats.actifs().filter(x => x.m.dep === dep && /^S2/.test(x.m.type)); },
  /* ---------- Page organigramme ---------- */
  page() {
    const g = can('adh.modifier');
    const acad = Mandats.actifs().filter(x => Mandats.type(x.m.type)[2] === 'acad').sort((a, b) => Mandats.TYPES.findIndex(t => t[0] === a.m.type) - Mandats.TYPES.findIndex(t => t[0] === b.m.type));
    const pers = x => `<a href="#/fiche/${x.p.id}"><b>${esc(P.full(x.p))}</b></a>${Mandats.ADJ.test(x.m.type) ? ' <span class="small mut">(adj./suppl.)</span>' : ''}<div class="small mut">${esc(P.etab(x.p))}${x.p.telPortable ? ' · ' + esc(x.p.telPortable) : ''}${x.p.email ? ' · ' + esc(x.p.email) : ''}</div>`;
    const cnt = Etabs.compte();
    const etabsPro = D.etablissements.filter(e => !e.service && (cnt[e.uai] || ['LP', 'SEP', 'LPO'].includes(e.type)));
    const sansS1 = etabsPro.filter(e => cnt[e.uai] && cnt[e.uai].adh && !Mandats.s1(e.uai).length);
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Mandats & délégués</h1><div class="mut small">S1 : délégués d'établissement · S2 : secrétaires départementaux · S3 : secrétariat académique et bureau</div></div>
      <div class="actions">${g ? `<button class="btn" onclick="Mandats.designer()">+ Désigner</button><button class="btn sec" onclick="Mandats.lot()">+ Désigner une instance (liste de noms)</button>` : ''}<button class="btn sec" onclick="Mandats.exporter()">Exporter</button><button class="btn sec" onclick="window.print()">🖨 Imprimer</button></div></div>
      <div class="card"><h2 style="margin-top:0">Niveau académique (S3)</h2>${acad.map(x => `<div style="display:grid;grid-template-columns:260px 1fr auto;gap:.6rem;padding:.35rem 0;border-bottom:1px solid var(--line)"><div class="small"><b>${esc(Mandats.type(x.m.type)[1])}</b>${x.m.precision ? '<br>' + esc(x.m.precision) : ''}</div><div>${pers(x)}</div><div class="noprint">${g ? `<button class="btn sm ghost" onclick="Mandats.edit('${x.p.id}','${x.m.id}')">Modifier</button>` : ''}</div></div>`).join('') || '<p class="mut">Aucun mandat académique enregistré.</p>'}</div>
      <div class="card"><h2 style="margin-top:0">Secrétaires départementaux (S2)</h2><div class="grid g3">${Object.entries(REF.departements).map(([d, n]) => { const l = Mandats.s2(d); return `<div style="border:1px solid var(--line);border-radius:8px;padding:.6rem"><b>${d} — ${esc(n)}</b>${l.map(x => `<div style="margin-top:.3rem">${pers(x)}</div>`).join('') || '<div class="small" style="color:var(--bord);margin-top:.3rem">Poste à pourvoir</div>'}${g ? `<div class="noprint" style="margin-top:.4rem"><button class="btn sm sec" onclick="Mandats.designer({type:'S2',dep:'${d}'})">Désigner</button></div>` : ''}</div>`; }).join('')}</div></div>
      <div class="card"><h2 style="margin-top:0">Délégués d'établissement (S1)</h2>
        ${sansS1.length ? `<div class="alert w small"><b>${sansS1.length}</b> établissement(s) avec des adhérents n'ont pas de délégué S1.</div>` : ''}
        <div class="toolbar noprint"><select onchange="Mandats.fdep=this.value;Mandats.page()">${UI.opts(Object.entries(REF.departements).map(([k, v]) => [k, k + ' ' + v]), Mandats.fdep, 'Tous départements')}</select><label class="chk"><input type="checkbox" ${Mandats.fsans ? 'checked' : ''} onchange="Mandats.fsans=this.checked;Mandats.page()"> seulement sans délégué</label></div>
        <div class="tablewrap"><table><thead><tr><th>Établissement</th><th>Statut</th><th class="num">Adh.</th><th>Délégué(s)</th><th class="noprint"></th></tr></thead><tbody>
        ${etabsPro.filter(e => (!Mandats.fdep || e.dep === Mandats.fdep) && (!Mandats.fsans || !Mandats.s1(e.uai).length)).sort((a, b) => a.dep + a.ville < b.dep + b.ville ? -1 : 1).map(e => { const l = Mandats.s1(e.uai); const c = cnt[e.uai] || {}; return `<tr><td><b>${esc(e.nom)}</b><div class="small mut">${esc(e.type)} · ${esc(e.ville)} (${esc(e.dep)})</div></td><td>${e.statut === 'Privé' ? '<span class="tag v">Privé</span>' : 'Public'}</td><td class="num">${c.adh || ''}</td><td>${l.map(pers).join('') || (c.adh ? '<span class="small" style="color:var(--bord)">aucun</span>' : '<span class="small mut">—</span>')}</td><td class="noprint">${g ? `<button class="btn sm sec" onclick="Mandats.designer({type:'S1',uai:'${esc(e.uai)}'})">Désigner</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div></div>
      <p class="small mut">Les mandats terminés restent visibles dans l'onglet « Mandats » de chaque fiche (historique).</p>`;
  },
  designer(preset) {
    preset = preset || {};
    const t = preset.type || 'S1';
    const cands = () => {
      const tp = Mandats.type($('#md_t') ? $('#md_t').value : t)[2];
      const uai = $('#md_u') ? $('#md_u').value : preset.uai, dep = $('#md_d') ? $('#md_d').value : preset.dep;
      let l = P.visibles().filter(p => p.statut !== 'RETR' || tp === 'acad');
      if (tp === 'etab' && uai) l = l.filter(p => P.uais(p).includes(uai)).concat(l.filter(p => !P.uais(p).includes(uai)));
      if (tp === 'dep' && dep) l = l.filter(p => P.dep(p) === dep).concat(l.filter(p => P.dep(p) !== dep));
      return l.slice(0, 400);
    };
    Mandats._cands = cands; Mandats._preset = preset;
    const etabOpts = D.etablissements.filter(e => !e.service).sort((a, b) => a.ville + a.nom < b.ville + b.nom ? -1 : 1).map(e => [e.uai, e.ville + ' — ' + e.nom + (e.statut === 'Privé' ? ' (privé)' : '')]);
    UI.modal('Désigner', `<div class="frow"><div class="f"><label>Mandat</label><select id="md_t" onchange="Mandats.majForm()">${UI.opts(Mandats.TYPES.map(x => [x[0], x[1]]), t)}</select></div>
      <div class="f" id="md_uw"><label>Établissement</label><select id="md_u" onchange="Mandats.majCands()">${UI.opts(etabOpts, preset.uai, '—')}</select></div>
      <div class="f" id="md_dw"><label>Département</label><select id="md_d" onchange="Mandats.majCands()">${UI.opts(Object.entries(REF.departements).map(([k, v]) => [k, k + ' ' + v]), preset.dep, '—')}</select></div>
      <div class="f" id="md_pw"><label>Précision (instance, rôle…)</label><input id="md_p" placeholder="ex. CAPA PLP, F3SCT…"></div></div>
      <div class="frow"><div class="f"><label>Personne (rechercher)</label><input id="md_q" oninput="Mandats.majCands()" placeholder="Nom…"></div><div class="f"><label>Début du mandat</label><input type="date" id="md_deb" value="${todayISO()}"></div><div class="f"><label>Fin (si connue)</label><input type="date" id="md_fin"></div></div>
      <div id="md_list" style="max-height:38vh;overflow:auto;border:1px solid var(--line);border-radius:8px"></div>
      <label class="chk"><input type="checkbox" id="md_prev" checked> Clore le mandat de la personne qui occupait ce poste</label>`,
      [{ label: 'Annuler' }, { label: 'Désigner', onClick: m => Mandats.valider(m) }], { wide: true });
    Mandats.majForm();
  },
  majForm() {
    const tp = Mandats.type($('#md_t').value)[2];
    $('#md_uw').style.display = tp === 'etab' ? '' : 'none'; $('#md_dw').style.display = tp === 'dep' ? '' : 'none'; $('#md_pw').style.display = tp === 'acad' ? '' : 'none';
    Mandats.majCands();
  },
  majCands() {
    const q = norm($('#md_q').value); const cur = ($('input[name=md_pid]:checked') || {}).value || Mandats._preset.pid;
    let l = Mandats._cands().filter(p => !q || norm(P.full(p)).includes(q)).slice(0, 150);
    if (cur && !q) { const pc = P.get(cur); if (pc) l = [pc, ...l.filter(p => p.id !== cur)]; }
    $('#md_list').innerHTML = l.map(p => `<label class="chk" style="padding:.3rem .6rem;border-bottom:1px solid var(--line);margin:0"><input type="radio" name="md_pid" value="${p.id}" ${p.id === cur ? 'checked' : ''}> <b>${esc(P.full(p))}</b> <span class="small mut">${esc(P.etab(p))} · ${esc(P.dep(p))}</span> ${P.cotisTag(p)} ${Mandats.tags(p)}</label>`).join('') || '<p class="mut small" style="padding:.6rem">Aucune personne</p>';
  },
  valider(m) {
    const pid = ($('input[name=md_pid]:checked', m) || {}).value; if (!pid) { UI.toast('Choisis une personne', 'r'); return false; }
    const type = m.querySelector('#md_t').value, tp = Mandats.type(type)[2];
    const md = { id: uid(), type, debut: m.querySelector('#md_deb').value, fin: m.querySelector('#md_fin').value, par: ME.id };
    if (tp === 'etab') { md.uai = m.querySelector('#md_u').value; if (!md.uai) { UI.toast('Choisis l\'établissement', 'r'); return false; } }
    if (tp === 'dep') { md.dep = m.querySelector('#md_d').value; if (!md.dep) { UI.toast('Choisis le département', 'r'); return false; } }
    if (tp === 'acad') md.precision = m.querySelector('#md_p').value.trim();
    if (m.querySelector('#md_prev').checked && !['BUR', 'REP', 'S1A', 'S2A', 'S3A', 'TRESA'].includes(type))
      Mandats.actifs().filter(x => x.m.type === type && x.m.uai === md.uai && x.m.dep === md.dep).forEach(x => { x.m.fin = md.debut || todayISO(); P.touch(x.p); });
    const p = P.get(pid); p.mandats = p.mandats || []; p.mandats.push(md);
    if (p.categorie !== 'adherent') UI.toast('Attention : ' + P.full(p) + ' n\'est pas enregistré·e comme adhérent·e', 'r');
    P.touch(p); log('Désignation', P.full(p) + ' : ' + Mandats.libelle(md)); App.route();
  },
  /* ---------- Désignation en lot (instances élues : bureau, conseil syndical, secrétariat…) ---------- */
  lot() {
    const acad = Mandats.TYPES.filter(t => t[2] === 'acad').map(t => [t[0], t[1]]);
    UI.modal('Désigner une instance à partir d\'une liste de noms', `<p class="small mut">Colle la liste des membres élus (copiée depuis le PDF ou un tableau), un nom par ligne ou séparés par des virgules, au format « Nom Prénom ». Pour plusieurs instances d'un coup, mets le code de l'instance entre crochets sur sa propre ligne : <code>[BUR]</code>, <code>[CSA]</code>, <code>[SEC]</code>, <code>[S3]</code>, <code>[TRES]</code>…</p>
      <div class="frow"><div class="f"><label>Instance (si pas de crochets)</label><select id="ml_t">${UI.opts(acad, 'BUR')}</select></div><div class="f"><label>Début du mandat (date du congrès)</label><input type="date" id="ml_d" value="${todayISO()}"></div><div class="f"><label>Précision</label><input id="ml_p" placeholder="ex. Congrès académique"></div></div>
      <div class="f"><label>Noms</label><textarea id="ml_n" style="min-height:180px" placeholder="[BUR]&#10;DUPONT Marie&#10;MARTIN Paul&#10;[CSA]&#10;…" oninput="Mandats.lotApercu()"></textarea></div>
      <div id="ml_res" class="small"></div>`,
      [{ label: 'Annuler' }, { label: 'Désigner', onClick: m => Mandats.lotValider(m) }], { wide: true });
  },
  lotAnalyse() {
    const def = $('#ml_t').value, acad = Mandats.TYPES.filter(t => t[2] === 'acad').map(t => t[0]);
    const idx = {}; D.personnes.filter(p => !p.archive).forEach(p => { idx[norm(p.nom + ' ' + p.prenom)] = p; idx[norm(p.prenom + ' ' + p.nom)] = p; });
    const trouve = n => { const k = norm(n); if (idx[k]) return idx[k];
      const mots = k.split(' ').filter(w => w.length > 1); if (mots.length < 2) return null;
      const c = D.personnes.filter(p => !p.archive && mots.every(w => norm(p.nom + ' ' + p.prenom).split(' ').some(z => z === w || (w.length > 3 && Mandats.proche(z, w)))));
      return c.length === 1 ? c[0] : null; };
    let type = def; const out = [];
    $('#ml_n').value.split(/\n/).forEach(l => {
      const m = l.match(/^\s*\[\s*([A-Za-z0-9]+)\s*\]\s*$/); if (m) { const t = m[1].toUpperCase(); if (acad.includes(t)) type = t; return; }
      l.split(/[,;\t]/).map(x => x.replace(/^\s*[-•*\d.)]+\s*/, '').trim()).filter(x => x.length > 2).forEach(n => out.push({ n, type, p: trouve(n) }));
    });
    return out;
  },
  /* deux mots « proches » : une lettre changée, ajoutée ou retirée (fautes de frappe, Lucy / Lucie…) */
  proche(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i].concat(Array(b.length).fill(0)));
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length] <= (Math.min(a.length, b.length) > 4 ? 2 : 1);
  },
  lotApercu() {
    const l = Mandats.lotAnalyse(), ok = l.filter(x => x.p), ko = l.filter(x => !x.p);
    const deja = x => x.p && Mandats.de(x.p).some(m => m.type === x.type);
    $('#ml_res').innerHTML = !l.length ? '' : `<p><b>${ok.length}</b> reconnu(s) dans le fichier${ko.length ? `, <b style="color:var(--bord)">${ko.length} non trouvé(s)</b>` : ''}.</p>
      ${ko.length ? `<div class="alert r">Non trouvés (vérifie l'orthographe ou crée la fiche) : ${ko.map(x => esc(x.n) + ' [' + x.type + ']').join(', ')}</div>` : ''}
      <div style="max-height:26vh;overflow:auto">${ok.map(x => `<div>[${x.type}] ${esc(x.n)} → <b>${esc(P.full(x.p))}</b>${deja(x) ? ' <span class="tag">déjà désigné·e</span>' : ''}</div>`).join('')}</div>`;
  },
  lotValider(m) {
    const l = Mandats.lotAnalyse().filter(x => x.p); if (!l.length) { UI.toast('Aucun nom reconnu', 'r'); return false; }
    const debut = m.querySelector('#ml_d').value, precision = m.querySelector('#ml_p').value.trim(); let n = 0;
    l.forEach(x => { if (Mandats.de(x.p).some(z => z.type === x.type)) return; x.p.mandats = x.p.mandats || []; x.p.mandats.push({ id: uid(), type: x.type, debut, fin: '', precision, par: ME.id }); P.touch(x.p); n++; });
    log('Désignation en lot', plural(n, 'mandat')); UI.toast(plural(n, 'mandat enregistré', 'mandats enregistrés'), 'g'); App.route();
  },
  edit(pid, mid) {
    const p = P.get(pid), md = p.mandats.find(x => x.id === mid);
    UI.modal('Mandat de ' + P.full(p), `<p><b>${esc(Mandats.libelle(md))}</b></p><div class="frow"><div class="f"><label>Début</label><input type="date" id="me_d" value="${esc(md.debut || '')}"></div><div class="f"><label>Fin</label><input type="date" id="me_f" value="${esc(md.fin || '')}"></div>${Mandats.type(md.type)[2] === 'acad' ? `<div class="f"><label>Précision</label><input id="me_p" value="${esc(md.precision || '')}"></div>` : ''}</div>`,
      [{ label: 'Supprimer', onClick: () => { p.mandats = p.mandats.filter(x => x.id !== mid); P.touch(p); log('Mandat supprimé', P.full(p)); App.route(); } }, { label: 'Clore aujourd\'hui', onClick: () => { md.fin = todayISO(); P.touch(p); log('Fin de mandat', P.full(p) + ' : ' + Mandats.libelle(md)); App.route(); } },
      { label: 'Enregistrer', onClick: m => { md.debut = m.querySelector('#me_d').value; md.fin = m.querySelector('#me_f').value; const pr = m.querySelector('#me_p'); if (pr) md.precision = pr.value; P.touch(p); App.route(); } }]);
  },
  tabFiche(p) {
    const l = (p.mandats || []).slice().sort((a, b) => (b.debut || '') < (a.debut || '') ? -1 : 1);
    return `<div class="card">${can('adh.modifier') ? `<p><button class="btn" onclick="Mandats.designer({pid:'${p.id}'})">+ Désigner à un mandat</button></p>` : ''}
      <div class="tablewrap"><table><thead><tr><th>Mandat</th><th>Du</th><th>Au</th><th></th></tr></thead><tbody>${l.map(m => `<tr><td>${esc(Mandats.libelle(m))} ${Mandats.actif(m) ? '<span class="tag ok">en cours</span>' : ''}</td><td>${fmtDate(m.debut)}</td><td>${fmtDate(m.fin)}</td><td>${can('adh.modifier') ? `<button class="btn sm ghost" onclick="Mandats.edit('${p.id}','${m.id}')">Modifier</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="4" class="mut">Aucun mandat</td></tr>'}</tbody></table></div></div>`;
  },
  exporter() {
    exportXLSX('mandats_' + todayISO() + '.xlsx', {
      'Mandats en cours': Mandats.actifs().map(x => ({ Niveau: x.m.type.slice(0, 2), Mandat: Mandats.type(x.m.type)[1], 'Établissement / département': x.m.uai ? ((D.etablissements.find(e => e.uai === x.m.uai) || {}).nom || x.m.uai) : x.m.dep ? x.m.dep + ' ' + (REF.departements[x.m.dep] || '') : (x.m.precision || ''), Nom: x.p.nom, Prénom: x.p.prenom, Courriel: x.p.email, Portable: x.p.telPortable, Depuis: fmtDate(x.m.debut) })),
      Historique: Mandats.tous().map(x => ({ Mandat: Mandats.libelle(x.m), Nom: P.full(x.p), Début: fmtDate(x.m.debut), Fin: fmtDate(x.m.fin) }))
    });
  }
};
App.routes.mandats = () => Mandats.page();
