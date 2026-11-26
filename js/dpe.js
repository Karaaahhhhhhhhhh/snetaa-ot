/* =========================================================
   Rectorat d'Orléans-Tours : organigramme de la DPE
   (division des personnels enseignants, d'éducation et psychologues)
   Données importées depuis un fichier Excel ; jamais incluses dans le code.
   ========================================================= */
'use strict';
const Dpe = {
  q: '', disc: '', nom: '', serv: '', tab: 'dpe', oq: '',
  PREFIXE: '02 38 79', ADRESSE: 'Rectorat — 21 rue Saint-Étienne, 45043 Orléans Cedex 1', STANDARD: '02 38 79 38 79',
  COLS: { service: ['service', 'bureau gestion'], bureau: ['bureau'], role: ['role', 'fonction'], codes: ['codes', 'code'], disciplines: ['disciplines', 'missions', 'discipline'], lettres: ['lettres', 'alphabet'], noms: ['nom', 'gestionnaire'], poste: ['poste', 'telephone'], mail: ['mail', 'courriel', 'adresse electronique'], porte: ['porte'], remarque: ['remarque', 'note'] },
  lignes() { return (D.dpe && D.dpe.lignes) || []; },
  org() { return (D.dpe && D.dpe.org) || []; },
  prefixe() { return (D.dpe && D.dpe.prefixe) || Dpe.PREFIXE; },
  async setPrefixe() { const v = await UI.prompt('Numéro direct', 'Début des numéros directs (suivi des 4 chiffres du poste) :', Dpe.prefixe()); if (v == null) return; D.dpe = Object.assign({ lignes: [], org: [] }, D.dpe || {}); D.dpe.prefixe = v.trim() || Dpe.PREFIXE; save(); log('Préfixe des postes du rectorat', D.dpe.prefixe); App.route(); },
  async importer() {
    const f = await pickFile('.xlsx,.xls,.ods'); if (!f) return;
    let sheets; try { sheets = await readSheetFile(f); } catch (e) { return UI.toast('Fichier illisible', 'r'); }
    const nDpe = Object.keys(sheets).find(n => /^dpe/.test(norm(n))), nOrg = Object.keys(sheets).find(n => /organigramme/.test(norm(n)) && /rectorat/.test(norm(n)));
    if (!nDpe && !nOrg) return UI.toast('Onglets « Rectorat organigramme » et « DPE rectorat » introuvables dans ce fichier', 'r');
    D.dpe = Object.assign({ lignes: [], org: [] }, D.dpe || {}); const lus = [];
    if (nDpe) { const l = Natl.lireFeuille(sheets[nDpe], Dpe.COLS).filter(o => o.noms || o.mail || o.poste); if (l.length) { D.dpe.lignes = l; lus.push('DPE : ' + l.length + ' lignes'); } }
    if (nOrg) { const l = Natl.lireFeuille(sheets[nOrg], { pole: ['pole'], service: ['service', 'division'], fonction: ['fonction'], noms: ['nom'], remarque: ['remarque', 'note'] }).filter(o => o.noms || o.fonction); if (l.length) { D.dpe.org = l; lus.push('organigramme : ' + l.length + ' lignes'); } }
    D.dpe.maj = { date: nowISO(), fichier: f.name }; save(); log('Organigramme du rectorat importé', lus.join(', '));
    UI.toast('Importé — ' + lus.join(', '), 'g'); App.route();
  },
  tel(poste) {
    const p = String(poste || '').replace(',', '.').trim(); if (!p) return '';
    const m = p.match(/^(\d{2})\.(\d{2})$/); const num = m ? `${Dpe.prefixe()} ${m[1]} ${m[2]}` : p;
    return `<a href="tel:${esc(phoneIntl(num.replace(/\s/g, '')))}">☎ ${esc(num)}</a>${m ? ` <span class="mut">(poste ${esc(p)})</span>` : ''}`;
  },
  mails(m) { return String(m || '').split(/[;,\s]+/).filter(x => /@/.test(x)).map(x => `<a href="mailto:${esc(x.toLowerCase())}">${esc(x.toLowerCase())}</a>`).join('<br>'); },
  /* plage alphabétique « A à GAL », « PEY à Z » */
  plageOk(lettres, nom) {
    const m = norm(lettres).toUpperCase().match(/^([A-Z]+)\s*A\s*([A-Z]+)$/); if (!m || !nom) return true;
    const n = norm(nom).toUpperCase().replace(/[^A-Z]/g, '');
    return n.slice(0, m[1].length) >= m[1] && n.slice(0, m[2].length) <= m[2];
  },
  trouver() {
    const d = norm(Dpe.disc), n = Dpe.nom.trim();
    if (!d) return [];
    return Dpe.lignes().filter(o => (o.disciplines || o.codes) && (norm(o.disciplines + ' ' + o.codes).includes(d)) && (!Dpe.serv || o.service === Dpe.serv) && Dpe.plageOk(o.lettres, n));
  },
  ligneHTML(o) {
    return `<tr><td class="small">${esc(o.codes || '')}</td><td>${esc(o.disciplines || o.role || '')}${o.lettres ? ` <span class="tag">${esc(o.lettres)}</span>` : ''}</td><td><b>${esc(o.noms || '')}</b>${/section|chef|responsable|direction|adjoint/i.test(o.role || '') ? `<div class="small mut">${esc(o.role)}</div>` : ''}</td><td class="small nowrap">${Dpe.tel(o.poste)}</td><td class="small">${Dpe.mails(o.mail)}</td><td class="small">${esc(o.porte || '')}${o.remarque ? '<div class="mut">' + esc(o.remarque) + '</div>' : ''}</td></tr>`;
  },
  page() {
    const L_ = Dpe.lignes(), ed = can('adm.params');
    let h = `<div class="pagehead"><div><h1>Rectorat & DPE</h1><div class="mut small">${esc(Dpe.ADRESSE)} — standard <a href="tel:+33238793879">${Dpe.STANDARD}</a>. ${D.dpe && D.dpe.maj ? 'Importé le ' + fmtDate(D.dpe.maj.date) + ' (' + esc(D.dpe.maj.fichier) + ').' : ''}</div></div>
      <div class="actions">${ed ? '<button class="btn sec" onclick="Dpe.importer()">⇪ Importer / mettre à jour (Excel)</button>' : ''}</div></div>`;
    if (!L_.length && !Dpe.org().length) { $('#main').innerHTML = h + `<div class="card"><p>Organigramme pas encore importé.${ed ? ' Importe le fichier Excel (onglets « Rectorat organigramme » et « DPE rectorat »).' : ' Il arrivera avec la prochaine mise à jour envoyée par le secrétaire académique.'}</p></div>`; return; }
    h += UI.tabs('dpetabs', [['dpe', 'DPE : qui gère qui ?'], ['org', 'Organigramme du rectorat']], Dpe.tab, '(k=>{Dpe.tab=k;Dpe.page()})');
    if (Dpe.tab === 'org') { $('#main').innerHTML = h + Dpe.pageOrg(); return; }
    const services = Array.from(new Set(L_.map(o => o.service).filter(Boolean)));
    const discs = Array.from(new Set(L_.flatMap(o => String(o.disciplines || '').split(/,|;|\+| - | et /).map(x => x.trim()).filter(x => x.length > 2 && !/^d[ée]partement|^r[ée]f[ée]rent|^mouvement|^actes|^attestation/i.test(x))))).sort((a, b) => a.localeCompare(b, 'fr'));
    const res = Dpe.trouver();
    h += `<div class="card"><h3 style="margin-top:0">Qui gère ce collègue ?</h3><div class="toolbar">
      <input list="dpe_discs" placeholder="Discipline (ex. Mathématiques, CPE, P4100…)" value="${esc(Dpe.disc)}" onchange="Dpe.disc=this.value;Dpe.page()" style="flex:1;min-width:200px"><datalist id="dpe_discs">${discs.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
      <input placeholder="Nom de famille" value="${esc(Dpe.nom)}" onchange="Dpe.nom=this.value;Dpe.page()" style="max-width:180px">
      <select onchange="Dpe.serv=this.value;Dpe.page()">${UI.opts(services, Dpe.serv, 'Public, privé et contractuels')}</select></div>
      ${Dpe.disc ? (res.length ? `<div class="tablewrap"><table><thead><tr><th>Code</th><th>Discipline</th><th>Gestionnaire</th><th>Téléphone</th><th>Mail</th><th>Porte</th></tr></thead><tbody>${res.map(o => Dpe.ligneHTML(Object.assign({}, o, { disciplines: (o.service ? o.service + ' — ' : '') + o.disciplines }))).join('')}</tbody></table></div>` : '<p class="small mut">Aucun gestionnaire trouvé : essaie un autre mot (« lettres », « physique »…).</p>') : '<p class="small mut">Choisis la discipline (et le nom pour les disciplines partagées par ordre alphabétique) : le gestionnaire s\'affiche avec son poste direct.</p>'}
      <p class="small mut">Postes : numéro direct ${esc(Dpe.prefixe())} + les 4 chiffres du poste${ed ? ' (<a href="#" onclick="Dpe.setPrefixe();return false">modifier</a>)' : ''}. Établissements : la DPE 3 se joint aussi par ITOP (ARENA › Support et assistance).</p></div>
      <div class="card noprint"><input type="search" placeholder="Rechercher dans tout l'organigramme (nom, discipline, code, bureau…)" value="${esc(Dpe.q)}" oninput="Dpe.q=this.value;clearTimeout(Dpe._t);Dpe._t=setTimeout(()=>{Dpe.page();const i=document.querySelector('#dpeq');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},300)" id="dpeq" style="width:100%"></div>`;
    const q = norm(Dpe.q), l = L_.filter(o => !q || norm(Object.values(o).join(' ')).includes(q));
    const grp = []; l.forEach(o => { const k = (o.service || '') + '|' + (o.bureau || ''); let g = grp.find(x => x.k === k); if (!g) grp.push(g = { k, service: o.service, bureau: o.bureau, l: [] }); g.l.push(o); });
    h += grp.map(g => `<div class="card"><h3 style="margin-top:0">${esc(g.service || '')}${g.bureau ? ' <span class="mut" style="font-weight:normal">— ' + esc(g.bureau) + '</span>' : ''}</h3>
      <div class="tablewrap"><table><thead><tr><th>Code</th><th>Discipline / mission</th><th>Nom</th><th>Téléphone</th><th>Mail</th><th>Porte</th></tr></thead><tbody>${g.l.map(Dpe.ligneHTML).join('')}</tbody></table></div></div>`).join('') || '<p class="mut">Aucun résultat.</p>';
    $('#main').innerHTML = h;
  }
};
Dpe.pageOrg = function () {
  const q = norm(Dpe.oq), l = Dpe.org().filter(o => !q || norm(Object.values(o).join(' ')).includes(q));
  const poles = []; l.forEach(o => { let p = poles.find(x => x.pole === o.pole); if (!p) poles.push(p = { pole: o.pole, s: [] }); let s = p.s.find(x => x.service === o.service); if (!s) p.s.push(s = { service: o.service, l: [], rem: o.remarque }); s.l.push(o); });
  return `<div class="card noprint"><input type="search" id="orgq" placeholder="Rechercher (service, sigle, nom : DAJ, examens, DSDEN Cher, médecin…)" value="${esc(Dpe.oq)}" oninput="Dpe.oq=this.value;clearTimeout(Dpe._t);Dpe._t=setTimeout(()=>{Dpe.page();const i=document.querySelector('#orgq');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},300)" style="width:100%">
    <p class="small mut">Standard du rectorat <a href="tel:+33238793879">${Dpe.STANDARD}</a> · <a href="mailto:ce.rectorat@ac-orleans-tours.fr">ce.rectorat@ac-orleans-tours.fr</a> · adresses des agents : prenom.nom@ac-orleans-tours.fr (à vérifier dans l'annuaire académique).</p></div>
    ${poles.map(p => `<div class="card"><h3 style="margin-top:0;color:#601080">${esc(p.pole)}</h3>${p.s.map(s => `<div style="margin:.5rem 0"><b>${esc(s.service)}</b>${s.rem ? ' <span class="small mut">— ' + Natl.telLien(s.rem) + '</span>' : ''}<div class="tablewrap"><table><tbody>${s.l.map(o => `<tr><td class="small" style="width:55%">${esc(o.fonction)}</td><td><b>${esc(o.noms)}</b></td></tr>`).join('')}</tbody></table></div></div>`).join('')}</div>`).join('') || '<p class="mut">Aucun résultat.</p>'}`;
};
App.routes['rectorat-dpe'] = () => Dpe.page();
