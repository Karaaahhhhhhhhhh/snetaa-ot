/* =========================================================
   Réunions & présences
   - convocation : réponses (vient / ne vient pas / en attente)
   - jour J : pointage présent / absent, pouvoirs (procurations)
   - droit de vote réservé aux membres d'instances (mandats),
     calcul du quorum avec règle réglable
   - compte rendu PDF (partage WhatsApp) et résumé texte
   ========================================================= */
'use strict';
const Reu = {
  TYPES: ['Réunion d\'information syndicale (RIS / HIS)', 'Stage syndical', 'Bureau académique', 'Bureau académique élargi', 'Conseil syndical', 'Assemblée générale', 'Réunion d\'établissement', 'Audience rectorat', 'Instance (CSA, CAPA, F3SCT…)', 'Autre'],
  /* mandats donnant le droit de vote, proposés par défaut selon le type de réunion */
  VOTE_DEFAUT: {
    'Bureau académique': ['S3', 'S3A', 'TRES', 'TRESA', 'SEC', 'BUR'],
    'Bureau académique élargi': ['S3', 'S3A', 'TRES', 'TRESA', 'SEC', 'BUR'],
    'Conseil syndical': ['CSA']
  },
  REGLES: {
    majorite: ['Majorité absolue (moitié + 1)', n => Math.floor(n / 2) + 1],
    moitie: ['La moitié au moins', n => Math.ceil(n / 2)],
    tiers: ['Un tiers au moins', n => Math.ceil(n / 3)],
    deuxtiers: ['Deux tiers au moins', n => Math.ceil(2 * n / 3)],
    pct: ['Pourcentage des membres', (n, q) => Math.ceil(n * (+q.pct || 0) / 100)],
    fixe: ['Nombre fixe de membres', (n, q) => Math.max(0, +q.fixe || 0)],
    aucun: ['Pas de quorum', () => 0]
  },
  get(id) { return D.reunions.find(x => x.id === id); },

  /* ---------- Liste des réunions ---------- */
  page() {
    const l = D.reunions.slice().sort((a, b) => (a.date || '') < (b.date || '') ? 1 : -1);
    const ap = l.filter(r => r.date >= todayISO()), pa = l.filter(r => r.date < todayISO());
    const row = r => { const pr = r.participants.filter(x => x.statut === 'présent').length, oui = r.participants.filter(x => Reu.rep(x) === 'oui').length;
      return `<tr class="click" onclick="App.go('reunion/${r.id}')"><td>${fmtDate(r.date)} ${esc(r.heure || '')}</td><td><b>${esc(r.titre)}</b>${r.vote && r.vote.actif ? ' <span class="tag v">🗳 vote</span>' : ''}${typeof Agenda !== 'undefined' && Agenda.vacance(Agenda.zoneDefaut(), r.date) ? ' <span class="tag w" title="Pendant les vacances scolaires de notre zone">' + esc(Agenda.vacance(Agenda.zoneDefaut(), r.date)) + '</span>' : ''}<div class="small mut">${esc(r.type || '')}</div></td><td>${esc(r.lieu || '')}</td><td class="num">${r.date >= todayISO() && !pr ? oui + ' viennent / ' + r.participants.length : pr + ' / ' + r.participants.length}</td></tr>`; };
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Réunions & présences</h1><div class="small"><a href="#/agenda">📅 Voir l'agenda avec les congés scolaires</a></div></div><div class="actions">${can('reu.gerer') ? `<button class="btn" onclick="Reu.edit()">+ Nouvelle réunion</button>` : ''}</div></div>
      <h2>À venir</h2><div class="tablewrap"><table><thead><tr><th>Date</th><th>Réunion</th><th>Lieu</th><th class="num">Participation</th></tr></thead><tbody>${ap.map(row).join('') || '<tr><td colspan="4" class="mut">Aucune</td></tr>'}</tbody></table></div>
      <h2>Passées</h2><div class="tablewrap"><table><thead><tr><th>Date</th><th>Réunion</th><th>Lieu</th><th class="num">Présents / invités</th></tr></thead><tbody>${pa.map(row).join('') || '<tr><td colspan="4" class="mut">Aucune</td></tr>'}</tbody></table></div>`;
  },

  /* ---------- Création / modification ---------- */
  edit(id) {
    const r = id ? Reu.get(id) : { date: todayISO(), heure: '14:00', type: Reu.TYPES[0], participants: [] };
    const v = r.vote || { actif: false, mandats: [] }, q = Reu.regle(r);
    const acad = Mandats.TYPES.filter(t => t[2] === 'acad');
    UI.modal(id ? 'Modifier la réunion' : 'Nouvelle réunion', `<div class="f"><label>Intitulé</label><input id="r_t" value="${esc(r.titre || '')}"></div>
      <div class="frow"><div class="f"><label>Type</label><select id="r_ty" onchange="Reu.typeChange(this.value)">${UI.opts(Reu.TYPES, r.type)}</select></div><div class="f"><label>Date</label><input type="date" id="r_d" value="${esc(r.date)}"></div><div class="f"><label>Heure</label><input type="time" id="r_h" value="${esc(r.heure || '')}"></div><div class="f"><label>Lieu</label><input id="r_l" value="${esc(r.lieu || '')}"></div></div>
      <div class="f"><label>Ordre du jour</label><textarea id="r_o">${esc(r.odj || '')}</textarea></div>
      <div class="card" style="margin:.6rem 0 0"><label class="chk"><input type="checkbox" id="r_va" ${v.actif ? 'checked' : ''} onchange="$('#r_vw').style.display=this.checked?'':'none'"> <b>Droit de vote réservé aux membres d'une instance</b></label>
        <div id="r_vw" style="${v.actif ? '' : 'display:none'}">
          <p class="small mut" style="margin:.3rem 0">Ont le droit de vote les participants qui ont un mandat en cours parmi :</p>
          <div style="display:flex;flex-wrap:wrap;gap:.2rem 1rem">${acad.map(t => `<label class="chk"><input type="checkbox" class="r_vm" value="${t[0]}" ${(v.mandats || []).includes(t[0]) ? 'checked' : ''}> ${esc(t[1])}</label>`).join('')}</div>
          <div class="frow" style="margin-top:.5rem"><div class="f"><label>Règle du quorum</label><select id="r_qr" onchange="$('#r_qpw').style.display=this.value==='pct'?'':'none';$('#r_qfw').style.display=this.value==='fixe'?'':'none'">${UI.opts(Object.entries(Reu.REGLES).map(([k, x]) => [k, x[0]]), q.regle)}</select></div>
            <div class="f" id="r_qpw" style="${q.regle === 'pct' ? '' : 'display:none'}"><label>Pourcentage</label><input type="number" id="r_qp" min="1" max="100" value="${esc(q.pct)}"></div>
            <div class="f" id="r_qfw" style="${q.regle === 'fixe' ? '' : 'display:none'}"><label>Nombre de membres</label><input type="number" id="r_qf" min="0" value="${esc(q.fixe)}"></div></div>
          <label class="chk"><input type="checkbox" id="r_qpo" ${q.pouvoirs ? 'checked' : ''}> Les pouvoirs (procurations) comptent pour le quorum</label>
          <p class="small mut">Vérifie la règle dans les statuts. Le droit de vote peut aussi être ajusté participant par participant.</p></div></div>`,
      [{ label: 'Annuler' }, { label: 'Enregistrer', onClick: m => {
        Object.assign(r, { titre: m.querySelector('#r_t').value || 'Réunion', type: m.querySelector('#r_ty').value, date: m.querySelector('#r_d').value, heure: m.querySelector('#r_h').value, lieu: m.querySelector('#r_l').value, odj: m.querySelector('#r_o').value });
        r.vote = { actif: m.querySelector('#r_va').checked, mandats: $$('.r_vm', m).filter(c => c.checked).map(c => c.value) };
        r.quorum = { regle: m.querySelector('#r_qr').value, pct: +m.querySelector('#r_qp').value || 50, fixe: +m.querySelector('#r_qf').value || 0, pouvoirs: m.querySelector('#r_qpo').checked };
        D.meta.reuQuorum = r.quorum;
        if (r.vote.actif && !r.vote.mandats.length) { UI.toast('Coche au moins un mandat donnant le droit de vote', 'r'); return false; }
        if (!id) { r.id = uid(); r.par = ME.id; D.reunions.push(r); }
        save(); log('Réunion', r.titre); App.go('reunion/' + r.id); setTimeout(App.route, 0);
      } }], { wide: true });
  },
  typeChange(t) {
    const d = Reu.VOTE_DEFAUT[t]; if (!d) return;
    $('#r_va').checked = true; $('#r_vw').style.display = '';
    $$('.r_vm').forEach(c => { c.checked = d.includes(c.value); });
    if (!$('#r_t').value) $('#r_t').value = t;
  },

  /* ---------- Règles : réponses, vote, quorum ---------- */
  rep(x) { return x.rep || (x.statut === 'excusé' ? 'non' : x.statut === 'présent' ? 'oui' : ''); },
  pres(x) { return x.statut === 'présent' ? 'présent' : (x.statut === 'absent' || x.statut === 'excusé') ? 'absent' : ''; },
  pointe(r) { return r.participants.some(x => x.statut === 'présent' || x.statut === 'absent'); },
  nom(x) { return x.pid ? (P.get(x.pid) ? P.full(P.get(x.pid)) : '?') : x.uid ? userName(x.uid) : x.nom; },
  etab(x) { return x.pid && P.get(x.pid) ? P.etab(P.get(x.pid)) : (x.etab || ''); },
  mandatsVote(r, x) { const p = x.pid && P.get(x.pid); if (!p || !r.vote) return []; return Mandats.de(p).filter(m => (r.vote.mandats || []).includes(m.type)); },
  votant(r, x) { if (!r.vote || !r.vote.actif) return false; if (x.votant === true || x.votant === false) return x.votant; return Reu.mandatsVote(r, x).length > 0; },
  regle(r) { const q = Object.assign({ regle: 'majorite', pct: 50, fixe: 12, pouvoirs: false }, D.meta.reuQuorum || {}, r.quorum || {}); if (!Reu.REGLES[q.regle]) q.regle = 'majorite'; return q; },
  libRegle(q) { return q.regle === 'pct' ? q.pct + ' % des membres' : q.regle === 'fixe' ? q.fixe + ' membres' : Reu.REGLES[q.regle][0].toLowerCase(); },
  quorum(r, jour) {
    const q = Reu.regle(r), b = r.participants.filter(x => Reu.votant(r, x)), n = b.length, requis = Reu.REGLES[q.regle][1](n, q);
    const pres = jour ? b.filter(x => x.statut === 'présent').length : b.filter(x => Reu.rep(x) === 'oui').length;
    const pouv = b.filter(x => x.statut !== 'présent' && x.pouvoir).length;
    const compte = pres + (q.pouvoirs ? pouv : 0);
    return { n, requis, pres, pouv, compte, aucun: q.regle === 'aucun', atteint: q.regle === 'aucun' || compte >= requis, manque: Math.max(0, requis - compte), voix: pres + pouv, q };
  },
  categories(r) {
    const pt = Reu.pointe(r), L = r.participants.slice().sort((a, b) => (Reu.votant(r, b) - Reu.votant(r, a)) || Reu.nom(a).localeCompare(Reu.nom(b), 'fr'));
    if (pt) return { pt, presents: L.filter(x => x.statut === 'présent'), excuses: L.filter(x => x.statut !== 'présent' && Reu.rep(x) === 'non'), absents: L.filter(x => x.statut !== 'présent' && Reu.rep(x) !== 'non') };
    return { pt, presents: L.filter(x => Reu.rep(x) === 'oui'), excuses: L.filter(x => Reu.rep(x) === 'non'), absents: L.filter(x => !Reu.rep(x)) };
  },

  /* ---------- Fiche d'une réunion ---------- */
  mode: {}, groupe: 'tous', filtre: 'tous', q: '',
  fiche(id) {
    const r = Reu.get(id); if (!r) return App.go('reunions');
    if (Reu._cur !== id) { Reu._cur = id; Reu.groupe = 'tous'; Reu.filtre = 'tous'; Reu.q = ''; }
    const g = can('reu.gerer'), vote = r.vote && r.vote.actif;
    const mode = Reu.mode[id] || (r.date <= todayISO() ? 'jour' : 'rep');
    $('#main').innerHTML = `<div class="pagehead noprint"><a class="btn ghost sm" href="#/reunions">← Réunions</a></div>
      <div class="card"><div class="fiche-head"><div><div class="big">${esc(r.titre)}</div><div class="mut">${esc(r.type || '')} — ${fmtDate(r.date)} ${esc(r.heure || '')} — ${esc(r.lieu || '')}</div></div>
      <div class="noprint" style="margin-left:auto;display:flex;gap:.4rem;flex-wrap:wrap">${g ? `<button class="btn sec" onclick="Reu.edit('${r.id}')">Modifier</button><button class="btn sec" onclick="Reu.ajouter('${r.id}')">+ Participants</button>` : ''}<button class="btn sec" onclick="Reu.feuille('${r.id}')">🖨 Émargement</button><button class="btn sec" onclick="Reu.pdf('${r.id}')">📄 Compte rendu PDF</button>${can('frais.saisir') ? `<button class="btn sec" onclick="Frais.depuisReunion('${r.id}')">🧾 Déclarer mes frais</button>` : ''}${g ? `<button class="btn sec" onclick="Reu.suppr('${r.id}')">Supprimer</button>` : ''}</div></div>
      ${r.odj ? `<div class="msg" style="margin-top:.6rem">${esc(r.odj)}</div>` : ''}</div>
      <div id="reu_vote"></div>
      <div class="tabs noprint"><button class="${mode === 'rep' ? 'on' : ''}" onclick="Reu.mode['${id}']='rep';Reu.filtre='tous';Reu.fiche('${id}')">✉ Réponses à la convocation</button><button class="${mode === 'jour' ? 'on' : ''}" onclick="Reu.mode['${id}']='jour';Reu.filtre='tous';Reu.fiche('${id}')">✔ Jour J : pointage</button></div>
      <div id="reu_stats"></div>
      <div class="toolbar noprint">${vote ? `<div class="pill-select">${[['tous', 'Tous'], ['vote', '🗳 Votants'], ['autres', 'Sans droit de vote']].map(x => `<button class="${Reu.groupe === x[0] ? 'on' : ''}" onclick="Reu.groupe='${x[0]}';Reu.fiche('${id}')">${x[1]}</button>`).join('')}</div>` : ''}
        <input type="search" placeholder="Rechercher un nom…" value="${esc(Reu.q)}" oninput="Reu.q=this.value;Reu.liste('${id}')">
        <select onchange="Reu.filtre=this.value;Reu.liste('${id}')">${UI.opts(mode === 'rep' ? [['tous', 'Toutes les réponses'], ['rep', 'Ont répondu'], ['att', 'Sans réponse'], ['oui', 'Viennent'], ['non', 'Ne viennent pas']] : [['tous', 'Tous'], ['np', 'Non pointés'], ['présent', 'Présents'], ['absent', 'Absents'], ['oui', 'Avaient dit oui']], Reu.filtre)}</select></div>
      <div id="reu_liste"></div>
      ${g && mode === 'jour' && r.participants.length ? `<p class="noprint"><button class="btn sec sm" onclick="Reu.absReste('${id}')">Marquer les non pointés comme absents</button></p>` : ''}
      <div class="card" style="margin-top:1rem"><h3 style="margin-top:0">Compte rendu</h3>
        ${g ? `<div class="f"><label>Points abordés / échanges</label><textarea onchange="Reu.get('${id}').cr=this.value;save()" style="min-height:140px">${esc(r.cr || '')}</textarea></div>
        <div class="f"><label>Décisions et suites à donner</label><textarea onchange="Reu.get('${id}').decisions=this.value;save()">${esc(r.decisions || '')}</textarea></div>
        <div class="f"><label>Rédigé par</label><input value="${esc(r.redacteur != null ? r.redacteur : (ME ? userName(ME.id) : ''))}" onchange="Reu.get('${id}').redacteur=this.value;save()"></div>` : `<div class="msg">${esc(r.cr || '—')}</div>`}
        <div class="noprint" style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.6rem"><button class="btn" onclick="Reu.pdf('${id}')">📄 Générer le PDF</button><a class="btn sec" style="background:#1f9d55;color:#fff;border-color:#1f9d55" href="#" onclick="this.href='https://wa.me/?text='+encodeURIComponent(Reu.resume('${id}'))" target="_blank" rel="noopener">WhatsApp : envoyer le résumé</a><button class="btn sec" onclick="Reu.copier('${id}')">Copier le résumé</button></div>
        <p class="small mut">Sur téléphone, le PDF ouvre le menu de partage : choisis WhatsApp. Sinon il est téléchargé : joins-le dans WhatsApp (📎 › Document).</p></div>`;
    Reu.majVote(id); Reu.liste(id);
  },
  majVote(id) {
    const r = Reu.get(id), mode = Reu.mode[id] || (r.date <= todayISO() ? 'jour' : 'rep'), jour = mode === 'jour';
    const L = r.participants.filter(x => Reu.dansGroupe(r, x)), c = s => L.filter(s).length;
    $('#reu_stats').innerHTML = jour
      ? `<p><span class="tag">${L.length} invités</span> <span class="tag ok">${c(x => x.statut === 'présent')} présents</span> <span class="tag ko">${c(x => Reu.pres(x) === 'absent')} absents</span> <span class="tag w">${c(x => !Reu.pres(x))} non pointés</span></p>`
      : `<p><span class="tag">${L.length} invités</span> <span class="tag ok">${c(x => Reu.rep(x) === 'oui')} viennent</span> <span class="tag ko">${c(x => Reu.rep(x) === 'non')} excusés</span> <span class="tag w">${c(x => !Reu.rep(x))} sans réponse</span></p>`;
    if (!(r.vote && r.vote.actif)) { $('#reu_vote').innerHTML = ''; return; }
    const Q = Reu.quorum(r, jour);
    $('#reu_vote').innerHTML = `<div class="reu-vote"><div><b>🗳 ${jour ? 'Votants présents' : 'Votants annoncés'}</b>${jour && Q.pouv ? ` <span class="small">(+ ${plural(Q.pouv, 'pouvoir')})</span>` : ''}
      <div class="small">${Q.aucun ? 'Pas de quorum requis' : `Quorum : ${Q.requis} (${esc(Reu.libRegle(Q.q))}${Q.q.pouvoirs ? ', pouvoirs compris' : ''})`}</div>
      ${Q.aucun ? '' : `<div class="${Q.atteint ? 'q-ok' : 'q-ko'}">${Q.atteint ? '✓ Quorum atteint' : '✗ Il manque ' + plural(Q.manque, 'votant')}${jour ? '' : ' (prévision)'}</div>`}</div><div class="n">${Q.pres} / ${Q.n}</div></div>`;
  },
  dansGroupe(r, x) { return Reu.groupe === 'tous' || !(r.vote && r.vote.actif) || (Reu.groupe === 'vote' ? Reu.votant(r, x) : !Reu.votant(r, x)); },
  liste(id) {
    const r = Reu.get(id), g = can('reu.gerer'), vote = r.vote && r.vote.actif, mode = Reu.mode[id] || (r.date <= todayISO() ? 'jour' : 'rep'), q = norm(Reu.q), f = Reu.filtre;
    const test = { tous: () => true, rep: x => !!Reu.rep(x), att: x => !Reu.rep(x), oui: x => Reu.rep(x) === 'oui', non: x => Reu.rep(x) === 'non', np: x => !Reu.pres(x), 'présent': x => x.statut === 'présent', absent: x => Reu.pres(x) === 'absent' }[f] || (() => true);
    const l = r.participants.map((x, i) => ({ x, i })).filter(o => Reu.dansGroupe(r, o.x) && test(o.x) && (!q || norm(Reu.nom(o.x) + ' ' + Reu.etab(o.x)).includes(q)))
      .sort((a, b) => (Reu.votant(r, b.x) - Reu.votant(r, a.x)) || Reu.nom(a.x).localeCompare(Reu.nom(b.x), 'fr'));
    const badge = x => { if (!vote) return ''; const v = Reu.votant(r, x), auto = x.votant !== true && x.votant !== false; return g ? `<button class="tag ${v ? 'vote' : ''}" style="border:0;cursor:pointer" title="${auto ? 'Selon les mandats' : 'Réglé à la main'} — toucher pour changer" onclick="Reu.basculeVote('${id}',${r.participants.indexOf(x)})">${v ? '🗳 Votant' : 'Sans vote'}${auto ? '' : ' ✎'}</button>` : (v ? '<span class="tag vote">🗳 Votant</span>' : ''); };
    const mand = x => { const p = x.pid && P.get(x.pid); return p ? Mandats.tags(p) : ''; };
    const repLib = { oui: 'Vient', non: 'Ne vient pas', '': 'En attente' };
    $('#reu_liste').innerHTML = `<div class="reu-list">${l.map(({ x, i }) => {
      const rp = Reu.rep(x), pr = Reu.pres(x);
      const ctl = mode === 'rep'
        ? (g ? `<div class="pill-select reu-3">${['oui', 'non', ''].map(s => `<button class="${rp === s ? 'on ' + (s || 'att') : ''}" onclick="Reu.setRep('${id}',${i},'${s}')">${repLib[s]}</button>`).join('')}</div>` : `<span class="tag">${repLib[rp]}</span>`)
        : (g ? `<div class="pill-select reu-2">${[['présent', 'Présent'], ['absent', 'Absent']].map(s => `<button class="${pr === s[0] ? 'on ' + (s[0] === 'présent' ? 'oui' : 'non') : ''}" onclick="Reu.setPres('${id}',${i},'${s[0]}')">${s[1]}</button>`).join('')}</div>` : `<span class="tag">${pr || 'non pointé'}</span>`)
          + (vote && Reu.votant(r, x) && x.statut !== 'présent' && g ? `<label class="chk small"><input type="checkbox" ${x.pouvoir ? 'checked' : ''} onchange="Reu.setPouvoir('${id}',${i},this.checked)"> A donné un pouvoir</label>` : '');
      return `<div class="reu-p"><div class="reu-n"><b>${esc(Reu.nom(x))}</b>${x.pid ? ` <a class="small noprint" href="#/fiche/${x.pid}">fiche</a>` : ''}${g ? ` <button class="btn ghost sm noprint" style="padding:0 .3rem" title="Retirer de la réunion" onclick="Reu.retirer('${id}',${i})">✕</button>` : ''}
        <div class="reu-tags">${badge(x)} ${mand(x)} ${mode === 'jour' ? `<span class="tag ${rp === 'oui' ? 'ok' : rp === 'non' ? 'ko' : 'w'}">${rp === 'oui' ? 'avait dit oui' : rp === 'non' ? 'excusé' : 'sans réponse'}</span>` : ''}${x.heure && x.statut === 'présent' ? ` <span class="small mut">arrivé ${esc(x.heure)}</span>` : ''}</div>
        ${Reu.etab(x) ? `<div class="small mut">${esc(Reu.etab(x))}</div>` : ''}</div><div class="reu-c">${ctl}</div></div>`;
    }).join('') || `<p class="mut">${r.participants.length ? 'Personne dans ce filtre.' : 'Aucun participant : ajoute-les avec « + Participants ».'}</p>`}</div>`;
  },
  rafraichir(id) { const y = window.scrollY; Reu.majVote(id); Reu.liste(id); window.scrollTo(0, y); },
  setRep(id, i, s) { const x = Reu.get(id).participants[i]; x.rep = s; if (x.statut === 'excusé' && s !== 'non') x.statut = 'invité'; save(); Reu.rafraichir(id); },
  setPres(id, i, s) {
    const x = Reu.get(id).participants[i];
    if (Reu.pres(x) === s) { x.statut = 'invité'; if (!x.rep && s === 'absent') x.rep = ''; }
    else { if (!x.rep) x.rep = Reu.rep(x); x.statut = s; if (s === 'présent') { x.pouvoir = false; if (!x.heure) x.heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); } }
    save(); Reu.rafraichir(id);
  },
  setPouvoir(id, i, v) { Reu.get(id).participants[i].pouvoir = v; save(); Reu.rafraichir(id); },
  basculeVote(id, i) {
    const r = Reu.get(id), x = r.participants[i], auto = Reu.mandatsVote(r, x).length > 0;
    if (x.votant === true || x.votant === false) delete x.votant; else x.votant = !auto;
    save(); Reu.rafraichir(id); UI.toast(x.votant === undefined ? 'Droit de vote : selon les mandats' : x.votant ? 'Droit de vote accordé' : 'Droit de vote retiré', 'g');
  },
  absReste(id) { let n = 0; Reu.get(id).participants.forEach(x => { if (!Reu.pres(x)) { if (!x.rep) x.rep = ''; x.statut = 'absent'; n++; } }); save(); Reu.fiche(id); UI.toast(plural(n, 'personne') + ' marquée(s) absente(s)', 'g'); },
  statut(id, i, s) { const x = Reu.get(id).participants[i]; x.statut = s; save(); Reu.fiche(id); },
  retirer(id, i) { const r = Reu.get(id); r.participants.splice(i, 1); save(); Reu.fiche(id); },
  async suppr(id) { if (!await UI.confirm('Supprimer cette réunion ?', 'Supprimer')) return; D.reunions = D.reunions.filter(x => x.id !== id); save(); App.go('reunions'); },

  /* ---------- Ajout de participants ---------- */
  ajouter(id) {
    const r = Reu.get(id);
    const mand = [['_INST', 'Tous les membres des instances académiques']].concat(Mandats.TYPES.map(t => [t[0], t[1]]));
    UI.modal('Ajouter des participants', `<div class="frow"><div class="f"><label>Rechercher dans le fichier</label><input id="ra_q" oninput="Reu.cherche('${id}',this.value)" placeholder="Nom, établissement…"></div>
      <div class="f"><label>Ajouter tout un établissement</label><select onchange="Reu.ajoutEtab('${id}',this.value)">${UI.opts(Votants.etabOptions(), '', '—')}</select></div></div>
      <div id="ra_res" style="max-height:34vh;overflow:auto"></div>
      <div class="frow" style="margin-top:.6rem"><div class="f"><label>Ajouter les titulaires d'un mandat</label><select onchange="Reu.ajoutMandat('${id}',this.value);this.value=''">${UI.opts(mand, '', '—')}</select></div>
        <div class="f"><label>Ajouter des adhérents</label><select onchange="Reu.ajoutAdh('${id}',this.value);this.value=''">${UI.opts([['ajour', 'Adhérents à jour de cotisation'], ['actifs', 'À jour + à relancer'], ['tous', 'Tous les adhérents (sauf anciens)']], '', '—')}</select></div></div>
      <div class="frow"><div class="f"><label>Ou personne hors fichier</label><input id="ra_libre" placeholder="Nom Prénom"></div><div class="f"><label>Établissement</label><input id="ra_le"></div><div class="f"><label>&nbsp;</label><button class="btn sec" onclick="Reu.ajoutLibre('${id}')">Ajouter</button></div></div>
      <div class="frow"><div class="f"><label>Importer une liste (Excel, CSV)</label><button class="btn sec" onclick="Reu.importer('${id}')">📂 Choisir le fichier</button><div class="small mut">Colonnes Nom et Prénom. Les personnes du fichier adhérents sont reconnues, les doublons ignorés.</div></div>
        <div class="f"><label>&nbsp;</label><label class="chk"><input type="checkbox" id="ra_users" onchange="if(this.checked){Reu.ajoutUsers('${id}')}"> Tous les utilisateurs de l'application</label></div></div>
      <p class="small" id="ra_cnt">${plural(r.participants.length, 'participant')}</p>`, [{ label: 'Terminé', onClick: () => { Reu.fiche(id); } }], { wide: true });
  },
  majCnt(id) { const e = $('#ra_cnt'); if (e) e.textContent = plural(Reu.get(id).participants.length, 'participant'); },
  cherche(id, q) {
    const r = Reu.get(id); q = norm(q);
    const l = q.length < 2 ? [] : P.visibles().filter(p => norm(P.full(p) + ' ' + P.etab(p)).includes(q)).slice(0, 40);
    $('#ra_res').innerHTML = l.map(p => { const in_ = r.participants.some(x => x.pid === p.id); return `<div class="chk"><button class="btn sm ${in_ ? 'ok' : 'sec'}" ${in_ ? 'disabled' : ''} onclick="Reu.add('${id}',{pid:'${p.id}'});Reu.majCnt('${id}');this.disabled=true;this.classList.add('ok');this.textContent='✓'">${in_ ? '✓' : '+'}</button> ${esc(P.full(p))} <span class="small mut">${esc(P.etab(p))}</span> ${Mandats.tags(p)}</div>`; }).join('');
  },
  /* ajoute sans doublon (même fiche, même utilisateur ou même nom hors fichier) ; renvoie true si ajouté */
  add(id, o) {
    const r = Reu.get(id);
    if (o.pid && r.participants.some(x => x.pid === o.pid)) return false;
    if (o.uid) { if (r.participants.some(x => x.uid === o.uid)) return false; const u = D.users.find(z => z.id === o.uid); if (u && u.pid && r.participants.some(x => x.pid === u.pid)) return false; }
    if (o.nom && r.participants.some(x => norm(Reu.nom(x)) === norm(o.nom))) return false;
    r.participants.push(Object.assign({ statut: 'invité', rep: '' }, o)); save(); return true;
  },
  ajoutEtab(id, e) { if (!e) return; let n = 0; P.visibles().filter(p => P.uais(p).includes(e) || P.etab(p) === e).forEach(p => { if (Reu.add(id, { pid: p.id })) n++; }); Reu.majCnt(id); UI.toast(plural(n, 'personne ajoutée', 'personnes ajoutées'), 'g'); },
  ajoutMandat(id, t) {
    if (!t) return; let n = 0;
    Mandats.actifs().filter(x => t === '_INST' ? Mandats.type(x.m.type)[2] === 'acad' : x.m.type === t).forEach(x => { if (Reu.add(id, { pid: x.p.id })) n++; });
    Reu.majCnt(id); UI.toast(n ? plural(n, 'personne ajoutée', 'personnes ajoutées') : 'Personne de plus à ajouter (vérifie les mandats dans « Mandats & délégués »)', n ? 'g' : 'r');
  },
  ajoutAdh(id, k) {
    if (!k) return; let n = 0;
    P.visibles().filter(p => p.categorie === 'adherent' && !(p.situationNat && /DECED/.test(p.situationNat))).filter(p => { const c = P.cotis(p); return k === 'ajour' ? c === 'ajour' : k === 'actifs' ? ['ajour', 'retard'].includes(c) : c !== 'ancien'; })
      .forEach(p => { if (Reu.add(id, { pid: p.id })) n++; });
    Reu.majCnt(id); UI.toast(plural(n, 'adhérent ajouté', 'adhérents ajoutés'), 'g');
  },
  ajoutLibre(id) { const n = $('#ra_libre').value.trim(); if (!n) return; if (Reu.add(id, { nom: n, etab: $('#ra_le').value.trim() })) UI.toast('Ajouté', 'g'); else UI.toast('Déjà dans la liste', 'r'); $('#ra_libre').value = ''; Reu.majCnt(id); },
  ajoutUsers(id) { D.users.filter(u => u.actif !== false).forEach(u => Reu.add(id, u.pid ? { pid: u.pid } : { uid: u.id })); Reu.majCnt(id); UI.toast('Utilisateurs ajoutés', 'g'); },
  async importer(id) {
    const f = await pickFile('.xls,.xlsx,.csv,.ods'); if (!f) return;
    try {
      const wb = XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false }).filter(x => x.some(c => String(c).trim()));
      let hi = rows.findIndex((x, i) => i < 10 && x.some(c => /^nom\b|pr[ée]nom/i.test(String(c).trim())));
      let cn = 0, cp = 1;
      if (hi >= 0) { const h = rows[hi].map(c => norm(c)); cp = h.findIndex(c => c.startsWith('prenom')); cn = h.findIndex(c => c === 'nom' || c.startsWith('nom ') && !c.includes('jeune')); if (cn < 0) cn = 0; }
      const idx = {}; P.visibles().forEach(p => { idx[norm(p.nom + ' ' + p.prenom)] = p; idx[norm(p.prenom + ' ' + p.nom)] = p; });
      let n = 0, rec = 0, doub = 0;
      rows.slice(hi + 1).forEach(x => {
        const nom = String(x[cn] || '').trim(), pre = cp >= 0 ? String(x[cp] || '').trim() : '';
        if (!nom && !pre) return;
        const p = idx[norm(nom + ' ' + pre)];
        const ok = p ? Reu.add(id, { pid: p.id }) : Reu.add(id, { nom: (nom.toUpperCase() + ' ' + pre.toLowerCase().replace(/(^|[\s-])\S/g, c => c.toUpperCase())).trim() });
        if (ok) { n++; if (p) rec++; } else doub++;
      });
      Reu.majCnt(id); UI.toast(`${plural(n, 'personne ajoutée', 'personnes ajoutées')} (${rec} reconnue(s) dans le fichier)${doub ? ', ' + plural(doub, 'doublon ignoré', 'doublons ignorés') : ''}`, 'g');
    } catch (e) { UI.toast('Fichier illisible', 'r'); }
  },

  /* ---------- Résumé texte (WhatsApp) ---------- */
  resume(id) {
    const r = Reu.get(id), c = Reu.categories(r), vote = r.vote && r.vote.actif;
    const li = a => a.map(x => '• ' + Reu.nom(x)).join('\n') || '—';
    const bloc = a => !vote ? li(a) : `_Votants : ${a.filter(x => Reu.votant(r, x)).length}_\n${li(a.filter(x => Reu.votant(r, x)))}\n_Sans droit de vote : ${a.filter(x => !Reu.votant(r, x)).length}_\n${li(a.filter(x => !Reu.votant(r, x)))}`;
    let t = `*${r.titre}* – ${fmtDate(r.date)}${r.heure ? ' à ' + r.heure : ''}${r.lieu ? '\n📍 ' + r.lieu : ''}\n`;
    if (vote) { const Q = Reu.quorum(r, c.pt); t += `🗳️ Votants ${c.pt ? 'présents' : 'annoncés'} : ${Q.pres} / ${Q.n}${c.pt && Q.pouv ? ' + ' + plural(Q.pouv, 'pouvoir') : ''}\n⚖️ ${Q.aucun ? 'Pas de quorum requis' : `Quorum (${Reu.libRegle(Q.q)}) : ${Q.requis} – ${Q.atteint ? 'atteint' : 'non atteint, il manque ' + Q.manque}`}\n`; }
    t += `\n✅ *${c.pt ? 'Présents' : 'Annoncés'} (${c.presents.length})*\n${bloc(c.presents)}\n\n🟠 *Excusés (${c.excuses.length})*\n${bloc(c.excuses)}\n\n❌ *${c.pt ? 'Absents' : 'Sans réponse'} (${c.absents.length})*\n${bloc(c.absents)}`;
    if (r.decisions) t += `\n\n📌 *Décisions*\n${r.decisions}`;
    return t;
  },
  copier(id) { try { navigator.clipboard.writeText(Reu.resume(id)).then(() => UI.toast('Résumé copié', 'g'), () => UI.toast('Copie refusée par le navigateur', 'r')); } catch (e) { UI.toast('Copie impossible ici', 'r'); } },

  /* ---------- Compte rendu PDF ---------- */
  pdf(id) {
    if (!window.jspdf) { UI.toast('Module PDF non chargé', 'r'); return; }
    const r = Reu.get(id), c = Reu.categories(r), vote = r.vote && r.vote.actif;
    const T = s => String(s || '').replace(/[’‘]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/[  ]/g, ' ').replace(/[^\x00-\xFF]/g, '');
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' }), W = 210, M = 16; let y = 14;
    const VIOLET = [96, 16, 128], CARMIN = [200, 0, 48];
    try { if (typeof LOGO_SNETAA !== 'undefined') { const ip = doc.getImageProperties(LOGO_SNETAA), h = 24, w = Math.min(44, h * ip.width / ip.height); doc.addImage(LOGO_SNETAA, 'PNG', M, y, w, w * ip.height / ip.width); } } catch (e) { }
    doc.setTextColor(...VIOLET); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('SNETAA-FO Orléans-Tours', W - M, y + 7, { align: 'right' });
    doc.setTextColor(70); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    doc.text("Syndicat National de l'Enseignement Technique", W - M, y + 13, { align: 'right' }); doc.text('Action Autonome - Force Ouvrière', W - M, y + 18, { align: 'right' });
    y += 30; doc.setDrawColor(...VIOLET); doc.setLineWidth(.8); doc.line(M, y, W - M, y); y += 10;
    doc.setTextColor(20); doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text('COMPTE RENDU', W / 2, y, { align: 'center' }); y += 7;
    doc.setFontSize(12); doc.text(T(r.titre), W / 2, y, { align: 'center' }); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
    const d = r.date ? new Date(r.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const info = [d, r.heure, r.lieu].filter(Boolean).join(' - '); doc.text(T(info.charAt(0).toUpperCase() + info.slice(1)), W / 2, y, { align: 'center' }); y += 8;
    doc.setFillColor(246, 244, 248); doc.roundedRect(M, y, W - 2 * M, 14, 2, 2, 'F');
    [['Invités', r.participants.length], [c.pt ? 'Présents' : 'Annoncés', c.presents.length], ['Excusés', c.excuses.length], [c.pt ? 'Absents' : 'Sans réponse', c.absents.length]].forEach((k, i) => { const x = M + (W - 2 * M) / 4 * (i + .5); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(String(k[1]), x, y + 6.5, { align: 'center' }); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(k[0], x, y + 11.5, { align: 'center' }); });
    y += 18;
    if (vote) {
      const Q = Reu.quorum(r, c.pt);
      doc.setFillColor(...VIOLET); doc.roundedRect(M, y, W - 2 * M, 9, 2, 2, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
      doc.text(T(`Membres ayant le droit de vote ${c.pt ? 'présents' : 'annoncés'} : ${Q.pres} / ${Q.n}${c.pt && Q.pouv ? ' + ' + Q.pouv + ' pouvoir(s)' : ''}`), W / 2, y + 6, { align: 'center' }); y += 14;
      if (Q.aucun) { doc.setTextColor(80); doc.text('Pas de quorum requis.', W / 2, y, { align: 'center' }); }
      else { doc.setTextColor(...(Q.atteint ? [31, 122, 77] : CARMIN)); doc.text(T(`Quorum : ${Q.requis} sur ${Q.n} (${Reu.libRegle(Q.q)}${Q.q.pouvoirs ? ', pouvoirs compris' : ''}) - ${Q.atteint ? 'ATTEINT' : 'NON ATTEINT (il manque ' + Q.manque + ')'}`), W / 2, y, { align: 'center' });
        if (c.pt) { y += 5; doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(80); doc.text(T(`Voix pouvant s'exprimer : ${Q.voix} (${Q.pres} présent(s) + ${Q.pouv} pouvoir(s))`), W / 2, y, { align: 'center' }); } }
      doc.setTextColor(20); y += 9;
    } else y += 2;
    const titre = t => { if (y > 265) { doc.addPage(); y = 20; } doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...VIOLET); doc.text(T(t), M, y); doc.setTextColor(20); y += 3; };
    const para = t => { if (!t) return; doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.splitTextToSize(T(t), W - 2 * M).forEach(l => { if (y > 280) { doc.addPage(); y = 20; } doc.text(l, M, y + 4); y += 5; }); y += 5; };
    const qual = x => { const p = x.pid && P.get(x.pid); const m = p ? Mandats.de(p).map(z => Mandats.type(z.type)[1].replace(/ \(S\d\)$/, '').replace(/·\S*/g, '')).join(', ') : ''; return m; };
    const tableau = (t, a) => {
      titre(`${t} (${a.length})`); if (!a.length) { para('Aucun.'); return; }
      const head = vote ? [['Nom', 'Qualité', 'Mandat(s)', 'Établissement']] : [['Nom', 'Établissement']];
      const body = a.map(x => vote ? [T(Reu.nom(x)), Reu.votant(r, x) ? (x.pouvoir && x.statut !== 'présent' ? 'Votant - pouvoir donné' : 'Votant') : 'Sans droit de vote', T(qual(x)), T(Reu.etab(x))] : [T(Reu.nom(x)), T(Reu.etab(x))]);
      doc.autoTable({ startY: y + 1, margin: { left: M, right: M }, head, body, styles: { fontSize: 9, cellPadding: 1.7 }, headStyles: { fillColor: VIOLET, textColor: 255 }, alternateRowStyles: { fillColor: [248, 246, 250] }, theme: 'grid',
        didParseCell: dd => { if (vote && dd.section === 'body' && dd.column.index === 1) { if (dd.cell.raw === 'Sans droit de vote') dd.cell.styles.textColor = [120, 120, 120]; else dd.cell.styles.fontStyle = 'bold'; } } });
      y = doc.lastAutoTable.finalY + 8;
    };
    tableau(c.pt ? 'Présents' : 'Annoncés présents', c.presents); tableau('Excusés', c.excuses); tableau(c.pt ? 'Absents non excusés' : 'Sans réponse', c.absents);
    if (r.odj) { titre('Ordre du jour'); y += 2; para(r.odj); }
    if (r.cr) { titre('Points abordés'); y += 2; para(r.cr); }
    if (r.decisions) { titre('Décisions et suites à donner'); y += 2; para(r.decisions); }
    const red = r.redacteur != null ? r.redacteur : (ME ? userName(ME.id) : '');
    if (red) { if (y > 270) { doc.addPage(); y = 20; } doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.text(T('Compte rendu rédigé par ' + red), W - M, y + 4, { align: 'right' }); }
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(130); doc.text(T(`SNETAA-FO Orléans-Tours - ${r.titre} - page ${i}/${n}`), W / 2, 290, { align: 'center' }); }
    const nomF = `CR_${r.date || 'reunion'}_${norm(r.titre).replace(/ /g, '-').slice(0, 40)}.pdf`, blob = doc.output('blob');
    log('Compte rendu PDF', r.titre);
    try { const file = new File([blob], nomF, { type: 'application/pdf' }); if (navigator.canShare && navigator.canShare({ files: [file] }) && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)) { navigator.share({ files: [file], title: 'Compte rendu - ' + r.titre }).catch(() => download(nomF, blob)); return; } } catch (e) { }
    download(nomF, blob); UI.toast('PDF enregistré : joins-le dans WhatsApp (📎 › Document)', 'g');
  },

  /* ---------- Feuille d'émargement imprimable ---------- */
  feuille(id) {
    const r = Reu.get(id), vote = r.vote && r.vote.actif;
    const l = r.participants.slice().sort((a, b) => (Reu.votant(r, b) - Reu.votant(r, a)) || Reu.nom(a).localeCompare(Reu.nom(b), 'fr'));
    const w = window.open('', '_blank'); const base = location.href.replace(/#.*$/, '').replace(/[^/]*$/, '');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Émargement</title><style>body{font:11pt system-ui,Arial;margin:1.2cm}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:8px 6px;text-align:left}th{background:#e8edf6}h1{font-size:15pt;color:#1b2a4a;margin:0}.h{display:flex;gap:16px;align-items:center;margin-bottom:12px}img{height:46px}</style></head><body>
      <div class="h"><img src="${base}img/logo-snetaa.png"><img src="${base}img/logo-fnec.png"><div><h1>Feuille d'émargement</h1><div>${esc(r.titre)} — ${esc(r.type || '')}<br>${fmtDate(r.date)} ${esc(r.heure || '')} — ${esc(r.lieu || '')}</div></div></div>
      <table><tr><th style="width:4%">#</th><th style="width:28%">Nom Prénom</th>${vote ? '<th style="width:12%">Vote</th>' : ''}<th style="width:26%">Établissement</th><th>Signature</th></tr>
      ${l.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(Reu.nom(x))}</td>${vote ? `<td>${Reu.votant(r, x) ? 'Votant' : ''}</td>` : ''}<td>${esc(Reu.etab(x))}</td><td></td></tr>`).join('')}${Array.from({ length: 8 }, (_, i) => `<tr><td>${l.length + i + 1}</td><td></td>${vote ? '<td></td>' : ''}<td></td><td></td></tr>`).join('')}</table>
      <script>setTimeout(()=>print(),500)<\/script></body></html>`);
    w.document.close();
  }
};
App.routes.reunions = () => Reu.page();
App.routes.reunion = id => Reu.fiche(id);
