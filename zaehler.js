// Reichweitenmessung auf den Video-Seiten (web-rausch.com/fuer/<slug>) über GoatCounter: ohne Cookies, ohne IP-Speicherung.
// Zählt Seitenaufruf, wie weit das Video geschaut wurde, und Klicks auf Termin, Anruf und E-Mail.
// Eigene Besuche nicht mitzählen: einmal die Seite mit #intern aufrufen (merkt sich das im Browser), mit #extern wieder einschalten.
(() => {
  const ZAEHLER = 'https://webrausch.goatcounter.com/count';
  const slug = location.pathname.split('/').filter(Boolean)[1] || 'start';

  try {
    if (location.hash === '#intern') localStorage.setItem('wr-intern', '1');
    if (location.hash === '#extern') localStorage.removeItem('wr-intern');
    if (localStorage.getItem('wr-intern')) return;
  } catch (e) {}
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;

  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = ZAEHLER;
  document.head.append(s);

  const gezaehlt = new Set();
  const ereignis = (name) => {
    if (gezaehlt.has(name)) return;   // jedes Ereignis nur einmal pro Besuch
    gezaehlt.add(name);
    const senden = () => window.goatcounter.count({ path: `fuer/${slug}/${name}`, title: name, event: true });
    if (window.goatcounter && window.goatcounter.count) senden();
    else s.addEventListener('load', senden, { once: true });
  };

  // Video: Start und wie weit geschaut (25/50/75 %, Ende)
  const video = document.querySelector('video');
  if (video) {
    video.addEventListener('play', () => ereignis('video-start'));
    video.addEventListener('timeupdate', () => {
      if (!video.duration) return;
      const anteil = video.currentTime / video.duration;
      for (const p of [25, 50, 75]) if (anteil >= p / 100) ereignis(`video-${p}`);
    });
    video.addEventListener('ended', () => ereignis('video-ende'));
  }

  // Klicks: Anruf, E-Mail, „15 Minuten buchen“
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const h = a.getAttribute('href');
    if (h.startsWith('tel:')) ereignis('anruf-klick');
    else if (h.startsWith('mailto:')) ereignis('mail-klick');
    else if (h === '#buchen') ereignis('buchen-knopf');
  });

  // Meldungen aus buchen.js: Uhrzeit gewählt, Termin gebucht
  document.addEventListener('wr-ereignis', (e) => ereignis(e.detail));
})();
