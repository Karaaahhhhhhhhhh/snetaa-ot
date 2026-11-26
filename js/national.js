/* =========================================================
   SNETAA-FO national : organigramme du siège, référents par sujet,
   bureau national, instances et commissions, annuaire et coordonnées
   (données importées depuis un fichier Excel ; jamais incluses dans le code)
   ========================================================= */
'use strict';
const Natl = {
  tab: 'org', q: '',
  d() { return D.national || { contacts: [], personnes: [], bureau: [], organigramme: [], instances: [], liens: [] }; },
  cle(prenom, nom) { return norm((prenom || '') + ' ' + (nom || '')); },
  nomComplet(x) { return [x.prenom, (x.nom || '').toUpperCase()].filter(Boolean).join(' '); },
  /* ---------- Import ---------- */
  FEUILLES: {
    contacts: [/contacts? du siege/, { service: ['service', 'contact'], tel: ['telephone', 'tel'], mail: ['mail', 'courriel'], horaires: ['horaires'], remarque: ['remarque', 'note'] }],
    organigramme: [/siege national|organigramme (du )?(siege|snetaa|national)/, { pole: ['pole', 'secteur'], sujet: ['sujet', 'domaine', 'referent'], prenom: ['prenom'], nom: ['nom'], fonction: ['fonction', 'qualite'] }],
    bureau: [/bureau national/, { college: ['titulaire', 'college'], titre: ['au titre'], prenom: ['prenom'], nom: ['nom'], mandat: ['mandat'], academie: ['academie'] }],
    instances: [/instances?|commissions?/, { instance: ['instance', 'commission'], qualite: ['qualite', 'college', 'role'], prenom: ['prenom'], nom: ['nom'], remarque: ['remarque', 'note'] }],
    personnes: [/coordonnees/, { prenom: ['prenom'], nom: ['nom'], academie: ['academie'], auSiege: ['bureau au siege', 'au siege', 'siege'], telSiege: ['telephone au siege', 'tel au siege', 'telephone siege'], mailSiege: ['mail au siege', 'courriel au siege', 'mail siege'], tel: ['telephone', 'tel'], mail: ['mail', 'courriel'], remarque: ['remarque', 'note'] }],
    liens: [/liens?/, { titre: ['titre', 'lien', 'libelle'], url: ['url', 'adresse', 'site'], remarque: ['remarque', 'note'] }]
  },
  lireFeuille(rows, cols) {
    const hi = rows.findIndex(r => r.filter(c => String(c).trim()).length >= 2); if (hi < 0) return [];
    const head = rows[hi].map(c => norm(String(c)));
    const idx = {};
    // les synonymes les plus longs d'abord (« téléphone au siège » avant « téléphone »)
    const ordre = Object.entries(cols).sort((a, b) => Math.max(...b[1].map(x => x.length)) - Math.max(...a[1].map(x => x.length)));
    const pris = new Set();
    ordre.forEach(([k, syn]) => { const i = head.findIndex((h, j) => !pris.has(j) && syn.some(s => h === s || h.startsWith(s))); idx[k] = i; if (i >= 0) pris.add(i); });
    return rows.slice(hi + 1).map(r => { const o = {}; Object.keys(idx).forEach(k => { o[k] = idx[k] >= 0 ? String(r[idx[k]] == null ? '' : r[idx[k]]).trim() : ''; }); return o; }).filter(o => Object.values(o).some(Boolean));
  },
  async importer() {
    const f = await pickFile('.xlsx,.xls,.ods'); if (!f) return;
    let sheets; try { sheets = await readSheetFile(f); } catch (e) { return UI.toast('Fichier illisible', 'r'); }
    const N = Object.assign({ contacts: [], personnes: [], bureau: [], organigramme: [], instances: [], liens: [] }, JSON.parse(JSON.stringify(D.national || {})));
    const lus = [];
    Object.entries(sheets).forEach(([nom, rows]) => {
      const n = norm(nom); if (/rectorat|dpe|^sections?$/.test(n)) return;
      const k = ['contacts', 'personnes', 'liens', 'bureau', 'organigramme', 'instances'].find(k => Natl.FEUILLES[k][0].test(n));
      if (!k) return;
      const l = Natl.lireFeuille(rows, Natl.FEUILLES[k][1]); if (!l.length) return;
      if (k === 'personnes') {
        // les coordonnées saisies dans l'application sont conservées quand la cellule Excel est vide
        l.forEach(o => { o.cle = Natl.cle(o.prenom, o.nom); const x = N.personnes.find(y => y.cle === o.cle); if (x) Object.keys(o).forEach(c => { if (o[c]) x[c] = o[c]; }); else N.personnes.push(o); });
      } else N[k] = l;
      lus.push(`${nom} (${l.length})`);
    });
    if (!lus.length) return UI.toast('Aucun onglet reconnu (Siège national, Bureau national, Instances nationales, Coordonnées national, Contacts du siège, Liens)', 'r');
    N.maj = { date: nowISO(), fichier: f.name }; D.national = N; save(); log('Annuaire national importé', lus.join(', '));
    UI.toast('Importé : ' + lus.join(', '), 'g'); App.route();
  },
  exporter() {
    const N = Natl.d(), P_ = Natl.personnes();
    exportXLSX('SNETAA-FO_national_' + todayISO() + '.xlsx', {
      'Contacts du siège': N.contacts.map(c => ({ Service: c.service, Téléphone: c.tel, Mail: c.mail, Horaires: c.horaires, Remarque: c.remarque })),
      'Siège national': N.organigramme.map(o => ({ Pôle: o.pole, 'Sujet / domaine': o.sujet, Prénom: o.prenom, Nom: o.nom, Fonction: o.fonction })),
      'Bureau national': N.bureau.map(b => ({ 'Titulaire / suppléant': b.college, 'Au titre de': b.titre, Prénom: b.prenom, Nom: b.nom, 'Mandat national': b.mandat, Académie: b.academie })),
      'Instances nationales': N.instances.map(i => ({ Instance: i.instance, Qualité: i.qualite, Prénom: i.prenom, Nom: i.nom, Remarque: i.remarque })),
      'Coordonnées national': P_.map(x => ({ Prénom: x.prenom, Nom: x.nom, Académie: x.academie, 'Bureau au siège (oui/non)': x.auSiege, 'Téléphone au siège': x.telSiege, 'Mail au siège': x.mailSiege, Téléphone: x.tel, Mail: x.mail, Remarque: x.remarque })),
      Liens: N.liens.map(l => ({ Titre: l.titre, URL: l.url, Remarque: l.remarque }))
    });
  },
  /* ---------- Annuaire consolidé : une entrée par personne ---------- */
  personnes() {
    const N = Natl.d(), m = new Map();
    const ajout = (prenom, nom, role, acad) => {
      if (!nom) return; const c = Natl.cle(prenom, nom);
      const x = m.get(c) || { cle: c, prenom, nom, academie: '', roles: [] };
      if (role && !x.roles.includes(role)) x.roles.push(role); if (acad && !x.academie) x.academie = acad; m.set(c, x);
    };
    N.organigramme.forEach(o => ajout(o.prenom, o.nom, [o.fonction, o.pole + (o.sujet ? ' — ' + o.sujet : '')].filter(Boolean).join(', ')));
    N.bureau.forEach(b => ajout(b.prenom, b.nom, `Bureau national (${(b.college || '').toLowerCase()}${b.titre ? ', ' + b.titre.toLowerCase() : ''})${b.mandat ? ' — ' + b.mandat : ''}`, b.academie));
    N.instances.forEach(i => ajout(i.prenom, i.nom, i.instance + (i.qualite ? ' (' + i.qualite + ')' : '')));
    N.personnes.forEach(p => { if (!p.nom) return; ajout(p.prenom, p.nom, '', p.academie); Object.assign(m.get(Natl.cle(p.prenom, p.nom)), Object.fromEntries(Object.entries(p).filter(([k, v]) => v && k !== 'roles'))); });
    return Array.from(m.values()).sort((a, b) => norm(a.nom + a.prenom).localeCompare(norm(b.nom + b.prenom)));
  },
  get(cle) { return Natl.personnes().find(x => x.cle === cle); },
  standard() { const c = Natl.d().contacts; return c.find(x => /standard|siege/i.test(norm(x.service))) || c[0] || { tel: '01 53 58 00 30', mail: 'snetaanat@snetaa.org' }; },
  telLien(t) { return String(t || '').split(/[|;]/).map(x => x.trim()).filter(Boolean).map(x => { const n = (x.match(/[+\d][\d\s.]{7,}/) || [''])[0].replace(/[\s.]/g, ''); return n ? `<a href="tel:${esc(n)}">${esc(x)}</a>` : esc(x); }).join('<br>'); },
  mailLien(m) { return String(m || '').split(/[|;,\s]+/).filter(x => /@/.test(x)).map(x => `<a href="mailto:${esc(x)}">${esc(x)}</a>`).join('<br>'); },
  contact(x) {
    if (!x) return '';
    const st = Natl.standard(), sec = x.academie && typeof Sections !== 'undefined' ? Sections.de(x.academie) : null, out = [];
    if (/^o/i.test(x.auSiege || '')) out.push(`<div><span class="tag ok">bureau au siège</span><br>${Natl.telLien(x.telSiege || st.tel)}${x.mailSiege || st.mail ? '<br>' + Natl.mailLien(x.mailSiege || st.mail) : ''}</div>`);
    const siege = /^o/i.test(x.auSiege || ''), mails = [x.mail, siege ? '' : x.mailSiege].filter(Boolean).join(' ');
    if (x.tel || mails) out.push(`<div>${Natl.telLien(x.tel)}${x.tel && mails ? '<br>' : ''}${Natl.mailLien(mails)}</div>`);
    if (!/^o/i.test(x.auSiege || '')) {
      if (sec) out.push(`<div class="small"><span class="mut">Via sa section (${esc(sec.academie)}) :</span><br>${Natl.telLien(sec.tel)}${sec.mail ? '<br>' + Natl.mailLien(sec.mail) : ''}</div>`);
      else if (!x.tel && !mails) out.push(`<div class="small"><span class="mut">Via le siège :</span><br>${Natl.telLien(st.tel)}<br>${Natl.mailLien(st.mail)}</div>`);
      out.push('<div class="small mut">Présent(e) au siège les jours de bureau national</div>');
    }
    if (x.remarque) out.push(`<div class="small mut">${esc(x.remarque)}</div>`);
    return out.join('');
  },
  carte(cle) { const x = Natl.get(cle); if (!x) return; UI.modal(Natl.nomComplet(x), `<p>${x.academie ? 'Académie : <b>' + esc(x.academie) + '</b><br>' : ''}${x.roles.map(esc).join('<br>')}</p><div class="card">${Natl.contact(x)}</div>`, [{ label: 'Fermer' }, ...(can('adm.params') ? [{ label: 'Modifier les coordonnées', onClick: () => { setTimeout(() => Natl.edit(cle), 30); } }] : [])]); },
  nomLien(prenom, nom) { const c = Natl.cle(prenom, nom); return `<a href="#" onclick="Natl.carte('${esc(c)}');return false"><b>${esc(Natl.nomComplet({ prenom, nom }))}</b></a>`; },
  edit(cle) {
    const x = cle ? Natl.get(cle) : { prenom: '', nom: '', roles: [] }; if (!x) return;
    const v = k => esc(x[k] || '');
    UI.modal(cle ? 'Coordonnées — ' + Natl.nomComplet(x) : 'Ajouter une personne', `${cle ? '' : '<div class="frow"><div class="f"><label>Prénom</label><input id="nx_p"></div><div class="f"><label>Nom</label><input id="nx_n"></div></div>'}
      <div class="frow"><div class="f"><label>Académie</label><select id="nx_a">${UI.opts(REF.academies, x.academie, '—')}</select></div><div class="f"><label>Bureau au siège national ?</label><select id="nx_s">${UI.opts([['oui', 'Oui : bureau et ligne au siège'], ['non', 'Non : vient les jours de bureau national']], /^o/i.test(x.auSiege || '') ? 'oui' : /^n/i.test(x.auSiege || '') ? 'non' : '', 'Je ne sais pas')}</select></div></div>
      <div class="frow"><div class="f"><label>Téléphone direct au siège</label><input id="nx_ts" value="${v('telSiege')}"></div><div class="f"><label>Mail au siège</label><input id="nx_ms" value="${v('mailSiege')}"></div></div>
      <div class="frow"><div class="f"><label>Autre téléphone (portable…)</label><input id="nx_t" value="${v('tel')}"></div><div class="f"><label>Autre mail</label><input id="nx_m" value="${v('mail')}"></div></div>
      <div class="f"><label>Remarque</label><input id="nx_r" value="${v('remarque')}"></div><p class="small mut">Sans coordonnées propres, l'application propose celles de sa section académique, ou à défaut le standard du siège.</p>`,
      [{ label: 'Annuler' }, {
        label: 'Enregistrer', onClick: m => {
          const g = s => (m.querySelector(s) || {}).value.trim();
          const prenom = cle ? x.prenom : g('#nx_p'), nom = cle ? x.nom : g('#nx_n').toUpperCase(); if (!nom) { UI.toast('Nom obligatoire', 'r'); return false; }
          D.national = Object.assign({ contacts: [], personnes: [], bureau: [], organigramme: [], instances: [], liens: [] }, D.national || {});
          const c = Natl.cle(prenom, nom); let p = D.national.personnes.find(y => y.cle === c); if (!p) { p = { cle: c, prenom, nom }; D.national.personnes.push(p); }
          Object.assign(p, { academie: g('#nx_a'), auSiege: g('#nx_s'), telSiege: g('#nx_ts'), mailSiege: g('#nx_ms'), tel: g('#nx_t'), mail: g('#nx_m'), remarque: g('#nx_r') });
          save(); log('Coordonnées national modifiées', prenom + ' ' + nom); App.route();
        }
      }]);
  },
  /* ---------- Page ---------- */
  page() {
    const N = Natl.d(), vide = !N.organigramme.length && !N.bureau.length && !N.instances.length;
    const ed = can('adm.params');
    let h = `<div class="pagehead"><div><h1>SNETAA-FO national</h1><div class="mut small">Organigramme du siège, référents par sujet, bureau national, instances et coordonnées. ${N.maj ? 'Importé le ' + fmtDate(N.maj.date) + ' (' + esc(N.maj.fichier) + ').' : ''}</div></div>
      <div class="actions">${ed ? `<button class="btn sec" onclick="Natl.importer()">⇪ Importer / mettre à jour (Excel)</button>${vide ? '' : '<button class="btn sec" onclick="Natl.exporter()">Exporter (Excel)</button><button class="btn sec" onclick="Natl.edit()">+ Personne</button>'}` : ''}</div></div>`;
    if (vide) { $('#main').innerHTML = h + `<div class="card"><p>Annuaire national pas encore importé.${ed ? ' Importe le fichier Excel (onglets « Contacts du siège », « Siège national », « Bureau national », « Instances nationales », « Coordonnées national », « Liens »).' : ' Il arrivera avec la prochaine mise à jour envoyée par le secrétaire académique.'}</p></div>`; return; }
    const st = Natl.standard();
    h += `<div class="card"><div class="grid g2"><div><b>Siège national</b><br>${N.contacts.map(c => `<div class="small" style="margin:.25rem 0"><b>${esc(c.service)}</b>${c.horaires ? ' <span class="mut">(' + esc(c.horaires) + ')</span>' : ''}<br>${Natl.telLien(c.tel)}${c.tel && c.mail ? ' · ' : ''}${Natl.mailLien(c.mail)}${c.remarque ? '<br><span class="mut">' + esc(c.remarque) + '</span>' : ''}</div>`).join('') || `${Natl.telLien(st.tel)} · ${Natl.mailLien(st.mail)}`}</div>
      <div><input type="search" placeholder="Qui contacter ? (sujet, nom, pôle : retraite, ASH, mutations, contractuels…)" value="${esc(Natl.q)}" oninput="Natl.q=this.value;clearTimeout(Natl._t);Natl._t=setTimeout(()=>{Natl.tab='ref';App.route();const i=document.querySelector('#natq');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},300)" id="natq" style="width:100%">
      ${N.liens.length ? `<div class="small" style="margin-top:.6rem"><b>Liens utiles</b><br>${N.liens.map(l => `<a href="${esc(/^https?:/.test(l.url) ? l.url : 'https://' + l.url)}" target="_blank" rel="noopener">${esc(l.titre || l.url)}</a>${l.remarque ? ' <span class="mut">— ' + esc(l.remarque) + '</span>' : ''}`).join('<br>')}</div>` : ''}</div></div></div>`;
    h += UI.tabs('nattabs', [['org', 'Organigramme du siège'], ['ref', 'Référents par sujet'], ['bn', 'Bureau national'], ['inst', 'Instances & commissions'], ['annu', 'Annuaire & coordonnées']], Natl.tab, '(k=>{Natl.tab=k;App.route()})');
    h += '<div id="nattab">' + (Natl['tab_' + Natl.tab] || Natl.tab_org)(N) + '</div>';
    $('#main').innerHTML = h;
  },
  tab_org(N) {
    const poles = []; N.organigramme.forEach(o => { let g = poles.find(x => x.pole === o.pole); if (!g) poles.push(g = { pole: o.pole, l: [] }); g.l.push(o); });
    return poles.map(g => `<div class="card"><h3 style="margin-top:0;color:#c80030">${esc(g.pole)}</h3>${g.l.map(o => `<div style="margin:.3rem 0">${o.sujet ? '<span class="tag">' + esc(o.sujet) + '</span> ' : ''}${Natl.nomLien(o.prenom, o.nom)} <i class="small">${esc(o.fonction || '')}</i></div>`).join('')}</div>`).join('');
  },
  tab_ref(N) {
    const q = norm(Natl.q);
    const lignes = [...N.organigramme.map(o => ({ sujet: [o.pole, o.sujet].filter(Boolean).join(' — '), prenom: o.prenom, nom: o.nom, fonction: o.fonction })),
      ...N.instances.map(i => ({ sujet: i.instance, prenom: i.prenom, nom: i.nom, fonction: i.qualite }))];
    const l = lignes.filter(x => !q || norm(Object.values(x).join(' ')).includes(q));
    return `<div class="tablewrap"><table><thead><tr><th>Sujet / domaine</th><th>Référent</th><th>Fonction</th><th>Contact</th></tr></thead><tbody>${l.map(x => `<tr><td>${esc(x.sujet)}</td><td>${Natl.nomLien(x.prenom, x.nom)}</td><td class="small">${esc(x.fonction || '')}</td><td class="small">${Natl.contact(Natl.get(Natl.cle(x.prenom, x.nom)))}</td></tr>`).join('') || '<tr><td colspan="4" class="mut">Aucun résultat</td></tr>'}</tbody></table></div>`;
  },
  tab_bn(N) {
    const grp = []; N.bureau.forEach(b => { const k = (b.college || '') + '|' + (b.titre || ''); let g = grp.find(x => x.k === k); if (!g) grp.push(g = { k, college: b.college, titre: b.titre, l: [] }); g.l.push(b); });
    return `<div class="grid g2">${['Titulaire', 'Suppléant'].map(c => `<div><h3>${c}s</h3>${grp.filter(g => norm(g.college).startsWith(norm(c))).map(g => `<div class="card"><b class="small" style="color:#c80030">${esc((g.titre || '').toUpperCase())}</b>${g.l.map(b => `<div style="margin:.25rem 0">${Natl.nomLien(b.prenom, b.nom)}${b.mandat ? ' <span class="tag">' + esc(b.mandat) + '</span>' : ''} <span class="small mut">${esc(b.academie || '')}</span></div>`).join('')}</div>`).join('')}</div>`).join('')}</div>
      <p class="small mut">SG : secrétaire général · SGA : secrétaire général adjoint · SN : secrétaire national(e) · SND : secrétaire national délégué · TN : trésorier national.</p>`;
  },
  tab_inst(N) {
    const grp = []; N.instances.forEach(i => { let g = grp.find(x => x.instance === i.instance); if (!g) grp.push(g = { instance: i.instance, l: [] }); g.l.push(i); });
    return grp.map(g => `<div class="card"><h3 style="margin-top:0">${esc(g.instance)}</h3>${g.l.map(i => `<div style="margin:.25rem 0"><span class="small mut">${esc(i.qualite || '')}</span> ${Natl.nomLien(i.prenom, i.nom)}${i.remarque ? ' <span class="small mut">— ' + esc(i.remarque) + '</span>' : ''}</div>`).join('')}</div>`).join('') || '<p class="mut">Aucune instance importée.</p>';
  },
  tab_annu() {
    const q = norm(Natl.q), l = Natl.personnes().filter(x => !q || norm(Object.values(x).join(' ')).includes(q)), ed = can('adm.params');
    return `<div class="tablewrap"><table><thead><tr><th>Nom</th><th>Rôle(s)</th><th>Coordonnées</th>${ed ? '<th></th>' : ''}</tr></thead><tbody>${l.map(x => `<tr><td><b>${esc(Natl.nomComplet(x))}</b><div class="small mut">${esc(x.academie || '')}</div></td><td class="small">${x.roles.map(esc).join('<br>')}</td><td class="small">${Natl.contact(x)}</td>${ed ? `<td><button class="btn sm ghost" onclick="Natl.edit('${esc(x.cle)}')">✎</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
  }
};
App.routes['snetaa-national'] = () => Natl.page();
