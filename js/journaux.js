/* =========================================================
   La Lettre du SNETAA-FO Orléans-Tours — journal mensuel et numéros spéciaux
   Tous les numéros publiés, à lire, télécharger et partager.

   AJOUTER UN NUMÉRO (à chaque parution) :
   1. Déposer le PDF dans journaux/  (nom : Lettre_SNETAA-FO_OT_nXX_AAAA-MM.pdf)
   2. Déposer la couverture (page 1 en JPEG, ~500 px de large) dans journaux/couv/nXX.jpg
   3. Ajouter une entrée EN TÊTE de JOURNAUX_REF ci-dessous
   4. Dans sw.js, augmenter le numéro de CACHE ; dans core.js, APP_VERSION
   ========================================================= */
'use strict';
const JOURNAUX_REF = [
  {
    num: 1, type: 'Mensuel', periode: 'Novembre 2026', date: '2026-11-03',
    titre: 'La Lettre du SNETAA-FO Orléans-Tours n° 1',
    une: 'La jeunesse a ouvert la voie : soutenons-la !',
    fichier: 'journaux/Lettre_SNETAA-FO_OT_n01_2026-11.pdf',
    couv: 'journaux/couv/n01.jpg',
    sommaire: [
      'Édito : la jeunesse a ouvert la voie, soutenons-la !',
      'Jeudi 5 novembre : tous en grève, tous dans la rue (lieux de rassemblement par département)',
      'La FNEC FP-FO informe : ce que nous portons le 5 novembre',
      'Annonces du 26 octobre : le compte n’y est pas',
      'Remplacements : un plan d’urgence en trompe-l’œil',
      'AESH : un statut enfin à portée de main ?',
      'Tribune du SNETAA-FO : partir des élèves réels',
      'Parcours en Y : deux semaines, toujours de trop',
      'Mouvement interacadémique 2027 : le calendrier à Orléans-Tours',
      'Élections professionnelles du 3 au 10 décembre : votre voix compte',
      'CAPLP 2027 et titularisation des contractuels',
      'Agenda des prochaines échéances'
    ]
  }
];

