/* =========================================================
   SNETAA-FO Orléans-Tours — Gestion syndicale
   Noyau : données, référentiels, comptes, droits, navigation
   ========================================================= */
'use strict';
const APP_VERSION = '2026-11-26 n°32';

/* ---------- Utilitaires ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function pad2(n) { return String(n).padStart(2, '0'); }
function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function nowISO() { return new Date().toISOString(); }
function fmtDate(iso) { if (!iso) return ''; const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso); }
function fmtDT(iso) { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
function fmtEUR(n) { return (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }); }
function num(v) { if (typeof v === 'number') return v; const n = parseFloat(String(v || '').replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; }
function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function cap(s) { return String(s || '').toLowerCase().replace(/(^|[\s\-'’])([a-zàâäéèêëïîôöùûüç])/g, (m, a, b) => a + b.toUpperCase()); }
function plural(n, s, p) { return n + ' ' + (n > 1 ? (p || s + 's') : s); }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function excelDateToISO(n) { const d = new Date(Math.round((n - 25569) * 86400000) + 43200000); return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
function dateObjToISO(d) { const x = new Date(d.getTime() + 12 * 3600000); return x.getFullYear() + '-' + pad2(x.getMonth() + 1) + '-' + pad2(x.getDate()); }
function parseDate(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) return isNaN(v) ? '' : dateObjToISO(v);
  if (typeof v === 'number') return v > 1000 && v < 80000 ? excelDateToISO(v) : '';
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3]);
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (m) { let y = +m[3]; if (y < 100) y += (y > 30 ? 1900 : 2000); return y + '-' + pad2(m[2]) + '-' + pad2(m[1]); }
  if (/^\d{5}(\.\d+)?$/.test(s)) return excelDateToISO(+s);
  return '';
}
function normPhone(v) {
  let s = String(v == null ? '' : v).replace(/[^\d+]/g, '');
  if (!s) return '';
  if (s.startsWith('+33')) s = '0' + s.slice(3); else if (s.startsWith('0033')) s = '0' + s.slice(4);
  if (/^[1-9]\d{8}$/.test(s)) s = '0' + s;
  if (/^0\d{9}$/.test(s)) return s.replace(/(\d{2})(?=\d)/g, '$1 ');
  return String(v).trim();
}
function phoneIntl(v) { const s = String(v || '').replace(/\D/g, ''); return /^0\d{9}$/.test(s) ? '+33' + s.slice(1) : s; }
function isMobile(v) { return /^0[67]/.test(String(v || '').replace(/\D/g, '')); }
function normEmail(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '').replace(/^mailto:/, ''); }
function emailOk(v) { return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v || ''); }
function normCP(v) { let s = String(v == null ? '' : v).replace(/\D/g, ''); if (s.length === 4) s = '0' + s; return s; }
function normUAI(v) { const s = String(v || '').toUpperCase().replace(/[^0-9A-Z]/g, ''); return /^\d{7}[A-Z]$/.test(s) ? s : String(v || '').trim().toUpperCase(); }
function depFromUAI(uai) { const m = String(uai || '').match(/^0(\d{2})|^(\d{3})/); if (!m) return ''; return m[1] || m[2]; }
function depFromCP(cp) { const s = normCP(cp); return s ? s.slice(0, 2) : ''; }
function download(name, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: type || 'text/plain;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
function exportXLSX(name, sheets) { // sheets: {NomFeuille: [ {col:val} ]}
  const wb = XLSX.utils.book_new();
  for (const [n, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ '(vide)': '' }]);
    const cols = Object.keys(rows[0] || {}); ws['!cols'] = cols.map(c => ({ wch: Math.min(45, Math.max(10, c.length + 2, ...rows.slice(0, 200).map(r => String(r[c] == null ? '' : r[c]).length))) }));
    XLSX.utils.book_append_sheet(wb, ws, n.slice(0, 31));
  }
  XLSX.writeFile(wb, name);
}
function exportCSV(name, rows, sep = ';') {
  const cols = Object.keys(rows[0] || {});
  const q = v => { const s = String(v == null ? '' : v); return /[";\n,]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const txt = '﻿' + [cols.map(q).join(sep), ...rows.map(r => cols.map(c => q(r[c])).join(sep))].join('\r\n');
  download(name, txt, 'text/csv;charset=utf-8');
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); UI.toast('Copié dans le presse-papiers', 'g'); }
  catch (e) { UI.modal('Copier', `<textarea style="min-height:220px" onfocus="this.select()">${esc(t)}</textarea>`, [{ label: 'Fermer' }]); }
}
function readFile(file, as) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; if (as === 'text') r.readAsText(file); else if (as === 'dataurl') r.readAsDataURL(file); else r.readAsArrayBuffer(file); });
}
function decodeText(buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { return new TextDecoder('windows-1252').decode(buf); }
}
/* Lecture d'un tableur (xlsx, xls, ods, csv) → { sheets: {nom: [[...]]} } */
async function readSheetFile(file) {
  const buf = await readFile(file, 'buffer');
  let wb;
  if (/\.(csv|txt|tsv)$/i.test(file.name)) {
    let txt = decodeText(buf).replace(/^﻿/, '');
    // CSV « doublement guillemeté » (ligne entière entre guillemets, guillemets internes doublés)
    const lines = txt.split(/\r?\n/);
    if (/^".*"";?/.test(lines[0]) && lines.filter(l => l.trim()).slice(0, 20).every(l => /^".*"[;,]*$/.test(l.trim())))
      txt = lines.map(l => l.trim().replace(/[;,]+$/, '').replace(/^"([\s\S]*)"$/, '$1').replace(/""/g, '"')).join('\n');
    const first = txt.split(/\r?\n/)[0] || '';
    const fs = (first.split(';').length > first.split(',').length) ? ';' : (first.split('\t').length > 1 ? '\t' : ',');
    wb = XLSX.read(txt, { type: 'string', FS: fs, raw: true, cellDates: false });
  } else wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheets = {};
  wb.SheetNames.forEach(n => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' });
    sheets[n] = rows.map(r => r.map(v => v instanceof Date ? dateObjToISO(v) : (v == null ? '' : v)));
  });
  return sheets;
}
function pickFile(accept, multiple) {
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; if (accept) i.accept = accept; if (multiple) i.multiple = true;
    i.onchange = () => res(multiple ? Array.from(i.files) : i.files[0]); i.click();
  });
}

/* ---------- Chiffrement (sauvegardes, paquets militants) ---------- */
const Crypto = {
  ok() { return !!(window.crypto && crypto.subtle); },
  b64(buf) { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768)); return btoa(s); },
  unb64(s) { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; },
  async key(pass, salt) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  },
  async encrypt(obj, pass) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await this.key(pass, salt), new TextEncoder().encode(JSON.stringify(obj)));
    return JSON.stringify({ snetaaEnc: 1, salt: this.b64(salt), iv: this.b64(iv), data: this.b64(data) });
  },
  async decrypt(txt, pass) {
    const o = JSON.parse(txt);
    const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: this.unb64(o.iv) }, await this.key(pass, this.unb64(o.salt)), this.unb64(o.data));
    return JSON.parse(new TextDecoder().decode(data));
  },
  async hash(s) {
    if (this.ok()) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join(''); }
    let h1 = 0x811c9dc5, h2 = 0; for (let i = 0; i < s.length; i++) { h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619); h2 = (h2 * 31 + s.charCodeAt(i)) | 0; } return 'f' + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  }
};
/* Lit un fichier JSON éventuellement chiffré */
async function readJSONMaybeEncrypted(file) {
  const txt = await readFile(file, 'text');
  let o; try { o = JSON.parse(txt); } catch (e) { throw new Error('Fichier illisible (JSON attendu).'); }
  if (o && o.snetaaEnc) {
    const pass = await UI.prompt('Fichier chiffré', 'Mot de passe du fichier :', '', 'password');
    if (pass == null) throw new Error('Annulé');
    try { return await Crypto.decrypt(txt, pass); } catch (e) { throw new Error('Mot de passe incorrect.'); }
  }
  return o;
}

