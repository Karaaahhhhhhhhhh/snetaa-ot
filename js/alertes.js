/* =========================================================
   Alertes Dropbox : retours déposés par les membres de l'équipe,
   sauvegarde plus récente faite depuis un autre appareil.
   Vérification à l'ouverture, au retour sur l'application et toutes les 10 minutes.
   ========================================================= */
'use strict';
const Alertes = {
  etat: { retours: 0, sauvegarde: null, verif: null },
  _t: null, _deja: '',
  demarrer() {
    clearInterval(Alertes._t);
    setTimeout(Alertes.verifier, 4000);
    Alertes._t = setInterval(Alertes.verifier, 10 * 60000);
    if (!Alertes._vis) { Alertes._vis = true; document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && ME && (!Alertes.etat.verif || Date.now() - Alertes.etat.verif > 120000)) Alertes.verifier(); }); }
  },
  actif() { return !!ME && typeof Sauv !== 'undefined' && Sauv.dbxEtat().connecte && navigator.onLine !== false; },
  async verifier() {
    if (!Alertes.actif()) return Alertes.afficher();
    const e = { retours: 0, sauvegarde: null, verif: Date.now() };
    try {
      if (can('adm.users')) e.retours = (await Equipe.canal.lister(Equipe.DOSSIER_RETOURS)).filter(x => x['.tag'] === 'file' && /\.snetaa$/i.test(x.name)).length;
    } catch (x) { /* dossier absent ou droits insuffisants */ }
    try {
      if (can('adm.sauvegarde')) { const d = await Sauv.derniereDistante(); if (Sauv.plusRecente(d)) e.sauvegarde = d; }
    } catch (x) { }
    Alertes.etat = e; Alertes.afficher(); Alertes.notifier();
  },
  texte() {
    const e = Alertes.etat, t = [];
    if (e.retours) t.push(plural(e.retours, 'retour') + ' déposé' + (e.retours > 1 ? 's' : '') + ' sur Dropbox par l\'équipe');
    if (e.sauvegarde) t.push('sauvegarde plus récente du ' + fmtDT(e.sauvegarde.server_modified) + (Sauv.appareilDe(e.sauvegarde.name) ? ' (depuis un ' + Sauv.appareilDe(e.sauvegarde.name) + ')' : ''));
    return t;
  },
  afficher() {
    let b = document.getElementById('alertbar');
    const t = Alertes.texte();
    if (!t.length) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'alertbar'; b.className = 'alertbar'; const m = document.getElementById('main'); m.parentNode.insertBefore(b, m); }
    const notif = 'Notification' in window && Notification.permission === 'default';
    b.innerHTML = `<span>🔔 ${esc(t.join(' · '))}</span>
      ${Alertes.etat.retours ? '<button class="btn sm" onclick="Equipe.recupererRetours().then(()=>Alertes.verifier())">⇩ Intégrer les retours</button>' : ''}
      ${Alertes.etat.sauvegarde ? '<button class="btn sm" onclick="Sauv.verifierAuDemarrage()">Voir la sauvegarde</button>' : ''}
      ${notif ? '<button class="btn sm sec" onclick="Notification.requestPermission().then(()=>Alertes.afficher())">Activer les notifications</button>' : ''}
      <button class="btn sm ghost" onclick="document.getElementById(\'alertbar\').remove()" title="Masquer jusqu\'à la prochaine vérification">✕</button>`;
  },
  notifier() {
    const t = Alertes.texte(), cle = t.join('|'); if (!t.length || cle === Alertes._deja) return; Alertes._deja = cle;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const opt = { body: t.join('\n'), icon: 'img/icon-192.png', tag: 'snetaa-dropbox' };
    try { new Notification('SNETAA-FO Orléans-Tours', opt); }
    catch (x) { if (navigator.serviceWorker) navigator.serviceWorker.ready.then(r => r.showNotification('SNETAA-FO Orléans-Tours', opt)).catch(() => { }); }
  }
};
