/* =========================================================
   Vidéos de la FNEC FP-FO (chaîne YouTube @fnecfp-fo8651) — liens publics à partager
   Liste relevée le 26/11/2026 (57 vidéos, de la plus récente à la plus ancienne)
   ========================================================= */
'use strict';
const VIDEOS_REF = [
  ['W0lScgmJSgQ', "Casa de Velázquez – défendre les personnels, défendre le service public !"],
  ['1yxRE6u-UEU', "Institut national du nautisme – des élus FO pour faire entendre vos revendications !"],
  ['Lh8ozu5k41E', "Santé et sécurité au travail – ni chambre d’enregistrement, ni accompagnement !"],
  ['eg6GREzV2lc', "Adjoints techniques de recherche et de formation – défendre les personnels et le service public !"],
  ['0e7AlGZGlkQ', "Militarisation – de l’argent pour l’École, pas pour la guerre !"],
  ['WUMOgQaEQVs', "Contractuels de l’enseignement supérieur et de la recherche – la titularisation, pas la précarité !"],
  ['m_HgJ6oTHxE', "Techniciens de recherche et de formation – défendre les personnels, défendre le service public !"],
  ['YBY6rZwAEPE', "IGR, IGE et ASI – défendre les personnels, défendre le service public !"],
  ['snGNr8PH75Y', "Contractuels enseignants, CPE et PsyEN 1 sur 2 – stop à la précarité !"],
  ['ozvXSzwVrcY', "Contractuels enseignants, CPE et PsyEN 2 sur 2 – carrière, salaires, droits !"],
  ['It5zF_p0X8Q', "AED et AESH – nous voulons devenir fonctionnaires !"],
  ['0st_F0nw7jY', "Contractuels ATPSS – le CDI n’est pas une titularisation !"],
  ['jFtXmSz4CfU', "Enseignement spécialisé – Force Ouvrière le défend !"],
  ['9tQQNZUGYQU', "Salaires – stop à la smicardisation !"],
  ['fIlLbO5n6I0', "AESH – un vrai statut, un vrai salaire !"],
  ['rSdTIPRtKps', "Qui vote quoi – seule FO refuse toutes ces attaques !"],
  ['SSQYJHDGF1c', "Statut – mérite, PPCR, retraites, cadre national"],
  ['ssu53vWjdjk', "CNED, contractuels – pas des variables d’ajustement !"],
  ['DnH12wbBvFQ', "CNED, tous les personnels – FO défend le service public !"],
  ['Chq2Ft-EU_4', "Personnels ouvriers des CROUS 2 sur 2 – FO agit et obtient des résultats !"],
  ['jydp_mhalKg', "Personnels ouvriers des CROUS 1 sur 2 – vos droits ne doivent pas disparaître !"],
  ['iFj-B2lnwWM', "Personnels des CROUS 2 sur 2 – salaires, action sociale, retraites !"],
  ['hJL-mWFqfVo', "Personnels des CROUS 1 sur 2 – défendre le réseau des CROUS !"],
  ['ttDO_Oo6xdY', "Contractuels des CROUS 2 sur 2 – face à la précarité, la solidarité !"],
  ['XodbJre51y4', "Contractuels des CROUS 1 sur 2 – travail égal, salaire égal, carrière égale !"],
  ['uyiGW3AgfBI', "Questionnaire VSS 2 sur 2 – des personnels, pas des questionnaires !"],
  ['GDZoGOBlaGE', "Questionnaire VSS 1 sur 2 – un questionnaire ne libère pas la parole !"],
  ['4KMDfUy3nFQ', "INFENES, CTSS et ASSAE – piliers de l’Éducation nationale, des moyens à la hauteur !"],
  ['9Txn1lYhpdM', "Les AESH en grève et au ministère pour leurs revendications"],
  ['z1A6goyRr3M', "Employés et techniciens de l’UNSS – votre vote est primordial !"],
  ['fX9G2DVeJg4', "Bibliothécaires assistants spécialisés – défendre les personnels, défendre le service public !"],
  ['Io_Mv2Y4obc', "Bibliothécaires et conservateurs – défendre les personnels, défendre le service public !"],
  ['e-wE7CtgAZA', "Magasiniers des bibliothèques – défendre les personnels, défendre le service public !"],
  ['odpk0iIN2Rw', "Laïcité – fonds publics à l’École publique, liberté de conscience !"],
  ['ayLxE6zLIFg', "CAPN 1 sur 2 – défendre les personnels !"],
  ['eGqIqkNe6Jk', "CAPN 2 sur 2 – défendre le service public !"],
  ['ukgN8ykPg3I', "Enseignants du privé sous contrat – pour être réellement défendus !"],
  ['j-sjMIhs7k8', "SAENES et TEN – assez des réorganisations, place à la reconnaissance !"],
  ['9y5JBg14PP8', "CTPS, professeurs de sport et CEPJ – les mêmes droits pour tous !"],
  ['y4sz3wGHtNM', "Jeunesse et Sports – défendre les personnels, défendre le service public !"],
  ['KoKzaL-6vsc', "ADJAENES et ATEE – des carrières qui avancent, des salaires qui suivent !"],
  ['LLE95meLhdk', "AAE – des cadres reconnus, pas une variable d’ajustement !"],
  ['6g1NcR7TjLQ', "Professeurs des écoles 2 sur 2 – défendre le service public !"],
  ['FwvO9V5dsQY', "Professeurs des écoles 1 sur 2 – défendre les personnels !"],
  ['eTJ8oVmhTwM', "IA-IPR, IEN et IJS 3 sur 3 – la CAPN, un mandat, pas une formalité !"],
  ['ABKdr7jzG6E', "IA-IPR, IEN et IJS 2 sur 3 – des experts pédagogiques, pas des managers !"],
  ['qsed1jg-7f0', "IA-IPR, IEN et IJS 1 sur 3 – le salaire sur le statut, pas sur le mérite !"],
  ['YEl7cPkZIfY', "PSC 2 sur 3 – qui paie le prix fort ?"],
  ['zYOzVo63wRg', "PSC 3 sur 3 – prévoyance, dénonçons l’accord !"],
  ['w4FCjim7PmE', "AEFE, tous les personnels – FO défend vos droits !"],
  ['p9bPKeTsuo0', "AEFE, administratifs et techniques – carrière, salaire, statut !"],
  ['h29H4xAsaM8', "AEFE, direction et inspection – des moyens, pas des injonctions !"],
  ['RRoRoMLYm-Q', "PSC 1 sur 3 – adhésion obligatoire, seule FO a dit non"],
  ['Dk0QoG2Q7K0', "Action sociale – un droit, pas une faveur !"],
  ['1hb7i9SAm2U', "AEFE, enseignants – non à la précarisation !"],
  ['L63d2roLjsM', "AESH – un vrai statut, un vrai salaire !"],
  ['ISl8mMBO-uk', "Contractuels – assez de la précarité !"]
];
const Videos = {
  /* Sources : vidéos FNEC FP-FO, vidéos SNETAA-FO, podcast « La Revue de Presse des PLP » */
  SOURCES: {
    fnec: { nom: 'Vidéos FNEC FP-FO', court: 'FNEC FP-FO', lien: 'https://www.youtube.com/@fnecfp-fo8651/videos', type: 'video' },
    snetaa: { nom: 'Vidéos SNETAA-FO', court: 'SNETAA-FO', lien: 'https://www.youtube.com/@SNETAA-FO/videos', type: 'video' },
    rdp: { nom: 'Podcast « La Revue de Presse des PLP »', court: 'Podcast RDP des PLP', lien: 'https://www.snetaa.org/podcast-la-revue-de-presse-des-plp/', type: 'podcast' }
  },
  // vidéos FNEC FP-FO les plus utiles pour les collègues de la voie professionnelle
  PRIO: ['rSdTIPRtKps', '9tQQNZUGYQU', 'SSQYJHDGF1c', 'snGNr8PH75Y', 'ozvXSzwVrcY', 'It5zF_p0X8Q', 'fIlLbO5n6I0', 'L63d2roLjsM', 'ISl8mMBO-uk', 'jFtXmSz4CfU', 'Lh8ozu5k41E', 'RRoRoMLYm-Q', 'YEl7cPkZIfY', 'zYOzVo63wRg', 'Dk0QoG2Q7K0', 'odpk0iIN2Rw', '0e7AlGZGlkQ', 'GDZoGOBlaGE', 'uyiGW3AgfBI', '9Txn1lYhpdM'],
  THEMES: {
    fnec: [
      ['vote', 'Élections & vote', /qui vote|votre vote|capn/i],
      ['precarite', 'Contractuels, AED, AESH', /contractuel|aesh|aed\b|atpss/i],
      ['salaires', 'Salaires, statut, protection sociale', /salaire|statut|psc|action sociale|retraite|smicard/i],
      ['travail', 'Conditions de travail, santé, VSS', /santé et sécurité|vss/i],
      ['ecole', 'École publique & enseignement', /laïcité|militarisation|enseignement spécialisé|professeurs des écoles|privé sous contrat/i],
      ['autres', 'Autres personnels et services', /./]
    ],
    snetaa: [
      ['vote', 'Élections professionnelles', /élection|election|votez|vote snetaa/i],
      ['greve', 'Grèves & mobilisations', /grève|mobilis/i],
      ['reforme', 'Réforme & avenir de la voie pro', /réforme|voie pro|parcours en y|bac pro|filière|enseignement professionnel|lycée pro|lycées pro|formation professionnelle|apprenti|affectation/i],
      ['metier', 'Métier, violences, conditions de travail', /violence|agression|profs|enseigner|sanitaire|fournitures|philo|école/i],
      ['autres', 'Vie du syndicat & divers', /./]
    ],
    rdp: null // regroupé par saison
  },
  src: 'fnec',
  theme(src, t) { return (Videos.THEMES[src] || []).find(x => x[2].test(t))[0]; },
  liste(src) {
    src = src || Videos.src;
    if (src === 'rdp') return (typeof PODCASTS_RDP_REF !== 'undefined' ? PODCASTS_RDP_REF : []).map(([titre, slug, saison], i) => ({ id: 'rdp' + i, titre, rang: i, url: 'https://podcasters.spotify.com/pod/show/snetaa/episodes/' + slug, theme: saison, src }));
    const l = src === 'snetaa' ? (typeof VIDEOS_SNETAA_REF !== 'undefined' ? VIDEOS_SNETAA_REF : []) : VIDEOS_REF;
    return l.map(([id, titre], i) => ({ id, titre, rang: i, url: 'https://youtu.be/' + id, prio: src === 'fnec' && Videos.PRIO.includes(id), theme: Videos.theme(src, titre), src }));
  },
  groupes(src) { if (src === 'rdp') { const g = []; Videos.liste('rdp').forEach(v => { if (!g.some(x => x[0] === v.theme)) g.push([v.theme, 'Saison ' + v.theme]); }); return g; } return Videos.THEMES[src].map(t => [t[0], t[1]]); },
  f: { q: '', th: '', prio: false },
  sel: new Map(),
  texte(v) { return v.titre + ' — ' + (v.src === 'rdp' ? 'podcast du SNETAA-FO' : 'vidéo ' + Videos.SOURCES[v.src].court) + ' : ' + v.url; },
  choisir(src) { Videos.src = src; Videos.f = { q: '', th: '', prio: false }; Videos.page(); },
  page() {
    const f = Videos.f, src = Videos.src, S = Videos.SOURCES[src], tous = Videos.liste(src), pod = S.type === 'podcast';
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Vidéos & podcasts</h1><div class="mut small">Liens publics prêts à partager (WhatsApp, SMS, mail). <a href="${S.lien}" target="_blank" rel="noopener">Ouvrir la source</a></div></div></div>
      <div class="pill-select vi-src">${Object.entries(Videos.SOURCES).map(([k, x]) => `<button type="button" class="${k === src ? 'on' : ''}" onclick="Videos.choisir('${k}')">${x.type === 'podcast' ? '🎧' : '▶'} ${esc(x.court)} <span class="mut">(${Videos.liste(k).length})</span></button>`).join('')}</div>
      <div class="card mo-bar">
        <div class="f" style="margin:0"><label>${pod ? 'Saison' : 'Thème'}</label><select onchange="Videos.f.th=this.value;Videos.render()"><option value="">${pod ? 'Toutes les saisons' : 'Tous les thèmes'}</option>${Videos.groupes(src).map(t => `<option value="${t[0]}" ${f.th === t[0] ? 'selected' : ''}>${esc(t[1])} (${tous.filter(v => v.theme === t[0]).length})</option>`).join('')}</select></div>
        ${src === 'fnec' ? `<div class="f" style="margin:0"><label>Sélection</label><div class="pill-select"><button type="button" class="${f.prio ? '' : 'on'}" onclick="Videos.f.prio=false;Videos.page()">Toutes</button><button type="button" class="${f.prio ? 'on' : ''}" onclick="Videos.f.prio=true;Videos.page()">⭐ Utiles pour nos collègues</button></div></div>` : ''}
        <div class="f" style="margin:0;flex:1;min-width:180px"><label>Rechercher</label><input type="search" placeholder="${pod ? 'date, numéro…' : 'AESH, réforme, salaires…'}" value="${esc(f.q)}" oninput="Videos.f.q=this.value;Videos.render()"></div>
      </div>
      <div id="vi_sel" class="alert small" style="display:none"></div>
      <div id="vi_liste" class="${pod ? 'vi-pods' : 'vi-grid'}"></div>`;
    Videos.render();
  },
  render() {
    const f = Videos.f, q = norm(f.q), el = $('#vi_liste'); if (!el) return;
    const src = Videos.src, pod = src === 'rdp';
    const l = Videos.liste(src).filter(v => (!f.th || v.theme === f.th) && (!f.prio || v.prio) && (!q || norm(v.titre).includes(q)));
    const chk = v => `<label class="small" title="Ajouter à la sélection à partager"><input type="checkbox" ${Videos.sel.has(v.src + ':' + v.id) ? 'checked' : ''} onchange="Videos.cocher('${v.src}','${v.id}',this.checked)"> sélectionner</label>`;
    const act = v => `<div class="vi-act"><button class="btn sm sec" onclick="Videos.partager([['${v.src}','${v.id}']],'copier')">Copier le lien</button><button class="btn sm ghost" onclick="Videos.partager([['${v.src}','${v.id}']],'whatsapp')">WhatsApp</button><button class="btn sm ghost" onclick="Videos.partager([['${v.src}','${v.id}']],'sms')">SMS</button><button class="btn sm ghost" onclick="Videos.partager([['${v.src}','${v.id}']],'mail')">Mail</button></div>`;
    el.innerHTML = l.map(v => pod
      ? `<div class="vi-pod"><a href="${v.url}" target="_blank" rel="noopener" class="vi-pl" title="Écouter">🎧</a><div class="vi-b"><div class="vi-top"><b>${esc(v.titre)}</b>${chk(v)}</div><div class="small mut">Saison ${esc(v.theme)}</div>${act(v)}</div></div>`
      : `<div class="vi-card"><a href="${v.url}" target="_blank" rel="noopener" class="vi-img"><img loading="lazy" src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt=""><span>▶</span></a>
      <div class="vi-b"><div class="vi-top">${chk(v)}${v.prio ? '<span class="tag v">⭐ utile</span>' : ''}</div><b>${esc(v.titre)}</b>${act(v)}</div></div>`).join('') || '<div class="card mut">Rien pour ce choix.</div>';
    Videos.majSel();
  },
  cocher(src, id, on) { const k = src + ':' + id; on ? Videos.sel.set(k, [src, id]) : Videos.sel.delete(k); Videos.majSel(); },
  majSel() {
    const b = $('#vi_sel'); if (!b) return; const n = Videos.sel.size;
    b.style.display = n ? '' : 'none';
    b.innerHTML = `<b>${plural(n, 'lien sélectionné', 'liens sélectionnés')}</b> (toutes sources confondues) — partager ensemble : <button class="btn sm" onclick="Videos.partager([...Videos.sel.values()],'copier')">Copier</button> <button class="btn sm sec" onclick="Videos.partager([...Videos.sel.values()],'whatsapp')">WhatsApp</button> <button class="btn sm sec" onclick="Videos.partager([...Videos.sel.values()],'mail')">Mail</button> <a href="#" onclick="Videos.sel.clear();Videos.render();return false">vider</a>`;
  },
  trouver(src, id) { return Videos.liste(src).find(v => v.id === id); },
  partager(refs, canal) {
    const vs = refs.map(([s, id]) => Videos.trouver(s, id)).filter(Boolean); if (!vs.length) return;
    const quoi = vs.every(v => v.src === 'rdp') ? 'Podcasts du SNETAA-FO' : vs.every(v => v.src === 'fnec') ? 'Vidéos de la FNEC FP-FO' : vs.every(v => v.src === 'snetaa') ? 'Vidéos du SNETAA-FO' : 'Vidéos et podcasts FO';
    const corps = vs.length === 1 ? Videos.texte(vs[0]) : quoi + ' à voir, à écouter et à partager :\n\n' + vs.map(v => (v.src === 'rdp' ? '🎧 ' : '▶ ') + v.titre + '\n' + v.url).join('\n\n');
    if (canal === 'copier') return copyText(corps);
    if (canal === 'whatsapp') return window.open('https://wa.me/?text=' + encodeURIComponent(corps), '_blank');
    if (canal === 'sms') { location.href = 'sms:?&body=' + encodeURIComponent(corps); return; }
    if (canal === 'mail') {
      const objet = '[SNETAA-FO] ' + (vs.length === 1 ? (vs[0].src === 'rdp' ? 'Podcast : ' : 'Vidéo : ') + vs[0].titre : quoi);
      location.href = 'mailto:?subject=' + encodeURIComponent(objet) + '&body=' + encodeURIComponent('Bonjour,\n\n' + corps + '\n\nBien syndicalement,\n\n' + ((D.meta.syndicat || {}).signature || ''));
    }
  }
};
App.routes.videos = () => Videos.page();