/* ---------- Référentiels ---------- */
const REF = {
  categories: { adherent: 'Adhérent', sympathisant: 'Sympathisant', contact: 'Contact' },
  statuts: [
    ['PLP', 'Professeur de lycée professionnel (PLP)', 1], ['PLP_STAG', 'PLP stagiaire', 1], ['CERT', 'Professeur certifié', 1], ['AGREG', 'Professeur agrégé', 1],
    ['CONTR', 'Professeur contractuel', 1], ['PE', 'Professeur des écoles (ULIS, SEGPA…)', 1], ['DDFPT', 'DDFPT', 0], ['CPE', 'CPE', 0], ['AED', 'AED (assistant d\'éducation)', 0],
    ['AESH', 'AESH', 0], ['PSYEN', 'Psychologue de l\'EN', 0], ['DOC', 'Professeur documentaliste', 1], ['PERDIR', 'Personnel de direction', 0],
    ['ADM', 'Personnel administratif / ATRF', 0], ['SANTE', 'Infirmier·e, assistant·e social·e', 0], ['RETR', 'Retraité·e', 0], ['AUTRE', 'Autre', 0]
  ],
  // Codes disciplines (nomenclature EN : P = PLP, L = certifiés/agrégés, E/Y = éducation/psy). Liste modifiable dans Paramètres.
  disciplines: [
    ['P0210', 'PLP Lettres - histoire-géographie'], ['P0221', 'PLP Lettres - allemand'], ['P0222', 'PLP Lettres - anglais'], ['P0223', 'PLP Lettres - arabe'], ['P0226', 'PLP Lettres - espagnol'], ['P0229', 'PLP Lettres - italien'],
    ['P1315', 'PLP Mathématiques - physique-chimie'], ['P1900', 'PLP Éducation physique et sportive'],
    ['P2100', 'PLP Génie industriel bois'], ['P2200', 'PLP Génie industriel textiles et cuirs'], ['P2400', 'PLP Génie industriel structures métalliques'], ['P2450', 'PLP Construction et réparation carrosserie'],
    ['P3010', 'PLP Génie civil équipements techniques énergie'], ['P3020', 'PLP Génie civil construction et réalisation des ouvrages'], ['P3028', 'PLP Génie thermique'],
    ['P4100', 'PLP Génie mécanique option construction'], ['P4200', 'PLP Génie mécanique option productique'], ['P4500', 'PLP Génie mécanique maintenance des véhicules'], ['P4550', 'PLP Génie mécanique maintenance des systèmes mécaniques automatisés'],
    ['P5100', 'PLP Génie électrique option électronique'], ['P5200', 'PLP Génie électrique option électrotechnique'], ['P5210', 'PLP Équipement ménager / MAEMC'],
    ['P6100', 'PLP Industries graphiques'], ['P6310', 'PLP Conducteurs routiers'], ['P6500', 'PLP Arts appliqués'],
    ['P7200', 'PLP Biotechnologies santé-environnement'], ['P7300', 'PLP Sciences et techniques médico-sociales'], ['P7410', 'PLP Esthétique cosmétique'], ['P7420', 'PLP Coiffure'],
    ['P8011', 'PLP Économie-gestion option gestion administrative'], ['P8012', 'PLP Économie-gestion option gestion comptable'], ['P8013', 'PLP Économie-gestion option commerce et vente'], ['P8039', 'PLP Économie-gestion option gestion-administration'],
    ['P8510', 'PLP Hôtellerie option techniques culinaires'], ['P8520', 'PLP Hôtellerie option service et commercialisation'],
    ['L0080', 'Documentation'], ['L0100', 'Philosophie'], ['L0201', 'Lettres classiques'], ['L0202', 'Lettres modernes'], ['L0421', 'Allemand'], ['L0422', 'Anglais'], ['L0426', 'Espagnol'], ['L0429', 'Italien'],
    ['L1000', 'Histoire-géographie'], ['L1100', 'Sciences économiques et sociales'], ['L1300', 'Mathématiques'], ['L1400', 'Technologie'],
    ['L1411', 'SII option ingénierie des constructions'], ['L1412', 'SII option ingénierie électrique'], ['L1413', 'SII option ingénierie informatique'], ['L1414', 'SII option ingénierie mécanique'],
    ['L1500', 'Physique-chimie'], ['L1600', 'Sciences de la vie et de la Terre'], ['L1700', 'Éducation musicale'], ['L1800', 'Arts plastiques'], ['L1900', 'Éducation physique et sportive'],
    ['L6500', 'Arts appliqués'], ['L7100', 'Biochimie - génie biologique'], ['L7200', 'Biotechnologies'], ['L7300', 'Sciences et techniques médico-sociales'],
    ['L8011', 'Éco-gestion option communication, organisation, GRH'], ['L8012', 'Éco-gestion option comptabilité et finance'], ['L8013', 'Éco-gestion option marketing'], ['L8031', 'Éco-gestion option informatique et SI'],
    ['E0030', 'Éducation (CPE)'], ['Y0011', 'PsyEN EDA'], ['Y0012', 'PsyEN EDO']
  ],
  academies: ['Aix-Marseille', 'Amiens', 'Besançon', 'Bordeaux', 'Clermont-Ferrand', 'Corse', 'Créteil', 'Dijon', 'Grenoble', 'Guadeloupe', 'Guyane', 'La Réunion', 'Lille', 'Limoges', 'Lyon', 'Martinique', 'Mayotte', 'Montpellier', 'Nancy-Metz', 'Nantes', 'Nice', 'Normandie', 'Orléans-Tours', 'Paris', 'Poitiers', 'Reims', 'Rennes', 'Strasbourg', 'Toulouse', 'Versailles', 'Nouvelle-Calédonie', 'Polynésie française', 'Wallis-et-Futuna', 'Saint-Pierre-et-Miquelon', 'Étranger (AEFE, détachement)'],
  departements: { '18': 'Cher', '28': 'Eure-et-Loir', '36': 'Indre', '37': 'Indre-et-Loire', '41': 'Loir-et-Cher', '45': 'Loiret' },
  intentions: [['sur', 'Vote FO assuré', '#1f7a4d'], ['probable', 'Vote FO probable', '#6aa84f'], ['indecis', 'Indécis', '#e87400'], ['autre', 'Vote pour une autre liste', '#8c1c2c'], ['abst', 'Ne votera pas', '#7a7a7a'], ['', 'Non renseigné', '#c9d2e0']],
  canaux: [['tel', 'Téléphone'], ['mail', 'Mail'], ['sms', 'SMS'], ['wa', 'WhatsApp'], ['visite', 'Visite / rencontre'], ['courrier', 'Courrier'], ['reunion', 'Réunion'], ['autre', 'Autre']],
  typesIntervention: ['Renseignement', 'Mutation', 'Carrière / avancement', 'Rendez-vous de carrière', 'Conflit / harcèlement', 'Santé / congé', 'Accident de service', 'Disciplinaire', 'Salaire / indemnités', 'Temps partiel / disponibilité', 'Retraite', 'Accompagnement audience', 'Adhésion / cotisation', 'Élections professionnelles', 'Autre'],
  modesPaiement: ['Prélèvement', 'Chèque', 'Virement', 'CB', 'Espèces', 'Autre']
};
const STATUT = code => (REF.statuts.find(s => s[0] === code) || [code, code || '', 0]);
const discLabel = code => { const d = D.disciplines.find(x => x[0] === code); return d ? d[1] : ''; };
const intention = k => REF.intentions.find(i => i[0] === (k || '')) || REF.intentions[5];

