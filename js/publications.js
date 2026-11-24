/* =========================================================
   Publications du national, documents et bulletin d'adhésion
   ========================================================= */
'use strict';
const Pubs = {
  CATS: ['Publication nationale', 'Bulletin d\'adhésion', 'Communiqué', 'Tract', 'Lettre académique', 'Guide / fiche pratique', 'Autre'],
  liste() { return (D.publications = D.publications || []); },
  bulletin() { return Pubs.liste().find(x => x.categorie === 'Bulletin d\'adhésion' && x.actif !== false); },
  page() {
    const l = Pubs.liste().slice().sort((a, b) => (b.epingle ? 1 : 0) - (a.epingle ? 1 : 0) || ((a.date || '') < (b.date || '') ? 1 : -1));
    const g = can('com.modeles'); const bu = Pubs.bulletin();
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Publications & bulletin d'adhésion</h1><div class="mut small">Liens vers les publications du national à glisser dans les mails, documents à remettre, bulletin d'adhésion pour faire adhérer.</div></div>
      <div class="actions">${g ? `<button class="btn" onclick="Pubs.edit()">+ Ajouter</button>` : ''}</div></div>
      <div class="card">${bu ? `<b>Bulletin d'adhésion en vigueur :</b> ${esc(bu.titre)} ${bu.url ? `— <a href="${esc(bu.url)}" target="_blank" rel="noopener">${esc(bu.url)}</a>` : ''} ${bu.fichier ? `— <a href="${bu.fichier.data}" download="${esc(bu.fichier.nom)}">📎 ${esc(bu.fichier.nom)}</a>` : ''}
        <p class="small mut">Dans les mails et SMS types, la variable <code>{bulletin_adhesion}</code> insère ce lien. Un mail ne pouvant pas joindre de fichier automatiquement, préfère un lien internet ; le fichier PDF sert à imprimer ou à joindre à la main.</p>`
        : `<div class="alert w">Aucun bulletin d'adhésion enregistré. ${g ? `<button class="btn sm" onclick="Pubs.edit(null,'Bulletin d\\'adhésion')">Ajouter le bulletin d'adhésion</button>` : ''}</div>`}
        ${can('com.envoyer') ? `<p><button class="btn sec sm" onclick="Pubs.faireAdherer()">✉ Proposer l'adhésion aux sympathisants et anciens adhérents…</button></p>` : ''}</div>
      <div class="tablewrap"><table><thead><tr><th></th><th>Date</th><th>Titre</th><th>Catégorie</th><th>Lien / fichier</th><th></th></tr></thead><tbody>
      ${l.map(x => `<tr><td>${x.epingle ? '📌' : ''}</td><td class="nowrap">${fmtDate(x.date)}</td><td><b>${esc(x.titre)}</b>${x.description ? `<div class="small mut">${esc(x.description)}</div>` : ''}</td><td><span class="tag ${x.categorie === 'Bulletin d\'adhésion' ? 'ok' : ''}">${esc(x.categorie)}</span></td>
        <td class="small">${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">ouvrir le lien</a> · <a href="#" onclick="copyText(${JSON.stringify(x.url).replace(/"/g, '&quot;')});return false">copier</a>` : ''} ${x.fichier ? `<a href="${x.fichier.data}" download="${esc(x.fichier.nom)}">📎 ${esc(x.fichier.nom)}</a>` : ''}</td>
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
      <p><button type="button" class="btn sm sec" onclick="Pubs.joindre()">📎 Joindre un fichier (PDF, 5 Mo max.)</button> <span id="pb_pj" class="small mut">${x.fichier ? esc(x.fichier.nom) : ''}</span></p>
      <label class="chk"><input type="checkbox" id="pb_e" ${x.epingle ? 'checked' : ''}> Épingler (mise en avant dans les envois)</label>`,
      [{ label: 'Annuler' }, {
        label: 'Enregistrer', onClick: m => {
          const t = m.querySelector('#pb_t').value.trim(); if (!t) { UI.toast('Titre ?', 'r'); return false; }
          Object.assign(x, { titre: t, categorie: m.querySelector('#pb_c').value, date: m.querySelector('#pb_d').value, url: m.querySelector('#pb_u').value.trim(), description: m.querySelector('#pb_x').value.trim(), epingle: m.querySelector('#pb_e').checked, fichier: Pubs._f });
          if (x.categorie === 'Bulletin d\'adhésion') Pubs.liste().forEach(o => { if (o !== x && o.categorie === x.categorie) o.actif = false; });
          x.actif = true;
          if (!id) { x.id = uid(); Pubs.liste().push(x); }
          save(); log('Publication', x.titre); App.route();
        }
      }]);
  },
  async joindre() { const f = await pickFile('.pdf,image/*,.doc,.docx,.odt'); if (!f) return; if (f.size > 5 * 1024 * 1024) return UI.toast('5 Mo maximum', 'r'); Pubs._f = { nom: f.name, data: await readFile(f, 'dataurl') }; $('#pb_pj').textContent = '📎 ' + f.name; },
  async suppr(id) { if (!await UI.confirm('Supprimer cette publication ?', 'Supprimer')) return; D.publications = Pubs.liste().filter(x => x.id !== id); save(); App.route(); },
  ligne(x) { return '• ' + x.titre + (x.url ? ' : ' + x.url : '') + (x.fichier && !x.url ? ' (document joint)' : ''); },
  epinglees() { return Pubs.liste().filter(x => x.epingle && x.categorie !== 'Bulletin d\'adhésion'); },
  faireAdherer() {
    const ids = P.visibles().filter(p => !p.archive && p.statut !== 'RETR' && (p.categorie === 'sympathisant' || (p.categorie === 'adherent' && ['ancien', 'retard'].includes(P.cotis(p))))).map(p => p.id);
    Comm.envoyerSelection(ids, null, 'adhesion');
  }
};
App.routes.publications = () => Pubs.page();
