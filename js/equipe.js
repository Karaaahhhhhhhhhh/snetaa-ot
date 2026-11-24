/* =========================================================
   Équipe : mise à jour des membres invités via Dropbox
   - mot de passe d'équipe (généré, retrouvé, partagé, changé)
   - fichier de mise à jour : une section par membre, chiffrée
     avec SA clé personnelle (reçue dans son invitation), le tout
     chiffré avec le mot de passe d'équipe
   - retours des membres : dépôt Dropbox (demande de fichiers)
   Le transport passe par Equipe.canal : aujourd'hui Dropbox,
   demain un serveur d'hébergement (données toujours chiffrées).
   ========================================================= */
'use strict';
const Equipe = {
  FICHIER: '/equipe/mise-a-jour-equipe.snetaa',
  DOSSIER_RETOURS: '/retours',
  MOTS: ['Abricot', 'Ardoise', 'Atelier', 'Balcon', 'Baobab', 'Bateau', 'Bocal', 'Bougie', 'Boussole', 'Brique', 'Cactus', 'Canard', 'Canyon', 'Carton', 'Castor', 'Cerise', 'Chalet', 'Chamois', 'Citron', 'Clocher', 'Colline', 'Comete', 'Compas', 'Corail', 'Coton', 'Crayon', 'Dauphin', 'Domino', 'Dragon', 'Ecureuil', 'Etoile', 'Falaise', 'Faucon', 'Fenouil', 'Figue', 'Flocon', 'Fougere', 'Fourmi', 'Gazelle', 'Geyser', 'Girafe', 'Glacier', 'Grenier', 'Griffon', 'Guitare', 'Hamac', 'Hibou', 'Horizon', 'Iceberg', 'Igloo', 'Jardin', 'Jasmin', 'Kayak', 'Koala', 'Lagune', 'Lampion', 'Lavande', 'Levier', 'Lezard', 'Licorne', 'Lotus', 'Luciole', 'Magnolia', 'Manchot', 'Marmotte', 'Melon', 'Meteore', 'Moulin', 'Muguet', 'Narval', 'Nuage', 'Olivier', 'Orage', 'Orchidee', 'Panda', 'Papillon', 'Pelican', 'Phare', 'Piano', 'Pingouin', 'Pirate', 'Plateau', 'Pompon', 'Prairie', 'Puzzle', 'Quartz', 'Radeau', 'Raisin', 'Renard', 'Requin', 'Rocher', 'Roseau', 'Ruisseau', 'Sablier', 'Safran', 'Saphir', 'Sapin', 'Sardine', 'Savane', 'Sequoia', 'Sirocco', 'Soleil', 'Tambour', 'Tapir', 'Tilleul', 'Tipi', 'Tonnerre', 'Torrent', 'Toucan', 'Tournesol', 'Trefle', 'Tulipe', 'Vallon', 'Vanille', 'Verger', 'Violon', 'Volcan', 'Wagon', 'Yaourt', 'Zebre', 'Zephyr'],

  etat() { return (D.meta.equipe = D.meta.equipe || { historique: [] }); },
  genMdp() {
    const r = crypto.getRandomValues(new Uint32Array(5)), M = Equipe.MOTS;
    return [0, 1, 2, 3].map(i => M[r[i] % M.length]).join('-') + '-' + String(10 + r[4] % 90);
  },
  membres() { return D.users.filter(u => u.actif !== false && u.invitation && u.invitation.secret && u.invitation.statut !== 'révoquée' && !Droits.roles(u).includes('admin')); },
  direct(u) { try { const x = new URL(u); if (/(^|\.)dropbox\.com$/.test(x.hostname)) { x.hostname = 'dl.dropboxusercontent.com'; x.searchParams.delete('dl'); } return x.toString(); } catch (e) { return u; } },

  /* ---------- Transport (Dropbox aujourd'hui) ---------- */
  canal: {
    nom: 'Dropbox',
    async appel(url, corps) {
      const r = await fetch('https://api.dropboxapi.com/2/' + url, { method: 'POST', headers: { Authorization: 'Bearer ' + await Sauv.jeton(), 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
      const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { error_summary: t }; }
      if (!r.ok) { const e = new Error(j.error_summary || ('réponse ' + r.status)); e.j = j; e.status = r.status; throw e; }
      return j;
    },
    async deposer(path, txt) {
      const r = await fetch('https://content.dropboxapi.com/2/files/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + await Sauv.jeton(), 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': JSON.stringify({ path, mode: 'overwrite', mute: true }) }, body: new Blob([txt]) });
      if (!r.ok) throw new Error('envoi refusé (' + r.status + ')');
    },
    async lire(path) {
      const r = await fetch('https://content.dropboxapi.com/2/files/download', { method: 'POST', headers: { Authorization: 'Bearer ' + await Sauv.jeton(), 'Dropbox-API-Arg': JSON.stringify({ path }) } });
      if (!r.ok) throw new Error('lecture refusée (' + r.status + ')'); return r.text();
    },
    async lister(path) {
      try { return (await Equipe.canal.appel('files/list_folder', { path })).entries || []; }
      catch (e) { if (/not_found/.test(e.message)) return []; throw e; }
    },
    async deplacer(de, vers) { return Equipe.canal.appel('files/move_v2', { from_path: de, to_path: vers, autorename: true }); },
    async lienPublic(path) {
      try { return (await Equipe.canal.appel('sharing/create_shared_link_with_settings', { path, settings: { requested_visibility: 'public' } })).url; }
      catch (e) {
        if (/shared_link_already_exists/.test(e.message)) {
          const m = e.j && e.j.error && e.j.error.shared_link_already_exists && e.j.error.shared_link_already_exists.metadata;
          if (m && m.url) return m.url;
          const l = await Equipe.canal.appel('sharing/list_shared_links', { path, direct_only: true }); if (l.links && l.links[0]) return l.links[0].url;
        }
        throw e;
      }
    },
    async creerDepot() { return (await Equipe.canal.appel('file_requests/create', { title: 'Retours SNETAA-FO Orléans-Tours', destination: Equipe.DOSSIER_RETOURS, open: true })).url; }
  },
  erreurDroits(e) {
    if (/missing_scope|scope/.test(e.message)) return 'Dropbox refuse : il manque une autorisation. Dans dropbox.com/developers/apps → ton application → onglet Autorisations, coche aussi sharing.write, sharing.read, file_requests.write et file_requests.read, clique en bas sur « Enregistrer les modifications », puis dans l\'application : Sauvegarde → « Déconnecter » puis « Connecter mon Dropbox » (Dropbox redemande ton accord pour les nouvelles autorisations).';
    return e.message;
  },

  /* ---------- Côté administrateur ---------- */
  carteAdmin() {
    if (!can('adm.users')) return '';
    const e = Equipe.etat(), mb = Equipe.membres(), dbx = Sauv.dbxEtat();
    return `<div class="card" style="margin-top:1rem;border-left:4px solid var(--navy)"><h3 style="margin-top:0">👥 Mise à jour de l'équipe (membres invités)</h3>
      <p class="small">Publie sur Dropbox un fichier de mise à jour : chaque membre n'y lit <b>que ses propres données</b> (chiffrées avec sa clé personnelle reçue lors de l'invitation), et le fichier entier est protégé par le <b>mot de passe d'équipe</b>.</p>
      <div class="kv"><div>Membres concernés</div><div>${mb.length ? mb.map(u => esc(u.prenom + ' ' + u.nom)).join(', ') : '<span class="mut">aucun membre invité pour l\'instant</span>'}</div>
        <div>Mot de passe d'équipe</div><div>${e.mdp ? `créé le ${fmtDT(e.cree)} <button class="btn sm sec" onclick="Equipe.afficher()">👁 Afficher / partager</button> <button class="btn sm ghost" onclick="Equipe.nouveauMdp()">↻ Nouveau mot de passe</button>` : `<button class="btn sm" onclick="Equipe.nouveauMdp()">Générer le mot de passe d'équipe</button>`}</div>
        <div>Dernière publication</div><div>${e.publie ? fmtDT(e.publie) + (e.mdpPublie && e.mdpPublie !== e.cree ? ' <span class="tag w">avec l\'ancien mot de passe : republie</span>' : '') : 'jamais'}</div>
        <div>Lien de mise à jour</div><div class="small">${e.lien ? `<a href="${esc(e.lien)}" target="_blank" rel="noopener">${esc(e.lien.slice(0, 60))}…</a> <button class="btn sm sec" onclick="copyText(Equipe.etat().lien)">📋 Copier le lien</button>` : '—'}</div>
        <div>Dépôt des retours</div><div class="small">${e.depot ? `<a href="${esc(e.depot)}" target="_blank" rel="noopener">lien de dépôt actif</a>` : '—'}</div></div>
      <p>${dbx.connecte ? `<button class="btn" onclick="Equipe.publier()" ${mb.length ? '' : 'disabled'}>☁ Publier la mise à jour de l'équipe</button> <button class="btn sec" onclick="Equipe.recupererRetours()">⇩ Récupérer les retours déposés</button>` : '<span class="small mut">Connecte d\'abord Dropbox (ci-dessus).</span>'}</p>
      ${e.lien ? `<p class="small mut">À poster sur le groupe WhatsApp : le lien (bouton « Copier ») et le mot de passe d'équipe (« Afficher / partager »).</p>` : ''}</div>`;
  },
  async verifierCode(titre) {
    const pin = await UI.prompt(titre || 'Confirmation', 'Ton code personnel :', '', 'password'); if (pin == null) return false;
    if (await Auth.hashPin(pin.trim(), ME.salt) !== ME.pin) { UI.toast('Code incorrect', 'r'); return false; }
    return true;
  },
  async nouveauMdp() {
    const e = Equipe.etat();
    if (e.mdp && !await UI.confirm('Créer un nouveau mot de passe d\'équipe ? Il s\'appliquera à la <b>prochaine publication</b> : il faudra le communiquer aux membres.', 'Nouveau mot de passe')) return;
    if (e.mdp) { e.historique = e.historique || []; e.historique.unshift({ cree: e.cree, fin: nowISO() }); e.historique.length = Math.min(e.historique.length, 10); }
    e.mdp = Equipe.genMdp(); e.cree = nowISO(); await _saveNow(); log('Nouveau mot de passe d\'équipe');
    Equipe.afficher(true);
  },
  async afficher(sansCode) {
    if (!sansCode && !await Equipe.verifierCode('Afficher le mot de passe d\'équipe')) return;
    const e = Equipe.etat(), mb = Equipe.membres();
    const txt = `SNETAA-FO : mot de passe de mise à jour de l'application : ${e.mdp} (à saisir dans « Mettre à jour mes données »). Ne le transmets à personne.`;
    Equipe._txt = txt;
    UI.modal('Mot de passe d\'équipe', `<p style="font-size:1.5rem;font-weight:700;letter-spacing:.05em;color:var(--navy);text-align:center;word-break:break-all">${esc(e.mdp)}</p>
      <p class="small mut" style="text-align:center">créé le ${fmtDT(e.cree)} · ${e.publie && e.mdpPublie === e.cree ? 'déjà utilisé pour la publication du ' + fmtDT(e.publie) : '<b>pas encore publié</b> : clique ensuite sur « Publier la mise à jour de l\'équipe »'}</p>
      <h3>Partager avec les membres (par SMS de préférence)</h3>
      ${mb.length ? `<div class="tablewrap"><table><tbody>${mb.map(u => { const t = u.tel || (Droits.personne(u) || {}).telPortable; return `<tr><td>${esc(u.prenom + ' ' + u.nom)}</td><td>${t ? `<a class="btn sm" href="${esc('sms:' + phoneIntl(t) + (/iPhone|iPad|Mac/.test(navigator.userAgent) ? '&' : '?') + 'body=' + encodeURIComponent(txt))}">📱 SMS</a>` : '<span class="small mut">pas de portable</span>'}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="small mut">Aucun membre invité.</p>'}
      <p><button class="btn sec sm" onclick="copyText(Equipe._txt)">Copier le message</button> <button class="btn sec sm" onclick="copyText(Equipe.etat().mdp)">Copier le mot de passe seul</button></p>
      <p class="small mut">Il reste consultable ici (avec ton code personnel) jusqu'à ce que tu en crées un nouveau.</p>`, [{ label: 'Fermer' }]);
  },
  async publier() {
    const e = Equipe.etat(), mb = Equipe.membres();
    if (!mb.length) return UI.toast('Aucun membre invité', 'r');
    if (!e.mdp) { e.mdp = Equipe.genMdp(); e.cree = nowISO(); }
    try {
      UI.toast('Préparation de la mise à jour…');
      if (!e.depot) { try { e.depot = await Equipe.canal.creerDepot(); } catch (er) { e.depotErreur = Equipe.erreurDroits(er); } }
      if (!e.lien) { try { await Equipe.canal.deposer(Equipe.FICHIER, '{}'); e.lien = await Equipe.canal.lienPublic(Equipe.FICHIER); } catch (er) { e.lienErreur = Equipe.erreurDroits(er); } }
      const date = nowISO(), sections = {};
      for (const u of mb) {
        const charge = Object.assign({ type: 'maj-equipe', version: 1, id: uid(), date, de: ME.prenom + ' ' + ME.nom, userId: u.id }, Secu.sousEnsemble(u));
        charge.meta.equipeDepot = e.depot || ''; charge.meta.equipeLien = e.lien || '';
        sections[u.id] = await Crypto.encrypt(charge, u.invitation.secret);
      }
      const txt = await Crypto.encrypt({ type: 'snetaa-equipe', version: 1, date, de: ME.prenom + ' ' + ME.nom, sections }, e.mdp);
      await Equipe.canal.deposer(Equipe.FICHIER, txt);
      try { e.lien = await Equipe.canal.lienPublic(Equipe.FICHIER); e.lienErreur = ''; } catch (er) { e.lienErreur = Equipe.erreurDroits(er); }
      e.publie = date; e.mdpPublie = e.cree; await _saveNow(); log('Mise à jour de l\'équipe publiée', mb.length + ' membre(s)');
      UI.modal('Mise à jour publiée', `<p>Fichier publié sur ${Equipe.canal.nom} pour <b>${mb.length} membre(s)</b>.</p>
        ${e.lien ? `<p class="small">Les membres le récupèrent depuis l'accueil de leur application : « Mettre à jour mes données ». Ceux qui ont été invités avant la création du lien doivent l'avoir reçu au moins une fois : il est inclus dans cette mise à jour et dans les prochaines invitations.</p>` : `<div class="alert w small">Lien de partage non créé : ${esc(e.lienErreur || '')}</div>`}
        ${e.depotErreur && !e.depot ? `<div class="alert w small">Dépôt des retours non créé : ${esc(e.depotErreur)}<br>En attendant, les membres t'envoient leur retour par mail.</div>` : ''}
        <p class="small">Pense à communiquer le mot de passe d'équipe s'il est nouveau : <button class="btn sm sec" onclick="UI.close();Equipe.afficher()">Afficher / partager</button></p>`, [{ label: 'OK' }]);
      App.route();
    } catch (er) { UI.toast('Publication impossible : ' + Equipe.erreurDroits(er), 'r'); }
  },
  async recupererRetours() {
    try {
      const l = (await Equipe.canal.lister(Equipe.DOSSIER_RETOURS)).filter(x => x['.tag'] === 'file' && /\.snetaa$/i.test(x.name));
      if (!l.length) return UI.modal('Retours', '<p>Aucun retour en attente dans le dépôt.</p>', [{ label: 'OK' }]);
      const res = [];
      for (const f of l) {
        try {
          const o = JSON.parse(await Equipe.canal.lire(f.path_display));
          const u = o.type === 'retour-equipe' && D.users.find(x => x.id === o.userId);
          if (!u || !u.invitation || !u.invitation.secret) throw new Error('expéditeur inconnu');
          const r = await Crypto.decrypt(o.data, u.invitation.secret);
          const st = Votants.appliquerRetour(r);
          await Equipe.canal.deplacer(f.path_display, Equipe.DOSSIER_RETOURS + '/traites/' + f.name);
          res.push(`<li><b>${esc(u.prenom + ' ' + u.nom)}</b> (${fmtDT(r.date)}) : ${st.nMaj} fiches, ${st.nContacts} contacts, ${st.nNew} nouvelles personnes</li>`);
        } catch (er) { res.push(`<li class="mut">${esc(f.name)} : non intégré (${esc(er.message)})</li>`); }
      }
      UI.modal('Retours intégrés', `<ul>${res.join('')}</ul><p class="small mut">Les fichiers traités sont rangés dans « retours/traites » sur Dropbox.</p>`, [{ label: 'OK' }]); App.route();
    } catch (er) { UI.toast('Dropbox : ' + Equipe.erreurDroits(er), 'r'); }
  },

  /* ---------- Côté membre invité ---------- */
  carteMembre() {
    if (!D.meta.invitation || (ME && Droits.roles(ME).includes('admin'))) return '';
    const cle = D.meta.invitation.cle;
    return `<div class="card" style="margin-bottom:1rem;border-left:4px solid var(--navy)"><h3 style="margin-top:0">🔄 Mes données</h3>
      <div class="kv small"><div>Dernière mise à jour reçue</div><div>${D.meta.paquet ? fmtDT(D.meta.paquet.date) : '—'}</div><div>Dernier retour envoyé</div><div>${D.meta.dernierRetour ? fmtDT(D.meta.dernierRetour) : 'jamais'}</div></div>
      ${cle ? `<p><button class="btn" onclick="Equipe.miseAJour()">⇩ Mettre à jour mes données</button> <button class="btn sec" onclick="Equipe.envoyerRetour()">⇧ Envoyer mon retour</button></p>
      <p class="small mut">Envoie ton retour (contacts, intentions de vote, fiches modifiées) <b>avant</b> chaque mise à jour, et au moins une fois par jour pendant le vote.</p>`
      : '<p class="small">Ton invitation est antérieure à la mise à jour par Dropbox : demande une nouvelle invitation au secrétaire académique.</p>'}</div>`;
  },
  async telechargerMaj() {
    let lien = D.meta.equipeLien;
    if (!lien) {
      const l = await UI.prompt('Lien de mise à jour', 'Colle le lien de mise à jour (publié par le secrétaire académique sur le groupe WhatsApp). Laisse vide si tu as déjà téléchargé le fichier.', '', 'text');
      if (l == null) return null; if (/^https?:\/\//.test(l.trim())) { lien = D.meta.equipeLien = l.trim(); await _saveNow(); }
    }
    if (lien) { try { const r = await fetch(Equipe.direct(lien)); if (r.ok) { const t = await r.text(); if (/snetaaEnc/.test(t)) return t; } } catch (e) { } }
    const ok = await UI.modal('Récupérer le fichier', `<p>Le fichier n'a pas pu être récupéré automatiquement.</p><ol><li>${lien ? `<a href="${esc(Equipe.direct(lien))}" target="_blank" rel="noopener">Clique ici pour le télécharger</a>` : 'Demande le lien du fichier de mise à jour au secrétaire académique'}</li><li>Puis choisis le fichier téléchargé (mise-a-jour-equipe.snetaa).</li></ol>`, [{ label: 'Annuler', value: false }, { label: 'Choisir le fichier', value: true }]);
    if (!ok) return null;
    const f = await pickFile('.snetaa,.json'); return f ? readFile(f, 'text') : null;
  },
  async miseAJour() {
    const cle = D.meta.invitation && D.meta.invitation.cle; if (!cle) return;
    UI.toast('Récupération de la mise à jour…');
    const txt = await Equipe.telechargerMaj(); if (!txt) return;
    let pack = null, mdp = D.meta.equipeMdp;
    if (mdp) { try { pack = await Crypto.decrypt(txt, mdp); } catch (e) { pack = null; } }
    while (!pack) {
      mdp = await UI.prompt('Mot de passe d\'équipe', 'Mot de passe de mise à jour (reçu par SMS) :', '', 'text'); if (mdp == null) return;
      try { pack = await Crypto.decrypt(txt, mdp.trim()); mdp = mdp.trim(); } catch (e) { UI.toast('Mot de passe incorrect (il a peut-être changé : demande le nouveau)', 'r'); }
    }
    D.meta.equipeMdp = mdp;
    const sec = pack.sections && pack.sections[ME.id];
    if (!sec) return UI.modal('Pas de mise à jour pour toi', '<p>Ce fichier ne contient pas de données pour ton compte (accès révoqué ou invitation à renouveler). Contacte le secrétaire académique.</p>', [{ label: 'OK' }]);
    let inv; try { inv = await Crypto.decrypt(sec, cle); } catch (e) { return UI.toast('Ta clé personnelle ne correspond pas : demande une nouvelle invitation', 'r'); }
    if (D.meta.paquet && inv.date <= D.meta.paquet.date) return UI.toast('Tes données sont déjà à jour (' + fmtDT(inv.date) + ')', 'g');
    if ((D.meta.dernierRetour || '') < ((D.meta.paquet || {}).date || '')) {
      if (!await UI.confirm('Tu n\'as pas envoyé de retour depuis la dernière mise à jour. Ton travail local (contacts, intentions…) est conservé, mais pense à l\'envoyer ensuite. Continuer ?', 'Mettre à jour')) return;
    }
    Secu.integrer(inv, ME); await _saveNow(); Droits.rafraichir(); UI.renderUser(); UI.renderNav();
    log('Mise à jour reçue', inv.personnes.length + ' fiches'); UI.toast('Données mises à jour (' + inv.personnes.length + ' fiches)', 'g'); App.route();
  },
  async envoyerRetour() {
    const cle = D.meta.invitation && D.meta.invitation.cle; if (!cle) return;
    const ret = Votants.donneesRetour();
    const txt = JSON.stringify({ type: 'retour-equipe', version: 1, userId: ME.id, date: ret.date, data: await Crypto.encrypt(ret, cle) });
    const nom = `retour_${norm(ME.prenom + '_' + ME.nom).replace(/ /g, '_')}_${todayISO()}_${new Date().getHours()}h${pad2(new Date().getMinutes())}.snetaa`;
    download(nom, txt, 'application/json');
    D.meta.dernierRetour = ret.date; await _saveNow(); log('Retour préparé', ret.personnes.length + ' fiches');
    const depot = D.meta.equipeDepot;
    UI.modal('Envoyer mon retour', `<p>Le fichier <b>${esc(nom)}</b> (${ret.personnes.length} fiches) vient d'être téléchargé. Il est chiffré avec ta clé personnelle.</p>
      ${depot ? `<ol><li><a class="btn" href="${esc(depot)}" target="_blank" rel="noopener">Ouvrir le dépôt Dropbox</a></li><li>Clique sur « Ajouter des fichiers » et choisis le fichier téléchargé, puis indique ton nom.</li></ol><p class="small mut">Pas besoin de compte Dropbox.</p>`
        : `<p>Envoie-le en pièce jointe par mail à <b>${esc(D.meta.syndicat.mail)}</b>.</p><p><button class="btn sec" onclick="openLink(mailto('${esc(D.meta.syndicat.mail)}','[SNETAA-FO] Retour de ${esc(ME.prenom + ' ' + ME.nom)}','Bonjour,\\n\\nVoici mon retour (fichier joint).\\n\\n${esc(ME.prenom)}'))">✉ Préparer le mail</button></p>`}`, [{ label: 'Fermer' }]);
  },
  /* ancien format de retour militant déposé par mail : l'admin l'intègre via « Intégrer un retour » */
  async integrerFichier(txt) {
    const o = JSON.parse(txt); if (o.type !== 'retour-equipe') return false;
    const u = D.users.find(x => x.id === o.userId); if (!u || !u.invitation || !u.invitation.secret) throw new Error('expéditeur inconnu');
    return Votants.appliquerRetour(await Crypto.decrypt(o.data, u.invitation.secret));
  }
};
