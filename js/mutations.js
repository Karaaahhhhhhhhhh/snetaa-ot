/* =========================================================
   Suivi des mutations : un dossier par demande (inter, intra,
   mouvements spécifiques…), vœux et barèmes, résultat, recours,
   échanges copiés dans la fiche
   ========================================================= */
'use strict';
const Mutations = {
  TYPES: [['inter', 'Mouvement interacadémique (inter)'], ['intra', 'Mouvement intra-académique (intra)'], ['spe', 'Mouvement spécifique national (SPEN, POP, DDF, BTS…)'], ['detach', 'Détachement / mise à disposition'], ['autre', 'Autre (outre-mer, étranger, poste adapté…)']],
  MOTIFS: ['Rapprochement de conjoint', 'Autorité parentale conjointe', 'Situation de handicap (priorité)', 'Raison médicale / sociale', 'Mesure de carte scolaire', 'Réintégration', 'Fonctionnaire stagiaire', 'Convenance personnelle', 'Mutation simultanée', 'Autre'],
  RESULTATS: [['encours', 'En cours'], ['obtenu', 'Obtenu'], ['partiel', 'Obtenu hors vœux / extension'], ['refus', 'Non satisfait'], ['annule', 'Annulé / retiré']],
  type(k) { return (Mutations.TYPES.find(t => t[0] === k) || [k, k])[1]; },
  res(k) { return (Mutations.RESULTATS.find(t => t[0] === k) || [k, '—'])[1]; },
  tagRes(m) { const c = { obtenu: 'ok', partiel: 'w', refus: 'ko', encours: 'v', annule: '' }[m.resultat] || ''; return `<span class="tag ${c}">${esc(Mutations.res(m.resultat || 'encours'))}</span>`; },
  anneeDefaut() { const d = new Date(); return String(d.getMonth() >= 8 ? d.getFullYear() + 1 : d.getFullYear()); },

  /* ---------- Onglet de la fiche ---------- */
  tabFiche(p) {
    const ed = can('adh.modifier'), l = (p.mutations || []).slice().sort((a, b) => (b.annee || '').localeCompare(a.annee || '') || (b.dateDemande || '').localeCompare(a.dateDemande || ''));
    return `<div class="toolbar">${ed ? `<button class="btn" onclick="Mutations.edit('${p.id}')">+ Nouveau dossier de mutation</button>` : ''}</div>
      ${l.map(m => `<div class="card" style="margin-top:1rem">
        <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap"><h3 style="margin:0">${esc(m.annee || '')} · ${esc(Mutations.type(m.type))} ${Mutations.tagRes(m)}</h3>
        ${ed ? `<div><button class="btn sm sec" onclick="Mutations.echange('${p.id}','${m.id}')">+ Copier un échange</button> <button class="btn sm ghost" onclick="Mutations.edit('${p.id}','${m.id}')">Modifier</button> <button class="btn sm ghost" onclick="Mutations.suppr('${p.id}','${m.id}')">✕</button></div>` : ''}</div>
        <div class="kv" style="margin-top:.6rem"><div>Demande</div><div>${m.dateDemande ? 'déposée le ' + fmtDate(m.dateDemande) : '<span class="mut">date non renseignée</span>'}${m.phase ? ' · ' + esc(m.phase) : ''}</div>
          ${(m.motifs || []).length ? `<div>Motifs</div><div>${m.motifs.map(x => `<span class="tag v">${esc(x)}</span>`).join(' ')}</div>` : ''}
          ${m.bareme ? `<div>Barème retenu</div><div><b>${esc(m.bareme)}</b> pts${m.baremeConteste ? ' <span class="tag w">barème contesté : ' + esc(m.baremeConteste) + '</span>' : ''}</div>` : ''}
          ${m.resultat && m.resultat !== 'encours' ? `<div>Résultat</div><div>${Mutations.tagRes(m)} ${m.voeuObtenu ? esc(m.voeuObtenu) : ''} ${m.dateResultat ? '(' + fmtDate(m.dateResultat) + ')' : ''}</div>` : ''}
          ${m.recours ? `<div>Recours</div><div>${esc(m.recours)}${m.issueRecours ? ' → ' + esc(m.issueRecours) : ''}</div>` : ''}
          ${m.notes ? `<div>Notes</div><div style="white-space:pre-wrap">${esc(m.notes)}</div>` : ''}</div>
        ${(m.voeux || []).length ? `<div class="tablewrap" style="margin-top:.6rem"><table><thead><tr><th>Rang</th><th>Vœu</th><th>Code</th><th>Barème</th></tr></thead><tbody>${m.voeux.map((v, i) => `<tr ${m.voeuObtenu && Number(m.rangObtenu) === i + 1 ? 'style="background:#edf7f1"' : ''}><td>${i + 1}</td><td>${esc(v.voeu)}</td><td class="small">${esc(v.code || '')}</td><td>${esc(v.bareme || '')}</td></tr>`).join('')}</tbody></table></div>` : ''}
        ${(m.echanges || []).length ? `<details style="margin-top:.6rem" open><summary style="cursor:pointer;font-weight:600">Échanges (${m.echanges.length})</summary>${m.echanges.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(e => `<div class="small" style="border-left:3px solid #e4def0;padding:.3rem .6rem;margin:.4rem 0"><b>${fmtDate(e.date)}</b> · ${esc(e.source || '')} ${ed ? `<a href="#" class="mut" onclick="Mutations.supprEchange('${p.id}','${m.id}','${e.id}');return false">✕</a>` : ''}<div style="white-space:pre-wrap;margin-top:.2rem">${esc(e.texte)}</div></div>`).join('')}</details>` : ''}
      </div>`).join('') || '<p class="mut" style="margin-top:1rem">Aucun dossier de mutation.</p>'}`;
  },
  edit(pid, mid) {
    const p = P.get(pid); const m = mid ? p.mutations.find(x => x.id === mid) : { annee: Mutations.anneeDefaut(), type: 'inter', motifs: [], voeux: [], resultat: 'encours', dateDemande: todayISO() };
    Mutations._v = JSON.parse(JSON.stringify(m.voeux || []));
    UI.modal((mid ? 'Dossier de mutation' : 'Nouveau dossier de mutation') + ' — ' + P.full(p), `<div class="frow"><div class="f"><label>Année du mouvement</label><input id="mu_a" value="${esc(m.annee || '')}" placeholder="2027"></div>
        <div class="f" style="flex:2"><label>Type</label><select id="mu_t">${UI.opts(Mutations.TYPES, m.type)}</select></div></div>
      <div class="frow"><div class="f"><label>Date de la demande</label><input type="date" id="mu_d" value="${esc(m.dateDemande || '')}"></div><div class="f"><label>Précision (phase, poste visé…)</label><input id="mu_ph" value="${esc(m.phase || '')}"></div></div>
      <div class="f"><label>Motifs</label><div>${Mutations.MOTIFS.map((x, i) => `<label class="chk" style="display:inline-flex;margin-right:.8rem"><input type="checkbox" class="mu_m" value="${esc(x)}" ${(m.motifs || []).includes(x) ? 'checked' : ''}> ${esc(x)}</label>`).join('')}</div></div>
      <h3>Vœux formulés</h3><div id="mu_vx"></div><p><button class="btn sm sec" onclick="Mutations._v.push({voeu:'',code:'',bareme:''});Mutations.rendreVoeux()">+ Ajouter un vœu</button> <button class="btn sm ghost" onclick="Mutations.collerVoeux()">Coller une liste de vœux…</button></p>
      <div class="frow"><div class="f"><label>Barème retenu (points)</label><input id="mu_b" value="${esc(m.bareme || '')}"></div><div class="f"><label>Barème contesté / attendu</label><input id="mu_bc" value="${esc(m.baremeConteste || '')}"></div></div>
      <div class="frow"><div class="f"><label>Résultat</label><select id="mu_r">${UI.opts(Mutations.RESULTATS, m.resultat || 'encours')}</select></div><div class="f"><label>Vœu obtenu / affectation</label><input id="mu_vo" value="${esc(m.voeuObtenu || '')}"></div><div class="f" style="max-width:90px"><label>Rang</label><input id="mu_ro" value="${esc(m.rangObtenu || '')}"></div><div class="f"><label>Date du résultat</label><input type="date" id="mu_dr" value="${esc(m.dateResultat || '')}"></div></div>
      <div class="frow"><div class="f"><label>Recours</label><input id="mu_rc" value="${esc(m.recours || '')}" placeholder="ex. recours déposé le … auprès de la DGRH"></div><div class="f"><label>Issue du recours</label><input id="mu_ir" value="${esc(m.issueRecours || '')}"></div></div>
      <div class="f"><label>Notes (situation familiale, conseils donnés…)</label><textarea id="mu_n" style="min-height:70px">${esc(m.notes || '')}</textarea></div>`,
      [{ label: 'Annuler', value: null }, { label: 'Enregistrer', onClick: md => {
        const g = s => md.querySelector(s).value.trim();
        const o = mid ? m : { id: uid(), echanges: [], cree: nowISO(), par: ME.id };
        Object.assign(o, { annee: g('#mu_a'), type: g('#mu_t'), dateDemande: g('#mu_d'), phase: g('#mu_ph'), motifs: $$('.mu_m', md).filter(c => c.checked).map(c => c.value), voeux: Mutations._v.filter(v => (v.voeu || '').trim()), bareme: g('#mu_b'), baremeConteste: g('#mu_bc'), resultat: g('#mu_r'), voeuObtenu: g('#mu_vo'), rangObtenu: g('#mu_ro'), dateResultat: g('#mu_dr'), recours: g('#mu_rc'), issueRecours: g('#mu_ir'), notes: g('#mu_n'), maj: nowISO() });
        if (!mid) p.mutations.push(o);
        P.touch(p); save(); log(mid ? 'Dossier de mutation modifié' : 'Dossier de mutation créé', P.full(p) + ' (' + o.annee + ', ' + o.type + ')'); App.route();
      } }], { wide: true });
    setTimeout(Mutations.rendreVoeux, 20);
  },
  rendreVoeux() {
    const el = $('#mu_vx'); if (!el) return;
    el.innerHTML = Mutations._v.length ? `<div class="tablewrap"><table><thead><tr><th style="width:40px">Rang</th><th>Vœu (académie, commune, établissement, zone…)</th><th style="width:110px">Code</th><th style="width:90px">Barème</th><th></th></tr></thead><tbody>${Mutations._v.map((v, i) => `<tr><td>${i + 1}</td>
      <td><input value="${esc(v.voeu || '')}" oninput="Mutations._v[${i}].voeu=this.value"></td><td><input value="${esc(v.code || '')}" oninput="Mutations._v[${i}].code=this.value"></td><td><input value="${esc(v.bareme || '')}" oninput="Mutations._v[${i}].bareme=this.value"></td>
      <td class="nowrap">${i ? `<a href="#" onclick="Mutations._v.splice(${i - 1},0,Mutations._v.splice(${i},1)[0]);Mutations.rendreVoeux();return false">▲</a>` : ''} <a href="#" onclick="Mutations._v.splice(${i},1);Mutations.rendreVoeux();return false">✕</a></td></tr>`).join('')}</tbody></table></div>` : '<p class="small mut">Aucun vœu saisi.</p>';
  },
  async collerVoeux() {
    const t = await UI.prompt('Coller les vœux', 'Un vœu par ligne, dans l\'ordre. Facultatif : « vœu ; code ; barème » (séparés par ; ou tabulation, comme un copier-coller depuis I-Prof ou Excel).', '', 'textarea');
    if (!t) return;
    t.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => { const c = l.split(/\t|;/).map(x => x.trim()); const v = c[0].replace(/^\d+\s*[-.)]\s*/, ''); Mutations._v.push({ voeu: v, code: c[1] || '', bareme: c[2] || '' }); });
    Mutations.rendreVoeux();
  },
  async echange(pid, mid) {
    const p = P.get(pid), m = p.mutations.find(x => x.id === mid);
    const r = await UI.modal('Copier un échange — ' + P.full(p), `<div class="frow"><div class="f"><label>Date</label><input type="date" id="me_d" value="${todayISO()}"></div><div class="f"><label>Source</label><select id="me_s">${UI.opts(['Mail reçu', 'Mail envoyé', 'Téléphone', 'SMS / WhatsApp', 'Rendez-vous', 'Fiche de vœux reçue', 'Accusé de réception', 'Résultat officiel', 'Autre'], 'Mail reçu')}</select></div></div>
      <div class="f"><label>Texte (colle ici le mail, le SMS ou ton compte rendu)</label><textarea id="me_t" style="min-height:220px"></textarea></div>`,
      [{ label: 'Annuler', value: null }, { label: 'Ajouter', onClick: md => { const t = md.querySelector('#me_t').value.trim(); if (!t) { UI.toast('Texte vide', 'r'); return false; } return { date: md.querySelector('#me_d').value, source: md.querySelector('#me_s').value, texte: t }; } }], { wide: true });
    if (!r) return;
    m.echanges = m.echanges || []; m.echanges.push(Object.assign({ id: uid(), par: ME.id }, r)); P.touch(p); save(); log('Échange ajouté au dossier de mutation', P.full(p)); App.route();
  },
  supprEchange(pid, mid, eid) { const p = P.get(pid), m = p.mutations.find(x => x.id === mid); m.echanges = m.echanges.filter(e => e.id !== eid); P.touch(p); save(); App.route(); },
  async suppr(pid, mid) { if (!await UI.confirm('Supprimer ce dossier de mutation ?', 'Supprimer')) return; const p = P.get(pid); p.mutations = p.mutations.filter(x => x.id !== mid); P.touch(p); save(); App.route(); },

  /* ---------- Page « Suivi des mutations » ---------- */
  f: { annee: '', type: '', res: '' },
  tous() { const l = []; P.visibles().forEach(p => (p.mutations || []).forEach(m => l.push({ p, m }))); return l; },
  page() {
    const f = Mutations.f, all = Mutations.tous(), annees = Array.from(new Set(all.map(x => x.m.annee).filter(Boolean))).sort().reverse();
    const l = all.filter(({ m }) => (!f.annee || m.annee === f.annee) && (!f.type || m.type === f.type) && (!f.res || (m.resultat || 'encours') === f.res)).sort((a, b) => norm(a.p.nom).localeCompare(norm(b.p.nom)));
    const n = k => l.filter(x => (x.m.resultat || 'encours') === k).length;
    $('#main').innerHTML = `<div class="ph"><div><h1>Suivi des mutations</h1><p class="sub">Tous les dossiers de mutation des fiches. Pour en créer un : fiche de l'adhérent → onglet « Mutations ».</p></div>
      <div class="actions"><button class="btn sec" onclick="Mutations.exporter()">Exporter (Excel)</button></div></div>
      <div class="tiles"><div class="tile"><div class="n">${l.length}</div><div class="l">dossiers</div></div><div class="tile"><div class="n">${n('encours')}</div><div class="l">en cours</div></div><div class="tile"><div class="n">${n('obtenu') + n('partiel')}</div><div class="l">obtenus</div></div><div class="tile"><div class="n">${n('refus')}</div><div class="l">non satisfaits</div></div></div>
      <div class="card"><div class="toolbar"><select onchange="Mutations.f.annee=this.value;App.route()">${UI.opts(annees.map(a => [a, a]), f.annee, 'Toutes les années')}</select>
        <select onchange="Mutations.f.type=this.value;App.route()">${UI.opts(Mutations.TYPES, f.type, 'Tous les mouvements')}</select>
        <select onchange="Mutations.f.res=this.value;App.route()">${UI.opts(Mutations.RESULTATS, f.res, 'Tous les résultats')}</select></div></div>
      <div class="tablewrap"><table><thead><tr><th>Nom</th><th>Établissement</th><th>Année</th><th>Mouvement</th><th>Motifs</th><th>Vœux</th><th>Barème</th><th>Résultat</th><th>Dernier échange</th></tr></thead><tbody>
      ${l.map(({ p, m }) => `<tr class="click" onclick="Adh.tab='mut';App.go('fiche/${p.id}')"><td><b>${esc(P.full(p))}</b></td><td class="small">${esc(P.etab(p))}</td><td>${esc(m.annee || '')}</td><td class="small">${esc(Mutations.type(m.type).split(' (')[0])}</td><td class="small">${esc((m.motifs || []).join(', '))}</td><td>${(m.voeux || []).length}</td><td>${esc(m.bareme || '')}</td><td>${Mutations.tagRes(m)}${m.recours ? ' <span class="tag w">recours</span>' : ''}</td><td class="small">${(m.echanges || []).length ? fmtDate(m.echanges.map(e => e.date).sort().pop()) : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="mut">Aucun dossier</td></tr>'}</tbody></table></div>`;
  },
  exporter() {
    const rows = Mutations.tous().map(({ p, m }) => ({ Nom: (p.nom || '').toUpperCase(), Prénom: p.prenom, 'N° adhérent': p.numAdherent || '', Établissement: P.etab(p), Discipline: p.discipline || '', Année: m.annee, Mouvement: Mutations.type(m.type), 'Date de demande': fmtDate(m.dateDemande), Motifs: (m.motifs || []).join(', '), Vœux: (m.voeux || []).map((v, i) => `${i + 1}. ${v.voeu}${v.bareme ? ' (' + v.bareme + ')' : ''}`).join(' | '), Barème: m.bareme || '', 'Barème contesté': m.baremeConteste || '', Résultat: Mutations.res(m.resultat || 'encours'), 'Vœu obtenu': m.voeuObtenu || '', Recours: m.recours || '', 'Issue du recours': m.issueRecours || '', Échanges: (m.echanges || []).length }));
    exportXLSX('mutations_' + todayISO() + '.xlsx', { Mutations: rows });
  }
};
App.routes.mutations = () => Mutations.page();