/* ---------- Droits ---------- */
const PERMS = [
  ['adh.voir', 'Voir le fichier adhérents', 'Adhérents'], ['adh.voir_tout', 'Voir toutes les fiches (sinon : seulement son périmètre / ses contacts)', 'Adhérents'],
  ['adh.modifier', 'Modifier les fiches', 'Adhérents'], ['adh.cotis', 'Gérer les cotisations', 'Adhérents'], ['adh.importer', 'Importer / assainir le fichier', 'Adhérents'],
  ['adh.exporter', 'Exporter des listes', 'Adhérents'], ['adh.national', 'Signaler au national / aux académies', 'Adhérents'], ['adh.historique', 'Voir l\'historique et les messages archivés', 'Adhérents'],
  ['vot.voir', 'Voir le cahier de votants', 'Élections'], ['vot.modifier', 'Renseigner contacts et intentions', 'Élections'], ['vot.repartir', 'Répartir les contacts entre militants', 'Élections'], ['vot.emarg', 'Importer les listes de votants', 'Élections'],
  ['com.envoyer', 'Envoyer mails / SMS types', 'Communication'], ['com.modeles', 'Créer et modifier les modèles', 'Communication'],
  ['reu.voir', 'Voir les réunions', 'Réunions'], ['reu.gerer', 'Créer des réunions, pointer les présences', 'Réunions'],
  ['frais.saisir', 'Déclarer ses frais', 'Frais'], ['frais.valider', 'Voir et traiter toutes les déclarations', 'Frais'], ['frais.regler', 'Régler le barème et les listes communes', 'Frais'],
  ['tres.voir', 'Consulter la trésorerie', 'Trésorerie'], ['tres.gerer', 'Saisir et modifier la trésorerie', 'Trésorerie'],
  ['adm.users', 'Gérer les utilisateurs et les droits', 'Administration'], ['adm.params', 'Paramètres de l\'application', 'Administration'], ['adm.sauvegarde', 'Sauvegarder / restaurer', 'Administration'], ['adm.journal', 'Voir le journal des actions', 'Administration']
];
const ALLPERMS = PERMS.map(p => p[0]);
function defaultRoles() {
  return {
    admin: { label: 'Administrateur principal', perms: ALLPERMS.slice(), locked: true },
    s3: { label: 'Secrétariat académique (S3)', perms: ALLPERMS.filter(p => !['adm.users', 'adm.params'].includes(p)) },
    s2: { label: 'Secrétaire départemental (S2)', perms: ['adh.voir', 'adh.modifier', 'adh.historique', 'adh.exporter', 'adh.national', 'vot.voir', 'vot.modifier', 'vot.repartir', 'vot.emarg', 'com.envoyer', 'reu.voir', 'reu.gerer', 'frais.saisir'] },
    s1: { label: 'Délégué d\'établissement (S1)', perms: ['adh.voir', 'adh.historique', 'vot.voir', 'vot.modifier', 'com.envoyer', 'reu.voir', 'frais.saisir'] },
    tresorier: { label: 'Trésorier académique', perms: ['adh.voir', 'adh.voir_tout', 'adh.cotis', 'adh.exporter', 'reu.voir', 'frais.saisir', 'frais.valider', 'frais.regler', 'tres.voir', 'tres.gerer', 'adm.sauvegarde'] },
    militant: { label: 'Militant sans mandat (ses contacts)', perms: ['adh.voir', 'vot.voir', 'vot.modifier', 'com.envoyer', 'reu.voir', 'frais.saisir'] },
    lecture: { label: 'Consultation seule', perms: ['adh.voir', 'adh.voir_tout', 'vot.voir', 'reu.voir', 'tres.voir'] }
  };
}

