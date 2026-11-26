/* =========================================================
   Validation des modifications de fiches par l'administrateur principal
   et radiation définitive (décès, démission…)
   ========================================================= */
'use strict';
const Valid = {
  /* l'administrateur principal enregistre directement ; tous les autres proposent */
  direct() { return !!ME && ME.role === 'admin'; },
  CHAMPS: [['categorie', 'Catégorie'], ['civilite', 'Civilité'], ['nom', 'Nom'], ['prenom', 'Prénom'], ['nomNaissance', 'Nom de naissance'], ['dateNaissance', 'Date de naissance'], ['numAdherent', 'N° adhérent'],
    ['email', 'Courriel personnel'], ['emailPro', 'Courriel académique'], ['telPortable', 'Portable'], ['telFixe', 'Téléphone fixe'], ['adresse', 'Adresse'], ['cp', 'Code postal'], ['ville', 'Ville'],
    ['statut', 'Statut'], ['discipline', 'Discipline'], ['classe', 'Classe / grade'], ['echelon', 'Échelon'], ['indice', 'Indice majoré'], ['datePromo', 'Date d\'accès à l\'échelon'],
    ['academie', 'Académie'], ['militant', 'Militant référent'], ['calendrier', 'Calendrier d\'adhésion'], ['datePremiereAdhesion', 'Date de première adhésion'], ['affectations', 'Affectation(s)'], ['notes', 'Notes']],
  lib(k) { return (Valid.CHAMPS.find(c => c[0] === k) || [k, k])[1]; },
  aff(v, k) {
    if (v == null || v === '') return '';
    if (k === 'affectations') return (v || []).map(a => (a.principal ? '★ ' : '') + [a.nom || a.uai, a.ville].filter(Boolean).join(' — ')).join(' ; ');
    if (k === 'militant') return userName(v);
    if (k === 'statut') return STATUT(v)[1];
    if (k === 'categorie') return REF.categories[v] || v;
    if (k === 'classe') return Carriere.classe(v);
    if (/^date/.test(k)) return fmtDate(v);
    if (k === 'calendrier') return v === 'civil' ? 'Civil (janv.-déc.)' : 'Scolaire (sept.-août)';
    return String(v);
  },
  diff(a, b) {
    const out = {};
    Valid.CHAMPS.forEach(([k]) => { const x = JSON.stringify(a[k] == null ? '' : a[k]), y = JSON.stringify(b[k] == null ? '' : b[k]); if (x !== y) out[k] = { avant: a[k] == null ? '' : a[k], apres: b[k] == null ? '' : b[k] }; });
    return out;
  },
  attente() { return (D.validations || []).filter(v => v.statut === 'attente'); },
  de(pid) { return Valid.attente().filter(v => v.pid === pid); },
  resume(v) {
    if (v.type === 'radiation') return `Radiation définitive — ${v.radiation.motif}${v.radiation.date ? ' (' + fmtDate(v.radiation.date) + ')' : ''}${v.radiation.detail ? ' : ' + v.radiation.detail : ''}`;
    if (v.type === 'emailInvalide') return `Adresse mail signalée en erreur : ${v.email || ''}`;
    if (v.type === 'nouvelle') return 'Nouvelle fiche créée';
    return Object.entries(v.champs || {}).map(([k, c]) => `${Valid.lib(k)} : ${Valid.aff(c.avant, k) || '∅'} → ${Valid.aff(c.apres, k) || '∅'}`).join(' · ');
  },
  proposer(p, type, data) {
    D.validations = D.validations || [];
    const v = Object.assign({ id: uid(), pid: p.id, nom: P.full(p), type, date: nowISO(), par: ME.id, statut: 'attente' }, data || {});
    D.validations.push(v); save(); log('Modification proposée (à valider)', P.full(p) + ' — ' + Valid.resume(v));
    return v;
  },
  /* ---------- Côté administrateur ---------- */
  appliquer(v, choix) {
    const p = P.get(v.pid); if (!p) { v.statut = 'refusée'; v.decision = { date: nowISO(), par: ME.id, motif: 'fiche introuvable' }; return; }
    if (v.type === 'modif') {
      const before = {}; Adh.FIELDS.forEach(([f]) => before[f] = Adh.val(p, f));
      const ks = Object.keys(v.champs || {}).filter(k => !choix || choix.includes(k));
      ks.forEach(k => { p[k] = JSON.parse(JSON.stringify(v.champs[k].apres)); });
      if (p.emailInvalide && p.emailInvalide.email !== p.email) p.emailInvalide = null;
      if (p.affectations && p.affectations.length && !p.affectations.some(a => a.principal)) p.affectations[0].principal = true;
      const changed = Adh.FIELDS.map(f => f[0]).filter(f => before[f] !== Adh.val(p, f));
      P.touch(p, changed); p.majPar = v.par;
      v.retenus = ks;
    } else if (v.type === 'radiation') Radiation.appliquer(p, v.radiation, v.par);
    else if (v.type === 'emailInvalide') { p.emailInvalide = { date: (v.date || '').slice(0, 10), email: v.email || p.email, par: v.par }; P.touch(p); }
    else if (v.type === 'nouvelle') { delete p.aValider; P.touch(p); }
    v.statut = 'validée'; v.decision = { date: nowISO(), par: ME.id };
    log('Modification validée', `${P.full(p)} — proposée par ${userName(v.par)} : ${Valid.resume(v)}`);
  },
  refuser(v, motif) {
    v.statut = 'refusée'; v.decision = { date: nowISO(), par: ME.id, motif: motif || '' };
    const p = P.get(v.pid);
    if (v.type === 'nouvelle' && p) { p.archive = 'refusée'; delete p.aValider; P.touch(p); }
    log('Modification refusée', `${v.nom} — proposée par ${userName(v.par)} : ${Valid.resume(v)}${motif ? ' (motif : ' + motif + ')' : ''}`);
  },
  valider(id) { const v = (D.validations || []).find(x => x.id === id); if (!v) return; const ch = $$(`.vch[data-v="${id}"]`); Valid.appliquer(v, ch.length ? ch.filter(c => c.checked).map(c => c.dataset.k) : null); save(); App.refresh(); },
  async refuserUI(id) { const v = (D.validations || []).find(x => x.id === id); if (!v) return; const m = await UI.prompt('Refuser la modification', 'Motif (facultatif, visible par la personne qui l\'a proposée) :', ''); if (m == null) return; Valid.refuser(v, m); save(); App.refresh(); },
  async toutValider() { const l = Valid.attente(); if (!l.length || !await UI.confirm(`Valider les ${l.length} modification(s) en attente ?`, 'Tout valider')) return; l.forEach(v => Valid.appliquer(v)); save(); App.refresh(); },
  carte(v, admin) {
    const p = P.get(v.pid);
    const corps = v.type === 'modif' ? `<div class="tablewrap"><table><thead><tr>${admin ? '<th></th>' : ''}<th>Champ</th><th>Valeur actuelle</th><th>Proposée</th></tr></thead><tbody>${Object.entries(v.champs || {}).map(([k, c]) => `<tr>${admin ? `<td><input type="checkbox" class="vch" data-v="${v.id}" data-k="${k}" checked></td>` : ''}<td>${esc(Valid.lib(k))}</td><td><span class="diffold">${esc(Valid.aff(c.avant, k))}</span></td><td><span class="diffnew">${esc(Valid.aff(c.apres, k))}</span></td></tr>`).join('')}</tbody></table></div>`
      : `<p>${esc(Valid.resume(v))}</p>`;
    return `<div class="card" style="border-left:4px solid ${v.type === 'radiation' ? '#8c1c2c' : '#e87400'}"><div class="small mut">${fmtDT(v.date)} — proposé par <b>${esc(userName(v.par) || '?')}</b>${v.source === 'retour' ? ' (reçu par retour)' : ''}</div>
      <h3 style="margin:.3rem 0">${p ? `<a href="#/fiche/${p.id}">${esc(P.full(p))}</a>` : esc(v.nom)} <span class="tag ${v.type === 'radiation' ? 'ko' : 'w'}">${esc({ modif: 'Modification', radiation: 'Radiation définitive', emailInvalide: 'Mail en erreur', nouvelle: 'Nouvelle fiche' }[v.type] || v.type)}</span></h3>${corps}
      ${admin ? `<p><button class="btn ok" onclick="Valid.valider('${v.id}')">✓ Valider${v.type === 'modif' ? ' les champs cochés' : ''}</button> <button class="btn sec" onclick="Valid.refuserUI('${v.id}')">✕ Refuser</button></p>` : '<p class="small mut">En attente de validation par le secrétaire académique.</p>'}</div>`;
  },
  page() {
    if (!Valid.direct()) { $('#main').innerHTML = '<div class="alert r">Réservé à l\'administrateur principal.</div>'; return; }
    const l = Valid.attente().sort((a, b) => a.date < b.date ? -1 : 1);
    const faites = (D.validations || []).filter(v => v.statut !== 'attente').sort((a, b) => ((b.decision || {}).date || '') < ((a.decision || {}).date || '') ? -1 : 1).slice(0, 100);
    const rad = D.personnes.filter(p => p.radiation).sort((a, b) => (b.radiation.date || '') < (a.radiation.date || '') ? -1 : 1);
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Modifications à valider</h1><div class="mut small">Les modifications de fiches faites par les autres utilisateurs (y compris S3 adjoints) ne sont enregistrées qu'après ta validation. Seules les modifications validées partent ensuite dans « Différences → national ».</div></div>
      <div class="actions">${l.length ? '<button class="btn ok" onclick="Valid.toutValider()">✓ Tout valider</button>' : ''}</div></div>
      ${l.map(v => Valid.carte(v, true)).join('') || '<div class="card"><p>Aucune modification en attente 👍</p></div>'}
      <h2>Fiches radiées définitivement (${rad.length})</h2><div class="tablewrap"><table><thead><tr><th>Personne</th><th>Motif</th><th>Date</th><th>Précision</th><th>National</th><th></th></tr></thead><tbody>
      ${rad.map(p => `<tr><td><a href="#/fiche/${p.id}"><b>${esc(P.full(p))}</b></a></td><td>${esc(p.radiation.motif)}</td><td>${fmtDate(p.radiation.date)}</td><td class="small">${esc(p.radiation.detail || '')}</td><td class="small">${p.radiation.national ? (p.radiation.signale ? 'signalé le ' + fmtDate(p.radiation.signale) : '<span class="tag w">à signaler</span>') : '—'}</td><td><button class="btn sm ghost" onclick="Radiation.annuler('${p.id}')">Annuler la radiation</button></td></tr>`).join('') || '<tr><td colspan="6" class="mut">Aucune</td></tr>'}</tbody></table></div>
      <h2>Dernières décisions</h2><div class="tablewrap"><table><thead><tr><th>Décision</th><th>Fiche</th><th>Proposé par</th><th>Contenu</th></tr></thead><tbody>
      ${faites.map(v => `<tr><td class="small nowrap">${v.statut === 'validée' ? '<span class="tag ok">validée</span>' : '<span class="tag ko">refusée</span>'}<br>${fmtDT((v.decision || {}).date)}</td><td>${esc(v.nom)}</td><td class="small">${esc(userName(v.par))}<br>${fmtDT(v.date)}</td><td class="small">${esc(Valid.resume(v))}${(v.decision || {}).motif ? '<br><i>Motif : ' + esc(v.decision.motif) + '</i>' : ''}</td></tr>`).join('') || '<tr><td colspan="4" class="mut">Aucune</td></tr>'}</tbody></table></div>`;
  },
  /* bandeau sur la fiche */
  bandeau(p) {
    const l = Valid.de(p.id), admin = Valid.direct();
    let h = '';
    if (p.radiation) h += `<div class="alert r"><b>Radié(e) définitivement</b> — ${esc(p.radiation.motif)}${p.radiation.date ? ' le ' + fmtDate(p.radiation.date) : ''}${p.radiation.detail ? ' : ' + esc(p.radiation.detail) : ''}. Ne plus solliciter. ${admin ? `<button class="btn sm ghost" onclick="Radiation.annuler('${p.id}')">Annuler la radiation</button>` : ''}</div>`;
    if (p.aValider) h += `<div class="alert w">Nouvelle fiche créée par ${esc(userName(p.aValider.par))} : en attente de validation${admin ? '' : ' par le secrétaire académique'}.</div>`;
    if (l.length) h += `<div class="alert w"><b>${plural(l.length, 'modification')} en attente de validation</b>${admin ? '' : ' par le secrétaire académique : la fiche affiche encore les valeurs enregistrées'}.</div>` + l.map(v => Valid.carte(v, admin)).join('');
    const refus = (D.validations || []).filter(v => v.pid === p.id && v.statut === 'refusée' && v.par === ME.id && !admin && (v.decision || {}).date > (p.vuRefus || ''));
    refus.forEach(v => { h += `<div class="alert small">Ta proposition du ${fmtDate(v.date)} a été refusée${v.decision.motif ? ' : ' + esc(v.decision.motif) : ''}.</div>`; });
    return h;
  }
};
App.routes.validations = () => Valid.page();

const Radiation = {
  MOTIFS: ['Décès', 'Démission du syndicat', 'Ne souhaite plus être contacté(e)', 'Départ en retraite sans suite', 'Départ hors de l\'Éducation nationale', 'Départ à l\'étranger', 'Exclusion', 'Autre'],
  ouvrir(id) {
    const p = P.get(id); if (!p) return;
    UI.modal('Radiation définitive', `<p><b>${esc(P.full(p))}</b> sera retiré(e) de toutes les listes (fichier, relances, mails et SMS, cahier de votants, « à faire adhérer ») et ne sera plus sollicité(e). La fiche est conservée pour l'historique ; le fichier national ne la réactive pas.</p>
      <div class="frow"><div class="f"><label>Motif</label><select id="ra_m">${UI.opts(Radiation.MOTIFS, 'Décès')}</select></div><div class="f"><label>Date</label><input type="date" id="ra_d" value="${todayISO()}"></div></div>
      <div class="f"><label>Précision (facultatif)</label><input id="ra_x" placeholder="ex. appris par un collègue, date des obsèques…"></div>
      ${p.categorie === 'adherent' || p.numAdherent ? '<label class="chk"><input type="checkbox" id="ra_n" checked> Signaler la radiation au national (dans « Différences → national »)</label>' : ''}
      ${Valid.direct() ? '' : '<div class="alert w small">La radiation sera effective après validation par le secrétaire académique.</div>'}`,
      [{ label: 'Annuler' }, {
        label: Valid.direct() ? 'Radier définitivement' : 'Proposer la radiation', cls: 'red', onClick: m => {
          const r = { motif: m.querySelector('#ra_m').value, date: m.querySelector('#ra_d').value, detail: m.querySelector('#ra_x').value.trim(), national: !!(m.querySelector('#ra_n') || {}).checked };
          if (Valid.direct()) Radiation.appliquer(p, r, ME.id); else { Valid.proposer(p, 'radiation', { radiation: r }); UI.toast('Radiation proposée : en attente de validation', 'g'); }
          save(); setTimeout(() => App.refresh(), 30);
        }
      }]);
  },
  appliquer(p, r, par) {
    p.radiation = Object.assign({}, r, { par: par || ME.id, valideLe: nowISO(), signale: null });
    p.archive = 'radiation'; p.refusAdhesion = p.refusAdhesion || todayISO();
    P.touch(p); log('Radiation définitive', `${P.full(p)} — ${r.motif}${r.date ? ' (' + fmtDate(r.date) + ')' : ''}${r.detail ? ' : ' + r.detail : ''}`);
  },
  async annuler(id) {
    const p = P.get(id); if (!p || !Valid.direct()) return;
    if (!await UI.confirm(`Annuler la radiation de ${esc(P.full(p))} ? La fiche revient dans le fichier.`, 'Annuler la radiation')) return;
    log('Radiation annulée', P.full(p) + ' — ' + (p.radiation || {}).motif); p.radiation = null; p.archive = null; P.touch(p); App.refresh();
  }
};
