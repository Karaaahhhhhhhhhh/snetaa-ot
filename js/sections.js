/* =========================================================
   Annuaire des sections académiques du SNETAA-FO
   (importé depuis un fichier Excel ; jamais inclus dans le code)
   ========================================================= */
'use strict';
const Sections = {
  q: '', zone: '',
  liste() { return D.sections || []; },
  COLS: { academie: ['academie', 'section', 'academie / section'], zone: ['zone'], mail: ['mail', 'courriel', 'email'], responsables: ['responsable', 'responsables', 'responsable(s)', 'secretaire'], tel: ['telephone', 'tel'], adresse: ['adresse'], site: ['site', 'site web'], remarque: ['remarque', 'note', 'notes'] },
  async importer() {
    const f = await pickFile('.xlsx,.xls,.csv'); if (!f) return;
    let sheets; try { sheets = await readSheetFile(f); } catch (e) { return UI.toast('Fichier illisible', 'r'); }
    const rows = Object.values(sheets)[0] || [];
    const hi = rows.findIndex(r => r.some(c => /acad|section/i.test(String(c))) && r.some(c => /mail/i.test(String(c))));
    if (hi < 0) return UI.toast('Colonnes « Académie / section » et « Mail » introuvables', 'r');
    const head = rows[hi].map(c => norm(String(c)));
    const idx = {}; Object.entries(Sections.COLS).forEach(([k, syn]) => { idx[k] = head.findIndex(h => syn.some(s => h === s || h.startsWith(s))); });
    const l = rows.slice(hi + 1).map(r => { const o = {}; Object.keys(idx).forEach(k => { o[k] = idx[k] >= 0 ? String(r[idx[k]] || '').trim() : ''; }); return o; })
      .filter(o => o.academie && (o.mail || o.tel) && !/^source/i.test(o.academie));
    if (!l.length) return UI.toast('Aucune section trouvée', 'r');
    // rapprochement avec la liste des académies (Caen et Rouen → Normandie)
    const acadDe = nom => { const n = norm(nom); if (/national/.test(n)) return '_national'; if (n === 'caen' || n === 'rouen') return 'Normandie'; return REF.academies.find(a => norm(a) === n) || ''; };
    const M = D.meta; M.mailsAcademies = M.mailsAcademies || {};
    let maj = 0, conflits = [];
    l.forEach(o => {
      o.cle = acadDe(o.academie); o.id = norm(o.academie).replace(/ /g, '-');
      if (o.cle === '_national') { if (!M.mailNational) { M.mailNational = o.mail; maj++; } return; }
      if (!o.cle || o.cle === M.syndicat.academie || !o.mail) return;
      if (o.cle === 'Normandie' && M.mailsAcademies.Normandie && !M.mailsAcademies.Normandie.includes(o.mail)) { M.mailsAcademies.Normandie += ',' + o.mail; maj++; return; }
      if (M.mailsAcademies[o.cle] && M.mailsAcademies[o.cle] !== o.mail) conflits.push(`${o.cle} : ${M.mailsAcademies[o.cle]} → ${o.mail}`);
      if (M.mailsAcademies[o.cle] !== o.mail) { M.mailsAcademies[o.cle] = o.mail; maj++; }
    });
    D.sections = l; D.meta.sectionsMaj = { date: nowISO(), fichier: f.name };
    save(); log('Annuaire des sections importé', l.length + ' sections');
    UI.modal('Annuaire des sections importé', `<p><b>${l.length}</b> sections importées.</p><p class="small"><b>${maj}</b> courriel(s) mis à jour dans Paramètres (adresse du national, adresses des sections pour les changements d'académie).</p>${conflits.length ? `<p class="small">Adresses remplacées :</p><ul class="small">${conflits.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}`, [{ label: 'Voir l\'annuaire', onClick: () => { App.go('sections'); setTimeout(App.route, 0); } }]);
  },
  de(acad) { return Sections.liste().find(o => o.cle === acad || norm(o.academie) === norm(acad || '')); },
  tels(t) { return String(t || '').split('|').map(x => x.trim()).filter(Boolean).map(x => { const num = (x.match(/[+\d][\d\s.]{7,}/) || [''])[0].trim(); return num ? `<a href="tel:${esc(num.replace(/[\s.]/g, ''))}">${esc(x)}</a>` : esc(x); }).join('<br>'); },
  page() {
    const q = norm(Sections.q), z = Sections.zone, all = Sections.liste();
    const l = all.filter(o => (!z || o.zone === z) && (!q || norm(Object.values(o).join(' ')).includes(q)));
    const zones = Array.from(new Set(all.map(o => o.zone).filter(Boolean)));
    $('#main').innerHTML = `<div class="ph"><div><h1>Sections académiques du SNETAA-FO</h1><p class="sub">${all.length ? `${all.length} sections${D.meta.sectionsMaj ? ' · importé le ' + fmtDate(D.meta.sectionsMaj.date) + ' (' + esc(D.meta.sectionsMaj.fichier) + ')' : ''}` : 'Annuaire pas encore importé.'}</p></div>
      <div class="actions">${can('adm.params') ? '<button class="btn sec" onclick="Sections.importer()">⇪ Importer / mettre à jour (Excel)</button>' : ''}</div></div>
      ${all.length ? `<div class="card"><div class="toolbar"><input placeholder="Rechercher (académie, nom, ville…)" value="${esc(Sections.q)}" oninput="Sections.q=this.value;clearTimeout(Sections._t);Sections._t=setTimeout(()=>{App.route();const i=document.querySelector('.toolbar input');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)" style="max-width:300px">
        <select onchange="Sections.zone=this.value;App.route()">${UI.opts(zones, z, 'Toutes les zones')}</select></div></div>
      <div class="tablewrap"><table><thead><tr><th>Section</th><th>Responsable(s)</th><th>Contact</th><th>Adresse</th><th></th></tr></thead><tbody>
      ${l.map(o => `<tr ${o.academie === D.meta.syndicat.academie ? 'style="background:#f3f0f7"' : ''}><td><b>${esc(o.academie)}</b><div class="small mut">${esc(o.zone || '')}</div></td><td>${esc(o.responsables || '')}</td>
        <td class="small">${o.mail ? `<a href="mailto:${esc(o.mail)}">${esc(o.mail)}</a><br>` : ''}${Sections.tels(o.tel)}</td><td class="small">${esc(o.adresse || '')}${o.remarque ? `<div class="mut">${esc(o.remarque)}</div>` : ''}</td>
        <td class="small nowrap">${o.site ? `<a href="${esc(/^https?:/.test(o.site) ? o.site : 'https://' + o.site)}" target="_blank" rel="noopener">site</a> · ` : ''}<a href="#" onclick="copyText(${JSON.stringify([o.academie, o.responsables, o.mail, o.tel, o.adresse].filter(Boolean).join(' — ')).replace(/"/g, '&quot;')});return false">copier</a></td></tr>`).join('') || '<tr><td colspan="5" class="mut">Aucun résultat</td></tr>'}</tbody></table></div>`
      : `<div class="card"><p>Importe le fichier Excel des sections (colonnes : Académie / section, Zone, Mail, Responsable(s), Téléphone, Adresse, Site, Remarque). Les adresses servent aussi aux mails de changement d'académie.</p></div>`}`;
  }
};
App.routes.sections = () => Sections.page();
