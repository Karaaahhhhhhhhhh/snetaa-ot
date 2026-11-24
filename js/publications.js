/* =========================================================
   Publications du national, documents et bulletin d'adhésion
   ========================================================= */
'use strict';
const Pubs = {
  CATS: ['AP Magazine', 'Guide national', 'Lettre nationale', 'Publication nationale', 'Bulletin d\'adhésion', 'Communiqué', 'Tract', 'Lettre académique', 'Guide / fiche pratique', 'Autre'],
  liste() { return (D.publications = D.publications || []); },
  bulletin() { return Pubs.liste().find(x => x.categorie === 'Bulletin d\'adhésion' && x.actif !== false); },
  page() {
    const f = Pubs._filtre || { q: '', c: '' };
    const l = Pubs.liste().filter(x => (!f.c || x.categorie === f.c) && (!f.q || norm(x.titre + ' ' + (x.description || '') + ' ' + (x.sommaire || []).join(' ')).includes(norm(f.q)))).sort((a, b) => (b.epingle ? 1 : 0) - (a.epingle ? 1 : 0) || ((a.date || '') < (b.date || '') ? 1 : -1));
    const g = can('com.modeles'); const bu = Pubs.bulletin();
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Publications & bulletin d'adhésion</h1><div class="mut small">Liens vers les publications du national à glisser dans les mails, documents à remettre, bulletin d'adhésion pour faire adhérer.</div></div>
      <div class="actions">${g ? `<button class="btn sec" onclick="Pubs.importer()">⇪ Importer des publications</button> <button class="btn sec" onclick="Pubs.exporter()">⇩ Exporter</button> <button class="btn" onclick="Pubs.edit()">+ Ajouter</button>` : ''}</div></div>
      <div class="card">${bu ? `<b>Bulletin d'adhésion en vigueur :</b> ${esc(bu.titre)} ${bu.url ? `— <a href="${esc(bu.url)}" target="_blank" rel="noopener">${esc(bu.url)}</a>` : ''} ${bu.fichier ? `— <a href="${bu.fichier.data}" download="${esc(bu.fichier.nom)}">📎 ${esc(bu.fichier.nom)}</a>` : ''}
        <p class="small mut">Dans les mails et SMS types, la variable <code>{bulletin_adhesion}</code> insère ce lien. Un mail ne pouvant pas joindre de fichier automatiquement, préfère un lien internet ; le fichier PDF sert à imprimer ou à joindre à la main.</p>`
        : `<div class="alert w">Aucun bulletin d'adhésion enregistré. ${g ? `<button class="btn sm" onclick="Pubs.edit(null,'Bulletin d\\'adhésion')">Ajouter le bulletin d'adhésion</button>` : ''}</div>`}
        ${can('com.envoyer') ? `<p><button class="btn sec sm" onclick="Pubs.faireAdherer()">✉ Proposer l'adhésion aux sympathisants et anciens adhérents…</button></p>` : ''}</div>
      <div class="toolbar" style="margin:1rem 0 .5rem"><input placeholder="Rechercher (n°, titre, sujet…)" style="max-width:260px" value="${esc(f.q)}" onchange="Pubs._filtre=Object.assign(Pubs._filtre||{},{q:this.value});App.route()"> <select style="width:auto" onchange="Pubs._filtre=Object.assign(Pubs._filtre||{},{c:this.value});App.route()">${UI.opts(Pubs.CATS, f.c, 'Toutes les catégories')}</select> <span class="small mut">${l.length} publication(s)</span></div>
      <div class="tablewrap"><table><thead><tr><th></th><th>Date</th><th>Titre</th><th>Catégorie</th><th>Lien / fichier</th><th></th></tr></thead><tbody>
      ${l.map(x => `<tr><td>${x.epingle ? '📌' : ''}</td><td class="nowrap">${fmtDate(x.date)}</td><td><b>${esc(x.titre)}</b>${x.description ? `<div class="small mut">${esc(x.description)}</div>` : ''}${(x.sommaire || []).length ? `<details class="small" style="margin-top:.25rem" ${f.q ? 'open' : ''}><summary style="cursor:pointer;color:var(--violet)">Sommaire (${x.sommaire.length} sujets)</summary><ul style="margin:.3rem 0 0 1rem;padding:0">${x.sommaire.map(t => `<li>${f.q && norm(t).includes(norm(f.q)) ? '<mark>' + esc(t) + '</mark>' : esc(t)}</li>`).join('')}</ul></details>` : ''}</td><td><span class="tag ${x.categorie === 'Bulletin d\'adhésion' ? 'ok' : ''}">${esc(x.categorie)}</span></td>
        <td class="small">${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">ouvrir le lien</a> · <a href="#" onclick="copyText(${JSON.stringify(x.url).replace(/"/g, '&quot;')});return false">copier</a>` : ''}${x.page && x.page !== x.url ? ` · <a href="${esc(x.page)}" target="_blank" rel="noopener">page du site</a>` : ''} ${x.fichier ? `<a href="${x.fichier.data}" download="${esc(x.fichier.nom)}">📎 ${esc(x.fichier.nom)}</a>` : ''}</td>
        <td class="nowrap">${g ? `<button class="btn sm ghost" onclick="Pubs.edit('${x.id}')">Modifier</button><button class="btn sm ghost" onclick="Pubs.suppr('${x.id}')">✕</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="mut">Aucune publication</td></tr>'}</tbody></table></div>
      <p class="small mut">📌 Les publications épinglées sont insérées par la variable <code>{publications}</code> et proposées en premier lors des envois.</p>`;
  },
  edit(id, cat) {
    const x = id ? Pubs.liste().find(p => p.id === id) : { date: todayISO(), categorie: cat || 'Publication nationale', titre: '', url: '' };
    Pubs._f = x.fichier || null;
    UI.modal(id ? 'Modifier' : 'Ajouter une publication ou un document', `<div class="f"><label>Titre</label><input id="pb_t" value="${esc(x.titre)}" placeholder="ex. AP n° 631 — Spécial mutations 2027"></div>
      <div class="frow"><div class="f"><label>Catégorie</label><select id="pb_c">${UI.opts(Pubs.CATS, x.categorie)}</select></div><div class="f"><label>Date</label><input type="date" id="pb_d" value="${esc(x.date || '')}"></div></div>
      <div class="f"><label>Lien internet (adresse de la page ou du PDF)</label><input id="pb_u" type="url" value="${esc(x.url || '')}" placeholder="https://www.snetaa.org/…"></div>
      <div class="f"><label>Description (facultatif)</label><input id="pb_x" value="${esc(x.description || '')}"></div>
      <div class="f"><label>Sommaire / sujets traités (un par ligne)</label><textarea id="pb_s" style="min-height:120px">${esc((x.sommaire || []).join('\n'))}</textarea></div>
      <p><button type="button" class="btn sm sec" onclick="Pubs.joindre()">📎 Joindre un fichier (PDF, 5 Mo max.)</button> <span id="pb_pj" class="small mut">${x.fichier ? esc(x.fichier.nom) : ''}</span></p>
      <label class="chk"><input type="checkbox" id="pb_e" ${x.epingle ? 'checked' : ''}> Épingler (mise en avant dans les envois)</label>`,
      [{ label: 'Annuler' }, {
        label: 'Enregistrer', onClick: m => {
          const t = m.querySelector('#pb_t').value.trim(); if (!t) { UI.toast('Titre ?', 'r'); return false; }
          Object.assign(x, { titre: t, categorie: m.querySelector('#pb_c').value, date: m.querySelector('#pb_d').value, url: m.querySelector('#pb_u').value.trim(), description: m.querySelector('#pb_x').value.trim(), sommaire: m.querySelector('#pb_s').value.split('\n').map(t => t.trim()).filter(Boolean), epingle: m.querySelector('#pb_e').checked, fichier: Pubs._f });
          if (x.categorie === 'Bulletin d\'adhésion') Pubs.liste().forEach(o => { if (o !== x && o.categorie === x.categorie) o.actif = false; });
          x.actif = true;
          if (!id) { x.id = uid(); Pubs.liste().push(x); }
          save(); log('Publication', x.titre); App.route();
        }
      }]);
  },
  /* ---------- Import / export ---------- */
  exporter() {
    const l = Pubs.liste().map(x => ({ id: x.id, titre: x.titre, categorie: x.categorie, date: x.date, url: x.url, page: x.page || '', description: x.description || '', sommaire: x.sommaire || [], epingle: !!x.epingle }));
    download('publications_SNETAA-FO_' + todayISO() + '.json', JSON.stringify({ type: 'snetaa-publications', version: 1, date: nowISO(), publications: l }, null, 2), 'application/json');
  },
  lire(txt) {
    txt = String(txt || '').replace(/^\uFEFF/, '').trim();
    if (/^[\[{]/.test(txt)) { const o = JSON.parse(txt); return Array.isArray(o) ? o : (o.publications || [o]); }
    const l = [];
    txt.split(/^={3,}\s*PUBLICATION\s*={3,}\s*$/mi).slice(1).forEach(bloc => {
      const o = {}; bloc.split(/^={3,}\s*FIN\s*={3,}\s*$/mi)[0].split('\n').forEach(li => { const r = li.match(/^\s*([a-zéè]+)\s*:\s*(.*)$/i); if (r) o[norm(r[1]).replace(/ /g, '')] = r[2].trim(); });
      if (o.titre) l.push(o);
    });
    return l;
  },
  normaliser(o) {
    const c = norm(o.categorie || o.cat || '');
    const categorie = Pubs.CATS.find(x => norm(x) === c) || (/^ap|magazine/.test(c) ? 'AP Magazine' : /guide|brochure/.test(c) ? 'Guide national' : /lettre|journal/.test(c) ? 'Lettre nationale' : /bulletin/.test(c) ? 'Bulletin d\'adhésion' : 'Publication nationale');
    const d = String(o.date || ''); const date = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : (parseDate(d) || '');
    return { id: o.id || '', titre: String(o.titre).trim(), categorie, date, url: String(o.url || o.pdf || o.page || '').trim(), page: String(o.page || '').trim(), description: String(o.description || '').trim(), sommaire: Array.isArray(o.sommaire) ? o.sommaire.map(String) : String(o.sommaire || '').split(/\s*\|\s*/).map(t => t.trim()).filter(Boolean), epingle: o.epingle === true || /^(oui|o|1|true|vrai)$/i.test(String(o.epingle || '')) };
  },
  existant(x) { const k = u => String(u || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase(); return Pubs.liste().find(o => (x.id && o.id === x.id) || (x.url && (k(o.url) === k(x.url) || k(o.page) === k(x.url))) || (x.page && (k(o.page) === k(x.page) || k(o.url) === k(x.page)))); },
  async importer() {
    const r = await UI.modal('Importer des publications', `<p class="small">Choisis un fichier (<code>.json</code> ou <code>.txt</code>) <b>ou</b> colle le texte préparé (par exemple par Claude).</p>
      <p><button class="btn sec" onclick="pickFile('.json,.txt').then(f=>f&&readFile(f,'text')).then(t=>{if(t)document.getElementById('ip_t').value=t})">Choisir un fichier…</button></p>
      <div class="f"><textarea id="ip_t" style="min-height:220px;font-family:monospace;font-size:.8rem" placeholder="=== PUBLICATION ===\ntitre: AP Mag n° 631 – Spécial mutations 2027\ncategorie: AP Magazine\ndate: 2026-11-04\nurl: https://www.snetaa.org/wp-content/uploads/…pdf\n=== FIN ==="></textarea></div>`,
      [{ label: 'Annuler', value: null }, { label: 'Analyser', onClick: m => m.querySelector('#ip_t').value }], { wide: true });
    if (!r) return;
    let l; try { l = Pubs.lire(r).map(Pubs.normaliser).filter(x => x.titre); } catch (e) { return UI.toast('Texte illisible : ' + e.message, 'r'); }
    if (!l.length) return UI.toast('Aucune publication trouvée', 'r');
    Pubs._imp = l;
    UI.modal(l.length + ' publication(s) trouvée(s)', `<p class="small"><a href="#" onclick="$$('.ip_c').forEach(c=>c.checked=true);return false">tout cocher</a> · <a href="#" onclick="$$('.ip_c').forEach(c=>c.checked=!c.dataset.ex);return false">seulement les nouvelles</a></p>
      <div class="tablewrap" style="max-height:55vh"><table><thead><tr><th></th><th>Date</th><th>Titre</th><th>Catégorie</th><th>Lien</th><th></th></tr></thead><tbody>${l.map((x, i) => { const ex = Pubs.existant(x);
        return `<tr><td><input type="checkbox" class="ip_c" data-i="${i}" ${ex ? 'data-ex="1"' : ''} ${ex ? '' : 'checked'}></td><td class="nowrap">${fmtDate(x.date)}</td><td><b>${esc(x.titre)}</b>${x.epingle ? ' 📌' : ''}</td><td class="small">${esc(x.categorie)}</td>
          <td class="small">${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${/\.pdf($|\?)/i.test(x.url) ? 'PDF' : 'page'}</a>` : '<span class="tag ko">sans lien</span>'}</td><td>${ex ? '<span class="tag w">déjà présente (mise à jour)</span>' : '<span class="tag ok">nouvelle</span>'}</td></tr>`; }).join('')}</tbody></table></div>`,
      [{ label: 'Annuler', value: null }, { label: 'Importer la sélection', onClick: md => {
        let n = 0, u = 0;
        $$('.ip_c', md).filter(c => c.checked).forEach(c => { const x = Pubs._imp[+c.dataset.i]; const ex = Pubs.existant(x);
          if (ex) { Object.assign(ex, { titre: x.titre, categorie: x.categorie, date: x.date || ex.date, url: x.url || ex.url, page: x.page || ex.page, description: x.description || ex.description, sommaire: x.sommaire.length ? x.sommaire : (ex.sommaire || []), epingle: x.epingle || ex.epingle }); u++; }
          else { Pubs.liste().push(Object.assign({}, x, { id: x.id || uid(), actif: true, fichier: null })); n++; } });
        save(); log('Publications importées', n + ' nouvelle(s), ' + u + ' mise(s) à jour'); UI.toast(n + ' ajoutée(s), ' + u + ' mise(s) à jour', 'g'); App.route(); } }], { wide: true });
  },
  async joindre() { const f = await pickFile('.pdf,image/*,.doc,.docx,.odt'); if (!f) return; if (f.size > 5 * 1024 * 1024) return UI.toast('5 Mo maximum', 'r'); Pubs._f = { nom: f.name, data: await readFile(f, 'dataurl') }; $('#pb_pj').textContent = '📎 ' + f.name; },
  async suppr(id) { if (!await UI.confirm('Supprimer cette publication ?', 'Supprimer')) return; D.publications = Pubs.liste().filter(x => x.id !== id); save(); App.route(); },
  ligne(x) { return '• ' + x.titre + (x.url ? ' : ' + x.url : '') + (x.fichier && !x.url ? ' (document joint)' : ''); },
  epinglees() { return Pubs.liste().filter(x => x.epingle && x.categorie !== 'Bulletin d\'adhésion'); },
  faireAdherer() {
    const ids = P.visibles().filter(Adh.cibleAdhesion).map(p => p.id);
    Comm.envoyerSelection(ids, null, 'adhesion');
  }
};
App.routes.publications = () => Pubs.page();
