(function () {
  var Games = (window.EcoGames = window.EcoGames || {});
  var NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (k === "text") n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (k) { n.appendChild(k); });
    return n;
  }
  function tween(ms, fn, done) {
    var start = null;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { fn(1); if (done) done(); return; }
    function step(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / ms);
      fn(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(step); else if (done) done();
    }
    requestAnimationFrame(step);
  }

  /* ───────── 두 도시 ───────── */
  Games.cities = function (root, ui) {
    var el = ui.el;
    var body = ui.frame(root, { badge: "시뮬레이션", title: "돈이 풀리면, 두 도시는", sub: "두 도시에 똑같이 사람이 몰립니다. 다른 것은 집을 더 지을 수 있느냐뿐입니다." });
    var YEARS = 8;
    var s;

    var moneyVal = el("b");
    var yearVal = el("b");
    var stats = el("div", { class: "gm-stats" }, [
      el("div", { class: "gm-stat" }, [el("span", { text: "지난 햇수" }), yearVal]),
      el("div", { class: "gm-stat blue" }, [el("span", { text: "풀린 돈 (처음 = 100)" }), moneyVal])
    ]);

    function cityPanel(name, cap) {
      var price = el("b", { class: "price" });
      var bar = el("div", { class: "pbar" });
      var houses = el("div", { class: "houses" });
      var count = el("span", { class: "hcount" });
      var node = el("div", { class: "city" }, [
        el("div", { class: "cname" }, [el("strong", { text: name }), el("span", { text: cap })]),
        el("div", { class: "cmain" }, [
          el("div", { class: "pwrap" }, [el("div", { class: "ptrack" }, [bar]), el("div", { class: "plabel" }, [el("span", { text: "집값" }), price])]),
          el("div", { class: "hwrap" }, [houses, count])
        ])
      ]);
      return { node: node, price: price, bar: bar, houses: houses, count: count, shown: 0 };
    }
    var A = cityPanel("서울", "새집을 지을 땅이 거의 없습니다");
    var B = cityPanel("인천·부천", "새집을 지을 땅이 계속 나옵니다");
    var panels = el("div", { class: "panels" }, [A.node, B.node]);

    var msg = el("div", { class: "gm-msg" });
    var go = el("button", { class: "gm-btn primary lg", text: "1년 보내기", onclick: step });
    var all = el("button", { class: "gm-btn", text: "8년 한 번에", onclick: runAll });
    var again = el("button", { class: "gm-btn ghost", text: "다시 하기", onclick: reset });
    var result = el("div", { class: "gm-result gm-hide" });
    body.appendChild(stats);
    body.appendChild(panels);
    body.appendChild(msg);
    body.appendChild(el("div", { class: "gm-row" }, [go, all, again]));
    body.appendChild(result);
    var timer = null;

    function drawHouses(p, n) {
      n = Math.round(n);
      while (p.shown < n) { var h = el("i", { class: "is-pop", text: "🏠" }); p.houses.appendChild(h); p.shown++; }
      while (p.shown > n) { p.houses.lastChild.remove(); p.shown--; }
      p.count.textContent = n + "채";
    }
    function render() {
      ui.countUp(yearVal, s.year, 0, function (v) { return Math.round(v) + " / " + YEARS + "년"; });
      ui.countUp(moneyVal, s.money, 500);
      [[A, s.pa, s.ha], [B, s.pb, s.hb]].forEach(function (x) {
        ui.countUp(x[0].price, x[1], 600);
        x[0].bar.style.height = Math.min(100, x[1] / 3) + "%";
        x[0].bar.classList.toggle("hot", x[1] >= 180);
        drawHouses(x[0], x[2]);
      });
    }
    function reset() {
      clearInterval(timer); timer = null;
      s = { year: 0, money: 100, demand: 100, ha: 20, hb: 20, pa: 100, pb: 100 };
      A.houses.innerHTML = ""; B.houses.innerHTML = ""; A.shown = 0; B.shown = 0;
      go.disabled = false; all.disabled = false;
      result.classList.add("gm-hide");
      msg.className = "gm-msg";
      msg.textContent = "해마다 돈이 10% 더 풀리고, 두 도시에 살려는 사람이 똑같이 3%씩 늘어납니다.";
      render();
    }
    function step() {
      if (s.year >= YEARS) return;
      s.year += 1;
      s.money *= 1.1;
      var before = s.demand;
      s.demand *= 1.1 * 1.03;
      var growth = s.demand / before - 1;
      if (s.year === 4 || s.year === 8) s.ha += 1;
      s.hb *= 1 + growth * 0.8;
      s.pa = s.demand / (s.ha / 20);
      s.pb = s.demand / (s.hb / 20);
      render();
      msg.className = "gm-msg";
      if (s.year === 4 || s.year === 8) msg.textContent = s.year + "년째: 서울은 헌 집을 헐고 겨우 한 채를 더 지었습니다. 인천·부천은 올해도 새 아파트가 들어섰습니다.";
      else msg.textContent = s.year + "년째: 서울은 집이 그대로라 값이 올랐습니다. 인천·부천은 집이 늘어 값이 조금만 올랐습니다.";
      if (s.year >= YEARS) finish();
    }
    function runAll() {
      if (timer) return;
      all.disabled = true; go.disabled = true;
      timer = setInterval(function () { step(); if (s.year >= YEARS) { clearInterval(timer); timer = null; } }, 650);
    }
    function finish() {
      go.disabled = true; all.disabled = true;
      result.innerHTML = "";
      result.appendChild(el("h4", { text: "8년 뒤" }));
      result.appendChild(el("div", { class: "cmp" }, [
        cmpRow("풀린 돈", s.money, "var(--blue)"),
        cmpRow("서울 집값", s.pa, "var(--red)"),
        cmpRow("인천·부천 집값", s.pb, "var(--green)")
      ]));
      result.appendChild(el("p", { class: "gm-lesson", html: "두 도시에 몰린 사람은 똑같았습니다. 서울은 집을 늘리지 못해 <b>풀린 돈보다 값이 더 올랐고</b>, 인천·부천은 집이 두 배 넘게 늘어 <b>풀린 돈만큼도 오르지 않았습니다.</b> 값을 올리는 것은 수요만이 아니라 희소성입니다." }));
      result.classList.remove("gm-hide");
    }
    function cmpRow(label, v, color) {
      var fill = el("div", { class: "cfill", style: { background: color, width: "0%" } });
      setTimeout(function () { fill.style.width = Math.min(100, v / 2.8) + "%"; }, 60);
      return el("div", { class: "crow" }, [el("span", { text: label }), el("div", { class: "ctrack" }, [fill]), el("b", { text: ui.fmt(v) })]);
    }
    reset();
  };

  /* ───────── 가격 실험실 ───────── */
  Games.sd = function (root, ui) {
    var el = ui.el;
    var body = ui.frame(root, { badge: "체험", title: "가격 실험실", sub: "단추를 눌러 수요와 공급을 움직이면 균형이 따라 움직입니다." });
    var W = 460, H = 320, X0 = 56, Y0 = 270, SX = 32, SY = 15;
    var cur = { a: 12, b: 2 }, base = { a: 12, b: 2 };
    function X(q) { return X0 + SX * q; }
    function Y(p) { return Y0 - SY * p; }
    function dLine(a) { var q0 = Math.max(0, a - 16), q1 = Math.min(12, a); return [X(q0), Y(a - q0), X(q1), Y(a - q1)]; }
    function sLine(b) { var q0 = Math.max(0, -b), q1 = Math.min(12, 16 - b); return [X(q0), Y(b + q0), X(q1), Y(b + q1)]; }

    var gD0 = svg("line", { stroke: "#b9dcff", "stroke-width": 3, "stroke-dasharray": "6 6" });
    var gS0 = svg("line", { stroke: "#bfe8cd", "stroke-width": 3, "stroke-dasharray": "6 6" });
    var lD = svg("line", { stroke: "#008cff", "stroke-width": 5, "stroke-linecap": "round" });
    var lS = svg("line", { stroke: "#16a34a", "stroke-width": 5, "stroke-linecap": "round" });
    var hx = svg("line", { stroke: "#8b94a1", "stroke-dasharray": "5 5" });
    var hy = svg("line", { stroke: "#8b94a1", "stroke-dasharray": "5 5" });
    var dot0 = svg("circle", { r: 6, fill: "#fff", stroke: "#b6bdc7", "stroke-width": 2 });
    var dot = svg("circle", { r: 9, fill: "#fff", stroke: "#1a1d21", "stroke-width": 3.5 });
    var tD = svg("text", { "font-size": 16, "font-weight": 700, fill: "#008cff", text: "수요" });
    var tS = svg("text", { "font-size": 16, "font-weight": 700, fill: "#16a34a", text: "공급" });
    var chart = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "수요와 공급 곡선" }, [
      svg("line", { x1: X0, y1: Y0, x2: W - 10, y2: Y0, stroke: "#1a1d21", "stroke-width": 2 }),
      svg("line", { x1: X0, y1: Y0, x2: X0, y2: 18, stroke: "#1a1d21", "stroke-width": 2 }),
      svg("text", { x: W - 12, y: Y0 + 26, "text-anchor": "end", "font-size": 14, fill: "#5b6470", text: "수량" }),
      svg("text", { x: X0 - 8, y: 16, "text-anchor": "end", "font-size": 14, fill: "#5b6470", text: "가격" }),
      gD0, gS0, hx, hy, lD, lS, tD, tS, dot0, dot
    ]);
    function setLine(n, c) { n.setAttribute("x1", c[0]); n.setAttribute("y1", c[1]); n.setAttribute("x2", c[2]); n.setAttribute("y2", c[3]); }
    function draw(a, b) {
      var d = dLine(a), s = sLine(b);
      setLine(lD, d); setLine(lS, s);
      tD.setAttribute("x", d[2] - 4); tD.setAttribute("y", d[3] - 10); tD.setAttribute("text-anchor", "end");
      tS.setAttribute("x", s[2] - 4); tS.setAttribute("y", s[3] + 22); tS.setAttribute("text-anchor", "end");
      var q = (a - b) / 2, p = (a + b) / 2;
      dot.setAttribute("cx", X(q)); dot.setAttribute("cy", Y(p));
      setLine(hx, [X0, Y(p), X(q), Y(p)]); setLine(hy, [X(q), Y0, X(q), Y(p)]);
    }
    setLine(gD0, dLine(base.a)); setLine(gS0, sLine(base.b));
    dot0.setAttribute("cx", X(5)); dot0.setAttribute("cy", Y(7));

    var priceB = el("b"), qtyB = el("b");
    var story = el("div", { class: "gm-msg" });
    var cases = {
      dUp: { a: 15, b: 2, t: "빵집이 방송에 나왔습니다. 사려는 사람이 늘어 수요 곡선이 오른쪽으로 갑니다." },
      dDown: { a: 9, b: 2, t: "유행이 지났습니다. 사려는 사람이 줄어 수요 곡선이 왼쪽으로 갑니다." },
      sUp: { a: 12, b: -1, t: "같은 빵을 파는 가게가 늘었습니다. 공급 곡선이 오른쪽으로 갑니다." },
      sDown: { a: 12, b: 5, t: "밀가루값이 올랐습니다. 만드는 양이 줄어 공급 곡선이 왼쪽으로 갑니다." },
      reset: { a: 12, b: 2, t: "처음 균형입니다. 가격 7, 거래량 5." }
    };
    function word(v, b0, up, down) { return v > b0 ? up : v < b0 ? down : "그대로"; }
    function go(key) {
      var from = { a: cur.a, b: cur.b }, to = cases[key];
      tween(520, function (e) { draw(from.a + (to.a - from.a) * e, from.b + (to.b - from.b) * e); });
      cur = { a: to.a, b: to.b };
      var q = (to.a - to.b) / 2, p = (to.a + to.b) / 2;
      priceB.textContent = p + "  (" + word(p, 7, "올랐습니다", "내렸습니다") + ")";
      qtyB.textContent = q + "  (" + word(q, 5, "늘었습니다", "줄었습니다") + ")";
      priceB.parentNode.className = "gm-stat " + (p > 7 ? "red" : p < 7 ? "blue" : "");
      story.textContent = to.t;
      btns.forEach(function (b) { b.classList.toggle("primary", b.getAttribute("data-k") === key && key !== "reset"); });
    }
    var btns = [["dUp", "수요 증가"], ["dDown", "수요 감소"], ["sUp", "공급 증가"], ["sDown", "공급 감소"], ["reset", "처음으로"]].map(function (x) {
      return el("button", { class: "gm-btn" + (x[0] === "reset" ? " ghost" : ""), "data-k": x[0], text: x[1], onclick: function () { go(x[0]); } });
    });
    body.appendChild(el("div", { class: "lab" }, [
      el("div", { class: "chart" }, [chart]),
      el("div", { class: "ctl" }, [
        el("div", { class: "gm-row" }, btns),
        el("div", { class: "gm-stats" }, [
          el("div", { class: "gm-stat" }, [el("span", { text: "균형가격" }), priceB]),
          el("div", { class: "gm-stat" }, [el("span", { text: "균형거래량" }), qtyB])
        ]),
        story
      ])
    ]));
    draw(12, 2); go("reset");
  };

  /* ───────── 복리 계산기 ───────── */
  Games.compound = function (root, ui) {
    var el = ui.el;
    var body = ui.frame(root, { badge: "체험", title: "복리 계산기", sub: "원금, 금리, 기간을 바꾸면 단리와 복리의 차이가 그려집니다." });
    var W = 560, H = 300, X0 = 60, Y0 = 258, CW = 480, CH = 230;
    var st = { p: 100, r: 5, n: 30 };
    function field(label, key, min, max, step, unit) {
      var out = el("output");
      var input = el("input", { type: "range", class: "gm-range", min: min, max: max, step: step, value: st[key] });
      input.addEventListener("input", function () { st[key] = Number(input.value); out.textContent = ui.fmt(st[key]) + unit; draw(); });
      out.textContent = ui.fmt(st[key]) + unit;
      return el("label", { class: "gm-field" }, [el("div", { class: "gm-row" }, [el("span", { class: "gm-label", text: label }), out]), input]);
    }
    var area = svg("path", { fill: "#e8f4ff" });
    var lineC = svg("path", { fill: "none", stroke: "#008cff", "stroke-width": 4, "stroke-linejoin": "round" });
    var lineS = svg("path", { fill: "none", stroke: "#8b94a1", "stroke-width": 3, "stroke-dasharray": "7 6" });
    var dbl = svg("line", { stroke: "#f59e0b", "stroke-width": 2, "stroke-dasharray": "4 4" });
    var dblT = svg("text", { "font-size": 13, "font-weight": 700, fill: "#b45309", "text-anchor": "middle" });
    var yT = svg("text", { x: X0 - 8, y: 30, "text-anchor": "end", "font-size": 13, fill: "#5b6470" });
    var xT = svg("text", { x: X0 + CW, y: Y0 + 24, "text-anchor": "end", "font-size": 13, fill: "#5b6470" });
    var endC = svg("circle", { r: 6, fill: "#008cff" }), endS = svg("circle", { r: 5, fill: "#8b94a1" });
    var chart = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "단리와 복리 비교 그래프" }, [
      svg("line", { x1: X0, y1: Y0, x2: X0 + CW, y2: Y0, stroke: "#1a1d21", "stroke-width": 2 }),
      svg("line", { x1: X0, y1: Y0, x2: X0, y2: 20, stroke: "#1a1d21", "stroke-width": 2 }),
      area, dbl, dblT, lineS, lineC, endS, endC, yT, xT,
      svg("text", { x: X0 - 8, y: Y0 + 4, "text-anchor": "end", "font-size": 13, fill: "#5b6470", text: "0" })
    ]);
    var vS = el("b"), vC = el("b"), vD = el("b"), vT = el("b");
    function draw() {
      var p = st.p, r = st.r / 100, n = st.n;
      var fc = p * Math.pow(1 + r, n), fs = p * (1 + r * n);
      var top = fc * 1.08;
      function px(t) { return X0 + (CW * t) / n; }
      function py(v) { return Y0 - (CH * v) / top; }
      var dc = "", ds = "";
      for (var t = 0; t <= n; t++) {
        dc += (t ? "L" : "M") + px(t).toFixed(1) + " " + py(p * Math.pow(1 + r, t)).toFixed(1);
        ds += (t ? "L" : "M") + px(t).toFixed(1) + " " + py(p * (1 + r * t)).toFixed(1);
      }
      lineC.setAttribute("d", dc); lineS.setAttribute("d", ds);
      area.setAttribute("d", dc + "L" + px(n) + " " + py(fs).toFixed(1) + ds.replace(/M/, "L").split("L").slice(1).reverse().map(function (s) { return "L" + s; }).join("") + "Z");
      endC.setAttribute("cx", px(n)); endC.setAttribute("cy", py(fc));
      endS.setAttribute("cx", px(n)); endS.setAttribute("cy", py(fs));
      yT.textContent = ui.fmt(top) + "만";
      xT.textContent = n + "년";
      var td = Math.log(2) / Math.log(1 + r);
      if (td <= n) {
        dbl.setAttribute("x1", px(td)); dbl.setAttribute("x2", px(td)); dbl.setAttribute("y1", Y0); dbl.setAttribute("y2", py(2 * p));
        dblT.setAttribute("x", px(td)); dblT.setAttribute("y", py(2 * p) - 8); dblT.textContent = "두 배 " + td.toFixed(1) + "년";
        dbl.style.display = ""; dblT.style.display = "";
      } else { dbl.style.display = "none"; dblT.style.display = "none"; }
      vS.textContent = ui.fmt(fs) + "만 원"; vC.textContent = ui.fmt(fc) + "만 원"; vD.textContent = ui.fmt(fc - fs) + "만 원";
      vT.textContent = td.toFixed(1) + "년";
    }
    body.appendChild(el("div", { class: "fields" }, [
      field("원금", "p", 100, 1000, 100, "만 원"), field("연 금리", "r", 1, 10, 1, "%"), field("기간", "n", 5, 40, 5, "년")
    ]));
    body.appendChild(el("div", { class: "chart" }, [chart]));
    body.appendChild(el("div", { class: "gm-stats" }, [
      el("div", { class: "gm-stat" }, [el("span", { text: "단리로 불어난 돈" }), vS]),
      el("div", { class: "gm-stat blue" }, [el("span", { text: "복리로 불어난 돈" }), vC]),
      el("div", { class: "gm-stat green" }, [el("span", { text: "이자가 낳은 이자" }), vD]),
      el("div", { class: "gm-stat" }, [el("span", { text: "두 배가 되는 데" }), vT])
    ]));
    draw();
  };

  /* ───────── 대출 계산기 ───────── */
  Games.loan = function (root, ui) {
    var el = ui.el;
    var body = ui.frame(root, { badge: "체험", title: "빌리면 얼마를 갚을까", sub: "매달 같은 금액을 갚는다고 할 때, 금리와 기간에 따라 이자가 달라집니다." });
    var st = { p: 1000, r: 5, y: 3 };
    var bars = el("div", { class: "lbars" });
    var vM = el("b"), vI = el("b"), vT = el("b");
    function pay(p, r, y) { var m = r / 1200, n = y * 12; var a = (p * m) / (1 - Math.pow(1 + m, -n)); return { month: a, total: a * n, interest: a * n - p }; }
    function field(label, key, min, max, step, unit) {
      var out = el("output");
      var input = el("input", { type: "range", class: "gm-range", min: min, max: max, step: step, value: st[key] });
      function sync() { out.textContent = ui.fmt(st[key]) + unit; }
      input.addEventListener("input", function () { st[key] = Number(input.value); sync(); draw(); });
      sync();
      return { node: el("label", { class: "gm-field" }, [el("div", { class: "gm-row" }, [el("span", { class: "gm-label", text: label }), out]), input]), input: input, sync: sync };
    }
    var fP = field("빌린 돈", "p", 100, 3000, 100, "만 원"), fR = field("연 금리", "r", 3, 20, 1, "%"), fY = field("갚는 기간", "y", 1, 5, 1, "년");
    function draw() {
      var me = pay(st.p, st.r, st.y);
      vM.textContent = ui.fmt(me.month * 10000) + "원";
      vI.textContent = ui.fmt(me.interest) + "만 원";
      vT.textContent = ui.fmt(me.total) + "만 원";
      var rows = [["지금 고른 조건 · 연 " + st.r + "%", st.r, true], ["은행 대출 · 연 5%", 5], ["카드 대출 · 연 14%", 14], ["법으로 정한 최고 금리 · 연 20%", 20]];
      var max = pay(st.p, 20, st.y).total;
      bars.innerHTML = "";
      rows.forEach(function (rw) {
        var x = pay(st.p, rw[1], st.y);
        var prin = el("i", { class: "prin", style: { width: (st.p / max) * 100 + "%" } });
        var intr = el("i", { class: "intr", style: { width: (x.interest / max) * 100 + "%" } });
        bars.appendChild(el("div", { class: "lrow" + (rw[2] ? " me" : "") }, [
          el("span", { class: "lname", text: rw[0] }),
          el("div", { class: "ltrack" }, [prin, intr]),
          el("b", { text: "이자 " + ui.fmt(x.interest) + "만" })
        ]));
      });
    }
    body.appendChild(el("div", { class: "fields" }, [fP.node, fR.node, fY.node]));
    body.appendChild(el("div", { class: "gm-stats" }, [
      el("div", { class: "gm-stat blue" }, [el("span", { text: "매달 갚는 돈" }), vM]),
      el("div", { class: "gm-stat red" }, [el("span", { text: "이자 합계" }), vI]),
      el("div", { class: "gm-stat" }, [el("span", { text: "갚는 돈 전체" }), vT])
    ]));
    body.appendChild(el("div", { class: "legend" }, [el("span", null, [el("i", { class: "prin" }), "원금"]), el("span", null, [el("i", { class: "intr" }), "이자"])]));
    body.appendChild(bars);
    body.appendChild(el("p", { class: "gm-lesson", html: "같은 돈을 빌려도 <b>금리가 높을수록, 기간이 길수록</b> 이자가 커집니다. 신용이 낮으면 높은 금리로 빌려야 하므로 같은 물건을 더 비싸게 사는 셈입니다." }));
    draw();
  };

  /* ───────── 학급 경제 시뮬레이터 ───────── */
  Games.classroom = function (root, ui) {
    var el = ui.el;
    var body = ui.frame(root, { badge: "시뮬레이션", title: "학급 경제 시뮬레이터", sub: "발행하고, 지급하고, 장을 열고, 세금을 걷어 봅니다. 간식은 하루 30개뿐입니다." });
    var NAMES = ["하늘", "바다", "별이", "구름", "나무", "햇살"];
    var GOODS = 30, BASE = 10;
    var s, rand;

    var vVault = el("b", { class: "big" }), vM = el("b"), vH = el("b");
    var hero = el("div", { class: "hero" }, [
      el("div", null, [el("span", { text: "학급 금고" }), vVault]),
      el("div", { class: "pairs" }, [el("div", null, [el("span", { text: "현재 통화량" }), vM]), el("div", null, [el("span", { text: "학생 보유" }), vH])])
    ]);
    var list = el("div", { class: "students" });
    var rows = NAMES.map(function (n) {
      var b = el("b");
      var row = el("div", { class: "srow" }, [el("span", { class: "av", text: n.charAt(0) }), el("span", { class: "nm", text: n }), b]);
      list.appendChild(row);
      return { row: row, b: b };
    });
    var vPrice = el("b", { class: "pv" }), vDay = el("span", { class: "day" });
    var spark = svg("polyline", { fill: "none", stroke: "#008cff", "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" });
    var baseLine = svg("line", { x1: 0, x2: 240, stroke: "#c9d3df", "stroke-dasharray": "4 4" });
    var sparkSvg = svg("svg", { viewBox: "0 0 240 70", role: "img", "aria-label": "간식값 변화" }, [baseLine, spark]);
    var shelf = el("div", { class: "shelf" });
    var marketCard = el("div", { class: "market" }, [
      el("div", { class: "mhead" }, [el("strong", { text: "클래스 마켓" }), vDay]),
      shelf,
      el("div", { class: "mprice" }, [el("span", { text: "간식 한 개 값" }), vPrice]),
      sparkSvg
    ]);
    var log = el("div", { class: "gm-log" });
    var msg = el("div", { class: "gm-msg" });
    var missions = [
      ["금고에 코인을 발행합니다", function () { return s.issued > 0; }],
      ["학생 모두에게 지급합니다", function () { return s.paid > 0; }],
      ["장을 열어 간식값을 확인합니다", function () { return s.day > 0; }],
      ["코인을 더 풀어 간식값을 20코인 위로 올립니다", function () { return s.maxPrice >= 20; }],
      ["세금과 소각으로 간식값을 12코인 아래로 되돌립니다", function () { return s.maxPrice >= 20 && s.price < 12 && s.burned > 0; }]
    ];
    var mlist = el("ol", { class: "missions" });
    var mnodes = missions.map(function (m) { var li = el("li", { text: m[0] }); mlist.appendChild(li); return li; });
    var result = el("div", { class: "gm-result gm-hide" });

    function btn(label, cls, fn) { return el("button", { class: "gm-btn " + cls, text: label, onclick: fn }); }
    var bIssue = btn("발행 +600", "primary", function () { s.vault += 600; s.issued += 600; add("발행", "+600", "금고"); pulse(hero); after("금고에 600코인이 생겼습니다. 아직 학생에게는 한 푼도 없습니다."); });
    var bPay = btn("전체 지급 100씩", "", function () {
      if (s.vault < 600) { ui.replay(hero, "is-shake"); return after("금고에 코인이 모자랍니다. 먼저 발행합니다.", "warn"); }
      s.vault -= 600; s.paid += 600; s.bal = s.bal.map(function (b) { return b + 100; });
      add("주간 용돈 · 6명", "−600", "금고 → 학생"); flash("+100"); after("학생마다 100코인을 받았습니다. 통화량은 그대로이고 금고에서 학생으로 옮겨 갔습니다.");
    });
    var bDay = btn("장 열기 (하루)", "green", openMarket);
    var bTax = btn("세금 걷기 20%", "", function () {
      var total = 0;
      s.bal = s.bal.map(function (b) { var t = Math.floor(b * 0.2); total += t; return b - t; });
      if (!total) return after("걷을 코인이 없습니다.", "warn");
      s.vault += total; s.taxed += total; add("정기 세금 (잔액의 20%)", "+" + total, "학생 → 금고"); flash("−20%", true); pulse(hero);
      after("학생 잔액에서 " + ui.fmt(total) + "코인을 걷어 금고에 모았습니다. 다시 지급하면 돌아가고, 소각하면 사라집니다.");
    });
    var bBurn = btn("금고 코인 소각", "red", function () {
      if (s.vault <= 0) return after("금고에 소각할 코인이 없습니다.", "warn");
      var v = s.vault; s.vault = 0; s.burned += v; add("소각", "−" + v, "금고"); ui.replay(hero, "is-shake");
      after(ui.fmt(v) + "코인을 없앴습니다. 통화량이 그만큼 줄었습니다.");
    });
    var bAgain = btn("다시 하기", "ghost", reset);

    function add(what, amt, where) {
      var row = el("div", null, [el("span", { text: what + " · " + where }), el("b", { text: amt })]);
      log.insertBefore(row, log.firstChild);
      while (log.children.length > 30) log.lastChild.remove();
    }
    function pulse(n) { ui.replay(n, "is-pop"); }
    function flash(text, minus) {
      rows.forEach(function (r, i) { setTimeout(function () { ui.floatText(r.row, text, r.row.clientWidth - 90, 4, minus); }, i * 60); });
    }
    function holdings() { return s.bal.reduce(function (a, b) { return a + b; }, 0); }
    function priceNow() { var spend = s.bal.reduce(function (a, b) { return a + Math.floor(b / 2); }, 0); return Math.max(BASE, spend / GOODS); }
    function openMarket() {
      var H0 = holdings();
      if (!H0) return after("학생에게 코인이 없어 아무도 사지 못했습니다.", "warn");
      var spends = s.bal.map(function (b) { return Math.floor(b / 2); });
      var S = spends.reduce(function (a, b) { return a + b; }, 0);
      var price = Math.max(BASE, S / GOODS);
      var sold = Math.min(GOODS, Math.floor(S / price + 1e-9));
      var paid = Math.round(sold * price);
      var ratio = S ? paid / S : 0;
      var spentEach = spends.map(function (x) { return Math.round(x * ratio); });
      var pot = spentEach.reduce(function (a, b) { return a + b; }, 0);
      // 간식을 판 것도 학생이므로 받은 돈은 학생들에게 돌아간다 (파는 몫은 그날그날 다르다)
      var w = NAMES.map(function () { return 0.6 + rand() * 0.8; });
      var ws = w.reduce(function (a, b) { return a + b; }, 0);
      var gain = w.map(function (x) { return Math.floor((pot * x) / ws); });
      gain[0] += pot - gain.reduce(function (a, b) { return a + b; }, 0);
      s.bal = s.bal.map(function (b, i) { return b - spentEach[i] + gain[i]; });
      s.day += 1; s.price = price; s.maxPrice = Math.max(s.maxPrice, price); s.hist.push(price);
      add(s.day + "일째 장 · 간식 " + sold + "개", ui.fmt(pot), "학생 ↔ 학생");
      shelf.innerHTML = "";
      for (var i = 0; i < GOODS; i++) shelf.appendChild(el("i", { class: i < sold ? "sold" : "", text: "🍪" }));
      var t = price <= BASE + 0.01 ? (sold >= GOODS ? "간식값은 10코인입니다. 30개가 모두 팔렸습니다." : "간식값은 10코인입니다. 코인이 적어 " + (GOODS - sold) + "개가 남았습니다.")
        : "사려는 코인이 간식보다 많아 값이 " + price.toFixed(1) + "코인으로 올랐습니다. 간식은 여전히 30개입니다.";
      after(t, price >= 20 ? "bad" : price > BASE + 0.01 ? "warn" : "good");
    }
    function after(text, kind) {
      msg.className = "gm-msg" + (kind ? " " + kind : "");
      msg.textContent = text;
      render();
    }
    function render() {
      var H = holdings();
      ui.countUp(vVault, s.vault, 450);
      ui.countUp(vM, s.vault + H, 450);
      ui.countUp(vH, H, 450);
      rows.forEach(function (r, i) { ui.countUp(r.b, s.bal[i], 450); });
      vDay.textContent = s.day ? s.day + "일째" : "아직 열지 않음";
      vPrice.textContent = s.day ? s.price.toFixed(1) + " 코인" : "10.0 코인";
      vPrice.className = "pv" + (s.price >= 20 ? " hot" : s.price > BASE + 0.01 ? " warm" : "");
      var pts = s.hist.slice(-16), top = Math.max(30, Math.max.apply(null, pts.concat([BASE])) * 1.1);
      spark.setAttribute("points", pts.map(function (p, i) { return (pts.length > 1 ? (240 * i) / (pts.length - 1) : 0).toFixed(1) + "," + (66 - (62 * p) / top).toFixed(1); }).join(" "));
      baseLine.setAttribute("y1", 66 - (62 * BASE) / top); baseLine.setAttribute("y2", 66 - (62 * BASE) / top);
      var done = 0;
      missions.forEach(function (m, i) { var ok = m[1](); if (ok) done++; if (ok && !mnodes[i].classList.contains("ok")) ui.replay(mnodes[i], "is-pop"); mnodes[i].classList.toggle("ok", ok); });
      if (done === missions.length && !s.finished) finish();
    }
    function finish() {
      s.finished = true;
      result.innerHTML = "";
      result.appendChild(el("h4", { text: "다섯 가지를 모두 해냈습니다" }));
      result.appendChild(el("div", { class: "gm-stats" }, [
        el("div", { class: "gm-stat" }, [el("span", { text: "발행한 코인" }), el("b", { text: ui.fmt(s.issued) })]),
        el("div", { class: "gm-stat red" }, [el("span", { text: "가장 비쌌던 간식값" }), el("b", { text: s.maxPrice.toFixed(1) })]),
        el("div", { class: "gm-stat" }, [el("span", { text: "걷은 세금" }), el("b", { text: ui.fmt(s.taxed) })]),
        el("div", { class: "gm-stat" }, [el("span", { text: "소각한 코인" }), el("b", { text: ui.fmt(s.burned) })])
      ]));
      result.appendChild(el("p", { class: "gm-lesson", html: "코인을 더 줄수록 학생들은 부자가 된 것 같았지만 <b>간식은 30개뿐</b>이어서 값만 올랐습니다. 세금으로 거두고 소각해 <b>통화량을 줄이자</b> 값이 내려갔습니다. 네오뱅크의 발행, 지급, 세금 걷기, 소각이 바로 이 단추들입니다." }));
      result.classList.remove("gm-hide");
    }
    function reset() {
      rand = ui.rng(Date.now());
      s = { vault: 0, bal: NAMES.map(function () { return 0; }), day: 0, price: BASE, maxPrice: BASE, hist: [BASE], issued: 0, paid: 0, taxed: 0, burned: 0, finished: false };
      log.innerHTML = ""; shelf.innerHTML = "";
      for (var i = 0; i < GOODS; i++) shelf.appendChild(el("i", { text: "🍪" }));
      result.classList.add("gm-hide");
      after("금고가 비어 있습니다. 먼저 코인을 발행합니다.");
    }

    body.appendChild(el("div", { class: "top" }, [hero, mlist]));
    body.appendChild(el("div", { class: "gm-row" }, [bIssue, bPay, bDay, bTax, bBurn, bAgain]));
    body.appendChild(msg);
    body.appendChild(el("div", { class: "cols" }, [
      el("div", { class: "col" }, [el("div", { class: "ctitle", text: "학생 6명" }), list]),
      el("div", { class: "col" }, [marketCard]),
      el("div", { class: "col" }, [el("div", { class: "ctitle", text: "거래 내역" }), log])
    ]));
    body.appendChild(result);
    reset();
  };

  /* 백 명의 점 인포그래픽 채우기 */
  document.querySelectorAll(".dots100").forEach(function (box) {
    var hit = Number(box.getAttribute("data-hit"));
    for (var i = 0; i < 100; i++) {
      var d = document.createElement("i");
      d.style.setProperty("--i", i);
      if (i === hit) d.className = "hit";
      box.appendChild(d);
    }
  });
})();
