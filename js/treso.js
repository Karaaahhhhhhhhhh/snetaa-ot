/* =========================================================
   Trésorerie : comptes, écritures, catégories, budget
   ========================================================= */
'use strict';
const Treso = {
  defaultCategories() {
    const c = (nom, sens) => ({ id: uid(), nom, sens });
    return [c('Reversement des cotisations (national)', 'R'), c('Subventions / dotations', 'R'), c('Remboursements', 'R'), c('Intérêts / produits financiers', 'R'), c('Autres recettes', 'R'),
    c('Frais de déplacement des militants', 'D'), c('Réunions et stages (salles, repas)', 'D'), c('Publications, impression, envois', 'D'), c('Matériel, fournitures, informatique', 'D'), c('Téléphone, internet, abonnements', 'D'), c('Frais bancaires', 'D'), c('Campagne élections professionnelles', 'D'), c('Autres dépenses', 'D')];
  },
  exo: null,
  exercice(date) { const m0 = D.meta.exerciceDebutMois || 9; const d = new Date((date || todayISO()) + 'T12:00'); const y = d.getMonth() + 1 >= m0 ? d.getFullYear() : d.getFullYear() - 1; return m0 === 1 ? String(y) : `${y}-${y + 1}`; },
  bornes(exo) { const m0 = D.meta.exerciceDebutMois || 9; const y = +exo.slice(0, 4); const deb = `${y}-${pad2(m0)}-01`; const f = new Date(y + (m0 === 1 ? 1 : 1), m0 - 1, 0); return [deb, m0 === 1 ? `${y}-12-31` : dateObjToISO(f)]; },
  solde(cid, jusqua) { const c = D.treso.comptes.find(x => x.id === cid); return num(c.soldeInitial) + D.treso.ecritures.filter(e => e.compteId === cid && (!jusqua || e.date <= jusqua) && (!c.dateSoldeInitial || e.date >= c.dateSoldeInitial)).reduce((s, e) => s + num(e.montant), 0); },
  soldeTotal() { return D.treso.comptes.reduce((s, c) => s + Treso.solde(c.id), 0); },
  cat(id) { return D.treso.categories.find(c => c.id === id) || { nom: '—', sens: '' }; },
  onglet: 'journal', fc: '', fcat: '', fq: '',
  page() {
    const exo = Treso.exo || Treso.exercice(); Treso.exo = exo; const [deb, fin] = Treso.bornes(exo);
    const g = can('tres.gerer');
    const exos = Array.from(new Set([Treso.exercice(), ...D.treso.ecritures.map(e => Treso.exercice(e.date))])).sort().reverse();
    const ecr = D.treso.ecritures.filter(e => e.date >= deb && e.date <= fin);
    const rec = ecr.filter(e => num(e.montant) > 0).reduce((s, e) => s + num(e.montant), 0), dep = ecr.filter(e => num(e.montant) < 0).reduce((s, e) => s + num(e.montant), 0);
    let h = `<div class="pagehead"><div><h1>Trésorerie</h1><div class="mut small">Exercice <select style="width:auto;display:inline-block" onchange="Treso.exo=this.value;Treso.page()">${UI.opts(exos, exo)}</select> (${fmtDate(deb)} → ${fmtDate(fin)})</div></div>
      <div class="actions">${g ? `<button class="btn" onclick="Treso.ecriture()">+ Écriture</button><button class="btn sec" onclick="Treso.importReleve()">⇪ Importer un relevé</button>` : ''}<button class="btn sec" onclick="Treso.exporter()">Exporter</button></div></div>
      <div class="tiles">${D.treso.comptes.map(c => `<div class="tile ${Treso.solde(c.id) < 0 ? 'b' : 'g'}"><div class="n" style="font-size:1.25rem">${fmtEUR(Treso.solde(c.id))}</div><div class="l">${esc(c.nom)}</div></div>`).join('')}
      <div class="tile"><div class="n" style="font-size:1.25rem">${fmtEUR(rec)}</div><div class="l">recettes de l'exercice</div></div><div class="tile o"><div class="n" style="font-size:1.25rem">${fmtEUR(-dep)}</div><div class="l">dépenses de l'exercice</div></div><div class="tile ${rec + dep < 0 ? 'b' : 'g'}"><div class="n" style="font-size:1.25rem">${fmtEUR(rec + dep)}</div><div class="l">résultat de l'exercice</div></div></div>
      ${!D.treso.comptes.length ? `<div class="alert w">Commence par créer un compte (compte courant, livret, caisse). ${g ? `<button class="btn sm" onclick="Treso.compte()">Créer un compte</button>` : ''}</div>` : ''}
      ${UI.tabs('trtabs', [['journal', 'Journal'], ['budget', 'Budget & bilan'], ['comptes', 'Comptes'], ['categories', 'Catégories']], Treso.onglet, '(k=>{Treso.onglet=k;Treso.page()})')}`;
    if (Treso.onglet === 'journal') {
      const q = norm(Treso.fq);
      const l = ecr.filter(e => (!Treso.fc || e.compteId === Treso.fc) && (!Treso.fcat || e.categorieId === Treso.fcat) && (!q || norm(e.libelle + ' ' + (e.tiers || '') + ' ' + (e.piece || '')).includes(q))).sort((a, b) => a.date < b.date ? 1 : -1);
      h += `<div class="toolbar"><input type="search" placeholder="Rechercher…" value="${esc(Treso.fq)}" onchange="Treso.fq=this.value;Treso.page()"><select onchange="Treso.fc=this.value;Treso.page()">${UI.opts(D.treso.comptes.map(c => [c.id, c.nom]), Treso.fc, 'Tous comptes')}</select><select onchange="Treso.fcat=this.value;Treso.page()">${UI.opts(D.treso.categories.map(c => [c.id, c.nom]), Treso.fcat, 'Toutes catégories')}</select></div>
        <div class="tablewrap"><table><thead><tr><th>Date</th><th>Libellé</th><th class="hide-m">Catégorie</th><th class="hide-m">Compte</th><th class="hide-m">Mode / pièce</th><th class="num">Recette</th><th class="num">Dépense</th><th title="Rapproché avec le relevé">✓</th></tr></thead><tbody>
        ${l.map(e => `<tr class="click" onclick="if(event.target.type!=='checkbox')Treso.ecriture('${e.id}')"><td>${fmtDate(e.date)}</td><td>${esc(e.libelle)}${e.tiers ? '<div class="small mut">' + esc(e.tiers) + '</div>' : ''}</td><td class="hide-m small">${esc(Treso.cat(e.categorieId).nom)}</td><td class="hide-m small">${esc((D.treso.comptes.find(c => c.id === e.compteId) || {}).nom || '')}</td><td class="hide-m small">${esc([e.mode, e.piece].filter(Boolean).join(' · '))}</td><td class="num">${num(e.montant) > 0 ? fmtEUR(e.montant) : ''}</td><td class="num">${num(e.montant) < 0 ? fmtEUR(-e.montant) : ''}</td><td><input type="checkbox" ${e.rapproche ? 'checked' : ''} ${g ? '' : 'disabled'} onchange="Treso.rappr('${e.id}',this.checked)"></td></tr>`).join('') || '<tr><td colspan="8" class="mut">Aucune écriture</td></tr>'}
        </tbody></table></div>`;
    } else if (Treso.onglet === 'budget') {
      const bud = (D.treso.budgets[exo] = D.treso.budgets[exo] || {});
      const row = c => { const r = ecr.filter(e => e.categorieId === c.id).reduce((s, e) => s + Math.abs(num(e.montant)), 0); const b = num(bud[c.id]); return `<tr><td>${esc(c.nom)}</td><td class="num">${g ? `<input style="width:110px;text-align:right" inputmode="decimal" value="${b || ''}" onchange="D.treso.budgets['${exo}']['${c.id}']=num(this.value);save();Treso.page()">` : fmtEUR(b)}</td><td class="num">${fmtEUR(r)}</td><td class="num">${b ? Math.round(r / b * 100) + ' %' : ''}</td><td style="min-width:120px"><div class="bar"><span style="width:${b ? Math.min(100, r / b * 100) : 0}%;background:${b && r > b && c.sens === 'D' ? 'var(--bord)' : 'var(--navy)'}"></span></div></td></tr>`; };
      const nc = ecr.filter(e => !e.categorieId).reduce((s, e) => s + num(e.montant), 0);
      h += `<div class="tablewrap"><table><thead><tr><th>Catégorie</th><th class="num">Budget prévu</th><th class="num">Réalisé</th><th class="num">%</th><th></th></tr></thead><tbody>
        <tr><th colspan="5">Recettes</th></tr>${D.treso.categories.filter(c => c.sens === 'R').map(row).join('')}<tr><th colspan="5">Dépenses</th></tr>${D.treso.categories.filter(c => c.sens === 'D').map(row).join('')}
        ${nc ? `<tr><td><i>Non classé</i></td><td></td><td class="num">${fmtEUR(nc)}</td><td></td><td></td></tr>` : ''}</tbody></table></div>`;
    } else if (Treso.onglet === 'comptes') {
      h += `${g ? `<p><button class="btn" onclick="Treso.compte()">+ Nouveau compte</button></p>` : ''}<div class="tablewrap"><table><thead><tr><th>Compte</th><th>Type</th><th class="num">Solde initial</th><th>au</th><th class="num">Solde actuel</th><th class="num">Solde rapproché</th></tr></thead><tbody>${D.treso.comptes.map(c => `<tr class="click" onclick="${g ? `Treso.compte('${c.id}')` : ''}"><td><b>${esc(c.nom)}</b></td><td>${esc(c.type || '')}</td><td class="num">${fmtEUR(c.soldeInitial)}</td><td>${fmtDate(c.dateSoldeInitial)}</td><td class="num">${fmtEUR(Treso.solde(c.id))}</td><td class="num">${fmtEUR(num(c.soldeInitial) + D.treso.ecritures.filter(e => e.compteId === c.id && e.rapproche).reduce((s, e) => s + num(e.montant), 0))}</td></tr>`).join('')}</tbody></table></div>`;
    } else {
      h += `${g ? `<p><button class="btn" onclick="Treso.categorie()">+ Nouvelle catégorie</button></p>` : ''}<div class="grid g2">${['R', 'D'].map(s => `<div class="card"><h3 style="margin-top:0">${s === 'R' ? 'Recettes' : 'Dépenses'}</h3>${D.treso.categories.filter(c => c.sens === s).map(c => `<div class="chk" style="justify-content:space-between">${esc(c.nom)} ${g ? `<span><button class="btn sm ghost" onclick="Treso.categorie('${c.id}')">Modifier</button></span>` : ''}</div>`).join('')}</div>`).join('')}</div>`;
    }
    $('#main').innerHTML = h;
  },
  rappr(id, v) { const e = D.treso.ecritures.find(x => x.id === id); e.rapproche = v; save(); },
  compte(id) {
    const c = id ? D.treso.comptes.find(x => x.id === id) : { nom: '', type: 'Compte courant', soldeInitial: 0, dateSoldeInitial: todayISO() };
    UI.modal(id ? 'Modifier le compte' : 'Nouveau compte', `<div class="frow"><div class="f"><label>Nom</label><input id="tc_n" value="${esc(c.nom)}" placeholder="ex. Crédit Mutuel — compte courant"></div><div class="f"><label>Type</label><select id="tc_t">${UI.opts(['Compte courant', 'Livret / épargne', 'Caisse (espèces)'], c.type)}</select></div><div class="f"><label>Solde initial (€)</label><input id="tc_s" inputmode="decimal" value="${c.soldeInitial}"></div><div class="f"><label>Date du solde initial</label><input type="date" id="tc_d" value="${esc(c.dateSoldeInitial || '')}"></div></div><p class="small mut">Ne saisis jamais ici de numéro de compte ou d'identifiant bancaire : le nom suffit.</p>`,
      [{ label: 'Annuler' }, { label: 'Enregistrer', onClick: m => { Object.assign(c, { nom: m.querySelector('#tc_n').value || 'Compte', type: m.querySelector('#tc_t').value, soldeInitial: num(m.querySelector('#tc_s').value), dateSoldeInitial: m.querySelector('#tc_d').value }); if (!id) { c.id = uid(); D.treso.comptes.push(c); } save(); log('Compte de trésorerie', c.nom); Treso.page(); } }]);
  },
  categorie(id) {
    const c = id ? D.treso.categories.find(x => x.id === id) : { nom: '', sens: 'D' };
    UI.modal('Catégorie', `<div class="frow"><div class="f"><label>Nom</label><input id="tk_n" value="${esc(c.nom)}"></div><div class="f"><label>Sens</label><select id="tk_s">${UI.opts([['R', 'Recette'], ['D', 'Dépense']], c.sens)}</select></div></div>`,
      [{ label: 'Annuler' }, { label: 'Enregistrer', onClick: m => { c.nom = m.querySelector('#tk_n').value; c.sens = m.querySelector('#tk_s').value; if (!id) { c.id = uid(); D.treso.categories.push(c); } save(); Treso.page(); } }]);
  },
  ecriture(id) {
    if (!D.treso.comptes.length) return Treso.compte();
    const e = id ? D.treso.ecritures.find(x => x.id === id) : { date: todayISO(), compteId: Treso.fc || D.treso.comptes[0].id, montant: 0 };
    const g = can('tres.gerer');
    const sens = num(e.montant) > 0 ? 'R' : 'D';
    UI.modal(id ? 'Écriture' : 'Nouvelle écriture', `<div class="frow"><div class="f"><label>Date</label><input type="date" id="te_d" value="${esc(e.date)}"></div><div class="f"><label>Sens</label><select id="te_s">${UI.opts([['D', 'Dépense'], ['R', 'Recette']], sens)}</select></div><div class="f"><label>Montant (€)</label><input id="te_m" inputmode="decimal" value="${e.montant ? Math.abs(e.montant) : ''}"></div><div class="f"><label>Compte</label><select id="te_c">${UI.opts(D.treso.comptes.map(c => [c.id, c.nom]), e.compteId)}</select></div></div>
      <div class="f"><label>Libellé</label><input id="te_l" value="${esc(e.libelle || '')}"></div>
      <div class="frow"><div class="f"><label>Catégorie</label><select id="te_k">${UI.opts(D.treso.categories.map(c => [c.id, (c.sens === 'R' ? '↑ ' : '↓ ') + c.nom]), e.categorieId, '—')}</select></div><div class="f"><label>Tiers</label><input id="te_t" value="${esc(e.tiers || '')}"></div><div class="f"><label>Mode</label><select id="te_mo">${UI.opts(REF.modesPaiement, e.mode, '—')}</select></div><div class="f"><label>N° de pièce / chèque</label><input id="te_p" value="${esc(e.piece || '')}"></div></div>
      ${e.justif ? `<p><a href="${e.justif.data}" download="${esc(e.justif.nom)}">📎 ${esc(e.justif.nom)}</a></p>` : ''}${g ? `<p><button type="button" class="btn sm sec" onclick="Treso.joindre('${id || ''}')">📎 Joindre une pièce</button> <span id="te_pj" class="small mut"></span></p>` : ''}`,
      g ? [{ label: 'Annuler' }, ...(id ? [{ label: 'Supprimer', onClick: async () => { D.treso.ecritures = D.treso.ecritures.filter(x => x.id !== id); save(); log('Écriture supprimée', e.libelle); Treso.page(); } }] : []), {
        label: 'Enregistrer', onClick: m => {
          const mt = num(m.querySelector('#te_m').value); if (!mt) { UI.toast('Montant ?', 'r'); return false; }
          Object.assign(e, { date: m.querySelector('#te_d').value, montant: m.querySelector('#te_s').value === 'D' ? -Math.abs(mt) : Math.abs(mt), compteId: m.querySelector('#te_c').value, libelle: m.querySelector('#te_l').value, categorieId: m.querySelector('#te_k').value, tiers: m.querySelector('#te_t').value, mode: m.querySelector('#te_mo').value, piece: m.querySelector('#te_p').value });
          if (Treso._pj) { e.justif = Treso._pj; Treso._pj = null; }
          if (!id) { e.id = uid(); e.par = ME.id; D.treso.ecritures.push(e); }
          save(); log('Écriture', e.libelle + ' ' + fmtEUR(e.montant)); Treso.page();
        }
      }] : [{ label: 'Fermer' }], { wide: true });
  },
  async joindre() { const f = await pickFile('image/*,.pdf'); if (!f) return; if (f.size > 3 * 1024 * 1024) return UI.toast('3 Mo maximum', 'r'); Treso._pj = { nom: f.name, data: await readFile(f, 'dataurl') }; $('#te_pj').textContent = '📎 ' + f.name; },
  importReleve() {
    if (!D.treso.comptes.length) return Treso.compte();
    Mapper.open({
      titre: 'Relevé bancaire — colonnes', profil: 'releve', intro: 'Associe soit une colonne « Montant » (négatif = dépense), soit les colonnes « Débit » et « Crédit ».',
      fields: [['date', 'Date', ['date', 'date operation', 'date de l operation', 'date valeur']], ['libelle', 'Libellé', ['libelle', 'libelle operation', 'designation', 'description', 'intitule']], ['montant', 'Montant', ['montant', 'montant eur', 'somme']], ['debit', 'Débit', ['debit', 'debit eur']], ['credit', 'Crédit', ['credit', 'credit eur']]],
      onDone: (rows) => {
        UI.modal('Importer le relevé', `<p>${plural(rows.length, 'ligne')} lue(s).</p><div class="f"><label>Compte</label><select id="ir_c">${UI.opts(D.treso.comptes.map(c => [c.id, c.nom]))}</select></div><label class="chk"><input type="checkbox" id="ir_r" checked> Marquer comme rapprochées</label><p class="small mut">Les opérations déjà présentes (même date, même montant, même libellé) sont ignorées. Les catégories seront à préciser ensuite.</p>`,
          [{ label: 'Annuler' }, {
            label: 'Importer', onClick: m => {
              const cid = m.querySelector('#ir_c').value; let n = 0;
              rows.forEach(r => {
                const d = parseDate(r.date); let mt = r.montant !== undefined && r.montant !== '' ? num(r.montant) : num(r.credit) - Math.abs(num(r.debit));
                if (!d || !mt) return;
                const lib = String(r.libelle || '').trim();
                if (D.treso.ecritures.some(e => e.compteId === cid && e.date === d && Math.abs(num(e.montant) - mt) < 0.005 && norm(e.libelle) === norm(lib))) return;
                const auto = D.treso.ecritures.filter(e => e.categorieId && norm(e.libelle).slice(0, 12) === norm(lib).slice(0, 12)).pop();
                D.treso.ecritures.push({ id: uid(), date: d, compteId: cid, libelle: lib, montant: mt, categorieId: auto ? auto.categorieId : '', rapproche: m.querySelector('#ir_r').checked, source: 'relevé', par: ME.id }); n++;
              });
              save(); log('Relevé importé', n + ' opérations'); UI.toast(n + ' opérations importées', 'g'); Treso.page();
            }
          }]);
      }
    });
  },
  exporter() {
    const [deb, fin] = Treso.bornes(Treso.exo || Treso.exercice());
    const l = D.treso.ecritures.filter(e => e.date >= deb && e.date <= fin).sort((a, b) => a.date < b.date ? -1 : 1);
    exportXLSX('tresorerie_' + (Treso.exo || '') + '.xlsx', {
      Journal: l.map(e => ({ Date: fmtDate(e.date), Compte: (D.treso.comptes.find(c => c.id === e.compteId) || {}).nom, Libellé: e.libelle, Catégorie: Treso.cat(e.categorieId).nom, Tiers: e.tiers || '', Mode: e.mode || '', Pièce: e.piece || '', Recette: num(e.montant) > 0 ? num(e.montant) : '', Dépense: num(e.montant) < 0 ? -num(e.montant) : '', Rapproché: e.rapproche ? 'oui' : '' })),
      'Par catégorie': D.treso.categories.map(c => ({ Catégorie: c.nom, Sens: c.sens === 'R' ? 'Recette' : 'Dépense', Budget: num((D.treso.budgets[Treso.exo] || {})[c.id]), Réalisé: l.filter(e => e.categorieId === c.id).reduce((s, e) => s + Math.abs(num(e.montant)), 0) }))
    });
  }
};
App.routes.treso = () => Treso.page();
