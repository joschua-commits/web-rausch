// Terminbuchung direkt auf der Seite (ohne Weiterleitung zu Cal.com).
// Holt freie Zeiten über die öffentliche Cal.com-Schnittstelle und bucht dort, zeigt alles auf Deutsch im 24-Stunden-Format.
//
//   <div id="buchen" data-betrieb="Name des Betriebs" data-quelle="web-rausch.com/fuer/slug"></div>
//   <script src="/buchen.js" defer></script>
(() => {
  const API = 'https://api.cal.com/v2';
  const NUTZER = 'webrausch', TERMIN = 'erstgesprach', ZONE = 'Europe/Berlin';
  const TAGE = 21;
  // Nicht alle freien Slots zeigen, sonst wirkt der Kalender leer: wenige Tage, wenige Zeiten pro Tag
  const MAX_TAGE = 8, MAX_ZEITEN = 4;

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
#buchen .mehr{appearance:none;-webkit-appearance:none;background:var(--bg,#0b0b0b) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23a59d93' stroke-width='1.6' fill='none'/%3E%3C/svg%3E") no-repeat right 16px center;border:1px solid var(--line,#2a2622);border-radius:12px;padding:12px 40px 12px 14px;color:var(--ink,#f4efe8);font:inherit;font-size:15px;cursor:pointer;width:100%}
#buchen .mehr:hover{border-color:var(--orange,#ff7400)}
#buchen .mehr:focus-visible{outline:2px solid var(--orange,#ff7400);outline-offset:2px}
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
  const kurzDatum = (tag) => new Date(tag + 'T12:00:00Z').toLocaleDateString('de-DE', { timeZone: 'UTC', day: 'numeric', month: 'numeric' });

  let tage = {}, tagWahl = null, zeitWahl = null;
  const kopf = [el('h2', {}, '15 Minuten direkt hier buchen'),
    el('p', { class: 'sub' }, 'Kostenlos und unverbindlich. Sie bekommen danach eine Bestätigung per E-Mail mit dem Link zum Gespräch.')];
  box.replaceChildren(...kopf, el('p', { class: 'info' }, 'Freie Termine werden geladen …'));

  async function laden() {
    const start = new Date().toISOString().slice(0, 10);
    const ende = new Date(Date.now() + TAGE * 864e5).toISOString().slice(0, 10);
    const r = await fetch(`${API}/slots?username=${NUTZER}&eventTypeSlug=${TERMIN}&start=${start}&end=${ende}&timeZone=${ZONE}`,
      { headers: { 'cal-api-version': '2024-09-04' } });
    const d = (await r.json()).data || {};
    tage = {};
    // Aus den in Cal.com freigegebenen Zeiten eine kleine Auswahl je Tag
    for (const [tag, slots] of Object.entries(d)) {
      if (Object.keys(tage).length >= MAX_TAGE) break;
      const alle = slots.map(s => s.start).filter(z => /:(00|30)$/.test(uhr(z)));
      if (alle.length) tage[tag] = { vorschlag: auswahl(tag, alle), alle };
    }
    tagWahl = Object.keys(tage)[0] || null;
    zeichnen();
  }

  // Nur volle und halbe Stunden, gleichmäßig über den Tag verteilt; je Datum etwas anders, aber bei jedem Aufruf gleich
  function auswahl(tag, glatt) {
    if (glatt.length <= 2) return glatt;
    const seed = [...tag].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
    const n = Math.min(glatt.length, MAX_ZEITEN - (seed % 2));   // mal 3, mal 4 Zeiten
    const schritt = glatt.length / n, versatz = (seed % 97) / 97;
    const out = [];
    for (let i = 0; i < n; i++) out.push(glatt[Math.min(glatt.length - 1, Math.floor((i + versatz) * schritt))]);
    return [...new Set(out)];
  }

  function zeichnen() {
    const keys = Object.keys(tage);
    if (!keys.length) {
      box.replaceChildren(...kopf, el('p', { class: 'info' }, 'Gerade sind online keine Termine frei. Rufen Sie mich gern an: 0160 1572410.'));
      return;
    }
    const { vorschlag = [], alle = [] } = tage[tagWahl] || {};
    // gewählte Zeit aus dem Menü zusätzlich als Knopf zeigen
    const zeiten = zeitWahl && alle.includes(zeitWahl) && !vorschlag.includes(zeitWahl) ? [...vorschlag, zeitWahl].sort() : vorschlag;
    const rest = alle.filter(z => !zeiten.includes(z));
    const menue = rest.length ? el('select', { class: 'mehr', 'aria-label': 'Andere Uhrzeit wählen',
      onchange: (e) => { if (e.target.value) { zeitWahl = e.target.value; zeichnen(); box.querySelector('input[name=name]')?.focus({ preventScroll: true }); } } },
      el('option', { value: '' }, 'Andere Uhrzeit …'), ...rest.map(z => el('option', { value: z }, uhr(z) + ' Uhr'))) : null;
    const knopf = (z) => el('button', { type: 'button', class: 'zeit', 'aria-pressed': z === zeitWahl ? 'true' : 'false',
      onclick: () => { zeitWahl = z; zeichnen(); box.querySelector('input[name=name]')?.focus({ preventScroll: true }); box.querySelector('form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }, uhr(z) + ' Uhr');
    // Leere Gruppen weglassen (replaceChildren würde sonst „null“ als Text einfügen)
    box.replaceChildren(...[...kopf,
      el('div', { class: 'tage', role: 'group', 'aria-label': 'Tag wählen' }, ...keys.map(t => el('button', {
        type: 'button', class: 'tag', 'aria-pressed': t === tagWahl ? 'true' : 'false',
        onclick: () => { tagWahl = t; zeitWahl = null; zeichnen(); } }, el('span', {}, wochentag(t)), el('b', {}, kurzDatum(t))))),
      el('div', { class: 'zeiten' }, ...zeiten.map(knopf)),
      menue,
      zeitWahl ? formular() : el('p', { class: 'info' }, 'Keine passende Zeit dabei? Rufen Sie kurz an: ', el('a', { href: 'tel:+491601572410', style: 'color:inherit' }, '0160 1572410'), '.')].filter(Boolean));
  }

  function formular() {
    const fehler = el('p', { class: 'fehler', role: 'alert' });
    const f = el('form', { novalidate: '' },
      el('div', { class: 'gewaehlt' }, `${langDatum(zeitWahl)}, ${uhr(zeitWahl)} Uhr`),
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
      const knopf = f.querySelector('.senden');
      knopf.disabled = true; knopf.textContent = 'Wird gebucht …'; fehler.textContent = '';
      const notiz = [betrieb && `Betrieb: ${betrieb}`, `Gebucht über ${quelle}`, d.telefon && `Lieber per Telefon: ${d.telefon}`].filter(Boolean).join('\n');
      try {
        const r = await fetch(`${API}/bookings`, {
          method: 'POST', headers: { 'cal-api-version': '2024-08-13', 'Content-Type': 'application/json' },
          body: JSON.stringify({ start: new Date(zeitWahl).toISOString(), eventTypeSlug: TERMIN, username: NUTZER,
            attendee: { name: d.name.trim(), email: d.email.trim(), timeZone: ZONE, language: 'de' },
            bookingFieldsResponses: { notes: notiz } }) });
        const a = await r.json();
        if (!r.ok || a.status !== 'success') throw new Error(a.error?.message || 'Buchung fehlgeschlagen');
        box.replaceChildren(el('div', { class: 'fertig' }, el('div', { class: 'haken', 'aria-hidden': 'true' }, '✓'),
          el('b', {}, 'Termin gebucht'),
          el('div', {}, `${langDatum(zeitWahl)}, ${uhr(zeitWahl)} Uhr`),
          el('p', { class: 'info' }, `Die Bestätigung mit dem Link zum Gespräch geht an ${d.email.trim()}. Ich freue mich auf Sie!`)));
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