/* ---------- Données ---------- */
let D = null;          // base complète
let ME = null;         // utilisateur connecté
function defaultDB() {
  return {
    meta: {
      version: 1, created: nowISO(), lastBackup: null,
      syndicat: { nom: 'SNETAA-FO', section: 'Orléans-Tours', academie: 'Orléans-Tours', mail: 'capa@snetaaot.org', tel: '06 23 24 64 02', signature: 'Christophe DENAGE\nSecrétaire académique SNETAA-FO Orléans-Tours\ncapa@snetaaot.org — 06 23 24 64 02' },
      mailNational: '', ccNational: '', mailsAcademies: {},
      elections: { debut: '2026-12-03', fin: '2026-12-10', scrutins: ['CSA ministériel', 'CSA académique', 'CAPN PLP', 'CAPA PLP', 'CCP contractuels'] },
      frais: { baremes: [{ id: 'b0', depuis: '2000-01-01', km: 0.20, repasMax: 10 }] },
      exerciceDebutMois: 9, lockMinutes: 30, mappings: {}
    },
    roles: defaultRoles(),
    users: [], personnes: [], etablissements: [], disciplines: REF.disciplines.slice(),
    bareme: [], imports: [], lastSnapshot: null, emargements: [], modeles: [], reunions: [], frais: [], fraisFiches: [],
    treso: { comptes: [], categories: [], ecritures: [], budgets: {} },
    validations: [], sections: [], national: null, dpe: null,
    journal: []
  };
}
const Store = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      if (!window.indexedDB) return res(null);
      const r = indexedDB.open('snetaa-fo-ot', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => res(null);
    });
  },
  get(k) {
    return new Promise(res => {
      if (!this.db) { try { return res(JSON.parse(localStorage.getItem('snetaa-' + k) || 'null')); } catch (e) { return res(null); } }
      const t = this.db.transaction('kv').objectStore('kv').get(k); t.onsuccess = () => res(t.result || null); t.onerror = () => res(null);
    });
  },
  set(k, v) {
    return new Promise(res => {
      if (!this.db) { try { localStorage.setItem('snetaa-' + k, JSON.stringify(v)); } catch (e) { UI.toast('Espace de stockage insuffisant !', 'r'); } return res(); }
      const tx = this.db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(); tx.onerror = () => { UI.toast('Erreur d\'enregistrement !', 'r'); res(); };
    });
  }
};
const _saveNow = () => Store.set('db', JSON.parse(JSON.stringify(D)));
const save = debounce(_saveNow, 350);
function log(action, detail) {
  D.journal.unshift({ id: uid(), d: nowISO(), u: ME ? ME.id : '', a: action, x: detail || '', app: /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent) ? 'téléphone' : 'ordinateur' });
  if (D.journal.length > 20000) D.journal.length = 20000;
  save();
}
function migrate() {
  if (D.meta && D.meta.syndicat && D.meta.syndicat.mailContact === undefined && /snetaaot\.org$/.test(D.meta.syndicat.mail || '')) D.meta.syndicat.mailContact = 'contact@snetaaot.org';
  const def = defaultDB();
  for (const k of Object.keys(def)) if (D[k] === undefined) D[k] = def[k];
  for (const k of Object.keys(def.meta)) if (D.meta[k] === undefined) D.meta[k] = def.meta[k];
  for (const k of Object.keys(def.treso)) if (D.treso[k] === undefined) D.treso[k] = def.treso[k];
  if (!D.modeles.length && (typeof Comm !== "undefined" && Comm)) D.modeles = Comm.defaultModeles();
  if ((typeof Comm !== "undefined" && Comm) && D.modeles.length) Comm.defaultModeles().forEach(m => { if (['adhesion', 'sms-adhesion'].includes(m.id) && !D.modeles.some(x => x.id === m.id)) D.modeles.push(m); });
  if (!D.publications) D.publications = [];
  if (!D.meta.pubSeed) { D.meta.pubSeed = 1; D.publications.push({ id: uid(), titre: 'AP n° 631 — Spécial mutations 2027', categorie: 'Publication nationale', date: '2026-11-01', url: 'https://www.snetaa.org/wp-content/uploads/2026/11/AP_N631_MUT27_WEB.pdf', epingle: false, actif: true }); }
  if (!D.treso.categories.length && (typeof Treso !== "undefined" && Treso)) D.treso.categories = Treso.defaultCategories();
  D.personnes.forEach(P.fix);
  Object.entries(defaultRoles()).forEach(([k, r]) => { if (!D.roles[k]) D.roles[k] = r; });
  D.users.forEach(u => { if (u.role === 'bureau') u.role = 's3'; });
  delete D.roles.bureau;
  // référentiel des lycées (ONISEP / Parcoursup) et services académiques : ajout des manquants, mise à jour des fiches issues du référentiel
  const REFS = [].concat(window.ETABS_REF || [], window.SERVICES_REF || [], (window.COLLEGES_REF || []).filter(e => !(window.ETABS_REF || []).some(x => x.uai === e.uai)));
  const sig = (window.ETABS_REF_V || 1) + ':' + REFS.length + ':' + ((window.ETABS_REF || [])[0] || {}).source + ':' + ((window.SERVICES_REF || [])[0] || {}).v + ':' + ((window.COLLEGES_REF || [])[0] || {}).source;
  if (REFS.length && D.meta.etabsRef !== sig) {
    REFS.forEach(e => { const x = D.etablissements.find(y => y.uai === e.uai); if (!x) D.etablissements.push(Object.assign({}, e)); else if (!x.manuel) Object.assign(x, e); });
    D.meta.etabsRef = sig;
  }
  D.personnes.forEach(p => (p.affectations || []).forEach(a => { if (a.uai && (!a.nom || !a.ville)) { const e = D.etablissements.find(x => x.uai === a.uai); if (e) { a.nom = a.nom || e.nom; a.ville = a.ville || e.ville; } } }));
  if (typeof Frais !== 'undefined') Frais.migrer();
}

/* ---------- Personnes : logique métier ---------- */
const P = {
  fix(p) {
    p.affectations = p.affectations || []; p.cotisations = p.cotisations || []; p.interventions = p.interventions || []; p.messages = p.messages || [];
    p.vote = p.vote || { intention: '', contacts: [] }; p.vote.contacts = p.vote.contacts || []; p.vote.scrutins = p.vote.scrutins || {}; p.mutations = p.mutations || [];
    p.localEdits = p.localEdits || {}; p.mandats = p.mandats || []; p.extra = p.extra || {}; p.signale = p.signale || {};
    p.calendrier = p.calendrier || 'scolaire'; p.categorie = p.categorie || 'adherent';
    return p;
  },
  nouveau(o) { return P.fix(Object.assign({ id: uid(), created: nowISO(), nom: '', prenom: '', categorie: 'adherent', academie: D.meta.syndicat.academie }, o || {})); },
  get(id) { return D.personnes.find(p => p.id === id); },
  full(p) { return ((p.nom || '').toUpperCase() + ' ' + (p.prenom || '')).trim(); },
  etab(p) { const a = (p.affectations || []).find(x => x.principal) || (p.affectations || [])[0]; if (!a) return ''; if (a.nom) return a.nom; const e = a.uai && D.etablissements.find(x => x.uai === a.uai); return e ? e.nom : (a.uai + (a.type ? ' (' + a.type + ')' : '')); },
  etabs(p) { return (p.affectations || []).map(a => { const e = !a.nom && a.uai && D.etablissements.find(x => x.uai === a.uai); return (a.nom || (e && e.nom) || a.uai) + ((a.ville || (e && e.ville)) ? ' (' + (a.ville || e.ville) + ')' : ''); }).join(' · '); },
  uais(p) { return (p.affectations || []).map(a => a.uai).filter(Boolean); },
  dep(p) { const a = (p.affectations || []).find(x => x.principal) || (p.affectations || [])[0]; return (a && depFromUAI(a.uai)) || p.departement || depFromCP(p.cp); },
  key(p) { return norm(p.nom) + '|' + norm(p.prenom) + '|' + (p.dateNaissance || ''); },
  keyLoose(p) { return norm(p.nom) + '|' + norm(p.prenom); },
  /* Période de cotisation en cours selon le calendrier */
  periode(cal, date) {
    const d = date ? new Date(date + 'T12:00') : new Date();
    const y = d.getFullYear();
    if (cal === 'civil') return String(y);
    return d.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  },
  periodePrec(cal) { const c = P.periode(cal); if (cal === 'civil') return String(+c - 1); const y = +c.slice(0, 4); return `${y - 1}-${y}`; },
  periodeDebut(per) { return /^\d{4}$/.test(per) ? per + '-01-01' : per.slice(0, 4) + '-09-01'; },
  normPeriode(v, cal) {
    const s = String(v || '').trim(); if (!s) return '';
    let m = s.match(/^(\d{4})\s*[-\/]\s*(\d{2,4})$/); if (m) { const a = +m[1]; return `${a}-${a + 1}`; }
    m = s.match(/^(\d{2})\s*[-\/]\s*(\d{2})$/); if (m && (+m[2] === (+m[1] + 1) % 100)) { const a = 2000 + +m[1]; return `${a}-${a + 1}`; }
    if (/^\d{4}$/.test(s)) { return cal === 'civil' ? s : `${s}-${+s + 1}`; }
    const d = parseDate(s); return d ? P.periode(cal, d) : '';
  },
  periodeFin(per) { return /^\d{4}$/.test(per) ? per + '-12-31' : per.slice(5, 9) + '-08-31'; },
  /* l'historique peut mélanger les deux calendriers (ex. adhérent passé de janv.-déc. à sept.-août) */
  derniere(p) { const l = (p.cotisations || []).map(c => c.periode).filter(Boolean).sort((a, b) => P.periodeFin(a) < P.periodeFin(b) ? -1 : 1); return l[l.length - 1] || ''; },
  syncCal(p) { const d = P.derniere(p); if (d) p.calendrier = /^\d{4}$/.test(d) ? 'civil' : 'scolaire'; },
  /* statut de cotisation : ajour | retard (a payé la période précédente) | ancien | inconnu | nonadh */
  cotis(p) {
    if (p.categorie !== 'adherent') return 'nonadh';
    const last = P.derniere(p);
    if (!last) return 'inconnu';
    const t = todayISO();
    if ((p.cotisations || []).some(c => c.periode && P.periodeDebut(c.periode) <= t && t <= P.periodeFin(c.periode))) return 'ajour';
    const d = new Date(); d.setFullYear(d.getFullYear() - 1); const ilYaUnAn = dateObjToISO(d);
    return P.periodeFin(last) >= ilYaUnAn ? 'retard' : 'ancien';
  },
  cotisTag(p) {
    const c = P.cotis(p);
    if (p.situationNat && /DECED/.test(p.situationNat)) return '<span class="tag ko">Décédé·e</span>';
    return { ajour: '<span class="tag ok">À jour</span>', retard: '<span class="tag w">À relancer</span>', ancien: '<span class="tag ko">Ancien adhérent</span>', inconnu: '<span class="tag">Cotisation ?</span>', nonadh: `<span class="tag v">${esc(REF.categories[p.categorie] || p.categorie)}</span>` }[c];
  },
  anciennete(p) {
    const deb = p.datePremiereAdhesion || (p.cotisations.length ? P.periodeDebut(p.cotisations.map(c => c.periode).sort()[0]) : '');
    if (!deb) return '';
    const ms = Date.now() - new Date(deb + 'T12:00').getTime();
    const ans = Math.floor(ms / (365.25 * 86400000)); const n = new Set(p.cotisations.map(c => c.periode)).size;
    return `depuis le ${fmtDate(deb)} (${ans < 1 ? 'moins d\'un an' : plural(ans, 'an')}${n ? ', ' + plural(n, 'cotisation') + ' enregistrée' + (n > 1 ? 's' : '') : ''})`;
  },
  visibles() {
    if (can('adh.voir_tout')) return D.personnes.filter(p => !p.archive);
    const per = ME._per || Droits.perimetre(ME); const etabs = per.etabs || [], deps = per.deps || [];
    return D.personnes.filter(p => !p.archive && (p.militant === ME.id || P.uais(p).some(u => etabs.includes(u)) || deps.includes(P.dep(p))));
  },
  touch(p, fields) { p.maj = nowISO(); p.majPar = ME ? ME.id : ''; (fields || []).forEach(f => p.localEdits[f] = nowISO()); save(); }
};

