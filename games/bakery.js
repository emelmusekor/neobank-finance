/* 빵집 사장: 가격과 굽는 개수를 정해 7일 동안 빵을 판다.
   수요  D = max(0, round((120 − 0.024 × 가격) × 그날 배수 + 잡음)),  잡음은 −5..+5 정수 */
(function () {
  "use strict";
  window.EcoGames = window.EcoGames || {};

  var UNIT_COST = 1000;
  var DAY_COUNT = 7;
  var PRICE_MAX = 5000;
  var Y_MAX = 180;
  var SVG_NS = "http://www.w3.org/2000/svg";
  var PEOPLE = ["🧑", "👩", "👨", "👧", "👦", "👵", "👴", "🧒"];

  var PLAIN = { name: "평범한 날", icon: "🌤️", f10: 10, special: false, hint: "손님이 평소만큼 옵니다." };
  var EVENTS = [
    PLAIN,
    { name: "비 오는 날", icon: "🌧️", f10: 7, special: true, hint: "비가 와서 손님이 평소의 70%쯤 옵니다." },
    PLAIN,
    { name: "동네 축제", icon: "🎪", f10: 14, special: true, hint: "축제가 열려 손님이 평소의 1.4배쯤 옵니다." },
    PLAIN,
    { name: "방송에 소개됨", icon: "📺", f10: 15, special: true, hint: "방송에 나와 손님이 평소의 1.5배쯤 옵니다." },
    PLAIN
  ];

  var runs = 0;

  /* 정수 계산으로 반올림한다. (120 − 0.024P) × 10 = 1200 − 24 × (P ÷ 100) */
  function demand(price, f10, noise) {
    var base10 = 1200 - 24 * Math.round(price / 100);
    return Math.max(0, Math.floor((base10 * f10 + 50) / 100) + noise);
  }

  function sv(tag, attrs, text) {
    var n = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }

  window.EcoGames["bakery"] = function (root, ui) {
    var el = ui.el;
    var fmt = ui.fmt;
    var body = ui.frame(root, { badge: "시뮬레이션", title: "빵집 사장", sub: "가격과 굽는 개수를 정해 7일 동안 빵을 팝니다." });
    var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var timers = [];
    var S = null;
    var lastW = 0;

    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function clearTimers() { timers.forEach(function (t) { clearTimeout(t); }); timers = []; }
    function won(n) { return fmt(n) + "원"; }
    function signedWon(n) {
      n = Math.round(n);
      return (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n)) + "원";
    }
    function tone(n) { return n > 0 ? " green" : n < 0 ? " red" : ""; }

    /* ── 항상 보이는 숫자 ── */
    var stDay = el("b", { text: "0/7" });
    var stTotal = el("b", { text: "0원" });
    var stToday = el("b", { text: "0원" });
    var boxTotal = el("div", { class: "gm-stat" }, [el("span", { text: "누적 이익" }), stTotal]);
    var boxToday = el("div", { class: "gm-stat" }, [el("span", { text: "오늘 이익" }), stToday]);
    var stats = el("div", { class: "bk-stats" }, [
      el("div", { class: "gm-stat bk-stat-day" }, [el("span", { text: "날짜" }), stDay]),
      boxTotal,
      boxToday
    ]);

    function setMoneyStat(box, node, value, ms) {
      box.className = "gm-stat" + tone(value);
      ui.countUp(node, value, ms, signedWon);
    }

    var stage = el("div", { class: "bk-stage" });

    /* ── 그래프 ── */
    var svg = sv("svg", { class: "bk-svg", role: "img", "aria-label": "가격과 찾아온 손님 수를 날마다 점으로 찍은 그래프" });
    var tip = el("div", { class: "bk-tip" });
    var chartBox = el("div", { class: "bk-chart-box" }, [svg, tip]);
    var legendLine = el("span", { class: "bk-leg gm-hide" }, [el("i", { class: "bk-leg-line" }), "평범한 날의 수요"]);
    var chartNote = el("p", { class: "bk-chart-note" });
    var chartSec = el("div", { class: "bk-chart gm-hide" }, [
      el("div", { class: "bk-chart-head" }, [
        el("b", { class: "bk-chart-title", text: "가격과 찾아온 손님" }),
        el("div", { class: "bk-legend" }, [
          el("span", { class: "bk-leg" }, [el("i", { class: "bk-leg-dot" }), "평범한 날"]),
          el("span", { class: "bk-leg" }, [el("i", { class: "bk-leg-dia" }), "특별한 날"]),
          legendLine
        ])
      ]),
      chartBox,
      chartNote
    ]);

    var result = el("div", { class: "gm-result gm-hide" });
    var foot = el("div", { class: "gm-row bk-foot gm-hide" }, [
      el("button", { class: "gm-btn sm ghost", type: "button", text: "다시 하기", onclick: startGame })
    ]);

    body.appendChild(stats);
    body.appendChild(stage);
    body.appendChild(chartSec);
    body.appendChild(result);
    body.appendChild(foot);

    function hideTip() { tip.classList.remove("on"); }
    function showTip(rec, x, y, w) {
      tip.innerHTML = "";
      tip.appendChild(el("b", { text: (rec.day + 1) + "일째 · " + rec.ev.name }));
      tip.appendChild(el("span", { text: "가격 " + won(rec.price) + " · 손님 " + rec.D + "명" }));
      tip.appendChild(el("span", { text: "구운 빵 " + rec.bake + "개 · 이익 " + signedWon(rec.profit) }));
      var half = tip.offsetWidth / 2 + 2;
      var below = y < 104;
      tip.style.left = (w > half * 2 ? ui.clamp(x, half, w - half) : w / 2) + "px";
      tip.style.top = (below ? y + 18 : y - 18) + "px";
      tip.classList.toggle("below", below);
      tip.classList.add("on");
    }
    svg.addEventListener("click", hideTip);

    function drawChart(popDay, animLine) {
      var w = ui.clamp(Math.round(chartBox.clientWidth || 600), 260, 900);
      var h = ui.clamp(Math.round(w * 0.52), 250, 340);
      var L = 40, R = 24, T = 34, B = 50;
      var pw = w - L - R, ph = h - T - B;
      function X(p) { return L + (p / PRICE_MAX) * pw; }
      function Y(d) { return T + (1 - d / Y_MAX) * ph; }
      lastW = w;
      hideTip();
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);

      [0, 60, 120, 180].forEach(function (d) {
        svg.appendChild(sv("line", { x1: L, x2: w - R, y1: Y(d), y2: Y(d), class: d === 0 ? "bk-base" : "bk-grid" }));
        svg.appendChild(sv("text", { x: L - 8, y: Y(d), dy: "0.35em", "text-anchor": "end", class: "bk-tick" }, String(d)));
      });
      [1000, 2000, 3000, 4000, 5000].forEach(function (p) {
        svg.appendChild(sv("line", { x1: X(p), x2: X(p), y1: Y(0), y2: Y(0) + 5, class: "bk-base" }));
        svg.appendChild(sv("text", { x: X(p), y: Y(0) + 21, "text-anchor": "middle", class: "bk-tick" }, fmt(p)));
      });
      svg.appendChild(sv("text", { x: 2, y: 16, class: "bk-axis" }, "찾아온 손님 (명)"));
      svg.appendChild(sv("text", { x: L + pw / 2, y: h - 6, "text-anchor": "middle", class: "bk-axis" }, "가격 (원)"));

      if (S && S.done) {
        [[2500, "매출 최대", "end", -5], [3000, "이익 최대", "start", 5]].forEach(function (g) {
          svg.appendChild(sv("line", { x1: X(g[0]), x2: X(g[0]), y1: Y(0), y2: Y(Y_MAX), class: "bk-guide" }));
          svg.appendChild(sv("text", { x: X(g[0]) + g[3], y: Y(Y_MAX) + 17, "text-anchor": g[2], class: "bk-guide-label" }, g[1]));
        });
        var line = sv("line", { x1: X(0), y1: Y(120), x2: X(PRICE_MAX), y2: Y(0), class: "bk-demand" });
        if (animLine && !reduced) {
          var len = Math.ceil(Math.sqrt(Math.pow(X(PRICE_MAX) - X(0), 2) + Math.pow(Y(0) - Y(120), 2)));
          line.style.strokeDasharray = len;
          line.style.setProperty("--len", len);
          line.classList.add("draw");
        }
        svg.appendChild(line);
      }

      if (!S) return;
      S.recs.forEach(function (rec) {
        var x = X(rec.price), y = Y(Math.min(rec.D, Y_MAX));
        var g = sv("g", { transform: "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ")", class: "bk-dot" });
        var inner = sv("g", { class: rec.day === popDay && !reduced ? "bk-pop" : "" });
        inner.appendChild(sv("circle", { r: 19, class: "bk-hit" }));
        if (rec.ev.special) inner.appendChild(sv("rect", { x: -9.5, y: -9.5, width: 19, height: 19, rx: 3, transform: "rotate(45)", class: "bk-mark special" }));
        else inner.appendChild(sv("circle", { r: 11.5, class: "bk-mark" }));
        inner.appendChild(sv("text", { "text-anchor": "middle", dy: "0.36em", class: "bk-dot-no" }, String(rec.day + 1)));
        g.appendChild(inner);
        g.addEventListener("pointerenter", function () { showTip(rec, x, y, w); });
        g.addEventListener("pointerleave", hideTip);
        g.addEventListener("click", function (e) { e.stopPropagation(); showTip(rec, x, y, w); });
        svg.appendChild(g);
      });
    }

    /* 폭이 바뀌면 다음 틱에 다시 그린다. */
    var resizeTimer = 0;
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          var w = Math.round(chartBox.clientWidth);
          if (w > 0 && ui.clamp(w, 260, 900) !== lastW) drawChart(-1, false);
        }, 60);
      }).observe(chartBox);
    }

    /* ── 시작 화면 ── */
    function showStart() {
      stage.innerHTML = "";
      stage.appendChild(el("div", { class: "bk-start" }, [
        el("div", { class: "bk-start-art", "aria-hidden": "true" }, [
          el("span", { text: "🥖" }), el("span", { class: "bk-shop", text: "🥐" }), el("span", { text: "🍞" })
        ]),
        el("div", { class: "gm-msg", text: "7일 동안 가격과 굽는 개수를 정해 이익을 가장 크게 만듭니다." }),
        el("ul", { class: "bk-rules" }, [
          el("li", { text: "빵 1개를 만드는 비용은 1,000원입니다." }),
          el("li", { text: "가격이 비쌀수록 찾아오는 손님이 줄어듭니다." }),
          el("li", { text: "그날 팔지 못한 빵은 버립니다." })
        ]),
        el("div", { class: "gm-row center" }, [
          el("button", { class: "gm-btn primary lg", type: "button", text: "장사 시작", onclick: startGame })
        ])
      ]));
    }

    function startGame() {
      clearTimers();
      runs += 1;
      var rnd = ui.rng((Date.now() + runs * 7919) >>> 0);
      S = { day: 0, total: 0, price: 2000, bake: 60, recs: [], noise: [], done: false, rnd: rnd };
      for (var i = 0; i < DAY_COUNT; i++) S.noise.push(Math.floor(rnd() * 11) - 5);
      stTotal.setAttribute("data-now", 0);
      stToday.setAttribute("data-now", 0);
      setMoneyStat(boxTotal, stTotal, 0, 200);
      setMoneyStat(boxToday, stToday, 0, 200);
      result.classList.add("gm-hide");
      result.innerHTML = "";
      body.insertBefore(chartSec, result);
      chartSec.classList.remove("gm-hide");
      legendLine.classList.add("gm-hide");
      chartNote.textContent = "하루가 끝나면 점이 하나씩 찍힙니다. 점을 누르면 그날의 기록이 보입니다.";
      stage.classList.remove("gm-hide");
      foot.classList.remove("gm-hide");
      drawChart(-1, false);
      showPlan();
    }

    function eventCard(ev, day) {
      return el("div", { class: "bk-event" + (ev.special ? " special" : "") }, [
        el("span", { class: "bk-event-ico", "aria-hidden": "true", text: ev.icon }),
        el("div", null, [
          el("b", { text: (day + 1) + "일째 · " + ev.name }),
          el("span", { text: ev.hint })
        ])
      ]);
    }

    function slider(label, key, min, max, step, show, onChange) {
      var out = el("output", { class: "bk-out", text: show(S[key]) });
      var input = el("input", { type: "range", class: "gm-range", min: min, max: max, step: step, value: S[key], "aria-label": label });
      function set(v) {
        v = ui.clamp(Math.round(v / step) * step, min, max);
        S[key] = v;
        input.value = v;
        out.textContent = show(v);
        onChange();
      }
      input.addEventListener("input", function () { set(Number(input.value)); });
      return el("div", { class: "gm-field bk-field" }, [
        el("div", { class: "gm-row" }, [el("span", { class: "gm-label", text: label }), out]),
        el("div", { class: "bk-slide" }, [
          el("button", { class: "gm-btn sm bk-step", type: "button", text: "−", "aria-label": label + " 줄이기", onclick: function () { set(S[key] - step); } }),
          input,
          el("button", { class: "gm-btn sm bk-step", type: "button", text: "+", "aria-label": label + " 늘리기", onclick: function () { set(S[key] + step); } })
        ])
      ]);
    }

    /* ── 아침: 가격과 개수 정하기 ── */
    function showPlan() {
      var ev = EVENTS[S.day];
      stDay.textContent = (S.day + 1) + "/" + DAY_COUNT;
      setMoneyStat(boxToday, stToday, 0, 200);

      var marginV = el("b");
      var marginS = el("span");
      var costV = el("b");
      var costS = el("span");
      var marginBox = el("div", { class: "bk-pre" }, [el("em", { text: "빵 한 개를 팔면 남는 돈" }), marginV, marginS]);
      function refresh() {
        var m = S.price - UNIT_COST;
        marginV.textContent = (m < 0 ? "−" : "") + won(Math.abs(m));
        marginS.textContent = m < 0 ? "팔수록 손해가 납니다." : m === 0 ? "팔아도 남는 돈이 없습니다." : "가격 " + won(S.price) + " − 만드는 비용 " + won(UNIT_COST);
        marginBox.classList.toggle("bad", m < 0);
        costV.textContent = won(UNIT_COST * S.bake);
        costS.textContent = won(UNIT_COST) + " × " + S.bake + "개";
      }

      stage.innerHTML = "";
      stage.appendChild(eventCard(ev, S.day));
      stage.appendChild(el("div", { class: "bk-controls" }, [
        slider("가격", "price", 500, 5000, 100, won, refresh),
        slider("굽는 개수", "bake", 0, 120, 5, function (v) { return v + "개"; }, refresh)
      ]));
      stage.appendChild(el("div", { class: "bk-preview" }, [
        marginBox,
        el("div", { class: "bk-pre" }, [el("em", { text: "오늘 굽는 비용" }), costV, costS])
      ]));
      stage.appendChild(el("div", { class: "gm-row center" }, [
        el("button", { class: "gm-btn primary lg", type: "button", text: "가게 열기", onclick: openShop })
      ]));
      refresh();
      keepInView();
    }

    /* 화면이 위로 밀려 있으면 게임 맨 위로 돌아온다. */
    function keepInView() {
      try {
        var r = root.getBoundingClientRect();
        if (r.height > 0 && r.top < 0 && root.scrollIntoView) root.scrollIntoView({ block: "start" });
      } catch (e) { /* 보이지 않는 동안에는 건너뛴다 */ }
    }

    /* ── 낮: 손님이 온다 ── */
    function openShop() {
      clearTimers();
      var ev = EVENTS[S.day];
      var D = demand(S.price, ev.f10, S.noise[S.day]);
      var sold = Math.min(S.bake, D);
      var rec = {
        day: S.day, ev: ev, price: S.price, bake: S.bake, D: D, sold: sold,
        left: S.bake - sold, miss: D - sold,
        revenue: S.price * sold, cost: UNIT_COST * S.bake
      };
      rec.profit = rec.revenue - rec.cost;

      var breadIcons = Math.round(S.bake / 5);
      var goneIcons = breadIcons - Math.ceil(rec.left / 5);
      var servedIcons = Math.ceil(sold / 5);
      var custIcons = Math.max(servedIcons, Math.ceil(D / 5));
      var walk = 1000;
      var gap = custIcons > 1 ? Math.min(120, 1500 / (custIcons - 1)) : 0;
      var total = reduced ? 150 : D === 0 ? 700 : Math.round((custIcons - 1) * gap + walk);

      var cCust = el("b", { text: "0" });
      var cSold = el("b", { text: "0" });
      var shelf = el("div", { class: "bk-shelf" });
      var breads = [];
      for (var j = 0; j < breadIcons; j++) {
        var b = el("span", { class: "bk-bread", "aria-hidden": "true", text: "🍞" });
        if (j < goneIcons) b.style.transitionDelay = Math.round(j * gap + walk * 0.8) + "ms";
        breads.push(b);
        shelf.appendChild(b);
      }
      if (!breadIcons) shelf.appendChild(el("span", { class: "bk-shelf-empty", text: "오늘은 빵을 굽지 않았습니다." }));

      var lane = el("div", { class: "bk-lane", "aria-hidden": "true" }, [el("span", { class: "bk-door" }, [el("span", { class: "bk-shop", text: "🥐" })])]);
      if (!reduced) {
        for (var i = 0; i < custIcons; i++) {
          var c = el("span", { class: "bk-cust " + (i < servedIcons ? "ok" : "no"), text: PEOPLE[Math.floor(S.rnd() * PEOPLE.length)] });
          c.style.animationDelay = Math.round(i * gap) + "ms";
          lane.appendChild(c);
        }
      }
      var caption = el("p", { class: "bk-caption", text: "손님이 오고 있습니다." });

      stage.innerHTML = "";
      stage.appendChild(eventCard(ev, S.day));
      stage.appendChild(el("div", { class: "bk-scene" }, [
        el("div", { class: "bk-scene-top" }, [
          el("span", { class: "bk-sign", text: "빵 " + won(S.price) + " · " + S.bake + "개 구움" }),
          el("span", { class: "bk-live" }, ["손님 ", cCust, "명 · 판 빵 ", cSold, "개"])
        ]),
        shelf,
        lane,
        caption,
        el("p", { class: "bk-key", text: "🍞 하나는 빵 5개, 사람 하나는 손님 5명쯤입니다." })
      ]));

      ui.countUp(cCust, D, total);
      ui.countUp(cSold, sold, total);
      later(function () {
        breads.forEach(function (node, idx) { if (idx < goneIcons) node.classList.add("gone"); });
      }, 30);
      later(function () {
        breads.forEach(function (node, idx) { if (idx >= goneIcons) node.classList.add("waste"); });
        caption.textContent = D === 0 ? "손님이 한 명도 오지 않았습니다."
          : rec.miss > 0 ? "손님 " + D + "명 중 " + rec.miss + "명이 빵을 사지 못했습니다."
          : rec.left > 0 ? "손님 " + D + "명이 모두 샀고 빵 " + rec.left + "개가 남았습니다."
          : "손님 " + D + "명이 빵을 모두 사 갔습니다.";
        showReport(rec);
      }, total + 250);
    }

    /* ── 저녁: 하루 결산 ── */
    function cell(label, value, cls) {
      return el("div", { class: "bk-cell" + (cls || "") }, [el("span", { text: label }), el("b", { text: value })]);
    }

    function showReport(rec) {
      S.recs.push(rec);
      S.total += rec.profit;
      setMoneyStat(boxToday, stToday, rec.profit, 500);
      setMoneyStat(boxTotal, stTotal, S.total, 700);
      drawChart(rec.day, false);

      var msg;
      if (rec.left > 0) {
        msg = el("div", { class: "gm-msg warn" }, [
          el("b", { text: "남는 빵이 생겼습니다 (초과공급)" }),
          el("br"),
          "버린 빵 " + rec.left + "개를 만든 비용 " + won(rec.left * UNIT_COST) + "이 그대로 손해입니다."
        ]);
      } else if (rec.miss > 0) {
        msg = el("div", { class: "gm-msg" }, [
          el("b", { text: "빵이 모자랐습니다 (초과수요)" }),
          el("br"),
          rec.miss + "명이 빵을 사지 못하고 돌아갔습니다. 더 굽거나 값을 올릴 수 있었습니다."
        ]);
      } else {
        msg = el("div", { class: "gm-msg good" }, [
          el("b", { text: "딱 맞았습니다" }),
          el("br"),
          "구운 빵과 찾아온 손님 수가 같았습니다."
        ]);
      }

      var last = S.day === DAY_COUNT - 1;
      var report = el("div", { class: "bk-report" }, [
        msg,
        el("div", { class: "bk-cells" }, [
          cell("찾아온 손님", rec.D + "명"),
          cell("판 빵", rec.sold + "개"),
          rec.miss > 0 ? cell("못 산 손님", rec.miss + "명") : cell("남은 빵", rec.left + "개"),
          cell("매출", won(rec.revenue)),
          cell("비용", won(rec.cost)),
          cell("이익", signedWon(rec.profit), tone(rec.profit))
        ]),
        el("ul", { class: "bk-calc" }, [
          el("li", { text: "매출 = 가격 " + won(rec.price) + " × 판 빵 " + rec.sold + "개 = " + won(rec.revenue) }),
          el("li", { text: "비용 = " + won(UNIT_COST) + " × 구운 빵 " + rec.bake + "개 = " + won(rec.cost) }),
          el("li", { text: "이익 = 매출 − 비용 = " + signedWon(rec.profit) })
        ]),
        el("div", { class: "gm-row center" }, [
          el("button", { class: "gm-btn primary lg", type: "button", text: last ? "결과 보기" : "다음 날", onclick: nextDay })
        ])
      ]);
      stage.appendChild(report);
    }

    function nextDay() {
      clearTimers();
      S.day += 1;
      if (S.day >= DAY_COUNT) finish();
      else showPlan();
    }

    /* 이번 판의 손님 수를 미리 알았다면 낼 수 있던 가장 큰 이익 */
    function bestPossible() {
      var sum = 0;
      for (var d = 0; d < DAY_COUNT; d++) {
        var best = 0;
        for (var p = 500; p <= 5000; p += 100) {
          var D = demand(p, EVENTS[d].f10, S.noise[d]);
          for (var b = 0; b <= 120; b += 5) {
            var pr = p * Math.min(b, D) - UNIT_COST * b;
            if (pr > best) best = pr;
          }
        }
        sum += best;
      }
      return sum;
    }

    /* ── 끝 ── */
    function finish() {
      S.done = true;
      S.day = DAY_COUNT - 1;
      stage.innerHTML = "";
      stage.classList.add("gm-hide");
      foot.classList.add("gm-hide");

      var bestRec = S.recs[0];
      S.recs.forEach(function (r) { if (r.profit > bestRec.profit) bestRec = r; });
      var top = bestPossible();

      var totalNode = el("b", { class: "bk-total-num" + tone(S.total), text: "0원" });
      var verdict = S.total <= 0 ? "7일 동안 이익을 내지 못했습니다. 버린 빵의 비용과 낮은 가격이 이익을 깎습니다."
        : S.total >= top * 0.85 ? "가격과 굽는 개수를 손님 수에 잘 맞췄습니다."
        : "이익을 냈습니다. 가격과 굽는 개수를 손님 수에 더 맞추면 이익이 늘어납니다.";

      var rows = S.recs.map(function (r) {
        return el("tr", null, [
          el("td", { text: (r.day + 1) + "일 " + r.ev.icon }),
          el("td", { class: "num" }, [fmt(r.price), el("span", { class: "bk-u", text: "원" })]),
          el("td", { class: "num" }, [String(r.bake), el("span", { class: "bk-u", text: "개" })]),
          el("td", { class: "num" }, [String(r.D), el("span", { class: "bk-u", text: "명" })]),
          el("td", { class: "num bk-td-profit" + tone(r.profit), text: signedWon(r.profit) })
        ]);
      });

      result.innerHTML = "";
      result.appendChild(el("h4", { text: "7일 장사를 마쳤습니다" }));
      result.appendChild(el("div", { class: "bk-total" }, [el("span", { text: "누적 이익" }), totalNode]));
      result.appendChild(el("p", { text: verdict }));
      result.appendChild(el("p", { text: "손님 수를 미리 알았다면 이번 7일에 낼 수 있던 가장 큰 이익은 " + won(top) + "입니다." }));
      result.appendChild(el("p", {
        text: "가장 잘한 날은 " + (bestRec.day + 1) + "일째 (" + bestRec.ev.name + ")입니다. 가격 " + won(bestRec.price) + ", " + bestRec.bake + "개, 이익 " + signedWon(bestRec.profit) + "."
      }));
      result.appendChild(el("p", { class: "bk-best-line" }, [
        el("b", { text: "평범한 날의 가장 좋은 선택" }),
        " 가격 3,000원, 48개, 하루 이익 96,000원"
      ]));
      result.appendChild(el("div", { class: "bk-compare" }, [
        el("div", { class: "bk-cmp" }, [
          el("em", { text: "매출이 가장 큰 가격" }),
          el("b", { text: "2,500원" }),
          el("span", { text: "60개 팔림 · 매출 150,000원" }),
          el("span", { text: "이익 90,000원" })
        ]),
        el("div", { class: "bk-cmp best" }, [
          el("em", { text: "이익이 가장 큰 가격" }),
          el("b", { text: "3,000원" }),
          el("span", { text: "48개 팔림 · 매출 144,000원" }),
          el("span", { text: "이익 96,000원" })
        ])
      ]));
      result.appendChild(chartSec);
      result.appendChild(el("div", { class: "bk-table-wrap" }, [
        el("table", { class: "bk-table" }, [
          el("thead", null, el("tr", null, [
            el("th", { text: "날" }), el("th", { class: "num", text: "가격" }), el("th", { class: "num", text: "개수" }),
            el("th", { class: "num", text: "손님" }), el("th", { class: "num", text: "이익" })
          ])),
          el("tbody", null, rows)
        ])
      ]));
      result.appendChild(el("div", { class: "gm-lesson" }, [
        "값을 올리면 한 개당 남는 돈은 늘지만 손님이 줄어듭니다. 값을 내리면 손님은 늘지만 남는 돈이 줄어듭니다. ",
        el("b", { text: "매출이 가장 큰 가격과 이익이 가장 큰 가격은 다릅니다." })
      ]));
      result.appendChild(el("div", { class: "gm-row center bk-again" }, [
        el("button", { class: "gm-btn primary", type: "button", text: "다시 하기", onclick: startGame })
      ]));
      result.classList.remove("gm-hide");

      legendLine.classList.remove("gm-hide");
      chartNote.textContent = "선은 평범한 날의 수요입니다. 비 오는 날은 대체로 선보다 아래에, 축제와 방송 날은 선보다 위에 점이 찍힙니다. 같은 가격이어도 찾아오는 손님 수가 달라졌기 때문입니다.";
      drawChart(-1, true);
      ui.countUp(totalNode, S.total, 900, signedWon);
      keepInView();
    }

    showStart();
  };
})();
