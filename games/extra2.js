(function () {
  var Games = (window.EcoGames = window.EcoGames || {});
  var NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (k === "text") n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (k) { n.appendChild(k); });
    return n;
  }

  /* ───────── 예금과 적금 이자 ───────── */
  Games.savings = function (root, ui) {
    var el = ui.el;
    var body = ui.frame(root, { badge: "체험", title: "예금과 적금, 이자 견주기", sub: "같은 금리로 1년 동안 같은 돈을 넣어도 이자는 절반쯤 차이 납니다." });
    var st = { r: 5, m: 10 };
    function field(label, key, min, max, step, unit) {
      var out = el("output");
      var input = el("input", { type: "range", class: "gm-range", min: min, max: max, step: step, value: st[key] });
      input.addEventListener("input", function () { st[key] = Number(input.value); out.textContent = st[key] + unit; draw(); });
      out.textContent = st[key] + unit;
      return el("label", { class: "gm-field" }, [el("div", { class: "gm-row" }, [el("span", { class: "gm-label", text: label }), out]), input]);
    }
    function blocks(kind) {
      var wrap = el("div", { class: "blk " + kind });
      for (var c = 0; c < 12; c++) {
        var months = kind === "dep" ? 12 : 12 - c;
        var col = el("div", { class: "col" });
        col.appendChild(el("i", { style: { height: (months / 12) * 100 + "%", animationDelay: c * 50 + "ms" } }));
        col.appendChild(el("small", { text: c + 1 + "월" }));
        wrap.appendChild(col);
      }
      return wrap;
    }
    var dPrin = el("b"), dInt = el("b"), dNet = el("b"), sPrin = el("b"), sInt = el("b"), sNet = el("b");
    var ratio = el("div", { class: "gm-msg" });
    function draw() {
      var m = st.m * 10000, r = st.r / 100;
      var prin = m * 12;
      var di = prin * r, si = (m * r * 78) / 12;
      dPrin.textContent = ui.fmt(prin) + "원"; sPrin.textContent = ui.fmt(prin) + "원";
      dInt.textContent = ui.fmt(di) + "원"; sInt.textContent = ui.fmt(si) + "원";
      dNet.textContent = ui.fmt(di * 0.846) + "원"; sNet.textContent = ui.fmt(si * 0.846) + "원";
      ratio.textContent = "적금 이자는 예금 이자의 " + Math.round((si / di) * 100) + "%입니다. 원금에 견주면 연 " + ((si / prin) * 100).toFixed(2) + "%를 받은 셈입니다.";
    }
    function side(title, cap, kind, a, b, c) {
      return el("div", { class: "side2" }, [
        el("strong", { text: title }), el("span", { class: "cap2", text: cap }), blocks(kind),
        el("div", { class: "gm-stats" }, [
          el("div", { class: "gm-stat" }, [el("span", { text: "넣은 돈" }), a]),
          el("div", { class: "gm-stat blue" }, [el("span", { text: "이자" }), b]),
          el("div", { class: "gm-stat green" }, [el("span", { text: "세금 떼고 받는 이자" }), c])
        ])
      ]);
    }
    body.appendChild(el("div", { class: "fields" }, [field("연 금리", "r", 1, 8, 1, "%"), field("한 달에 넣는 돈", "m", 10, 100, 10, "만 원")]));
    body.appendChild(el("div", { class: "two" }, [
      side("정기예금", "열두 달 치를 첫 달에 한 번에 맡깁니다", "dep", dPrin, dInt, dNet),
      side("정기적금", "매달 한 번씩 나누어 넣습니다", "sav", sPrin, sInt, sNet)
    ]));
    body.appendChild(ratio);
    body.appendChild(el("p", { class: "gm-lesson", html: "막대의 높이는 그 달에 넣은 돈이 <b>이자를 받는 기간</b>입니다. 적금은 늦게 넣은 돈일수록 이자를 받는 기간이 짧습니다. 적금 금리가 높아 보여도 실제로 받는 이자는 그 절반쯤입니다." }));
    draw();
  };

  /* ───────── 소문과 주가 ───────── */
  Games.theme = function (root, ui) {
    var el = ui.el;
    var body = ui.frame(root, { badge: "시뮬레이션", title: "소문과 주가", sub: "30일 동안 100만 원을 현금, 우량주, 테마주 사이에서 옮깁니다. 언제 사고 언제 팔지 정합니다." });
    var DAYS = 30, W = 620, H = 300, X0 = 46, Y0 = 262, CW = 560, CH = 232;
    var s, timer = null;

    var lineB = svg("polyline", { fill: "none", stroke: "#008cff", "stroke-width": 3.5, "stroke-linejoin": "round", "stroke-linecap": "round" });
    var lineT = svg("polyline", { fill: "none", stroke: "#e5484d", "stroke-width": 3.5, "stroke-linejoin": "round", "stroke-linecap": "round" });
    var marks = svg("g");
    var yTop = svg("text", { x: X0 - 6, y: 34, "text-anchor": "end", "font-size": 13, fill: "#5b6470" });
    var y100 = svg("text", { x: X0 - 6, "text-anchor": "end", "font-size": 13, fill: "#5b6470", text: "100" });
    var l100 = svg("line", { x1: X0, x2: X0 + CW, stroke: "#c9d3df", "stroke-dasharray": "5 5" });
    var chart = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "우량주와 테마주의 주가" }, [
      svg("line", { x1: X0, y1: Y0, x2: X0 + CW, y2: Y0, stroke: "#1a1d21", "stroke-width": 2 }),
      svg("line", { x1: X0, y1: Y0, x2: X0, y2: 22, stroke: "#1a1d21", "stroke-width": 2 }),
      l100, y100, yTop, lineB, lineT, marks,
      svg("text", { x: X0 + CW, y: Y0 + 24, "text-anchor": "end", "font-size": 13, fill: "#5b6470", text: "30일" })
    ]);

    var vDay = el("b"), vWorth = el("b"), vHold = el("b");
    var news = el("div", { class: "gm-msg" });
    var bStart = el("button", { class: "gm-btn primary lg", text: "시작", onclick: start });
    var bCash = el("button", { class: "gm-btn", text: "모두 팔아 현금으로", onclick: function () { move("cash"); } });
    var bBlue = el("button", { class: "gm-btn", text: "우량주 사기", onclick: function () { move("blue"); } });
    var bTheme = el("button", { class: "gm-btn", text: "테마주 사기", onclick: function () { move("theme"); } });
    var bAgain = el("button", { class: "gm-btn ghost", text: "다시 하기", onclick: reset });
    var result = el("div", { class: "gm-result gm-hide" });
    var NAME = { cash: "현금", blue: "우량주", theme: "테마주" };

    function gen() {
      var r = ui.rng(Date.now());
      var b = [100], t = [100];
      var rumor = 5 + Math.floor(r() * 4), peak = rumor + 6 + Math.floor(r() * 4), crash = peak + 6 + Math.floor(r() * 2);
      for (var d = 1; d <= DAYS; d++) {
        b.push(b[d - 1] * (1 + 0.0012 + (r() - 0.5) * 0.016));
        var ch;
        if (d < rumor) ch = (r() - 0.5) * 0.04;
        else if (d <= peak) ch = 0.08 + r() * 0.14;
        else if (d <= crash) ch = -(0.17 + r() * 0.12);
        else ch = -0.03 + r() * 0.04;
        t.push(t[d - 1] * (1 + ch));
      }
      return { b: b, t: t, rumor: rumor, peak: peak, crash: crash };
    }
    function price(kind, d) { return kind === "blue" ? s.data.b[d] : s.data.t[d]; }
    function worth() { return s.pos === "cash" ? s.cash : s.units * price(s.pos, s.day); }
    function move(to) {
      if (!s.running || s.pos === to) return;
      var w = worth();
      s.cash = w; s.units = 0; s.pos = "cash";
      if (to !== "cash") { s.units = w / price(to, s.day); s.pos = to; }
      s.trades.push({ day: s.day, to: to, p: to === "cash" ? null : price(to, s.day) });
      render();
    }
    function newsFor(d) {
      var D = s.data;
      if (d < D.rumor) return ["두 회사 모두 조용합니다. 실적 발표는 다음 분기입니다.", ""];
      if (d === D.rumor) return ["테마주 회사가 화제의 신기술과 관련 있다는 글이 퍼지기 시작합니다.", "warn"];
      if (d < D.peak - 1) return ["테마주 거래량이 평소의 열 배가 됐습니다. 단체방마다 이 종목 이야기입니다.", "warn"];
      if (d <= D.peak) return ["\"지금이라도 타야 한다\"는 글이 쏟아집니다. 거래소가 투자경고 종목으로 지정했습니다.", "warn"];
      if (d === D.peak + 1) return ["회사가 \"그 사업과 관련이 없다\"고 공시했습니다. 먼저 산 사람들이 팔기 시작합니다.", "bad"];
      if (d <= D.crash) return ["팔려는 사람만 있고 사려는 사람이 없습니다. 값이 연일 떨어집니다.", "bad"];
      return ["테마주는 사람들의 관심에서 멀어졌습니다. 회사가 버는 돈은 처음과 같습니다.", ""];
    }
    function draw() {
      var top = Math.max(140, Math.max.apply(null, s.data.t.slice(0, s.day + 1)) * 1.08);
      function px(d) { return X0 + (CW * d) / DAYS; }
      function py(v) { return Y0 - (CH * v) / top; }
      function pts(arr) { return arr.slice(0, s.day + 1).map(function (v, d) { return px(d).toFixed(1) + "," + py(v).toFixed(1); }).join(" "); }
      lineB.setAttribute("points", pts(s.data.b));
      lineT.setAttribute("points", pts(s.data.t));
      l100.setAttribute("y1", py(100)); l100.setAttribute("y2", py(100)); y100.setAttribute("y", py(100) + 4);
      yTop.textContent = Math.round(top);
      marks.innerHTML = "";
      s.trades.forEach(function (tr) {
        if (tr.to === "cash") return;
        marks.appendChild(svg("circle", { cx: px(tr.day), cy: py(tr.p), r: 7, fill: "#fff", stroke: tr.to === "blue" ? "#008cff" : "#e5484d", "stroke-width": 3 }));
      });
    }
    function render() {
      vDay.textContent = s.day + " / " + DAYS + "일";
      ui.countUp(vWorth, worth(), 300, function (v) { return ui.fmt(v) + "만 원"; });
      vHold.textContent = NAME[s.pos];
      vHold.parentNode.className = "gm-stat " + (s.pos === "theme" ? "red" : s.pos === "blue" ? "blue" : "");
      [[bCash, "cash"], [bBlue, "blue"], [bTheme, "theme"]].forEach(function (x) {
        x[0].disabled = !s.running;
        x[0].classList.toggle("primary", s.pos === x[1] && s.running);
      });
      draw();
    }
    function tick() {
      if (root.offsetParent === null) return;
      if (s.day >= DAYS) return finish();
      s.day += 1;
      var n = newsFor(s.day);
      news.className = "gm-msg" + (n[1] ? " " + n[1] : "");
      news.textContent = s.day + "일째 · " + n[0];
      render();
      if (s.day >= DAYS) finish();
    }
    function start() {
      if (s.running) return;
      s.running = true; bStart.disabled = true;
      render();
      timer = setInterval(tick, 900);
    }
    function finish() {
      clearInterval(timer); timer = null;
      s.running = false;
      var mine = worth();
      var onlyB = s.data.b[DAYS], onlyT = s.data.t[DAYS], maxT = Math.max.apply(null, s.data.t);
      render();
      result.innerHTML = "";
      result.appendChild(el("h4", { text: "30일 뒤" }));
      result.appendChild(el("div", { class: "gm-stats" }, [
        el("div", { class: "gm-stat " + (mine >= 100 ? "green" : "red") }, [el("span", { text: "내 돈" }), el("b", { text: ui.fmt(mine) + "만 원" })]),
        el("div", { class: "gm-stat blue" }, [el("span", { text: "우량주만 들고 있었다면" }), el("b", { text: ui.fmt(onlyB) + "만 원" })]),
        el("div", { class: "gm-stat red" }, [el("span", { text: "테마주만 들고 있었다면" }), el("b", { text: ui.fmt(onlyT) + "만 원" })]),
        el("div", { class: "gm-stat" }, [el("span", { text: "테마주 가장 높았던 값" }), el("b", { text: ui.fmt(maxT) })])
      ]));
      result.appendChild(el("p", { text: "테마주는 " + s.data.rumor + "일째 소문이 돌아 " + s.data.peak + "일째에 가장 비쌌고, 그 뒤로 떨어졌습니다. 꼭대기가 며칠째인지는 매번 다릅니다." }));
      result.appendChild(el("p", { class: "gm-lesson", html: "테마주는 회사가 버는 돈이 아니라 <b>소문과 기대</b>로 움직였습니다. 오를 때 뒤따라 산 사람의 돈은 먼저 판 사람에게 넘어갔습니다. <b>꼭대기는 지나고 나서야 알 수 있습니다.</b>" }));
      result.classList.remove("gm-hide");
    }
    function reset() {
      clearInterval(timer); timer = null;
      s = { data: gen(), day: 0, cash: 100, units: 0, pos: "cash", trades: [], running: false };
      bStart.disabled = false;
      result.classList.add("gm-hide");
      news.className = "gm-msg";
      news.textContent = "시작을 누르면 하루씩 지나갑니다. 파란 선은 우량주, 빨간 선은 테마주입니다.";
      render();
    }
    body.appendChild(el("div", { class: "gm-stats" }, [
      el("div", { class: "gm-stat" }, [el("span", { text: "날짜" }), vDay]),
      el("div", { class: "gm-stat" }, [el("span", { text: "내 돈" }), vWorth]),
      el("div", { class: "gm-stat" }, [el("span", { text: "지금 들고 있는 것" }), vHold])
    ]));
    body.appendChild(el("div", { class: "chart" }, [chart]));
    body.appendChild(el("div", { class: "legend" }, [el("span", null, [el("i", { class: "b" }), "우량주"]), el("span", null, [el("i", { class: "t" }), "테마주"])]));
    body.appendChild(news);
    body.appendChild(el("div", { class: "gm-row" }, [bStart, bBlue, bTheme, bCash, bAgain]));
    body.appendChild(result);
    reset();
  };
})();
