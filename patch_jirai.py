import io

# ---------- 1. styles.css: jirai-kei trio ----------
p = "styles.css"
s = io.open(p, encoding="utf-8").read()

CSS = """
/* ---- jirai-kei trio: scallops, glyphs, magenta hearts ---- */

/* scalloped lace edge on section tops (subtle, lavender on indigo) */
.scallop-top::before {
  content: "";
  position: absolute;
  top: -1px;
  left: 0;
  right: 0;
  height: 14px;
  background:
    radial-gradient(circle at 8px -4px, transparent 10px, rgba(198, 202, 228, 0.14) 11px, transparent 12px) repeat-x;
  background-size: 16px 14px;
  pointer-events: none;
  z-index: 2;
}

/* soft magenta accent glow on the heart decorations */
img.decor[src*="heart"] {
  filter: drop-shadow(0 0 10px rgba(214, 82, 148, 0.45)) drop-shadow(0 0 22px rgba(214, 82, 148, 0.2));
}

/* bow bullets on the "what we should all do" checklist */
.poster-copy__list--check li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.28em;
  width: 14px;
  height: 10px;
  background: url("assets/decor/bow.svg") no-repeat center / contain;
  filter: drop-shadow(0 0 4px rgba(10, 169, 231, 0.4));
}

/* rosette separator in the footer baseline */
.footer__baseline-inner {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}
.footer__baseline-inner::before,
.footer__baseline-inner::after {
  content: "";
  width: 14px;
  height: 14px;
  flex: none;
  background: url("assets/decor/rosette.svg") no-repeat center / contain;
  opacity: 0.55;
}
.footer__baseline-inner p:first-child { order: 2; }
.footer__baseline-inner .footer__build { order: 3; margin-left: auto; }
"""
s = s.rstrip() + "\n" + CSS

# reduced-motion safe (scallops are static, nothing to kill)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("styles.css: trio added")

# ---------- 2. index.html: scallop class on section tops ----------
p = "index.html"
s = io.open(p, encoding="utf-8").read()
for cls in ('class="signals" id="signals"', 'class="resources" id="resources"'):
    assert cls in s, cls
    s = s.replace('<section ' + cls, '<section class="scallop-top ' + cls.split('class="')[1])
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("index.html: scallops applied")

# ---------- 3. outputs.html + synthesis.html: scallops on spreads/team ----------
p = "outputs.html"
s = io.open(p, encoding="utf-8").read()
s = s.replace('<article class="spread spread--a" id="output-01">', '<article class="spread spread--a scallop-top" id="output-01">')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "synthesis.html"
s = io.open(p, encoding="utf-8").read()
s = s.replace('<section class="team" id="team"', '<section class="team scallop-top" id="team"')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("outputs/synthesis: scallops applied")
print("ALL DONE")
