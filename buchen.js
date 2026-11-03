// Terminbuchung direkt auf der Seite (ohne Weiterleitung zu Cal.com).
// Holt freie Zeiten über die öffentliche Cal.com-Schnittstelle und bucht dort, zeigt alles auf Deutsch im 24-Stunden-Format.
//
//   <div id="buchen" data-betrieb="Name des Betriebs" data-quelle="web-rausch.com/fuer/slug"></div>
//   <script src="/buchen.js" defer></script>
(() => {
  const API = 'https://api.cal.com/v2';
  const NUTZER = 'webrausch', TERMIN = 'erstgesprach', ZONE = 'Europe/Berlin';
  const TAGE = 21;
  const MAX_TAGE = 8;
  // Zeitfenster (letzter Beginn) und Abstände zwischen angebotenen Zeiten: meist 45, oft 15, ab und zu 30 Minuten
  const FENSTER = { Vormittags: ['07:00', '09:45'], Nachmittags: ['16:00', '18:45'] };
  const ABSTAENDE = [45, 45, 45, 45, 15, 15, 15, 30, 30];

  const box = document.getElementById('buchen');
  if (!box) return;
  const betrieb = box.dataset.betrieb || '';
  const quelle = box.dataset.quelle || location.hostname + location.pathname;

  const css = `
#buchen{background:var(--bg2,#141210);border:1px solid var(--line,#2a2622);border-radius:20px;padding:20px;display:grid;gap:16px;scroll-margin-top:16px}
#buchen h2{font:800 22px/1.15 "Unbounded",system-ui,sans-serif;letter-spacing:-.03em;margin:0}
#buchen .sub{color:var(--muted,#a59d93);font-size:15px;margin:-8px 0 0}
#buchen .tage{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 6px;scrollbar-width:none;scroll-snap-type:x mandatory}
#buchen .tage::-webkit-scrollbar{display:none}
#buchen button{font:inherit;color:inherit;cursor:pointer}
#buchen .tag{flex:0 0 auto;scroll-snap-align:start;background:var(--bg,#0b0b0b);border:1px solid var(--line,#2a2622);border-radius:14px;padding:9px 14px;display:grid;justify-items:center;gap:1px;min-width:72px}
#buchen .tag b{font-size:17px} #buchen .tag span{font-size:12px;color:var(--muted,#a59d93)}
#buchen .tag[aria-pressed="true"]{background:var(--orange,#ff7400);border-color:var(--orange,#ff7400);color:#000}
#buchen .tag[aria-pressed="true"] span{color:#000}
#buchen .gruppe{font-size:13px;color:var(--muted,#a59d93);margin:4px 0 8px}
#buchen .zeiten{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
@media (max-width:420px){#buchen .zeiten{grid-template-columns:repeat(2,1fr)}}
#buchen .tage{justify-content:flex-start}
#buchen .tag{flex:0 0 auto}
#buchen .zeit{background:var(--bg,#0b0b0b);border:1px solid var(--line,#2a2622);border-radius:12px;padding:12px 6px;font-weight:700;font-variant-numeric:tabular-nums}
#buchen .zeit:hover,#buchen .tag:hover{border-color:var(--orange,#ff7400)}
#buchen .zeit[aria-pressed="true"]{background:var(--orange,#ff7400);border-color:var(--orange,#ff7400);color:#000}
#buchen :is(button,input):focus-visible{outline:2px solid var(--orange,#ff7400);outline-offset:2px}
#buchen form{display:grid;gap:10px;border-top:1px solid var(--line,#2a2622);padding-top:16px}
#buchen .gewaehlt{font-weight:700}
#buchen label{display:grid;gap:4px;font-size:14px;color:var(--muted,#a59d93)}
#buchen input{background:var(--bg,#0b0b0b);border:1px solid var(--line,#2a2622);border-radius:12px;padding:13px 14px;color:var(--ink,#f4efe8);font:inherit;width:100%}
#buchen .reihe{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#buchen .wo{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#buchen .wo button{background:var(--bg,#0b0b0b);border:1px solid var(--line,#2a2622);border-radius:12px;padding:12px 8px;display:grid;gap:2px;text-align:center}
#buchen .wo button b{font-size:15px} #buchen .wo button span{font-size:12px;color:var(--muted,#a59d93)}
#buchen .wo button:hover{border-color:var(--orange,#ff7400)}
#buchen .wo button[aria-pressed="true"]{background:var(--orange,#ff7400);border-color:var(--orange,#ff7400);color:#000}
#buchen .wo button[aria-pressed="true"] span{color:#000}
@media (max-width:520px){#buchen .reihe{grid-template-columns:1fr}}
#buchen .senden{background:var(--orange,#ff7400);color:#000;border:0;border-radius:999px;padding:17px 22px;font-weight:700;font-size:16px}
#buchen .senden[disabled]{opacity:.6;cursor:wait}
#buchen .info{color:var(--muted,#a59d93);font-size:14px;margin:0}
#buchen .fehler{color:#ff8a80;font-size:14px;margin:0}
#buchen .fertig{display:grid;gap:8px;text-align:center;padding:10px 0}
#buchen .fertig b{font:800 22px/1.2 "Unbounded",system-ui,sans-serif;letter-spacing:-.02em}
#buchen .haken{width:52px;height:52px;border-radius:50%;background:var(--orange,#ff7400);color:#000;display:grid;place-items:center;font-size:26px;font-weight:800;margin:0 auto}
`;
  document.head.append(Object.assign(document.createElement('style'), { textContent: css }));

  const el = (tag, attrs = {}, ...kinder) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v != null) e.setAttribute(k, v);
    }
    e.append(...kinder.filter(x => x != null));
    return e;
  };
  const uhr = (iso) => new Date(iso).toLocaleTimeString('de-DE', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hour12: false });
  const langDatum = (iso) => new Date(iso).toLocaleDateString('de-DE', { timeZone: ZONE, weekday: 'long', day: 'numeric', month: 'long' });
  const wochentag = (tag) => new Date(tag + 'T12:00:00Z').toLocaleDateString('de-DE', { timeZone: 'UTC', weekday: 'short' }).replace('.', '');
  const melde = (name) => document.dispatchEvent(new CustomEvent('wr-ereignis', { detail: name }));   // für zaehler.js
  const kurzDatum = (tag) => new Date(tag + 'T12:00:00Z').toLocaleDateString('de-DE', { timeZone: 'UTC', day: 'numeric', month: 'numeric' });

  let tage = {}, tagWahl = null, zeitWahl = null, wo = 'vorort';   // wo: 'vorort' (ich komme vorbei) oder 'online'
  const kopf = [el('h2', {}, '15 Minuten direkt hier buchen'),
    el('p', { class: 'sub' }, 'Kostenlos und unverbindlich, bei Ihnen vor Ort oder online. Sie bekommen danach eine Bestätigung per E-Mail.')];
  box.replaceChildren(...kopf, el('p', { class: 'info' }, 'Freie Termine werden geladen …'));

  async function laden() {
    const start = new Date().toISOString().slice(0, 10);
    const ende = new Date(Date.now() + TAGE * 864e5).toISOString().slice(0, 10);
    const r = await fetch(`${API}/slots?username=${NUTZER}&eventTypeSlug=${TERMIN}&start=${start}&end=${ende}&timeZone=${ZONE}`,
      { headers: { 'cal-api-version': '2024-09-04' } });
    const d = (await r.json()).data || {};
    tage = {};
    for (const [tag, slots] of Object.entries(d)) {
      if (Object.keys(tage).length >= MAX_TAGE) break;
      const raster = Object.values(rasterFuer(tag)).flat();
      const frei = slots.map(s => s.start).filter(z => raster.includes(uhr(z)));
      if (frei.length) tage[tag] = frei;
    }
    tagWahl = Object.keys(tage)[0] || null;
    zeichnen();
  }

  // Angebotene Uhrzeiten je Tag: zufällige Abstände, aber aus dem Datum abgeleitet, also bei jedem Aufruf gleich
  function rasterFuer(tag) {
    let x = [...tag].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const zufall = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
    const min = (t) => +t.slice(0, 2) * 60 + +t.slice(3), text = (m) => String(m / 60 | 0).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    const out = {};
    for (const [titel, [von, bis]] of Object.entries(FENSTER)) {
      out[titel] = [];
      for (let m = min(von); m <= min(bis); m += ABSTAENDE[Math.floor(zufall() * ABSTAENDE.length)]) out[titel].push(text(m));
    }
    return out;
  }

  function zeichnen() {
    const keys = Object.keys(tage);
    if (!keys.length) {
      box.replaceChildren(...kopf, el('p', { class: 'info' }, 'Gerade sind online keine Termine frei. Rufen Sie mich gern an: 0160 1572410.'));
      return;
    }
    const zeiten = tage[tagWahl] || [];
    const knopf = (z) => el('button', { type: 'button', class: 'zeit', 'aria-pressed': z === zeitWahl ? 'true' : 'false',
      onclick: () => { zeitWahl = z; melde('buchen-zeit'); zeichnen(); box.querySelector('input[name=name]')?.focus({ preventScroll: true }); box.querySelector('form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }, uhr(z) + ' Uhr');
    // Leere Gruppen weglassen (replaceChildren würde sonst „null“ als Text einfügen)
    box.replaceChildren(...[...kopf,
      el('div', { class: 'tage', role: 'group', 'aria-label': 'Tag wählen' }, ...keys.map(t => el('button', {
        type: 'button', class: 'tag', 'aria-pressed': t === tagWahl ? 'true' : 'false',
        onclick: () => { tagWahl = t; zeitWahl = null; zeichnen(); } }, el('span', {}, wochentag(t)), el('b', {}, kurzDatum(t))))),
      ...Object.entries(rasterFuer(tagWahl)).map(([titel, liste]) => {
        const frei = zeiten.filter(z => liste.includes(uhr(z)));
        return frei.length ? el('div', {}, el('div', { class: 'gruppe' }, titel), el('div', { class: 'zeiten' }, ...frei.map(knopf))) : null;
      }),
      zeitWahl ? formular() : el('p', { class: 'info' }, 'Keine passende Zeit dabei? Rufen Sie kurz an: ', el('a', { href: 'tel:+491601572410', style: 'color:inherit' }, '0160 1572410'), '.')].filter(Boolean));
  }

  function formular() {
    const fehler = el('p', { class: 'fehler', role: 'alert' });
    const adresse = el('label', {}, 'Adresse (Straße, Ort)', el('input', { name: 'adresse', autocomplete: 'street-address' }));
    adresse.hidden = wo !== 'vorort';
    const f = el('form', { novalidate: '' },
      el('div', { class: 'gewaehlt' }, `${langDatum(zeitWahl)}, ${uhr(zeitWahl)} Uhr`),
      el('div', { class: 'wo', role: 'group', 'aria-label': 'Wo soll das Gespräch stattfinden?' },
        ...[['vorort', 'Vor Ort bei Ihnen', 'ich komme vorbei'], ['online', 'Online', 'per Videolink']].map(([wert, titel, zusatz]) =>
          el('button', { type: 'button', 'aria-pressed': wo === wert ? 'true' : 'false',
            onclick: (e) => { wo = wert; for (const b of f.querySelectorAll('.wo button')) b.setAttribute('aria-pressed', b === e.currentTarget ? 'true' : 'false'); adresse.hidden = wo !== 'vorort'; } },
            el('b', {}, titel), el('span', {}, zusatz)))),
      adresse,
      el('div', { class: 'reihe' },
        el('label', {}, 'Ihr Name', el('input', { name: 'name', autocomplete: 'name', required: '' })),
        el('label', {}, 'E-Mail', el('input', { name: 'email', type: 'email', autocomplete: 'email', required: '' }))),
      el('label', {}, 'Telefon (falls Sie lieber telefonieren)', el('input', { name: 'telefon', type: 'tel', autocomplete: 'tel' })),
      el('button', { class: 'senden', type: 'submit' }, 'Termin verbindlich buchen'),
      fehler);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      if (!d.name.trim() || !/^\S+@\S+\.\S+$/.test(d.email.trim())) { fehler.textContent = 'Bitte Name und eine gültige E-Mail-Adresse eintragen.'; return; }
      if (wo === 'vorort' && !d.adresse.trim()) { fehler.textContent = 'Bitte die Adresse eintragen, damit ich weiß, wohin ich komme. Oder „Online“ wählen.'; return; }
      const knopf = f.querySelector('.senden');
      knopf.disabled = true; knopf.textContent = 'Wird gebucht …'; fehler.textContent = '';
      const notiz = [wo === 'vorort' ? `VOR ORT: ${d.adresse.trim()}` : 'ONLINE (Videolink)', betrieb && `Betrieb: ${betrieb}`, `Gebucht über ${quelle}`, d.telefon && `Lieber per Telefon: ${d.telefon}`].filter(Boolean).join('\n');
      try {
        const r = await fetch(`${API}/bookings`, {
          method: 'POST', headers: { 'cal-api-version': '2024-08-13', 'Content-Type': 'application/json' },
          body: JSON.stringify({ start: new Date(zeitWahl).toISOString(), eventTypeSlug: TERMIN, username: NUTZER,
            attendee: { name: d.name.trim(), email: d.email.trim(), timeZone: ZONE, language: 'de' },
            bookingFieldsResponses: { notes: notiz } }) });
        const a = await r.json();
        if (!r.ok || a.status !== 'success') throw new Error(a.error?.message || 'Buchung fehlgeschlagen');
        melde('buchen-fertig');
        box.replaceChildren(el('div', { class: 'fertig' }, el('div', { class: 'haken', 'aria-hidden': 'true' }, '✓'),
          el('b', {}, 'Termin gebucht'),
          el('div', {}, `${langDatum(zeitWahl)}, ${uhr(zeitWahl)} Uhr`),
          el('p', { class: 'info' }, wo === 'vorort' ? `Ich komme zu Ihnen: ${d.adresse.trim()}. Die Bestätigung geht an ${d.email.trim()}. Ich freue mich auf Sie!` : `Die Bestätigung mit dem Videolink geht an ${d.email.trim()}. Ich freue mich auf Sie!`)));
      } catch (err) {
        knopf.disabled = false; knopf.textContent = 'Termin verbindlich buchen';
        fehler.textContent = 'Das hat leider nicht geklappt, vielleicht wurde die Zeit gerade vergeben. Bitte eine andere Zeit wählen oder anrufen: 0160 1572410.';
        laden().catch(() => {});
      }
    });
    return f;
  }

  laden().catch(() => box.replaceChildren(...kopf, el('p', { class: 'info' }, 'Die Termine konnten gerade nicht geladen werden. Rufen Sie mich gern an: 0160 1572410.')));
})();
