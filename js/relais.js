/* =========================================================
   Élections : vote par scrutin et relais de vote
   - chaque électeur vote pour plusieurs scrutins (CSA, CAP, CCP)
   - un « relais » (adhérent ou sympathisant, sans accès à
     l'application) suit quelques personnes ; on lui envoie
     chaque jour le point : qui a voté, qui reste à relancer
   ========================================================= */
'use strict';
const Scrutins = {
  DEFAUT: [{ k: 'csamen', nom: 'CSA ministériel', pour: 'tous' }, { k: 'csaa', nom: 'CSA académique', pour: 'tous' }, { k: 'capn', nom: 'CAP nationale (CAPN)', pour: 'titulaires' }, { k: 'capa', nom: 'CAP académique (CAPA)', pour: 'titulaires' }, { k: 'ccp', nom: 'CCP (contractuels)', pour: 'contractuels' }],
  liste() { if (!D.meta.scrutins) D.meta.scrutins = JSON.parse(JSON.stringify(Scrutins.DEFAUT)); return D.meta.scrutins; },
  contractuel(p) { return ['CONTR', 'AED', 'AESH'].includes(p.statut); },
  pour(p) { const c = Scrutins.contractuel(p); return Scrutins.liste().filter(s => s.pour === 'tous' || (s.pour === 'contractuels') === c); },
  etat(p) {
    if (p.vote.aVote && !Object.keys(p.vote.scrutins || {}).length) { p.vote.scrutins = {}; Scrutins.pour(p).forEach(s => { p.vote.scrutins[s.k] = p.vote.dateVote || todayISO(); }); }
    const l = Scrutins.pour(p), sc = p.vote.scrutins || {};
    const faits = l.filter(s => sc[s.k]), manque = l.filter(s => !sc[s.k]);
    return { l, faits, manque, complet: l.length > 0 && !manque.length, aucun: !faits.length };
  },
  sync(p) { const e = Scrutins.etat(p); p.vote.aVote = e.complet; if (e.complet && !p.vote.dateVote) p.vote.dateVote = Object.values(p.vote.scrutins).sort().pop(); if (!e.complet) p.vote.dateVote = p.vote.dateVote && e.faits.length ? p.vote.dateVote : ''; },
  marquer(p, k, date, source) {
    p.vote.scrutins = p.vote.scrutins || {};
    (k ? [k] : Scrutins.pour(p).map(s => s.k)).forEach(x => { if (!p.vote.scrutins[x]) p.vote.scrutins[x] = date || todayISO(); });
    p.vote.sourceVote = source || p.vote.sourceVote; Scrutins.sync(p);
  },
  basculer(id, k) { const p = P.get(id); p.vote.scrutins = p.vote.scrutins || {}; if (p.vote.scrutins[k]) delete p.vote.scrutins[k]; else p.vote.scrutins[k] = todayISO(); p.vote.sourceVote = 'manuel'; Scrutins.sync(p); P.touch(p); save(); App.route(); },
  badge(p) {
    const e = Scrutins.etat(p);
    if (e.complet) return `<span class="tag ok" title="${esc(e.faits.map(s => s.nom).join(', '))}">✔ ${e.faits.length}/${e.l.length}</span>`;
    if (!e.aucun) return `<span class="tag w" title="Manque : ${esc(e.manque.map(s => s.nom).join(', '))}">${e.faits.length}/${e.l.length}</span>`;
    return '';
  },
  carte() {
    return `<div class="card"><h3 style="margin-top:0">Scrutins des élections professionnelles</h3><p class="small mut">Liste des scrutins suivis pour chaque électeur (« pour » : tous, titulaires ou contractuels — AED, AESH et professeurs contractuels). Vérifie-la par rapport à l'arrêté d'organisation.</p>
      <div class="tablewrap"><table><thead><tr><th>Scrutin</th><th>Concerne</th><th></th></tr></thead><tbody>${Scrutins.liste().map((s, i) => `<tr><td><input value="${esc(s.nom)}" onchange="Scrutins.liste()[${i}].nom=this.value;save()"></td><td><select onchange="Scrutins.liste()[${i}].pour=this.value;save()">${UI.opts([['tous', 'Tous'], ['titulaires', 'Titulaires'], ['contractuels', 'Contractuels']], s.pour)}</select></td><td><button class="btn sm ghost" onclick="Scrutins.liste().splice(${i},1);save();App.route()">✕</button></td></tr>`).join('')}</tbody></table></div>
      <p><button class="btn sm sec" onclick="Scrutins.liste().push({k:uid(),nom:'Nouveau scrutin',pour:'tous'});save();App.route()">+ Ajouter un scrutin</button></p></div>`;
  }
};

