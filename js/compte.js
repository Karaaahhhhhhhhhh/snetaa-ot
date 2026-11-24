/* =========================================================
   Mon compte : lien avec sa fiche adhérent, courriel de
   connexion, code personnel
   ========================================================= */
'use strict';
const Compte = {
  /* identifiant de connexion : courriel (ou « prénom nom » à défaut) */
  trouver(saisie) {
    const s = String(saisie || '').trim(); if (!s) return null;
    const actifs = D.users.filter(u => u.actif !== false && u.pin);
    const m = normEmail(s);
    return actifs.find(u => u.email && normEmail(u.email) === m) || actifs.find(u => norm(u.prenom + ' ' + u.nom) === norm(s) || norm(u.nom + ' ' + u.prenom) === norm(s)) || null;
  },
  ouvrir() {
    const u = ME, p = Droits.personne(u);
    UI.modal('Mon compte', `<div class="kv"><div>Nom</div><div><b>${esc(u.prenom + ' ' + u.nom)}</b></div>
        <div>Fonctions</div><div>${esc(Droits.libelle(u))}</div>
        <div>Fiche adhérent</div><div>${p ? `<a href="#/fiche/${p.id}" onclick="UI.close()">${esc(P.full(p))}</a>${p.numAdherent ? ' · n° ' + esc(p.numAdherent) : ''}` : '<span class="tag w">non reliée</span>'}</div></div>
      <h3>Relier mon compte à ma fiche adhérent</h3>
      <div class="f"><input id="mc_q" placeholder="Rechercher ma fiche (nom, prénom)…" oninput="Compte.chercher()" value="${p ? '' : esc(u.nom)}"></div><div id="mc_res" class="small"></div>
      <h3>Courriel de connexion</h3>
      <p class="small mut">C'est l'adresse que tu tapes sur l'écran de connexion. Elle peut être différente de l'adresse syndicale utilisée pour les envois.</p>
      <div class="f"><input id="mc_mail" type="email" value="${esc(u.email || '')}"></div>
      ${p && p.email && normEmail(p.email) !== normEmail(u.email) ? `<p class="small"><a href="#" onclick="$('#mc_mail').value='${esc(p.email)}';return false">Utiliser le courriel de ma fiche : ${esc(p.email)}</a></p>` : ''}
      <div class="f"><label>Code personnel actuel (pour confirmer un changement de courriel)</label><input id="mc_pin" type="password" inputmode="numeric" autocomplete="current-password"></div>
      <p><button class="btn sec sm" onclick="UI.close();Droits.pin(ME.id)">Changer mon code personnel</button></p>`,
      [{ label: 'Fermer', value: null }, { label: 'Enregistrer', onClick: m => Compte.enregistrer(m) }], { nofocus: true });
    setTimeout(Compte.chercher, 30);
  },
  chercher() {
    const q = norm(($('#mc_q') || {}).value || ''); const box = $('#mc_res'); if (!box) return;
    if (q.length < 2) { box.innerHTML = ''; return; }
    const l = D.personnes.filter(p => !p.archive && norm(P.full(p)).includes(q)).slice(0, 8);
    box.innerHTML = l.length ? l.map(p => `<div style="padding:.3rem 0;border-bottom:1px solid #eee">${esc(P.full(p))} · ${esc(P.etab(p) || '')} ${p.email ? '· ' + esc(p.email) : ''} ${Droits.userDe(p) && Droits.userDe(p).id !== ME.id ? '<span class="tag w">déjà reliée à un autre compte</span>' : `<button class="btn sm" onclick="Compte.lier('${p.id}')">${ME.pid === p.id ? '✓ reliée' : 'C\'est ma fiche'}</button>`}</div>`).join('') : '<span class="mut">Aucune fiche trouvée.</span>';
  },
  async lier(pid) {
    const p = P.get(pid); const u = ME;
    u.pid = p.id; u.prenom = p.prenom || u.prenom; u.nom = (p.nom || u.nom).toUpperCase(); if (p.telPortable) u.tel = p.telPortable;
    log('Compte relié à sa fiche', P.full(p));
    const estAdmin = Droits.roles(u).includes('admin') || u.role === 'admin';
    if (estAdmin && !Mandats.de(p).some(m => m.type === 'S3') && await UI.confirm(`Ajouter sur ta fiche le mandat de <b>secrétaire académique (S3)</b> en cours ?`, 'Ajouter le mandat S3')) {
      p.mandats = p.mandats || []; p.mandats.push({ id: uid(), type: 'S3', debut: todayISO(), fin: '', par: u.id, precision: '' }); P.touch(p, ['mandats']); log('Désignation', P.full(p) + ' : secrétaire académique (S3)');
    }
    await _saveNow(); Droits.rafraichir(); UI.renderUser(); UI.renderNav(); UI.toast('Compte relié à ta fiche', 'g'); Compte.ouvrir();
  },
  async enregistrer(m) {
    const mail = m.querySelector('#mc_mail').value.trim();
    if (normEmail(mail) === normEmail(ME.email || '')) return null;
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(mail)) { UI.toast('Courriel invalide', 'r'); return false; }
    if (D.users.some(x => x.id !== ME.id && x.email && normEmail(x.email) === normEmail(mail))) { UI.toast('Ce courriel est déjà utilisé par un autre compte', 'r'); return false; }
    if (await Auth.hashPin(m.querySelector('#mc_pin').value.trim(), ME.salt) !== ME.pin) { UI.toast('Code personnel incorrect', 'r'); return false; }
    const avant = ME.email; ME.email = mail; localStorage.setItem('snetaa-lastmail', mail);
    log('Courriel de connexion modifié', (avant || '—') + ' → ' + mail); await _saveNow(); UI.toast('Courriel de connexion : ' + mail, 'g'); return null;
  }
};
