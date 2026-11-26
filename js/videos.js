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
  CHAINE: 'https://www.youtube.com/@fnecfp-fo8651/videos',
  // vidéos les plus utiles pour les collègues de la voie professionnelle
  PRIO: ['rSdTIPRtKps', '9tQQNZUGYQU', 'SSQYJHDGF1c', 'snGNr8PH75Y', 'ozvXSzwVrcY', 'It5zF_p0X8Q', 'fIlLbO5n6I0', 'L63d2roLjsM', 'ISl8mMBO-uk', 'jFtXmSz4CfU', 'Lh8ozu5k41E', 'RRoRoMLYm-Q', 'YEl7cPkZIfY', 'zYOzVo63wRg', 'Dk0QoG2Q7K0', 'odpk0iIN2Rw', '0e7AlGZGlkQ', 'GDZoGOBlaGE', 'uyiGW3AgfBI', '9Txn1lYhpdM'],
  THEMES: [
    ['vote', 'Élections & vote', /qui vote|votre vote|capn/i],
    ['precarite', 'Contractuels, AED, AESH', /contractuel|aesh|aed\b|atpss/i],
    ['salaires', 'Salaires, statut, protection sociale', /salaire|statut|psc|action sociale|retraite|smicard/i],
    ['travail', 'Conditions de travail, santé, VSS', /santé et sécurité|vss/i],
    ['ecole', 'École publique & enseignement', /laïcité|militarisation|enseignement spécialisé|professeurs des écoles|privé sous contrat/i],
    ['autres', 'Autres personnels et services', /./]
  ],
  theme(t) { return Videos.THEMES.find(x => x[2].test(t))[0]; },
  liste() { return VIDEOS_REF.map(([id, titre], i) => ({ id, titre, rang: i, url: 'https://youtu.be/' + id, prio: Videos.PRIO.includes(id), theme: Videos.theme(titre) })); },
  f: { q: '', th: '', prio: false },
  sel: new Set(),
  texte(v) { return v.titre + ' — vidéo FNEC FP-FO : ' + v.url; },
  page() {
    const f = Videos.f;
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Vidéos FNEC FP-FO</h1><div class="mut small">${VIDEOS_REF.length} vidéos de la chaîne YouTube de la fédération, prêtes à partager (WhatsApp, SMS, mail). <a href="${Videos.CHAINE}" target="_blank" rel="noopener">Voir la chaîne</a></div></div></div>
      <div class="card mo-bar">
        <div class="f" style="margin:0"><label>Thème</label><select onchange="Videos.f.th=this.value;Videos.render()"><option value="">Tous les thèmes</option>${Videos.THEMES.map(t => `<option value="${t[0]}" ${f.th === t[0] ? 'selected' : ''}>${t[1]} (${Videos.liste().filter(v => v.theme === t[0]).length})</option>`).join('')}</select></div>
        <div class="f" style="margin:0"><label>Sélection</label><div class="pill-select"><button type="button" class="${f.prio ? '' : 'on'}" onclick="Videos.f.prio=false;Videos.page()">Toutes</button><button type="button" class="${f.prio ? 'on' : ''}" onclick="Videos.f.prio=true;Videos.page()">⭐ Utiles pour nos collègues</button></div></div>
        <div class="f" style="margin:0;flex:1;min-width:180px"><label>Rechercher</label><input type="search" placeholder="AESH, salaires, PSC…" value="${esc(f.q)}" oninput="Videos.f.q=this.value;Videos.render()"></div>
      </div>
      <div id="vi_sel" class="alert small" style="display:none"></div>
      <div id="vi_liste" class="vi-grid"></div>`;
    Videos.render();
  },
  render() {
    const f = Videos.f, q = norm(f.q), el = $('#vi_liste'); if (!el) return;
    const l = Videos.liste().filter(v => (!f.th || v.theme === f.th) && (!f.prio || v.prio) && (!q || norm(v.titre).includes(q)));
    el.innerHTML = l.map(v => `<div class="vi-card"><a href="${v.url}" target="_blank" rel="noopener" class="vi-img"><img loading="lazy" src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt=""><span>▶</span></a>
      <div class="vi-b"><div class="vi-top"><label class="small" title="Ajouter à la sélection à partager"><input type="checkbox" ${Videos.sel.has(v.id) ? 'checked' : ''} onchange="Videos.cocher('${v.id}',this.checked)"> sélectionner</label>${v.prio ? '<span class="tag v">⭐ utile</span>' : ''}</div><b>${esc(v.titre)}</b>
      <div class="vi-act"><button class="btn sm sec" onclick="Videos.partager(['${v.id}'],'copier')">Copier le lien</button><button class="btn sm ghost" onclick="Videos.partager(['${v.id}'],'whatsapp')">WhatsApp</button><button class="btn sm ghost" onclick="Videos.partager(['${v.id}'],'sms')">SMS</button><button class="btn sm ghost" onclick="Videos.partager(['${v.id}'],'mail')">Mail</button></div></div></div>`).join('') || '<div class="card mut">Aucune vidéo pour ce choix.</div>';
    Videos.majSel();
  },
  cocher(id, on) { on ? Videos.sel.add(id) : Videos.sel.delete(id); Videos.majSel(); },
  majSel() {
    const b = $('#vi_sel'); if (!b) return; const n = Videos.sel.size;
    b.style.display = n ? '' : 'none';
    b.innerHTML = `<b>${plural(n, 'vidéo sélectionnée', 'vidéos sélectionnées')}</b> — partager ensemble : <button class="btn sm" onclick="Videos.partager([...Videos.sel],'copier')">Copier</button> <button class="btn sm sec" onclick="Videos.partager([...Videos.sel],'whatsapp')">WhatsApp</button> <button class="btn sm sec" onclick="Videos.partager([...Videos.sel],'mail')">Mail</button> <a href="#" onclick="Videos.sel.clear();Videos.render();return false">vider</a>`;
  },
  partager(ids, canal) {
    const vs = Videos.liste().filter(v => ids.includes(v.id)); if (!vs.length) return;
    const corps = vs.length === 1 ? Videos.texte(vs[0]) : 'Vidéos de la FNEC FP-FO à voir et à partager :\n\n' + vs.map(v => '▶ ' + v.titre + '\n' + v.url).join('\n\n');
    if (canal === 'copier') return copyText(corps);
    if (canal === 'whatsapp') return window.open('https://wa.me/?text=' + encodeURIComponent(corps), '_blank');
    if (canal === 'sms') { location.href = 'sms:?&body=' + encodeURIComponent(corps); return; }
    if (canal === 'mail') {
      const objet = '[SNETAA-FO] ' + (vs.length === 1 ? 'Vidéo : ' + vs[0].titre : 'Vidéos de la FNEC FP-FO');
      location.href = 'mailto:?subject=' + encodeURIComponent(objet) + '&body=' + encodeURIComponent('Bonjour,\n\n' + corps + '\n\nBien syndicalement,\n\n' + ((D.meta.syndicat || {}).signature || ''));
    }
  }
};
App.routes.videos = () => Videos.page();
