// Denneler Elektrotechnik – Entwurf von webrausch. Nur das Nötigste, keine Verbindungen nach außen.
(() => {
  document.documentElement.classList.add('js');

  // Menü auf dem Handy
  const menue = document.querySelector('.menue');
  if (menue) menue.addEventListener('click', () => menue.setAttribute('aria-expanded', document.body.classList.toggle('offen')));

  // Dezentes Einblenden beim Scrollen
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('da'); io.unobserve(e.target); }
  }), { threshold: .1 });
  document.querySelectorAll('.rein').forEach(el => io.observe(el));

  // Anfrage-Assistent: 3 Schritte. Im Entwurf wird nichts verschickt, nur die Vorschau gezeigt,
  // wie die vorsortierte Anfrage beim Betrieb ankommt (später: Server-Funktion + KI-Einordnung).
  const w = document.querySelector('form.wizard');
  if (w) {
    let s = 1;
    const seiten = [...w.querySelectorAll('.w-seite')], fehler = w.querySelector('.w-fehler');
    const weiter = w.querySelector('.w-weiter'), zurueck = w.querySelector('.w-zurueck'), senden = w.querySelector('.w-senden');
    const zeigen = () => {
      seiten.forEach(x => x.classList.toggle('aktiv', +x.dataset.s === s));
      w.querySelector('.w-schritt b').textContent = s;
      w.querySelector('.w-leiste i').style.width = (s / 3 * 100) + '%';
      zurueck.hidden = s === 1; weiter.hidden = s === 3; senden.hidden = s !== 3; fehler.hidden = true;
    };
    const pruefen = () => {
      const f = new FormData(w);
      let m = '';
      if (s === 1 && !f.get('thema')) m = 'Bitte wählen Sie ein Thema.';
      if (s === 2 && (f.get('nachricht') || '').trim().length < 5) m = 'Bitte beschreiben Sie Ihr Anliegen kurz.';
      if (s === 3 && !(f.get('name') || '').trim()) m = 'Bitte geben Sie Ihren Namen an.';
      else if (s === 3 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.get('email') || '')) m = 'Bitte geben Sie eine gültige E-Mail-Adresse an.';
      fehler.textContent = m; fehler.hidden = !m; return !m;
    };
    // Je nach Thema passende Fragen und Texte in Schritt 2
    const TEXTE = {
      schrank:      ['Ihr Projekt', 'Was soll gebaut werden? *', 'Zum Beispiel: Schaltschrank für eine Prüfanlage, ca. 40 Relais, Pneumatik mit 6 Ventilen …'],
      steuerung:    ['Ihr Projekt', 'Was soll die Anlage können? *', 'Zum Beispiel: Prüfstand für Steuerungen, Software aufspielen, Ergebnisse dokumentieren …'],
      stoerung:     ['Ihre Anlage', 'Was ist passiert? *', 'Zum Beispiel: Maschine 3 schaltet seit heute Morgen immer wieder ab, Fehlermeldung …'],
      installation: ['Ihr Vorhaben', 'Was steht an? *', 'Zum Beispiel: neue Unterverteilung, zusätzliche Steckdosen in der Werkstatt …'],
      bewerbung:    ['Ihre Bewerbung', 'Erzählen Sie kurz etwas über sich *', 'Zum Beispiel: Ausbildung, Erfahrung, ab wann Sie anfangen könnten …'],
      sonstiges:    ['Ihr Anliegen', 'Worum geht es? *', 'Schreiben Sie uns einfach kurz, worum es geht …'],
    };
    let art = '';
    w.querySelectorAll('input[name=thema]').forEach(r => r.addEventListener('change', () => {
      art = r.dataset.art;
      w.querySelectorAll('.gruppe').forEach(g => g.hidden = !g.dataset.fuer.split(' ').includes(art));
      const [titel, label, ph] = TEXTE[art];
      w.querySelector('.w2-titel').textContent = titel;
      w.querySelector('.w2-label').textContent = label;
      w.querySelector('#nachricht').placeholder = ph;
      w.querySelector('.feld-firma').hidden = art === 'bewerbung';
      setTimeout(() => { s = 2; zeigen(); }, 180);   // Thema anklicken = direkt weiter
    }));
    weiter.addEventListener('click', () => { if (pruefen()) { s++; zeigen(); } });
    zurueck.addEventListener('click', () => { s--; zeigen(); });
    w.addEventListener('submit', e => {
      e.preventDefault();
      if (s < 3) { if (pruefen()) { s++; zeigen(); } return; }   // Enter in Schritt 1/2 = Weiter
      if (!pruefen() || new FormData(w).get('website')) return;
      const f = new FormData(w);
      // Nur die Antworten der sichtbaren Fragen zählen
      const antworten = [...w.querySelectorAll('.gruppe:not([hidden]) input:checked')];
      const hoch = antworten.some(x => x.hasAttribute('data-hoch'));
      w.querySelector('.t-thema').textContent = f.get('thema');
      const p = w.querySelector('.t-prio');
      p.textContent = antworten.map(x => x.value).join(' · ') || 'Allgemein';
      p.classList.toggle('hoch', hoch);
      w.querySelector('.t-ok').textContent = art === 'bewerbung' ? 'Bewerbung · an Christian Denneler' : 'Geprüft · kein Spam';
      w.querySelector('.t-name').textContent = f.get('name') + (f.get('firma') ? ' · ' + f.get('firma') : '');
      w.querySelector('.t-text').textContent = f.get('nachricht');
      seiten.forEach(x => x.classList.remove('aktiv'));
      w.querySelector('.w-knoepfe').hidden = true; w.querySelector('.w-leiste').hidden = true; w.querySelector('.w-kopf').hidden = true; fehler.hidden = true;
      w.querySelector('.w-fertig').hidden = false;
    });
    zeigen();
  }

  // Zahlen zählen hoch, sobald sie sichtbar werden
  const zio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; zio.unobserve(e.target);
    const el = e.target, ziel = +el.dataset.zahl, t0 = performance.now();
    const lauf = t => { const f = Math.min(1, (t - t0) / 1200); el.textContent = Math.round(ziel * (1 - Math.pow(1 - f, 3))); if (f < 1) requestAnimationFrame(lauf); };
    requestAnimationFrame(lauf);
  }), { threshold: .6 });
  document.querySelectorAll('[data-zahl]').forEach(el => zio.observe(el));

  // Firmengeschichte: Linie füllt sich beim Scrollen, Punkte werden blau
  const hist = document.querySelector('.historie');
  if (hist) {
    const punkte = [...hist.querySelectorAll('.hist')];
    const setzen = () => {
      const r = hist.getBoundingClientRect(), mitte = innerHeight * 0.6;
      const f = Math.max(0, Math.min(1, (mitte - r.top) / r.height));
      hist.style.setProperty('--fortschritt', (f * 100).toFixed(1) + '%');
      punkte.forEach(p => p.classList.toggle('an', p.getBoundingClientRect().top < mitte));
    };
    addEventListener('scroll', setzen, { passive: true }); addEventListener('resize', setzen); setzen();
  }

  // „Jetzt bewerben“ öffnet das Formular direkt beim Thema Bewerbung
  if (location.hash === '#bewerbung') {
    const r = document.querySelector('input[name=thema][data-art=bewerbung]');
    if (r) { r.checked = true; r.dispatchEvent(new Event('change')); setTimeout(() => document.querySelector('form.wizard')?.scrollIntoView({ block: 'center' }), 250); }
  }

  document.querySelectorAll('[data-jahr]').forEach(el => el.textContent = new Date().getFullYear());
})();
