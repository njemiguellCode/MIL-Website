/* ============================================================
   O.R.A.I. — interactions
   Boot sequence · reveal on scroll · scrollspy · self-check · nav
   ============================================================ */
(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Retro UI sound engine (WebAudio synth, no assets) ---------- */
  const SoundFX = (() => {
    const KEY = "orai-sound";
    const store = {
      get(k) { try { return localStorage.getItem(k); } catch { return null; } },
      set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
    };
    let muted = store.get(KEY) === "off";
    let ctx = null;
    let master = null;

    const ensureCtx = () => {
      if (ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
      return true;
    };

    const unlock = () => {
      if (ensureCtx() && ctx.state === "suspended") ctx.resume().catch(() => {});
    };

    const tone = (freq, opts) => {
      const { type = "sine", dur = 0.1, gain = 0.5, delay = 0, slide = null } = opts || {};
      if (muted || !ensureCtx() || ctx.state !== "running") return;
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    };

    const hiss = (opts) => {
      const { dur = 0.2, from = 400, to = 1800, gain = 0.3 } = opts || {};
      if (muted || !ensureCtx() || ctx.state !== "running") return;
      const t0 = ctx.currentTime;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(from, t0);
      bp.frequency.exponentialRampToValueAtTime(to, t0 + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(master);
      src.start(t0);
      src.stop(t0 + dur + 0.05);
    };

    const play = (name) => {
      switch (name) {
        case "tick":
          tone(880, { type: "square", dur: 0.05, gain: 0.22, slide: 660 });
          break;
        case "confirm":
          tone(660, { dur: 0.07, gain: 0.45 });
          tone(990, { dur: 0.09, gain: 0.45, delay: 0.07 });
          break;
        case "warn":
          tone(440, { type: "sawtooth", dur: 0.14, gain: 0.35, slide: 220 });
          break;
        case "enter":
          [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
            tone(f, { type: "triangle", dur: 0.16, gain: 0.45, delay: i * 0.06 })
          );
          hiss({ dur: 0.25, from: 300, to: 2200, gain: 0.16 });
          break;
        case "click":
          tone(1200, { type: "square", dur: 0.03, gain: 0.25, slide: 900 });
          break;
        case "toggleOn":
          tone(784, { dur: 0.06, gain: 0.45 });
          tone(1175, { dur: 0.09, gain: 0.45, delay: 0.06 });
          break;
        case "toggleOff":
          tone(1175, { dur: 0.06, gain: 0.45 });
          tone(784, { dur: 0.09, gain: 0.45, delay: 0.06 });
          break;
        case "whoosh":
          hiss({ dur: 0.22, from: 300, to: 1800, gain: 0.3 });
          break;
      }
    };

    return {
      play,
      unlock,
      enabled: () => !muted,
      toggle() {
        muted = !muted;
        store.set(KEY, muted ? "off" : "on");
        if (master) master.gain.value = muted ? 0 : 0.16;
        unlock();
        return !muted;
      },
    };
  })();

  // Browsers start audio suspended until a gesture - unlock on first input
  window.addEventListener("pointerdown", () => SoundFX.unlock(), { once: true, capture: true });
  window.addEventListener("keydown", () => SoundFX.unlock(), { once: true, capture: true });

  /* ---------- Reveal on scroll (armed after boot) ---------- */
  const initReveals = () => {
    const revealEls = document.querySelectorAll(".reveal");
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    // Stagger siblings that become visible together
    const groups = new Map();
    revealEls.forEach((el) => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });
    groups.forEach((els) => {
      els.forEach((el, i) => {
        if (els.length > 1 && els.length <= 6) {
          el.style.setProperty("--reveal-delay", `${Math.min(i * 0.09, 0.45)}s`);
        }
      });
    });

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    revealEls.forEach((el) => revealObserver.observe(el));
  };

  /* ---------- Hidden terminal (type ORAI to unlock) ---------- */
  const term = document.getElementById("terminal");
  const initTerminal = () => {
    if (!term) return;

    const bodyEl = document.getElementById("termBody");
    const closeBtn = document.getElementById("termClose");
    let input = null;
    let lastFocus = null;

    const print = (text, cls = "") => {
      const div = document.createElement("div");
      div.className = "term__line" + (cls ? " term__line--" + cls : "");
      div.textContent = text;
      bodyEl.appendChild(div);
      bodyEl.scrollTop = bodyEl.scrollHeight;
      return div;
    };

    const printHTML = (html, cls = "") => {
      const div = document.createElement("div");
      div.className = "term__line" + (cls ? " term__line--" + cls : "");
      div.innerHTML = html;
      bodyEl.appendChild(div);
      bodyEl.scrollTop = bodyEl.scrollHeight;
      return div;
    };

    const COMMANDS = {
      help: () => {
        printHTML("AVAILABLE COMMANDS:", "sys");
        [
          ["HELP", "list commands"],
          ["STATUS", "system diagnostics"],
          ["DEPENDENCE", "live dependence index"],
          ["WHOAMI", "operator identity"],
          ["SLOGAN", "print project tagline"],
          ["POSTER", "scroll to the poster"],
          ["THESIS", "scroll to our thesis"],
          ["CHECKLIST", "scroll to self-check"],
          ["EXIT", "close terminal"],
        ].forEach(([cmd, desc]) => printHTML(`  ${cmd.padEnd(12)}<span class="term__line--dim">${desc}</span>`));
      },
      status: () => {
        print("NEURAL LINK ............ STABLE", "ok");
        print("TRUST.CALIBRATION ...... NOMINAL", "ok");
        print("AUTOPILOT .............. DETECTED — ADVISORY", "warn");
        print("HUMAN IN THE LOOP ...... " + (checks.length ? String(checks.filter((c) => c.checked).length) + " WARNINGS LOGGED" : "UNKNOWN"), "sys");
        print("UPTIME ................. " + Math.round(performance.now() / 1000) + "s", "dim");
      },
      dependence: () => {
        const n = checks.length ? checks.filter((c) => c.checked).length : 0;
        const notes = ["SYSTEM NOMINAL — JUDGMENT ONLINE", "LOW DEPENDENCE — STAY VIGILANT", "CALIBRATION ADVISED", "DRIFT DETECTED", "HIGH DEPENDENCE — REASSERT CONTROL", "CRITICAL — AUTOPILOT HAS THE WHEEL", "MAXIMUM OVERDRIVE"];
        print(`DEPENDENCE.INDEX: ${n}/6 — ${notes[Math.min(n, notes.length - 1)]}`, n >= 4 ? "warn" : n >= 2 ? "sys" : "ok");
      },
      whoami: () => print("HUMAN OPERATOR — CLEARANCE: CURIOUS", "ok"),
      slogan: () => print("TRUST THE MACHINE. VERIFY LIKE A HUMAN.", "sys"),
      poster: () => { closeTerminal(); document.querySelector('#poster')?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" }); },
      thesis: () => { closeTerminal(); document.querySelector('#manifesto')?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" }); },
      checklist: () => { closeTerminal(); document.querySelector('#signals')?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" }); },
      exit: () => closeTerminal(),
    };

    const runCommand = (raw) => {
      const cmd = raw.trim().toLowerCase();
      if (!cmd) return;
      print(raw, "in");
      const fn = COMMANDS[cmd];
      if (fn) {
        if (cmd !== "exit" && !cmd.startsWith("poster") && !cmd.startsWith("thesis") && !cmd.startsWith("checklist")) SoundFX.play(cmd === "help" || cmd === "status" || cmd === "dependence" ? "confirm" : "tick");
        fn();
      } else {
        SoundFX.play("warn");
        print(`UNKNOWN COMMAND: ${cmd.toUpperCase()} — TYPE HELP FOR COMMANDS`, "warn");
      }
    };

    const makePrompt = () => {
      const row = document.createElement("div");
      row.className = "term__prompt";
      const inp = document.createElement("input");
      inp.className = "term__input";
      inp.type = "text";
      inp.setAttribute("aria-label", "Terminal command input");
      inp.autocomplete = "off";
      inp.spellcheck = false;
      inp.placeholder = "TYPE A COMMAND";
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const value = inp.value;
          inp.value = "";
          runCommand(value);
          makePrompt();
        } else if (e.key === "Escape") {
          closeTerminal();
        }
      });
      row.appendChild(inp);
      bodyEl.appendChild(row);
      bodyEl.scrollTop = bodyEl.scrollHeight;
      input = inp;
      return inp;
    };

    const openTerminal = () => {
      if (term.classList.contains("is-open")) return;
      lastFocus = document.activeElement;
      term.setAttribute("aria-hidden", "false");
      term.classList.add("is-open");
      document.body.style.overflow = "hidden";
      SoundFX.play("confirm");
      if (!bodyEl.childElementCount) {
        print("O.R.A.I. MAINTENANCE TERMINAL v2.6.0", "sys");
        print("UNAUTHORIZED ACCESS IS LOGGED AND, FRANKLY, ENCOURAGED.", "dim");
        print(" ");
        print("TYPE HELP FOR COMMANDS.", "ok");
      }
      makePrompt();
      setTimeout(() => input && input.focus(), 60);
    };

    function closeTerminal() {
      if (!term.classList.contains("is-open")) return;
      term.classList.remove("is-open");
      term.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      SoundFX.play("whoosh");
      if (input) input.blur();
      if (lastFocus && lastFocus.isConnected) lastFocus.focus();
    }

    closeBtn.addEventListener("click", closeTerminal);
    term.addEventListener("pointerdown", (e) => { if (e.target === term) closeTerminal(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && term.classList.contains("is-open")) closeTerminal();
    });

    // Expose for the ORAI unlock
    window.__oraiOpenTerminal = openTerminal;
  };

  // ORAI key-buffer: works during boot AND on the live page.
  // During boot, keys that keep the code plausible hold the skip; a hit defers
  // the terminal until the boot lifts so the sequence stays intact.
  let oraiBuffer = "";
  let oraiPending = false;
  const pushOraiKey = (key) => {
    oraiBuffer = (oraiBuffer + key.toUpperCase()).slice(-4);
    if (oraiBuffer === "ORAI") {
      oraiBuffer = "";
      oraiPending = true;
      return "hit";
    }
    return "ORAI".startsWith(oraiBuffer) ? "hold" : "miss";
  };
  const tryOpenTerminal = () => {
    if (!term) return false;
    if (window.__oraiOpenTerminal) window.__oraiOpenTerminal();
    else initTerminal();
    return true;
  };
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { oraiBuffer = ""; return; }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key.length !== 1) return;
    if (pushOraiKey(e.key) === "hit" && !document.body.classList.contains("is-booting")) {
      oraiPending = false;
      tryOpenTerminal();
    }
  });

  /* ---------- Y2K boot sequence ---------- */
  const boot = document.getElementById("boot");
  const safeStore = {
    get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch { /* private mode */ } },
  };

  const finishBoot = () => {
    safeStore.set("orai-booted", "1");
    document.body.classList.remove("is-booting");
    if (boot && boot.isConnected) {
      boot.classList.add("is-done");
      boot.addEventListener("transitionend", () => boot.remove(), { once: true });
      setTimeout(() => boot.isConnected && boot.remove(), 900); // failsafe if transitions never fire
    }
    initReveals(); // hero rises as the screen lifts
    if (oraiPending) {
      oraiPending = false;
      setTimeout(tryOpenTerminal, 500); // terminal rises once the boot has cleared
    }
  };

  if (!boot || prefersReducedMotion || safeStore.get("orai-booted")) {
    // Returning visitor, reduced motion, or no boot markup: skip straight in
    if (boot) boot.remove();
    document.body.classList.remove("is-booting");
    initReveals();
  } else {
    const linesEl = document.getElementById("bootLines");
    const fillEl = document.getElementById("bootFill");
    const pctEl = document.getElementById("bootPct");

    const SEQUENCE = [
      ["CHECKING NEURAL LINK", "OK", "ok"],
      ["CHECKING CRITICAL.THINKING", "OK", "ok"],
      ["CHECKING TRUST.CALIBRATION", "OK", "ok"],
      ["CHECKING AUTOPILOT", "DETECTED — ADVISORY", "warn"],
      ["LOADING GROUP.POSTER", "OK", "ok"],
      ["LOADING THESIS.DB", "OK", "ok"],
      ["HUMAN IN THE LOOP", "CONFIRMED", "go"],
    ];
    const LINE_DELAY = 220;
    const ENTER_DELAY = 800;

    let done = false;
    let index = 0;

    const addRow = (label, status, cls) => {
      const row = document.createElement("div");
      row.className = "boot__row";
      row.innerHTML =
        `<span class="boot__label">${label}</span>` +
        `<span class="boot__lead" aria-hidden="true"></span>` +
        `<span class="boot__${cls}">[ ${status} ]</span>`;
      linesEl.appendChild(row);
    };

    const endBoot = () => {
      if (done) return;
      done = true;
      window.removeEventListener("keydown", bootKeyListener);
      clearInterval(lineTimer);
      SoundFX.play("enter");
      finishBoot();
    };

    const lineTimer = setInterval(() => {
      if (index < SEQUENCE.length) {
        const [label, status, cls] = SEQUENCE[index];
        addRow(label, status, cls);
        SoundFX.play(cls === "warn" ? "warn" : cls === "go" ? "confirm" : "tick");
        index += 1;
        const pct = Math.round((index / SEQUENCE.length) * 94);
        fillEl.style.width = `${pct}%`;
        pctEl.textContent = `${pct}%`;
      } else {
        clearInterval(lineTimer);
        fillEl.style.width = "100%";
        pctEl.textContent = "100%";
        addRow("SYSTEM READY — WELCOME BACK, HUMAN", "ENTER", "ok");
        setTimeout(endBoot, ENTER_DELAY);
      }
    }, LINE_DELAY);

    // Skippable: any key or click jumps straight in — except keys that keep
    // the ORAI code alive, which hold the boot instead
    const bootKeyListener = (e) => {
      if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (pushOraiKey(e.key) !== "miss") return; // hold (or hit: terminal opens after lift)
      }
      endBoot();
    };
    window.addEventListener("keydown", bootKeyListener);
    boot.addEventListener("pointerdown", endBoot, { once: true });
    setTimeout(endBoot, 8000); // hard cap
  }

  /* ---------- Scrollspy ---------- */
  const spyLinks = Array.from(document.querySelectorAll("[data-spy]"));
  const spyTarget = (link) => {
    const hash = link.getAttribute("href").split("#")[1];
    return hash ? document.getElementById(hash) : null;
  };
  const sections = spyLinks.map(spyTarget).filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const setActive = (id) => {
      spyLinks.forEach((link) => {
        link.classList.toggle("is-active", spyTarget(link)?.id === id);
      });
    };

    const spyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-38% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach((s) => spyObserver.observe(s));

    // Keep the hero clear of highlights
    const hero = document.querySelector(".hero");
    if (hero) {
      new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setActive("");
          });
        },
        { rootMargin: "-38% 0px -55% 0px", threshold: 0 }
      ).observe(hero);
    }
  }

  /* ---------- Self-check readout ---------- */
  const checks = Array.from(document.querySelectorAll(".check__input"));
  const countEl = document.getElementById("checkCount");
  const noteEl = document.getElementById("checkNote");
  const meterEl = document.getElementById("checkMeter");

  if (checks.length && countEl && noteEl && meterEl) {
    const notes = [
      "SYSTEM NOMINAL — JUDGMENT ONLINE",
      "LOW DEPENDENCE — STAY VIGILANT",
      "CALIBRATION ADVISED — RECHECK HABITS",
      "DRIFT DETECTED — REASSERT CONTROL",
      "HIGH DEPENDENCE — HUMAN IN DANGER OF EXITING LOOP",
      "CRITICAL — AUTOPILOT HAS THE WHEEL",
      "MAXIMUM OVERDRIVE — TIME TO TAKE THE WHEEL BACK",
    ];
    const update = () => {
      const n = checks.filter((c) => c.checked).length;
      countEl.textContent = String(n);
      noteEl.textContent = notes[Math.min(n, notes.length - 1)];
      meterEl.style.width = `${(n / checks.length) * 100}%`;
      noteEl.style.color = n >= 4 ? "var(--orange-red)" : n >= 2 ? "var(--cyan)" : "var(--green)";
    };
    checks.forEach((c) =>
      c.addEventListener("change", () => {
        SoundFX.play(c.checked ? "toggleOn" : "toggleOff");
        update();
      })
    );
    update();
  }


  /* ---------- FAQ: close other items when one opens ---------- */
  const faqItems = Array.from(document.querySelectorAll(".faq__item"));
  faqItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (item.open) {
        SoundFX.play("whoosh");
        faqItems.forEach((other) => { if (other !== item) other.open = false; });
      }
    });
  });

  /* ---------- Click sounds for nav links & buttons ---------- */
  document.addEventListener("click", (e) => {
    if (e.target.closest('a[href^="#"], .btn')) SoundFX.play("click");
  });

  /* ---------- Sound toggle ---------- */
  const soundBtn = document.getElementById("soundToggle");
  if (soundBtn) {
    const applySoundUI = () => {
      const on = SoundFX.enabled();
      soundBtn.setAttribute("aria-pressed", String(on));
      soundBtn.setAttribute("aria-label", on
        ? "Interface sounds: on - activate to mute"
        : "Interface sounds: off - activate to unmute");
      soundBtn.querySelector(".nav__sound-text").textContent = on ? "SND.ON" : "SND.OFF";
    };
    applySoundUI();
    soundBtn.addEventListener("click", () => {
      const wasOn = SoundFX.enabled();
      if (wasOn) SoundFX.play("click");
      const on = SoundFX.toggle();
      applySoundUI();
      if (on) SoundFX.play("confirm");
    });
  }

  /* ---------- Lightbox (poster + output media) ---------- */
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.setAttribute("aria-hidden", "true");
  lightbox.innerHTML = `<img src="" alt="" /><p class="lightbox__hint">CLICK ANYWHERE OR PRESS ESC TO CLOSE</p>`;
  document.body.appendChild(lightbox);
  const lbImg = lightbox.querySelector("img");
  const openLightbox = (src, alt) => {
    lbImg.src = src;
    lbImg.alt = alt || "";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    SoundFX.play("confirm");
  };
  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    SoundFX.play("click");
  };
  document.querySelectorAll("[data-lightbox]").forEach((el) => {
    el.addEventListener("click", () => {
      const img = el.querySelector("img");
      openLightbox(el.getAttribute("data-lightbox"), img ? img.alt : "");
    });
  });
  lightbox.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("is-open")) closeLightbox();
  });

  /* ---------- Placeholder art for missing output images ---------- */
  document.querySelectorAll("img[data-fallback]").forEach((img) => {
    img.addEventListener("error", () => {
      const slot = img.closest(".media-slot");
      img.remove();
      if (slot) {
        const label = slot.querySelector("[data-placeholder]");
        if (label) label.hidden = false;
        slot.style.cursor = "default";
      }
    });
    if (img.complete && img.naturalWidth === 0) img.dispatchEvent(new Event("error"));
  });

  /* ---------- Poster tilt sheen (pointer fine only) ---------- */
  const posterGlass = document.querySelector(".poster__glass");
  if (posterGlass && window.matchMedia("(pointer: fine)").matches && !prefersReducedMotion) {
    posterGlass.addEventListener("pointermove", (e) => {
      const rect = posterGlass.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      posterGlass.style.setProperty("--sheen-x", `${x * 100}%`);
      posterGlass.style.setProperty("--sheen-y", `${y * 100}%`);
    });
  }

  /* ============================================================
     P-MENU - Persona-style interactive navigation
     Behavioral reference: persona_3_reload_pause_menu (Ultipuk)
     ============================================================ */
  const pmenu = document.getElementById("pmenu");
  if (pmenu) {
    const openBtn = document.getElementById("pmenuOpen");
    const closeBtn = document.getElementById("pmenuClose");
    const listEl = document.getElementById("pmenuList");
    const items = Array.from(listEl.querySelectorAll(".pmenu__item"));
    const cursor = document.getElementById("pmenuCursor");
    const clockEl = document.getElementById("pmenuClock");
    const wipe = document.getElementById("pagewipe");
    const wipeLabel = document.getElementById("pagewipeLabel");
    let focusIdx = 0;
    let menuOpen = false;
    let lastFocus = null;
    let curAnim = null;
    const openObservers = [];

    /* --- cursor: smooth tweened move + resize (reference behavior) --- */
    const positionCursor = (el, instant = false) => {
      const r = el.getBoundingClientRect();
      const targetX = r.left - 46;
      const targetY = r.top + r.height / 2 - 20;
      const scale = Math.max(0.7, Math.min(1.35, r.height / 44));
      if (instant || !curAnim) {
        cursor.style.transition = instant ? "none" : "";
        cursor.style.transform = `translate(${targetX}px, ${targetY}px) scale(${scale})`;
        if (instant) requestAnimationFrame(() => (cursor.style.transition = ""));
        return;
      }
      const cs = getComputedStyle(cursor).transform;
      const m = new DOMMatrixReadOnly(cs === "none" ? "" : cs);
      const fromX = m.m41, fromY = m.m42, fromS = m.a;
      const t0 = performance.now();
      const DUR = 260;
      cursor.classList.add("is-moving", "is-flipping");
      const step = (now) => {
        const t = Math.min(1, (now - t0) / DUR);
        const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
        const x = fromX + (targetX - fromX) * e;
        const y = fromY + (targetY - fromY) * e;
        const sc = fromS + (scale - fromS) * e;
        cursor.style.transform = `translate(${x}px, ${y}px) scale(${sc})`;
        if (t < 1) { curAnim = requestAnimationFrame(step); }
        else { curAnim = null; cursor.classList.remove("is-moving"); setTimeout(() => cursor.classList.remove("is-flipping"), 250); }
      };
      if (curAnim) cancelAnimationFrame(curAnim);
      curAnim = requestAnimationFrame(step);
    };

    const setFocus = (idx, instant = false) => {
      focusIdx = (idx + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle("is-focus", i === focusIdx));
      positionCursor(items[focusIdx], instant);
    };

    /* --- menu loop video: play only while the menu is open --- */
    const menuVideo = pmenu.querySelector(".pmenu__video");
    if (menuVideo) {
      menuVideo.muted = true;
      const playVideo = () => menuVideo.play().catch(() => {});
      const pauseVideo = () => menuVideo.pause();
      openObservers.push({ on: playVideo, off: pauseVideo });
    }

    /* --- date + time readout (P3R-style top-right) --- */
    const dateEl = document.getElementById("pmenuDate");
    const dayEl = document.getElementById("pmenuDay");
    const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
    const DAYS = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
    const tickClock = () => {
      const d = new Date();
      clockEl.textContent = [d.getHours(), d.getMinutes()].map((n) => String(n).padStart(2, "0")).join(":");
      if (dateEl) dateEl.textContent = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
      if (dayEl) dayEl.textContent = DAYS[d.getDay()];
    };
    tickClock();
    setInterval(tickClock, 15000);

    /* --- open / close with staged mask reveal --- */
    const openMenu = () => {
      if (menuOpen) return;
      menuOpen = true;
      lastFocus = document.activeElement;
      pmenu.classList.remove("is-closing");
      pmenu.classList.add("is-open");
      pmenu.setAttribute("aria-hidden", "false");
      openBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      SoundFX.play("whoosh");
      openObservers.forEach((o) => o.on());
      const here = location.pathname.split("/").pop() + (location.hash || "");
      const current = items.findIndex((it) => it.getAttribute("data-href") === here);
      setFocus(current >= 0 ? current : 0, true);
      setTimeout(() => items[focusIdx].focus({ preventScroll: true }), 380);
    };

    const closeMenu = (cb) => {
      if (!menuOpen) return;
      menuOpen = false;
      pmenu.classList.add("is-closing");
      pmenu.classList.remove("is-open");
      pmenu.setAttribute("aria-hidden", "true");
      openBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      SoundFX.play("click");
      openObservers.forEach((o) => o.off());
      setTimeout(() => {
        pmenu.classList.remove("is-closing");
        if (cb) cb();
        else if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
      }, 560);
    };

    /* --- page navigation with circular wipe --- */
    const navigateTo = (href) => {
      const [path, hash] = href.split("#");
      const item = items.find((it) => it.getAttribute("data-href") === href);
      const label = item ? item.textContent.replace(/^\d+/, "").trim() : "LOADING";
      const samePage = path === location.pathname.split("/").pop();
      wipeLabel.textContent = label;
      wipe.classList.add("is-active");
      void wipe.offsetWidth; // reflow so the transition plays
      wipe.classList.add("is-in");
      SoundFX.play("enter");
      setTimeout(() => {
        if (samePage && hash) {
          const target = document.getElementById(hash);
          if (target) target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
          wipe.classList.remove("is-in");
          wipe.classList.add("is-out");
          setTimeout(() => wipe.classList.remove("is-active", "is-out"), 700);
        } else {
          location.href = href;
        }
      }, 620);
    };

    items.forEach((it) => {
      it.addEventListener("pointerenter", () => setFocus(items.indexOf(it)));
      it.addEventListener("click", () => {
        it.classList.add("is-leaving");
        closeMenu(() => navigateTo(it.getAttribute("data-href")));
      });
      it.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          it.classList.add("is-leaving");
          closeMenu(() => navigateTo(it.getAttribute("data-href")));
        }
      });
    });

    openBtn.addEventListener("click", openMenu);
    closeBtn.addEventListener("click", () => closeMenu());
    pmenu.addEventListener("pointerdown", (e) => { if (e.target === pmenu) closeMenu(); });
    document.addEventListener("keydown", (e) => {
      if (!menuOpen) {
        if ((e.key === "m" || e.key === "M") && !e.altKey && !e.ctrlKey && !e.metaKey
            && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || "")) {
          openMenu();
        }
        return;
      }
      if (e.key === "Escape") { closeMenu(); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocus(focusIdx + (e.key === "ArrowDown" ? 1 : -1));
        SoundFX.play("tick");
      }
      if (e.key === "Home") { setFocus(0); SoundFX.play("tick"); }
      if (e.key === "End") { setFocus(items.length - 1); SoundFX.play("tick"); }
    });
  }
})();
