/* 머지 공장: 같은 물건 두 개를 합쳐 다음 단계를 만들고, 팔아서 코인을 모은다. (부가가치) */
(function () {
  "use strict";
  var Games = (window.EcoGames = window.EcoGames || {});

  var TIERS = [
    null,
    { name: "밀", obj: "밀을", icon: "🌾", price: 1 },
    { name: "반죽", obj: "반죽을", icon: "🥣", price: 3 },
    { name: "빵", obj: "빵을", icon: "🥖", price: 8 },
    { name: "샌드위치", obj: "샌드위치를", icon: "🥪", price: 20 },
    { name: "케이크", obj: "케이크를", icon: "🎂", price: 50 },
    { name: "빵집", obj: "빵집을", icon: "🏪", price: 130 }
  ];
  var TOP = 6;
  var CELLS = 25;
  var START_COINS = 10;
  var SECONDS = 90;
  var WHEAT_PRICE = 1;
  var COIN_BURST = [0, 1, 2, 3, 5, 7, 8];
  var GOAL = "밀을 사서 같은 것끼리 합치고, 팔아서 90초 안에 코인을 많이 모읍니다.";

  /* 그 단계 하나를 만드는 데 들어가는 밀의 수 */
  function wheatOf(tier) { return Math.pow(2, tier - 1); }

  Games["merge"] = function (root, ui) {
    var el = ui.el;
    var body = ui.frame(root, { badge: "미니게임", title: "머지 공장", sub: "같은 물건 두 개를 합치면 더 값진 물건이 됩니다." });
    var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var timeouts = [];
    var tickId = null;
    var S = null;
    var N = null;
    var drag = null;
    var swallowClick = false;

    function still() { return !!(mq && mq.matches); }
    function visible() { return root.offsetParent !== null && !document.hidden; }

    function later(fn, ms) {
      var id = setTimeout(function () {
        var k = timeouts.indexOf(id);
        if (k >= 0) timeouts.splice(k, 1);
        fn();
      }, ms);
      timeouts.push(id);
    }

    function stopAll() {
      timeouts.forEach(function (id) { clearTimeout(id); });
      timeouts = [];
      if (tickId !== null) { clearInterval(tickId); tickId = null; }
      drag = null;
      swallowClick = false;
    }

    function say(text, kind) {
      N.say.className = "gm-msg mg-say" + (kind ? " " + kind : "");
      N.say.textContent = text;
    }

    function emptyCells() {
      var list = [];
      for (var i = 0; i < CELLS; i++) if (!S.board[i]) list.push(i);
      return list;
    }

    function centerIn(node) {
      var r = node.getBoundingClientRect();
      var s = N.stage.getBoundingClientRect();
      return { x: r.left + r.width / 2 - s.left, y: r.top + r.height / 2 - s.top };
    }

    /* 무대 위에서 한 점에서 다른 점으로 날아간다. */
    function fly(node, from, to, delay, dur) {
      node.style.left = from.x + "px";
      node.style.top = from.y + "px";
      N.stage.appendChild(node);
      later(function () {
        node.style.transition = "transform " + dur + "ms cubic-bezier(0.45, -0.25, 0.6, 1), opacity " + dur + "ms ease-in";
        node.style.transform = "translate(calc(-50% + " + (to.x - from.x) + "px), calc(-50% + " + (to.y - from.y) + "px)) scale(0.7)";
        node.style.opacity = "0.85";
      }, delay + 20);
      later(function () { node.remove(); }, delay + dur + 60);
    }

    function drawCell(i, pop, delay) {
      var c = N.cells[i];
      var t = S.board[i];
      c.className = "mg-cell" + (t ? " has t" + t : "");
      c.textContent = "";
      if (!t) { c.setAttribute("aria-label", "빈자리"); return; }
      var T = TIERS[t];
      var item = el("span", { class: "mg-item" + (pop ? " " + pop : "") }, [
        el("span", { class: "mg-ico", text: T.icon }),
        el("span", { class: "mg-name", text: T.name }),
        el("span", { class: "mg-price", text: String(T.price) })
      ]);
      if (delay && !still()) item.style.animationDelay = delay + "ms";
      c.appendChild(item);
      c.setAttribute("aria-label", T.name + ", 판매가 " + T.price + "코인");
    }

    function drawTime() {
      N.time.textContent = Math.ceil(S.left) + "초";
      N.barFill.style.width = (S.left / SECONDS) * 100 + "%";
      var hurry = S.started && S.left <= 10;
      N.bar.classList.toggle("hurry", hurry);
      N.timeStat.classList.toggle("red", hurry);
    }

    /* 선택 표시, 단추, 통계를 지금 상태에 맞춘다. */
    function refresh() {
      var selTier = S.sel >= 0 ? S.board[S.sel] : 0;
      for (var i = 0; i < CELLS; i++) {
        var c = N.cells[i];
        c.classList.toggle("sel", i === S.sel);
        c.classList.toggle("can", !S.over && selTier > 0 && selTier < TOP && i !== S.sel && S.board[i] === selTier);
        c.setAttribute("aria-pressed", i === S.sel ? "true" : "false");
      }
      var empty = emptyCells().length;
      N.buy1.disabled = S.over || S.coins < WHEAT_PRICE || empty < 1;
      N.buy5.disabled = S.over || S.coins < WHEAT_PRICE * 5 || empty < 5;
      N.sell.disabled = S.over || selTier === 0;
      N.sell.textContent = selTier ? "팔기 (+" + TIERS[selTier].price + "코인)" : "팔기";
      N.best.textContent = S.best ? TIERS[S.best].icon + " " + TIERS[S.best].name : "없음";
      for (var t = 1; t <= TOP; t++) N.chips[t].classList.toggle("on", S.best >= t);
      N.emptyHint.classList.toggle("gm-hide", S.started);
    }

    function showCoins(delta) {
      ui.countUp(N.coinNum, S.coins, 350);
      if (!visible()) return;
      var p = centerIn(N.coinNum);
      ui.floatText(N.stage, (delta > 0 ? "+" : "") + delta, p.x + 34, p.y - 14, delta < 0);
      if (delta > 0) ui.replay(N.coinStat, "is-pop");
    }

    function startClock() {
      if (S.started) return;
      S.started = true;
      S.last = Date.now();
      tickId = setInterval(tick, 200);
    }

    function tick() {
      if (!S || S.over || !S.started) return;
      var now = Date.now();
      if (!visible()) { S.last = now; return; }
      var dt = Math.min(now - S.last, 1000);
      S.last = now;
      S.left = Math.max(0, S.left - dt / 1000);
      drawTime();
      if (S.left <= 0) finish();
    }

    function buy(n) {
      if (S.over) return;
      var empty = emptyCells();
      var cost = WHEAT_PRICE * n;
      if (S.coins < cost || empty.length < n) return;
      startClock();
      S.coins -= cost;
      for (var k = 0; k < n; k++) {
        var pick = Math.floor(S.rand() * empty.length);
        var i = empty.splice(pick, 1)[0];
        S.board[i] = 1;
        drawCell(i, "is-pop", k * 60);
      }
      if (S.best < 1) S.best = 1;
      showCoins(-cost);
      if (empty.length === 0) say("빈자리가 없습니다. 합치거나 팔아서 자리를 만듭니다.", "warn");
      else say("같은 물건 두 개를 차례로 누르면 합쳐집니다.");
      refresh();
    }

    function merge(a, b) {
      var t = S.board[b];
      if (S.over || a === b || !t || t >= TOP || S.board[a] !== t) return;
      var from = visible() ? centerIn(N.cells[a]) : null;
      var to = visible() ? centerIn(N.cells[b]) : null;
      S.board[a] = 0;
      S.board[b] = t + 1;
      S.sel = b;
      if (S.best < t + 1) S.best = t + 1;
      drawCell(a);
      drawCell(b, "mg-popped");
      ui.replay(N.cells[b], "boom");
      if (from && !still()) {
        fly(el("span", { class: "mg-fly", text: TIERS[t].icon, "aria-hidden": "true" }), from, to, 0, 170);
      }
      var T = TIERS[t + 1];
      var wheat = wheatOf(t + 1);
      if (to) ui.floatText(N.stage, T.name + " " + T.price + "코인", to.x - 30, to.y - 44, false);
      say(TIERS[t].name + " 2개를 합쳐 " + T.obj + " 만들었습니다. 밀 " + wheat + "개 값은 " + wheat * WHEAT_PRICE + "코인, 판매가는 " + T.price + "코인입니다.", "good");
      refresh();
    }

    function sell() {
      var i = S.sel;
      if (S.over || i < 0 || !S.board[i]) return;
      var t = S.board[i];
      var T = TIERS[t];
      var show = visible() && !still();
      var from = show ? centerIn(N.cells[i]) : null;
      var to = show ? centerIn(N.coinNum) : null;
      S.board[i] = 0;
      S.sel = -1;
      S.coins += T.price;
      drawCell(i);
      var n = show ? COIN_BURST[t] : 0;
      for (var k = 0; k < n; k++) {
        var jitter = { x: from.x + (S.rand() - 0.5) * 30, y: from.y + (S.rand() - 0.5) * 30 };
        fly(el("i", { class: "mg-fly mg-coin", "aria-hidden": "true" }), jitter, to, k * 55, 480);
      }
      if (n) later(function () { showCoins(T.price); }, 440);
      else showCoins(T.price);
      say(T.obj + " " + T.price + "코인에 팔았습니다.", "good");
      refresh();
    }

    function tap(i) {
      if (S.over) return;
      var t = S.board[i];
      if (!t || S.sel === i) { S.sel = -1; refresh(); return; }
      if (S.sel >= 0 && S.board[S.sel] === t) {
        if (t < TOP) { merge(S.sel, i); return; }
        S.sel = i;
        say("빵집은 더 합칠 수 없습니다. 팔아서 코인으로 바꿉니다.", "warn");
        refresh();
        return;
      }
      S.sel = i;
      refresh();
    }

    /* ---------- 끌어서 합치기 ---------- */
    function cellOf(node) {
      var c = node && node.closest ? node.closest(".mg-cell") : null;
      return c && N.board.contains(c) ? Number(c.getAttribute("data-i")) : -1;
    }
    function cellAt(x, y) {
      return cellOf(document.elementFromPoint(x, y));
    }
    function placeGhost(x, y) {
      var s = N.stage.getBoundingClientRect();
      drag.ghost.style.left = x - s.left + "px";
      drag.ghost.style.top = y - s.top + "px";
    }
    function dropDrag() {
      var d = drag;
      drag = null;
      if (!d) return null;
      if (d.ghost) d.ghost.remove();
      if (d.active) {
        try { N.board.releasePointerCapture(d.id); } catch (err) { /* 이미 풀렸다 */ }
        for (var i = 0; i < CELLS; i++) N.cells[i].classList.remove("src", "over");
      }
      return d;
    }
    function onDown(e) {
      swallowClick = false;
      if (drag) dropDrag();
      if (S.over || (e.pointerType === "mouse" && e.button !== 0)) return;
      var i = cellOf(e.target);
      if (i < 0 || !S.board[i]) return;
      drag = { i: i, id: e.pointerId, x: e.clientX, y: e.clientY, active: false, ghost: null, over: -1 };
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.active) {
        var dx = e.clientX - drag.x;
        var dy = e.clientY - drag.y;
        if (dx * dx + dy * dy < 100) return;
        if (S.over || !S.board[drag.i]) { drag = null; return; }
        drag.active = true;
        try { N.board.setPointerCapture(drag.id); } catch (err) { /* 잡지 못해도 진행한다 */ }
        drag.ghost = el("span", { class: "mg-ghost", text: TIERS[S.board[drag.i]].icon, "aria-hidden": "true" });
        N.stage.appendChild(drag.ghost);
        S.sel = drag.i;
        refresh();
        N.cells[drag.i].classList.add("src");
      }
      placeGhost(e.clientX, e.clientY);
      var j = cellAt(e.clientX, e.clientY);
      if (j !== drag.over) {
        if (drag.over >= 0) N.cells[drag.over].classList.remove("over");
        drag.over = j;
        var t = S.board[drag.i];
        if (j >= 0 && j !== drag.i && (S.board[j] === 0 || (S.board[j] === t && t < TOP))) N.cells[j].classList.add("over");
      }
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = dropDrag();
      if (!d.active) return;
      swallowClick = true;
      later(function () { swallowClick = false; }, 60);
      if (S.over) return;
      var j = cellAt(e.clientX, e.clientY);
      var t = S.board[d.i];
      if (!t || j < 0 || j === d.i) { refresh(); return; }
      var u = S.board[j];
      if (u === 0) {
        S.board[j] = t;
        S.board[d.i] = 0;
        S.sel = j;
        drawCell(d.i);
        drawCell(j, "is-pop");
        refresh();
      } else if (u === t && t < TOP) {
        merge(d.i, j);
      } else {
        say(u === t ? "빵집은 더 합칠 수 없습니다. 팔아서 코인으로 바꿉니다." : "같은 물건끼리만 합칠 수 있습니다.", "warn");
        ui.replay(N.cells[j], "is-shake");
        refresh();
      }
    }
    function onCancel(e) {
      if (!drag || e.pointerId !== drag.id) return;
      dropDrag();
      refresh();
    }

    /* ---------- 끝 ---------- */
    function finish() {
      S.over = true;
      S.left = 0;
      dropDrag();
      if (tickId !== null) { clearInterval(tickId); tickId = null; }
      S.sel = -1;
      drawTime();
      refresh();

      var leftCount = 0;
      var leftValue = 0;
      for (var i = 0; i < CELLS; i++) {
        if (S.board[i]) { leftCount++; leftValue += TIERS[S.board[i]].price; }
      }

      var finalCoins = el("b", { text: "0" });
      var rows = [];
      for (var t = 2; t <= TOP; t++) {
        var w = wheatOf(t);
        var cost = w * WHEAT_PRICE;
        rows.push(el("tr", { class: S.best >= t ? "made" : null }, [
          el("td", null, [el("i", { class: "mg-tico", text: TIERS[t].icon, "aria-hidden": "true" }), TIERS[t].name]),
          el("td", { class: "num mg-cost" }, [el("span", { text: "밀 " + w + "개" }), " ", el("span", { text: "= " + cost })]),
          el("td", { class: "num", text: String(TIERS[t].price) }),
          el("td", { class: "num mg-plus", text: "+" + (TIERS[t].price - cost) })
        ]));
      }

      var gain = S.coins - START_COINS;
      var summary = gain > 0
        ? "처음 " + START_COINS + "코인이 " + ui.fmt(S.coins) + "코인으로 늘었습니다."
        : gain === 0
          ? "코인이 처음과 같은 " + START_COINS + "코인입니다."
          : "처음 " + START_COINS + "코인이 " + ui.fmt(S.coins) + "코인으로 줄었습니다.";

      N.result.textContent = "";
      N.result.appendChild(el("h4", { text: "시간이 끝났습니다." }));
      N.result.appendChild(el("div", { class: "gm-stats" }, [
        el("div", { class: "gm-stat blue" }, [el("span", { text: "최종 코인" }), finalCoins]),
        el("div", { class: "gm-stat" }, [el("span", { text: "가장 높은 단계" }), el("b", { text: S.best ? TIERS[S.best].icon + " " + TIERS[S.best].name : "없음" })]),
        el("div", { class: "gm-stat" }, [el("span", { text: "판에 남은 물건" }), el("b", { text: leftCount + "개" })])
      ]));
      N.result.appendChild(el("p", { class: "mg-sum", text: summary }));
      if (leftCount) {
        N.result.appendChild(el("p", { class: "mg-sum", text: "판에 남은 물건 " + leftCount + "개는 팔지 않았으므로 코인이 되지 않았습니다. 모두 팔았다면 " + ui.fmt(leftValue) + "코인입니다." }));
      }
      N.result.appendChild(el("div", { class: "mg-tablewrap" }, [
        el("table", { class: "mg-table" }, [
          el("thead", null, [el("tr", null, [
            el("th", { text: "물건" }),
            el("th", { class: "num", text: "밀로 계산한 재료값" }),
            el("th", { class: "num", text: "판매가" }),
            el("th", { class: "num", text: "더해진 가치" })
          ])]),
          el("tbody", null, rows)
        ])
      ]));
      N.result.appendChild(el("div", { class: "gm-lesson" }, [
        "밀 두 개 값은 2코인이지만 반죽은 3코인에 팔립니다. 만드는 과정에서 더해진 가치를 ",
        el("b", { text: "부가가치" }),
        "라고 합니다. 단계를 거칠수록 부가가치가 커지지만 시간과 자리가 더 듭니다."
      ]));
      N.result.appendChild(el("div", { class: "gm-row mg-again" }, [
        el("button", { type: "button", class: "gm-btn primary lg", text: "다시 하기", onclick: setup })
      ]));

      N.play.classList.add("gm-hide");
      N.say.classList.add("gm-hide");
      N.top.classList.add("gm-hide");
      N.bar.classList.add("gm-hide");
      N.result.classList.remove("gm-hide");
      ui.countUp(finalCoins, S.coins, 900);
    }

    /* ---------- 처음 상태 ---------- */
    function setup() {
      stopAll();
      body.textContent = "";
      S = { board: [], coins: START_COINS, left: SECONDS, started: false, over: false, sel: -1, best: 0, last: 0, rand: ui.rng(Date.now()) };
      for (var i = 0; i < CELLS; i++) S.board.push(0);
      N = { cells: [], chips: [] };

      N.coinNum = el("strong", { "data-now": START_COINS, text: String(START_COINS) });
      N.coinStat = el("div", { class: "gm-stat blue" }, [
        el("span", { text: "코인" }),
        el("b", null, [el("i", { class: "mg-coin", "aria-hidden": "true" }), N.coinNum])
      ]);
      N.time = el("b", { text: SECONDS + "초" });
      N.timeStat = el("div", { class: "gm-stat" }, [el("span", { text: "남은 시간" }), N.time]);
      N.best = el("b", { text: "없음" });
      N.barFill = el("i");
      N.bar = el("div", { class: "mg-bar", "aria-hidden": "true" }, [N.barFill]);
      N.say = el("div", { class: "gm-msg mg-say", role: "status", text: GOAL });

      N.board = el("div", { class: "mg-board", role: "group", "aria-label": "공장 판" });
      for (var c = 0; c < CELLS; c++) {
        var cell = el("button", { type: "button", class: "mg-cell", "data-i": c, "aria-label": "빈자리" });
        N.cells.push(cell);
        N.board.appendChild(cell);
      }
      N.board.addEventListener("click", function (e) {
        if (swallowClick) { swallowClick = false; return; }
        var idx = cellOf(e.target);
        if (idx >= 0) tap(idx);
      });
      N.board.addEventListener("pointerdown", onDown);
      N.board.addEventListener("pointermove", onMove);
      N.board.addEventListener("pointerup", onUp);
      N.board.addEventListener("pointercancel", onCancel);
      N.emptyHint = el("div", { class: "mg-empty", text: "밀 사기를 누르면 시간이 흐르기 시작합니다." });

      var chain = el("div", { class: "mg-chain" });
      for (var t = 1; t <= TOP; t++) {
        N.chips[t] = el("div", { class: "mg-chip" }, [
          el("i", { text: TIERS[t].icon, "aria-hidden": "true" }),
          el("b", { text: TIERS[t].name }),
          el("em", { text: TIERS[t].price + "코인" })
        ]);
        chain.appendChild(N.chips[t]);
      }

      N.buy1 = el("button", { type: "button", class: "gm-btn primary", text: "밀 사기 (1코인)", onclick: function () { buy(1); } });
      N.buy5 = el("button", { type: "button", class: "gm-btn", text: "밀 5개 사기 (5코인)", onclick: function () { buy(5); } });
      N.sell = el("button", { type: "button", class: "gm-btn green", text: "팔기", onclick: sell });
      var again = el("button", { type: "button", class: "gm-btn ghost", text: "다시 하기", onclick: setup });

      N.play = el("div", { class: "mg-play" }, [
        el("div", { class: "mg-boardwrap" }, [N.board, N.emptyHint]),
        el("div", { class: "mg-side" }, [
          el("div", { class: "mg-acts" }, [N.buy1, N.buy5, N.sell, again]),
          el("div", { class: "mg-chainbox" }, [
            el("div", { class: "mg-cap", text: "같은 것 두 개를 합치면 다음 단계가 됩니다. 아래 값은 판매가입니다." }),
            chain
          ])
        ])
      ]);
      N.result = el("div", { class: "gm-result mg-result gm-hide" });

      N.top = el("div", { class: "gm-stats" }, [
        N.coinStat,
        N.timeStat,
        el("div", { class: "gm-stat" }, [el("span", { text: "가장 높은 단계" }), N.best])
      ]);
      N.stage = el("div", { class: "mg-stage" }, [
        N.top,
        N.bar,
        N.say,
        N.play,
        N.result
      ]);
      body.appendChild(N.stage);
      drawTime();
      refresh();
    }

    setup();
  };
})();