/* ---------- Session & droits ---------- */
function can(perm) { if (!ME) return false; if (!ME._perms) Droits.rafraichir(); return ME._perms.has(perm); }
function userName(id) { const u = D.users.find(x => x.id === id); return u ? (u.prenom + ' ' + u.nom).trim() : ''; }
const Auth = {
  async hashPin(pin, salt) { return Crypto.hash(salt + ':' + pin); },
  render() {
    const box = $('#login'); box.classList.remove('hidden'); $('#app').classList.add('hidden');
    const logos = `<div class="logos"><img src="img/logo-snetaa.png" alt="SNETAA-FO"><img src="img/logo-fnec.png" alt="FNEC FP-FO" style="max-height:56px"></div>`;
    if (!D.users.length) {
      box.innerHTML = `<div class="loginbox">${logos}<h1>Première ouverture</h1><p class="mut small">Création du compte administrateur principal. Les données restent sur cet appareil.</p>
      <div class="frow"><div class="f"><label>Prénom</label><input id="su_prenom" value="Christophe"></div><div class="f"><label>Nom</label><input id="su_nom" value="DENAGE"></div></div>
      <div class="f"><label>Courriel de connexion (personnel de préférence)</label><input id="su_mail" type="email" placeholder="prenom.nom@exemple.fr"></div>
      <div class="frow"><div class="f"><label>Code personnel (6 à 10 chiffres)</label><input id="su_pin" type="password" inputmode="numeric"></div><div class="f"><label>Confirmer</label><input id="su_pin2" type="password" inputmode="numeric"></div></div>
      <button class="btn" style="width:100%;justify-content:center" onclick="Auth.setup()">Créer et entrer</button>
      <p class="small mut" style="margin-top:1rem">Vous avez déjà une sauvegarde ? <a href="#" onclick="Params.restaurer();return false">Restaurer une sauvegarde</a></p>
      <div class="alert small" style="margin-top:1rem"><b>Tu as reçu une invitation par mail ?</b> Ne crée pas de compte : <button class="btn sm" onclick="Secu.ouvrir()">Ouvrir mon invitation</button></div></div>`;
      return;
    }
    const users = D.users.filter(u => u.actif !== false && u.pin);
    box.innerHTML = `<div class="loginbox">${logos}<h1 style="text-align:center">Gestion syndicale</h1><p class="mut small" style="text-align:center">Orléans-Tours</p>
      <div class="f"><label>Courriel</label><input id="li_user" type="email" autocomplete="username" value="${esc(localStorage.getItem('snetaa-lastmail') || ((users.find(u => u.id === localStorage.getItem('snetaa-lastuser')) || {}).email) || '')}" onkeydown="if(event.key==='Enter')$('#li_pin').focus()"></div>
      <div class="f"><label>Code personnel</label><input id="li_pin" type="password" inputmode="numeric" autocomplete="current-password" onkeydown="if(event.key==='Enter')Auth.login()"></div>
      <button class="btn" style="width:100%;justify-content:center" onclick="Auth.login()">Entrer</button>
      <p class="small mut" style="margin-top:1rem;text-align:center"><a href="#" onclick="Params.restaurer();return false">Restaurer une sauvegarde</a> · <a href="#" onclick="Auth.importPaquet();return false">Ouvrir un paquet militant</a></p>
      <p style="text-align:center"><button class="btn sec sm" onclick="Secu.ouvrir()">✉ J'ai reçu une invitation</button></p></div>`;
    setTimeout(() => { const f = $('#li_user') && $('#li_user').value ? $('#li_pin') : $('#li_user'); f && f.focus(); }, 50);
  },
  async setup() {
    const pin = $('#su_pin').value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test($('#su_mail').value.trim())) return UI.toast('Indique ton courriel de connexion', 'r');
    const errp = Secu.pinValide(pin); if (errp) return UI.toast(errp, 'r');
    if (pin !== $('#su_pin2').value.trim()) return UI.toast('Les deux PIN diffèrent', 'r');
    const salt = uid();
    const u = { id: uid(), prenom: $('#su_prenom').value.trim(), nom: $('#su_nom').value.trim().toUpperCase(), email: $('#su_mail').value.trim(), role: 'admin', salt, pin: await Auth.hashPin(pin, salt), pinLong: pin.length, actif: true, perimetre: { etabs: [], deps: [] }, created: nowISO() };
    D.users.push(u); await _saveNow(); Auth.enter(u);
    log('Création du compte administrateur', userName(u.id));
  },
  async login() {
    const u = Compte.trouver($('#li_user').value); const pin = $('#li_pin').value.trim();
    if (!u) { $('#li_pin').value = ''; return UI.toast('Courriel ou code incorrect', 'r'); }
    const bl = Secu.bloque(u); if (bl) { $('#li_pin').value = ''; return UI.modal('Accès suspendu', `<p>${esc(bl)}</p>`, [{ label: 'OK' }]); }
    if (await Auth.hashPin(pin, u.salt) !== u.pin) {
      $('#li_pin').value = ''; const n = await Secu.echec(u);
      return UI.toast(n >= 5 ? 'Code incorrect — accès suspendu temporairement' : `Code incorrect (${n} essai${n > 1 ? 's' : ''} sur 5 avant suspension)`, 'r');
    }
    Secu.reussite(u); localStorage.setItem('snetaa-lastuser', u.id); if (u.email) localStorage.setItem('snetaa-lastmail', u.email);
    if (u.pinProvisoire || (u.pinLong || 0) < 6) await Secu.imposerChangement(u);
    Auth.enter(u); log('Connexion');
  },
  enter(u) {
    ME = u; Droits.rafraichir(); sessionStorage.setItem('snetaa-session', u.id);
    $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
    UI.renderNav(); UI.renderUser(); App.route(); Auth.armLock();
    if (typeof Sauv !== 'undefined') setTimeout(() => Sauv.verifierAuDemarrage(), 1200);
    if (typeof Alertes !== 'undefined') Alertes.demarrer();
  },
  logout() { log('Déconnexion'); ME = null; sessionStorage.removeItem('snetaa-session'); location.hash = ''; Auth.render(); },
  armLock() {
    const mins = +D.meta.lockMinutes || 0; if (!mins) return;
    let t; const reset = () => { clearTimeout(t); t = setTimeout(() => { if (ME) { UI.toast('Session verrouillée (inactivité)'); Auth.logout(); } }, mins * 60000); };
    ['click', 'keydown', 'touchstart'].forEach(e => document.addEventListener(e, reset, { passive: true })); reset();
  },
  async importPaquet() { if ((typeof Votants !== "undefined" && Votants)) Votants.ouvrirPaquetDepuisLogin(); }
};

