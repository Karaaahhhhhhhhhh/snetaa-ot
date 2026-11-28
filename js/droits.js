/* =========================================================
   Droits d'accès : accordés selon la fonction (S3, S2, S1,
   trésorier) tirée des mandats, ajustables sur la fiche
   ========================================================= */
'use strict';
const Droits = {
  /* mandat → rôle de l'application */
  ROLE_MANDAT: { S3: 's3', S3A: 's3', S2: 's2', S2A: 's2', S1: 's1', S1A: 's1', TRES: 'tresorier', TRESA: 'tresorier' },
  personne(u) { return u && u.pid ? P.get(u.pid) : null; },
  rolesMandats(u) {
    const p = Droits.personne(u); if (!p) return [];
    return Array.from(new Set(Mandats.de(p).map(m => Droits.ROLE_MANDAT[m.type]).filter(Boolean)));
  },
  roles(u) { return Array.from(new Set([...(u.role && u.role !== 'aucun' ? [u.role] : []), ...Droits.rolesMandats(u)])); },
  perms(u) {
    if (!u) return new Set();
    const s = new Set();
    Droits.roles(u).forEach(r => ((D.roles[r] || {}).perms || []).forEach(x => s.add(x)));
    (u.permsPlus || []).forEach(x => s.add(x));
    if (!Droits.roles(u).includes('admin')) (u.permsMoins || []).forEach(x => s.delete(x));
    return s;
  },
  /* périmètre : départements (S2) et établissements (S1) issus des mandats + réglage manuel */
  perimetre(u) {
    const per = { deps: [...((u.perimetre || {}).deps || [])], etabs: [...((u.perimetre || {}).etabs || [])] };
    const p = Droits.personne(u);
    if (p) Mandats.de(p).forEach(m => { if (/^S2/.test(m.type) && m.dep) per.deps.push(m.dep); if (/^S1/.test(m.type) && m.uai) per.etabs.push(m.uai); });
    per.deps = Array.from(new Set(per.deps)); per.etabs = Array.from(new Set(per.etabs));
    return per;
  },
  libelle(u) {
    const r = Droits.roles(u);
    return r.map(k => (D.roles[k] || { label: k }).label).join(' + ') || 'aucune fonction';
  },
  rafraichir() { if (ME) { ME._perms = Droits.perms(ME); ME._per = Droits.perimetre(ME); } },
  userDe(p) { return D.users.find(u => u.pid === p.id); },

  /* ---------- Onglet « Accès » de la fiche ---------- */
  tabFiche(p) {
    const u = Droits.userDe(p);
    const fonctions = Mandats.de(p).filter(m => Droits.ROLE_MANDAT[m.type]);
    let h = `<div class="card"><h3 style="margin-top:0">Accès à l'application</h3>
      <p class="small mut">Les droits découlent des fonctions en cours (onglet Mandats) : S3 → secrétariat académique, S2 → secrétaire départemental (son département), S1 → délégué d'établissement (son établissement), trésorier → trésorerie. Tu peux ensuite ajouter ou retirer des droits ci-dessous.</p>
      <div class="kv"><div>Fonctions donnant des droits</div><div>${fonctions.map(m => `<span class="tag v">${esc(Mandats.libelle(m))}</span>`).join(' ') || '<span class="mut">aucune (désigne la personne dans l\'onglet Mandats)</span>'}</div></div>`;
    if (!u) {
      const libres = D.users.filter(x => !x.pid);
      h += `<p style="margin-top:1rem">${p.categorie === 'externe' ? '' : `<button class="btn" onclick="Droits.militant('${p.id}')">🗳 Désigner comme militant (élections)</button> `}<button class="btn sec" onclick="Droits.creer('${p.id}')">✉ Ouvrir un accès (invitation sécurisée)</button></p>
        <p class="small mut">« Militant » : la personne apparaît dans la répartition des électeurs à contacter. Elle peut travailler sur papier (listes imprimées), avec un paquet militant, ou sur son téléphone si tu lui envoies ensuite une invitation.</p><p>
        ${libres.length ? ` ou relier un compte existant : <select id="dr_lien" style="width:auto">${UI.opts(libres.map(x => [x.id, x.prenom + ' ' + x.nom]), '', '—')}</select> <button class="btn sm sec" onclick="Droits.relier('${p.id}')">Relier</button>` : ''}</p></div>`;
      return h;
    }
    const roles = Droits.roles(u), base = new Set(); roles.forEach(r => ((D.roles[r] || {}).perms || []).forEach(x => base.add(x)));
    const eff = Droits.perms(u), per = Droits.perimetre(u), admin = roles.includes('admin');
    h += `<div class="kv" style="margin-top:.6rem"><div>Compte</div><div><b>${esc(u.prenom + ' ' + u.nom)}</b> ${u.actif === false ? '<span class="tag ko">désactivé</span>' : '<span class="tag ok">actif</span>'}</div>
      <div>Droits accordés par</div><div>${esc(Droits.libelle(u))}</div>
      <div>Périmètre</div><div>${eff.has('adh.voir_tout') ? 'tout le fichier' : esc([...per.deps.map(d => 'département ' + d + ' ' + (REF.departements[d] || '')), ...per.etabs.map(x => (D.etablissements.find(e => e.uai === x) || { nom: x }).nom)].join(' · ') || 'ses contacts attribués')}</div>
      <div>Rôle complémentaire</div><div><select style="width:auto" onchange="Droits.setRole('${u.id}',this.value)" ${admin && u.id === ME.id ? 'disabled' : ''}>${UI.opts([['aucun', 'Aucun (droits issus des mandats)'], ...Object.entries(D.roles).filter(([k]) => !['s3', 's2', 's1', 'tresorier'].includes(k)).map(([k, r]) => [k, r.label])], u.role || 'aucun')}</select></div></div>
      <h3>Droits détaillés</h3>${admin ? '<p class="small mut">Administrateur principal : tous les droits.</p>' : ''}
      <div class="tablewrap" style="max-height:380px"><table><tbody>${PERMS.map(([k, l, g], i) => `${i === 0 || PERMS[i - 1][2] !== g ? `<tr><th colspan="2">${esc(g)}</th></tr>` : ''}<tr><td style="width:2rem"><input type="checkbox" ${eff.has(k) ? 'checked' : ''} ${admin ? 'disabled' : ''} onchange="Droits.basculer('${u.id}','${k}',this.checked,'${p.id}')"></td><td class="small">${esc(l)} ${base.has(k) ? '<span class="mut">(fonction)</span>' : (u.permsPlus || []).includes(k) ? '<span class="tag ok">ajouté</span>' : ''}${base.has(k) && (u.permsMoins || []).includes(k) ? ' <span class="tag ko">retiré</span>' : ''}</td></tr>`).join('')}</tbody></table></div>
      ${!admin || u.id !== ME.id ? Secu.blocFiche(u) : ''}
      <p style="margin-top:.8rem"><button class="btn sec sm" onclick="Droits.pin('${u.id}')">${u.id === ME.id ? 'Changer mon code personnel' : 'Code provisoire (sur cet appareil)'}</button> ${u.id !== ME.id ? `<button class="btn sec sm" onclick="Droits.actif('${u.id}',${u.actif === false})">${u.actif === false ? 'Réactiver le compte' : 'Désactiver le compte'}</button> <button class="btn sec sm" onclick="Droits.delier('${u.id}')">Délier de la fiche</button>` : ''}</p></div>`;
    return h;
  },
  async creer(pid) {
    const p = P.get(pid);
    if (!p.email && !p.telPortable) return UI.toast('Renseigne d\'abord le courriel et le portable de la fiche (les deux canaux de l\'invitation)', 'r');
    if (!p.dateNaissance && !await UI.confirm('La date de naissance n\'est pas renseignée sur la fiche : elle sert de question de vérification à la première connexion. Continuer sans ?', 'Continuer')) return;
    const u = { id: uid(), pid, prenom: p.prenom, nom: p.nom, email: p.email, tel: p.telPortable, role: 'aucun', salt: '', pin: '', actif: true, perimetre: { etabs: [], deps: [] }, permsPlus: [], permsMoins: [], created: nowISO() };
    D.users.push(u); save(); log('Accès créé', P.full(p) + ' (' + Droits.libelle(u) + ')'); UI.renderNav();
    App.route(); if (p.categorie === 'externe') UI.toast('Accès créé : coche ses droits ci-dessous, puis « Envoyer une invitation »', 'g'); else Secu.inviter(u.id);
  },
  /* désigner un militant : compte sans code (pas de connexion tant qu'aucune invitation n'est activée) */
  militant(pid) {
    const p = P.get(pid); let u = Droits.userDe(p);
    if (u) { if (!u.role || u.role === 'aucun') u.role = 'militant'; u.actif = true; }
    else { u = { id: uid(), pid, prenom: p.prenom, nom: (p.nom || '').toUpperCase(), email: p.email, tel: p.telPortable, role: 'militant', salt: '', pin: '', actif: true, perimetre: { etabs: [], deps: [] }, permsPlus: [], permsMoins: [], created: nowISO() }; D.users.push(u); }
    if (p.categorie === 'adherent' || p.categorie === 'sympathisant') P.touch(p);
    save(); log('Désignation militant', P.full(p)); UI.toast(P.full(p) + ' est désigné·e militant·e', 'g'); UI.renderNav(); App.route();
  },
  async choisirMilitant() {
    const r = await UI.modal('Désigner un militant', `<div class="f"><label>Rechercher la fiche (nom, prénom)</label><input id="dm_q" oninput="Droits._chercherMil()"></div><div id="dm_res" class="small"></div>`, [{ label: 'Fermer', value: null }]);
  },
  _chercherMil() {
    const q = norm($('#dm_q').value); const box = $('#dm_res'); if (q.length < 2) { box.innerHTML = ''; return; }
    box.innerHTML = D.personnes.filter(p => !p.archive && norm(P.full(p)).includes(q)).slice(0, 10).map(p => { const u = Droits.userDe(p); return `<div style="padding:.3rem 0;border-bottom:1px solid #eee">${esc(P.full(p))} · ${esc(P.etab(p) || '')} ${u && u.actif !== false ? '<span class="tag ok">déjà dans la liste</span>' : `<button class="btn sm" onclick="UI.close();Droits.militant('${p.id}')">Désigner</button>`}</div>`; }).join('') || '<span class="mut">Aucune fiche.</span>';
  },
  relier(pid) { const id = $('#dr_lien').value; const u = D.users.find(x => x.id === id); if (!u) return; u.pid = pid; const pf = P.get(pid); if (pf) { u.prenom = pf.prenom || u.prenom; u.nom = (pf.nom || u.nom).toUpperCase(); } save(); log('Compte relié à une fiche', u.prenom + ' ' + u.nom); Droits.rafraichir(); UI.renderNav(); App.route(); },
  async delier(id) { const u = D.users.find(x => x.id === id); if (!await UI.confirm('Délier le compte de cette fiche ? Il perd les droits liés aux mandats.', 'Délier')) return; u.pid = null; save(); App.route(); },
  setRole(id, r) { const u = D.users.find(x => x.id === id); u.role = r; save(); log('Rôle modifié', u.prenom + ' ' + u.nom + ' → ' + r); Droits.rafraichir(); UI.renderNav(); App.route(); },
  basculer(id, k, on) {
    const u = D.users.find(x => x.id === id); u.permsPlus = u.permsPlus || []; u.permsMoins = u.permsMoins || [];
    const base = new Set(); Droits.roles(u).forEach(r => ((D.roles[r] || {}).perms || []).forEach(x => base.add(x)));
    u.permsPlus = u.permsPlus.filter(x => x !== k); u.permsMoins = u.permsMoins.filter(x => x !== k);
    if (on && !base.has(k)) u.permsPlus.push(k);
    if (!on && base.has(k)) u.permsMoins.push(k);
    save(); log('Droit ' + (on ? 'accordé' : 'retiré'), u.prenom + ' ' + u.nom + ' : ' + k); Droits.rafraichir(); App.route();
  },
  async pin(id) {
    const u = D.users.find(x => x.id === id);
    const moi = u.id === ME.id;
    const pin = await UI.prompt(moi ? 'Changer mon code personnel' : 'Code provisoire', moi ? 'Nouveau code (6 à 10 chiffres) :' : 'Code provisoire (6 à 10 chiffres). La personne devra le changer à sa première connexion sur cet appareil :', '', moi ? 'password' : 'text'); if (pin == null) return;
    const err = Secu.pinValide(pin, Droits.personne(u)); if (err) return UI.toast(err, 'r');
    await Secu.definirPin(u, pin); u.pinProvisoire = !moi; delete (D.meta.echecs || {})[u.id]; u.bloque = null;
    save(); log(moi ? 'Code personnel modifié' : 'Code provisoire attribué', u.prenom + ' ' + u.nom); UI.toast('Code enregistré', 'g'); App.route();
  },
  actif(id, on) { const u = D.users.find(x => x.id === id); u.actif = on; save(); log(on ? 'Compte réactivé' : 'Compte désactivé', u.prenom + ' ' + u.nom); App.route(); }
};