const Journaux = {
  // adresse publique de l'application (GitHub Pages), pour que les liens partagés s'ouvrent partout
  SITE: 'https://karaaahhhhhhhhhh.github.io/snetaa-ot/',
  base() { return /^https?:$/.test(location.protocol) ? new URL('./', location.href).href : Journaux.SITE; },
  lien(j) { return Journaux.base() + j.fichier; },
  liste() { return JOURNAUX_REF.slice().sort((a, b) => (a.date < b.date ? 1 : -1)); },
  dernier() { return Journaux.liste()[0]; },
  nom(j) { return (j.type === 'Mensuel' ? 'n° ' + j.num : j.type + (j.num ? ' n° ' + j.num : '')) + ' — ' + j.periode; },
  f: { q: '' },
  page() {
    const d = Journaux.dernier();
    $('#main').innerHTML = `<div class="pagehead"><div><h1>La Lettre du SNETAA-FO</h1><div class="mut small">Le journal mensuel de la section académique et ses numéros spéciaux : tous les numéros parus, à lire, télécharger et partager avec les collègues.</div></div></div>
      ${d ? `<div class="card jo-une">
        <a href="${esc(d.fichier)}" target="_blank" rel="noopener" class="jo-couv"><img src="${esc(d.couv)}" alt="Couverture ${esc(Journaux.nom(d))}"></a>
        <div class="jo-b"><span class="tag v">Dernier numéro</span>
          <h2 style="margin:.4rem 0 .1rem">${esc(Journaux.nom(d))}</h2>
          ${d.une ? `<div class="jo-titre">« ${esc(d.une)} »</div>` : ''}
          <ul class="jo-som">${(d.sommaire || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
          ${Journaux.boutons(d, true)}
        </div></div>` : '<div class="card mut">Aucun numéro publié pour l’instant.</div>'}
      <div class="toolbar" style="margin:1.2rem 0 .5rem"><h2 style="margin:0;font-size:1.05rem">Tous les numéros</h2> <input type="search" placeholder="Rechercher un sujet (AESH, mutations…)" style="max-width:280px" value="${esc(Journaux.f.q)}" oninput="Journaux.f.q=this.value;Journaux.render()"> <span class="small mut">${plural(JOURNAUX_REF.length, 'numéro')}</span></div>
      <div id="jo_liste" class="vi-grid"></div>
      <p class="small mut">Dans les mails et SMS types, la variable <code>{journal}</code> insère le titre et le lien du dernier numéro.</p>`;
    Journaux.render();
  },
  render() {
    const el = $('#jo_liste'); if (!el) return; const q = norm(Journaux.f.q);
    const l = Journaux.liste().filter(j => !q || norm(j.titre + ' ' + j.periode + ' ' + (j.une || '') + ' ' + (j.sommaire || []).join(' ')).includes(q));
    el.innerHTML = l.map(j => { const hit = q ? (j.sommaire || []).filter(t => norm(t).includes(q)) : [];
      return `<div class="vi-card"><a href="${esc(j.fichier)}" target="_blank" rel="noopener" class="jo-mini"><img loading="lazy" src="${esc(j.couv)}" alt=""></a>
      <div class="vi-b"><div class="vi-top"><b>${esc(Journaux.nom(j))}</b>${j.type !== 'Mensuel' ? `<span class="tag w">${esc(j.type)}</span>` : ''}</div>
        ${j.une ? `<div class="small">« ${esc(j.une)} »</div>` : ''}
        ${hit.length ? `<ul class="small" style="margin:0 0 0 1rem;padding:0">${hit.map(t => `<li><mark>${esc(t)}</mark></li>`).join('')}</ul>` : ''}
        ${Journaux.boutons(j)}</div></div>`; }).join('') || '<div class="card mut">Aucun numéro ne traite ce sujet.</div>';
  },
  boutons(j, grand) {
    const k = JOURNAUX_REF.indexOf(j), s = grand ? '' : 'sm ';
    return `<div class="vi-act"><a class="btn ${s}" href="${esc(j.fichier)}" target="_blank" rel="noopener">📖 Lire</a><a class="btn ${s}sec" href="${esc(j.fichier)}" download>⇩ Télécharger</a>
      <button class="btn ${s}ghost" onclick="Journaux.partager(${k},'copier')">Copier le lien</button><button class="btn ${s}ghost" onclick="Journaux.partager(${k},'whatsapp')">WhatsApp</button><button class="btn ${s}ghost" onclick="Journaux.partager(${k},'sms')">SMS</button><button class="btn ${s}ghost" onclick="Journaux.partager(${k},'mail')">Mail</button></div>`;
  },
  texte(j) { return j.titre + ' (' + j.periode + ')' + (j.une ? ' — « ' + j.une + ' »' : '') + ' : ' + Journaux.lien(j); },
  partager(k, canal) {
    const j = JOURNAUX_REF[k]; if (!j) return; const corps = Journaux.texte(j);
    if (canal === 'copier') return copyText(Journaux.lien(j));
    if (canal === 'whatsapp') return window.open('https://wa.me/?text=' + encodeURIComponent(corps), '_blank');
    if (canal === 'sms') { location.href = 'sms:?&body=' + encodeURIComponent(corps); return; }
    if (canal === 'mail') {
      const s = D.meta.syndicat || {};
      const objet = '[SNETAA-FO] ' + j.titre + ' — ' + j.periode;
      const txt = 'Chères et chers collègues,\n\nLe ' + (j.type === 'Mensuel' ? 'numéro ' + j.num + ' de La Lettre du SNETAA-FO Orléans-Tours' : j.titre) + ' (' + j.periode + ') est paru.'
        + (j.sommaire && j.sommaire.length ? '\n\nAu sommaire :\n' + j.sommaire.map(t => '• ' + t).join('\n') : '')
        + '\n\nÀ lire et à télécharger ici :\n' + Journaux.lien(j)
        + '\n\nUne question, une difficulté dans votre établissement ? Écrivez-nous' + (s.mail ? ' à ' + s.mail : '') + ' en indiquant vos nom, prénom, discipline, établissement et numéro de téléphone : nous vous rappellerons.'
        + '\n\nN’hésitez pas à transmettre cette Lettre à vos collègues.\n\nBien syndicalement,\n\n' + (s.signature || '');
      location.href = 'mailto:?subject=' + encodeURIComponent(objet) + '&body=' + encodeURIComponent(txt);
    }
  }
};
App.routes.journaux = () => Journaux.page();