/* ---------- Interface ---------- */
const UI = {
  sel: new Set(),
  toast(msg, cls) { const t = document.createElement('div'); t.className = 'toast ' + (cls || ''); t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3800); },
  modal(title, html, buttons, opts) {
    opts = opts || {};
    return new Promise(res => {
      const m = $('#modal'); m.className = 'modal' + (opts.wide ? ' wide' : '');
      m.innerHTML = `<div class="mhead"><h2>${esc(title)}</h2><button class="x" aria-label="Fermer">×</button></div><div class="mbody">${html}</div>` +
        (buttons && buttons.length ? `<div class="mfoot">${buttons.map((b, i) => `<button class="btn ${b.cls || (i < buttons.length - 1 ? 'sec' : '')}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div>` : '');
      $('#modalWrap').classList.remove('hidden');
      const close = v => { $('#modalWrap').classList.add('hidden'); m.innerHTML = ''; res(v); };
      UI._close = close;
      m.querySelector('.x').onclick = () => close(null);
      $$('.mfoot button', m).forEach(b => b.onclick = async () => {
        const bt = buttons[+b.dataset.i];
        if (bt.onClick) { const r = await bt.onClick(m); if (r === false) return; close(r === undefined ? bt.value : r); }
        else close(bt.value);
      });
      const f = m.querySelector('input,select,textarea'); if (f && !opts.nofocus) setTimeout(() => f.focus(), 30);
    });
  },
  close(v) { if (UI._close) UI._close(v); },
  confirm(msg, ok) { return UI.modal('Confirmation', `<p>${msg}</p>`, [{ label: 'Annuler', value: false }, { label: ok || 'Confirmer', value: true, cls: 'red' }]); },
  prompt(title, label, val, type) {
    return UI.modal(title, `<div class="f"><label>${esc(label)}</label>${type === 'textarea' ? `<textarea id="_prompt" style="min-height:200px">${esc(val || '')}</textarea>` : `<input id="_prompt" type="${type || 'text'}" value="${esc(val || '')}" onkeydown="if(event.key==='Enter'){UI.close(this.value)}">`}</div>`,
      [{ label: 'Annuler', value: null }, { label: 'Valider', onClick: m => m.querySelector('#_prompt').value }]);
  },
  toggleNav() { $('#nav').classList.toggle('open'); },
  renderUser() {
    $('#userbox').innerHTML = `<div class="avatar">${esc((ME.prenom || '?')[0] + (ME.nom || '?')[0])}</div><div class="uname" style="cursor:pointer" title="Mon compte" onclick="Compte.ouvrir()">${esc(ME.prenom + ' ' + ME.nom)}<br><span class="mut">${esc(Droits.libelle(ME))}</span></div><button class="btn sm sec" onclick="Auth.logout()" title="Se déconnecter">⏻</button>`;
  },
  navItems() {
    const n = [];
    n.push(['', 'Accueil', '⌂', null, 'Général']);
    n.push(['adherents', 'Fichier adhérents', '👥', 'adh.voir', 'Adhérents']);
    n.push(['import', 'Import & assainissement', '⇪', 'adh.importer', 'Adhérents']);
    if (ME && ME.role === 'admin') n.push(['validations', 'Modifications à valider', '✓', null, 'Adhérents', () => Valid.attente().length]);
    n.push(['national', 'Différences → national', '⇄', 'adh.national', 'Adhérents', () => Adh.countDiffs()]);
    n.push(['majadh', 'Mises à jour par l\'adhérent', '✉', 'adh.modifier', 'Adhérents']);
    n.push(['doublons', 'Doublons', '⧉', 'adh.modifier', 'Adhérents', () => Doublons.detecter().length]);
    n.push(['cotisations', 'Cotisations & relances', '€', 'adh.cotis', 'Adhérents']);
    n.push(['mutations', 'Suivi des mutations', '⇆', 'adh.voir', 'Adhérents']);
    n.push(['votants', 'Cahier de votants', '☑', 'vot.voir', 'Élections 2026']);
    n.push(['repartition', 'Répartition militants', '⚑', 'vot.repartir', 'Élections 2026']);
    n.push(['relais', 'Relais de vote', '🤝', 'vot.voir', 'Élections 2026']);
    n.push(['emargement', 'Qui a voté ? (3-10 déc.)', '✔', 'vot.emarg', 'Élections 2026']);
    n.push(['bilan', 'Tableau de bord élections', '▦', 'vot.voir', 'Élections 2026']);
    n.push(['modeles', 'Mails & SMS types', '✎', 'com.envoyer', 'Communication']);
    n.push(['journaux', 'La Lettre (journal)', '🗞', null, 'Communication']);
    n.push(['publications', 'Publications & adhésion', '📰', 'com.envoyer', 'Communication']);
    n.push(['videos', 'Vidéos & podcasts', '▶', 'com.envoyer', 'Communication']);
    n.push(['reunions', 'Réunions & présences', '◷', 'reu.voir', 'Vie syndicale']);
    n.push(['mandats', 'Mandats S1 / S2 / S3', '★', 'adh.voir', 'Vie syndicale']);
    n.push(['agenda', 'Agenda & congés scolaires', '📅', null, 'Vie syndicale']);
    n.push(['sections', 'Sections académiques', '☎', null, 'Vie syndicale']);
    n.push(['snetaa-national', 'SNETAA national', '🏛', null, 'Vie syndicale']);
    n.push(['rectorat-dpe', 'Rectorat & DPE', '🏢', null, 'Vie syndicale']);
    n.push(['etabs', 'Établissements', '🏫', 'adh.voir', 'Vie syndicale']);
    n.push(['carte', 'Carte & déplacements', '🗺', 'adh.voir', 'Vie syndicale']);
    n.push(['frais', 'Déclarations de frais', '🧾', 'frais.saisir', 'Finances', () => Frais.aTraiter()]);
    n.push(['treso', 'Trésorerie', '🏦', 'tres.voir', 'Finances']);
    n.push(['users', 'Utilisateurs & droits', '🔑', 'adm.users', 'Administration']);
    n.push(['params', 'Paramètres', '⚙', 'adm.params', 'Administration']);
    n.push(['sauvegarde', 'Sauvegarde', '💾', 'adm.sauvegarde', 'Administration']);
    n.push(['journal', 'Journal des actions', '☰', 'adm.journal', 'Administration']);
    n.push(['aide', 'Aide & démarrage', '?', null, 'Administration']);
    return n.filter(i => !i[3] || can(i[3]));
  },
  renderNav() {
    let g = '', h = '';
    UI.navItems().forEach(([r, l, ico, , grp, badge]) => {
      if (grp !== g) { h += `<div class="grp">${esc(grp)}</div>`; g = grp; }
      const b = badge ? badge() : 0;
      h += `<a href="#/${r}" data-r="${r}"><span class="ico">${ico}</span>${esc(l)}${b ? `<span class="badge">${b}</span>` : ''}</a>`;
    });
    h += `<div class="navfoot"><img src="img/logo-fnec.png" alt="FNEC FP-FO"><span class="small">FNEC FP-FO<br>Force Ouvrière</span></div>`;
    h += `<div class="small" style="padding:1rem;opacity:.55;font-size:.72rem">Version ${APP_VERSION}</div>`;
    $('#nav').innerHTML = h;
  },
  globalSearch(q) {
    const box = $('#gresults'); q = norm(q);
    if (q.length < 2) { box.classList.add('hidden'); return; }
    const res = P.visibles().filter(p => norm(P.full(p) + ' ' + (p.email || '') + ' ' + P.etab(p)).includes(q)).slice(0, 25);
    box.innerHTML = res.length ? res.map(p => `<div onclick="UI.goFiche('${p.id}')"><b>${esc(P.full(p))}</b> ${P.cotisTag(p)}<br><span class="small mut">${esc(STATUT(p.statut)[1])} · ${esc(P.etab(p))}</span></div>`).join('') : '<div class="mut">Aucun résultat</div>';
    box.classList.remove('hidden');
  },
  goFiche(id) { $('#gresults').classList.add('hidden'); $('#globalSearch').value = ''; App.go('fiche/' + id); },
  tabs(id, list, cur, fn) { return `<div class="tabs" id="${id}">${list.map(([k, l]) => `<button class="${k === cur ? 'on' : ''}" onclick="${fn}('${k}')">${esc(l)}</button>`).join('')}</div>`; },
  opts(list, cur, empty) { return (empty != null ? `<option value="">${esc(empty)}</option>` : '') + list.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(cur == null ? '' : cur) ? 'selected' : ''}>${esc(l)}</option>`; }).join(''); },
  militantsOpts(cur, empty) { return UI.opts(D.users.filter(u => u.actif !== false).map(u => [u.id, u.prenom + ' ' + u.nom]), cur, empty); },
  bars(rows, total) { // rows: [label, n, color]
    const max = Math.max(1, ...rows.map(r => r[1]));
    return `<div class="hbars">${rows.map(([l, n, c]) => `<div class="row"><div>${esc(l)}</div><div class="bar"><span style="width:${(n / max * 100).toFixed(1)}%;${c ? 'background:' + c : ''}"></span></div><div class="right">${n}${total ? ` <span class="mut small">${Math.round(n / total * 100)}%</span>` : ''}</div></div>`).join('')}</div>`;
  },
  /* sélection multiple */
  selToggle(id, on) { on ? UI.sel.add(id) : UI.sel.delete(id); UI.selInfo(); },
  selAll(ids, on) { ids.forEach(id => on ? UI.sel.add(id) : UI.sel.delete(id)); $$('input.rowsel').forEach(c => c.checked = on); UI.selInfo(); },
  selInfo() { const e = $('#selinfo'); if (e) e.textContent = UI.sel.size ? UI.sel.size + ' sélectionné(s)' : ''; }
};
document.addEventListener('click', e => { if (!e.target.closest('#gresults') && !e.target.closest('#globalSearch')) { const g = $('#gresults'); if (g) g.classList.add('hidden'); } });

/* ---------- Application / routes ---------- */
const App = {
  routes: {},
  async start() {
    await Store.open();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
    D = await Store.get('db');
    if (!D) { D = defaultDB(); }
    migrate(); await _saveNow();
    if (/[?&]code=/.test(location.search) && typeof Sauv !== 'undefined') await Sauv.retourOAuth();
    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
      const avait = !!navigator.serviceWorker.controller; let fait = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!avait || fait) return; fait = true; UI.toast('Nouvelle version de l\'application : rechargement…', 'g'); setTimeout(() => location.reload(), 900); });
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => { });
    }
    window.addEventListener('hashchange', () => App.route());
    window.addEventListener('beforeunload', () => { if (D) Store.set('db', JSON.parse(JSON.stringify(D))); });
    const sid = sessionStorage.getItem('snetaa-session'); const u = sid && D.users.find(x => x.id === sid && x.actif !== false);
    if (u) Auth.enter(u); else Auth.render();
  },
  go(r) { location.hash = '#/' + r; },
  route() {
    if (!ME) return;
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, '')); const [r, ...args] = h.split('/');
    $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.r === r || (r === 'fiche' && a.dataset.r === 'adherents')));
    $('#nav').classList.remove('open');
    Droits.rafraichir();
    const fn = App.routes[r || ''] || App.routes[''];
    UI.sel.clear();
    try { $('#main').innerHTML = ''; fn(...args); } catch (e) { console.error(e); $('#main').innerHTML = `<div class="alert r">Erreur d'affichage : ${esc(e.message)}</div>`; }
    window.scrollTo(0, 0);
  },
  refresh() { App.route(); UI.renderNav(); }
};

