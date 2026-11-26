/* =========================================================
   Agenda : congés scolaires (zones A, B, C, Corse, outre-mer),
   jours fériés, réunions et élections ; export vers un agenda (.ics)
   ========================================================= */
'use strict';
const Agenda = {
  mois: '', zone: '', autres: true,
  cal() { return window.CAL_SCOLAIRE || { calendriers: {}, zonesAcad: {}, couleurs: {} }; },
  zoneDe(acad) { return Agenda.cal().zonesAcad[acad] || (Agenda.cal().calendriers[acad] ? acad : ''); },
  zoneDefaut() { return Agenda.zoneDe(D.meta.syndicat.academie) || 'B'; },
  iso(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); },
  plus(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return Agenda.iso(d); },
  paques(y) { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return `${y}-${pad2(mo)}-${pad2(da)}`; },
  feries(y) {
    const p = Agenda.paques(y);
    return { [`${y}-01-01`]: 'Jour de l\'an', [Agenda.plus(p, 1)]: 'Lundi de Pâques', [`${y}-05-01`]: 'Fête du travail', [`${y}-05-08`]: 'Victoire 1945', [Agenda.plus(p, 39)]: 'Ascension', [Agenda.plus(p, 50)]: 'Lundi de Pentecôte', [`${y}-07-14`]: 'Fête nationale', [`${y}-08-15`]: 'Assomption', [`${y}-11-01`]: 'Toussaint', [`${y}-11-11`]: 'Armistice 1918', [`${y}-12-25`]: 'Noël' };
  },
  /* vacances en cours ce jour-là pour un calendrier : départ après la classe du « début », reprise le matin de la « fin » */
  vacance(z, iso) {
    const c = Agenda.cal().calendriers[z]; if (!c) return null;
    const v = c.v.find(x => iso > x[1] && iso < x[2]); if (v) return v[0];
    if (c.fin && iso > c.fin && iso < Agenda.plus(c.fin, 60)) return 'Vacances d\'été';
    return null;
  },
  marques(z, iso) {
    const c = Agenda.cal().calendriers[z]; if (!c) return [];
    const m = [];
    if (c.r.ens === iso) m.push('Rentrée des enseignants'); if (c.r.eleves === iso) m.push('Rentrée des élèves');
    c.v.forEach(x => { if (x[1] === iso) m.push(x[0] + ' : départ après la classe'); if (x[2] === iso) m.push('Reprise des cours'); });
    if (c.fin === iso) m.push('Début des vacances d\'été');
    return m;
  },
  evenements(iso) {
    const l = [];
    if (can('reu.voir')) D.reunions.filter(r => r.date === iso).forEach(r => l.push({ t: (r.heure ? r.heure + ' ' : '') + r.titre, href: '#/reunion/' + r.id, cls: 'reu' }));
    const el = D.meta.elections; if (el && iso >= el.debut && iso <= el.fin) l.push({ t: '🗳 Élections professionnelles', cls: 'elec' });
    return l;
  },
  page() {
    const C = Agenda.cal(), cals = C.calendriers; if (!Agenda.zone) Agenda.zone = Agenda.zoneDefaut();
    if (!Agenda.mois) Agenda.mois = todayISO().slice(0, 7);
    const [y, mo] = Agenda.mois.split('-').map(Number), z = Agenda.zone, metro = ['A', 'B', 'C'].includes(z);
    const prem = new Date(y, mo - 1, 1), dec = (prem.getDay() + 6) % 7, nb = new Date(y, mo, 0).getDate();
    const fer = Object.assign({}, Agenda.feries(y));
    const nomMois = prem.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    let cells = ''; for (let i = 0; i < dec; i++) cells += '<div class="agd vide"></div>';
    for (let d = 1; d <= nb; d++) {
      const iso = `${y}-${pad2(mo)}-${pad2(d)}`, vac = Agenda.vacance(z, iso), we = [5, 6].includes((dec + d - 1) % 7);
      const autres = metro && Agenda.autres ? ['A', 'B', 'C'].filter(k => k !== z && Agenda.vacance(k, iso)) : [];
      const ev = Agenda.evenements(iso), mq = Agenda.marques(z, iso);
      cells += `<div class="agd${vac ? ' vac' : ''}${we ? ' we' : ''}${iso === todayISO() ? ' auj' : ''}" style="${vac ? 'background:' + (C.couleurs[z] || '#2f7fc1') + '22' : ''}">
        <div class="agn">${d}${autres.map(k => `<span class="agz" style="background:${C.couleurs[k]}" title="Vacances zone ${k}">${k}</span>`).join('')}</div>
        ${fer[iso] ? `<div class="agf">${esc(fer[iso])}</div>` : ''}${vac && (d === 1 || Agenda.vacance(z, Agenda.plus(iso, -1)) !== vac) ? `<div class="agv">${esc(vac)}</div>` : ''}
        ${mq.map(x => `<div class="agm">${esc(x)}</div>`).join('')}${ev.map(e => e.href ? `<a class="age ${e.cls}" href="${e.href}">${esc(e.t)}</a>` : `<div class="age ${e.cls}">${esc(e.t)}</div>`).join('')}</div>`;
    }
    const nav = k => { const d = new Date(y, mo - 1 + k, 1); return d.getFullYear() + '-' + pad2(d.getMonth() + 1); };
    const zonesOpts = Object.entries(cals).map(([k, c]) => [k, c.nom]);
    const tab = keys => `<div class="tablewrap"><table><thead><tr><th>Période</th>${keys.map(k => `<th style="color:${C.couleurs[k] || 'inherit'}">${esc(cals[k].nom)}</th>`).join('')}</tr></thead><tbody>
      <tr><td>Rentrée des enseignants</td>${keys.map(k => `<td class="small">${fmtDate(cals[k].r.ens)}</td>`).join('')}</tr><tr><td>Rentrée des élèves</td>${keys.map(k => `<td class="small">${fmtDate(cals[k].r.eleves)}</td>`).join('')}</tr>
      ${Array.from(new Set(keys.flatMap(k => cals[k].v.map(v => v[0])))).map(n => `<tr><td>${esc(n)}</td>${keys.map(k => { const v = cals[k].v.find(x => x[0] === n); return `<td class="small${k === z ? ' b' : ''}">${v ? fmtDate(v[1]) + ' → ' + fmtDate(v[2]) : '—'}</td>`; }).join('')}</tr>`).join('')}
      <tr><td>Fin d'année</td>${keys.map(k => `<td class="small">${fmtDate(cals[k].fin)}</td>`).join('')}</tr></tbody></table></div>`;
    const om = Object.keys(cals).filter(k => !['A', 'B', 'C', 'Corse'].includes(k));
    $('#main').innerHTML = `<div class="pagehead"><div><h1>Agenda & congés scolaires</h1><div class="mut small">Année ${esc(C.annee || '')} · ${esc(C.source || '')}. Le départ en vacances a lieu après la classe du jour indiqué ; la reprise se fait le matin du jour indiqué.</div></div>
      <div class="actions"><button class="btn sec" onclick="Agenda.ics()" title="Pour Google Agenda, Outlook, téléphone…">⇩ Ajouter à mon agenda (.ics)</button></div></div>
      <div class="card noprint"><div class="toolbar"><button class="btn sm sec" onclick="Agenda.mois='${nav(-1)}';Agenda.page()">‹</button><b style="min-width:150px;text-align:center;text-transform:capitalize">${esc(nomMois)}</b><button class="btn sm sec" onclick="Agenda.mois='${nav(1)}';Agenda.page()">›</button><button class="btn sm ghost" onclick="Agenda.mois='';Agenda.page()">aujourd'hui</button>
        <select onchange="Agenda.zone=this.value;Agenda.page()">${UI.opts(zonesOpts, z)}</select>
        ${metro ? `<label class="chk"><input type="checkbox" ${Agenda.autres ? 'checked' : ''} onchange="Agenda.autres=this.checked;Agenda.page()"> montrer les autres zones</label>` : ''}</div>
        <div class="small">${['A', 'B', 'C', 'Corse'].map(k => `<span class="dot" style="background:${C.couleurs[k]}"></span>${k === 'Corse' ? 'Corse' : 'zone ' + k}`).join(' ')} · <span class="dot" style="background:#601080"></span>réunions · <span class="dot" style="background:#c80030"></span>élections · notre académie : zone ${esc(Agenda.zoneDefaut())}</div></div>
      <div class="agenda"><div class="agh">lun.</div><div class="agh">mar.</div><div class="agh">mer.</div><div class="agh">jeu.</div><div class="agh">ven.</div><div class="agh">sam.</div><div class="agh">dim.</div>${cells}</div>
      <h2>Congés ${esc(C.annee || '')} — métropole</h2>${tab(['A', 'B', 'C', 'Corse'])}
      <details class="card"><summary><b>Outre-mer</b></summary>${tab(om.slice(0, 4))}${tab(om.slice(4))}</details>`;
  },
  ics() {
    const C = Agenda.cal(), c = C.calendriers[Agenda.zone]; if (!c) return;
    const d8 = iso => iso.replace(/-/g, ''), lignes = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SNETAA-FO Orleans-Tours//Agenda//FR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:SNETAA-FO — ' + c.nom];
    const ev = (id, deb, fin, titre, desc) => lignes.push('BEGIN:VEVENT', 'UID:' + id + '@snetaaot', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', 'DTSTART;VALUE=DATE:' + d8(deb), 'DTEND;VALUE=DATE:' + d8(fin), 'SUMMARY:' + titre.replace(/[,;]/g, '\\$&'), ...(desc ? ['DESCRIPTION:' + desc.replace(/[,;]/g, '\\$&')] : []), 'TRANSP:TRANSPARENT', 'END:VEVENT');
    c.v.forEach((v, i) => ev(`vac-${Agenda.zone}-${i}-${v[1]}`.replace(/\W/g, ''), Agenda.plus(v[1], 1), v[2], `Vacances : ${v[0]} (${c.nom})`, `Départ après la classe le ${fmtDate(v[1])}, reprise le ${fmtDate(v[2])}`));
    ev(`rentree-${Agenda.zone}`.replace(/\W/g, ''), c.r.eleves, Agenda.plus(c.r.eleves, 1), `Rentrée des élèves (${c.nom})`);
    ev(`ete-${Agenda.zone}`.replace(/\W/g, ''), Agenda.plus(c.fin, 1), Agenda.plus(c.fin, 2), `Début des vacances d'été (${c.nom})`);
    const el = D.meta.elections; if (el) ev('elections-' + d8(el.debut), el.debut, Agenda.plus(el.fin, 1), 'Élections professionnelles', 'Votez FNEC FP-FO');
    if (can('reu.voir')) D.reunions.filter(r => r.date >= todayISO()).forEach(r => ev('reu-' + r.id, r.date, Agenda.plus(r.date, 1), (r.heure ? r.heure + ' ' : '') + r.titre, [r.type, r.lieu].filter(Boolean).join(' — ')));
    lignes.push('END:VCALENDAR');
    download(`agenda_SNETAA-FO_${norm(c.nom).replace(/ /g, '-')}_${C.annee}.ics`, lignes.join('\r\n'), 'text/calendar');
    log('Export de l\'agenda (.ics)', c.nom);
    UI.modal('Fichier agenda prêt', '<p>Le fichier .ics est téléchargé. Ouvre-le (ou importe-le dans Google Agenda : Paramètres › Importer et exporter) : les vacances, la rentrée, les élections et les réunions à venir s\'ajoutent à ton agenda.</p>', [{ label: 'OK' }]);
  }
};
App.routes.agenda = () => Agenda.page();
