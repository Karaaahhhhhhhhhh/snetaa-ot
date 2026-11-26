/* Calendrier scolaire 2026-2027
   Métropole : arrêté du 22 octobre 2025 (JO du 23 octobre 2025), service-public.gouv.fr.
   Corse et outre-mer : agenda SNETAA-FO 2026-2027.
   Convention officielle : le départ en vacances a lieu après la classe du jour indiqué (debut),
   la reprise des cours s'effectue le matin du jour indiqué (fin). */
window.CAL_SCOLAIRE = {
  annee: '2026-2027',
  source: 'Arrêté du 22 octobre 2025 (métropole) ; agenda SNETAA-FO 2026-2027 (Corse et outre-mer)',
  /* zone de vacances de chaque académie de métropole */
  zonesAcad: {
    'Besançon': 'A', 'Bordeaux': 'A', 'Clermont-Ferrand': 'A', 'Dijon': 'A', 'Grenoble': 'A', 'Limoges': 'A', 'Lyon': 'A', 'Poitiers': 'A',
    'Aix-Marseille': 'B', 'Amiens': 'B', 'Lille': 'B', 'Nancy-Metz': 'B', 'Nantes': 'B', 'Nice': 'B', 'Normandie': 'B', 'Caen': 'B', 'Rouen': 'B', 'Orléans-Tours': 'B', 'Reims': 'B', 'Rennes': 'B', 'Strasbourg': 'B',
    'Créteil': 'C', 'Montpellier': 'C', 'Paris': 'C', 'Toulouse': 'C', 'Versailles': 'C',
    'Corse': 'Corse'
  },
  couleurs: { A: '#e86800', B: '#2f7fc1', C: '#5f9e3a', Corse: '#c80030' },
  /* r : rentrée (ens. = enseignants, élèves) ; v : [libellé, départ après la classe du, reprise le] ; fin : début des vacances d'été */
  calendriers: {
    A: { nom: 'Zone A', r: { ens: '2026-08-31', eleves: '2026-09-01' }, v: [['Toussaint', '2026-10-17', '2026-11-02'], ['Noël', '2026-12-19', '2027-01-04'], ['Hiver', '2027-02-13', '2027-03-01'], ['Printemps', '2027-04-10', '2027-04-26'], ['Pont de l\'Ascension', '2027-05-05', '2027-05-10']], fin: '2027-07-03' },
    B: { nom: 'Zone B', r: { ens: '2026-08-31', eleves: '2026-09-01' }, v: [['Toussaint', '2026-10-17', '2026-11-02'], ['Noël', '2026-12-19', '2027-01-04'], ['Hiver', '2027-02-20', '2027-03-08'], ['Printemps', '2027-04-17', '2027-05-03'], ['Pont de l\'Ascension', '2027-05-05', '2027-05-10']], fin: '2027-07-03' },
    C: { nom: 'Zone C', r: { ens: '2026-08-31', eleves: '2026-09-01' }, v: [['Toussaint', '2026-10-17', '2026-11-02'], ['Noël', '2026-12-19', '2027-01-04'], ['Hiver', '2027-02-06', '2027-02-22'], ['Printemps', '2027-04-03', '2027-04-19'], ['Pont de l\'Ascension', '2027-05-05', '2027-05-10']], fin: '2027-07-03' },
    Corse: { nom: 'Corse', r: { ens: '2026-09-01', eleves: '2026-09-03' }, v: [['Toussaint', '2026-10-17', '2026-11-02'], ['Noël', '2026-12-19', '2027-01-04'], ['Hiver', '2027-02-13', '2027-03-01'], ['Printemps', '2027-04-10', '2027-04-26']], fin: '2027-07-03' },
    Guadeloupe: { nom: 'Guadeloupe', r: { ens: '2026-08-31', eleves: '2026-09-01' }, v: [['Toussaint', '2026-10-17', '2026-11-03'], ['Noël', '2026-12-19', '2027-01-04'], ['Carnaval', '2027-02-06', '2027-02-22'], ['Pâques', '2027-03-25', '2027-04-12'], ['Pont de l\'Ascension', '2027-05-05', '2027-05-09']], fin: '2027-07-03' },
    Guyane: { nom: 'Guyane', r: { ens: '2026-08-31', eleves: '2026-09-01' }, v: [['Toussaint', '2026-10-17', '2026-11-03'], ['Noël', '2026-12-19', '2027-01-04'], ['Carnaval', '2027-02-06', '2027-02-18'], ['Pâques', '2027-03-25', '2027-04-12'], ['Pont de l\'Ascension', '2027-04-30', '2027-05-10']], fin: '2027-07-03' },
    Martinique: { nom: 'Martinique', r: { ens: '2026-08-31', eleves: '2026-09-01' }, v: [['Toussaint', '2026-10-20', '2026-11-03'], ['Noël', '2026-12-19', '2027-01-04'], ['Carnaval', '2027-02-06', '2027-02-22'], ['Pâques', '2027-04-20', '2027-05-03'], ['Pont de l\'Ascension', '2027-05-05', '2027-05-09']], fin: '2027-07-03' },
    Mayotte: { nom: 'Mayotte', r: { ens: '2026-08-21', eleves: '2026-08-24' }, v: [['Toussaint', '2026-10-10', '2026-10-26'], ['Noël', '2026-12-12', '2027-01-11'], ['Hiver', '2027-02-20', '2027-03-08'], ['Printemps', '2027-04-30', '2027-05-18']], fin: '2027-07-10' },
    'La Réunion': { nom: 'La Réunion', r: { ens: '2026-08-17', eleves: '2026-08-18' }, v: [['1re période', '2026-10-10', '2026-10-26'], ['Vacances australes', '2026-12-19', '2027-02-01'], ['3e période', '2027-03-16', '2027-03-30'], ['4e période', '2027-05-05', '2027-05-19']], fin: '2027-07-03' },
    'Saint-Pierre-et-Miquelon': { nom: 'Saint-Pierre-et-Miquelon', r: { ens: '2026-09-01', eleves: '2026-09-02' }, v: [['Toussaint', '2026-10-20', '2026-11-02'], ['Noël', '2026-12-18', '2027-01-04'], ['Hiver', '2027-02-19', '2027-03-08'], ['Printemps', '2027-04-16', '2027-05-03'], ['Ascension', '2027-05-05', '2027-05-10']], fin: '2027-07-01' },
    'Polynésie française': { nom: 'Polynésie française', r: { ens: '2026-08-10', eleves: '2026-08-11' }, v: [['Septembre', '2026-09-12', '2026-09-20'], ['Toussaint', '2026-10-24', '2026-11-08'], ['Noël', '2026-12-12', '2027-01-10'], ['Hiver', '2027-02-13', '2027-02-21'], ['Printemps', '2027-03-27', '2027-04-11'], ['Ascension', '2027-05-15', '2027-05-23']], fin: '2027-07-03' },
    'Nouvelle-Calédonie': { nom: 'Nouvelle-Calédonie (année 2027)', r: { ens: '2027-02-12', eleves: '2027-02-15' }, v: [['1re période', '2027-04-03', '2027-04-18'], ['2e période', '2027-06-05', '2027-06-20'], ['3e période', '2027-08-07', '2027-08-22'], ['4e période', '2027-10-09', '2027-10-24']], fin: '2027-12-18' },
    'Wallis-et-Futuna': { nom: 'Wallis-et-Futuna (année 2027)', r: { ens: '2027-02-12', eleves: '2027-02-15' }, v: [['1re période', '2027-04-03', '2027-04-18'], ['2e période', '2027-06-05', '2027-06-20'], ['3e période', '2027-08-07', '2027-08-22'], ['4e période', '2027-10-09', '2027-10-24']], fin: '2027-12-18' }
  }
};
