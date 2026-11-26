/* =========================================================
   Documents des réunions : ordre du jour, convocation individuelle,
   formulaire « Exercice du droit syndical » pré-rempli, envoi des convocations
   - mise en page inspirée de « La Lettre du SNETAA-FO Orléans-Tours »
     (bleu marine, touches bordeaux, Lora + Carlito)
   - polices et formulaire servis par le site (lib/docs), chargés à la première utilisation
   ========================================================= */
'use strict';
const ReuDocs = {
  LIB: 'lib/docs/',
  C: { navy: [22, 35, 63], bord: [140, 29, 44], rouge: [179, 18, 46], gris: [245, 244, 240], txt: [43, 43, 43], mut: [107, 114, 128], filet: [214, 211, 203] },
  _fonts: null,

  /* ---------- Réglages communs (D.meta.reuDocs) ---------- */
  conf() {
    const m = D.meta.reuDocs = D.meta.reuDocs || {};
    if (!m.faitA) m.faitA = 'Bourges';
    if (!m.signataireTitre) m.signataireTitre = 'Le secrétaire académique';
    if (!m.signataireNom) m.signataireNom = 'Christophe DENAGE';
    if (!m.tel) m.tel = '06 23 24 64 02';
    if (!m.mail) m.mail = (D.meta.syndicat && D.meta.syndicat.mailContact) || 'contact@snetaaot.org';
    if (m.noteODJ === undefined) m.noteODJ = 'Pour des raisons financières, nous vous demandons de regrouper au maximum vos déplacements. Si vous nous informez rapidement de votre présence, nous pouvons vous mettre en relation avec les adhérents proches de chez vous qui participent au bureau académique.';
    if (m.delaiASA === undefined) m.delaiASA = 'au moins 7 jours avant la réunion';
    if (!m.organisePar) m.organisePar = 'SNETAA-FO';
    return m;
  },
  lieux() { const m = ReuDocs.conf(); if (!m.lieux) m.lieux = [{ id: 'beauvais', nom: 'Château de Beauvais', adresse: '23 route de Selles-sur-Cher', cp: '41200', ville: 'Romorantin-Lanthenay', note: '' }]; return m.lieux; },
  lieu(id) { return ReuDocs.lieux().find(l => l.id === id); },

  /* ---------- Textes ---------- */
  JOURS: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  MOIS: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  nb: s => String(s || '').replace(/(\d) (\d)/g, '$1 $2').replace(/(\d) (h|km|%|€)/g, '$1 $2').replace(/ ([:;!?»])/g, ' $1').replace(/« /g, '« '),
  dateLongue(iso, avecJour = true) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return '';
    const d = new Date(+m[1], +m[2] - 1, +m[3]); const j = +m[3] === 1 ? '1er' : String(+m[3]);
    return (avecJour ? ReuDocs.JOURS[d.getDay()] + ' ' : '') + j + ' ' + ReuDocs.MOIS[+m[2] - 1] + ' ' + m[1];
  },
  cap: s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s,
  heure(h) { const m = String(h || '').match(/^(\d{1,2})[:h]?(\d{2})?/); if (!m) return ''; return +m[1] + ' h' + (m[2] && m[2] !== '00' ? m[2] : ''); },
  horaire(r) { const a = ReuDocs.heure(r.heure), b = ReuDocs.heure(r.heureFin); return a && b ? a + ' – ' + b : a ? 'à partir de ' + a : ''; },
  quand(r) {
    if (r.dateFin && r.dateFin !== r.date) return 'Du ' + ReuDocs.dateLongue(r.date) + ' au ' + ReuDocs.dateLongue(r.dateFin);
    return ReuDocs.cap(ReuDocs.dateLongue(r.date));
  },
  instance(r) { return (r.docs && r.docs.instance) || r.titre || r.type || 'Réunion'; },
  lieuDe(r) {
    const l = r.lieuId && ReuDocs.lieu(r.lieuId);
    if (l) return { nom: l.nom, l1: l.adresse || '', l2: [l.cp, l.ville].filter(Boolean).join(' ') };
    const t = String(r.lieu || '').split(/\s*[,\n]\s*/).filter(Boolean);
    return { nom: t[0] || '', l1: t.slice(1, -1).join(', '), l2: t.length > 1 ? t[t.length - 1] : '' };
  },
  introConv(r) {
    const d = r.docs || {};
    if (d.intro) return d.intro;
    const inst = ReuDocs.instance(r);
    if (/bureau acad[ée]mique [ée]largi/i.test(inst)) return 'Membre des instances académiques du SNETAA-FO, tu es invité(e) à participer au Bureau académique élargi du SNETAA-FO.';
    if (/bureau acad[ée]mique/i.test(inst)) return 'Membre du bureau académique du SNETAA-FO, tu es convoqué(e) à la réunion du Bureau académique.';
    if (/conseil syndical/i.test(inst)) return 'Membre du conseil syndical académique du SNETAA-FO, tu es convoqué(e) à sa prochaine réunion.';
    return 'Tu es invité(e) à participer à la réunion « ' + inst + ' » du SNETAA-FO.';
  },
  pointsODJ(r) { const d = r.docs || {}; return (d.ordre && d.ordre.length ? d.ordre : ['Actualité nationale', 'Actualité académique – instances', 'Questions diverses']).filter(x => String(x).trim()); },

  /* ---------- Bibliothèques et polices ---------- */
  async script(src, test) { if (test()) return; await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error('Impossible de charger ' + src + ' (connexion ?)')); document.head.appendChild(s); }); },
  async jspdf() { await ReuDocs.script('lib/jspdf.umd.min.js', () => window.jspdf); return window.jspdf.jsPDF; },
  async pdflib() { await ReuDocs.script(ReuDocs.LIB + 'pdf-lib.min.js', () => window.PDFLib); return window.PDFLib; },
  async polices() {
    if (ReuDocs._fonts) return ReuDocs._fonts;
    const noms = ['Lora-Regular', 'Lora-Bold', 'Lora-Italic', 'Lora-BoldItalic', 'Carlito-Regular', 'Carlito-Bold', 'Carlito-Italic', 'Carlito-BoldItalic'];
    const out = {};
    await Promise.all(noms.map(async n => {
      const r = await fetch(ReuDocs.LIB + 'fonts/' + n + '.ttf'); if (!r.ok) throw new Error('Police ' + n + ' introuvable');
      const b = new Uint8Array(await r.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      out[n] = btoa(s);
    }));
    return (ReuDocs._fonts = out);
  },
  async nouveauDoc() {
    const jsPDF = await ReuDocs.jspdf(), f = await ReuDocs.polices();
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    [['Lora-Regular', 'Lora', 'normal'], ['Lora-Bold', 'Lora', 'bold'], ['Lora-Italic', 'Lora', 'italic'], ['Lora-BoldItalic', 'Lora', 'bolditalic'], ['Carlito-Regular', 'Carlito', 'normal'], ['Carlito-Bold', 'Carlito', 'bold'], ['Carlito-Italic', 'Carlito', 'italic'], ['Carlito-BoldItalic', 'Carlito', 'bolditalic']]
      .forEach(([n, fam, st]) => { doc.addFileToVFS(n + '.ttf', f[n]); doc.addFont(n + '.ttf', fam, st); });
    return doc;
  },

  /* ---------- Éléments de mise en page ---------- */
  col(doc, c, quoi = 'text') { if (quoi === 'text') doc.setTextColor(...c); else if (quoi === 'fill') doc.setFillColor(...c); else doc.setDrawColor(...c); },
  espace(doc, txt, x, y, pas, align) { // capitales espacées
    const w = doc.getTextWidth(txt) + pas * (txt.length - 1);
    let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    for (const ch of txt) { doc.text(ch, cx, y); cx += doc.getTextWidth(ch) + pas; }
  },
  entete(doc, titre, sousTitre, r) { // version « impression » : fond blanc, texte marine, filets fins (pas d'aplat foncé)
    const C = ReuDocs.C;
    try { doc.addImage(LOGO_SNETAA, 'PNG', 14, 11, 50, 17); } catch (e) { }
    ReuDocs.col(doc, C.mut); doc.setFont('Carlito', 'normal'); doc.setFontSize(6.8);
    ReuDocs.espace(doc, 'SYNDICAT DE L’ENSEIGNEMENT PROFESSIONNEL', 74, 13.2, 0.55);
    ReuDocs.col(doc, C.navy); doc.setFont('Lora', 'bold'); doc.setFontSize(25); doc.text(titre, 73.5, 24.5);
    ReuDocs.col(doc, C.bord); doc.setFont('Lora', 'italic'); doc.setFontSize(11.5);
    const st = doc.splitTextToSize(sousTitre, 82); doc.text(st[0] + (st.length > 1 ? '…' : ''), 74, 30.8);
    ReuDocs.col(doc, C.rouge, 'fill'); doc.rect(74, 33.4, 9, 0.7, 'F');
    ReuDocs.col(doc, C.navy); doc.setFont('Carlito', 'normal'); doc.setFontSize(6.8);
    ReuDocs.espace(doc, 'ACADÉMIE D’ORLÉANS-TOURS', 85.5, 34.4, 0.55);
    ReuDocs.col(doc, C.filet, 'draw'); doc.setLineWidth(0.3); doc.line(163, 10, 163, 31);
    const m = String(r.date || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      ReuDocs.col(doc, C.mut); doc.setFont('Carlito', 'normal'); doc.setFontSize(6.8); ReuDocs.espace(doc, 'RÉUNION DU', 182.5, 14, 0.5, 'center');
      ReuDocs.col(doc, C.bord); doc.setFont('Lora', 'bold'); doc.setFontSize(26); doc.text(String(+m[3]), 182.5, 25.5, { align: 'center' });
      ReuDocs.col(doc, C.navy); doc.setFont('Lora', 'italic'); doc.setFontSize(9.5); doc.text(ReuDocs.MOIS[+m[2] - 1] + ' ' + m[1], 182.5, 31, { align: 'center' });
    }
    ReuDocs.col(doc, C.navy, 'fill'); doc.rect(14, 39.2, 182, 0.6, 'F');
    ReuDocs.col(doc, C.bord, 'fill'); doc.rect(14, 40.2, 182, 0.9, 'F');
  },
  expediteur(doc, y) {
    const C = ReuDocs.C, c = ReuDocs.conf();
    doc.setFont('Carlito', 'bold'); doc.setFontSize(8.6); ReuDocs.col(doc, C.navy); doc.text('SNETAA-FO Orléans-Tours', 16, y);
    doc.setFont('Carlito', 'normal'); ReuDocs.col(doc, C.mut);
    doc.text(c.signataireNom + ' · ' + c.signataireTitre.replace(/^Le |^La /, '').toLowerCase(), 16, y + 4);
    doc.text(ReuDocs.nb(c.tel) + ' · ' + c.mail, 16, y + 8);
  },
  dateLettre(doc, y, r) {
    const c = ReuDocs.conf(), d = (r.docs && r.docs.dateDoc) || todayISO();
    doc.setFont('Lora', 'italic'); doc.setFontSize(10); ReuDocs.col(doc, ReuDocs.C.mut);
    doc.text(c.faitA + ', le ' + ReuDocs.dateLongue(d, false), 194, y, { align: 'right' });
  },
  bandeau(doc, y, txt) { // titre de partie : marine, souligné de rouge (sans aplat, lisible à l'impression)
    const C = ReuDocs.C;
    ReuDocs.col(doc, C.navy); doc.setFont('Lora', 'bold'); doc.setFontSize(13); doc.text(txt, 16, y + 6);
    ReuDocs.col(doc, C.navy, 'fill'); doc.rect(16, y + 8.2, 178, 0.4, 'F');
    ReuDocs.col(doc, C.rouge, 'fill'); doc.rect(16, y + 7.9, 22, 1, 'F');
    return y + 9.2;
  },
  signature(doc, y, r) {
    const C = ReuDocs.C, c = ReuDocs.conf();
    doc.setFont('Carlito', 'normal'); doc.setFontSize(10.5); ReuDocs.col(doc, C.txt);
    doc.text(c.signataireTitre, 194, y, { align: 'right' });
    doc.setFont('Lora', 'bold'); doc.setFontSize(11); ReuDocs.col(doc, C.navy); doc.text(c.signataireNom, 194, y + 5, { align: 'right' });
    if (c.signature) { try { const p = doc.getImageProperties(c.signature), w = 42, h = Math.min(18, w * p.height / p.width); doc.addImage(c.signature, 152, y + 7, w, h); } catch (e) { } }
  },
  pied(doc) {
    const C = ReuDocs.C, c = ReuDocs.conf();
    ReuDocs.col(doc, C.filet, 'draw'); doc.setLineWidth(0.3); doc.line(16, 281, 194, 281);
    ReuDocs.col(doc, C.rouge, 'fill'); doc.rect(16, 280.6, 14, 0.8, 'F');
    doc.setFont('Carlito', 'normal'); doc.setFontSize(7.6); ReuDocs.col(doc, C.mut);
    doc.text('SNETAA-FO Orléans-Tours · ' + c.mail + ' · ' + ReuDocs.nb(c.tel) + ' · Membre de la FNEC FP-FO', 16, 285.5);
    doc.text('SNETAA-FO national · 417 Les Bureaux de la Colline, 92213 Saint-Cloud Cedex · www.snetaa.org', 16, 289.3);
  },
  carteQuand(doc, y, r, grand) { // encadré date, horaire, lieu
    const C = ReuDocs.C, L = ReuDocs.lieuDe(r), h = grand ? 42 : 30;
    if (grand) { ReuDocs.col(doc, C.navy, 'draw'); doc.setLineWidth(0.6); doc.roundedRect(30, y, 150, h, 2, 2, 'S'); ReuDocs.col(doc, C.bord, 'fill'); doc.rect(30, y + 3, 1.8, h - 6, 'F'); }
    else { ReuDocs.col(doc, C.gris, 'fill'); doc.rect(16, y, 178, h, 'F'); ReuDocs.col(doc, C.bord, 'fill'); doc.rect(16, y, 1.6, h, 'F'); }
    const x1 = grand ? 38 : 23, x2 = grand ? 108 : 104, blanc = false;
    const lab = (t, x, yy) => { doc.setFont('Carlito', 'bold'); doc.setFontSize(7.4); blanc ? doc.setTextColor(232, 178, 186) : ReuDocs.col(doc, C.rouge); ReuDocs.espace(doc, t, x, yy, 0.45); };
    const tx = c => blanc ? doc.setTextColor(255, 255, 255) : ReuDocs.col(doc, c);
    lab('QUAND', x1, y + 7.5);
    doc.setFont('Lora', 'bold'); doc.setFontSize(grand ? 14.5 : 12.5); tx(C.navy);
    const q = doc.splitTextToSize(ReuDocs.quand(r), x2 - x1 - 4); doc.text(q, x1, y + 14);
    doc.setFont('Lora', 'normal'); doc.setFontSize(grand ? 13 : 11); tx(C.txt); doc.text(ReuDocs.horaire(r), x1, y + 14 + q.length * (grand ? 6.2 : 5.4));
    lab('OÙ', x2, y + 7.5);
    doc.setFont('Carlito', 'bold'); doc.setFontSize(grand ? 13 : 11.5); tx(C.navy); doc.text(doc.splitTextToSize(L.nom || 'Lieu à préciser', 70), x2, y + 14);
    doc.setFont('Carlito', 'normal'); doc.setFontSize(grand ? 11.5 : 10.5); tx(C.txt);
    doc.text([L.l1, L.l2].filter(Boolean), x2, y + 14 + (grand ? 6 : 5.2));
    return y + h;
  },

  /* ---------- Ordre du jour ---------- */
  async pdfODJ(r) {
    const doc = await ReuDocs.nouveauDoc(), C = ReuDocs.C, c = ReuDocs.conf();
    ReuDocs.entete(doc, 'Ordre du jour', ReuDocs.instance(r), r);
    ReuDocs.expediteur(doc, 50); ReuDocs.dateLettre(doc, 50, r);
    let y = ReuDocs.carteQuand(doc, 64, r, false) + 9;
    y = ReuDocs.bandeau(doc, y, 'Points à l’ordre du jour') + 3;
    const pts = ReuDocs.pointsODJ(r);
    pts.forEach((p, i) => {
      const lignes = doc.setFont('Carlito', 'normal').setFontSize(11.5).splitTextToSize(ReuDocs.nb(p), 160);
      doc.setFont('Lora', 'bold'); doc.setFontSize(15); ReuDocs.col(doc, C.bord); doc.text(String(i + 1), 21, y + 7, { align: 'center' });
      doc.setFont('Carlito', 'normal'); doc.setFontSize(11.5); ReuDocs.col(doc, C.txt); doc.text(lignes, 30, y + 6.6);
      y += 6.6 + (lignes.length - 1) * 5 + 4.6;
      if (i < pts.length - 1) { ReuDocs.col(doc, C.filet, 'draw'); doc.setLineWidth(0.2); doc.line(30, y - 1.2, 194, y - 1.2); }
    });
    if (r.docs && r.docs.questionsDiverses !== false) {
      doc.setFont('Carlito', 'italic'); doc.setFontSize(9.5); ReuDocs.col(doc, C.mut);
      doc.text(doc.splitTextToSize('Questions diverses : si possible, transmettez-les-nous avant la réunion afin que nous puissions préparer les réponses lorsqu’elles sont complexes.', 164), 30, y + 2);
      y += 10;
    }
    ReuDocs.signature(doc, y + 12, r);
    if (c.noteODJ) {
      const lignes = doc.setFont('Carlito', 'normal').setFontSize(9.2).splitTextToSize(ReuDocs.nb(c.noteODJ), 166), hh = 9 + lignes.length * 4.1, yy = 276 - hh;
      ReuDocs.col(doc, C.rouge, 'draw'); doc.setLineWidth(0.35); doc.rect(16, yy, 178, hh);
      doc.setFont('Carlito', 'bold'); doc.setFontSize(7.4); ReuDocs.col(doc, C.rouge); ReuDocs.espace(doc, 'DÉPLACEMENTS', 21, yy + 5.2, 0.45);
      doc.setFont('Carlito', 'normal'); doc.setFontSize(9.2); ReuDocs.col(doc, C.txt); doc.text(lignes, 21, yy + 9.6);
    }
    ReuDocs.pied(doc);
    return doc;
  },

  /* ---------- Convocation individuelle ---------- */
  async pdfConvocation(r, p) {
    const doc = await ReuDocs.nouveauDoc(), C = ReuDocs.C, c = ReuDocs.conf();
    ReuDocs.entete(doc, 'Convocation', ReuDocs.instance(r), r);
    ReuDocs.expediteur(doc, 50); ReuDocs.dateLettre(doc, 50, r);
    let y = 70;
    if (p) {
      doc.setFont('Carlito', 'normal'); doc.setFontSize(8.5); ReuDocs.col(doc, C.mut); doc.text('À l’attention de', 120, y);
      doc.setFont('Lora', 'bold'); doc.setFontSize(13); ReuDocs.col(doc, C.navy); doc.text(p.nomComplet || '', 120, y + 6);
      if (p.etab) { doc.setFont('Carlito', 'normal'); doc.setFontSize(9.5); ReuDocs.col(doc, C.txt); doc.text(doc.splitTextToSize(p.etab, 74), 120, y + 11.2); }
      y += 24;
    } else y += 6;
    doc.setFont('Carlito', 'normal'); doc.setFontSize(11.5); ReuDocs.col(doc, C.txt);
    const intro = doc.splitTextToSize(ReuDocs.nb(ReuDocs.introConv(r)), 178); doc.text(intro, 16, y); y += intro.length * 5.3 + 4;
    doc.text('Cette réunion se déroulera :', 16, y); y += 6;
    y = ReuDocs.carteQuand(doc, y, r, true) + 11;
    doc.setFont('Lora', 'italic'); doc.setFontSize(13); ReuDocs.col(doc, C.bord);
    doc.text((r.docs && r.docs.finale) || 'Ta présence est indispensable.', 105, y, { align: 'center' }); y += 11;
    // pièces jointes / démarche d'autorisation d'absence
    const asa = ReuDocs.nb('Ta demande d’autorisation spéciale d’absence (formulaire « Exercice du droit syndical » joint, pré-rempli) : signe-la et dépose-la au secrétariat de ton établissement avec cette convocation, ' + c.delaiASA + '.');
    const l1 = doc.setFont('Carlito', 'normal').setFontSize(10).splitTextToSize(asa, 158), hh = 14 + 5 + l1.length * 4.5;
    ReuDocs.col(doc, C.gris, 'fill'); doc.rect(16, y, 178, hh, 'F'); ReuDocs.col(doc, C.bord, 'fill'); doc.rect(16, y, 1.6, hh, 'F');
    doc.setFont('Carlito', 'bold'); doc.setFontSize(7.4); ReuDocs.col(doc, C.rouge); ReuDocs.espace(doc, 'À JOINDRE', 22, y + 6, 0.45);
    doc.setFont('Carlito', 'normal'); doc.setFontSize(10); ReuDocs.col(doc, C.txt);
    doc.text('•', 23, y + 11.5); doc.text('L’ordre du jour de la réunion (joint).', 27, y + 11.5);
    doc.text('•', 23, y + 16.5); doc.text(l1, 27, y + 16.5);
    y += hh + 12;
    ReuDocs.signature(doc, Math.max(y, 214), r);
    ReuDocs.pied(doc);
    return doc;
  },

  /* ---------- Formulaire officiel « Exercice du droit syndical » (vierge du rectorat, pré-rempli) ---------- */
  async pdfASA(r, p) {
    const PL = await ReuDocs.pdflib();
    const base = await fetch(ReuDocs.LIB + 'formulaire-droit-syndical-vierge.pdf').then(x => { if (!x.ok) throw new Error('Formulaire vierge introuvable'); return x.arrayBuffer(); });
    const pdf = await PL.PDFDocument.load(base), page = pdf.getPages()[0];
    const f = await pdf.embedFont(PL.StandardFonts.Helvetica), fb = await pdf.embedFont(PL.StandardFonts.HelveticaBold);
    const bleu = PL.rgb(0.05, 0.08, 0.35);
    const ecr = (t, x, y, s = 10, font = f) => { if (t) page.drawText(String(t).replace(/[  ]/g, ' '), { x, y, size: s, font, color: bleu }); };
    const coche = (cx, cy) => { page.drawLine({ start: { x: cx - 3.6, y: cy + 0.2 }, end: { x: cx - 1.2, y: cy - 2.8 }, thickness: 1.5, color: bleu }); page.drawLine({ start: { x: cx - 1.2, y: cy - 2.8 }, end: { x: cx + 4.2, y: cy + 4.4 }, thickness: 1.5, color: bleu }); };
    const c = ReuDocs.conf(), a = (r.docs && r.docs.asa) || {};
    if (p) {
      ecr(p.nom, 139, 692.5); ecr(p.prenom, 338, 692.5);
      ecr(p.corps, 100, 675.5); ecr(p.etabLong || p.etab, 153, 658.5, p && String(p.etabLong || p.etab).length > 62 ? 8.5 : 10);
    }
    const du = fmtDate(r.date), au = fmtDate(r.dateFin || r.date);
    ecr(du, 200, 640); ecr(au, 349, 640);
    const art = a.article || '13';
    if (art === '13') { coche(77.8, 528.2); ecr(a.organisePar || c.organisePar, 410, 526, 9, fb); if ((a.sous || '13.2') === '13.2') coche(529.3, 454.4); else coche(529.3, 491); }
    else if (art === '16') { coche(79.6, 379); ecr(a.motif || ReuDocs.instance(r), 220, 359, 9); }
    else if (art === 'conge') { coche(77.8, 606.6); ecr(a.lieuStage, 100, 585.5, 9); ecr(a.organisme, 135, 570, 9); }
    return pdf;
  },

  /* ---------- Assemblage ---------- */
  async octets(doc) { return typeof doc.output === 'function' ? new Uint8Array(doc.output('arraybuffer')) : await doc.save(); },
  async fusion(liste) {
    const PL = await ReuDocs.pdflib(), out = await PL.PDFDocument.create();
    for (const x of liste) { const src = x instanceof PL.PDFDocument ? x : await PL.PDFDocument.load(await ReuDocs.octets(x)); const pages = await out.copyPages(src, src.getPageIndices()); pages.forEach(pg => out.addPage(pg)); }
    out.setTitle('Convocation SNETAA-FO'); out.setAuthor('SNETAA-FO Orléans-Tours');
    return out.save();
  }
};
