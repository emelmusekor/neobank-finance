/* 백 명 마을: 같은 사고가 일어나는 두 마을로 보험의 뜻을 본다. */
(function () {
  "use strict";
  window.EcoGames = window.EcoGames || {};
  window.EcoGames["village"] = function (root, ui) {
    var el = ui.el, fmt = ui.fmt;
    var N = 100, YEARS = 10;
    var START = 300, LOSS = 300, PREMIUM = 10, RESERVE = 1000, RISK = 0.03;
    var FACE_OK = "🙂", FACE_HIT = "💥", FACE_BROKE = "😢";

    var S = null;
    var timers = [];

    function reduced() {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
    function later(fn, ms) {
      var id = setTimeout(function () {
        timers = timers.filter(function (t) { return t !== id; });
        fn();
      }, ms);
      timers.push(id);
      return id;
    }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function num(v) { var r = Math.round(v); return (r < 0 ? "−" : "") + fmt(Math.abs(r)); }
    function won(v) { return num(v) + "만 원"; }
    /* 숫자를 바로 바꾼다. 아직 돌고 있던 숫자 올리기의 마지막 장면이 덮어쓰지 못하게 한 번 더 건다. */
    function setNow(node, v, f) {
      node.setAttribute("data-now", v);
      node.textContent = f(v);
      ui.countUp(node, v, 1, f);
    }

    /* 재산에 따른 칸 색: 300만 초록, 200만 청록, 0 이하 짙은 빨강 */
    function colorOf(w) {
      if (w < 0) return "#5a0f14";
      if (w === 0) return "#9f1d24";
      var t = Math.max(0, Math.min(1, (START - w) / 100));
      var a = [22, 163, 74], b = [38, 146, 196];
      return "rgb(" + a.map(function (c, i) { return Math.round(c + (b[i] - c) * t); }).join(",") + ")";
    }

    /* ---------- 화면 틀 ---------- */
    var body = ui.frame(root, {
      badge: "시뮬레이션",
      title: "백 명 마을",
      sub: "두 마을에 똑같은 사고가 일어납니다. 보험이 있을 때와 없을 때를 견주어 봅니다."
    });

    var msg = el("div", { class: "gm-msg" });

    function stat(label, cls) {
      var numNode = el("i", { class: "vl-num", text: "0" });
      var unit = el("small", { class: "vl-unit" });
      var lab = el("span", { text: label });
      var box = el("div", { class: "gm-stat" + (cls ? " " + cls : "") }, [lab, el("b", null, [numNode, unit])]);
      return { box: box, num: numNode, unit: unit, label: lab };
    }
    function setStat(st, v, unit, animate, f) {
      st.unit.textContent = unit;
      if (animate) ui.countUp(st.num, v, 450, f || num);
      else setNow(st.num, v, f || num);
    }

    var topYear = stat("연도");
    var topNow = stat("올해 사고를 당한 사람");
    var topAll = stat("지금까지 일어난 사고");
    var topStats = el("div", { class: "gm-stats" }, [topYear.box, topNow.box, topAll.box]);

    /* 해마다 사고 수 */
    var chips = [];
    var strip = el("div", { class: "vl-strip" });
    for (var c = 1; c <= YEARS; c++) {
      var cnt = el("b", { text: "" });
      var chip = el("div", { class: "vl-chip" }, [el("span", { text: c + "년" }), cnt]);
      chips.push({ box: chip, cnt: cnt });
      strip.appendChild(chip);
    }
    var stripWrap = el("div", { class: "vl-stripwrap" }, [
      el("div", { class: "gm-label", text: "해마다 사고를 당한 사람 수" }), strip
    ]);

    function village(kind, title, note) {
      var cells = [];
      var grid = el("div", { class: "vl-grid", role: "img", "aria-label": title + " 주민 100명" });
      for (var i = 0; i < N; i++) {
        var cell = el("div", { class: "vl-cell", text: FACE_OK });
        cells.push(cell);
        grid.appendChild(cell);
      }
      var st = {
        avg: stat("평균 재산"),
        min: stat("가장 가난한 사람의 재산"),
        zero: stat("재산이 0 이하인 사람"),
        extra: stat(kind === "a" ? "각자 떠안은 손실" : "공동 주머니 잔액")
      };
      var panel = el("div", { class: "vl-village vl-" + kind }, [
        el("div", { class: "vl-vhead" }, [
          el("div", { class: "vl-vtitle", text: title }),
          el("div", { class: "vl-vnote", text: note })
        ]),
        grid,
        el("div", { class: "gm-stats vl-vstats" }, [st.avg.box, st.min.box, st.zero.box, st.extra.box])
      ]);
      return { panel: panel, cells: cells, st: st };
    }
    var VA = village("a", "보험 없는 마을", "사고가 나면 300만 원을 혼자 감당합니다.");
    var VB = village("b", "보험 있는 마을", "해마다 모두 10만 원씩 내고, 사고가 나면 300만 원을 받습니다.");
    var villages = el("div", { class: "vl-villages" }, [VA.panel, VB.panel]);

    function sw(color, text, face) {
      return el("span", { class: "vl-lg" }, [
        el("i", { class: "vl-sw", style: { background: color }, text: face || "" }), text
      ]);
    }
    var legend = el("div", { class: "vl-legend" }, [
      sw(colorOf(300), "재산 300만 원", FACE_OK),
      sw(colorOf(200), "재산 200만 원", FACE_OK),
      sw(colorOf(0), "0 이하 (빈털터리)", FACE_BROKE),
      sw("#e5484d", "올해 사고", FACE_HIT)
    ]);

    var btnStep = el("button", { type: "button", class: "gm-btn primary lg", text: "1년 보내기" });
    var btnAll = el("button", { type: "button", class: "gm-btn", text: "10년 한 번에" });
    var btnReset = el("button", { type: "button", class: "gm-btn ghost", text: "다시 하기" });
    btnStep.addEventListener("click", function () { if (S && !S.done && !S.auto && !S.busy) step(); });
    btnAll.addEventListener("click", function () { if (S && !S.done && !S.auto) runAll(); });
    btnReset.addEventListener("click", function () { start(); });
    var btnRow = el("div", { class: "gm-row" }, [btnStep, btnAll, btnReset]);

    var result = el("div", { class: "gm-result vl-result gm-hide" });

    body.appendChild(msg);
    body.appendChild(topStats);
    body.appendChild(stripWrap);
    body.appendChild(villages);
    body.appendChild(legend);
    body.appendChild(btnRow);
    body.appendChild(result);

    /* ---------- 상태 ---------- */
    function newState() {
      var seed = ((Date.now() % 2147483647) ^ Math.floor(Math.random() * 2147483647)) >>> 0;
      var r = ui.rng(seed || 1);
      var acc = [];
      for (var y = 0; y < YEARS; y++) {
        var row = [];
        for (var i = 0; i < N; i++) row.push(r() < RISK);
        acc.push(row);
      }
      var wA = [], wB = [], hits = [];
      for (var k = 0; k < N; k++) { wA.push(START); wB.push(START); hits.push(0); }
      return {
        acc: acc, year: 0, done: false, auto: false, busy: false,
        wA: wA, wB: wB, hits: hits,
        pocket: RESERVE, total: 0, perYear: [], shortYears: []
      };
    }

    function summary(arr) {
      var sum = 0, min = Infinity, zero = 0;
      arr.forEach(function (w) { sum += w; if (w < min) min = w; if (w <= 0) zero++; });
      return { avg: sum / arr.length, min: min, zero: zero };
    }

    function setMsg(kind, text) {
      msg.className = "gm-msg" + (kind ? " " + kind : "");
      msg.textContent = text;
    }

    function renderCells(hitList, animate) {
      var isHit = {};
      (hitList || []).forEach(function (i) { isHit[i] = true; });
      for (var i = 0; i < N; i++) {
        var a = VA.cells[i], b = VB.cells[i];
        a.style.background = colorOf(S.wA[i]);
        a.textContent = S.wA[i] <= 0 ? FACE_BROKE : FACE_OK;
        a.classList.toggle("is-broke", S.wA[i] <= 0);
        a.classList.toggle("is-debt", S.wA[i] < 0);
        b.style.background = colorOf(S.wB[i]);
        b.textContent = FACE_OK;
        if (isHit[i] && animate) ui.replay(b, "is-heal");
      }
    }

    function flashCells(hitList) {
      hitList.forEach(function (i) {
        [VA.cells[i], VB.cells[i]].forEach(function (cell) {
          cell.classList.remove("is-heal");
          cell.textContent = FACE_HIT;
          ui.replay(cell, "is-hit");
        });
      });
    }

    function renderStats(animate) {
      var y = S.year;
      var hitsNow = y > 0 ? S.perYear[y - 1] : 0;
      setStat(topYear, y, " / " + YEARS + "년", false);
      setStat(topNow, hitsNow, "명", animate);
      setStat(topAll, S.total, "번", animate);
      topNow.box.classList.toggle("red", hitsNow > 0);

      var a = summary(S.wA), b = summary(S.wB);
      setStat(VA.st.avg, a.avg, "만 원", animate);
      setStat(VA.st.min, a.min, "만 원", animate);
      setStat(VA.st.zero, a.zero, "명", animate);
      setStat(VA.st.extra, S.total * LOSS, "만 원", animate);
      VA.st.min.box.classList.toggle("red", a.min <= 0);
      VA.st.zero.box.classList.toggle("red", a.zero > 0);

      setStat(VB.st.avg, b.avg, "만 원", animate);
      setStat(VB.st.min, b.min, "만 원", animate);
      setStat(VB.st.zero, b.zero, "명", animate);
      setStat(VB.st.extra, S.pocket, "만 원", animate);
      var short = S.pocket < 0;
      VB.st.extra.box.classList.toggle("red", short);
      VB.st.extra.box.classList.toggle("blue", !short);
      VB.st.extra.label.textContent = short ? "공동 주머니 잔액 (준비금 부족)" : "공동 주머니 잔액";

      chips.forEach(function (ch, i) {
        var passed = i < y;
        ch.box.classList.toggle("is-done", passed);
        ch.box.classList.toggle("is-now", i === y - 1);
        ch.box.classList.toggle("is-many", passed && S.perYear[i] >= 5);
        ch.cnt.textContent = passed ? S.perYear[i] + "명" : "";
      });
    }

    function renderButtons() {
      var locked = S.done || S.auto;
      btnStep.disabled = locked;
      btnAll.disabled = locked;
      btnStep.textContent = S.done ? "10년이 지났습니다" : "1년 보내기";
    }

    function step() {
      if (S.done) return;
      var y = S.year + 1, hitList = [];
      for (var i = 0; i < N; i++) {
        S.wB[i] -= PREMIUM;
        if (S.acc[y - 1][i]) {
          hitList.push(i);
          S.wA[i] -= LOSS;      /* 보험 없는 마을: 혼자 감당 */
          S.hits[i] += 1;       /* 보험 있는 마을: 주머니에서 300만 원을 받아 손실이 메워진다 */
        }
      }
      var paid = hitList.length * LOSS;
      S.pocket += N * PREMIUM - paid;
      S.total += hitList.length;
      S.perYear.push(hitList.length);
      S.year = y;
      if (S.pocket < 0) S.shortYears.push(y);
      if (y >= YEARS) { S.done = true; S.auto = false; }

      var pocketBox = VB.st.extra.box;
      ui.floatText(pocketBox, "+" + fmt(N * PREMIUM), 14, 2, false);
      if (paid > 0) {
        later(function () { ui.floatText(pocketBox, "−" + fmt(paid), 84, 2, true); }, reduced() ? 0 : 220);
      }

      if (S.pocket < 0) {
        setMsg("bad", y + "년째: " + hitList.length + "명이 사고를 당했습니다. 공동 주머니가 " +
          fmt(-S.pocket) + "만 원 모자랍니다. 준비금 부족입니다.");
      } else if (hitList.length === 0) {
        setMsg("good", y + "년째: 사고가 없었습니다. 보험료 1,000만 원이 공동 주머니에 쌓였습니다.");
      } else {
        setMsg(hitList.length >= 5 ? "warn" : "", y + "년째: " + hitList.length + "명이 사고를 당했습니다. 보험 있는 마을은 공동 주머니에서 " +
          fmt(paid) + "만 원을 내주었습니다.");
      }

      renderStats(true);
      renderButtons();
      flashCells(hitList);
      S.busy = true;
      later(function () { S.busy = false; renderCells(hitList, true); }, reduced() ? 60 : 420);
      if (S.done) later(finish, reduced() ? 120 : 900);
    }

    function runAll() {
      S.auto = true;
      renderButtons();
      var gap = reduced() ? 200 : 600;
      (function next() {
        if (!S.auto || S.done) return;
        step();
        if (!S.done) later(next, gap);
      })();
    }

    function finish() {
      var a = summary(S.wA), b = summary(S.wB);
      var hitPeople = S.hits.filter(function (h) { return h > 0; }).length;
      var twice = S.hits.filter(function (h) { return h > 1; }).length;
      function row(name, va, vb, badA, badB) {
        return el("tr", null, [
          el("th", { scope: "row", text: name }),
          el("td", { class: "num" + (badA ? " bad" : ""), text: va }),
          el("td", { class: "num" + (badB ? " bad" : ""), text: vb })
        ]);
      }
      var table = el("table", { class: "vl-table" }, [
        el("thead", null, el("tr", null, [
          el("th", { text: "10년 뒤" }),
          el("th", { class: "num", text: "보험 없는 마을" }),
          el("th", { class: "num", text: "보험 있는 마을" })
        ])),
        el("tbody", null, [
          row("평균 재산", won(a.avg), won(b.avg)),
          row("가장 가난한 사람의 재산", won(a.min), won(b.min), a.min <= 0, b.min <= 0),
          row("재산이 0 이하인 사람", a.zero + "명", b.zero + "명", a.zero > 0, b.zero > 0),
          row("공동 주머니 잔액", "없음", won(S.pocket) + (S.pocket < 0 ? " (준비금 부족)" : ""), false, S.pocket < 0)
        ])
      ]);

      result.innerHTML = "";
      result.appendChild(el("h4", { text: "10년이 지났습니다" }));
      result.appendChild(el("p", {
        text: "10년 동안 사고는 모두 " + S.total + "번 일어났습니다. 한 번 이상 사고를 당한 사람은 " + hitPeople + "명입니다." +
          (twice > 0 ? " 그 가운데 " + twice + "명은 두 번 이상 당했습니다." : "")
      }));
      result.appendChild(el("div", { class: "vl-tablewrap" }, table));
      result.appendChild(el("p", {
        text: "보험 있는 마을 사람은 10년 동안 보험료로 100만 원씩 냈습니다. 보험 없는 마을은 사고를 당한 " +
          hitPeople + "명이 " + fmt(S.total * LOSS) + "만 원을 나누지 못하고 떠안았습니다."
      }));
      if (a.avg < b.avg) {
        result.appendChild(el("p", {
          text: "이번에는 사고가 많아서 평균 재산도 보험 없는 마을이 더 적습니다."
        }));
      }
      if (S.shortYears.length) {
        result.appendChild(el("p", {
          class: "vl-short",
          text: "이번에는 사고가 예상보다 많아 " + S.shortYears.join("·") + "년째에 공동 주머니가 모자랐습니다. 보험료를 정할 때 준비금을 넉넉히 두는 이유입니다."
        }));
      } else {
        result.appendChild(el("p", {
          text: "해마다 걷는 보험료 1,000만 원은 예상 사고 3명의 보상 900만 원보다 조금 많습니다. 남는 돈은 운영비와 준비금입니다."
        }));
      }
      result.appendChild(el("div", { class: "gm-lesson" }, [
        el("b", { text: "보험이 있는 마을은 모두가 조금씩 덜 가졌지만 빈털터리가 된 사람이 없습니다." }),
        " 보험은 돈을 불리는 수단이 아니라 감당하기 어려운 손실을 여럿이 나누는 약속입니다."
      ]));
      result.classList.remove("gm-hide");
      ui.replay(result, "is-in");
      setMsg("", "10년이 지났습니다. 아래 표에서 두 마을을 견주어 봅니다.");
    }

    function start() {
      clearTimers();
      S = newState();
      result.classList.add("gm-hide");
      result.innerHTML = "";
      [VA, VB].forEach(function (v) {
        v.cells.forEach(function (cell) { cell.classList.remove("is-hit", "is-heal", "is-broke", "is-debt"); });
      });
      setMsg("", "목표: 두 마을에서 10년을 보내고, 누가 얼마나 가졌는지 견주어 봅니다. 해마다 100명 가운데 3명꼴로 300만 원짜리 사고가 납니다.");
      renderCells(null, false);
      renderStats(false);
      renderButtons();
    }

    start();
  };
})();
