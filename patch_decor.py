import io, re

# ---------- styles.css: decor layer ----------
p = "styles.css"
s = io.open(p, encoding="utf-8").read()

DECOR_CSS = """
/* ---- NSO-style decor stickers (original SVG, low-key) ---- */
.decor-host { position: relative; }
.decor {
  position: absolute;
  left: var(--dx, 4%);
  top: var(--dy, 8%);
  width: var(--ds, 56px);
  height: auto;
  opacity: var(--do, 0.5);
  transform: rotate(var(--dr, 0deg));
  pointer-events: none;
  user-select: none;
  z-index: 1;
  filter: drop-shadow(0 0 10px rgba(10, 169, 231, 0.35));
  animation: decor-bob 7s ease-in-out infinite;
  animation-delay: var(--dd, 0s);
}
.decor--drift { animation: decor-bob 7s ease-in-out infinite, decor-spin 26s linear infinite; }
@keyframes decor-bob {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -9px; }
}
@keyframes decor-spin {
  from { rotate: 0deg; }
  to { rotate: 360deg; }
}
@media (max-width: 720px) {
  .decor { width: calc(var(--ds, 56px) * 0.72); opacity: calc(var(--do, 0.5) * 0.85); }
  .decor--hide-sm { display: none; }
}
"""
assert s.rstrip().endswith("}") or True
s = s.rstrip() + "\n" + DECOR_CSS

# reduced-motion kill for decor animations
rm_anchor = "prefers-reduced-motion: reduce"
i = s.find(rm_anchor)
assert i != -1
# find the closing brace of that media block and inject before it
j = s.find("}", s.find("{", i))
assert j != -1
s = s[:j] + "  .decor, .decor--drift { animation: none !important; }\n" + s[j:]
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("styles.css: decor layer added")

# ---------- HTML scattering ----------
DECOR_TMPL = '      <img class="decor{cls}" src="{src}" alt="" aria-hidden="true" loading="lazy" style="--dx:{x};--dy:{y};--ds:{sz};--dr:{rot};--do:{op};{extra}">\n'

def decor(src, x, y, sz, rot="0deg", op="0.5", cls="", extra=""):
    return DECOR_TMPL.format(src=src, x=x, y=y, sz=sz, rot=rot, op=op, cls=(" decor--" + cls if cls else ""), extra=extra)

def patch_page(path, jobs):
    s = io.open(path, encoding="utf-8").read()
    for anchor, insert in jobs:
        assert s.count(anchor) == 1, (path, anchor, s.count(anchor))
        s = s.replace(anchor, insert + anchor)
    io.open(path, "w", encoding="utf-8", newline="\n").write(s)
    print(path, "decorated:", len(jobs))

# index.html - anchor right after each section's opening tag
patch_page("index.html", [
    ('<section class="poster-section" id="poster" aria-labelledby="poster-title">',
     '  <img class="decor decor--hide-sm" src="assets/decor/star.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:2%;--dy:10%;--ds:64px;--dr:14deg;--do:.45">\n'
     '  <img class="decor" src="assets/decor/bubble.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:92%;--dy:70%;--ds:54px;--do:.4">\n'),
    ('<section class="manifesto" id="manifesto" aria-labelledby="manifesto-title">',
     '  <img class="decor decor--hide-sm" src="assets/decor/heart.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:88%;--dy:6%;--ds:58px;--dr:-10deg;--do:.5">\n'
     '  <img class="decor" src="assets/decor/sparkle.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:6%;--dy:78%;--ds:44px;--dr:8deg;--do:.45;--dd:1.2s">\n'),
    ('<section class="issue" id="issue" aria-labelledby="issue-title">',
     '  <img class="decor decor--hide-sm" src="assets/decor/bubble.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:4%;--dy:14%;--ds:60px;--do:.35">\n'
     '  <img class="decor decor--drift" src="assets/decor/sparkle.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:94%;--dy:60%;--ds:40px;--dr:-12deg;--do:.5;--dd:2s">\n'),
    ('<section class="signals" id="signals" aria-labelledby="signals-title">',
     '  <img class="decor decor--hide-sm" src="assets/decor/heart-bow.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:93%;--dy:8%;--ds:62px;--dr:12deg;--do:.5">\n'),
    ('<section class="protocol" id="protocol" aria-labelledby="protocol-title">',
     '  <img class="decor" src="assets/decor/bubble.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:90%;--dy:24%;--ds:48px;--do:.35;--dd:.8s">\n'
     '  <img class="decor decor--hide-sm" src="assets/decor/sparkle.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:3%;--dy:86%;--ds:46px;--dr:20deg;--do:.45;--dd:1.6s">\n'),
    ('<section class="resources" id="resources" aria-labelledby="resources-title">',
     '  <img class="decor decor--hide-sm" src="assets/decor/star.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:94%;--dy:12%;--ds:52px;--dr:-16deg;--do:.45">\n'),
])

