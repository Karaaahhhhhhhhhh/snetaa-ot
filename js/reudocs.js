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
    if (/assembl[ée]e g[ée]n[ée]rale/i.test(inst)) return 'Adhérent(e) du SNETAA-FO, tu es invité(e) à l’assemblée générale des adhérents de l’académie d’Orléans-Tours.';
    if (/conseil syndical/i.test(inst)) return 'Membre du conseil syndical académique du SNETAA-FO, tu es convoqué(e) à sa prochaine réunion.';
    return 'Tu es invité(e) à participer à la réunion « ' + inst + ' » du SNETAA-FO.';
  },
  pointsODJ(r) {
    const d = r.docs || {}; let l = (d.ordre && d.ordre.length ? d.ordre : String(r.odj || '').split('\n').map(x => x.replace(/^\s*(\d+[.)-]|[-•*])\s*/, '').trim()).filter(Boolean));
    if (!l.length) l = ['Actualité nationale', 'Actualité académique – instances', 'Questions diverses'];
    const inv = ReuDocs.invites(r);
    if (inv.length && !l.some(x => /snetaa national|national/i.test(x))) l = ['Intervention du SNETAA national (' + inv.map(i => i.prenom + ' ' + String(i.nom).toUpperCase() + (i.fonction ? ', ' + i.fonction.toLowerCase() : '')).join(' ; ') + ') : point sur l’actualité nationale'].concat(l);
    return l.filter(x => String(x).trim());
  },
  nationaux() { const m = ReuDocs.conf(); return (m.nationaux = m.nationaux || []); },
  invites(r) { return ((r.docs && r.docs.invites) || []).map(id => ReuDocs.nationaux().find(n => n.id === id)).filter(Boolean); },

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
,
  /* ---------- Invitation d'un membre du SNETAA national ---------- */
  async pdfInvitation(r, n) {
    const doc = await ReuDocs.nouveauDoc(), C = ReuDocs.C;
    ReuDocs.entete(doc, 'Invitation', ReuDocs.instance(r), r);
    ReuDocs.expediteur(doc, 50); ReuDocs.dateLettre(doc, 50, r);
    let y = 70;
    doc.setFont('Carlito', 'normal'); doc.setFontSize(8.5); ReuDocs.col(doc, C.mut); doc.text('À l’attention de', 120, y);
    doc.setFont('Lora', 'bold'); doc.setFontSize(13); ReuDocs.col(doc, C.navy); doc.text(n.prenom + ' ' + String(n.nom).toUpperCase(), 120, y + 6);
    doc.setFont('Carlito', 'normal'); doc.setFontSize(9.5); ReuDocs.col(doc, C.txt); doc.text(doc.splitTextToSize((n.fonction || 'Membre du secrétariat national') + ' – SNETAA-FO', 74), 120, y + 11.2);
    y += 26;
    doc.setFont('Carlito', 'normal'); doc.setFontSize(11.5); ReuDocs.col(doc, C.txt);
    const txt = (r.docs && r.docs.texteInvite) || ('Cher camarade,\n\nNous avons le plaisir de t’inviter à notre ' + ReuDocs.instance(r) + ' afin que tu nous présentes un point sur l’actualité nationale et que tu puisses échanger avec nos militants et nos adhérents. Tu trouveras l’ordre du jour ci-joint.');
    txt.split('\n').forEach(par => { const l = doc.splitTextToSize(ReuDocs.nb(par), 178); doc.text(l, 16, y); y += Math.max(1, l.length) * 5.3 + (par ? 1.5 : 0); });
    y += 3; doc.text('Cette réunion se déroulera :', 16, y); y += 6;
    y = ReuDocs.carteQuand(doc, y, r, true) + 11;
    doc.setFont('Lora', 'italic'); doc.setFontSize(12); ReuDocs.col(doc, C.bord);
    doc.text('Merci de nous confirmer ta venue et tes horaires d’arrivée.', 105, y, { align: 'center' }); y += 12;
    ReuDocs.signature(doc, Math.max(y, 214), r);
    ReuDocs.pied(doc);
    return doc;
  },

  /* ---------- Destinataire : identité, corps, établissement ---------- */
  CORPS: { PLP: 'PLP', PLP_STAG: 'PLP stagiaire', CERT: 'Professeur certifié', AGREG: 'Professeur agrégé', CONTR: 'Professeur contractuel', PE: 'Professeur des écoles', DOC: 'Professeur documentaliste', CPE: 'CPE', AED: 'AED', AESH: 'AESH', PSYEN: 'Psychologue de l’Éducation nationale', DDFPT: 'DDFPT' },
  personne(x) {
    const u = x.uid && D.users.find(y => y.id === x.uid), p = (x.pid && P.get(x.pid)) || (u && u.pid && P.get(u.pid));
    if (p) {
      const a = (p.affectations || []).find(a => a.principal) || (p.affectations || [])[0] || {}, e = a.uai && D.etablissements.find(y => y.uai === a.uai);
      const nomE = a.nom || (e && e.nom) || '', ville = a.ville || (e && e.ville) || '';
      return { nom: String(p.nom || '').toUpperCase(), prenom: p.prenom || '', nomComplet: ((p.prenom || '') + ' ' + String(p.nom || '').toUpperCase()).trim(), corps: ReuDocs.CORPS[p.statut] || STATUT(p.statut)[1] || '',
        etab: [nomE, ville].filter(Boolean).join(', '), etabLong: [nomE, ville.toUpperCase()].filter(Boolean).join(' – '), email: p.email || '', tel: p.telPortable || '' };
    }
    if (u) return { nom: String(u.nom || '').toUpperCase(), prenom: u.prenom || '', nomComplet: ((u.prenom || '') + ' ' + String(u.nom || '').toUpperCase()).trim(), corps: '', etab: '', etabLong: '', email: u.email || '', tel: u.tel || '' };
    const t = String(x.nom || '').trim().split(/\s+/), nom = t.filter(w => w === w.toUpperCase() && /[A-Z]/.test(w)).join(' ') || t.slice(-1).join(' '), prenom = t.filter(w => !nom.split(' ').includes(w)).join(' ');
    return { nom: nom.toUpperCase(), prenom, nomComplet: String(x.nom || ''), corps: '', etab: x.etab || '', etabLong: x.etab || '', email: x.email || '', tel: '' };
  },
  fichier(r, p, quoi) { return (quoi + '_' + (p.nom || 'X') + '_' + (p.prenom || '') + '_' + r.date).replace(/[^\w\-àâäéèêëîïôöùûüç]+/gi, '_').replace(/_+/g, '_').replace(/_$/, '') + '.pdf'; },
  async dossier(r, x, odjBytes) { // convocation + ordre du jour + formulaire pré-rempli, en un seul PDF
    const p = ReuDocs.personne(x), art = ((r.docs || {}).asa || {}).article || '13';
    const l = [await ReuDocs.pdfConvocation(r, p)];
    if (odjBytes) { const PL = await ReuDocs.pdflib(); l.push(await PL.PDFDocument.load(odjBytes)); } else l.push(await ReuDocs.pdfODJ(r));
    if (art !== 'aucun') l.push(await ReuDocs.pdfASA(r, p));
    return ReuDocs.fusion(l);
  },
  telecharger(nom, bytes) { download(nom, new Blob([bytes], { type: 'application/pdf' })); },

  /* ---------- Textes des mails (ouverts dans Thunderbird) ---------- */
  sujet(r) { return '[SNETAA-FO] Convocation – ' + ReuDocs.instance(r) + ' du ' + ReuDocs.dateLongue(r.date, false); },
  corpsMail(r, p) {
    const L = ReuDocs.lieuDe(r), c = ReuDocs.conf(), art = ((r.docs || {}).asa || {}).article || '13';
    return 'Bonjour ' + (p.prenom || '') + ',\n\n' + ReuDocs.introConv(r) + '\n\n'
      + 'Date : ' + ReuDocs.quand(r) + (ReuDocs.horaire(r) ? ', ' + ReuDocs.horaire(r) : '') + '\n'
      + 'Lieu : ' + [L.nom, L.l1, L.l2].filter(Boolean).join(', ') + '\n\n'
      + 'Tu trouveras en pièce jointe ta convocation et l’ordre du jour' + (art !== 'aucun' ? ', ainsi que le formulaire « Exercice du droit syndical » pré-rempli : signe-le et dépose-le au secrétariat de ton établissement avec la convocation, ' + c.delaiASA : '') + '.\n\n'
      + 'Merci de me confirmer ta présence (ou ton absence) en répondant à ce mail.\n\n'
      + 'Bien syndicalement,\n\n' + ((D.meta.syndicat || {}).signature || c.signataireNom);
  },
  sujetInvite(r) { return '[SNETAA-FO] Invitation – ' + ReuDocs.instance(r) + ' du ' + ReuDocs.dateLongue(r.date, false); },
  corpsInvite(r, n) {
    const L = ReuDocs.lieuDe(r);
    return 'Bonjour ' + n.prenom + ',\n\nNous serions heureux de t’accueillir à notre ' + ReuDocs.instance(r) + ' pour un point sur l’actualité nationale du SNETAA.\n\n'
      + 'Date : ' + ReuDocs.quand(r) + (ReuDocs.horaire(r) ? ', ' + ReuDocs.horaire(r) : '') + '\nLieu : ' + [L.nom, L.l1, L.l2].filter(Boolean).join(', ') + '\n\n'
      + 'Tu trouveras en pièce jointe la lettre d’invitation et l’ordre du jour. Peux-tu nous confirmer ta venue et ton horaire d’arrivée ?\n\nBien syndicalement,\n\n' + ReuDocs.conf().signataireNom + '\nSecrétaire académique SNETAA Orléans-Tours\n' + ReuDocs.conf().mail;
  },

  /* ---------- Bloc « Convocation et documents » de la fiche réunion ---------- */
  ASA: [['13', 'Art. 13.2 – autorisation spéciale d’absence (FO, 20 j/an)'], ['13.1', 'Art. 13.1 – autorisation spéciale d’absence (10 j/an)'], ['16', 'Art. 16 – crédit d’heures (motif à préciser)'], ['conge', 'Congé pour formation syndicale (stage)'], ['aucun', 'Pas de formulaire']],
  docs(r) { r.docs = r.docs || {}; r.docs.asa = r.docs.asa || {}; r.docs.invites = r.docs.invites || []; return r.docs; },
  carte(r) {
    const d = ReuDocs.docs(r), a = d.asa, art = a.article === '13' && a.sous === '13.1' ? '13.1' : (a.article || '13'), id = r.id, N = ReuDocs.nationaux();
    const nb = r.participants.length, conv = r.participants.filter(x => x.convoque).length;
    const set = (k, v) => `ReuDocs.set('${id}','${k}',${v})`;
    return `<div class="card noprint"><h3 style="margin-top:0">📨 Convocation et documents</h3>
      <div class="frow"><div class="f"><label>Nom de l'instance sur les documents</label><input value="${esc(d.instance || '')}" placeholder="${esc(r.titre || r.type || '')}" onchange="${set('instance', 'this.value.trim()')}"></div>
        <div class="f"><label>Date des documents</label><input type="date" value="${esc(d.dateDoc || '')}" onchange="${set('dateDoc', 'this.value')}"></div>
        <div class="f"><label>Autorisation d'absence jointe</label><select onchange="ReuDocs.setAsa('${id}',this.value)">${UI.opts(ReuDocs.ASA, art)}</select></div></div>
      ${art === '16' ? `<div class="f"><label>Motif (article 16)</label><input value="${esc(a.motif || '')}" placeholder="${esc(ReuDocs.instance(r))}" onchange="ReuDocs.docs(Reu.get('${id}')).asa.motif=this.value;save()"></div>` : ''}
      ${art === 'conge' ? `<div class="frow"><div class="f"><label>Lieu du stage</label><input value="${esc(a.lieuStage || '')}" onchange="ReuDocs.docs(Reu.get('${id}')).asa.lieuStage=this.value;save()"></div><div class="f"><label>Organisé par (centre agréé)</label><input value="${esc(a.organisme || '')}" onchange="ReuDocs.docs(Reu.get('${id}')).asa.organisme=this.value;save()"></div></div>` : ''}
      <div class="f"><label>Texte de la convocation</label><textarea style="min-height:60px" placeholder="${esc(ReuDocs.introConv(Object.assign({}, r, { docs: Object.assign({}, d, { intro: '' }) })))}" onchange="${set('intro', 'this.value.trim()')}">${esc(d.intro || '')}</textarea></div>
      <div class="f"><label>Phrase finale</label><input value="${esc(d.finale || '')}" placeholder="Ta présence est indispensable." onchange="${set('finale', 'this.value.trim()')}"></div>
      <div class="f"><label>Invité(s) du SNETAA national</label><div>${N.length ? N.map(n => `<label class="chk" style="margin-right:1rem"><input type="checkbox" ${d.invites.includes(n.id) ? 'checked' : ''} onchange="ReuDocs.basculeInvite('${id}','${n.id}',this.checked)"> ${esc(n.prenom + ' ' + String(n.nom).toUpperCase())}${n.fonction ? ' <span class="mut small">(' + esc(n.fonction) + ')</span>' : ''}</label>`).join('') : '<span class="small mut">Aucun membre du national dans la liste.</span>'} <button class="btn sm ghost" onclick="ReuDocs.reglages('nat')">Gérer la liste</button></div>
        ${d.invites.length ? '<div class="small mut">Une ligne « Intervention du SNETAA national » est ajoutée en tête de l’ordre du jour (sauf si un point « national » y figure déjà).</div>' : ''}</div>
      <div class="toolbar" style="margin-top:.4rem"><button class="btn sm sec" onclick="ReuDocs.voirODJ('${id}')">📄 Ordre du jour</button><button class="btn sm sec" onclick="ReuDocs.voirVierge('${id}')">📄 Convocation sans nom</button>
        ${d.invites.length ? `<button class="btn sm sec" onclick="ReuDocs.envoiNational('${id}')">🤝 Invitation du national</button>` : ''}
        <button class="btn sm" onclick="ReuDocs.envoi('${id}')" ${nb ? '' : 'disabled'}>✉ Convoquer les participants (${conv}/${nb})</button>
        <button class="btn sm sec" onclick="ReuDocs.zip('${id}')" ${nb ? '' : 'disabled'}>📦 Tous les dossiers (publipostage)</button>
        <button class="btn sm ghost" onclick="ReuDocs.reglages()">⚙ Lieux, signature, réglages</button></div>
      <p class="small mut" style="margin:.3rem 0 0">Chaque participant reçoit un seul PDF : sa convocation, l'ordre du jour et ${art === 'aucun' ? 'aucun formulaire' : 'le formulaire « Exercice du droit syndical » pré-rempli à son nom'}. Les points de l'ordre du jour se modifient avec « Modifier ».</p></div>`;
  },
  set(id, k, v) { ReuDocs.docs(Reu.get(id))[k] = v; save(); },
  setAsa(id, v) { const a = ReuDocs.docs(Reu.get(id)).asa; if (v === '13.1') { a.article = '13'; a.sous = '13.1'; } else { a.article = v; a.sous = v === '13' ? '13.2' : a.sous; } save(); Reu.fiche(id); },
  basculeInvite(id, nid, on) { const d = ReuDocs.docs(Reu.get(id)); d.invites = d.invites.filter(x => x !== nid); if (on) d.invites.push(nid); save(); Reu.fiche(id); },
  async attente(fn, msg) { UI.toast(msg || 'Préparation des documents…'); try { return await fn(); } catch (e) { console.error(e); UI.toast('Document impossible : ' + e.message, 'r'); } },
  async voirODJ(id) { const r = Reu.get(id); await ReuDocs.attente(async () => ReuDocs.telecharger(ReuDocs.fichier(r, { nom: 'Ordre_du_jour' }, 'SNETAA-FO'), await ReuDocs.octets(await ReuDocs.pdfODJ(r)))); },
  async voirVierge(id) { const r = Reu.get(id); await ReuDocs.attente(async () => { const art = ((r.docs || {}).asa || {}).article || '13'; const l = [await ReuDocs.pdfConvocation(r, null), await ReuDocs.pdfODJ(r)]; if (art !== 'aucun') l.push(await ReuDocs.pdfASA(r, null)); ReuDocs.telecharger(ReuDocs.fichier(r, { nom: 'Convocation' }, 'SNETAA-FO'), await ReuDocs.fusion(l)); }); },
  async un(id, i) { const r = Reu.get(id), x = r.participants[i]; await ReuDocs.attente(async () => ReuDocs.telecharger(ReuDocs.fichier(r, ReuDocs.personne(x), 'Convocation'), await ReuDocs.dossier(r, x))); },

  /* envoi un par un : télécharger le dossier, ouvrir le mail pré-rédigé dans Thunderbird, cocher « convoqué » */
  envoi(id) {
    const r = Reu.get(id);
    const lignes = r.participants.map((x, i) => { const p = ReuDocs.personne(x); return `<tr><td><b>${esc(p.nomComplet || Reu.nom(x))}</b><div class="small mut">${esc(p.etab || '')}</div></td><td class="small">${p.email ? esc(p.email) : '<span class="tag ko">pas de mail</span>'}</td>
      <td class="nowrap"><button class="btn sm sec" onclick="ReuDocs.un('${id}',${i})">⬇ PDF</button> ${p.email ? `<button class="btn sm" onclick="ReuDocs.mail('${id}',${i})">✉ Mail</button>` : ''}</td>
      <td class="nowrap small">${x.convoque ? '✔ ' + fmtDate(x.convoque) : `<button class="btn sm ghost" onclick="ReuDocs.marque('${id}',${i})">Marquer convoqué</button>`}</td></tr>`; }).join('');
    UI.modal('Convoquer les participants', `<p class="small">Pour chacun : <b>⬇ PDF</b> télécharge son dossier (convocation + ordre du jour + formulaire), puis <b>✉ Mail</b> ouvre dans Thunderbird le mail pré-rédigé : joins-y le PDF et envoie-le depuis l'adresse <b>${esc((D.meta.syndicat || {}).mail || 'capa@snetaaot.org')}</b>. Le participant est alors noté « convoqué ».</p>
      <p class="small mut">Pour tout envoyer d'un coup, utilise plutôt « 📦 Tous les dossiers (publipostage) » avec le module Mail Merge de Thunderbird.</p>
      <div class="tablewrap" style="max-height:55vh"><table><thead><tr><th>Participant</th><th>Mail</th><th></th><th>Convocation</th></tr></thead><tbody>${lignes}</tbody></table></div>`, [{ label: 'Fermer', onClick: () => { Reu.fiche(id); } }], { wide: true });
  },
  mail(id, i) { const r = Reu.get(id), x = r.participants[i], p = ReuDocs.personne(x); openLink(mailto(p.email, ReuDocs.sujet(r), ReuDocs.corpsMail(r, p))); ReuDocs.marque(id, i, true); },
  marque(id, i, silencieux) { const x = Reu.get(id).participants[i]; x.convoque = x.convoque || todayISO(); save(); if (!silencieux) ReuDocs.envoi(id); else setTimeout(() => ReuDocs.envoi(id), 300); },

  /* tout d'un coup : un ZIP avec un PDF par participant + le fichier de publipostage Mail Merge (Thunderbird) */
  async zip(id) {
    const r = Reu.get(id), c = ReuDocs.conf();
    const dossier = await UI.prompt('Dossier de destination', 'Dans quel dossier de ton ordinateur vas-tu décompresser le fichier ZIP ? (chemin complet : Mail Merge en a besoin pour joindre chaque PDF)', (c.dossierPJ || 'C:\\Convocations\\').replace(/\d{4}-\d{2}-\d{2}[\\/]?$/, '') .replace(/[\\/]?$/, '\\') + r.date + '\\', 'text');
    if (dossier == null) return; c.dossierPJ = dossier; save();
    const base = dossier.replace(/[\\/]?$/, dossier.includes('/') ? '/' : '\\');
    await ReuDocs.attente(async () => {
      const odj = await ReuDocs.octets(await ReuDocs.pdfODJ(r)), CFB = XLSX.CFB, z = CFB.utils.cfb_new(), rows = [['Email', 'Prenom', 'Nom', 'Objet', 'PieceJointe']], sans = [];
      let k = 0;
      for (const x of r.participants) {
        const p = ReuDocs.personne(x), nom = ReuDocs.fichier(r, p, 'Convocation');
        CFB.utils.cfb_add(z, '/' + nom, await ReuDocs.dossier(r, x, odj)); k++;
        if (p.email) rows.push([p.email, p.prenom, p.nom, ReuDocs.sujet(r), base + nom]); else sans.push(p.nomComplet);
      }
      CFB.utils.cfb_add(z, '/' + ReuDocs.fichier(r, { nom: 'Ordre_du_jour' }, 'SNETAA-FO'), odj);
      const csv = '\ufeff' + rows.map(l => l.map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
      CFB.utils.cfb_add(z, '/publipostage.csv', new TextEncoder().encode(csv));
      const modele = ReuDocs.corpsMail(r, { prenom: '{{Prenom}}' });
      const lis = ['ENVOI DES CONVOCATIONS AVEC THUNDERBIRD (module « Mail Merge »)', '', '1. Décompresse ce fichier ZIP dans : ' + base, '2. Dans Thunderbird, choisis l\'identité ' + ((D.meta.syndicat || {}).mail || 'capa@snetaaot.org') + ', écris un nouveau message :',
        '   À : {{Email}}', '   Objet : {{Objet}}', '   Texte : copie le modèle ci-dessous.', '3. Menu Fichier > Mail Merge : Source = CSV, fichier = publipostage.csv (séparateur : virgule, encodage UTF-8),',
        '   Pièces jointes = {{PieceJointe}}, Mode d\'envoi = « Envoyer plus tard » pour vérifier dans la boîte d\'envoi.', '4. Vérifie un message, puis Fichier > Envoyer les messages en attente.', '',
        sans.length ? 'SANS ADRESSE MAIL (à remettre en main propre ou par courrier) : ' + sans.join(', ') : 'Tous les participants ont une adresse mail.', '', '--- MODÈLE DU MESSAGE ---', '', modele];
      CFB.utils.cfb_add(z, '/LISEZ-MOI.txt', new TextEncoder().encode('\ufeff' + lis.join('\r\n')));
      const out = CFB.write(z, { fileType: 'zip', type: 'array' });
      download('Convocations_' + r.date + '.zip', new Blob([new Uint8Array(out)], { type: 'application/zip' }));
      if (await UI.confirm(k + ' dossier(s) prêts' + (sans.length ? ' (' + sans.length + ' sans adresse mail)' : '') + '. Noter tous les participants comme « convoqués » aujourd\'hui ?', 'Oui, noter')) { r.participants.forEach(x => { x.convoque = x.convoque || todayISO(); }); save(); Reu.fiche(id); }
    }, 'Préparation des ' + r.participants.length + ' dossiers…');
  },

  /* invitation du ou des membres du national */
  envoiNational(id) {
    const r = Reu.get(id), L = ReuDocs.invites(r);
    UI.modal('Inviter le SNETAA national', `<p class="small">La lettre d'invitation est accompagnée de l'ordre du jour. Envoie-la depuis l'adresse <b>${esc(ReuDocs.conf().mail)}</b> (identité à choisir dans Thunderbird) : joins le PDF téléchargé au mail pré-rédigé.</p>
      <div class="f"><label>Texte de l'invitation (facultatif)</label><textarea style="min-height:80px" placeholder="Cher camarade, nous avons le plaisir de t’inviter…" onchange="ReuDocs.set('${id}','texteInvite',this.value.trim())">${esc((r.docs || {}).texteInvite || '')}</textarea></div>
      <table><tbody>${L.map(n => `<tr><td><b>${esc(n.prenom + ' ' + String(n.nom).toUpperCase())}</b><div class="small mut">${esc(n.fonction || '')} ${esc(n.mail || '')}</div></td><td class="nowrap"><button class="btn sm sec" onclick="ReuDocs.pdfNat('${id}','${n.id}')">⬇ PDF</button> ${n.mail ? `<button class="btn sm" onclick="ReuDocs.mailNat('${id}','${n.id}')">✉ Mail</button>` : ''}</td></tr>`).join('')}</tbody></table>`, [{ label: 'Fermer' }]);
  },
  async pdfNat(id, nid) { const r = Reu.get(id), n = ReuDocs.nationaux().find(x => x.id === nid); await ReuDocs.attente(async () => ReuDocs.telecharger(ReuDocs.fichier(r, { nom: n.nom, prenom: n.prenom }, 'Invitation'), await ReuDocs.fusion([await ReuDocs.pdfInvitation(r, n), await ReuDocs.pdfODJ(r)]))); },
  mailNat(id, nid) { const r = Reu.get(id), n = ReuDocs.nationaux().find(x => x.id === nid); openLink(mailto(n.mail, ReuDocs.sujetInvite(r), ReuDocs.corpsInvite(r, n))); const d = ReuDocs.docs(r); d.invitesEnvoyes = Object.assign({}, d.invitesEnvoyes, { [nid]: todayISO() }); save(); },

  /* ---------- Réglages : lieux, membres du national, signature, textes ---------- */
  reglages(onglet) {
    const c = ReuDocs.conf(), L = ReuDocs.lieux(), N = ReuDocs.nationaux();
    const lieu = (l, i) => `<tr><td><input value="${esc(l.nom || '')}" placeholder="Nom du lieu" onchange="ReuDocs.lieux()[${i}].nom=this.value;save()"></td><td><input value="${esc(l.adresse || '')}" placeholder="Adresse" onchange="ReuDocs.lieux()[${i}].adresse=this.value;delete ReuDocs.lieux()[${i}].lat;save()"></td><td><input style="width:70px" value="${esc(l.cp || '')}" placeholder="CP" onchange="ReuDocs.lieux()[${i}].cp=this.value;delete ReuDocs.lieux()[${i}].lat;save()"></td><td><input value="${esc(l.ville || '')}" placeholder="Ville" onchange="ReuDocs.lieux()[${i}].ville=this.value;delete ReuDocs.lieux()[${i}].lat;save()"></td><td><button class="btn sm ghost" onclick="ReuDocs.lieux().splice(${i},1);save();ReuDocs.reglages()">✕</button></td></tr>`;
    const nat = (n, i) => `<tr><td><input value="${esc(n.prenom || '')}" placeholder="Prénom" onchange="ReuDocs.nationaux()[${i}].prenom=this.value;save()"></td><td><input value="${esc(n.nom || '')}" placeholder="NOM" onchange="ReuDocs.nationaux()[${i}].nom=this.value;save()"></td><td><input value="${esc(n.fonction || '')}" placeholder="Secrétaire national" onchange="ReuDocs.nationaux()[${i}].fonction=this.value;save()"></td><td><input value="${esc(n.mail || '')}" placeholder="Courriel" onchange="ReuDocs.nationaux()[${i}].mail=this.value.trim();save()"></td><td><button class="btn sm ghost" onclick="ReuDocs.nationaux().splice(${i},1);save();ReuDocs.reglages('nat')">✕</button></td></tr>`;
    const champ = (k, lab, ph) => `<div class="f"><label>${lab}</label><input value="${esc(c[k] || '')}" placeholder="${esc(ph || '')}" onchange="ReuDocs.conf().${k}=this.value.trim();save()"></div>`;
    UI.modal('Documents des réunions : réglages', `
      <h3 style="margin-top:0">Lieux de réunion</h3><div class="tablewrap"><table><tbody>${L.map(lieu).join('')}</tbody></table></div><p><button class="btn sm sec" onclick="ReuDocs.lieux().push({id:uid(),nom:'',adresse:'',cp:'',ville:''});save();ReuDocs.reglages()">+ Ajouter un lieu</button></p>
      <h3 id="rd_nat">Membres du SNETAA national à inviter</h3><p class="small mut">Ex. le secrétaire national qui vient au conseil syndical académique ou à l'assemblée générale des adhérents.</p><div class="tablewrap"><table><tbody>${N.map(nat).join('') || '<tr><td class="mut small">Aucun</td></tr>'}</tbody></table></div><p><button class="btn sm sec" onclick="ReuDocs.nationaux().push({id:uid(),prenom:'',nom:'',fonction:'Secrétaire national',mail:''});save();ReuDocs.reglages('nat')">+ Ajouter</button></p>
      <h3>Signataire et en-tête</h3><div class="frow">${champ('signataireTitre', 'Titre')}${champ('signataireNom', 'Nom')}${champ('faitA', 'Fait à')}</div><div class="frow">${champ('tel', 'Téléphone')}${champ('mail', 'Courriel sur les documents')}${champ('delaiASA', 'Délai de dépôt du formulaire')}</div>
      <div class="f"><label>Signature manuscrite (image, conservée uniquement dans les données de l'application)</label><div>${c.signature ? `<img src="${c.signature}" style="max-height:60px;border:1px solid var(--line);background:#fff"> <button class="btn sm ghost" onclick="delete ReuDocs.conf().signature;save();ReuDocs.reglages()">Retirer</button>` : '<span class="small mut">aucune</span>'} <button class="btn sm sec" onclick="ReuDocs.choisirSignature()">Choisir une image…</button></div></div>
      <div class="f"><label>Encadré « Déplacements » de l'ordre du jour (vide = pas d'encadré)</label><textarea onchange="ReuDocs.conf().noteODJ=this.value.trim();save()">${esc(c.noteODJ || '')}</textarea></div>`, [{ label: 'Fermer', onClick: () => { if (location.hash.startsWith('#/reunion/')) App.route(); } }], { wide: true });
    if (onglet === 'nat') setTimeout(() => { const e = document.getElementById('rd_nat'); if (e) e.scrollIntoView(); }, 50);
  },
  async choisirSignature() {
    const f = await pickFile('image/*'); if (!f) return;
    const url = await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(f); });
    const im = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    const k = Math.min(1, 600 / im.naturalWidth), cv = document.createElement('canvas'); cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k);
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(im, 0, 0, cv.width, cv.height);
    ReuDocs.conf().signature = cv.toDataURL('image/jpeg', 0.85); save(); ReuDocs.reglages();
  }

};
