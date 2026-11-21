(function () {
  var PARTS = { 1: "1부 경제 기본 상식", 2: "2부 금융 기초", 3: "3부 네오뱅크 사용법" };
  var chapters = Array.prototype.slice.call(document.querySelectorAll(".ch"));
  var nav = document.querySelector(".nav");
  var side = document.querySelector(".side");
  var links = {};
  var lastPart = null;
  var count = 0;

  chapters.forEach(function (ch, i) {
    var part = ch.getAttribute("data-part");
    var title = ch.getAttribute("data-title");
    if (part && part !== lastPart) {
      var h = document.createElement("div");
      h.className = "nav-part";
      h.textContent = PARTS[part];
      nav.appendChild(h);
      lastPart = part;
    }
    var a = document.createElement("a");
    a.href = "#" + ch.id;
    if (part) {
      count += 1;
      var no = document.createElement("span");
      no.className = "no";
      no.textContent = (count < 10 ? "0" : "") + count;
      a.appendChild(no);
      var k = ch.querySelector(".kicker");
      if (k) k.textContent = PARTS[part] + " · " + no.textContent;
    }
    var t = document.createElement("span");
    t.textContent = title;
    a.appendChild(t);
    if (ch.querySelector(".game")) {
      var mark = document.createElement("span");
      mark.className = "play-mark";
      mark.textContent = "▶";
      a.appendChild(mark);
    }
    nav.appendChild(a);
    links[ch.id] = a;

    var pager = document.createElement("div");
    pager.className = "pager";
    var prev = chapters[i - 1];
    var next = chapters[i + 1];
    if (prev) pager.innerHTML += '<a class="prev" href="#' + prev.id + '"><small>이전</small>' + prev.getAttribute("data-title") + "</a>";
    if (next) pager.innerHTML += '<a class="next" href="#' + next.id + '"><small>다음</small>' + next.getAttribute("data-title") + "</a>";
    ch.appendChild(pager);
  });

  function current() {
    var id = location.hash.slice(1);
    return document.getElementById(id) && links[id] ? id : chapters[0].id;
  }

  function show() {
    var id = current();
    chapters.forEach(function (ch) { ch.classList.toggle("cur", ch.id === id); });
    Object.keys(links).forEach(function (k) { links[k].classList.toggle("on", k === id); });
    side.classList.remove("open");
    window.scrollTo(0, 0);
    if (links[id].scrollIntoView) links[id].scrollIntoView({ block: "nearest" });
    document.title = document.getElementById(id).getAttribute("data-title") + " | 경제·금융 기초와 네오뱅크";
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
    if (zoom.classList.contains("on")) { if (e.key === "Escape") zoom.classList.remove("on"); return; }
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); move(1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); move(-1); }
  });

  document.querySelector(".menu-btn").addEventListener("click", function () { side.classList.toggle("open"); });

  var zoom = document.querySelector(".zoom");
  var zoomImg = zoom.querySelector("img");
  document.querySelectorAll(".shot img").forEach(function (img) {
    img.addEventListener("click", function () { zoomImg.src = img.src; zoomImg.alt = img.alt; zoom.classList.add("on"); });
  });
  zoom.addEventListener("click", function () { zoom.classList.remove("on"); });

  show();
})();