/* ---------- Accueil ---------- */
App.routes[''] = function () {
  const vis = P.visibles(); const adh = vis.filter(p => p.categorie === 'adherent');
  const cnt = k => adh.filter(p => P.cotis(p) === k).length;
  const el = D.meta.elections; const j = Math.ceil((new Date(el.debut + 'T08:00') - new Date()) / 86400000);
  const jf = Math.ceil((new Date(el.fin + 'T18:00') - new Date()) / 86400000);
  const elec = j > 0 ? `J-${j} avant l'ouverture du vote (${fmtDate(el.debut)})` : (jf >= 0 ? `Vote en cours jusqu'au ${fmtDate(el.fin)}` : 'Scrutin terminé');
  const votes = vis.filter(p => p.vote && p.vote.aVote).length;
  const backupAge = D.meta.lastBackup ? Math.floor((Date.now() - new Date(D.meta.lastBackup)) / 86400000) : null;
  let h = `<div class="pagehead"><div><h1>Bonjour ${esc(ME.prenom)}</h1><div class="mut">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div></div></div>`;
  if (can('adm.sauvegarde') && (backupAge === null || backupAge > 7) && D.personnes.length)
    h += `<div class="alert w"><b>Sauvegarde :</b> ${backupAge === null ? 'aucune sauvegarde faite' : 'dernière sauvegarde il y a ' + backupAge + ' jours'}. Les données sont stockées dans ce navigateur : sauvegarde régulièrement. <a href="#/sauvegarde">Sauvegarder maintenant</a></div>`;
  if (typeof Equipe !== 'undefined') h += Equipe.carteMembre();
  if (!ME.pid && D.personnes.length) h += `<div class="alert w"><b>Ton compte n'est pas relié à ta fiche adhérent.</b> <a href="#" onclick="Compte.ouvrir();return false">Le relier et choisir ton courriel de connexion</a></div>`;
  h += `<div class="alert"><b>Élections professionnelles :</b> ${elec}</div>`;
  const uaiInc = Array.from(new Set(D.personnes.flatMap(P.uais))).filter(u => /^\d{7}[A-Z]$/.test(u) && !D.etablissements.some(e => e.uai === u)).length;
  if (uaiInc && can('adm.params')) h += `<div class="alert w"><b>${uaiInc} établissement(s)</b> de ton fichier (collèges, SEGPA, EREA…) ne sont pas encore identifiés. <a href="#" onclick="Etabs.annuaire();return false">Les récupérer dans l'annuaire officiel</a> (connexion internet).</div>`;
  h += `<div class="tiles">`;
  if (can('adh.voir')) h += `<div class="tile" onclick="App.go('adherents')"><div class="n">${cnt('ajour')}</div><div class="l">adhérents à jour (${P.periode('scolaire')})</div></div>
    <div class="tile o" onclick="App.go('cotisations')"><div class="n">${cnt('retard')}</div><div class="l">cotisations à relancer</div></div>
    <div class="tile b" onclick="App.go('adherents')"><div class="n">${cnt('ancien') + cnt('inconnu')}</div><div class="l">anciens adhérents / cotisation inconnue</div></div>
    <div class="tile v" onclick="App.go('votants')"><div class="n">${vis.filter(p => p.categorie === 'sympathisant').length}</div><div class="l">sympathisants</div></div>
    <div class="tile b" onclick="Adh.filtreRapide('emailInvalide')"><div class="n">${vis.filter(p => p.emailInvalide).length}</div><div class="l">adresses mail en erreur</div></div>`;
  if (can('adh.national')) h += `<div class="tile" onclick="App.go('national')"><div class="n">${Adh.countDiffs()}</div><div class="l">fiches modifiées à signaler au national</div></div>`;
  if (can('vot.voir')) h += `<div class="tile g" onclick="App.go('bilan')"><div class="n">${votes}</div><div class="l">de nos contacts ont voté</div></div>`;
  if (can('frais.valider')) h += `<div class="tile o" onclick="App.go('frais')"><div class="n">${Frais.aTraiter()}</div><div class="l">déclarations de frais à traiter</div></div>`;
  if (can('tres.voir')) h += `<div class="tile g" onclick="App.go('treso')"><div class="n" style="font-size:1.2rem">${fmtEUR(Treso.soldeTotal())}</div><div class="l">solde de trésorerie</div></div>`;
  h += `</div>`;
  if (can('vot.voir')) {
    const steps = [
      ['Importer le fichier adhérents', 'import', D.imports.length > 0, 'adh.importer'],
      ['Ajouter les sympathisants (saisie rapide)', 'votants', vis.some(p => p.categorie === 'sympathisant'), 'vot.modifier'],
      ['Créer les comptes des militants', 'users', D.users.length > 1, 'adm.users'],
      ['Répartir les contacts entre militants', 'repartition', vis.some(p => p.militant), 'vot.repartir'],
      ['Préparer les mails et SMS types', 'modeles', true, 'com.envoyer'],
      ['Du 3 au 10 décembre : importer chaque jour la liste des votants', 'emargement', D.emargements.length > 0, 'vot.emarg']
    ].filter(s => can(s[3]));
    h += `<div class="card"><h2 style="margin-top:0">Démarrage rapide — cahier de votants</h2>${steps.map((s, i) => `<div class="chk" style="margin:.4rem 0">${s[2] ? '✅' : '⬜'} <a href="#/${s[1]}">${i + 1}. ${esc(s[0])}</a></div>`).join('')}</div>`;
  }
  if (can('adm.journal')) h += `<div class="card"><h3 style="margin-top:0">Dernières actions</h3>${D.journal.slice(0, 8).map(j => `<div class="small"><span class="mut">${fmtDT(j.d)}</span> — ${esc(userName(j.u))} : ${esc(j.a)} ${esc(j.x)}</div>`).join('') || '<span class="mut">—</span>'}</div>`;
  h += Liens.carte();
  $('#main').innerHTML = h;
};

