/* Service worker : fonctionnement hors ligne (l'application, pas les données, qui restent dans le navigateur) */
const CACHE = 'snetaa-ot-v23';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'lib/xlsx.full.min.js', 'lib/leaflet/leaflet.js', 'lib/leaflet/leaflet.css',
  'js/data-etabs.js', 'js/data-services.js', 'js/data-colleges.js', 'js/core.js', 'js/adherents.js', 'js/import.js', 'js/carriere.js', 'js/votants.js', 'js/comm.js', 'js/publications.js', 'js/reunions.js', 'js/frais.js', 'js/treso.js', 'js/params.js', 'js/mandats.js', 'js/mutations.js', 'js/relais.js', 'js/sections.js', 'js/annuaire.js', 'js/droits.js', 'js/invitation.js', 'js/compte.js', 'js/equipe.js', 'js/doublons.js', 'js/sauvegarde.js',
  'img/logo-snetaa.png', 'img/logo-fnec.png', 'img/icon-192.png', 'img/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return; // cartes, adresses : réseau direct
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
