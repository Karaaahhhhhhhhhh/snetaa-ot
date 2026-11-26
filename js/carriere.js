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
  /* grille : lignes { statut, classe, echelon, indMin, indMax, libelle, montant } ; statut, classe ou échelon vide = tous ;
     indMin/indMax : tranche d'indice (contractuels) ; manuel : ligne indicative jamais appliquée automatiquement (sans solde) */
  BAREME_DEFAUT() {
    const L = [], pl = (classe, ech, m) => L.push({ statut: 'PLP', classe, echelon: String(ech), montant: m });
    [133, 183, 190, 228, 237, 244, 256, 271, 290, 313, 331].forEach((m, i) => pl('CN', i + 1, m));
    [291, 313, 325, 348, 368, 381, 388].forEach((m, i) => pl('HC', i + 1, m));
    [347, 368, 380, 399].forEach((m, i) => pl('CE', i + 1, m));
    [414, 431, 455].forEach((m, i) => L.push({ statut: 'PLP', classe: 'ES', echelon: String(i + 1), libelle: 'Hors échelon A, chevron ' + (i + 1), montant: m }));
    L.push({ statut: 'PLP_STAG', libelle: 'PLP stagiaire', montant: 99 });
    [['', 449, 'moins de 450', 81], [450, 499, '450 à 500', 114], [500, 699, '500 à 700', 140], [700, '', '700 et plus', 164]].forEach(([a, b, t, m]) => L.push({ statut: 'CONTR', indMin: a === '' ? '' : String(a), indMax: b === '' ? '' : String(b), libelle: 'Contractuel, indice ' + t, montant: m }));
    ['AED', 'AESH'].forEach(st => L.push({ statut: st, libelle: 'AED / AEP / AESH', montant: 51 }));
    L.push({ statut: 'RETR', libelle: 'Retraité titulaire', montant: 151 });
    L.push({ statut: 'RETR', classe: 'C1', libelle: 'Retraité contractuel', montant: 51 }, { statut: 'RETR', classe: 'C2', libelle: 'Retraité contractuel', montant: 51 });
    L.push({ statut: '', libelle: 'Sans solde (disponibilité, congé parental…)', manuel: true, montant: 29 });
    return L;
  },
  lignes() { return (D.bareme = D.bareme || []); },
  trouver(p) {
    if (!p) return null;
    const ind = num(p.indice);
    const l = Carriere.lignes().filter(r => !r.manuel && (!r.statut || r.statut === p.statut) && (!r.classe || r.classe === (p.classe || '')) && (!r.echelon || String(r.echelon) === String(p.echelon || ''))
      && (!(r.indMin || r.indMax) || (ind && (!r.indMin || ind >= num(r.indMin)) && (!r.indMax || ind <= num(r.indMax)))));
    // la ligne la plus précise l'emporte
    const pr = r => (r.statut ? 1 : 0) + (r.classe ? 1 : 0) + (r.echelon ? 1 : 0) + (r.indMin || r.indMax ? 1 : 0);
    l.sort((a, b) => pr(b) - pr(a));
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
    const so = REF.statuts.map(s => [s[0], s[0]]), cl = Carriere.CLASSES;
    return `<div class="card"><h3 style="margin-top:0">Barème des cotisations SNETAA-FO (${l.length} lignes)</h3>
      <p class="small mut">Les adhésions et les cotisations sont gérées et encaissées par le SNETAA-FO national : ce barème est indicatif. Il sert à renseigner les collègues (fiche, mails avec <code>{montant_cotisation}</code> et <code>{cout_reel}</code>, grille à diffuser) ; 66 % de la cotisation reviennent en crédit d'impôt. Une case vide vaut « tous ». La tranche d'indice ne sert que pour les contractuels.</p>
      <div class="frow"><div class="f"><label>Année du barème (affichée sur la grille)</label><input value="${esc(b.annee || '2026-2027')}" onchange="D.meta.bareme.annee=this.value.trim();save()"></div></div>
      <div class="toolbar"><button class="btn sm" onclick="Carriere.grillePDF()">📄 Grille à diffuser (PDF)</button><button class="btn sm sec" onclick="Carriere.ajoutLigne()">+ Ligne</button><button class="btn sm sec" onclick="Carriere.importer()">⇪ Importer (Excel)</button><button class="btn sm sec" onclick="Carriere.exporter()">Exporter (Excel)</button><button class="btn sm ghost" onclick="Carriere.reinit()">↺ Barème de référence</button></div>
      <div class="tablewrap" style="max-height:360px"><table><thead><tr><th>Statut</th><th>Classe</th><th>Échelon</th><th>Indice de… à…</th><th>Libellé</th><th class="num">Cotisation (€)</th><th class="num">Coût réel</th><th></th></tr></thead><tbody>
      ${l.map((r, i) => `<tr><td><select onchange="D.bareme[${i}].statut=this.value;save()">${UI.opts(so, r.statut, 'tous')}</select></td><td><select onchange="D.bareme[${i}].classe=this.value;save()">${UI.opts(cl, r.classe, 'toutes')}</select></td>
        <td><input style="width:55px" value="${esc(r.echelon || '')}" onchange="D.bareme[${i}].echelon=Carriere.echelonFromText(this.value);save()"></td>
        <td class="nowrap"><input style="width:60px" inputmode="numeric" value="${esc(r.indMin || '')}" onchange="D.bareme[${i}].indMin=this.value.replace(/\\D/g,'');save()"> – <input style="width:60px" inputmode="numeric" value="${esc(r.indMax || '')}" onchange="D.bareme[${i}].indMax=this.value.replace(/\\D/g,'');save()"></td>
        <td><input style="min-width:160px" value="${esc(r.libelle || '')}" onchange="D.bareme[${i}].libelle=this.value;save()">${r.manuel ? ' <span class="tag">indicatif</span>' : ''}</td>
        <td class="num"><input style="width:80px;text-align:right" inputmode="decimal" value="${esc(r.montant || '')}" onchange="D.bareme[${i}].montant=num(this.value);save();Params.page()"></td><td class="num small">${num(r.montant) ? fmtEUR(num(r.montant) - Carriere.credit(num(r.montant))) : ''}</td>
        <td><button class="btn sm ghost" onclick="D.bareme.splice(${i},1);save();Params.page()">✕</button></td></tr>`).join('')}
      </tbody></table></div></div>`;
  },
  async reinit() { if (!await UI.confirm('Remplacer le barème actuel par le barème de référence (PLP, contractuels, AED/AESH, stagiaires, retraités, sans solde) ?', 'Remplacer')) return; D.bareme = Carriere.BAREME_DEFAUT(); D.meta.baremeV = 1; save(); log('Barème des cotisations', 'barème de référence rétabli'); Params.page(); },
  libelleLigne(r) { return r.libelle || [r.statut === 'PLP' ? 'PLP' : STATUT(r.statut)[1], Carriere.classe(r.classe).toLowerCase(), r.echelon ? 'échelon ' + r.echelon : ''].filter(Boolean).join(' '); },
  ajoutLigne() { const l = Carriere.lignes(); const last = l[l.length - 1] || { statut: 'PLP', classe: 'CN', echelon: '0' }; l.push({ statut: last.statut, classe: last.classe, echelon: last.echelon ? String(+last.echelon + 1) : '', montant: '' }); save(); Params.page(); },
  exporter() {
    const rows = Carriere.lignes().map(r => ({ Statut: r.statut || '', Classe: Carriere.classe(r.classe), Échelon: r.echelon || '', 'Indice min': r.indMin || '', 'Indice max': r.indMax || '', Libellé: r.libelle || '', 'Cotisation annuelle': num(r.montant) || '', 'Coût réel (après 66 %)': num(r.montant) ? Math.round((num(r.montant) - Carriere.credit(num(r.montant))) * 100) / 100 : '' }));
    exportXLSX('bareme_cotisations_snetaa.xlsx', { Barème: rows });
  },
  tranche(t) { // « moins de 450 », « 450 à 500 », « 700 et plus », « 450-499 »
    const s = norm(t), n = (String(t || '').match(/\d+/g) || []).map(Number); if (!n.length) return {};
    if (/moins|inferieur|</.test(s)) return { indMax: String(n[0] - 1) };
    if (/plus|superieur|>|au dela/.test(s)) return { indMin: String(n[0]) };
    if (n.length > 1) return { indMin: String(n[0]), indMax: String(/ a |-/.test(' ' + s + ' ') && n[1] % 10 === 0 ? n[1] - 1 : n[1]) };
    return {};
  },
  importer() {
    Mapper.open({
      titre: 'Barème des cotisations — colonnes', profil: 'bareme',
      fields: [['statut', 'Statut / corps', ['statut', 'corps']], ['classe', 'Classe', ['classe', 'grade']], ['echelon', 'Échelon', ['echelon', 'ech']], ['indice', 'Indice / tranche (contractuels)', ['indice majore', 'indice', 'inm', 'tranche']], ['libelle', 'Libellé', ['libelle']], ['montant', 'Cotisation annuelle', ['cotisation annuelle', 'cotisation', 'montant']]],
      onDone: rows => {
        const l = [];
        rows.forEach(r => {
          const m = num(r.montant); if (!m) return;
          const st = norm(r.statut), c = norm(r.classe), o = { statut: '', classe: '', echelon: Carriere.echelonFromText(r.echelon), libelle: String(r.libelle || '').trim(), montant: m };
          if (/sans solde/.test(st)) Object.assign(o, { manuel: true, libelle: o.libelle || 'Sans solde (disponibilité, congé parental…)' });
          else if (/retrait/.test(st)) { o.statut = 'RETR'; if (/contract/.test(st)) { l.push(Object.assign({}, o, { classe: 'C1', libelle: o.libelle || 'Retraité contractuel' })); o.classe = 'C2'; o.libelle = o.libelle || 'Retraité contractuel'; } else o.libelle = o.libelle || 'Retraité titulaire'; }
          else if (/aed|aesh|aep/.test(st)) { l.push(Object.assign({}, o, { statut: 'AED', libelle: o.libelle || 'AED / AEP / AESH' })); o.statut = 'AESH'; o.libelle = o.libelle || 'AED / AEP / AESH'; }
          else if (/stagiaire/.test(c + ' ' + st)) { o.statut = 'PLP_STAG'; o.libelle = o.libelle || 'PLP stagiaire'; }
          else if (/hors echelon/.test(c)) { o.statut = 'PLP'; o.classe = 'ES'; o.echelon = Carriere.echelonFromText(String(r.classe).replace(/^[^-]*-/, '')); o.libelle = o.libelle || String(r.classe).trim(); }
          else { o.statut = Import.statutFromText(r.statut) || ''; o.classe = Carriere.classeFromText(r.classe); }
          if (o.statut === 'CONTR') { Object.assign(o, Carriere.tranche(r.indice)); o.libelle = o.libelle || 'Contractuel, indice ' + String(r.indice || '').trim(); }
          l.push(o);
        });
        D.bareme = l; save(); log('Barème importé', l.length + ' lignes'); UI.toast(l.length + ' lignes importées', 'g'); App.route();
      }
    });
  },
  /* grille imprimable pour les collègues (aux couleurs, sans aplats foncés) */
  grillePDF() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const W = 210, M = 16;
    const NAVY = [27, 42, 74], BORD = [140, 28, 44], MUT = [100, 112, 138], LINE = [221, 227, 236];
    const l = Carriere.lignes(), an = (D.meta.bareme || {}).annee || '2026-2027';
    try { doc.addImage(LOGO_SNETAA, 'PNG', M, 13, 36, 11.2); } catch (e) { }
    doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.text('Cotisations SNETAA-FO', M + 40, 20);
    doc.setTextColor(...BORD); doc.setFont('helvetica', 'italic'); doc.setFontSize(11); doc.text('Barème national ' + an + ' · informations SNETAA-FO Orléans-Tours', M + 40, 27);
    doc.setDrawColor(...NAVY); doc.setLineWidth(.8); doc.line(M, 33, W - M, 33); doc.setDrawColor(...BORD); doc.setLineWidth(.3); doc.line(M, 34.4, W - M, 34.4);
    // encadré crédit d'impôt
    doc.setDrawColor(...BORD); doc.setLineWidth(.5); doc.roundedRect(M, 39, W - 2 * M, 17, 2, 2);
    doc.setTextColor(...BORD); doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.text('66 %', M + 6, 50.5);
    doc.setTextColor(...NAVY); doc.setFontSize(10.5); doc.text('de votre cotisation vous reviennent en crédit d\'impôt,', M + 32, 46);
    doc.setFont('helvetica', 'normal'); doc.text('même si vous n\'êtes pas imposable. Le coût réel est indiqué pour chaque cas.', M + 32, 51.5);
    const groupes = [
      ['PLP — classe normale', r => r.statut === 'PLP' && r.classe === 'CN'], ['PLP — hors classe', r => r.statut === 'PLP' && r.classe === 'HC'],
      ['PLP — classe exceptionnelle', r => r.statut === 'PLP' && ['CE', 'ES'].includes(r.classe)],
      ['Autres situations', r => !(r.statut === 'PLP' && ['CN', 'HC', 'CE', 'ES'].includes(r.classe))]];
    const vus = new Set(); let y = 64;
    const col = (x, w, rows) => { let yy = y; rows.forEach(([t, lst]) => {
      if (!lst.length) return; doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(t.toUpperCase(), x, yy); doc.setDrawColor(...BORD); doc.setLineWidth(.6); doc.line(x, yy + 1.6, x + 14, yy + 1.6); yy += 6;
      doc.setFontSize(7.8); doc.setTextColor(...MUT); doc.setFont('helvetica', 'normal'); doc.text('Situation', x, yy); doc.text('Cotisation', x + w - 24, yy, { align: 'right' }); doc.text('Coût réel', x + w, yy, { align: 'right' }); yy += 2;
      lst.forEach((r, k) => { yy += 5.6;
        const lib = ['CN', 'HC', 'CE'].includes(r.classe) && r.statut === 'PLP' && !r.libelle ? r.echelon + (r.echelon === '1' ? 'er' : 'e') + ' échelon'
          : r.statut === 'PLP' && r.classe === 'ES' ? 'Hors échelon A, ch. ' + r.echelon
          : r.statut === 'CONTR' && (r.indMin || r.indMax) ? 'Contractuel ' + (r.indMin && r.indMax ? r.indMin + ' à ' + (+r.indMax + 1) : r.indMax ? 'moins de ' + (+r.indMax + 1) : r.indMin + ' et plus')
          : (r.libelle || Carriere.libelleLigne(r));
        const lignesLib = doc.splitTextToSize(r.manuel ? lib.replace(/ \(.*$/, '') : lib, w - 40).slice(0, 2);
        doc.setTextColor(30, 36, 51); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.text(lignesLib, x, yy);
        doc.setFont('helvetica', 'bold'); doc.text(fmtEUR(num(r.montant)).replace(/[\u202f\u00a0]/g, ' '), x + w - 24, yy, { align: 'right' });
        doc.setTextColor(...BORD); doc.text(fmtEUR(num(r.montant) - Carriere.credit(num(r.montant))).replace(/[\u202f\u00a0]/g, ' '), x + w, yy, { align: 'right' }); yy += (lignesLib.length - 1) * 4; doc.setDrawColor(...LINE); doc.setLineWidth(.2); doc.line(x, yy + 1.7, x + w, yy + 1.7); });
      yy += 10; }); return yy; };
    const G = groupes.map(([t, f]) => { const lst = l.filter(r => !vus.has(r) && f(r)); lst.forEach(r => vus.add(r)); return [t, lst]; });
    // AED et AESH à la même cotisation : une seule ligne
    G[3][1] = G[3][1].filter((r, i, a) => !(r.statut === 'AESH' && a.some(x => x.statut === 'AED' && x.libelle === r.libelle && num(x.montant) === num(r.montant))) && !(r.statut === 'RETR' && r.classe === 'C2' && a.some(x => x.classe === 'C1' && x.statut === 'RETR')));
    const cw = (W - 2 * M - 10) / 2;
    const y1 = col(M, cw, [G[0], G[1]]), y2 = col(M + cw + 10, cw, [G[2], G[3]]);
    y = Math.max(y1, y2) + 2;
    doc.setDrawColor(...NAVY); doc.setLineWidth(.4); doc.roundedRect(M, y, W - 2 * M, 24, 2, 2);
    doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text('Adhérer ou renouveler', M + 5, y + 7);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    const s = D.meta.syndicat || {};
    doc.text(doc.splitTextToSize('Contractuels : tranche selon l\'indice majoré. L\'adhésion et le paiement se font directement auprès du SNETAA-FO national. Pour toute question : ' + (s.mail || '') + (s.tel ? ' · ' + s.tel : '') + '.', W - 2 * M - 10), M + 5, y + 13);
    doc.setTextColor(...MUT); doc.setFontSize(7.5); doc.text('SNETAA-FO Orléans-Tours · barème indicatif ' + an + ', édité le ' + fmtDate(todayISO()), W / 2, 287, { align: 'center' });
    doc.save('Cotisations_SNETAA-FO_' + an.replace(/\W+/g, '-') + '.pdf');
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
