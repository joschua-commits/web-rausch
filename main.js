/* Webrausch v2: Partikel-Hero, Zerfall-Szene, horizontaler Ablauf, Mikrointeraktionen. Kein Framework. */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Einblenden, sobald Schriften da sind
  document.documentElement.classList.add("js");
  var reveal = function () { document.documentElement.classList.add("loaded"); document.body.classList.add("loaded"); };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { setTimeout(reveal, 80); });
  setTimeout(reveal, 700);
  $$(".hero-title .w").forEach(function (w, i) { w.style.transitionDelay = (0.15 + i * 0.08) + "s"; });

  // Navigation
  var nav = $("#nav");
  var onNav = function () { nav.classList.toggle("solid", window.scrollY > 40); };

  // Magnetische Knöpfe
  if (fine && !reduced) {
    $$(".magnetic").forEach(function (b) {
      b.addEventListener("mousemove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty("--mx", ((e.clientX - r.left - r.width / 2) * 0.28) + "px");
        b.style.setProperty("--my", ((e.clientY - r.top - r.height / 2) * 0.4) + "px");
      });
      b.addEventListener("mouseleave", function () { b.style.setProperty("--mx", "0px"); b.style.setProperty("--my", "0px"); });
    });
  }

  // 1 Hero: ruhige Flusslinien, die dem Mauszeiger ausweichen
  (function flow() {
    var c = $("#flow"); if (!c) return;
    var ctx = c.getContext("2d"), dpr = Math.min(devicePixelRatio || 1, 2);
    var W, H, n, t = 0, visible = true;
    var mouse = { x: -9999, y: -9999 }, m = { x: -9999, y: -9999, s: 0 };
    function size() {
      W = c.clientWidth; H = c.clientHeight; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      n = W < 700 ? 26 : 44;
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      // Maus weich nachziehen, Stärke ein- und ausblenden
      var on = mouse.x > -999;
      if (on) { if (m.x < -999) { m.x = mouse.x; m.y = mouse.y; } m.x += (mouse.x - m.x) * 0.08; m.y += (mouse.y - m.y) * 0.08; }
      m.s += ((on ? 1 : 0) - m.s) * 0.05;
      var cy = H * (W < 700 ? 0.86 : 0.76), mid = (n - 1) / 2, R = Math.max(W, H) * 0.12;
      for (var i = 0; i < n; i++) {
        var k = (i - mid) / mid;                       // -1 … 1
        var orange = Math.abs(i - mid) < 1.6;
        ctx.beginPath();
        for (var x = -20; x <= W + 20; x += 10) {
          var u = x / W;
          // das Bündel zieht sich in der Mitte zusammen wie der Schwung im Logo
          var spread = 0.18 + 0.82 * Math.pow(Math.abs(Math.sin(u * Math.PI * 0.9 + 0.4)), 1.4);
          var y = cy + k * H * 0.13 * spread
            + Math.sin(u * 5.2 + t * 0.6 + k * 0.9) * H * 0.045
            + Math.sin(u * 2.1 - t * 0.35) * H * 0.07;
          if (m.s > 0.01) {
            var dx = x - m.x, dy = y - m.y, f = Math.exp(-(dx * dx + dy * dy) / (2 * R * R));
            y += (dy >= 0 ? 1 : -1) * f * R * 0.55 * m.s;
          }
          x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.lineWidth = orange ? 1.4 : 1;
        ctx.strokeStyle = orange ? "rgba(255,116,0," + (0.9 - Math.abs(i - mid) * 0.25) + ")" : "rgba(244,239,232," + (0.05 + 0.13 * (1 - Math.abs(k))) + ")";
        ctx.stroke();
      }
    }
    function loop() { if (visible && !document.hidden) { t += 0.012; draw(); } requestAnimationFrame(loop); }
    size(); addEventListener("resize", function () { clearTimeout(size.t); size.t = setTimeout(function () { size(); draw(); }, 150); });
    var hero = $("#hero");
    hero.addEventListener("pointermove", function (e) { var r = c.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener("pointerleave", function () { mouse.x = mouse.y = -9999; });
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(hero);
    if (reduced) draw(); else loop();
  })();

  function rnd(a, b) { return a + Math.random() * (b - a); }

  // 3 Vom Suchen zur Anfrage: kurze Szene, spielt automatisch, sobald sie sichtbar ist
  (function journey() {
    var root = $("#anfrage"); if (!root) return;
    var steps = $$(".j-step", root), phoneEl = $(".j-phone", root);
    var typeEl = $("#jType"), nameEl = $("#jName"), msgEl = $("#jMsg"), sendEl = $("#jSend");
    var cur = -1, timer = null, inView = false, typing = [];
    var DUR = 3600;
    function typeInto(el, text, delay, speed) {
      el.textContent = "";
      typing.push(setTimeout(function tick() {
        if (el.textContent.length < text.length) { el.textContent = text.slice(0, el.textContent.length + 1); typing.push(setTimeout(tick, speed)); }
      }, delay));
    }
    function go(i) {
      typing.forEach(clearTimeout); typing = [];
      cur = i; phoneEl.dataset.step = i; root.dataset.step = i;
      $(".j-url-text", root).textContent = i === 0 ? "google.de" : "sanitaer-mustermann.de";
      steps.forEach(function (s, k) { s.classList.toggle("on", k === i); s.classList.toggle("done", k < i); s.setAttribute("aria-current", k === i ? "step" : "false"); });
      if (i === 0) typeInto(typeEl, "Badsanierung Reutlingen", 250, 55);
      if (i === 2) { sendEl.classList.remove("sent"); typeInto(nameEl, "Familie Weber", 200, 45); typeInto(msgEl, "Bad komplett neu, ca. 8 m²", 900, 35); typing.push(setTimeout(function () { sendEl.classList.add("sent"); }, 2600)); }
      if (reduced) return;
      clearTimeout(timer);
      timer = setTimeout(function () { if (inView) go((cur + 1) % steps.length); }, i === steps.length - 1 ? DUR + 1600 : DUR);
    }
    steps.forEach(function (s, k) { s.addEventListener("click", function () { go(k); }); });
    root.style.setProperty("--dur", DUR + "ms");
    new IntersectionObserver(function (es) {
      inView = es[0].isIntersecting;
      if (inView && (cur === -1 || !timer)) go(cur === -1 ? 0 : cur);
      if (!inView) { clearTimeout(timer); timer = null; }
    }, { threshold: 0.35 }).observe(root);
    if (reduced) go(3);
  })();

  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; onNav(); });
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Lichtkegel auf den Preiskarten
  $$(".spot").forEach(function (el) {
    if (!fine || reduced) return;
    el.addEventListener("mousemove", function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty("--gx", ((e.clientX - r.left) / r.width * 100) + "%");
      el.style.setProperty("--gy", ((e.clientY - r.top) / r.height * 100) + "%");
    });
  });

  // Blickführung: pro Abschnitt der Reihe nach einblenden
  (function () {
    var sel = ".eyebrow, h2, .lede, .j-step, .j-stage, .tl, .price, .about-photo, .direct, form, .block, .trade, .d-tabs";
    $$("main section:not(.hero)").forEach(function (sec) {
      $$(sel, sec).forEach(function (el, i) { el.classList.add("reveal"); el.style.setProperty("--d", Math.min(i * 0.09, 0.6) + "s"); });
    });
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(function (el) { ro.observe(el); });
  })();

  // 6 Preise hochzählen, 9 Fußzeile füllen
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target; io.unobserve(el);
      if (el.classList.contains("foot-giant")) { el.classList.add("fill"); return; }
      var from = +el.dataset.from, to = +el.dataset.to, t0 = performance.now() + 300, dur = reduced ? 0 : 1600;
      (function tick(now) {
        var k = dur ? clamp((now - t0) / dur, 0, 1) : 1; el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))).toLocaleString("de-DE");
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }, { threshold: 0.5 });
  $$(".count").forEach(function (el) { io.observe(el); });
  $$(".foot-giant").forEach(function (el) { io.observe(el); });


  // 3 Beispiele: Reiter
  var tabs = $$(".d-tabs [role=tab]");
  function openDemo(i, focus) {
    tabs.forEach(function (t, k) {
      var on = k === i;
      t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1;
      $("#" + t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tabs[i].focus();
    var leiste = tabs[i].parentNode;   // auf dem Handy den gewählten Reiter in die Mitte schieben
    if (leiste.scrollWidth > leiste.clientWidth) leiste.scrollTo({ left: tabs[i].offsetLeft - (leiste.clientWidth - tabs[i].offsetWidth) / 2, behavior: "smooth" });
  }
  tabs.forEach(function (t, k) {
    t.addEventListener("click", function () { openDemo(k); });
    t.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { e.preventDefault(); openDemo((k + d + tabs.length) % tabs.length, true); }
    });
  });
  $$("[data-demo]").forEach(function (a) { a.addEventListener("click", function () { openDemo(tabs.indexOf($("#dt-" + a.dataset.demo))); }); });

  // Beispiel-Websites umschalten
  (function () {
    var g = $(".site-galerie"); if (!g) return;
    var NAMEN = { schreinerei: "Schreinerei", zimmerei: "Zimmerei & Holzbau", maler: "Malerbetrieb" };
    $$(".sg-tabs button", g).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var s = btn.dataset.site;
        $$(".sg-tabs button", g).forEach(function (x) { x.setAttribute("aria-selected", x === btn); });
        g.classList.add("wechselt");
        setTimeout(function () {
          $("#sg-desktop").src = "img/beispiele/beispiel-" + s + "-desktop.jpg";
          $("#sg-handy").src = "img/beispiele/beispiel-" + s + "-handy.jpg";
          $("#sg-desktop").alt = "Beispiel-Website: " + NAMEN[s];
          $("#sg-url").textContent = "Beispiel-Website · " + NAMEN[s];
          g.classList.remove("wechselt");
        }, 220);
      });
    });
    ["zimmerei", "maler"].forEach(function (s) { new Image().src = "img/beispiele/beispiel-" + s + "-desktop.jpg"; });
  })();

  // Demo 5: KI-Posteingang (erfundene Mails, sortiert nur im Browser)
  (function () {
    var box = $("#inbox"); if (!box) return;
    var liste = $("#i-liste"), btn = $("#i-btn"), start = $$("#i-liste .m");
    var TAG = { dringend: "Dringend", anfrage: "Anfrage", bewerbung: "Bewerbung", rechnung: "Rechnung" };
    var RANG = { dringend: 0, anfrage: 1, bewerbung: 2, rechnung: 3, spam: 9 };
    start.forEach(function (m) { $(".m-tag", m).textContent = TAG[m.dataset.art] || ""; });
    var sortiert = false;
    btn.addEventListener("click", function () {
      if (sortiert) {
        box.classList.remove("sortiert"); $(".i-spam").classList.remove("an");
        start.forEach(function (m) { m.classList.remove("weg"); liste.appendChild(m); });
        $("#i-spam").textContent = "0"; $("#i-neu").textContent = start.length;
        btn.textContent = "Automatisch sortieren"; sortiert = false; return;
      }
      btn.disabled = true; btn.textContent = "Wird sortiert …";
      var spam = start.filter(function (m) { return m.dataset.art === "spam"; });
      spam.forEach(function (m, i) { setTimeout(function () { m.classList.add("weg"); $("#i-spam").textContent = i + 1; $(".i-spam").classList.add("an"); }, 250 + i * 220); });
      setTimeout(function () {
        start.slice().sort(function (a, b) { return RANG[a.dataset.art] - RANG[b.dataset.art]; })
          .forEach(function (m) { liste.appendChild(m); });
        box.classList.add("sortiert");
        $("#i-neu").textContent = start.length - spam.length;
        btn.disabled = false; btn.textContent = "Zurücksetzen"; sortiert = true;
      }, 250 + spam.length * 220 + 350);
    });
  })();

  var eur = function (v) { return (Math.round(v / 10) * 10).toLocaleString("de-DE") + " €"; };

  // Demo 1: Preisrechner (erfundene Preise)
  (function () {
    var size = $("#c-size"); if (!size) return;
    var out = $("#c-m2"), price = $("#c-price"), walls = $("#c-walls"), ceil = $("#c-ceil");
    function val(n) { return +$("input[name=" + n + "]:checked").value; }
    function calc() {
      var m2 = +size.value, f = val("c-state") * val("c-color");
      var wall = walls.checked ? Math.sqrt(m2) * 4 * 2.5 : 0, top = ceil.checked ? m2 : 0;
      var lo = (wall * 11 + top * 12) * f, hi = (wall * 15 + top * 16) * f;
      out.textContent = m2 + " m²";
      price.textContent = lo ? eur(lo) + " – " + eur(hi) : "Bitte etwas auswählen";
      $("#c-send").disabled = !lo; $("#c-done").hidden = true;
      return { m2: m2, txt: price.textContent };
    }
    $$("#calc input").forEach(function (i) { i.addEventListener("input", calc); });
    $("#c-send").addEventListener("click", function () {
      var r = calc(), parts = [walls.checked && "Wände", ceil.checked && "Decke"].filter(Boolean).join(" + ");
      $("#c-sum").textContent = "Zimmer " + r.m2 + " m², " + parts + ", " + $("input[name=c-state]:checked").nextElementSibling.textContent + ", Richtpreis " + r.txt + ".";
      $("#c-done").hidden = false;
    });
    calc();
  })();

  // Demo 2: Anfrage-Assistent
  (function () {
    var root = $("#wiz"); if (!root) return;
    var steps = $$(".w-step", root), res = $(".w-result", root), q = $("#w-q"), bar = $("#w-bar"), ans = [], i = 0;
    function show(k) {
      i = k;
      steps.forEach(function (s, n) { s.hidden = n !== k; });
      res.hidden = k < steps.length;
      bar.style.width = (k / steps.length * 100) + "%";
      q.textContent = k < steps.length ? steps[k].dataset.q : "";
      if (k === steps.length) {
        $("#w-title").textContent = "Familie Krämer – " + ans[0];
        $("#w-meta").textContent = ans[1] + " · " + ans[2] + (ans[3] ? " · 1 Foto angehängt" : "") + " · Rückruf abends";
      }
    }
    steps.forEach(function (s, n) {
      $$("button", s).forEach(function (b) {
        b.addEventListener("click", function () { ans[n] = n === 3 ? !!b.dataset.photo : b.textContent; show(n + 1); });
      });
    });
    $(".w-again", root).addEventListener("click", function () { ans = []; show(0); });
    show(0);
  })();

  // Demo 3: Terminbuchung, die nächsten 5 Werktage ab heute
  (function () {
    var days = $("#b-days"); if (!days) return;
    var slots = $("#b-slots"), send = $("#b-send"), pick = { d: null, t: null };
    var times = ["8:00", "9:30", "11:00", "13:30", "15:00", "16:30", "17:30", "18:30"];
    var wd = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"], list = [], d = new Date();
    while (list.length < 5) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) list.push(new Date(d)); }
    function press(box, btn) { $$("button", box).forEach(function (b) { b.setAttribute("aria-pressed", b === btn); }); }
    function renderSlots(k) {
      slots.innerHTML = "";
      times.forEach(function (t, n) {
        var b = document.createElement("button"); b.type = "button"; b.textContent = t;
        b.disabled = (n * 7 + k * 3) % 5 === 0 || (n * 3 + k) % 4 === 0;
        b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", function () { pick.t = t; press(slots, b); send.disabled = false; $("#b-done").hidden = true; });
        slots.appendChild(b);
      });
    }
    list.forEach(function (x, k) {
      var b = document.createElement("button"); b.type = "button";
      b.innerHTML = "<small>" + wd[x.getDay()] + "</small>" + x.getDate() + "." + (x.getMonth() + 1) + ".";
      b.setAttribute("aria-pressed", k === 0);
      b.addEventListener("click", function () { pick.d = x; pick.t = null; press(days, b); renderSlots(k); send.disabled = true; $("#b-done").hidden = true; });
      days.appendChild(b);
    });
    pick.d = list[0]; renderSlots(0);
    send.addEventListener("click", function () {
      $("#b-when").textContent = wd[pick.d.getDay()] + ", " + pick.d.getDate() + "." + (pick.d.getMonth() + 1) + ". · " + pick.t + " Uhr";
      $("#b-what").textContent = $("input[name=b-svc]:checked").value;
      $("#b-done").hidden = false;
    });
  })();

  // Demo 4: Stundenzettel, eine Sekunde zählt als zehn Minuten
  (function () {
    var root = $("#clock"); if (!root) return;
    var btn = $("#k-btn"), time = $("#k-time"), state = $("#k-state"), list = $("#k-list"), total = $("#k-total");
    var base = 16 * 60, mins = 0, iv = null;
    var hm = function (m) { return Math.floor(m / 60) + ":" + ("0" + (m % 60)).slice(-2) + " h"; };
    btn.addEventListener("click", function () {
      var site = $("input[name=k-site]:checked").value;
      if (!iv) {
        mins = 0; root.classList.add("on"); btn.textContent = "Ausstempeln";
        state.textContent = "Eingestempelt · " + site;
        iv = setInterval(function () { mins += 10; time.textContent = hm(mins); }, reduced ? 100 : 1000);
      } else {
        clearInterval(iv); iv = null; root.classList.remove("on"); btn.textContent = "Einstempeln";
        state.textContent = "Ausgestempelt · gespeichert";
        var li = document.createElement("li"); li.className = "new";
        li.innerHTML = "<span>Heute · " + site + "</span><b>" + hm(mins) + "</b>";
        list.appendChild(li); base += mins; total.textContent = hm(base);
      }
    });
  })();

  // 8 Funkenregen
  var sc = $("#sparks"), sx = sc.getContext("2d");
  function sparks(x, y) {
    if (reduced) return;
    var r = sc.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    sc.width = r.width * d; sc.height = r.height * d; sx.setTransform(d, 0, 0, d, 0, 0);
    var ps = [];
    for (var i = 0; i < 160; i++) { var a = rnd(-Math.PI, 0), s = rnd(4, 13); ps.push({ x: x - r.left, y: y - r.top, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: rnd(50, 100), c: Math.random() < 0.7 ? "#ff7400" : "#ffb36b" }); }
    (function f() {
      sx.clearRect(0, 0, r.width, r.height); var alive = 0;
      ps.forEach(function (p) { if (p.l-- <= 0) return; alive++; p.vy += 0.28; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; sx.fillStyle = p.c; sx.globalAlpha = Math.min(1, p.l / 40); sx.fillRect(p.x, p.y, 3, 3); });
      sx.globalAlpha = 1; if (alive) requestAnimationFrame(f); else sx.clearRect(0, 0, r.width, r.height);
    })();
  }

  // 8 Formular
  var form = $("#form"), msg = $("#f-msg"), send = $("#f-send");
  function show(t, ok) { msg.textContent = t; msg.className = "msg " + (ok ? "ok" : "err"); msg.hidden = false; }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { show("Bitte Name, E-Mail und die Einwilligung ausfüllen.", false); return; }
    send.disabled = true; send.textContent = "Wird gesendet …";
    fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.success) {
          form.reset(); show("Danke, Ihre Anfrage ist angekommen. Ich melde mich innerhalb eines Werktags.", true);
          var b = send.getBoundingClientRect(); sparks(b.left + b.width / 2, b.top + b.height / 2);
        } else show("Das hat leider nicht geklappt. Schreiben Sie mir bitte direkt an joschua@web-rausch.com.", false);
      })
      .catch(function () { show("Keine Verbindung. Schreiben Sie mir bitte direkt an joschua@web-rausch.com.", false); })
      .finally(function () { send.disabled = false; send.textContent = "Anfrage senden"; });
  });
})();
