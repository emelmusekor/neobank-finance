(function () {
  var PARTS = { 1: "1부 경제 기본 상식", 2: "2부 금융 기초", 3: "3부 네오뱅크 사용법" };
  var SMALL = 1000; /* 이보다 좁은 화면은 늘 모바일 모드 */
  var chapters = Array.prototype.slice.call(document.querySelectorAll(".ch"));
  var nav = document.querySelector(".nav");
  var side = document.querySelector(".side");
  var body = document.body;
  var links = {};
  var lastPart = null;
  var count = 0;

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ── 목차와 장 끝 이전·다음 ── */
  chapters.forEach(function (ch, i) {
    var part = ch.getAttribute("data-part");
    var title = ch.getAttribute("data-title");
    if (part && part !== lastPart) {
      nav.appendChild(make("div", "nav-part", PARTS[part]));
      lastPart = part;
    }
    var a = make("a");
    a.href = "#" + ch.id;
    if (part) {
      count += 1;
      var no = make("span", "no", (count < 10 ? "0" : "") + count);
      a.appendChild(no);
      var k = ch.querySelector(".kicker");
      if (k) k.textContent = PARTS[part] + " · " + no.textContent;
    }
    a.appendChild(make("span", null, title));
    if (ch.querySelector(".game")) a.appendChild(make("span", "play-mark", "▶"));
    nav.appendChild(a);
    links[ch.id] = a;

    var pager = make("div", "pager");
    var prev = chapters[i - 1];
    var next = chapters[i + 1];
    if (prev) pager.innerHTML += '<a class="prev" href="#' + prev.id + '"><small>이전</small>' + prev.getAttribute("data-title") + "</a>";
    if (next) pager.innerHTML += '<a class="next" href="#' + next.id + '"><small>다음</small>' + next.getAttribute("data-title") + "</a>";
    ch.appendChild(pager);
  });

  /* ── 위 막대, 아래 막대, 가림막 ── */
  var topbar = make("div", "topbar");
  var menuBtn = document.querySelector(".menu-btn");
  var topTitle = make("span", "tt");
  var prog = make("div", "prog");
  var progFill = make("i");
  prog.appendChild(progFill);
  topbar.appendChild(menuBtn);
  topbar.appendChild(topTitle);

  var mode = make("div", "mode");
  var ICON = {
    m: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
    w: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>'
  };
  var modeBtn = {};
  [["m", "모바일 화면"], ["w", "넓은 화면"]].forEach(function (x) {
    var b = make("button");
    b.type = "button";
    b.innerHTML = ICON[x[0]];
    b.setAttribute("aria-label", x[1]);
    b.title = x[1];
    b.addEventListener("click", function () { setMode(x[0], true); });
    mode.appendChild(b);
    modeBtn[x[0]] = b;
  });
  topbar.appendChild(mode);
  topbar.appendChild(prog);

  var botbar = make("div", "botbar");
  var bPrev = make("a", "prev");
  var bPage = make("span", "pg");
  var bNext = make("a", "next");
  botbar.appendChild(bPrev);
  botbar.appendChild(bPage);
  botbar.appendChild(bNext);

  var scrim = make("div", "scrim");
  body.insertBefore(topbar, body.firstChild);
  body.appendChild(botbar);
  body.appendChild(scrim);

  /* ── 모드: 기본은 모바일 ── */
  var pref = "m";
  try { pref = localStorage.getItem("nb-mode") || "m"; } catch (e) {}
  function applyMode() {
    var small = window.innerWidth < SMALL;
    var m = small || pref !== "w";
    body.classList.toggle("m", m);
    body.classList.toggle("small", small);
    if (!m) { closeDrawer(); if (mode.parentNode !== body) body.appendChild(mode); }
    else if (mode.parentNode !== topbar) topbar.insertBefore(mode, prog);
    modeBtn.m.classList.toggle("on", m);
    modeBtn.w.classList.toggle("on", !m);
  }
  function setMode(v, save) {
    pref = v;
    if (save) { try { localStorage.setItem("nb-mode", v); } catch (e) {} }
    applyMode();
    window.scrollTo(0, 0);
  }
  window.addEventListener("resize", applyMode);

  /* ── 목차 서랍 ── */
  function openDrawer() {
    side.classList.add("open");
    body.classList.add("drawer");
    var on = nav.querySelector("a.on");
    if (on) side.scrollTop = Math.max(0, on.offsetTop - side.clientHeight / 2);
  }
  function closeDrawer() { side.classList.remove("open"); body.classList.remove("drawer"); }
  menuBtn.addEventListener("click", function () { if (side.classList.contains("open")) closeDrawer(); else openDrawer(); });
  scrim.addEventListener("click", closeDrawer);

  /* ── 장 보여 주기 ── */
  function current() {
    var id = location.hash.slice(1);
    return document.getElementById(id) && links[id] ? id : chapters[0].id;
  }
  function show() {
    var id = current();
    var idx = 0;
    chapters.forEach(function (ch, i) { var on = ch.id === id; ch.classList.toggle("cur", on); if (on) idx = i; });
    Object.keys(links).forEach(function (k) { links[k].classList.toggle("on", k === id); });
    closeDrawer();
    if (!body.classList.contains("m") && links[id].scrollIntoView) links[id].scrollIntoView({ block: "nearest" });
    window.scrollTo(0, 0);
    var title = chapters[idx].getAttribute("data-title");
    document.title = title + " | 경제·금융 기초와 네오뱅크";
    topTitle.textContent = idx === 0 ? "경제·금융 기초와 네오뱅크" : title;
    progFill.style.width = (idx / (chapters.length - 1)) * 100 + "%";
    var p = chapters[idx - 1], n = chapters[idx + 1];
    bPrev.className = "prev" + (p ? "" : " off"); bPrev.textContent = "‹ 이전"; if (p) bPrev.href = "#" + p.id; else bPrev.removeAttribute("href");
    bNext.className = "next" + (n ? "" : " off"); bNext.textContent = idx === 0 ? "시작하기 ›" : "다음 ›"; if (n) bNext.href = "#" + n.id; else bNext.removeAttribute("href");
    bPage.textContent = idx + 1 + " / " + chapters.length;
    document.dispatchEvent(new CustomEvent("chapter:show", { detail: { id: id } }));
  }
  function move(step) {
    var idx = chapters.findIndex(function (ch) { return ch.id === current(); });
    var target = chapters[idx + step];
    if (target) location.hash = target.id;
  }
  window.addEventListener("hashchange", show);
  document.addEventListener("keydown", function (e) {
    if (e.target.closest("input, textarea")) return;
    if (zoom.classList.contains("on")) { if (e.key === "Escape") closeZoom(); return; }
    if (e.key === "Escape") closeDrawer();
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); move(1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); move(-1); }
  });

  /* ── 표: 좁은 화면에서 줄마다 카드로 바꿀 수 있게 이름표를 단다 ── */
  document.querySelectorAll(".tablecard table").forEach(function (table) {
    if (table.querySelector("[rowspan], [colspan]")) return;
    var heads = Array.prototype.map.call(table.querySelectorAll("th"), function (th) { return th.textContent.trim(); });
    if (heads.length < 3) return;
    table.classList.add("stack");
    table.querySelectorAll("tr").forEach(function (tr) {
      if (tr.querySelector("th")) { tr.classList.add("head"); return; }
      Array.prototype.forEach.call(tr.children, function (td, i) { if (i > 0 && heads[i]) td.setAttribute("data-label", heads[i]); });
    });
  });

  /* ── 캡처 크게 보기: 좁은 화면에서는 손가락으로 밀어 볼 수 있게 ── */
  var zoom = document.querySelector(".zoom");
  var zoomImg = zoom.querySelector("img");
  var zin = make("div", "zin");
  zin.appendChild(zoomImg);
  zoom.appendChild(zin);
  var zoomX = make("button", "zoom-x", "✕");
  zoomX.type = "button";
  zoomX.setAttribute("aria-label", "닫기");
  zoom.parentNode.insertBefore(zoomX, zoom.nextSibling);
  function closeZoom() { zoom.classList.remove("on"); body.style.overflow = ""; }
  document.querySelectorAll(".shot img").forEach(function (img) {
    img.addEventListener("click", function () {
      zoomImg.src = img.src;
      zoomImg.alt = img.alt;
      zoom.classList.toggle("pan", window.innerWidth < 900 && img.naturalWidth > 800);
      zoom.classList.add("on");
      zoom.scrollTop = 0; zoom.scrollLeft = 0;
      body.style.overflow = "hidden";
    });
  });
  zoom.addEventListener("click", closeZoom);
  zoomX.addEventListener("click", closeZoom);

  applyMode();
  show();
})();
