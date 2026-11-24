/* =========================================================
   Sécurité des accès : invitations à double canal (fichier
   par mail + code par SMS), vérification d'identité,
   code personnel robuste, blocage après échecs
   ========================================================= */
'use strict';
const Secu = {
  ALPHA: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
  code(n) { const r = crypto.getRandomValues(new Uint8Array(n)); return Array.from(r, x => Secu.ALPHA[x % Secu.ALPHA.length]).join(''); },
  async empreinte(...parts) { return (await Crypto.hash(parts.join('|'))).slice(0, 6).toUpperCase(); },
  JOURS: 7,

  /* ---------- Règles du code personnel ---------- */
  pinValide(pin, p) {
    if (!/^\d{6,10}$/.test(pin)) return 'Le code personnel doit comporter 6 à 10 chiffres.';
    if (/^(\d)\1+$/.test(pin)) return 'Évite les chiffres tous identiques.';
    const asc = '01234567890123456789', desc = '98765432109876543210';
    if (asc.includes(pin) || desc.includes(pin)) return 'Évite les suites de chiffres (123456…).';
    if (p && p.dateNaissance) { const [y, m, d] = p.dateNaissance.split('-'); if ([d + m + y, d + m + y.slice(2), y + m + d, d + m + y.slice(2) + '', m + d + y].some(x => pin.includes(x))) return 'N\'utilise pas ta date de naissance.'; }
    return '';
  },
  async definirPin(u, pin) { u.salt = uid(); u.pin = await Auth.hashPin(pin, u.salt); u.pinLong = pin.length; u.pinProvisoire = false; u.pinDate = nowISO(); },

  /* ---------- Blocage après échecs (sur cet appareil) ---------- */
  echecs() { return (D.meta.echecs = D.meta.echecs || {}); },
  bloque(u) {
    if (u.bloque) return 'Compte bloqué sur cet appareil après trop d\'essais. ' + (u.role === 'admin' ? 'Attends puis réessaie.' : 'Demande une nouvelle invitation au secrétaire académique.');
    const e = Secu.echecs()[u.id]; if (e && e.jusqua && Date.now() < e.jusqua) return `Trop d'essais : réessaie dans ${Math.ceil((e.jusqua - Date.now()) / 60000)} min.`;
    return '';
  },
  async echec(u) {
    const e = Secu.echecs()[u.id] = Secu.echecs()[u.id] || { n: 0 }; e.n++; e.dernier = nowISO();
    if (e.n >= 5) e.jusqua = Date.now() + Math.min(60, 2 ** (e.n - 5)) * 60000;
    if (e.n >= 10 && u.role !== 'admin' && D.meta.invitation) u.bloque = nowISO();
    log('Échec de connexion', u.prenom + ' ' + u.nom + ' (' + e.n + ')'); await _saveNow();
    return e.n;
  },
  reussite(u) { delete Secu.echecs()[u.id]; },

  /* ---------- Côté administrateur : préparer une invitation ---------- */
  sousEnsemble(u) {
    const perms = Droits.perms(u), per = Droits.perimetre(u), moi = Droits.personne(u);
    let ps = D.personnes.filter(p => !p.archive && (perms.has('adh.voir_tout') || p.militant === u.id || P.uais(p).some(x => per.etabs.includes(x)) || per.deps.includes(P.dep(p))));
    if (moi && !ps.includes(moi)) ps.push(moi);
    if (!perms.has('adh.voir') && !perms.has('vot.voir')) ps = moi ? [moi] : [];
    ps = ps.map(p => { const o = JSON.parse(JSON.stringify(p)); delete o.extra; if (!perms.has('adh.historique')) { o.interventions = []; o.messages = []; } if (!perms.has('adh.cotis') && !perms.has('tres.voir')) o.cotisations = o.cotisations.map(c => ({ id: c.id, periode: c.periode })); return o; });
    const usr = JSON.parse(JSON.stringify(u)); delete usr.pin; delete usr.salt; delete usr.invitation;
    return {
      personnes: ps, users: [usr], roles: D.roles, modeles: D.modeles, publications: (D.publications || []).map(x => Object.assign({}, x, { fichier: x.fichier && x.fichier.data.length < 1500000 ? x.fichier : null })),
      disciplines: D.disciplines, bareme: D.bareme || [], etablissements: D.etablissements.filter(e => e.manuel),
      reunions: perms.has('reu.voir') ? D.reunions : [], frais: D.frais.filter(f => f.userId === u.id || perms.has('frais.valider')),
      treso: perms.has('tres.voir') ? D.treso : null,
      meta: { syndicat: D.meta.syndicat, elections: D.meta.elections, frais: D.meta.frais, exerciceDebutMois: D.meta.exerciceDebutMois, lockMinutes: D.meta.lockMinutes || 15, mailNational: D.meta.mailNational, mailsAcademies: D.meta.mailsAcademies }
    };
  },
  async inviter(uidUser) {
    const u = D.users.find(x => x.id === uidUser); const p = Droits.personne(u);
    if (!Crypto.ok()) return UI.toast('Chiffrement indisponible dans ce navigateur', 'r');
    const mail = (p && p.email) || u.email, tel = (p && p.telPortable) || u.tel;
    const code = Secu.code(10), id = uid(), secret = Secu.code(12);
    const expire = new Date(Date.now() + Secu.JOURS * 86400000).toISOString();
    const charge = Object.assign({ type: 'invitation', version: 1, id, secret, expire, de: ME.prenom + ' ' + ME.nom, date: nowISO(), userId: u.id, controle: p && p.dateNaissance ? await Crypto.hash('ddn|' + p.dateNaissance) : '' }, Secu.sousEnsemble(u));
    const fichier = await Crypto.encrypt(charge, code);
    u.invitation = { id, secret, cree: nowISO(), expire, statut: 'envoyée', mail, tel, verifie: null };
    u.actif = true; u.bloque = null; save(); log('Invitation créée', u.prenom + ' ' + u.nom + ' (' + charge.personnes.length + ' fiches)');
    const nomF = `invitation_SNETAA-FO_${norm(u.prenom + '_' + u.nom).replace(/ /g, '_')}.snetaa`;
    const url = /^https?:/.test(location.protocol) ? location.origin + location.pathname : 'https://karaaahhhhhhhhhh.github.io/snetaa-ot/';
    const fmt = code.slice(0, 5) + '-' + code.slice(5);
    const corpsMail = `Bonjour ${u.prenom},\n\nJe t'ouvre un accès à l'application de gestion syndicale du SNETAA-FO ${D.meta.syndicat.section}.\n\n1. Enregistre le fichier joint à ce mail (${nomF}).\n2. Ouvre l'application : ${url}\n   (sur téléphone : menu ⋮ « Installer l'application » ou Partager « Sur l'écran d'accueil »)\n3. Sur l'écran de connexion, clique sur « J'ai reçu une invitation » et choisis le fichier.\n4. Saisis le code d'accès que je t'envoie séparément par SMS, puis choisis ton code personnel.\n5. Communique-moi le code de confirmation affiché à la fin.\n\nL'invitation est valable jusqu'au ${fmtDate(expire)}. Ne transfère ni ce mail ni le fichier.\n\nBien syndicalement,\n\n${D.meta.syndicat.signature}`;
    const sms = `SNETAA-FO : ton code d'accès à l'application est ${fmt} (valable jusqu'au ${fmtDate(expire)}). Ne le communique à personne. ${ME.prenom}`;
    Secu._inv = { nomF, fichier, corpsMail, sms, mail, tel, fmt, u };
    UI.modal('Invitation pour ' + u.prenom + ' ' + u.nom, `<div class="alert small"><b>Deux canaux différents</b> : le fichier part par mail, le code par SMS (ou de vive voix). Une personne qui intercepte l'un des deux ne peut rien en faire.</div>
      <h3>1. Le fichier, par mail ${mail ? '→ ' + esc(mail) : '<span class="tag ko">aucun courriel sur la fiche</span>'}</h3>
      <p><button class="btn" onclick="download(Secu._inv.nomF,Secu._inv.fichier,'application/json')">⬇ Télécharger le fichier d'invitation</button> <button class="btn sec" ${mail ? '' : 'disabled'} onclick="openLink(mailto(Secu._inv.mail,'[SNETAA-FO] Ton accès à l\\'application',Secu._inv.corpsMail));Secu.note('envoyeMail')">✉ Préparer le mail</button></p>
      <p class="small mut">Joins le fichier téléchargé au mail avant de l'envoyer (la messagerie ne peut pas le joindre automatiquement).</p>
      <h3>2. Le code d'accès, par SMS ${tel ? '→ ' + esc(tel) : '<span class="tag ko">aucun portable sur la fiche</span>'}</h3>
      <p style="font-size:1.6rem;letter-spacing:.15em;font-weight:700;color:var(--navy)">${esc(fmt)}</p>
      <p>${tel ? `<a class="btn" href="${esc('sms:' + phoneIntl(tel) + (/iPhone|iPad|Mac/.test(navigator.userAgent) ? '&' : '?') + 'body=' + encodeURIComponent(sms))}" onclick="Secu.note('envoyeSms')">📱 Envoyer le SMS</a> ` : ''}<button class="btn sec" onclick="copyText(Secu._inv.sms)">Copier le texte du SMS</button></p>
      <p class="small mut">Ce code n'est affiché qu'une fois et n'est conservé nulle part. Valable ${Secu.JOURS} jours.</p>
      <h3>3. Vérification</h3><p class="small">À la fin de l'activation, la personne voit un <b>code de confirmation</b> à 6 caractères. Demande-le-lui par téléphone et saisis-le dans sa fiche (onglet « Accès & droits ») : l'accès est alors marqué « identité vérifiée ».</p>`,
      [{ label: 'Fermer', onClick: () => { App.route(); } }], { wide: true, nofocus: true });
  },
  note(k) { const u = Secu._inv.u; u.invitation[k] = nowISO(); save(); },
  async verifier(uidUser) {
    const u = D.users.find(x => x.id === uidUser); const v = ($('#sec_conf').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const attendu = await Secu.empreinte(u.invitation.id, u.invitation.secret, 'activation');
    if (v !== attendu) { log('Vérification d\'identité échouée', u.prenom + ' ' + u.nom); return UI.toast('Code de confirmation incorrect', 'r'); }
    u.invitation.statut = 'activée'; u.invitation.verifie = nowISO(); save(); log('Identité vérifiée', u.prenom + ' ' + u.nom); UI.toast('Identité vérifiée', 'g'); App.route();
  },
  revoquer(uidUser) {
    const u = D.users.find(x => x.id === uidUser); u.invitation = Object.assign(u.invitation || {}, { statut: 'révoquée', revoque: nowISO() }); u.actif = false; save(); log('Accès révoqué', u.prenom + ' ' + u.nom); App.route();
  },
  blocFiche(u) {
    const i = u.invitation;
    const exp = i && i.statut === 'envoyée' && i.expire < nowISO();
    return `<div class="card" style="margin-top:1rem;border-left:4px solid var(--navy)"><h3 style="margin-top:0">🔐 Sécurité de l'accès</h3>
      ${!i ? `<p class="small">Aucune invitation envoyée. L'invitation permet à la personne d'utiliser l'application <b>sur son propre appareil</b>, avec ses seules données autorisées, après vérification de son identité.</p>`
        : `<div class="kv"><div>Invitation</div><div>créée le ${fmtDT(i.cree)} · ${exp ? '<span class="tag ko">expirée</span>' : 'valable jusqu\'au ' + fmtDate(i.expire)}</div>
        <div>Envois</div><div>${i.envoyeMail ? 'mail préparé le ' + fmtDT(i.envoyeMail) : 'mail : non noté'} · ${i.envoyeSms ? 'SMS le ' + fmtDT(i.envoyeSms) : 'SMS : non noté'}</div>
        <div>Statut</div><div>${i.statut === 'activée' ? `<span class="tag ok">identité vérifiée le ${fmtDT(i.verifie)}</span>` : i.statut === 'révoquée' ? '<span class="tag ko">révoquée</span>' : '<span class="tag w">en attente du code de confirmation</span>'}</div></div>
        ${i.statut === 'envoyée' && !exp ? `<p class="toolbar"><input id="sec_conf" placeholder="Code de confirmation (6 caractères)" style="max-width:260px;text-transform:uppercase"> <button class="btn sm" onclick="Secu.verifier('${u.id}')">Vérifier</button></p>` : ''}`}
      <p><button class="btn" onclick="Secu.inviter('${u.id}')">${i ? '↻ Nouvelle invitation (données à jour)' : '✉ Envoyer une invitation'}</button> ${i && i.statut !== 'révoquée' ? `<button class="btn sec" onclick="Secu.revoquer('${u.id}')">Révoquer</button>` : ''}</p>
      <p class="small mut">Révoquer désactive le compte ici et empêche d'intégrer ses retours ; l'application déjà installée chez la personne garde les données qu'elle a reçues (pas de serveur pour les effacer à distance). N'invite donc que des personnes de confiance.</p></div>`;
  },

  /* ---------- Côté invité : activer une invitation ---------- */
  async ouvrir() {
    const f = await pickFile('.snetaa,.json'); if (!f) return;
    const txt = await readFile(f, 'text');
    let o; try { o = JSON.parse(txt); } catch (e) { return UI.toast('Fichier illisible', 'r'); }
    if (!o.snetaaEnc) return UI.toast('Ce fichier n\'est pas une invitation', 'r');
    const code = await UI.prompt('Code d\'accès', 'Saisis le code d\'accès reçu par SMS (10 caractères) :', '', 'text');
    if (code == null) return;
    let inv; try { inv = await Crypto.decrypt(txt, code.toUpperCase().replace(/[^A-Z0-9]/g, '')); } catch (e) { return UI.toast('Code d\'accès incorrect', 'r'); }
    if (inv.type !== 'invitation') return UI.toast('Ce fichier n\'est pas une invitation', 'r');
    if (inv.expire < nowISO()) return UI.modal('Invitation expirée', `<p>Cette invitation a expiré le ${fmtDate(inv.expire)}. Demande-en une nouvelle à ${esc(inv.de)}.</p>`, [{ label: 'OK' }]);
    const u = inv.users[0];
    if (D.users.length && !D.users.some(x => x.id === u.id)) return UI.modal('Appareil déjà utilisé', '<p>Cette application contient déjà les données d\'une autre personne sur ce navigateur. Utilise ton propre appareil, ou un autre navigateur.</p>', [{ label: 'OK' }]);
    const moi = inv.personnes.find(p => p.id === u.pid);
    if (inv.controle) {
      const ddn = await UI.prompt('Vérification d\'identité', 'Bonjour ' + u.prenom + '. Pour vérifier ton identité, indique ta date de naissance :', '', 'date');
      if (ddn == null) return;
      if (await Crypto.hash('ddn|' + ddn) !== inv.controle) { return UI.modal('Vérification impossible', '<p>La date de naissance ne correspond pas à celle de ta fiche. Contacte le secrétaire académique.</p>', [{ label: 'OK' }]); }
    }
    let pin;
    for (;;) {
      pin = await UI.modal('Choisis ton code personnel', `<p class="small">Il te sera demandé à chaque ouverture de l'application sur cet appareil. 6 à 10 chiffres, pas de suite simple ni de date de naissance.</p><div class="f"><label>Code personnel</label><input id="iv_p1" type="password" inputmode="numeric" autocomplete="new-password"></div><div class="f"><label>Confirmer</label><input id="iv_p2" type="password" inputmode="numeric" autocomplete="new-password"></div>`,
        [{ label: 'Annuler', value: null }, { label: 'Valider', onClick: m => { const a = m.querySelector('#iv_p1').value.trim(); const err = Secu.pinValide(a, moi); if (err) { UI.toast(err, 'r'); return false; } if (a !== m.querySelector('#iv_p2').value.trim()) { UI.toast('Les deux codes diffèrent', 'r'); return false; } return a; } }]);
      if (pin == null) return; break;
    }
    // intégration des données
    const exist = D.users.find(x => x.id === u.id);
    const user = exist || Object.assign({}, u, { actif: true });
    await Secu.definirPin(user, pin); user.bloque = null; if (!exist) D.users.push(user);
    inv.personnes.forEach(np => {
      const p = P.get(np.id);
      if (!p) { D.personnes.push(P.fix(np)); return; }
      const ids = new Set(p.vote.contacts.map(c => c.id)); const locaux = p.vote.contacts.filter(c => !np.vote.contacts.some(x => x.id === c.id));
      const intention = (p.vote.intMaj || '') > (np.vote.intMaj || '') ? [p.vote.intention, p.vote.intMaj] : null;
      Object.assign(p, np); p.vote.contacts = np.vote.contacts.concat(locaux); if (intention) { p.vote.intention = intention[0]; p.vote.intMaj = intention[1]; } P.fix(p);
    });
    D.roles = inv.roles; D.modeles = inv.modeles; D.publications = inv.publications; D.disciplines = inv.disciplines; D.bareme = inv.bareme;
    inv.etablissements.forEach(e => { if (!D.etablissements.some(x => x.uai === e.uai)) D.etablissements.push(e); });
    inv.reunions.forEach(r => { const i = D.reunions.findIndex(x => x.id === r.id); if (i >= 0) D.reunions[i] = r; else D.reunions.push(r); });
    inv.frais.forEach(r => { if (!D.frais.some(x => x.id === r.id)) D.frais.push(r); });
    if (inv.treso) D.treso = inv.treso;
    Object.assign(D.meta, inv.meta); D.meta.invitation = { id: inv.id, de: inv.de, date: inv.date, active: nowISO() }; D.meta.paquet = { date: inv.date, de: inv.de };
    D.journal.unshift({ d: nowISO(), u: user.id, a: 'Activation de l\'invitation', x: inv.personnes.length + ' fiches' });
    await _saveNow();
    const conf = await Secu.empreinte(inv.id, inv.secret, 'activation');
    await UI.modal('Accès activé', `<p>Bienvenue ${esc(user.prenom)} ! Ton accès est prêt sur cet appareil.</p><p>Communique ce <b>code de confirmation</b> à ${esc(inv.de)} (par téléphone ou SMS) pour finaliser la vérification :</p><p style="font-size:2rem;letter-spacing:.2em;font-weight:700;color:var(--navy);text-align:center">${conf}</p>`, [{ label: 'C\'est noté, entrer' }]);
    localStorage.setItem('snetaa-lastuser', user.id); Auth.enter(user);
  },
  /* changement de code imposé (code provisoire ou trop court) */
  async imposerChangement(u) {
    const p = Droits.personne(u);
    for (;;) {
      const pin = await UI.modal('Nouveau code personnel obligatoire', `<p class="small">${u.pinProvisoire ? 'Ton code actuel est provisoire.' : 'Ton code actuel est trop court.'} Choisis un code personnel de 6 à 10 chiffres.</p><div class="f"><label>Nouveau code</label><input id="np_1" type="password" inputmode="numeric" autocomplete="new-password"></div><div class="f"><label>Confirmer</label><input id="np_2" type="password" inputmode="numeric"></div>`,
        [{ label: 'Valider', onClick: m => { const a = m.querySelector('#np_1').value.trim(); const err = Secu.pinValide(a, p); if (err) { UI.toast(err, 'r'); return false; } if (a !== m.querySelector('#np_2').value.trim()) { UI.toast('Les deux codes diffèrent', 'r'); return false; } return a; } }]);
      if (pin) { await Secu.definirPin(u, pin); await _saveNow(); log('Code personnel modifié'); UI.toast('Code personnel enregistré', 'g'); return; }
    }
  }
};
