/* 게임·체험 공통 도구
   각 게임 파일은  EcoGames["아이디"] = function (root, ui) { ... }  로 등록한다.
   root 는 빈 div 이며, 그 장이 처음 열릴 때 한 번 호출된다. */
(function () {
  var Games = (window.EcoGames = window.EcoGames || {});

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k === "html") node.innerHTML = v;
        else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
        else if (k.slice(0, 2) === "on" && typeof v === "function") node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? "" : v);
      });
    }
    if (children != null) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null || c === false) return;
        node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
      });
    }
    return node;
  }

  function fmt(n) {
    return Math.round(n).toLocaleString("ko-KR");
  }

  /* 틀을 만들고 본문 영역을 돌려준다. opt: { badge, title, sub } */
  function frame(root, opt) {
    root.innerHTML = "";
    var body = el("div", { class: "gm-body" });
    root.appendChild(
      el("div", { class: "gm" }, [
        el("div", { class: "gm-head" }, [
          el("span", { class: "gm-badge", text: opt.badge || "체험" }),
          el("div", null, [
            el("div", { class: "gm-title", text: opt.title }),
            opt.sub ? el("div", { class: "gm-sub", text: opt.sub }) : null
          ])
        ]),
        body
      ])
    );
    return body;
  }

  /* 숫자를 서서히 올린다. */
  function countUp(node, to, ms, format) {
    var from = Number(node.getAttribute("data-now") || 0);
    var start = null;
    var dur = ms == null ? 600 : ms;
    var f = format || fmt;
    node.setAttribute("data-now", to);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || dur === 0) { node.textContent = f(to); return; }
    function step(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      node.textContent = f(from + (to - from) * e);
      if (p < 1 && node.getAttribute("data-now") == String(to)) requestAnimationFrame(step);
      else if (p >= 1) node.textContent = f(to);
    }
    requestAnimationFrame(step);
  }

  /* 씨앗이 같으면 같은 순서가 나오는 난수 */
  function rng(seed) {
    var a = seed >>> 0 || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* parent(position: relative) 안에서 글자가 떠오르며 사라진다. */
  function floatText(parent, text, x, y, minus) {
    var f = el("span", { class: "gm-float" + (minus ? " minus" : ""), text: text, style: { left: x + "px", top: y + "px" } });
    parent.appendChild(f);
    setTimeout(function () { f.remove(); }, 950);
  }

  /* 애니메이션 클래스를 다시 건다. */
  function replay(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  var ui = { el: el, fmt: fmt, frame: frame, countUp: countUp, rng: rng, floatText: floatText, replay: replay, clamp: clamp };
  window.EcoUI = ui;

  function mountIn(section) {
    section.querySelectorAll(".game[data-game]").forEach(function (root) {
      if (root.getAttribute("data-mounted")) return;
      var id = root.getAttribute("data-game");
      if (typeof Games[id] !== "function") return;
      root.setAttribute("data-mounted", "1");
      root.classList.add("g-" + id);
      try { Games[id](root, ui); } catch (err) { console.error("[game " + id + "]", err); root.textContent = ""; }
    });
  }

  /* 장이 열릴 때: 게임을 붙이고, 숫자와 모션을 다시 재생한다. */
  document.addEventListener("chapter:show", function (e) {
    var section = document.getElementById(e.detail.id);
    if (!section) return;
    mountIn(section);
    replay(section, "play");
    section.querySelectorAll("[data-count]").forEach(function (n) {
      n.setAttribute("data-now", 0);
      var suffix = n.getAttribute("data-suffix") || "";
      var prefix = n.getAttribute("data-prefix") || "";
      var dec = Number(n.getAttribute("data-dec") || 0);
      countUp(n, Number(n.getAttribute("data-count")), 1100, function (v) {
        return prefix + (dec ? v.toFixed(dec) : fmt(v)) + suffix;
      });
    });
  });
})();
