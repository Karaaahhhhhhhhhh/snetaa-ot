/* =========================================================
   Communication : mails et SMS types, envois
   ========================================================= */
'use strict';
const Comm = {
  VARS: [['prenom', 'Prénom'], ['nom', 'Nom'], ['civilite', 'Civilité'], ['etablissement', 'Établissement'], ['discipline', 'Discipline'], ['militant', 'Militant référent'], ['militant_tel', 'Tél. du militant'], ['date_debut', 'Début du vote'], ['date_fin', 'Fin du vote'], ['jours_restants', 'Jours restants'], ['periode', 'Période de cotisation'], ['tel_syndicat', 'Tél. syndicat'], ['mail_syndicat', 'Mail syndicat'], ['signature', 'Signature'], ['bloc_maj', 'Bloc « vos informations »'], ['delegue', 'Délégué S1 de l\'établissement'], ['delegue_tel', 'Tél. du délégué S1'], ['montant_cotisation', 'Montant de cotisation'], ['cout_reel', 'Coût après crédit d\'impôt'], ['bulletin_adhesion', 'Lien du bulletin d\'adhésion'], ['publications', 'Publications épinglées']],
  defaultModeles() {
    const m = (id, canal, cat, nom, objet, corps) => ({ id, canal, cat, nom, objet, corps });
    return [
      m('vote-importance', 'mail', 'elections', 'Élections : pourquoi voter FO', '[SNETAA-FO] Élections professionnelles du {date_debut} au {date_fin} : votre voix compte',
        `Bonjour {prenom},\n\nDu {date_debut} au {date_fin}, nous voterons pour élire nos représentants dans les instances qui pèsent sur nos carrières : mutations, avancement, conditions de travail, défense des collègues.\n\nCes élections déterminent la représentativité de chaque organisation syndicale, et donc sa capacité à vous défendre et à se faire entendre face au ministère et au rectorat.\n\nVoter pour les listes Force Ouvrière (FNEC FP-FO et SNETAA-FO), c'est soutenir un syndicat libre et indépendant, qui défend la voie professionnelle, le statut des PLP et chaque collègue qui en a besoin.\n\nLe vote est électronique : pensez à vérifier dès maintenant que vous avez accès à votre espace électeur. En cas de difficulté, nous pouvons vous aider.\n\nN'hésitez pas à nous écrire (de préférence par mail à {mail_syndicat}) en indiquant vos nom, prénom, discipline, établissement et numéro de téléphone : nous vous rappellerons.\n\nBien syndicalement,\n\n{signature}`),
      m('vote-aide', 'mail', 'elections', 'Le SNETAA-FO peut vous aider', '[SNETAA-FO] Une question, une difficulté ? Nous sommes là',
        `Bonjour {prenom},\n\nMutation, carrière, rendez-vous de carrière, conflit, santé, temps partiel, retraite… Le SNETAA-FO accompagne chaque collègue qui le sollicite, adhérent ou non.\n\nPour nous joindre : écrivez-nous de préférence par mail à {mail_syndicat} en indiquant vos nom, prénom, discipline, établissement et numéro de téléphone. Nous vous rappellerons rapidement.\n\nEn cas d'urgence : {tel_syndicat}.\n\nEt du {date_debut} au {date_fin}, pour que nous puissions continuer à vous défendre : votez et faites voter Force Ouvrière !\n\nBien syndicalement,\n\n{signature}`),
      m('vote-ouvert', 'mail', 'elections', 'Le vote est ouvert', '[SNETAA-FO] Le vote est ouvert jusqu\'au {date_fin}',
        `Bonjour {prenom},\n\nLe vote électronique des élections professionnelles est ouvert jusqu'au {date_fin}. Cela ne prend que quelques minutes depuis votre espace électeur.\n\nIdentifiants perdus, difficulté de connexion ? Contactez-nous, nous vous aidons.\n\nVotez et faites voter FNEC FP-FO et SNETAA-FO !\n\nBien syndicalement,\n\n{signature}`),
      m('relance-vote', 'mail', 'elections', 'Relance : il reste quelques jours', '[SNETAA-FO] Plus que {jours_restants} jour(s) pour voter',
        `Bonjour {prenom},\n\nLe vote se termine le {date_fin}. Si vous ne l'avez pas encore fait, il est encore temps : chaque voix compte pour que Force Ouvrière continue de vous représenter et de vous défendre.\n\nBesoin d'aide pour voter (identifiants, connexion) ? Répondez simplement à ce mail ou appelez {militant} au {militant_tel}.\n\nBien syndicalement,\n\n{signature}`),
      m('sms-vote', 'sms', 'elections', 'SMS : votez FO', '', `Élections pro du {date_debut} au {date_fin} : chaque voix compte. Votez FNEC FP-FO et SNETAA-FO ! Besoin d'aide pour voter ? {militant} {militant_tel}`),
      m('sms-ouvert', 'sms', 'elections', 'SMS : vote ouvert', '', `{prenom}, le vote est ouvert jusqu'au {date_fin}. Votez FO ! Un souci de connexion ? Appelez-moi : {militant} {militant_tel}`),
      m('sms-relance', 'sms', 'elections', 'SMS : relance non votant', '', `{prenom}, plus que {jours_restants} jour(s) pour voter aux élections pro. Votre voix compte : votez FO ! Aide : {militant_tel}`),
      m('adhesion', 'mail', 'adhesion', 'Invitation à adhérer', '[SNETAA-FO] Rejoignez le SNETAA-FO',
        `Bonjour {prenom},\n\nLe SNETAA-FO défend les personnels de la voie professionnelle : PLP, contractuels, CPE, AED, AESH, DDFPT… Mutations, carrière, conditions de travail, conflits : nous accompagnons chaque collègue qui nous sollicite.\n\nAdhérer, c'est donner au syndicat les moyens de rester libre et indépendant, et de peser face au ministère et au rectorat. 66 % de la cotisation sont remboursés sous forme de crédit d'impôt.\n\nPour adhérer : {bulletin_adhesion}\n\nUne question ? Écrivez-nous à {mail_syndicat} en indiquant vos nom, prénom, discipline, établissement et numéro de téléphone : nous vous rappellerons.\n\nBien syndicalement,\n\n{signature}`),
      m('sms-adhesion', 'sms', 'adhesion', 'SMS : invitation à adhérer', '', `{prenom}, rejoignez le SNETAA-FO, le syndicat de la voie pro ! Adhésion : {bulletin_adhesion} (66 % remboursés en crédit d'impôt). {militant} {militant_tel}`),
      m('relance-cotis', 'mail', 'adhesion', 'Relance de cotisation', '[SNETAA-FO] Renouvellement de votre adhésion {periode}',
        `Bonjour {prenom},\n\nVous faisiez partie des adhérents du SNETAA-FO l'an dernier et nous vous en remercions. Sauf erreur de notre part, votre adhésion pour {periode} n'a pas encore été renouvelée.\n\nAdhérer, c'est donner au syndicat les moyens de rester indépendant et de défendre chaque collègue. Pour rappel, 66 % de la cotisation sont déductibles de l'impôt ou remboursés sous forme de crédit d'impôt.\n\nSi vous avez déjà renouvelé, merci de ne pas tenir compte de ce message et de nous le signaler.\n\nBien syndicalement,\n\n{signature}`),
      m('sms-cotis', 'sms', 'adhesion', 'SMS : relance cotisation', '', `Bonjour {prenom}, votre adhésion SNETAA-FO {periode} n'est pas encore renouvelée. On compte sur vous ! Questions : {mail_syndicat}`),
      m('maj-infos', 'mail', 'adhesion', 'Mise à jour des informations', '[SNETAA-FO] Vos coordonnées sont-elles à jour ?',
        `Bonjour {prenom},\n\nAfin que nous puissions vous informer et vous défendre au mieux, nous mettons à jour notre fichier. Voici les informations dont nous disposons vous concernant.\n\nMerci de répondre simplement à ce mail en corrigeant directement les lignes ci-dessous (sans modifier les lignes « ===== » ni la référence).\n\n{bloc_maj}\n\nCes informations sont réservées à l'usage du SNETAA-FO.\n\nBien syndicalement,\n\n{signature}`)
    ];
  },
  remplir(t, p) {
    const el = D.meta.elections; const mil = D.users.find(u => u.id === (p && p.militant)) || ME;
    const jr = Math.max(0, Math.ceil((new Date(el.fin + 'T23:59') - new Date()) / 86400000));
    const s = D.meta.syndicat;
    const s1 = p && P.uais(p).map(u => Mandats.s1(u)[0]).find(Boolean);
    const v = {
      bulletin_adhesion: (() => { const bu = (typeof Pubs !== "undefined" && Pubs) && Pubs.bulletin(); return bu ? (bu.url || 'le bulletin joint à ce message') : 'sur simple demande à ' + s.mail; })(),
      publications: (typeof Pubs !== "undefined" && Pubs) ? Pubs.epinglees().map(Pubs.ligne).join('\n') : '',
      montant_cotisation: p && Carriere.montant(p) ? fmtEUR(Carriere.montant(p)) : '', cout_reel: p && Carriere.montant(p) ? fmtEUR(Carriere.montant(p) - Carriere.credit(Carriere.montant(p))) : '',
      delegue: s1 ? P.full(s1.p) : (mil ? (mil.prenom + ' ' + mil.nom).trim() : ''), delegue_tel: s1 ? (s1.p.telPortable || s.tel) : ((mil && mil.tel) || s.tel),
      prenom: p ? p.prenom : '', nom: p ? p.nom : '', civilite: p ? (p.civilite === 'M.' ? 'Monsieur' : p.civilite === 'Mme' ? 'Madame' : '') : '',
      etablissement: p ? P.etab(p) : '', discipline: p ? discLabel(p.discipline) : '', militant: mil ? (mil.prenom + ' ' + mil.nom).trim() : '', militant_tel: (mil && mil.tel) || s.tel,
      date_debut: fmtDate(el.debut), date_fin: fmtDate(el.fin), jours_restants: jr, periode: P.periode(p ? p.calendrier : 'scolaire'), tel_syndicat: s.tel, mail_syndicat: s.mail, signature: s.signature, bloc_maj: p ? MajAdh.bloc(p) : ''
    };
    return String(t || '').replace(/\{(\w+)\}/g, (m, k) => v[k] !== undefined ? v[k] : m).replace(/Bonjour ,/g, 'Bonjour,').replace(/^ , /gm, '');
  },
  /* corps du message avec les publications choisies au moment de l'envoi */
  corps(p) {
    const mo = D.modeles.find(m => m.id === Comm.st.mo) || {};
    let t = Comm.remplir(mo.corps, p);
    const pubs = (Comm.st.pubs || []).map(id => Pubs.liste().find(x => x.id === id)).filter(Boolean);
    if (pubs.length) {
      const bloc = (Comm.st.canal === 'sms' ? '\n' : '\n\nÀ lire :\n') + pubs.map(x => Comm.st.canal === 'sms' ? x.titre + ' ' + (x.url || '') : Pubs.ligne(x)).join('\n');
      const i = t.search(/\n\s*Bien (syndicalement|cordialement)/);
      t = i >= 0 ? t.slice(0, i) + bloc + t.slice(i) : t + bloc;
    }
    return t;
  },
  page() {
    const ed = can('com.modeles');
    const cats = Object.assign({}, Comm.CATS); D.modeles.forEach(m => { if (m.cat && !cats[m.cat]) cats[m.cat] = m.cat; });
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Mails & SMS types</h1><div class="mut small">Variables disponibles : ${Comm.VARS.map(v => '<code>{' + v[0] + '}</code>').join(' ')}</div></div><div class="actions">${ed ? `<button class="btn sec" onclick="Comm.importer()">⇪ Importer des modèles</button> <button class="btn sec" onclick="Comm.exporter()">⇩ Exporter</button> <button class="btn" onclick="Comm.edit()">+ Nouveau modèle</button>` : ''}</div></div>
      <div class="alert small">Pour envoyer : sélectionne des personnes dans le <a href="#/votants">cahier de votants</a>, le <a href="#/adherents">fichier adhérents</a> ou la page <a href="#/emargement">Qui a voté ?</a>, puis « Mail / SMS type ».</div>
      ${Object.entries(cats).map(([c, l]) => { const ms = D.modeles.filter(m => (m.cat || 'general') === c); return ms.length ? `<h2>${l}</h2><div class="grid g2">${ms.map(m => `<div class="card"><div style="display:flex;gap:.5rem;align-items:center"><span class="tag ${m.canal === 'sms' ? 'w' : 'v'}">${m.canal === 'sms' ? 'SMS' : 'Mail'}</span><b>${esc(m.nom)}</b>
        <span style="margin-left:auto">${ed ? `<button class="btn sm ghost" onclick="Comm.edit('${m.id}')">Modifier</button><button class="btn sm ghost" onclick="Comm.dupliquer('${m.id}')">Dupliquer</button><button class="btn sm ghost" onclick="Comm.suppr('${m.id}')">✕</button>` : ''}</span></div>
        ${m.objet ? `<div class="small" style="margin:.4rem 0"><b>Objet :</b> ${esc(m.objet)}</div>` : ''}<div class="msg" style="max-height:150px">${esc(m.corps)}</div>${m.canal === 'sms' ? `<div class="small mut">${Comm.remplir(m.corps, null).length} caractères (≈ ${Math.ceil(Comm.remplir(m.corps, null).length / 160)} SMS)</div>` : ''}</div>`).join('')}</div>` : ''; }).join('')}`;
  },
  edit(id) {
    const m = id ? D.modeles.find(x => x.id === id) : { canal: 'mail', cat: 'elections', nom: '', objet: '[SNETAA-FO] ', corps: 'Bonjour {prenom},\n\n\n\nBien syndicalement,\n\n{signature}' };
    UI.modal(id ? 'Modifier le modèle' : 'Nouveau modèle', `<div class="frow"><div class="f"><label>Nom du modèle</label><input id="mo_n" value="${esc(m.nom)}"></div><div class="f"><label>Type</label><select id="mo_c">${UI.opts([['mail', 'Mail'], ['sms', 'SMS']], m.canal)}</select></div><div class="f"><label>Rubrique</label><select id="mo_cat">${UI.opts(Object.entries(Comm.CATS), m.cat)}</select></div></div>
      <div class="f"><label>Objet (mail)</label><input id="mo_o" value="${esc(m.objet || '')}"></div><div class="f"><label>Texte</label><textarea id="mo_t" style="min-height:260px" oninput="document.getElementById('mo_len').textContent=this.value.length+' caractères'">${esc(m.corps)}</textarea><span id="mo_len" class="small mut"></span></div>
      <div class="pill-select">${Comm.VARS.map(v => `<button type="button" onclick="const t=document.getElementById('mo_t');t.setRangeText('{${v[0]}}',t.selectionStart,t.selectionEnd,'end');t.focus()">${esc(v[1])}</button>`).join('')}</div>`,
      [{ label: 'Annuler' }, { label: 'Enregistrer', onClick: md => { Object.assign(m, { nom: md.querySelector('#mo_n').value || 'Sans titre', canal: md.querySelector('#mo_c').value, cat: md.querySelector('#mo_cat').value, objet: md.querySelector('#mo_o').value, corps: md.querySelector('#mo_t').value }); if (!id) { m.id = uid(); D.modeles.push(m); } save(); log('Modèle enregistré', m.nom); App.route(); } }], { wide: true });
  },
  /* ---------- Import / export de modèles ---------- */
  CATS: { elections: 'Élections', adhesion: 'Adhésion & fichier', reunions: 'Réunions & instances', info: 'Information des collègues', militants: 'Messages aux militants', general: 'Général' },
  exporter(ids) {
    const l = D.modeles.filter(m => !ids || ids.includes(m.id)).map(m => ({ id: m.id, canal: m.canal, cat: m.cat, nom: m.nom, objet: m.objet || '', corps: m.corps }));
    download('modeles_SNETAA-FO_' + todayISO() + '.json', JSON.stringify({ type: 'snetaa-modeles', version: 1, date: nowISO(), modeles: l }, null, 2), 'application/json');
  },
  /* lit le format JSON ou le format texte « === MODELE === » */
  lire(txt) {
    txt = String(txt || '').replace(/^\uFEFF/, '').trim();
    if (/^[\[{]/.test(txt)) {
      const o = JSON.parse(txt); const l = Array.isArray(o) ? o : (o.modeles || [o]);
      return l.map(m => ({ id: m.id, canal: m.canal || m.type, cat: m.cat || m.rubrique, nom: m.nom, objet: m.objet, corps: m.corps || m.texte }));
    }
    const l = [];
    txt.split(/^={3,}\s*MOD[EÈ]LE\s*={3,}\s*$/mi).slice(1).forEach(bloc => {
      bloc = bloc.split(/^={3,}\s*FIN\s*={3,}\s*$/mi)[0];
      const i = bloc.search(/^-{3,}\s*$/m); if (i < 0) return;
      const tete = bloc.slice(0, i), corps = bloc.slice(i).replace(/^-{3,}\s*\n?/, '').replace(/\s+$/, '');
      const m = { corps };
      tete.split('\n').forEach(li => { const r = li.match(/^\s*([a-zé]+)\s*:\s*(.*)$/i); if (r) m[norm(r[1]).replace(/ /g, '')] = r[2].trim(); });
      l.push({ id: m.id, canal: m.type || m.canal, cat: m.rubrique || m.cat, nom: m.nom, objet: m.objet, corps });
    });
    return l;
  },
  normaliser(m) {
    const canal = /sms|texto|whats/i.test(m.canal || '') ? 'sms' : 'mail';
    let cat = norm(m.cat || 'general').replace(/ /g, '');
    const alias = { election: 'elections', elections: 'elections', vote: 'elections', adhesion: 'adhesion', adhesions: 'adhesion', cotisation: 'adhesion', reunion: 'reunions', reunions: 'reunions', instance: 'reunions', information: 'info', info: 'info', militant: 'militants', militants: 'militants', general: 'general' };
    cat = alias[cat] || 'general';
    let objet = canal === 'mail' ? String(m.objet || '').trim() : '';
    if (canal === 'mail' && !/^\[SNETAA-FO\]/.test(objet)) objet = '[SNETAA-FO] ' + objet;
    const id = String(m.id || norm(m.nom || 'modele').replace(/ /g, '-')).slice(0, 60);
    return { id, canal, cat, nom: String(m.nom || 'Modèle importé').trim(), objet, corps: String(m.corps || '').replace(/\r\n/g, '\n') };
  },
  inconnues(m) { const ok = new Set(Comm.VARS.map(v => v[0])); return Array.from(new Set(((m.objet || '') + ' ' + m.corps).match(/\{([a-z_]+)\}/g) || [])).map(x => x.slice(1, -1)).filter(x => !ok.has(x)); },
  async importer() {
    const r = await UI.modal('Importer des modèles', `<p class="small">Choisis un fichier de modèles (<code>.json</code> ou <code>.txt</code>) <b>ou</b> colle directement le texte reçu (par exemple préparé par Claude).</p>
      <p><button class="btn sec" onclick="pickFile('.json,.txt').then(f=>f&&readFile(f,'text')).then(t=>{if(t)document.getElementById('im_t').value=t})">Choisir un fichier…</button></p>
      <div class="f"><textarea id="im_t" style="min-height:220px;font-family:monospace;font-size:.8rem" placeholder="=== MODELE ===
nom: …
type: mail
rubrique: elections
objet: [SNETAA-FO] …
---
Bonjour {prenom},
…
=== FIN ==="></textarea></div>`,
      [{ label: 'Annuler', value: null }, { label: 'Analyser', onClick: m => m.querySelector('#im_t').value }], { wide: true });
    if (!r) return;
    let l; try { l = Comm.lire(r).filter(m => m.corps).map(Comm.normaliser); } catch (e) { return UI.toast('Texte illisible : ' + e.message, 'r'); }
    if (!l.length) return UI.toast('Aucun modèle trouvé dans ce texte', 'r');
    Comm._imp = l;
    UI.modal(l.length + ' modèle(s) trouvé(s)', `<div class="tablewrap" style="max-height:55vh"><table><thead><tr><th></th><th>Modèle</th><th>Type</th><th>Rubrique</th><th>Remarques</th></tr></thead><tbody>${l.map((m, i) => {
        const ex = D.modeles.find(x => x.id === m.id); const inc = Comm.inconnues(m); const len = Comm.remplir(m.corps, null).length;
        return `<tr><td><input type="checkbox" class="im_c" data-i="${i}" checked></td><td><b>${esc(m.nom)}</b>${m.objet ? `<div class="small mut">${esc(m.objet)}</div>` : ''}</td><td>${m.canal === 'sms' ? 'SMS' : 'Mail'}</td><td class="small">${esc(Comm.CATS[m.cat])}</td>
          <td class="small">${ex ? '<span class="tag w">remplace « ' + esc(ex.nom) + ' »</span> ' : '<span class="tag ok">nouveau</span> '}${inc.length ? '<span class="tag ko">variables inconnues : ' + esc(inc.join(', ')) + '</span> ' : ''}${m.canal === 'sms' ? len + ' car. (≈ ' + Math.ceil(len / 160) + ' SMS)' : ''}</td></tr>`; }).join('')}</tbody></table></div>
      <label class="chk"><input type="checkbox" id="im_keep"> Garder aussi les anciennes versions (ajouter en copie au lieu de remplacer)</label>`,
      [{ label: 'Annuler', value: null }, { label: 'Importer', onClick: md => {
        const keep = md.querySelector('#im_keep').checked; let n = 0;
        $$('.im_c', md).filter(c => c.checked).forEach(c => { const m = Object.assign({}, Comm._imp[+c.dataset.i]); const i = D.modeles.findIndex(x => x.id === m.id);
          if (i >= 0 && !keep) D.modeles[i] = m; else { if (i >= 0) { m.id = uid(); m.nom += ' (importé)'; } D.modeles.push(m); } n++; });
        save(); log('Modèles importés', n + ' modèle(s)'); UI.toast(n + ' modèle(s) importé(s)', 'g'); App.route(); } }], { wide: true });
  },
  dupliquer(id) { const m = D.modeles.find(x => x.id === id); D.modeles.push(Object.assign({}, m, { id: uid(), nom: m.nom + ' (copie)' })); save(); App.route(); },
  async suppr(id) { if (!await UI.confirm('Supprimer ce modèle ?', 'Supprimer')) return; D.modeles = D.modeles.filter(x => x.id !== id); save(); App.route(); },

  /* ---------- Envoi à une sélection ---------- */
  envoyerSelection(ids, canal, modeleId) {
    const ps = ids.map(P.get).filter(Boolean);
    if (!ps.length) return UI.toast('Aucune personne sélectionnée', 'r');
    let mo = modeleId ? D.modeles.find(m => m.id === modeleId) : null;
    if (!canal) canal = mo ? mo.canal : 'mail';
    Comm.st = { ps, canal, mo: mo && mo.canal === canal ? mo.id : (D.modeles.find(m => m.canal === canal) || {}).id };
    Comm.renderEnvoi();
  },
  renderEnvoi() {
    const st = Comm.st, ps = st.ps, mo = D.modeles.find(m => m.id === st.mo) || { objet: '', corps: '' };
    const avecMail = ps.filter(p => p.email && !p.emailInvalide), avecTel = ps.filter(p => p.telPortable || isMobile(p.telFixe));
    const cible = st.canal === 'sms' ? avecTel : avecMail;
    const ex = cible[0] || ps[0];
    const html = `${UI.tabs('cmtab', [['mail', `Mail (${avecMail.length})`], ['sms', `SMS (${avecTel.length})`]], st.canal, '(k=>{Comm.st.canal=k;Comm.st.mo=(D.modeles.find(m=>m.canal===k)||{}).id;Comm.renderEnvoi()})')}
      <div class="frow"><div class="f"><label>Modèle</label><select onchange="Comm.st.mo=this.value;Comm.renderEnvoi()">${UI.opts(D.modeles.filter(m => m.canal === st.canal).map(m => [m.id, m.nom]), st.mo)}</select></div></div>
      <p class="small">${plural(ps.length, 'personne')} sélectionnée(s), <b>${cible.length}</b> joignable(s) par ${st.canal === 'sms' ? 'SMS (portable connu)' : 'mail (adresse valide)'}.${ps.length - cible.length ? ` <span class="mut">${ps.length - cible.length} sans ${st.canal === 'sms' ? 'portable' : 'mail valide'}.</span>` : ''}</p>
      ${Pubs.liste().filter(x => x.url && x.categorie !== 'Bulletin d\'adhésion').length ? `<details ${(st.pubs || []).length ? 'open' : ''}><summary><b>Ajouter des liens vers des publications</b> (${(st.pubs || []).length} choisie(s))</summary><div style="max-height:160px;overflow:auto;margin:.4rem 0">${Pubs.liste().filter(x => x.url && x.categorie !== 'Bulletin d\'adhésion').sort((a, b) => (b.epingle ? 1 : 0) - (a.epingle ? 1 : 0) || ((a.date || '') < (b.date || '') ? 1 : -1)).map(x => `<label class="chk"><input type="checkbox" ${(st.pubs || []).includes(x.id) ? 'checked' : ''} onchange="Comm.st.pubs=Comm.st.pubs||[];this.checked?Comm.st.pubs.push('${x.id}'):Comm.st.pubs.splice(Comm.st.pubs.indexOf('${x.id}'),1);Comm.renderEnvoi()"> ${x.epingle ? '📌 ' : ''}${esc(x.titre)} <span class="small mut">${fmtDate(x.date)}</span></label>`).join('')}</div></details>` : ''}
      <h3>Aperçu pour ${esc(ex ? P.full(ex) : '')}</h3>${mo.objet && st.canal === 'mail' ? `<div class="small"><b>Objet :</b> ${esc(Comm.remplir(mo.objet, ex))}</div>` : ''}<div class="msg">${esc(Comm.corps(ex))}</div>
      <h3>Envoyer</h3>
      ${st.canal === 'mail' ? `<div class="grid g2"><div><b>Un par un (personnalisé)</b><p class="small mut">Ouvre chaque mail prérempli dans ta messagerie.</p><button class="btn sm" onclick="Comm.unParUn()">Voir la liste</button></div>
        <div><b>Publipostage personnalisé</b><p class="small mut">Fichier CSV pour Thunderbird (extension Mail Merge) : destinataire {{Email}}, objet {{Objet}}, corps {{Texte}}.</p><button class="btn sm" onclick="Comm.csv()">Télécharger le CSV</button></div>
        <div><b>Envoi groupé en copie cachée</b><p class="small mut">Un seul mail, sans personnalisation (le prénom est retiré). Par lots de 50 adresses.</p><button class="btn sm" onclick="Comm.cci()">Préparer les lots</button></div>
        <div><b>Copier les adresses</b><p class="small mut">Pour les coller dans ta messagerie.</p><button class="btn sm sec" onclick="copyText(Comm.st.cible.map(p=>p.email).join(', '))">Copier ${cible.length} adresses</button></div></div>`
        : `<div class="grid g2"><div><b>Un par un depuis le téléphone</b><p class="small mut">Sur mobile, chaque bouton ouvre l'application SMS avec le texte personnalisé.</p><button class="btn sm" onclick="Comm.unParUn()">Voir la liste</button></div>
        <div><b>Copier numéros et texte</b><p class="small mut">Pour un envoi groupé depuis ton téléphone ou un service d'envoi de SMS.</p><button class="btn sm sec" onclick="copyText(Comm.st.cible.map(p=>p.telPortable||p.telFixe).join(', '))">Copier les numéros</button> <button class="btn sm sec" onclick="Comm.csv()">CSV personnalisé</button></div></div>`}`;
    Comm.st.cible = cible;
    UI.modal('Envoyer un ' + (st.canal === 'sms' ? 'SMS' : 'mail') + ' type', html, [{ label: 'Fermer' }, { label: '✓ Noter l\'envoi dans les fiches', onClick: () => { Comm.noter(); } }], { wide: true, nofocus: true });
  },
  lien(p) {
    const mo = D.modeles.find(m => m.id === Comm.st.mo) || {};
    if (Comm.st.canal === 'sms') { const t = phoneIntl(p.telPortable || p.telFixe); return 'sms:' + t + (/iPhone|iPad|Mac/.test(navigator.userAgent) ? '&' : '?') + 'body=' + encodeURIComponent(Comm.corps(p)); }
    return mailto(p.email, Comm.remplir(mo.objet, p), Comm.corps(p));
  },
  unParUn() {
    const l = Comm.st.cible;
    UI.modal('Envoi un par un', `<div class="tablewrap" style="max-height:60vh"><table><tbody>${l.map((p, i) => `<tr><td><b>${esc(P.full(p))}</b><div class="small mut">${esc(Comm.st.canal === 'sms' ? (p.telPortable || p.telFixe) : p.email)}</div></td><td class="right"><a class="btn sm" href="${esc(Comm.lien(p))}" target="_blank" rel="noopener" onclick="Comm.noter(['${p.id}']);this.textContent='✓ envoyé';this.classList.add('ok')">${Comm.st.canal === 'sms' ? 'SMS' : 'Mail'}</a></td></tr>`).join('')}</tbody></table></div>`, [{ label: 'Fermer' }], { wide: true });
  },
  csv() {
    const mo = D.modeles.find(m => m.id === Comm.st.mo) || {};
    exportCSV((Comm.st.canal === 'sms' ? 'sms_' : 'publipostage_') + todayISO() + '.csv', Comm.st.cible.map(p => Comm.st.canal === 'sms' ? { Telephone: phoneIntl(p.telPortable || p.telFixe), Prenom: p.prenom, Nom: p.nom, Texte: Comm.corps(p) } : { Email: p.email, Prenom: p.prenom, Nom: p.nom, Objet: Comm.remplir(mo.objet, p), Texte: Comm.corps(p) }), ',');
  },
  cci() {
    const mo = D.modeles.find(m => m.id === Comm.st.mo) || {}; const l = Comm.st.cible.map(p => p.email);
    const neutre = t => Comm.remplir(t, null).replace(/Bonjour\s*,/g, 'Bonjour,').replace(/\{\w+\}/g, '');
    const lots = []; for (let i = 0; i < l.length; i += 50) lots.push(l.slice(i, i + 50));
    UI.modal('Envoi groupé (copie cachée)', `<p class="small">Le mail est adressé à toi-même (${esc(D.meta.syndicat.mail)}) avec les destinataires en copie cachée.</p>${lots.map((lot, i) => `<p><a class="btn sm" target="_blank" rel="noopener" href="${esc(mailto(D.meta.syndicat.mail, neutre(mo.objet), neutre(Comm.corps(null)), '', lot.join(',')))}">Lot ${i + 1} (${lot.length} adresses)</a> <button class="btn sm sec" onclick="copyText(${JSON.stringify(lot.join(', ')).replace(/"/g, '&quot;')})">Copier les adresses</button></p>`).join('')}`, [{ label: 'Fermer' }]);
  },
  noter(ids) {
    const mo = D.modeles.find(m => m.id === Comm.st.mo) || {}; const l = ids ? ids.map(P.get) : Comm.st.cible;
    l.forEach(p => {
      p.messages.push({ id: uid(), canal: Comm.st.canal, sens: 'envoye', date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), de: Comm.st.canal === 'sms' ? (p.telPortable || p.telFixe) : p.email, objet: 'Modèle : ' + (mo.nom || ''), contenu: Comm.corps(p), par: ME.id });
      if (mo.cat === 'elections') p.vote.contacts.push({ id: uid(), date: todayISO(), canal: Comm.st.canal, resultat: (Comm.st.canal === 'sms' ? 'SMS' : 'Mail') + ' type envoyé : ' + mo.nom, par: ME.id });
      P.touch(p);
    });
    log('Envoi ' + Comm.st.canal, (mo.nom || '') + ' → ' + plural(l.length, 'personne'));
    if (!ids) UI.toast('Envoi noté dans ' + plural(l.length, 'fiche'), 'g');
  }
};
App.routes.modeles = () => Comm.page();