const Relais = {
  f: { reste: false },
  relaisDe(p) { return p.vote && p.vote.relais ? P.get(p.vote.relais) : null; },
  suivis(rid) { return D.personnes.filter(p => !p.archive && p.vote && p.vote.relais === rid); },
  tous() { const ids = new Set(D.personnes.filter(p => !p.archive && p.vote && p.vote.relais).map(p => p.vote.relais)); return Array.from(ids).map(P.get).filter(Boolean).sort((a, b) => norm(a.nom).localeCompare(norm(b.nom))); },
  options() { return D.personnes.filter(p => !p.archive).sort((a, b) => norm(a.nom + a.prenom).localeCompare(norm(b.nom + b.prenom))).map(p => `<option value="${esc(P.full(p))} · ${esc(P.etab(p) || REF.categories[p.categorie] || '')}" data-id="${p.id}"></option>`).join(''); },
  idDepuis(val) { const o = Array.from(document.querySelectorAll('#rl_dl option')).find(x => x.value === val); return o ? o.dataset.id : null; },
  champ(id, label) { return `<div class="f"><label>${esc(label)}</label><input id="${id}" list="rl_dl" placeholder="Tape un nom…" autocomplete="off"></div><datalist id="rl_dl">${Relais.options()}</datalist>`; },
  async definir(pid) {
    const p = P.get(pid), r = Relais.relaisDe(p);
    const v = await UI.modal('Relais de ' + P.full(p), `<p class="small">Le relais est une personne de confiance (adhérent, sympathisant…) qui s'assure que ${esc(p.prenom || 'la personne')} vote. Il n'a pas besoin d'accès à l'application : c'est toi qui lui envoies le point.</p>${Relais.champ('rl_x', 'Relais')}${r ? `<p class="small">Relais actuel : <b>${esc(P.full(r))}</b></p>` : ''}`,
      [{ label: 'Annuler', value: null }, ...(r ? [{ label: 'Retirer le relais', value: '_none' }] : []), { label: 'Enregistrer', onClick: m => { const id = Relais.idDepuis(m.querySelector('#rl_x').value); if (!id) { UI.toast('Choisis un nom dans la liste', 'r'); return false; } if (id === pid) { UI.toast('Une personne ne peut pas être son propre relais', 'r'); return false; } return id; } }]);
    if (!v) return; p.vote.relais = v === '_none' ? '' : v; P.touch(p); save(); log('Relais de vote', P.full(p) + ' → ' + (v === '_none' ? 'aucun' : P.full(P.get(v)))); App.route();
  },
  async ajouterSuivi(rid) {
    const r = P.get(rid);
    const v = await UI.modal('Ajouter une personne suivie par ' + P.full(r), Relais.champ('rl_x', 'Personne à faire voter'), [{ label: 'Annuler', value: null }, { label: 'Ajouter', onClick: m => { const id = Relais.idDepuis(m.querySelector('#rl_x').value); if (!id || id === rid) { UI.toast('Choisis un nom dans la liste', 'r'); return false; } return id; } }]);
    if (!v) return; const p = P.get(v); p.vote.relais = rid; P.touch(p); save(); log('Relais de vote', P.full(p) + ' → ' + P.full(r)); App.route();
  },
  async nouveau() {
    const v = await UI.modal('Nouveau relais de vote', Relais.champ('rl_x', 'Relais (adhérent, sympathisant…)') + '<p class="small mut">Tu ajouteras ensuite les personnes qu\'il ou elle suit.</p>', [{ label: 'Annuler', value: null }, { label: 'Continuer', onClick: m => { const id = Relais.idDepuis(m.querySelector('#rl_x').value); if (!id) { UI.toast('Choisis un nom dans la liste', 'r'); return false; } return id; } }]);
    if (v) Relais.ajouterSuivi(v);
  },
  retirer(pid) { const p = P.get(pid); p.vote.relais = ''; P.touch(p); save(); App.route(); },
  message(rid) {
    const r = P.get(rid), l = Relais.suivis(rid);
    const ok = l.filter(p => Scrutins.etat(p).complet), reste = l.filter(p => !Scrutins.etat(p).complet);
    const fin = D.meta.elections && D.meta.elections.fin ? fmtDate(D.meta.elections.fin) : '10/12/2026';
    const ligne = p => { const e = Scrutins.etat(p); return `• ${P.full(p)}${p.telPortable ? ' — ' + p.telPortable : ''}${p.email ? ' — ' + p.email : ''}${e.aucun ? ' (pas encore voté)' : ' (reste : ' + e.manque.map(s => s.nom).join(', ') + ')'}`; };
    return `Bonjour ${r.prenom || ''},\n\nPoint sur le vote aux élections professionnelles au ${fmtDate(todayISO())}, pour les ${l.length} personne${l.length > 1 ? 's' : ''} que tu suis :\n\n` +
      (ok.length ? `✅ ${ok.length > 1 ? 'Ont voté pour tous leurs scrutins' : 'A voté pour tous ses scrutins'} : ${ok.map(P.full).join(', ')}. Merci !\n\n` : '') +
      (reste.length ? `⏳ Pas encore voté, ou pas pour tous les scrutins :\n${reste.map(ligne).join('\n')}\n\nPeux-tu les relancer pour qu'ils votent FO à chaque scrutin avant le ${fin} à 17 h ? Le code de vote est sur l'ENSAP ; en cas de souci, qu'ils m'appellent.\n\n` : 'Tout le monde a voté : bravo et merci pour ton aide !\n\n') +
      `Merci,\n${ME.prenom} ${ME.nom} — SNETAA-FO ${D.meta.syndicat.section || ''}`;
  },
  envoyer(rid) {
    const r = P.get(rid), txt = Relais.message(rid); Relais._txt = txt; Relais._rid = rid;
    const tel = r.telPortable, wa = tel ? 'https://wa.me/' + phoneIntl(tel).replace('+', '') + '?text=' + encodeURIComponent(txt) : '';
    UI.modal('Message à ' + P.full(r), `<textarea id="rl_t" style="min-height:260px;width:100%;font-family:inherit" oninput="Relais._txt=this.value">${esc(txt)}</textarea>
      <p class="toolbar">${wa ? `<a class="btn" href="${esc(wa)}" target="_blank" rel="noopener" onclick="Relais.noter('WhatsApp')">WhatsApp</a>` : ''}${tel ? `<a class="btn sec" href="${esc('sms:' + phoneIntl(tel) + (/iPhone|iPad|Mac/.test(navigator.userAgent) ? '&' : '?') + 'body=' + encodeURIComponent(txt))}" onclick="Relais.noter('SMS')">SMS</a>` : ''}${r.email ? `<button class="btn sec" onclick="openLink(mailto('${esc(r.email)}','[SNETAA-FO] Élections : point sur les votes',Relais._txt));Relais.noter('mail')">Mail</button>` : ''}<button class="btn sec" onclick="copyText(Relais._txt);Relais.noter('copie')">Copier</button></p>
      ${!tel && !r.email ? '<p class="small mut">Pas de portable ni de mail sur la fiche du relais : copie le message.</p>' : ''}`, [{ label: 'Fermer' }], { wide: true });
  },
  noter(canal) {
    const r = P.get(Relais._rid); r.messages = r.messages || [];
    r.messages.push({ id: uid(), canal: canal === 'mail' ? 'mail' : canal === 'SMS' ? 'sms' : 'whatsapp', sens: 'envoye', date: new Date().toISOString().slice(0, 16), objet: 'Point relais de vote', contenu: Relais._txt, par: ME.id });
    r.vote.dernierPointRelais = nowISO(); P.touch(r); save();
  },
  page() {
    const rs = Relais.tous(), f = Relais.f;
    const cartes = rs.map(r => {
      const l = Relais.suivis(r.id), reste = l.filter(p => !Scrutins.etat(p).complet);
      if (f.reste && !reste.length) return '';
      return `<div class="card" style="margin-bottom:1rem"><div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center">
        <div><h3 style="margin:0"><a href="#/fiche/${r.id}">${esc(P.full(r))}</a> <span class="small mut">${esc(REF.categories[r.categorie] || '')}${P.etab(r) ? ' · ' + esc(P.etab(r)) : ''}</span></h3>
        <div class="small mut">${r.telPortable ? '☎ ' + esc(r.telPortable) : ''} ${r.email ? '✉ ' + esc(r.email) : ''} · ${l.length - reste.length}/${l.length} ont voté${r.vote.dernierPointRelais ? ' · dernier point envoyé le ' + fmtDT(r.vote.dernierPointRelais) : ''}</div></div>
        <div><button class="btn" onclick="Relais.envoyer('${r.id}')">✉ Envoyer le point</button> <button class="btn sec sm" onclick="Relais.ajouterSuivi('${r.id}')">+ Personne suivie</button></div></div>
        <div class="tablewrap" style="margin-top:.6rem"><table><thead><tr><th>Personne suivie</th><th>Établissement</th><th>Contact</th>${Scrutins.liste().map(s => `<th class="small" title="${esc(s.nom)}">${esc(s.nom.replace(/\s*\(.*\)/, ''))}</th>`).join('')}<th></th></tr></thead><tbody>
        ${l.map(p => { const pr = Scrutins.pour(p).map(s => s.k); return `<tr><td><a href="#/fiche/${p.id}">${esc(P.full(p))}</a></td><td class="small">${esc(P.etab(p))}</td><td class="small">${esc(p.telPortable || p.email || '')}</td>
          ${Scrutins.liste().map(s => pr.includes(s.k) ? `<td style="text-align:center"><button class="btn sm ${p.vote.scrutins[s.k] ? 'ok' : 'ghost'}" title="${p.vote.scrutins[s.k] ? 'voté le ' + fmtDate(p.vote.scrutins[s.k]) : 'pas encore'} — cliquer pour changer" onclick="Scrutins.basculer('${p.id}','${s.k}')">${p.vote.scrutins[s.k] ? '✔' : '—'}</button></td>` : '<td class="mut" style="text-align:center">·</td>').join('')}
          <td><a href="#" class="mut small" onclick="Relais.retirer('${p.id}');return false">retirer</a></td></tr>`; }).join('')}</tbody></table></div></div>`;
    }).join('');
    const nb = D.personnes.filter(p => !p.archive && p.vote && p.vote.relais).length;
    $('#main').innerHTML = `<div class="ph"><div><h1>Relais de vote</h1><p class="sub">Des personnes de confiance, sans accès à l'application, qui s'assurent que quelques collègues votent. Tu leur envoies chaque jour le point : qui a voté, qui relancer.</p></div>
      <div class="actions">${can('vot.repartir') ? '<button class="btn" onclick="Relais.nouveau()">+ Nouveau relais</button>' : ''}</div></div>
      <div class="card"><div class="toolbar"><span><b>${rs.length}</b> relais · <b>${nb}</b> personnes suivies</span> <label class="chk"><input type="checkbox" ${f.reste ? 'checked' : ''} onchange="Relais.f.reste=this.checked;App.route()"> Seulement les relais qui ont encore des personnes à relancer</label></div>
      <p class="small mut">Les ✔ se mettent à jour avec la liste des votants importée chaque jour (« Qui a voté ? ») ; tu peux aussi cliquer sur une case pour la changer.</p></div>
      ${cartes || '<p class="mut">Aucun relais pour l\'instant. Clique sur « + Nouveau relais », ou dans la fiche d\'une personne, onglet « Élections » → « Relais ».</p>'}`;
  }
};
App.routes.relais = () => Relais.page();
