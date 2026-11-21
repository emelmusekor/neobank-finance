/* 돈 찍어내기: 돈을 찍어도 빵은 늘지 않는다. (통화량과 물가) */
(function () {
  "use strict";
  var Games = (window.EcoGames = window.EcoGames || {});

  var M0 = 10000;          // 처음 통화량(원)
  var Q0 = 100;            // 처음 하루 빵 생산량(개)
  var P0 = 100;            // 처음 빵 1개 값(원)
  var CLICK = 500;         // 한 번 누를 때 찍는 돈
  var AUTO = 300;          // 인쇄기 1대가 1초에 찍는 돈
  var PRINTER0 = 2000;     // 첫 인쇄기를 놓을 수 있는 통화량
  var PRINTER_UP = 1.6;
  var BAKERY_Q = 20;       // 빵집 하나가 늘리는 생산량
  var BAKERY_LOAVES = 30;  // 빵집 값 = 빵 30개 값
  var BUILD_SEC = 3;       // 빵집을 짓는 데 걸리는 시간
  var BURN = 0.2;          // 거두어 없애는 비율
  var BURN_MIN = 2000;
  var GOAL_M = 100000;
  var GOAL_Q = 200;
  var GOAL_P = 200;
  var SLOTS = 60;          // 그래프에 보이는 최근 표본 수(1초에 하나)
  var FACES = ["🧑‍🌾", "👩‍🍳", "🧓", "👧", "👨‍🔧"];

  function priceOf(m, q) { return Math.round(P0 * (m / M0) / (q / Q0)); }
  function printerCost(n) { return Math.round((PRINTER0 * Math.pow(PRINTER_UP, n)) / 100) * 100; }
  function trim(x, dec) {
    var s = x.toFixed(dec);
    return s.indexOf(".") >= 0 ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
  }
  function times(x, dec) { return trim(x, dec == null ? 1 : dec) + "배"; }
  function levelOf(p) { return p >= 1000 ? 5 : p >= 500 ? 4 : p >= 200 ? 3 : p >= 120 ? 2 : p >= 90 ? 1 : 0; }

  function timesLine(p) { return "빵값이 처음의 " + times(p / P0) + "가 됐습니다."; }
  var TALK = [
    [function () { return "빵값이 처음보다 쌉니다."; }, function () { return "같은 돈으로 빵을 더 많이 삽니다."; }],
    [function (p, f) { return "빵 한 개에 " + f(p) + "원입니다."; }, function () { return "장보기가 평소와 같습니다."; }],
    [function () { return "빵값이 올랐습니다."; }, function () { return "지난번보다 빵이 비쌉니다."; }],
    [timesLine, function () { return "같은 돈으로 살 수 있는 빵이 절반 이하로 줄었습니다."; }],
    [timesLine, function () { return "모아 둔 돈의 값어치가 떨어졌습니다."; }, function () { return "가게마다 값표를 다시 씁니다."; }],
    [function () { return "월급을 받아도 빵을 못 삽니다."; }, timesLine, function () { return "모아 둔 돈으로 살 수 있는 것이 크게 줄었습니다."; }]
  ];

  /* 빵값 꺾은선: draw(값 배열, 가로 칸 수) */
  function makeSpark(ui, mode) {
    var W = 300, H = 76, PX = 7, PT = 9, PB = 6;
    var el = ui.el;
    var wrap = el("div", { class: "pr-spark" });
    var box = el("div", { class: "pr-sp-plot" });
    box.innerHTML =
      '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="빵값의 움직임">' +
      '<line class="pr-sp-base" x1="0" x2="' + W + '" y1="' + (H - PB) + '" y2="' + (H - PB) + '"/>' +
      '<line class="pr-sp-ref" x1="0" x2="' + W + '"/>' +
      '<path class="pr-sp-area"/><polyline class="pr-sp-line"/>' +
      '<line class="pr-sp-cross" y1="' + PT + '" y2="' + (H - PB) + '"/>' +
      '<circle class="pr-sp-dot" r="4.5"/></svg>';
    var svg = box.firstChild;
    var ref = svg.querySelector(".pr-sp-ref");
    var area = svg.querySelector(".pr-sp-area");
    var line = svg.querySelector(".pr-sp-line");
    var cross = svg.querySelector(".pr-sp-cross");
    var dot = svg.querySelector(".pr-sp-dot");
    var note = el("span", { class: "pr-sp-note" });
    wrap.appendChild(box);
    wrap.appendChild(el("div", { class: "pr-sp-cap" }, [
      el("span", { class: "pr-sp-key" }, [el("i", { "aria-hidden": "true" }), "처음 값 " + P0 + "원"]),
      note
    ]));
    var data = [];
    var slots = 2;
    var hold = -1;

    function draw(values, n) {
      if (values) { data = values; slots = Math.max(2, n || values.length); }
      if (!data.length) return;
      var top = 250, peak = 0, i;
      for (i = 0; i < data.length; i++) { if (data[i] > peak) peak = data[i]; }
      if (peak * 1.15 > top) top = peak * 1.15;
      function x(k) { return PX + ((W - 2 * PX) * k) / (slots - 1); }
      function y(v) { return H - PB - ((H - PT - PB) * v) / top; }
      var pts = [];
      for (i = 0; i < data.length; i++) pts.push(x(i).toFixed(1) + "," + y(data[i]).toFixed(1));
      var lastI = data.length - 1;
      line.setAttribute("points", pts.join(" "));
      area.setAttribute("d", "M" + x(0).toFixed(1) + "," + (H - PB) + " L" + pts.join(" L") + " L" + x(lastI).toFixed(1) + "," + (H - PB) + " Z");
      ref.setAttribute("y1", y(P0).toFixed(1));
      ref.setAttribute("y2", y(P0).toFixed(1));
      var at = hold >= 0 ? Math.min(hold, lastI) : lastI;
      dot.setAttribute("cx", x(at).toFixed(1));
      dot.setAttribute("cy", y(data[at]).toFixed(1));
      cross.style.visibility = hold >= 0 ? "visible" : "hidden";
      cross.setAttribute("x1", x(at).toFixed(1));
      cross.setAttribute("x2", x(at).toFixed(1));
      var text;
      if (hold >= 0) {
        if (mode === "all") text = at + "초째 " + ui.fmt(data[at]) + "원";
        else text = lastI - at === 0 ? "지금 " + ui.fmt(data[at]) + "원" : lastI - at + "초 전 " + ui.fmt(data[at]) + "원";
      } else {
        text = (mode === "all" ? "처음부터 끝까지" : "최근 " + SLOTS + "초") + " · 가장 높을 때 " + ui.fmt(peak) + "원";
      }
      if (note.textContent !== text) note.textContent = text;
    }

    function pick(e) {
      if (!data.length) return;
      var r = svg.getBoundingClientRect();
      if (!r.width) return;
      var vx = ((e.clientX - r.left) / r.width) * W;
      hold = ui.clamp(Math.round(((vx - PX) / (W - 2 * PX)) * (slots - 1)), 0, data.length - 1);
      draw();
    }
    function release() { hold = -1; draw(); }
    svg.addEventListener("pointerdown", pick);
    svg.addEventListener("pointermove", pick);
    svg.addEventListener("pointerleave", release);
    svg.addEventListener("pointercancel", release);

    return { node: wrap, draw: draw };
  }

  Games["printer"] = function (root, ui) {
    var el = ui.el;
    var fmt = ui.fmt;
    var body = ui.frame(root, { badge: "클리커", title: "돈 찍어내기", sub: "돈을 많이 찍으면 빵값이 어떻게 되는지 살펴봅니다." });
    var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var timeouts = [];
    var tickId = null;
    var S = null;
    var N = null;

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
    }
    function put(node, text) { if (node.textContent !== text) node.textContent = text; }

    function money() { return Math.round(S.M); }
    function price() { return priceOf(money(), S.Q); }
    function bakeryCost() { return BAKERY_LOAVES * price(); }

    function tone(p) {
      var t = ui.clamp(Math.log(Math.max(p, P0) / P0) / Math.LN10, 0, 1);
      var a = [26, 29, 33], b = [229, 72, 77];
      return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * t) + "," + Math.round(a[1] + (b[1] - a[1]) * t) + "," + Math.round(a[2] + (b[2] - a[2]) * t) + ")";
    }

    /* ---------- 마을 사람의 말 ---------- */
    function setTalk(text, kind) {
      S.face = (S.face + 1) % FACES.length;
      N.talkFace.textContent = FACES[S.face];
      N.talkText.textContent = text;
      N.talk.className = "pr-talk" + (kind ? " " + kind : "");
      ui.replay(N.talk, "pr-in");
    }
    function levelTalk(p) {
      var lines = TALK[S.level];
      setTalk(lines[S.talkIdx % lines.length](p, fmt), S.level >= 5 ? "hot" : S.level >= 3 ? "warm" : "");
    }
    function fallTalk(p) {
      S.fallHold = 3;
      S.talkAcc = 0;
      setTalk("빵값이 " + fmt(p) + "원으로 내렸습니다.", "down");
    }

    /* ---------- 임무 ---------- */
    function tickMission(i) {
      S.done[i] = true;
      N.mi[i].classList.add("done");
    }
    function checkMissions(p) {
      if (!S.done[0] && money() >= GOAL_M) tickMission(0);
      if (!S.done[1] && (S.done[0] || p >= 1000)) { S.noted = p; tickMission(1); }
      if (!S.done[2] && S.Q >= GOAL_Q) tickMission(2);
      if (!S.done[3] && S.done[0] && S.done[1] && S.done[2] && p < GOAL_P) { tickMission(3); finish(); }
    }

    /* 값이 바뀐 뒤: 최고값, 그래프의 마지막 점, 임무, 마을 사람의 말 */
    function settle() {
      var p = price();
      if (p > S.peak) S.peak = p;
      S.win[S.win.length - 1] = p;
      S.all[S.all.length - 1] = p;
      var lv = levelOf(p);
      if (lv !== S.level) {
        var rising = lv > S.level;
        S.level = lv;
        if (rising || S.fallHold <= 0) { S.talkIdx = 0; S.talkAcc = 0; S.fallHold = 0; levelTalk(p); }
      } else if (S.talkAcc >= 3.5 && S.fallHold <= 0) {
        S.talkAcc = 0;
        S.talkIdx++;
        levelTalk(p);
      }
      checkMissions(p);
    }

    function sample() {
      var p = price();
      S.win.push(p);
      if (S.win.length > SLOTS) S.win.shift();
      S.all.push(p);
    }

    function tick() {
      if (!S || S.over) return;
      var now = Date.now();
      if (!visible()) { S.last = now; return; }
      var dt = Math.min(now - S.last, 300) / 1000;
      S.last = now;
      var before = price();
      if (S.printers) S.M += S.printers * AUTO * dt;
      var built = false;
      if (S.build !== null) {
        S.build += dt / BUILD_SEC;
        if (S.build >= 1) { S.build = null; S.Q += BAKERY_Q; built = true; }
      }
      if (S.acted) {
        S.secAcc += dt;
        while (S.secAcc >= 1) { S.secAcc -= 1; sample(); }
      }
      S.talkAcc += dt;
      if (S.fallHold > 0) S.fallHold -= dt;
      if (built) {
        drawShops(true);
        ui.replay(N.q, "is-pop");
        if (price() < before) fallTalk(price());
      }
      settle();
      render(false);
    }

    /* ---------- 그리기 ---------- */
    function drawShops(popLast) {
      var want = Math.min(40, Math.round(S.Q / BAKERY_Q));
      while (N.shops.children.length < want) {
        N.shops.appendChild(el("i", { class: popLast ? "is-pop" : null, text: "🏪", "aria-hidden": "true" }));
      }
    }

    function render(snap) {
      if (snap || still() || S.over) S.shown = S.M;
      else {
        S.shown += (S.M - S.shown) * 0.45;
        if (Math.abs(S.M - S.shown) < 1) S.shown = S.M;
      }
      var m = Math.round(S.shown);
      var p = priceOf(m, S.Q);
      var realM = money();
      var realP = price();

      put(N.m, fmt(m) + "원");
      put(N.mx, m === M0 ? "처음과 같습니다" : "처음의 " + times(m / M0));

      put(N.p, fmt(p) + "원");
      N.p.style.color = tone(p);
      var ratio = Math.round((p / P0) * 10) / 10;
      put(N.px, p === P0 ? "처음과 같습니다" : ratio === 1 ? "처음과 거의 같습니다" : "처음의 " + times(p / P0));
      N.priceBox.classList.toggle("warm", p >= 200 && p < 1000);
      N.priceBox.classList.toggle("hot", p >= 1000);

      var loaves = 10000 / Math.max(1, p);
      put(N.loaves, loaves.toFixed(1) + "개");
      var lit = ui.clamp(Math.round(loaves / 5), 0, 20);
      if (lit !== S.lit) {
        S.lit = lit;
        for (var i = 0; i < 20; i++) N.basket.children[i].classList.toggle("off", i >= lit);
      }

      put(N.q, fmt(S.Q) + "개");
      put(N.qx, S.Q === Q0 ? "처음과 같습니다" : "처음의 " + times(S.Q / Q0));

      put(N.machText, S.printers ? "인쇄기 " + S.printers + "대가 1초에 " + fmt(S.printers * AUTO) + "원을 찍습니다." : "인쇄기가 아직 없습니다.");

      var pc = printerCost(S.printers);
      put(N.printerSub, "통화량 " + fmt(pc) + "원부터 · 1초에 +" + AUTO + "원");
      N.printerBtn.disabled = S.over || realM < pc;

      var building = S.build !== null;
      var bc = BAKERY_LOAVES * realP;
      put(N.bakerySub, building ? "짓는 중입니다" : "빵 " + BAKERY_LOAVES + "개 값 " + fmt(bc) + "원 · " + BUILD_SEC + "초 걸립니다");
      N.bakeryBtn.disabled = S.over || building || realM < bc;
      N.buildFill.style.width = (building ? Math.min(1, S.build) * 100 : 0) + "%";
      N.buildBar.classList.toggle("on", building);

      N.burnBtn.disabled = S.over || realM < BURN_MIN;
      N.mint.disabled = S.over;

      put(N.miSub[0], S.done[0] ? "마쳤습니다." : "지금 " + fmt(m) + "원입니다.");
      put(N.miSub[1], S.done[1] ? "그때 빵값은 " + fmt(S.noted) + "원, 처음의 " + times(S.noted / P0) + "였습니다." : "통화량이 10배가 되면 빵값을 적어 둡니다.");
      put(N.miSub[2], S.done[2] ? "마쳤습니다." : "지금 " + fmt(S.Q) + "개입니다.");
      put(N.miSub[3], S.done[3] ? "마쳤습니다." : (S.done[0] && S.done[2] ? "" : "①②③을 마친 뒤 확인합니다. ") + "지금 " + fmt(p) + "원입니다.");

      N.spark.draw(S.win, SLOTS);
    }

    /* ---------- 움직임 ---------- */
    function flyBill() {
      if (still() || !visible()) return;
      if (N.press.querySelectorAll(".pr-bill").length > 16) return;
      var a = (-90 + (Math.random() - 0.5) * 150) * (Math.PI / 180);
      var d = 105 + Math.random() * 50;
      var bill = el("i", { class: "pr-bill", "aria-hidden": "true" });
      bill.style.setProperty("--dx", (Math.cos(a) * d).toFixed(0) + "px");
      bill.style.setProperty("--dy", (Math.sin(a) * d).toFixed(0) + "px");
      bill.style.setProperty("--rot", ((Math.random() - 0.5) * 80).toFixed(0) + "deg");
      N.press.appendChild(bill);
      later(function () { bill.remove(); }, 800);
    }

    /* ---------- 단추 ---------- */
    function begin() {
      if (S.acted) return;
      S.acted = true;
      S.secAcc = 0;
    }

    function mint() {
      if (S.over) return;
      begin();
      S.M += CLICK;
      flyBill();
      if (visible()) {
        ui.floatText(N.press, "+" + CLICK + "원", N.press.clientWidth / 2 - 30 + (Math.random() - 0.5) * 90, 2, false);
      }
      settle();
      if (!S.over) render(false);
    }

    function addPrinter() {
      if (S.over || money() < printerCost(S.printers)) return;
      begin();
      S.printers++;
      N.machs.appendChild(el("i", { class: "pr-mach", text: "🖨️", "aria-hidden": "true" }));
      settle();
      render(false);
    }

    function startBakery() {
      if (S.over || S.build !== null || money() < bakeryCost()) return;
      begin();
      S.build = 0;
      render(false);
    }

    function burn() {
      if (S.over || money() < BURN_MIN) return;
      begin();
      var before = price();
      var cut = S.M * BURN;
      S.M -= cut;
      if (visible()) {
        ui.floatText(N.moneyBox, "-" + fmt(cut) + "원", Math.max(16, N.moneyBox.clientWidth - 150), 8, true);
        ui.replay(N.m, "is-shake");
      }
      var p = price();
      if (p < before) fallTalk(p);
      settle();
      if (!S.over) render(false);
    }

    /* ---------- 끝 ---------- */
    function finish() {
      S.over = true;
      if (tickId !== null) { clearInterval(tickId); tickId = null; }
      N.wrap.classList.add("over");
      render(true);
      later(showResult, 900);
    }

    function showResult() {
      var m = money();
      var p = price();
      var peakB = el("b", { text: "0원" });
      var mB = el("b", { text: "0원" });
      var qB = el("b", { text: "0개" });
      var pB = el("b", { text: "0원" });
      var won = function (v) { return fmt(v) + "원"; };
      var spark = makeSpark(ui, "all");

      N.result.textContent = "";
      N.result.appendChild(el("h4", { text: "임무를 모두 마쳤습니다." }));
      N.result.appendChild(el("div", { class: "gm-stats" }, [
        el("div", { class: "gm-stat red" }, [el("span", { text: "최고 빵값" }), peakB]),
        el("div", { class: "gm-stat" }, [el("span", { text: "최종 통화량" }), mB]),
        el("div", { class: "gm-stat" }, [el("span", { text: "최종 생산량" }), qB]),
        el("div", { class: "gm-stat green" }, [el("span", { text: "최종 빵값" }), pB])
      ]));
      N.result.appendChild(el("p", { text: "통화량이 10배가 되었을 때 빵값은 " + fmt(S.noted) + "원으로, 처음의 " + times(S.noted / P0) + "였습니다." }));
      N.result.appendChild(el("p", { text: "마지막에는 통화량이 처음의 " + times(m / M0, 2) + ", 빵 생산량이 " + times(S.Q / Q0, 2) + "여서 빵값은 처음의 약 " + times(p / P0, 2) + "입니다." }));
      N.result.appendChild(el("div", { class: "pr-resultspark" }, [spark.node]));
      N.result.appendChild(el("div", { class: "gm-lesson" }, [
        "돈을 10배로 찍어도 빵이 그대로면 ",
        el("b", { text: "빵값만 10배" }),
        "가 됩니다. 살 수 있는 빵은 늘지 않습니다. 빵값을 낮춘 것은 더 많이 만든 빵과 거두어 없앤 돈이었습니다."
      ]));
      N.result.appendChild(el("div", { class: "gm-row pr-again" }, [
        el("button", { type: "button", class: "gm-btn primary lg", text: "다시 하기", onclick: setup })
      ]));

      N.goal.classList.add("gm-hide");
      N.grid.classList.add("gm-hide");
      N.foot.classList.add("gm-hide");
      N.result.classList.remove("gm-hide");
      spark.draw(S.all, S.all.length);
      ui.countUp(peakB, S.peak, 900, won);
      ui.countUp(mB, m, 900, won);
      ui.countUp(qB, S.Q, 900, function (v) { return fmt(v) + "개"; });
      ui.countUp(pB, p, 900, won);
    }

    /* ---------- 처음 상태 ---------- */
    function actBtn(cls, title, sub, fn) {
      return el("button", { type: "button", class: "gm-btn pr-act" + (cls ? " " + cls : ""), onclick: fn }, [el("b", { text: title }), sub]);
    }

    function setup() {
      stopAll();
      body.textContent = "";
      S = {
        M: M0, Q: Q0, shown: M0, printers: 0, build: null, peak: P0, noted: 0,
        done: [false, false, false, false], over: false, acted: false,
        last: Date.now(), secAcc: 0, talkAcc: 0, talkIdx: 0, level: levelOf(P0), fallHold: 0, face: -1, lit: -1,
        win: [P0], all: [P0]
      };
      N = { mi: [], miSub: [] };

      N.goal = el("div", { class: "gm-msg", text: "돈을 찍어 통화량을 10배로 늘린 뒤, 빵값을 다시 200원 아래로 돌려놓습니다." });

      /* 중앙은행 */
      N.m = el("b", { text: fmt(M0) + "원" });
      N.mx = el("small", { text: "처음과 같습니다" });
      N.moneyBox = el("div", { class: "pr-box pr-money" }, [el("span", { text: "통화량 (마을에 도는 돈)" }), N.m, N.mx]);
      N.mint = el("button", { type: "button", class: "pr-mint", onclick: mint }, [
        el("b", { text: "돈 찍기" }),
        el("small", { text: "+" + CLICK + "원" })
      ]);
      N.press = el("div", { class: "pr-press" }, [N.mint]);
      N.machs = el("div", { class: "pr-machs" });
      N.machText = el("div", { class: "pr-machtext", text: "인쇄기가 아직 없습니다." });
      N.printerSub = el("small");
      N.printerBtn = actBtn("primary", "인쇄기 놓기", N.printerSub, addPrinter);
      N.burnBtn = actBtn("red", "돈 거두어 없애기", el("small", { text: "세금으로 20%를 거두어 태웁니다" }), burn);
      var bank = el("div", { class: "pr-panel pr-bank" }, [
        el("div", { class: "pr-cap", text: "🏦 중앙은행" }),
        N.moneyBox,
        N.press,
        el("div", { class: "pr-machbox" }, [N.machs, N.machText]),
        el("div", { class: "pr-acts" }, [N.printerBtn, N.burnBtn]),
        el("p", { class: "pr-rule", text: "인쇄기와 빵집에 치른 돈은 마을 사람에게 가므로 통화량은 줄지 않습니다." })
      ]);

      /* 마을 */
      N.p = el("b", { text: fmt(P0) + "원" });
      N.px = el("small", { text: "처음과 같습니다" });
      N.spark = makeSpark(ui, "live");
      N.priceBox = el("div", { class: "pr-box pr-price" }, [el("span", { text: "빵 1개 값" }), N.p, N.px, N.spark.node]);

      N.loaves = el("b", { text: "100.0개" });
      N.basket = el("div", { class: "pr-basket", "aria-hidden": "true" });
      for (var i = 0; i < 20; i++) N.basket.appendChild(el("i", { text: "🍞" }));
      var buyBox = el("div", { class: "pr-box pr-buy" }, [
        el("span", { text: "1만 원으로 살 수 있는 빵" }),
        N.loaves,
        N.basket,
        el("small", { text: "그림 하나가 빵 5개입니다." })
      ]);

      N.q = el("b", { text: fmt(Q0) + "개" });
      N.qx = el("small", { text: "처음과 같습니다" });
      N.shops = el("div", { class: "pr-shops", "aria-hidden": "true" });
      N.bakerySub = el("small");
      N.bakeryBtn = actBtn("green", "빵집 짓기 (하루 +" + BAKERY_Q + "개)", N.bakerySub, startBakery);
      N.buildFill = el("i");
      N.buildBar = el("div", { class: "pr-build", "aria-hidden": "true" }, [N.buildFill]);
      var prodBox = el("div", { class: "pr-box pr-prod" }, [
        el("span", { text: "하루 빵 생산량" }),
        N.q,
        N.qx,
        N.shops,
        N.bakeryBtn,
        N.buildBar
      ]);

      N.talkFace = el("i", { "aria-hidden": "true" });
      N.talkText = el("p");
      N.talk = el("div", { class: "pr-talk", role: "status" }, [N.talkFace, N.talkText]);

      var town = el("div", { class: "pr-panel pr-town" }, [
        el("div", { class: "pr-cap", text: "🏘️ 마을" }),
        N.priceBox,
        N.talk,
        buyBox,
        prodBox
      ]);
      N.grid = el("div", { class: "pr-grid" }, [bank, town]);

      /* 임무 */
      var titles = [
        "① 통화량을 10배(" + fmt(GOAL_M) + "원)로 만듭니다.",
        "② 그때의 빵값을 확인합니다.",
        "③ 빵집을 지어 생산량을 2배(" + GOAL_Q + "개)로 만듭니다.",
        "④ 빵값을 " + GOAL_P + "원 아래로 되돌립니다."
      ];
      var list = el("ol", { class: "pr-missions" });
      titles.forEach(function (t, k) {
        N.miSub[k] = el("small");
        N.mi[k] = el("li", { class: "pr-mi" }, [
          el("i", { class: "pr-ck", text: "✓", "aria-hidden": "true" }),
          el("div", null, [el("b", { text: t }), N.miSub[k]])
        ]);
        list.appendChild(N.mi[k]);
      });

      N.foot = el("div", { class: "gm-row" }, [
        el("button", { type: "button", class: "gm-btn ghost", text: "다시 하기", onclick: setup })
      ]);
      N.result = el("div", { class: "gm-result pr-result gm-hide" });

      N.wrap = el("div", { class: "pr-wrap" }, [
        N.goal,
        N.grid,
        el("div", { class: "pr-missionbox" }, [el("div", { class: "pr-cap", text: "임무" }), list]),
        N.result,
        N.foot
      ]);
      body.appendChild(N.wrap);

      drawShops(false);
      levelTalk(P0);
      render(true);
      tickId = setInterval(tick, 100);
    }

    setup();
  };
})();
