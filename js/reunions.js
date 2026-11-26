/* =========================================================
   Réunions & présences (émargement des participants)
   ========================================================= */
'use strict';
const Reu = {
  TYPES: ['Réunion d\'information syndicale (RIS / HIS)', 'Stage syndical', 'Bureau académique', 'Conseil syndical', 'Assemblée générale', 'Réunion d\'établissement', 'Audience rectorat', 'Instance (CSA, CAPA, F3SCT…)', 'Autre'],
  page() {
    const l = D.reunions.slice().sort((a, b) => (a.date || '') < (b.date || '') ? 1 : -1);
    const ap = l.filter(r => r.date >= todayISO()), pa = l.filter(r => r.date < todayISO());
    const row = r => { const pr = r.participants.filter(x => x.statut === 'présent').length; return `<tr class="click" onclick="App.go('reunion/${r.id}')"><td>${fmtDate(r.date)} ${esc(r.heure || '')}</td><td><b>${esc(r.titre)}</b>${typeof Agenda !== 'undefined' && Agenda.vacance(Agenda.zoneDefaut(), r.date) ? ' <span class="tag w" title="Pendant les vacances scolaires de notre zone">' + esc(Agenda.vacance(Agenda.zoneDefaut(), r.date)) + '</span>' : ''}<div class="small mut">${esc(r.type || '')}</div></td><td>${esc(r.lieu || '')}</td><td class="num">${pr} / ${r.participants.length}</td></tr>`; };
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Réunions & présences</h1><div class="small"><a href="#/agenda">📅 Voir l'agenda avec les congés scolaires</a></div></div><div class="actions">${can('reu.gerer') ? `<button class="btn" onclick="Reu.edit()">+ Nouvelle réunion</button>` : ''}</div></div>
      <h2>À venir</h2><div class="tablewrap"><table><thead><tr><th>Date</th><th>Réunion</th><th>Lieu</th><th class="num">Présents / inscrits</th></tr></thead><tbody>${ap.map(row).join('') || '<tr><td colspan="4" class="mut">Aucune</td></tr>'}</tbody></table></div>
      <h2>Passées</h2><div class="tablewrap"><table><thead><tr><th>Date</th><th>Réunion</th><th>Lieu</th><th class="num">Présents / inscrits</th></tr></thead><tbody>${pa.map(row).join('') || '<tr><td colspan="4" class="mut">Aucune</td></tr>'}</tbody></table></div>`;
  },
  edit(id) {
    const r = id ? D.reunions.find(x => x.id === id) : { date: todayISO(), heure: '14:00', type: Reu.TYPES[0], participants: [] };
    UI.modal(id ? 'Modifier la réunion' : 'Nouvelle réunion', `<div class="f"><label>Intitulé</label><input id="r_t" value="${esc(r.titre || '')}"></div>
      <div class="frow"><div class="f"><label>Type</label><select id="r_ty">${UI.opts(Reu.TYPES, r.type)}</select></div><div class="f"><label>Date</label><input type="date" id="r_d" value="${esc(r.date)}"></div><div class="f"><label>Heure</label><input type="time" id="r_h" value="${esc(r.heure || '')}"></div><div class="f"><label>Lieu</label><input id="r_l" value="${esc(r.lieu || '')}"></div></div>
      <div class="f"><label>Ordre du jour</label><textarea id="r_o">${esc(r.odj || '')}</textarea></div>`,
      [{ label: 'Annuler' }, { label: 'Enregistrer', onClick: m => { Object.assign(r, { titre: m.querySelector('#r_t').value || 'Réunion', type: m.querySelector('#r_ty').value, date: m.querySelector('#r_d').value, heure: m.querySelector('#r_h').value, lieu: m.querySelector('#r_l').value, odj: m.querySelector('#r_o').value }); if (!id) { r.id = uid(); r.par = ME.id; D.reunions.push(r); } save(); log('Réunion', r.titre); App.go('reunion/' + r.id); setTimeout(App.route, 0); } }], { wide: true });
  },
  fiche(id) {
    const r = D.reunions.find(x => x.id === id); if (!r) return App.go('reunions');
    const g = can('reu.gerer');
    const nom = x => x.pid ? (P.get(x.pid) ? P.full(P.get(x.pid)) : '?') : x.uid ? userName(x.uid) : x.nom;
    const etab = x => x.pid && P.get(x.pid) ? P.etab(P.get(x.pid)) : (x.etab || '');
    const cnt = s => r.participants.filter(x => x.statut === s).length;
    $('#main').innerHTML = `<div class="pagehead noprint"><a class="btn ghost sm" href="#/reunions">← Réunions</a></div>
      <div class="card"><div class="fiche-head"><div><div class="big">${esc(r.titre)}</div><div class="mut">${esc(r.type || '')} — ${fmtDate(r.date)} ${esc(r.heure || '')} — ${esc(r.lieu || '')}</div></div>
      <div class="noprint" style="margin-left:auto;display:flex;gap:.4rem;flex-wrap:wrap">${g ? `<button class="btn sec" onclick="Reu.edit('${r.id}')">Modifier</button><button class="btn sec" onclick="Reu.ajouter('${r.id}')">+ Participants</button>` : ''}<button class="btn sec" onclick="Reu.feuille('${r.id}')">🖨 Feuille d'émargement</button>${can('frais.saisir') ? `<button class="btn sec" onclick="Frais.edit(null,'${r.id}')">🧾 Déclarer mes frais</button>` : ''}${g ? `<button class="btn sec" onclick="Reu.suppr('${r.id}')">Supprimer</button>` : ''}</div></div>
      ${r.odj ? `<div class="msg" style="margin-top:.6rem">${esc(r.odj)}</div>` : ''}</div>
      <p><span class="tag ok">${cnt('présent')} présents</span> <span class="tag w">${cnt('excusé')} excusés</span> <span class="tag ko">${cnt('absent')} absents</span> <span class="tag">${cnt('invité')} sans réponse</span></p>
      <div class="tablewrap"><table><thead><tr><th>Participant</th><th>Établissement</th><th>Présence</th><th class="hide-m">Arrivée</th></tr></thead><tbody>
      ${r.participants.map((x, i) => `<tr><td><b>${esc(nom(x))}</b>${x.pid ? ` <a class="small" href="#/fiche/${x.pid}">fiche</a>` : ''}</td><td class="small">${esc(etab(x))}</td>
        <td>${g ? `<div class="pill-select">${['présent', 'excusé', 'absent', 'invité'].map(s => `<button class="${x.statut === s ? 'on' : ''}" onclick="Reu.statut('${r.id}',${i},'${s}')">${s === 'invité' ? '?' : s}</button>`).join('')}<button onclick="Reu.retirer('${r.id}',${i})" title="Retirer">✕</button></div>` : esc(x.statut)}</td><td class="hide-m small">${esc(x.heure || '')}</td></tr>`).join('') || '<tr><td colspan="4" class="mut">Aucun participant : ajoute-les depuis le fichier.</td></tr>'}</tbody></table></div>
      ${g ? `<div class="card" style="margin-top:1rem"><h3 style="margin-top:0">Compte rendu / notes</h3><textarea onchange="D.reunions.find(x=>x.id==='${r.id}').cr=this.value;save()" style="min-height:140px">${esc(r.cr || '')}</textarea></div>` : ''}`;
  },
  statut(id, i, s) { const r = D.reunions.find(x => x.id === id); const x = r.participants[i]; x.statut = s; if (s === 'présent' && !x.heure) x.heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); save(); Reu.fiche(id); },
  retirer(id, i) { const r = D.reunions.find(x => x.id === id); r.participants.splice(i, 1); save(); Reu.fiche(id); },
  async suppr(id) { if (!await UI.confirm('Supprimer cette réunion ?', 'Supprimer')) return; D.reunions = D.reunions.filter(x => x.id !== id); save(); App.go('reunions'); },
  ajouter(id) {
    const r = D.reunions.find(x => x.id === id);
    UI.modal('Ajouter des participants', `<div class="frow"><div class="f"><label>Rechercher dans le fichier</label><input id="ra_q" oninput="Reu.cherche('${id}',this.value)" placeholder="Nom, établissement…"></div>
      <div class="f"><label>Ajouter tout un établissement</label><select onchange="Reu.ajoutEtab('${id}',this.value)">${UI.opts(Votants.etabOptions(), '', '—')}</select></div></div>
      <div id="ra_res" style="max-height:40vh;overflow:auto"></div>
      <div class="frow" style="margin-top:.6rem"><div class="f"><label>Ou personne hors fichier</label><input id="ra_libre" placeholder="Nom Prénom"></div><div class="f"><label>Établissement</label><input id="ra_le"></div><div class="f"><label>&nbsp;</label><button class="btn sec" onclick="Reu.ajoutLibre('${id}')">Ajouter</button></div></div>
      <div class="f"><label class="chk"><input type="checkbox" id="ra_users" onchange="if(this.checked){Reu.ajoutUsers('${id}')}"> Ajouter tous les utilisateurs de l'application (militants)</label></div>`, [{ label: 'Terminé', onClick: () => { Reu.fiche(id); } }], { wide: true });
  },
  cherche(id, q) {
    const r = D.reunions.find(x => x.id === id); q = norm(q);
    const l = q.length < 2 ? [] : P.visibles().filter(p => norm(P.full(p) + ' ' + P.etab(p)).includes(q)).slice(0, 40);
    $('#ra_res').innerHTML = l.map(p => { const in_ = r.participants.some(x => x.pid === p.id); return `<div class="chk"><button class="btn sm ${in_ ? 'ok' : 'sec'}" ${in_ ? 'disabled' : ''} onclick="Reu.add('${id}',{pid:'${p.id}'});this.disabled=true;this.classList.add('ok');this.textContent='✓'">${in_ ? '✓' : '+'}</button> ${esc(P.full(p))} <span class="small mut">${esc(P.etab(p))}</span></div>`; }).join('');
  },
  add(id, o) { const r = D.reunions.find(x => x.id === id); if (o.pid && r.participants.some(x => x.pid === o.pid)) return; if (o.uid && r.participants.some(x => x.uid === o.uid)) return; r.participants.push(Object.assign({ statut: 'invité' }, o)); save(); },
  ajoutEtab(id, e) { if (!e) return; P.visibles().filter(p => P.uais(p).includes(e) || P.etab(p) === e).forEach(p => Reu.add(id, { pid: p.id })); UI.toast('Collègues de l\'établissement ajoutés', 'g'); },
  ajoutLibre(id) { const n = $('#ra_libre').value.trim(); if (!n) return; Reu.add(id, { nom: n, etab: $('#ra_le').value.trim() }); $('#ra_libre').value = ''; UI.toast('Ajouté', 'g'); },
  ajoutUsers(id) { D.users.filter(u => u.actif !== false).forEach(u => Reu.add(id, { uid: u.id })); UI.toast('Utilisateurs ajoutés', 'g'); },
  feuille(id) {
    const r = D.reunions.find(x => x.id === id);
    const nom = x => x.pid ? (P.get(x.pid) ? P.full(P.get(x.pid)) : '?') : x.uid ? userName(x.uid) : x.nom;
    const etab = x => x.pid && P.get(x.pid) ? P.etab(P.get(x.pid)) : (x.etab || '');
    const w = window.open('', '_blank'); const base = location.href.replace(/#.*$/, '').replace(/[^/]*$/, '');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Émargement</title><style>body{font:11pt system-ui,Arial;margin:1.2cm}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:8px 6px;text-align:left}th{background:#e8edf6}h1{font-size:15pt;color:#1b2a4a;margin:0}.h{display:flex;gap:16px;align-items:center;margin-bottom:12px}img{height:46px}</style></head><body>
      <div class="h"><img src="${base}img/logo-snetaa.png"><img src="${base}img/logo-fnec.png"><div><h1>Feuille d'émargement</h1><div>${esc(r.titre)} — ${esc(r.type || '')}<br>${fmtDate(r.date)} ${esc(r.heure || '')} — ${esc(r.lieu || '')}</div></div></div>
      <table><tr><th style="width:4%">#</th><th style="width:30%">Nom Prénom</th><th style="width:30%">Établissement</th><th>Signature</th></tr>
      ${r.participants.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(nom(x))}</td><td>${esc(etab(x))}</td><td></td></tr>`).join('')}${Array.from({ length: 8 }, (_, i) => `<tr><td>${r.participants.length + i + 1}</td><td></td><td></td><td></td></tr>`).join('')}</table>
      <script>setTimeout(()=>print(),500)<\/script></body></html>`);
    w.document.close();
  }
};
App.routes.reunions = () => Reu.page();
App.routes.reunion = id => Reu.fiche(id);
