/* =========================================================
   Import de tableurs : association des colonnes (Mapper),
   import et assainissement du fichier adhérents
   ========================================================= */
'use strict';
const Mapper = {
  /* opts: {titre, fields:[[k,label,[synonymes]]], profil, keepExtra, intro, onDone(rows, info)} */
  async open(opts, file) {
    let files = file ? [].concat(file) : await pickFile('.xlsx,.xls,.ods,.csv,.txt,.xml', !!opts.multiple);
    files = [].concat(files || []).filter(Boolean);
    if (!files.length) return;
    file = files[0];
    let sheets; const others = [];
    try { sheets = await readSheetFile(file); for (const f of files.slice(1)) others.push({ name: f.name, sheets: await readSheetFile(f) }); } catch (e) { return UI.toast('Lecture impossible : ' + e.message, 'r'); }
    const names = Object.keys(sheets).filter(n => sheets[n].length);
    if (!names.length) return UI.toast('Fichier vide', 'r');
    const st = { opts, file, others, sheets, sheet: names.sort((a, b) => sheets[b].length - sheets[a].length)[0], hdr: 0, map: {} };
    Mapper.st = st; st.noms = files.map(f => f.name).join(' + '); Mapper.autoHeader(); Mapper.autoMap(); Mapper.render();
  },
  autoHeader() {
    const rows = Mapper.st.sheets[Mapper.st.sheet];
    let best = 0, bestN = 0;
    rows.slice(0, 20).forEach((r, i) => { const n = r.filter(v => String(v).trim() && isNaN(+v)).length; if (n > bestN) { bestN = n; best = i; } });
    Mapper.st.hdr = best;
  },
  headers() { const st = Mapper.st; return (st.sheets[st.sheet][st.hdr] || []).map((h, i) => String(h).trim() || 'Colonne ' + (i + 1)); },
  autoMap() {
    const st = Mapper.st, hs = Mapper.headers().map(norm), map = {}, used = new Set();
    const saved = D.meta.mappings[st.opts.profil];
    if (saved) Object.entries(saved).forEach(([k, h]) => { const i = hs.indexOf(norm(h)); if (i >= 0 && !used.has(i)) { map[k] = i; used.add(i); } });
    const fields = st.opts.fields.filter(f => map[f[0]] === undefined);
    // passe 1 : égalité exacte ; passe 2 : inclusion (synonymes les plus longs d'abord)
    for (const pass of [1, 2]) {
      const cand = []; fields.forEach(f => (f[2] || [f[1]]).concat([f[1]]).forEach(s => cand.push([f[0], norm(s)])));
      cand.sort((a, b) => b[1].length - a[1].length);
      cand.forEach(([k, s]) => {
        if (map[k] !== undefined) return;
        const i = hs.findIndex((h, j) => !used.has(j) && (pass === 1 ? h === s : (s.length > 2 && (' ' + h + ' ').includes(' ' + s + ' '))));
        if (i >= 0) { map[k] = i; used.add(i); }
      });
    }
    st.map = map;
  },
  render() {
    const st = Mapper.st, hs = Mapper.headers(), rows = st.sheets[st.sheet];
    const data = rows.slice(st.hdr + 1).filter(r => r.some(v => String(v).trim()));
    const sample = i => data.slice(0, 3).map(r => String(r[i] == null ? '' : r[i]).slice(0, 30)).filter(Boolean).join(' · ');
    const html = `${st.opts.intro ? `<div class="alert">${st.opts.intro}</div>` : ''}<div class="frow"><div class="f"><label>Fichier</label><input value="${esc(st.file.name)}" disabled></div>
      <div class="f"><label>Feuille</label><select onchange="Mapper.st.sheet=this.value;Mapper.autoHeader();Mapper.autoMap();Mapper.render()">${UI.opts(Object.keys(st.sheets), st.sheet)}</select></div>
      <div class="f"><label>Ligne des titres</label><select onchange="Mapper.st.hdr=+this.value;Mapper.autoMap();Mapper.render()">${rows.slice(0, 20).map((r, i) => `<option value="${i}" ${i === st.hdr ? 'selected' : ''}>Ligne ${i + 1} : ${esc(r.filter(Boolean).slice(0, 4).join(' | ').slice(0, 60))}</option>`).join('')}</select></div></div>
      ${st.others.length ? `<div class="alert small">${st.others.length + 1} fichiers : ${esc([st.file.name, ...st.others.map(o => o.name)].join(' + '))}. Les colonnes des fichiers suivants sont reprises par leur titre.</div>` : ''}
      <p class="small mut">${plural(data.length, 'ligne')} de données. Vérifie l'association de chaque information avec une colonne du fichier (détectée automatiquement, elle sera mémorisée pour les prochains imports).</p>
      <div class="tablewrap" style="max-height:52vh"><table><thead><tr><th>Information</th><th>Colonne du fichier</th><th>Exemples</th></tr></thead><tbody>
      ${st.opts.fields.map(([k, l]) => `<tr><td>${esc(l)}</td><td><select onchange="Mapper.setMap('${k}',this.value)">${'<option value="">— ignorer —</option>' + hs.map((h, i) => `<option value="${i}" ${st.map[k] === i ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></td><td class="small mut">${st.map[k] !== undefined ? esc(sample(st.map[k])) : ''}</td></tr>`).join('')}
      </tbody></table></div>${st.opts.keepExtra ? `<p class="small mut">Les colonnes non associées (${hs.length - Object.keys(st.map).length}) seront conservées dans l'onglet « Fichier national » de chaque fiche.</p>` : ''}`;
    UI.modal(st.opts.titre || 'Import', html, [{ label: 'Annuler' }, { label: 'Continuer →', onClick: () => Mapper.finish() }], { wide: true, nofocus: true });
  },
  setMap(k, v) { const st = Mapper.st; if (v === '') delete st.map[k]; else { Object.keys(st.map).forEach(x => { if (st.map[x] === +v) delete st.map[x]; }); st.map[k] = +v; } Mapper.render(); },
  finish() {
    const st = Mapper.st, hs = Mapper.headers();
    D.meta.mappings[st.opts.profil] = Object.fromEntries(Object.entries(st.map).map(([k, i]) => [k, hs[i]])); save();
    const SECRET = /^(login|identifiant de connexion|mdp|mot de passe|password|passwd|pwd)$/;
    const conv = (rowsIn, hdr, map, hs2, fname) => {
      const used = new Set(Object.values(map));
      return rowsIn.slice(hdr + 1).filter(r => r.some(v => String(v).trim())).map((r, n) => {
        const o = { _ligne: (fname ? fname + ' ' : '') + (hdr + n + 2) };
        Object.entries(map).forEach(([k, i]) => o[k] = typeof r[i] === 'string' ? r[i].trim() : r[i]);
        if (st.opts.keepExtra) { o._extra = {}; hs2.forEach((h, i) => { if (!used.has(i) && !SECRET.test(norm(h)) && String(r[i] == null ? '' : r[i]).trim()) o._extra[h] = r[i]; }); }
        return o;
      });
    };
    let rows = conv(st.sheets[st.sheet], st.hdr, st.map, hs, '');
    const byName = Object.fromEntries(Object.entries(st.map).map(([k, i]) => [k, norm(hs[i])]));
    st.others.forEach(o => {
      for (const [n, sr] of Object.entries(o.sheets)) {
        const hi = sr.slice(0, 20).findIndex(r => Object.values(byName).every(h => r.some(v => norm(v) === h)));
        if (hi < 0) continue;
        const hs2 = sr[hi].map((h, i) => String(h).trim() || 'Colonne ' + (i + 1));
        const map2 = {}; Object.entries(byName).forEach(([k, h]) => map2[k] = hs2.findIndex(x => norm(x) === h));
        rows = rows.concat(conv(sr, hi, map2, hs2, o.name)); return;
      }
      UI.toast('Colonnes différentes, fichier ignoré : ' + o.name, 'r');
    });
    setTimeout(() => st.opts.onDone(rows, { fichier: st.noms || st.file.name, feuille: st.sheet, champs: Object.keys(st.map) }), 30);
  }
};

/* ---------- Import du fichier adhérents ---------- */
const Import = {
  FIELDS: [
    ['numAdherent', 'N° adhérent', ['num', 'n adherent', 'numero adherent', 'num adherent', 'no adherent', 'n° adherent', 'matricule', 'code adherent', 'id adherent', 'identifiant']],
    ['civilite', 'Civilité', ['civil', 'civilite', 'titre', 'sexe', 'genre']],
    ['nom', 'Nom (d\'usage)', ['nom', 'nom usage', 'nom d usage', 'nom usuel', 'nom marital']],
    ['prenom', 'Prénom', ['prenom', 'prenoms']],
    ['nomNaissance', 'Nom de naissance', ['nom jeune fille', 'nom de naissance', 'nom naissance', 'nom patronymique', 'nom de jeune fille']],
    ['dateNaissance', 'Date de naissance', ['date de naissance', 'date naissance', 'ne le', 'nee le', 'naissance', 'ddn', 'date naiss']],
    ['email', 'Courriel personnel', ['email', 'e mail', 'mail', 'courriel', 'adresse mail', 'adresse electronique', 'mail perso', 'courriel personnel', 'adresse email']],
    ['emailPro', 'Courriel académique', ['mail academique', 'courriel academique', 'mail pro', 'email pro', 'adresse academique', 'courriel professionnel']],
    ['telPortable', 'Téléphone portable', ['portable', 'mobile', 'tel portable', 'telephone portable', 'gsm', 'tel mobile', 'telephone mobile']],
    ['telFixe', 'Téléphone fixe', ['telephone', 'tel', 'tel fixe', 'telephone fixe', 'fixe', 'telephone domicile', 'tel domicile']],
    ['adresse', 'Adresse', ['adresse', 'adresse 1', 'adresse1', 'rue', 'voie', 'adresse postale', 'adresse personnelle']],
    ['adresse2', 'Complément d\'adresse', ['adresse 2', 'adresse2', 'complement adresse', 'complement d adresse', 'complement']],
    ['adresse3', 'Complément d\'adresse 2', ['adresse 3', 'adresse3']],
    ['cp', 'Code postal', ['cp', 'code postal', 'postal', 'c p']],
    ['ville', 'Ville', ['ville', 'commune', 'localite', 'bureau distributeur']],
    ['statut', 'Statut / corps / fonction', ['statut', 'corps', 'fonction', 'qualite', 'categorie', 'situation']],
    ['classe', 'Classe / grade (normale, hors classe, exceptionnelle)', ['grade', 'classe', 'classe grade']],
    ['echelon', 'Échelon', ['a echelon', 'echelon', 'ech']],
    ['indice', 'Indice majoré', ['indice majore', 'indice', 'inm', 'indice remuneration']],
    ['datePromo', 'Date d\'accès à l\'échelon (promotion)', ['date promo', 'date promotion', 'date echelon', 'date d effet echelon']],
    ['discipline', 'Discipline ou code discipline', ['code discipline', 'discipline', 'specialite', 'matiere', 'disc', 'code disc']],
    ['etabUAI', 'UAI / RNE établissement', ['uai', 'rne', 'code etablissement', 'code etab', 'code uai', 'numero uai', 'code rne']],
    ['typeEtab', 'Type d\'établissement (LP, SEP, RRR = retraité…)', ['type', 'type etab', 'type etablissement', 'nature']],
    ['etabNom', 'Établissement', ['etablissement', 'etab', 'lieu d exercice', 'affectation', 'lycee', 'nom etablissement', 'etablissement d affectation']],
    ['etabVille', 'Ville de l\'établissement', ['ville etablissement', 'commune etablissement', 'ville etab', 'commune etab']],
    ['academie', 'Académie', ['academie', 'acad', 'section academique', 'section']],
    ['datePremiereAdhesion', 'Date de première adhésion', ['date premiere adhesion', 'date d adhesion', 'date adhesion', 'premiere adhesion', 'adherent depuis', 'date entree', 'date 1ere adhesion']],
    ['derniereCotisation', 'Exercice / dernière année de cotisation', ['exercice', 'derniere cotisation', 'annee de cotisation', 'annee cotisation', 'periode', 'annee adhesion', 'saison', 'annee']],
    ['datePaiement', 'Date de paiement de la cotisation', ['date paiement', 'date de paiement', 'date reglement', 'date de reglement', 'date cotisation', 'date encaissement']],
    ['montant', 'Montant de la cotisation', ['cotisation', 'montant', 'montant cotisation', 'somme', 'montant regle']],
    ['aJourNat', 'À jour (selon le national)', ['a jour', 'ajour', 'a jour cotisation']],
    ['situationNat', 'Situation (radiation, retour PTT, décès…)', ['rptt', 'motif', 'motif sortie', 'situation fichier']],
    ['retraite', 'Retraité (oui / non)', ['retraite', 'retraitee', 'en retraite', 'actif retraite', 'position', 'situation administrative']],
    ['calendrier', 'Type d\'adhésion (civil / scolaire)', ['calendrier', 'type adhesion', 'type d adhesion', 'annee civile']]
  ],
  page() {
    const h = D.imports.slice().reverse();
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Import & assainissement du fichier adhérents</h1><div class="mut small">À faire à chaque nouveau fichier reçu (toutes les 1 à 2 semaines).</div></div></div>
      <div class="card"><p><b>Format conseillé : Excel (.xlsx)</b>. CSV et ODS acceptés aussi.</p>
      <ol class="small"><li>Choisir le fichier reçu.</li><li>Vérifier l'association des colonnes (mémorisée d'une fois sur l'autre).</li><li>L'application nettoie les données (majuscules, mails, téléphones, dates, doublons…) et les compare au fichier de l'application.</li>
      <li>Tu choisis ce que tu acceptes. <b>Tes corrections faites dans l'application ne sont jamais écrasées</b> : elles alimentent le récapitulatif pour le national.</li></ol>
      <p class="small"><b>Plusieurs fichiers d'un coup :</b> sélectionne-les ensemble (ex. « Fichier_Adresses » + « Fichier_Adresses_FO ») pour qu'ils soient traités comme un seul fichier. Les identifiants et mots de passe éventuellement présents (colonnes login / mdp) ne sont jamais importés.</p>
      <button class="btn" onclick="Import.lancer()">⇪ Importer le(s) fichier(s) adhérents</button></div>
      <h2>Historique des imports</h2><div class="tablewrap"><table><thead><tr><th>Date</th><th>Fichier</th><th class="num">Lignes</th><th class="num">Nouveaux</th><th class="num">Mis à jour</th><th class="num">Corrections locales conservées</th><th class="num">Absents</th><th>Par</th></tr></thead><tbody>
      ${h.map(i => `<tr><td>${fmtDT(i.date)}</td><td>${esc(i.fichier)}</td><td class="num">${i.lignes}</td><td class="num">${i.nouveaux}</td><td class="num">${i.maj}</td><td class="num">${i.conflits}</td><td class="num">${i.absents}</td><td>${esc(userName(i.par))}</td></tr>`).join('') || '<tr><td colspan="8" class="mut">Aucun import</td></tr>'}</tbody></table></div>`;
  },
  lancer(file) {
    Mapper.open({ titre: 'Import du fichier adhérents — colonnes', fields: Import.FIELDS, profil: 'adherents', keepExtra: true, multiple: true, onDone: Import.analyser }, file);
  },
  statutFromText(v, disc) {
    const s = norm(v); if (!s) return '';
    const exact = REF.statuts.find(x => norm(x[0]) === s || norm(x[1]) === s); if (exact) return exact[0];
    const rules = [['retrait', 'RETR'], ['aesh', 'AESH'], ['avs', 'AESH'], ['aed', 'AED'], ['assistant d education', 'AED'], ['surveillant', 'AED'], ['ddfpt', 'DDFPT'], ['chef de travaux', 'DDFPT'], ['directeur delegue', 'DDFPT'],
    ['cpe', 'CPE'], ['conseiller principal', 'CPE'], ['psy', 'PSYEN'], ['documentaliste', 'DOC'], ['proviseur', 'PERDIR'], ['principal', 'PERDIR'], ['direction', 'PERDIR'], ['infirm', 'SANTE'], ['social', 'SANTE'],
    ['administratif', 'ADM'], ['adjaenes', 'ADM'], ['saenes', 'ADM'], ['attache', 'ADM'], ['atrf', 'ADM'], ['contractuel', 'CONTR'], ['maitre auxiliaire', 'CONTR'], ['vacataire', 'CONTR'], ['agreg', 'AGREG'], ['certifi', 'CERT'], ['capes', 'CERT'],
    ['professeur des ecoles', 'PE'], ['instituteur', 'PE'], ['stagiaire', 'PLP_STAG'], ['plp', 'PLP'], ['lycee professionnel', 'PLP'], ['professeur', disc && /^L/.test(disc) ? 'CERT' : 'PLP']];
    const r = rules.find(([k]) => (' ' + s + ' ').includes(k.length <= 3 ? ' ' + k + ' ' : k));
    return r ? r[1] : '';
  },
  discFromText(v, statut) {
    const s = String(v == null ? '' : v).trim(); if (!s) return '';
    let m = s.match(/\b([PLEY])\s?(\d{4})\b/i); if (m) return m[1].toUpperCase() + m[2];
    m = s.match(/^\d{4}$/); if (m) return ((statut && STATUT(statut)[0].match(/CERT|AGREG|DOC/)) ? 'L' : 'P') + s;
    const n = norm(s); const d = D.disciplines.find(d => norm(d[1]) === n || norm(d[1]).replace(/^plp /, '') === n) || D.disciplines.find(d => n.length > 5 && norm(d[1]).includes(n));
    return d ? d[0] : '';
  },
  /* Transforme une ligne importée en « personne » normalisée */
  nettoyer(r, rapport) {
    const o = {};
    o.numAdherent = String(r.numAdherent == null ? '' : r.numAdherent).trim();
    const civ = norm(r.civilite); o.civilite = /^(m|mr|monsieur|h|homme|masculin)$/.test(civ) ? 'M.' : /^(mme|madame|mlle|f|femme|feminin|mademoiselle)$/.test(civ) ? 'Mme' : '';
    o.nom = String(r.nom || '').replace(/\s+/g, ' ').trim().toUpperCase();
    o.prenom = cap(String(r.prenom || '').replace(/\s+/g, ' ').trim());
    o.nomNaissance = String(r.nomNaissance || '').replace(/\s+/g, ' ').trim().toUpperCase();
    if (o.nomNaissance === o.nom) o.nomNaissance = '';
    o.dateNaissance = parseDate(r.dateNaissance);
    o.email = normEmail(r.email);
    if (o.email && !emailOk(o.email)) { const fix = o.email.replace(/[;,](?=[a-z]{2,4}$)/, '.').replace(/\.{2,}/g, '.').replace(/@{2,}/, '@'); if (emailOk(fix)) { rapport.mailsCorriges.push([o.nom + ' ' + o.prenom, o.email, fix]); o.email = fix; } else rapport.mailsSuspects.push([o.nom + ' ' + o.prenom, o.email]); }
    o.emailPro = normEmail(r.emailPro);
    let tp = normPhone(r.telPortable), tf = normPhone(r.telFixe);
    if (!tp && isMobile(tf)) { tp = tf; tf = ''; }
    o.telPortable = tp; o.telFixe = tf;
    [tp, tf].forEach(t => { if (t && !/^0\d( \d{2}){4}$/.test(t)) rapport.telsSuspects.push([o.nom + ' ' + o.prenom, t]); });
    o.adresse = [r.adresse, r.adresse2, r.adresse3].map(x => String(x || '').replace(/\s+/g, ' ').trim()).filter(Boolean).join(', ');
    o.cp = normCP(r.cp); o.ville = String(r.ville || '').replace(/\s+/g, ' ').trim().toUpperCase();
    o.statut = Import.statutFromText(r.statut, r.discipline);
    o.discipline = Import.discFromText(r.discipline, o.statut);
    o.classe = Carriere.classeFromText(r.classe) || Carriere.classeFromText(r.statut);
    o.echelon = Carriere.echelonFromText(r.echelon);
    o.indice = String(r.indice == null ? '' : r.indice).replace(/\.0$/, '').replace(/\D/g, '');
    o.datePromo = parseDate(r.datePromo);
    const rt = norm(r.retraite);
    if (rt && (/retrait/.test(rt) || /^(oui|o|x|1|vrai|yes)$/.test(rt))) o.statut = 'RETR';
    if (r.statut && !o.statut) rapport.statutsInconnus.add(String(r.statut));
    if (r.discipline && !o.discipline) rapport.disciplinesInconnues.add(String(r.discipline));
    // codes du fichier national : « 0180000% » = département seulement, « 041RRRR% » = retraité
    const code = String(r.etabUAI == null ? '' : r.etabUAI).trim().toUpperCase();
    const typ = String(r.typeEtab == null ? '' : r.typeEtab).trim().toUpperCase();
    if (/R{3}/.test(code) || typ === 'RRR') o.statut = 'RETR';
    if (/%|R{3}/.test(code)) { o.departement = (code.match(/^0?(\d{2})/) || [])[1] || ''; r.etabUAI = ''; }
    o.typeEtab = /^[A-Z]{2,6}$/.test(typ) && typ !== 'RRR' ? typ : '';
    o.aJourNat = String(r.aJourNat == null ? '' : r.aJourNat).trim().toUpperCase();
    o.situationNat = String(r.situationNat == null ? '' : r.situationNat).trim().toUpperCase();
    o.etabUAI = r.etabUAI ? normUAI(r.etabUAI) : '';
    o.etabNom = String(r.etabNom || '').replace(/\s+/g, ' ').trim();
    if (!o.etabUAI) { const m = o.etabNom.match(/\b(\d{7}[A-Z])\b/i); if (m) o.etabUAI = m[1].toUpperCase(); }
    const e = o.etabUAI && D.etablissements.find(x => x.uai === o.etabUAI);
    if (e && !o.etabNom) o.etabNom = e.nom;
    o.etabVille = String(r.etabVille || (e && e.ville) || '').trim().toUpperCase();
    o.academie = r.academie ? (REF.academies.find(a => norm(a) === norm(r.academie)) || String(r.academie).trim()) : '';
    o.calendrier = /civil|janv|1 1|01 01/.test(norm(r.calendrier)) ? 'civil' : (r.calendrier ? 'scolaire' : '');
    o.datePremiereAdhesion = parseDate(r.datePremiereAdhesion);
    let calc = o.calendrier || 'scolaire';
    const dc = String(r.derniereCotisation == null ? '' : r.derniereCotisation).trim().replace(/\.0$/, '');
    if (/^\d{4}$/.test(dc)) { o.calendrier = 'civil'; r.derniereCotisation = dc; } // année seule = adhésion janvier-décembre (ex-FO)
    calc = o.calendrier || calc;
    const per = P.normPeriode(r.derniereCotisation instanceof Date ? dateObjToISO(r.derniereCotisation) : r.derniereCotisation, calc) || (r.datePaiement ? P.periode(calc, parseDate(r.datePaiement)) : '');
    if (per) {
      o._cotis = { periode: per, date: parseDate(r.datePaiement), montant: num(r.montant), source: 'import' };
    }
    o._cotisAll = o._cotis ? [o._cotis] : [];
    o._extra = r._extra || {}; o._ligne = r._ligne;
    if (!o.nom) rapport.sansNom.push(r._ligne);
    return o;
  },
  matcher() {
    const byNum = {}, byKey = {}, byLoose = {};
    D.personnes.forEach(p => {
      if (p.numAdherent) byNum[String(p.numAdherent).trim()] = p;
      byKey[P.key(p)] = p; const k = P.keyLoose(p); (byLoose[k] = byLoose[k] || []).push(p);
      if (p.nomNaissance) { const k2 = norm(p.nomNaissance) + '|' + norm(p.prenom); (byLoose[k2] = byLoose[k2] || []).push(p); }
    });
    return o => {
      if (o.numAdherent && byNum[o.numAdherent]) return [byNum[o.numAdherent], 'n° adhérent'];
      if (o.dateNaissance && byKey[P.key(o)]) return [byKey[P.key(o)], 'nom, prénom, date de naissance'];
      const l = (byLoose[P.keyLoose(o)] || []).filter(p => !o.dateNaissance || !p.dateNaissance || p.dateNaissance === o.dateNaissance);
      if (l.length === 1) return [l[0], 'nom et prénom'];
      if (o.nomNaissance) { const l2 = (byLoose[norm(o.nomNaissance) + '|' + norm(o.prenom)] || []).filter(p => !o.dateNaissance || !p.dateNaissance || p.dateNaissance === o.dateNaissance); if (l2.length === 1) return [l2[0], 'nom de naissance']; }
      return [null, ''];
    };
  },
  analyser(rows, info) {
    const rapport = { mailsCorriges: [], mailsSuspects: [], telsSuspects: [], statutsInconnus: new Set(), disciplinesInconnues: new Set(), sansNom: [], doublons: [] };
    let list = rows.map(r => Import.nettoyer(r, rapport)).filter(o => o.nom);
    // doublons dans le fichier : on fusionne (on garde la cotisation la plus récente)
    const seen = {};
    list = list.filter(o => {
      const k = o.numAdherent || P.key(o);
      if (seen[k]) {
        const a = seen[k]; rapport.doublons.push([o.nom + ' ' + o.prenom, a._ligne, o._ligne]);
        o._cotisAll.forEach(c => { if (!a._cotisAll.some(x => x.periode === c.periode)) a._cotisAll.push(c); });
        if (o._cotis && (!a._cotis || P.periodeFin(o._cotis.periode) > P.periodeFin(a._cotis.periode))) { a._cotis = o._cotis; if (o.calendrier) a.calendrier = o.calendrier; }
        Object.keys(o).forEach(f => { if (!a[f] && o[f]) a[f] = o[f]; });
        return false;
      }
      seen[k] = o; return true;
    });
    const match = Import.matcher();
    const res = { info, rapport, nouveaux: [], maj: [], conflits: [], cotis: [], absents: [], lignes: rows.length, liste: list };
    const matched = new Set();
    list.forEach(o => {
      const [p, how] = match(o);
      o._match = p ? p.id : null; o._how = how;
      if (!p) { res.nouveaux.push(o); return; }
      matched.add(p.id);
      Adh.FIELDS.forEach(([f, l]) => {
        const iv = o[f]; if (iv === undefined || iv === '' || iv === null) return;
        const lv = Adh.val(p, f);
        if (Adh.same(lv, iv)) return;
        const ch = { pid: p.id, f, l, local: lv, imp: iv, on: true };
        if (p.localEdits[f] && lv) { ch.on = false; res.conflits.push(ch); } else res.maj.push(ch);
      });
      o._cotisAll.forEach(c => { if (!p.cotisations.some(x => x.periode === c.periode)) res.cotis.push({ pid: p.id, c }); });
    });
    res.absents = D.personnes.filter(p => p.categorie === 'adherent' && !p.archive && !matched.has(p.id) && !p.ajoutManuel && (p.academie || D.meta.syndicat.academie) === D.meta.syndicat.academie);
    Import.res = res; Import.onglet = 'resume'; Import.renderRes();
  },
  onglet: 'resume',
  renderRes() {
    const r = Import.res, R = r.rapport;
    const nAno = R.mailsCorriges.length + R.mailsSuspects.length + R.telsSuspects.length + R.statutsInconnus.size + R.disciplinesInconnues.size + R.doublons.length + R.sansNom.length;
    const tabs = [['resume', 'Résumé'], ['nouveaux', `Nouveaux (${r.nouveaux.length})`], ['maj', `Mises à jour (${r.maj.length})`], ['conflits', `Tes corrections (${r.conflits.length})`], ['absents', `Absents du fichier (${r.absents.length})`], ['ano', `Assainissement (${nAno})`]];
    let b = '';
    const pn = id => esc(P.full(P.get(id)));
    if (Import.onglet === 'resume') b = `<div class="tiles"><div class="tile"><div class="n">${r.lignes}</div><div class="l">lignes lues</div></div><div class="tile g"><div class="n">${r.nouveaux.length}</div><div class="l">nouvelles fiches</div></div><div class="tile"><div class="n">${new Set(r.maj.map(c => c.pid)).size}</div><div class="l">fiches mises à jour</div></div><div class="tile o"><div class="n">${r.cotis.length}</div><div class="l">nouvelles cotisations</div></div><div class="tile v"><div class="n">${r.conflits.length}</div><div class="l">corrections locales conservées</div></div><div class="tile b"><div class="n">${r.absents.length}</div><div class="l">fiches absentes du fichier</div></div></div>
      <div class="alert">Les <b>corrections locales</b> sont des informations que tu as modifiées dans l'application et qui diffèrent du fichier national : elles sont conservées par défaut et figureront dans le récapitulatif à envoyer au national.</div>
      <div class="frow"><label class="chk"><input type="checkbox" id="im_new" ${Import._optNew !== false ? 'checked' : ''} onchange="Import._optNew=this.checked"> Créer les nouvelles fiches</label>
      <label class="chk"><input type="checkbox" id="im_cot" ${Import._optCot !== false ? 'checked' : ''} onchange="Import._optCot=this.checked"> Ajouter les cotisations</label>
      <div class="f"><label>Fiches absentes du fichier</label><select id="im_abs" onchange="Import._optAbs=this.value">${UI.opts([['rien', 'Ne rien faire'], ['marquer', 'Les marquer « absent du dernier fichier »'], ['archiver', 'Les archiver']], Import._optAbs || 'marquer')}</select></div></div>`;
    else if (Import.onglet === 'nouveaux') b = `<div class="tablewrap" style="max-height:55vh"><table><thead><tr><th>Ligne</th><th>Nom</th><th>Statut</th><th>Discipline</th><th>Établissement</th><th>Cotisation</th><th>Mail</th></tr></thead><tbody>${r.nouveaux.slice(0, 800).map(o => `<tr><td>${o._ligne}</td><td><b>${esc(o.nom + ' ' + o.prenom)}</b></td><td>${esc(STATUT(o.statut)[0])}</td><td>${esc(o.discipline)}</td><td>${esc(o.etabNom || o.etabUAI)}</td><td>${esc(o._cotis ? o._cotis.periode : '')}</td><td>${esc(o.email)}</td></tr>`).join('')}</tbody></table></div>`;
    else if (Import.onglet === 'maj' || Import.onglet === 'conflits') {
      const l = r[Import.onglet];
      b = `<p class="small">${Import.onglet === 'maj' ? 'Valeurs du fichier qui remplaceront celles de l\'application (décoche pour garder la valeur actuelle).' : 'Valeurs que tu as corrigées dans l\'application. Coche pour accepter quand même la valeur du fichier national.'}
        <button class="btn sm sec" onclick="Import.res.${Import.onglet}.forEach(c=>c.on=true);Import.renderRes()">Tout cocher</button> <button class="btn sm sec" onclick="Import.res.${Import.onglet}.forEach(c=>c.on=false);Import.renderRes()">Tout décocher</button></p>
        <div class="tablewrap" style="max-height:55vh"><table><thead><tr><th></th><th>Personne</th><th>Champ</th><th>Dans l'application</th><th>Dans le fichier</th></tr></thead><tbody>${l.slice(0, 1500).map((c, i) => `<tr><td><input type="checkbox" ${c.on ? 'checked' : ''} onchange="Import.res.${Import.onglet}[${i}].on=this.checked"></td><td>${pn(c.pid)}</td><td>${esc(c.l)}</td><td>${c.on ? `<span class="diffold">${esc(c.local)}</span>` : `<b>${esc(c.local)}</b>`}</td><td>${c.on ? `<span class="diffnew">${esc(c.imp)}</span>` : `<span class="mut">${esc(c.imp)}</span>`}</td></tr>`).join('')}</tbody></table></div>`;
    } else if (Import.onglet === 'absents') b = `<p class="small">Adhérents présents dans l'application mais absents de ce fichier (départ, radiation, autre académie, ou simple absence du fichier transmis).</p><div class="tablewrap" style="max-height:55vh"><table><tbody>${r.absents.map(p => `<tr><td><b>${esc(P.full(p))}</b></td><td>${esc(P.etab(p))}</td><td>${P.cotisTag(p)}</td></tr>`).join('') || '<tr><td class="mut">Aucun</td></tr>'}</tbody></table></div>`;
    else b = `<p class="small">Ce que l'application a nettoyé ou repéré dans le fichier. Les noms sont mis en majuscules, les prénoms en minuscules accentuées, les mails en minuscules, les téléphones au format 06 12 34 56 78, les dates au format jour/mois/année.</p>
      ${R.doublons.length ? `<h3>Doublons fusionnés (${R.doublons.length})</h3>${R.doublons.map(d => `<div class="small">${esc(d[0])} — lignes ${d[1]} et ${d[2]}</div>`).join('')}` : ''}
      ${R.mailsCorriges.length ? `<h3>Mails corrigés automatiquement (${R.mailsCorriges.length})</h3>${R.mailsCorriges.map(d => `<div class="small">${esc(d[0])} : <span class="diffold">${esc(d[1])}</span> → <span class="diffnew">${esc(d[2])}</span></div>`).join('')}` : ''}
      ${R.mailsSuspects.length ? `<h3>Mails mal formés (${R.mailsSuspects.length})</h3>${R.mailsSuspects.map(d => `<div class="small">${esc(d[0])} : <span class="diffold">${esc(d[1])}</span></div>`).join('')}` : ''}
      ${R.telsSuspects.length ? `<h3>Téléphones douteux (${R.telsSuspects.length})</h3>${R.telsSuspects.slice(0, 200).map(d => `<div class="small">${esc(d[0])} : ${esc(d[1])}</div>`).join('')}` : ''}
      ${R.statutsInconnus.size ? `<h3>Statuts non reconnus</h3><p class="small">${Array.from(R.statutsInconnus).map(esc).join(' · ')}</p><p class="small mut">Ils sont conservés dans l'onglet « Fichier national » de la fiche ; tu pourras corriger le statut à la main.</p>` : ''}
      ${R.disciplinesInconnues.size ? `<h3>Disciplines non reconnues</h3><p class="small">${Array.from(R.disciplinesInconnues).map(esc).join(' · ')}</p><p class="small mut">Ajoute les codes manquants dans Paramètres → Disciplines puis relance l'import si besoin.</p>` : ''}
      ${R.sansNom.length ? `<h3>Lignes ignorées (sans nom)</h3><p class="small">${R.sansNom.join(', ')}</p>` : ''}`;
    UI.modal('Import : ' + r.info.fichier, UI.tabs('imtabs', tabs, Import.onglet, '(k=>{Import.onglet=k;Import.renderRes()})') + b, [{ label: 'Annuler' }, { label: 'Exporter le fichier assaini (Excel)', onClick: () => { Import.exportAssaini(); return false; } }, { label: '✓ Appliquer l\'import', cls: 'ok', onClick: () => Import.appliquer() }], { wide: true, nofocus: true });
  },
  exportAssaini() {
    exportXLSX('fichier_adherents_assaini_' + todayISO() + '.xlsx', {
      Assaini: Import.res.liste.map(o => ({ 'N° adhérent': o.numAdherent, Civilité: o.civilite, Nom: o.nom, Prénom: o.prenom, 'Nom de naissance': o.nomNaissance, 'Date de naissance': fmtDate(o.dateNaissance), Courriel: o.email, 'Courriel académique': o.emailPro, Portable: o.telPortable, Fixe: o.telFixe, Adresse: o.adresse, CP: o.cp, Ville: o.ville, Statut: STATUT(o.statut)[1], 'Code discipline': o.discipline, Discipline: discLabel(o.discipline), UAI: o.etabUAI, Établissement: o.etabNom, Académie: o.academie, 'Première adhésion': fmtDate(o.datePremiereAdhesion), 'Cotisation': o._cotis ? o._cotis.periode : '' }))
    });
  },
  setVal(p, f, v) {
    if (f === 'etabUAI' || f === 'etabNom') {
      let a = p.affectations.find(x => x.principal) || p.affectations[0];
      if (!a) { a = { uai: '', nom: '', ville: '', principal: true }; p.affectations.push(a); }
      if (f === 'etabUAI') { a.uai = v; const e = D.etablissements.find(x => x.uai === v); if (e) { a.nom = a.nom || e.nom; a.ville = a.ville || e.ville; } } else a.nom = v;
    } else p[f] = v;
  },
  appliquer() {
    const r = Import.res; const optNew = Import._optNew !== false, optCot = Import._optCot !== false, optAbs = Import._optAbs || 'marquer';
    const snap = { date: nowISO(), fichier: r.info.fichier, records: {} };
    let nNew = 0;
    // fiches existantes
    [...r.maj, ...r.conflits].forEach(c => {
      const p = P.get(c.pid); if (!c.on) return;
      Import.setVal(p, c.f, c.imp); delete p.localEdits[c.f]; delete p.signale[c.f];
      if (c.f === 'email' && p.emailInvalide && p.emailInvalide.email !== c.imp) p.emailInvalide = null;
    });
    r.liste.forEach(o => {
      let p = o._match && P.get(o._match);
      if (!p) {
        if (!optNew) return;
        p = P.nouveau({ categorie: 'adherent', source: 'import' });
        Adh.FIELDS.forEach(([f]) => { if (o[f]) Import.setVal(p, f, o[f]); });
        if (o.etabVille && p.affectations[0]) p.affectations[0].ville = o.etabVille;
        if (o.etabUAI && p.affectations[0] && !p.affectations[0].ville) { const e = D.etablissements.find(x => x.uai === o.etabUAI); if (e) { p.affectations[0].ville = e.ville; if (!p.affectations[0].nom) p.affectations[0].nom = e.nom; } }
        if (!p.calendrier) p.calendrier = 'scolaire';
        D.personnes.push(p); nNew++;
      } else {
        if (p.categorie !== 'adherent') p.categorie = 'adherent';
        if (o.etabVille) { const a = p.affectations.find(x => x.principal); if (a && !a.ville) a.ville = o.etabVille; }
        p.absentImport = null; if (p.archive && p.archive !== 'manuel') p.archive = null;
        if (o.calendrier) p.calendrier = o.calendrier;
      }
      if (optCot) { o._cotisAll.forEach(c => { if (!p.cotisations.some(x => x.periode === c.periode)) p.cotisations.push(Object.assign({ id: uid() }, c)); }); P.syncCal(p); }
      p.extra = Object.assign({}, p.extra, o._extra || {});
      if (o.departement) p.departement = o.departement;
      if (o.typeEtab) { const a = p.affectations.find(x => x.principal); if (a) a.type = o.typeEtab; }
      if (o.statut === 'RETR' && !p.localEdits.statut) p.statut = 'RETR';
      p.aJourNat = o.aJourNat || ''; p.situationNat = o.situationNat || '';
      if (/PTT/.test(p.situationNat)) p.adresseInvalide = p.adresseInvalide || { date: todayISO(), source: 'national (retour PTT)' };
      if (/DECED/.test(p.situationNat) && !p.archive) p.archive = 'décès';
      // instantané des valeurs du fichier national
      const champs = r.info.champs || []; const rec = {}; Adh.FIELDS.forEach(([f]) => { if (champs.includes(f) || (o[f] !== undefined && o[f] !== '')) rec[f] = String(o[f] == null ? '' : o[f]); }); rec.calendrier = p.calendrier; snap.records[p.id] = rec;
      // les champs identiques au national ne sont plus des « corrections locales »
      Object.keys(p.localEdits).forEach(f => { if (rec[f] !== undefined && Adh.same(rec[f], Adh.val(p, f))) { delete p.localEdits[f]; delete p.signale[f]; } });
      p.majImport = snap.date;
    });
    r.absents.forEach(p => { if (optAbs === 'marquer') p.absentImport = todayISO(); else if (optAbs === 'archiver') p.archive = todayISO(); });
    D.lastSnapshot = snap;
    const nMaj = new Set(r.maj.filter(c => c.on).map(c => c.pid)).size;
    D.imports.push({ id: uid(), date: snap.date, fichier: r.info.fichier, lignes: r.lignes, nouveaux: optNew ? nNew : 0, maj: nMaj, conflits: r.conflits.filter(c => !c.on).length, absents: r.absents.length, par: ME.id });
    log('Import fichier adhérents', `${r.info.fichier} : ${nNew} nouveaux, ${nMaj} mis à jour`);
    save(); UI.toast('Import terminé', 'g'); App.refresh();
  }
};
App.routes.import = () => Import.page();