# hero gets its own pair (inside hero__frame, absolute within hero)
s = io.open("index.html", encoding="utf-8").read()
a = '<div class="hero__frame container">'
assert s.count(a) == 1
s = s.replace(a, a + '\n'
    '        <img class="decor decor--hide-sm" src="assets/decor/sparkle.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:38%;--dy:4%;--ds:70px;--dr:10deg;--do:.55">\n'
    '        <img class="decor" src="assets/decor/swirl.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:2%;--dy:88%;--ds:96px;--dr:-6deg;--do:.4;--dd:1s">\n')
io.open("index.html", "w", encoding="utf-8", newline="\n").write(s)
print("index.html hero decorated")

# outputs.html - page head + one decor per output spread
patch_page("outputs.html", [
    ('<section class="page-head">',
     '  <img class="decor decor--hide-sm" src="assets/decor/bow.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:88%;--dy:16%;--ds:84px;--dr:-8deg;--do:.5">\n'
     '  <img class="decor" src="assets/decor/sparkle.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:6%;--dy:70%;--ds:46px;--dr:12deg;--do:.45;--dd:1.4s">\n'),
])
s = io.open("outputs.html", encoding="utf-8").read()
n = 0
for m in re.finditer(r'<section class="output[^"]*"', s):
    n += 1
# decorate each output section by inserting after its opening tag
def add_to_outputs(match):
    global n
    pass
# simpler: split-insert
parts = re.split(r'(<section class="output[^"]*"[^>]*>)', s)
out = []
k = 0
items = [
    ('assets/decor/heart.svg',   '94%', '8%',  '52px', '-10deg', '.45', ''),
    ('assets/decor/bubble.svg',  '4%',  '12%', '56px', '0deg',  '.35', ''),
    ('assets/decor/star.svg',    '95%', '70%', '44px', '18deg', '.45', ''),
    ('assets/decor/heart-bow.svg','92%','10%', '56px', '10deg', '.5',  ''),
]
for part in parts:
    out.append(part)
    if re.fullmatch(r'<section class="output[^"]*"[^>]*>', part):
        src, x, y, sz, rot, op, cls = items[k % len(items)]
        k += 1
        out.append('\n  <img class="decor decor--hide-sm" src="%s" alt="" aria-hidden="true" loading="lazy" style="--dx:%s;--dy:%s;--ds:%s;--dr:%s;--do:%s">\n' % (src, x, y, sz, rot, op))
s = "".join(out)
assert k == 4, k
io.open("outputs.html", "w", encoding="utf-8", newline="\n").write(s)
print("outputs.html spreads decorated:", k)

# synthesis.html - page head + team
patch_page("synthesis.html", [
    ('<section class="page-head">',
     '  <img class="decor decor--hide-sm" src="assets/decor/heart-bow.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:90%;--dy:14%;--ds:66px;--dr:-12deg;--do:.5">\n'
     '  <img class="decor" src="assets/decor/bubble.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:5%;--dy:74%;--ds:52px;--do:.35;--dd:.6s">\n'),
    ('<section class="team" id="team" aria-labelledby="team-title">',
     '  <img class="decor decor--hide-sm" src="assets/decor/sparkle.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:93%;--dy:6%;--ds:48px;--dr:14deg;--do:.5">\n'
     '  <img class="decor decor--hide-sm" src="assets/decor/heart.svg" alt="" aria-hidden="true" loading="lazy" style="--dx:4%;--dy:88%;--ds:50px;--dr:-8deg;--do:.4;--dd:1.8s">\n'),
])

print("ALL DONE")
