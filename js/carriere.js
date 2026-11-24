/* =========================================================
   Carrière : classe (normale, hors classe, exceptionnelle),
   échelon, indice majoré ; grille indiciaire et barème des
   cotisations (saisis par la section, modifiables)
   ========================================================= */
'use strict';
const Carriere = {
  CLASSES: [['CN', 'Classe normale'], ['HC', 'Hors classe'], ['CE', 'Classe exceptionnelle'], ['ES', 'Échelon spécial (classe exceptionnelle)'], ['C1', 'Contractuel 1re catégorie'], ['C2', 'Contractuel 2e catégorie'], ['SO', 'Sans objet']],
  classe(k) { const c = Carriere.CLASSES.find(x => x[0] === k); return c ? c[1] : (k || ''); },
  classeFromText(v) {
    const s = norm(v); if (!s) return '';
    if (Carriere.CLASSES.some(c => c[0].toLowerCase() === s)) return s.toUpperCase();
    if (/special/.test(s)) return 'ES';
    if (/excep|\bce\b|\bcex\b/.test(s)) return 'CE';
    if (/hors|\bhc\b/.test(s)) return 'HC';
    if (/normal|\bcn\b/.test(s)) return 'CN';
    if (/1(re|ere)? cat|categorie 1/.test(s)) return 'C1';
    if (/2(e|eme)? cat|categorie 2/.test(s)) return 'C2';
    return '';
  },
  echelonFromText(v) { const m = String(v == null ? '' : v).match(/\d{1,2}/); return m ? String(+m[0]) : ''; },
  /* grille : lignes { statut, classe, echelon, indice, montant } ; statut ou classe vide = tous */
  lignes() { return (D.bareme = D.bareme || []); },
  trouver(p) {
    if (!p) return null;
    const l = Carriere.lignes().filter(r => (!r.statut || r.statut === p.statut) && (!r.classe || r.classe === (p.classe || '')) && (!r.echelon || String(r.echelon) === String(p.echelon || '')));
    // la ligne la plus précise l'emporte
    l.sort((a, b) => ((b.statut ? 1 : 0) + (b.classe ? 1 : 0) + (b.echelon ? 1 : 0)) - ((a.statut ? 1 : 0) + (a.classe ? 1 : 0) + (a.echelon ? 1 : 0)));
    return l[0] || null;
  },
  indiceGrille(p) { const r = Carriere.trouver(p); return r && r.indice ? String(r.indice) : ''; },
  montant(p) {
    const r = Carriere.trouver(p);
    if (r && num(r.montant)) return num(r.montant);
    const b = D.meta.bareme || {};
    if (b.taux && num(p.indice)) return Math.round(num(p.indice) * num(b.taux) * 100) / 100; // option : montant proportionnel à l'indice
    return 0;
  },
  credit(m) { return Math.round(m * 0.66 * 100) / 100; },
  resume(p) {
    const parts = [Carriere.classe(p.classe), p.echelon ? p.echelon + 'e échelon' : '', p.indice ? 'INM ' + p.indice : ''].filter(Boolean);
    return parts.join(' · ');
  },
  manquants(l) { return l.filter(p => p.categorie === 'adherent' && p.statut !== 'RETR' && !p.archive && (!p.classe || !p.echelon)); },

  /* ---------- Paramètres : grille et barème ---------- */
  carte() {
    const l = Carriere.lignes(); const b = D.meta.bareme = D.meta.bareme || {};
    return `<div class="card"><h3 style="margin-top:0">Grille indiciaire et barème des cotisations (${l.length} lignes)</h3>
      <p class="small mut">Saisis ou importe le barème officiel du SNETAA-FO : pour chaque statut, classe et échelon, l'indice majoré et le montant annuel de la cotisation. Une case vide vaut « tous ». L'application s'en sert pour proposer l'indice de chaque adhérent, calculer la cotisation attendue et préparer les relances.</p>
      <div class="toolbar"><button class="btn sm" onclick="Carriere.ajoutLigne()">+ Ligne</button><button class="btn sm sec" onclick="Carriere.importer()">⇪ Importer (Excel)</button><button class="btn sm sec" onclick="Carriere.exporter()">Exporter / modèle Excel</button>
        <span class="small">ou montant = indice × <input style="width:90px" inputmode="decimal" value="${esc(b.taux || '')}" placeholder="taux" onchange="D.meta.bareme.taux=num(this.value)||'';save()"> € (si aucune ligne ne correspond)</span></div>
      <div class="tablewrap" style="max-height:320px"><table><thead><tr><th>Statut</th><th>Classe</th><th>Échelon</th><th class="num">Indice majoré</th><th class="num">Cotisation annuelle (€)</th><th></th></tr></thead><tbody>
      ${l.map((r, i) => `<tr><td><select onchange="D.bareme[${i}].statut=this.value;save()">${UI.opts(REF.statuts.map(s => [s[0], s[0]]), r.statut, 'tous')}</select></td><td><select onchange="D.bareme[${i}].classe=this.value;save()">${UI.opts(Carriere.CLASSES, r.classe, 'toutes')}</select></td>
        <td><input style="width:70px" value="${esc(r.echelon || '')}" onchange="D.bareme[${i}].echelon=Carriere.echelonFromText(this.value);save()"></td><td class="num"><input style="width:90px;text-align:right" value="${esc(r.indice || '')}" onchange="D.bareme[${i}].indice=this.value.replace(/\\D/g,'');save()"></td>
        <td class="num"><input style="width:100px;text-align:right" inputmode="decimal" value="${esc(r.montant || '')}" onchange="D.bareme[${i}].montant=num(this.value);save()"></td><td><button class="btn sm ghost" onclick="D.bareme.splice(${i},1);save();Params.page()">✕</button></td></tr>`).join('') || '<tr><td colspan="6" class="mut">Aucune ligne : importe ou saisis le barème.</td></tr>'}
      </tbody></table></div></div>`;
  },
  ajoutLigne() { const l = Carriere.lignes(); const last = l[l.length - 1] || { statut: 'PLP', classe: 'CN', echelon: '0' }; l.push({ statut: last.statut, classe: last.classe, echelon: String(+last.echelon + 1 || 1), indice: '', montant: '' }); save(); Params.page(); },
  exporter() {
    const l = Carriere.lignes();
    const rows = l.length ? l.map(r => ({ Statut: r.statut || '', Classe: Carriere.classe(r.classe), Échelon: r.echelon || '', 'Indice majoré': r.indice || '', 'Cotisation annuelle': num(r.montant) || '' }))
      : ['CN', 'HC', 'CE'].flatMap(c => Array.from({ length: c === 'CN' ? 11 : c === 'HC' ? 6 : 5 }, (_, i) => ({ Statut: 'PLP', Classe: Carriere.classe(c), Échelon: i + 1, 'Indice majoré': '', 'Cotisation annuelle': '' })));
    exportXLSX('grille_bareme_cotisations.xlsx', { Barème: rows });
  },
  importer() {
    Mapper.open({
      titre: 'Barème des cotisations — colonnes', profil: 'bareme',
      fields: [['statut', 'Statut / corps', ['statut', 'corps']], ['classe', 'Classe', ['classe', 'grade']], ['echelon', 'Échelon', ['echelon', 'ech']], ['indice', 'Indice majoré', ['indice majore', 'indice', 'inm']], ['montant', 'Cotisation annuelle', ['cotisation annuelle', 'cotisation', 'montant']]],
      onDone: rows => {
        const l = rows.map(r => ({ statut: Import.statutFromText(r.statut) || '', classe: Carriere.classeFromText(r.classe), echelon: Carriere.echelonFromText(r.echelon), indice: String(r.indice || '').replace(/\D/g, ''), montant: num(r.montant) })).filter(r => r.indice || r.montant);
        D.bareme = l; save(); log('Barème importé', l.length + ' lignes'); UI.toast(l.length + ' lignes importées', 'g'); App.route();
      }
    });
  },
  /* ---------- Saisie dans la fiche ---------- */
  champs(p) {
    return `<h3>Carrière</h3><div class="frow"><div class="f"><label>Classe / grade</label><select id="e_cl">${UI.opts(Carriere.CLASSES, p.classe, '—')}</select></div>
      <div class="f"><label>Échelon</label><input id="e_ech" inputmode="numeric" value="${esc(p.echelon || '')}"></div>
      <div class="f"><label>Indice majoré (INM)</label><div style="display:flex;gap:.3rem"><input id="e_inm" inputmode="numeric" value="${esc(p.indice || '')}"><button type="button" class="btn sm sec" title="Indice selon la grille" onclick="Carriere.proposer()">↺</button></div></div>
      <div class="f"><label>Date d'accès à l'échelon</label><input type="date" id="e_dpr" value="${esc(p.datePromo || '')}"></div></div>`;
  },
  proposer() {
    const p = { statut: $('#e_st').value, classe: $('#e_cl').value, echelon: Carriere.echelonFromText($('#e_ech').value) };
    const i = Carriere.indiceGrille(p); if (i) { $('#e_inm').value = i; UI.toast('Indice de la grille : ' + i, 'g'); } else UI.toast('Aucune ligne de la grille ne correspond (Paramètres → grille et barème)', 'r');
  },
  lire(m, p) {
    const g = s => (m.querySelector(s) || {}).value || '';
    const avant = { classe: p.classe || '', echelon: p.echelon || '', indice: p.indice || '', datePromo: p.datePromo || '' };
    p.classe = g('#e_cl'); p.echelon = Carriere.echelonFromText(g('#e_ech')); p.indice = g('#e_inm').replace(/\D/g, ''); p.datePromo = g('#e_dpr');
    if (!p.indice) p.indice = Carriere.indiceGrille(p);
    return Object.keys(avant).filter(k => avant[k] !== (p[k] || ''));
  }
};