/* ---------- Liens utiles (accueil, fiche, paramètres) ---------- */
const Liens = {
  DEFAUT: [
    { id: 'annuaire-rectorat', nom: 'Annuaire des personnels du rectorat (Orléans-Tours)', url: 'https://bv.ac-orleans-tours.fr/annuaire/Login.jsp', note: 'Accès avec l\'identifiant académique' },
    { id: 'snetaa', nom: 'Site du SNETAA-FO national', url: 'https://www.snetaa.org/', note: '' },
    { id: 'elections', nom: 'Portail des élections professionnelles 2026', url: 'https://www.education-superieur-recherche-jeunesse-sports.gouv.fr/electionspro2026', note: 'Espace électeur et vote' },
    { id: 'ensap', nom: 'ENSAP (bulletins de paie, code de vote)', url: 'https://ensap.gouv.fr/', note: '' }
  ],
  liste() { if (!D.meta.liens) D.meta.liens = JSON.parse(JSON.stringify(Liens.DEFAUT)); return D.meta.liens; },
  get(id) { return Liens.liste().find(l => l.id === id); },
  carte() {
    const l = Liens.liste(); if (!l.length) return '';
    return `<div class="card" style="margin-top:1rem"><h3 style="margin-top:0">🔗 Liens utiles</h3><div style="display:flex;flex-wrap:wrap;gap:.5rem">${l.map(x => `<a class="btn sec sm" href="${esc(x.url)}" target="_blank" rel="noopener" title="${esc(x.note || x.url)}">${esc(x.nom)}</a>`).join('')}</div>${can('adm.params') ? '<p class="small mut" style="margin-bottom:0"><a href="#/params">Modifier les liens</a> (Paramètres)</p>' : ''}</div>`;
  },
  annuaire(id) {
    const p = id && P.get(id), a = Liens.get('annuaire-rectorat'); if (!a) return UI.toast('Lien de l\'annuaire absent (Paramètres → Liens utiles)', 'r');
    if (p) copyText((p.nom || '').toUpperCase() + ' ' + (p.prenom || ''));
    openLink(a.url); if (p) UI.toast('Nom copié : colle-le dans la recherche de l\'annuaire', 'g');
  },
  paramCarte() {
    return `<div class="card"><h3 style="margin-top:0">Liens utiles</h3><p class="small mut">Affichés sur l'accueil. Le lien « annuaire » sert aussi au bouton « Chercher dans l'annuaire du rectorat » des fiches.</p>
      <div class="tablewrap"><table><thead><tr><th>Nom</th><th>Adresse</th><th></th></tr></thead><tbody>${Liens.liste().map((x, i) => `<tr><td><input value="${esc(x.nom)}" onchange="Liens.liste()[${i}].nom=this.value;save()"></td><td><input value="${esc(x.url)}" onchange="Liens.liste()[${i}].url=this.value.trim();save()"></td><td><button class="btn sm ghost" onclick="Liens.liste().splice(${i},1);save();App.route()">✕</button></td></tr>`).join('')}</tbody></table></div>
      <p><button class="btn sm sec" onclick="Liens.liste().push({id:uid(),nom:'Nouveau lien',url:'https://'});save();App.route()">+ Ajouter un lien</button></p></div>`;
  }
};
