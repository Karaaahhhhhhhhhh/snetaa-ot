/* =========================================================
   Sauvegarde : téléchargement, dossier choisi sur l'ordinateur,
   Dropbox (chiffrement obligatoire)
   ========================================================= */
'use strict';
const Sauv = {
  nomFichier() { const d = new Date(); return `sauvegarde_SNETAA-FO_OT_${todayISO()}_${pad2(d.getHours())}h${pad2(d.getMinutes())}.snetaa`; },
  /* mot de passe : facultatif (téléchargement / dossier local), obligatoire pour le cloud */
  async motDePasse(obligatoire, titre) {
    return UI.modal(titre || 'Mot de passe de chiffrement', `${obligatoire ? '<div class="alert w small"><b>Chiffrement obligatoire</b> : la sauvegarde part sur un service en ligne. Sans ce mot de passe, elle sera illisible, y compris pour toi : note-le en lieu sûr.</div>' : '<p class="small mut">Recommandé. Laisse vide pour une sauvegarde non chiffrée.</p>'}
      <div class="f"><label>Mot de passe (8 caractères minimum)</label><input id="sv_p1" type="password" autocomplete="new-password"></div><div class="f"><label>Confirmer</label><input id="sv_p2" type="password" autocomplete="new-password"></div>`,
      [{ label: 'Annuler', value: null }, {
        label: 'Continuer', onClick: m => {
          const a = m.querySelector('#sv_p1').value, b = m.querySelector('#sv_p2').value;
          if (!a && !obligatoire) return '';
          if (a.length < 8) { UI.toast('8 caractères minimum', 'r'); return false; }
          if (a !== b) { UI.toast('Les deux mots de passe diffèrent', 'r'); return false; }
          return a;
        }
      }]);
  },
  async contenu(pass) {
    D.meta.lastBackup = nowISO();
    const txt = pass ? await Crypto.encrypt(D, pass) : JSON.stringify(D);
    return txt;
  },
  fin(dest, chiffre) { D.meta.backups = D.meta.backups || []; D.meta.backups.unshift({ d: nowISO(), dest, chiffre, par: ME.id }); D.meta.backups.length = Math.min(D.meta.backups.length, 30); save(); log('Sauvegarde', dest + (chiffre ? ' (chiffrée)' : '')); App.route(); },

  /* ---------- Page ---------- */
  page() {
    const taille = new Blob([JSON.stringify(D)]).size;
    const fsOk = 'showDirectoryPicker' in window;
    const dbx = Sauv.dbxEtat();
    const hist = (D.meta.backups || []).slice(0, 8);
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Sauvegarde</h1><div class="mut small">Dernière sauvegarde : ${D.meta.lastBackup ? fmtDT(D.meta.lastBackup) : 'jamais'} · volume des données : ${(taille / 1024 / 1024).toFixed(1)} Mo</div></div></div>
      <div class="alert w">Les données sont enregistrées <b>dans ce navigateur, sur cet appareil</b>. Seule une sauvegarde permet de les retrouver après un changement d'ordinateur, une réinstallation ou un effacement du navigateur. Fais-en une au moins chaque semaine.</div>
      <div class="grid g3">
      <div class="card"><h3 style="margin-top:0">📁 Dans un dossier de mon choix</h3>
        ${fsOk ? `<p class="small">Dossier : <b id="sv_dos">${esc(Sauv._dosNom || 'non choisi')}</b></p>
          <label class="chk"><input type="checkbox" id="sv_cloud" ${D.meta.dossierCloud ? 'checked' : ''} onchange="D.meta.dossierCloud=this.checked;save()"> Ce dossier est synchronisé en ligne (Dropbox, OneDrive, Google Drive…) → chiffrement obligatoire</label>
          <p><button class="btn sec" onclick="Sauv.choisirDossier()">Choisir le dossier…</button> <button class="btn" onclick="Sauv.versDossier()">💾 Sauvegarder dans le dossier</button></p>
          <p class="small mut">Astuce : choisis ton dossier Dropbox sur l'ordinateur pour que la sauvegarde soit aussi copiée en ligne.</p>`
        : `<p class="small">Ce navigateur ne permet pas de choisir un dossier (possible avec Chrome ou Edge sur ordinateur). Utilise le téléchargement : le fichier va dans « Téléchargements », d'où tu peux le déplacer.</p>`}</div>
      <div class="card"><h3 style="margin-top:0">☁ Dropbox (en ligne)</h3>
        ${dbx.cle ? (dbx.connecte ? `<p class="small">Connecté. Les sauvegardes vont dans le dossier « Applications / ${esc(D.meta.dropboxApp || 'votre application')} » de ton Dropbox.</p><p><button class="btn" onclick="Sauv.versDropbox()">☁ Sauvegarder sur Dropbox</button></p><p><button class="btn sm sec" onclick="Sauv.restaurerDropbox()">Restaurer depuis Dropbox…</button> <button class="btn sm ghost" onclick="Sauv.dbxDeconnecter()">Déconnecter</button></p>`
        : `<p class="small">Clé d'application enregistrée. ${/^https:/.test(location.protocol) ? '' : '<b>La connexion à Dropbox ne fonctionne que depuis la version en ligne (adresse https://…).</b>'}</p><p><button class="btn" onclick="Sauv.dbxConnecter()" ${/^https:/.test(location.protocol) ? '' : 'disabled'}>Connecter mon Dropbox</button></p>`)
        : `<p class="small">À configurer une seule fois (voir l'aide ci-dessous) : colle la clé de ton application Dropbox.</p>`}
        <div class="f"><label>Clé de l'application Dropbox (App key)</label><input value="${esc(D.meta.dropboxCle || '')}" onchange="D.meta.dropboxCle=this.value.trim();save();App.route()" placeholder="ex. a1b2c3d4e5f6g7h"></div>
        <p class="small"><b>Le chiffrement est toujours obligatoire</b> pour Dropbox.</p></div>
      <div class="card"><h3 style="margin-top:0">⬇ Téléchargement</h3><p class="small">Le fichier part dans le dossier « Téléchargements » de cet appareil.</p><p><button class="btn sec" onclick="Sauv.telecharger()">Télécharger une sauvegarde</button></p>
        <h3>Restaurer</h3><p class="small">Remplace toutes les données de cet appareil par celles d'une sauvegarde.</p><button class="btn red" onclick="Params.restaurer()">Restaurer depuis un fichier…</button>
        <p><button class="btn sec sm" onclick="Params.exportExcel()">Exporter tout en Excel (lecture)</button></p></div></div>
      ${hist.length ? `<h2>Dernières sauvegardes</h2><div class="tablewrap"><table><tbody>${hist.map(h => `<tr><td>${fmtDT(h.d)}</td><td>${esc(h.dest)}</td><td>${h.chiffre ? '🔒 chiffrée' : 'non chiffrée'}</td><td class="small mut">${esc(userName(h.par))}</td></tr>`).join('')}</tbody></table></div>` : ''}
      <details class="card"><summary><b>Configurer Dropbox (une seule fois, 5 minutes)</b></summary><ol class="small">
        <li>Va sur <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener">dropbox.com/developers/apps</a> (l'espace développeurs) et clique sur <b>Créer une application</b> <span class="mut">(« Create app »)</span>.</li>
        <li><b>1. Choisissez une API</b> : <b>Accès limité</b> <span class="mut">(« Scoped access »)</span>.<br><b>2. Choisissez le type d'accès</b> : <b>Dossier de l'application</b> <span class="mut">(« App folder »)</span> — l'application n'aura accès qu'à son propre dossier, pas au reste de ton Dropbox.<br><b>3. Nommez votre application</b> : par exemple <i>SNETAA-OT-sauvegardes</i>, coche l'acceptation des conditions puis <b>Créer l'application</b>.</li>
        <li>Onglet <b>Autorisations</b> <span class="mut">(« Permissions »)</span> : coche <code>files.metadata.read</code>, <code>files.content.write</code> et <code>files.content.read</code>, puis clique sur <b>Envoyer</b> <span class="mut">(« Submit »)</span> en bas de page.</li>
        <li>Onglet <b>Paramètres</b> <span class="mut">(« Settings »)</span>, rubrique <b>OAuth 2</b> :<br>– dans <b>URI de redirection</b> <span class="mut">(« Redirect URIs »)</span>, colle exactement <code>${esc(Sauv.adresseEnLigne())}</code> puis clique sur <b>Ajouter</b> <span class="mut">(« Add »)</span> ;<br>– vérifie que <b>Autoriser les clients publics</b> <span class="mut">(« Allow public clients (Implicit Grant &amp; PKCE) »)</span> est sur <b>Autoriser</b> <span class="mut">(« Allow »)</span>.</li>
        <li>Toujours dans <b>Paramètres</b>, copie la <b>Clé de l'application</b> <span class="mut">(« App key »)</span> — pas le « secret » — colle-la ci-dessus, puis clique sur « Connecter mon Dropbox ».</li></ol>
        ${location.protocol === 'file:' ? `<div class="alert small"><b>Important :</b> Dropbox refuse les adresses du type <code>file:///C:/…</code>. La connexion à Dropbox doit se faire depuis la <b>version en ligne</b> de l'application : <a href="${esc(Sauv.adresseEnLigne())}" target="_blank" rel="noopener">${esc(Sauv.adresseEnLigne())}</a>. Les données de la version locale et de la version en ligne sont séparées : fais d'abord une sauvegarde ici, puis « Restaurer une sauvegarde » dans la version en ligne, et utilise désormais celle-ci (installable avec son icône).</div>` : ''}
        <div class="f"><label>Nom donné à l'application Dropbox (pour l'affichage)</label><input value="${esc(D.meta.dropboxApp || '')}" onchange="D.meta.dropboxApp=this.value.trim();save()"></div></details>`;
    Sauv.majDossier();
  },

  /* ---------- Téléchargement ---------- */
  async telecharger() {
    const pass = await Sauv.motDePasse(false); if (pass == null) return;
    download(Sauv.nomFichier(), await Sauv.contenu(pass), 'application/json'); Sauv.fin('Téléchargement', !!pass);
  },

  /* ---------- Dossier choisi (Chrome / Edge) ---------- */
  async majDossier() { const h = await Store.get('dossierSauvegarde'); Sauv._dosNom = h && h.name; const e = $('#sv_dos'); if (e) e.textContent = Sauv._dosNom || 'non choisi'; },
  async choisirDossier() {
    try {
      const h = await window.showDirectoryPicker({ id: 'snetaa-sauvegardes', mode: 'readwrite' });
      await Store.set('dossierSauvegarde', h); Sauv._dosNom = h.name;
      if (/dropbox|onedrive|google ?drive|icloud|nextcloud|pcloud/i.test(h.name)) D.meta.dossierCloud = true;
      save(); App.route();
    } catch (e) { if (e.name !== 'AbortError') UI.toast('Choix impossible : ' + e.message, 'r'); }
  },
  async versDossier() {
    let h = await Store.get('dossierSauvegarde');
    if (!h) { await Sauv.choisirDossier(); h = await Store.get('dossierSauvegarde'); if (!h) return; }
    try { if ((await h.queryPermission({ mode: 'readwrite' })) !== 'granted' && (await h.requestPermission({ mode: 'readwrite' })) !== 'granted') return UI.toast('Accès au dossier refusé', 'r'); }
    catch (e) { return UI.toast('Dossier inaccessible : choisis-le à nouveau', 'r'); }
    const cloud = !!D.meta.dossierCloud;
    const pass = await Sauv.motDePasse(cloud); if (pass == null) return;
    const nom = Sauv.nomFichier();
    const f = await h.getFileHandle(nom, { create: true }); const w = await f.createWritable(); await w.write(await Sauv.contenu(pass)); await w.close();
    UI.toast('Sauvegarde enregistrée dans « ' + h.name + ' »', 'g'); Sauv.fin('Dossier « ' + h.name + ' »' + (cloud ? ' (synchronisé)' : ''), !!pass);
  },

  /* ---------- Dropbox (OAuth PKCE, application à dossier dédié) ---------- */
  dbxEtat() { let t = null; try { t = JSON.parse(localStorage.getItem('snetaa-dbx') || 'null'); } catch (e) { } return { cle: D && D.meta.dropboxCle, connecte: !!(t && t.refresh), jeton: t }; },
  adresseEnLigne() { return /^https?:/.test(location.protocol) ? location.origin + location.pathname : 'https://karaaahhhhhhhhhh.github.io/snetaa-ot/'; },
  redirect() { return location.origin + location.pathname; },
  b64url(buf) { return Crypto.b64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  async dbxConnecter() {
    const v = Sauv.b64url(crypto.getRandomValues(new Uint8Array(48)));
    const ch = Sauv.b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)));
    sessionStorage.setItem('snetaa-dbx-verif', v);
    location.href = `https://www.dropbox.com/oauth2/authorize?client_id=${encodeURIComponent(D.meta.dropboxCle)}&response_type=code&code_challenge=${ch}&code_challenge_method=S256&token_access_type=offline&redirect_uri=${encodeURIComponent(Sauv.redirect())}`;
  },
  /* appelée au démarrage : retour de Dropbox avec ?code=… */
  async retourOAuth() {
    const q = new URLSearchParams(location.search); const code = q.get('code'), v = sessionStorage.getItem('snetaa-dbx-verif');
    if (!code || !v || !D.meta.dropboxCle) return;
    history.replaceState(null, '', Sauv.redirect() + '#/sauvegarde'); sessionStorage.removeItem('snetaa-dbx-verif');
    try {
      const r = await fetch('https://api.dropboxapi.com/oauth2/token', { method: 'POST', body: new URLSearchParams({ code, grant_type: 'authorization_code', client_id: D.meta.dropboxCle, redirect_uri: Sauv.redirect(), code_verifier: v }) });
      const j = await r.json(); if (!j.refresh_token) throw new Error(j.error_description || 'refus de Dropbox');
      localStorage.setItem('snetaa-dbx', JSON.stringify({ refresh: j.refresh_token, access: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 }));
      setTimeout(() => UI.toast('Dropbox connecté', 'g'), 500);
    } catch (e) { setTimeout(() => UI.toast('Connexion Dropbox impossible : ' + e.message, 'r'), 500); }
  },
  dbxDeconnecter() { localStorage.removeItem('snetaa-dbx'); App.route(); },
  async jeton() {
    const t = Sauv.dbxEtat().jeton; if (!t) throw new Error('Dropbox non connecté');
    if (t.access && t.exp > Date.now()) return t.access;
    const r = await fetch('https://api.dropboxapi.com/oauth2/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: t.refresh, client_id: D.meta.dropboxCle }) });
    const j = await r.json(); if (!j.access_token) throw new Error('reconnexion à Dropbox nécessaire');
    t.access = j.access_token; t.exp = Date.now() + (j.expires_in - 60) * 1000; localStorage.setItem('snetaa-dbx', JSON.stringify(t)); return t.access;
  },
  async versDropbox() {
    const pass = await Sauv.motDePasse(true, 'Sauvegarde Dropbox — mot de passe obligatoire'); if (!pass) return;
    try {
      UI.toast('Envoi vers Dropbox…');
      const r = await fetch('https://content.dropboxapi.com/2/files/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + await Sauv.jeton(), 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': JSON.stringify({ path: '/' + Sauv.nomFichier(), mode: 'add', autorename: true }) }, body: await Sauv.contenu(pass) });
      if (!r.ok) throw new Error('réponse ' + r.status);
      UI.toast('Sauvegarde chiffrée envoyée sur Dropbox', 'g'); Sauv.fin('Dropbox', true);
    } catch (e) { UI.toast('Échec de l\'envoi : ' + e.message, 'r'); }
  },
  async restaurerDropbox() {
    try {
      const r = await fetch('https://api.dropboxapi.com/2/files/list_folder', { method: 'POST', headers: { Authorization: 'Bearer ' + await Sauv.jeton(), 'Content-Type': 'application/json' }, body: JSON.stringify({ path: '' }) });
      const j = await r.json(); const l = (j.entries || []).filter(e => e['.tag'] === 'file' && /\.snetaa$/.test(e.name)).sort((a, b) => a.server_modified < b.server_modified ? 1 : -1);
      UI.modal('Restaurer depuis Dropbox', l.length ? `<div class="tablewrap" style="max-height:50vh"><table><tbody>${l.slice(0, 40).map(e => `<tr><td>${esc(e.name)}</td><td class="small">${fmtDT(e.server_modified)}</td><td><button class="btn sm red" onclick="UI.close();Sauv._restaurerDbx(${JSON.stringify(e.path_lower).replace(/"/g, '&quot;')})">Restaurer</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="mut">Aucune sauvegarde sur Dropbox.</p>', [{ label: 'Fermer' }], { wide: true });
    } catch (e) { UI.toast('Dropbox : ' + e.message, 'r'); }
  },
  async _restaurerDbx(path) {
    try {
      const r = await fetch('https://content.dropboxapi.com/2/files/download', { method: 'POST', headers: { Authorization: 'Bearer ' + await Sauv.jeton(), 'Dropbox-API-Arg': JSON.stringify({ path }) } });
      const txt = await r.text(); await Params.restaurerTexte(txt);
    } catch (e) { UI.toast('Restauration impossible : ' + e.message, 'r'); }
  }
};
App.routes.sauvegarde = () => Sauv.page();
