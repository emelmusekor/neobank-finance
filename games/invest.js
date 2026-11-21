/* 10년 투자: 세 바구니에 나누어 담고 10년을 보낸다. */
(function () {
  "use strict";
  window.EcoGames = window.EcoGames || {};
  window.EcoGames["invest"] = function (root, ui) {
    var el = ui.el, fmt = ui.fmt, clamp = ui.clamp;
    var SVGNS = "http://www.w3.org/2000/svg";
    var START = 1000, YEARS = 10;
    var KEYS = ["dep", "bond", "stock"];
    var INFO = {
      dep: { name: "예금", note: "매년 +3% 고정" },
      bond: { name: "채권", note: "평균 +4%, 조금 흔들림" },
      stock: { name: "주식", note: "평균 +8%, 크게 흔들림" }
    };
    var PRESETS = [
      { name: "안전하게", note: "예금 70·채권 30", a: { dep: 70, bond: 30, stock: 0 } },
      { name: "골고루", note: "예금 30·채권 30·주식 40", a: { dep: 30, bond: 30, stock: 40 } },
      { name: "과감하게", note: "주식 100", a: { dep: 0, bond: 0, stock: 100 } }
    ];
    var SERIES = [
      { key: "dep", name: "예금만" },
      { key: "bond", name: "채권만" },
      { key: "stock", name: "주식만" },
      { key: "mine", name: "내 자산" }
    ];
    var BAR_H = 260, ZERO = 150, PX = 2.4;

    var S = null;          /* 현재 판의 상태 */
    var timers = [];
    var raf = 0;
    var dragBase = null;
    var lastW = 0;
    var geo = null;        /* 그래프 좌표 계산값 */
    var hoverYear = null;
    var clipId = "iv-clip-" + Math.floor(Math.random() * 1e9).toString(36);

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
    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    function last(a) { return a[a.length - 1]; }
    function round1(v) { return Math.round(v * 10) / 10; }
    function pct(v) {
      var r = round1(v);
      return (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r).toFixed(1) + "%";
    }
    function won(v) { return fmt(v) + "만 원"; }
    /* 숫자를 바로 바꾼다. 아직 돌고 있던 숫자 올리기의 마지막 장면이 덮어쓰지 못하게 한 번 더 건다. */
    function setNow(node, v, f) {
      node.setAttribute("data-now", v);
      node.textContent = f(v);
      ui.countUp(node, v, 1, f);
    }
    function sv(tag, attrs, text) {
      var n = document.createElementNS(SVGNS, tag);
      if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      if (text != null) n.textContent = text;
      return n;
    }

    /* ---------- 화면 틀 ---------- */
    var body = ui.frame(root, {
      badge: "시뮬레이션",
      title: "10년 투자",
      sub: "1,000만 원을 세 바구니에 나누어 담고 10년을 보냅니다."
    });

    var msg = el("div", { class: "gm-msg" });

    var stYear = el("b");
    var stWealth = el("b");
    var stRet = el("b");
    var stWorst = el("b");
    var stWorstLabel = el("span");
    var stRetBox = el("div", { class: "gm-stat" }, [el("span", { text: "올해 수익률" }), stRet]);
    var stWorstBox = el("div", { class: "gm-stat" }, [stWorstLabel, stWorst]);
    var stats = el("div", { class: "gm-stats" }, [
      el("div", { class: "gm-stat" }, [el("span", { text: "연도" }), stYear]),
      el("div", { class: "gm-stat blue" }, [el("span", { text: "내 자산" }), stWealth]),
      stRetBox,
      stWorstBox
    ]);

    /* 나누어 담기 */
    var segs = {}, sliders = {}, outs = {}, presetBtns = [];
    var allocBar = el("div", { class: "iv-allocbar", role: "img" });
    KEYS.forEach(function (k) {
      segs[k] = el("div", { class: "iv-seg iv-c-" + k });
      allocBar.appendChild(segs[k]);
    });
    var fields = el("div", { class: "iv-fields" });
    KEYS.forEach(function (k) {
      var input = el("input", {
        type: "range", class: "gm-range iv-range iv-r-" + k, min: "0", max: "100", step: "10",
        "aria-label": INFO[k].name + " 비율"
      });
      input.addEventListener("input", function () { setAlloc(k, Number(input.value)); });
      input.addEventListener("change", function () { dragBase = null; });
      sliders[k] = input;
      outs[k] = el("output", { class: "iv-out" });
      fields.appendChild(el("div", { class: "gm-field iv-field" }, [
        el("div", { class: "gm-row" }, [
          el("span", { class: "iv-name" }, [
            el("i", { class: "iv-dot iv-c-" + k }),
            el("b", { text: INFO[k].name }),
            el("small", { text: INFO[k].note })
          ]),
          outs[k]
        ]),
        input
      ]));
    });
    var presetRow = el("div", { class: "iv-presets" });
    PRESETS.forEach(function (p) {
      var b = el("button", { type: "button", class: "gm-btn iv-preset" }, [
        el("b", { text: p.name }),
        el("small", { text: p.note })
      ]);
      b.addEventListener("click", function () {
        if (!S || S.done || S.auto) return;
        dragBase = null;
        KEYS.forEach(function (k) { S.alloc[k] = p.a[k]; });
        renderAlloc();
      });
      presetBtns.push({ btn: b, a: p.a });
      presetRow.appendChild(b);
    });
    var allocPanel = el("div", { class: "iv-panel" }, [
      el("div", { class: "iv-ptitle", text: "나누어 담기" }),
      allocBar, fields, presetRow
    ]);

    /* 올해 바구니별 수익률 막대 */
    var barTitle = el("div", { class: "iv-ptitle" });
    var crashTag = el("span", { class: "iv-crash gm-hide", text: "폭락" });
    var cols = {};
    var barRow = el("div", { class: "iv-bars" });
    [["dep", "예금"], ["bond", "채권"], ["stock", "주식"], ["mine", "내 바구니"]].forEach(function (d) {
      var bar = el("div", { class: "iv-bar" });
      var val = el("div", { class: "iv-val", text: "" });
      var area = el("div", { class: "iv-bararea" }, [el("div", { class: "iv-zero" }), bar, val]);
      if (d[0] === "stock") area.appendChild(crashTag);
      cols[d[0]] = { bar: bar, val: val };
      barRow.appendChild(el("div", { class: "iv-col" + (d[0] === "mine" ? " iv-col-mine" : "") }, [
        area, el("div", { class: "iv-colname", text: d[1] })
      ]));
    });
    var barHint = el("div", { class: "iv-hint" });
    var barPanel = el("div", { class: "iv-panel" }, [barTitle, barRow, barHint]);

    var colsWrap = el("div", { class: "iv-cols" }, [allocPanel, barPanel]);

    /* 자산 그래프 */
    var svg = sv("svg", { class: "iv-chart", role: "img", "aria-label": "자산 변화 그래프" });
    var chartBox = el("div", { class: "iv-chartbox" }, [svg]);
    var lgYear = el("span", { class: "iv-lgyear" });
    var lgVals = {};
    var legend = el("div", { class: "iv-legend" }, [lgYear]);
    SERIES.slice().reverse().forEach(function (s) {
      var sw = sv("svg", { class: "iv-sw", width: "30", height: "12", viewBox: "0 0 30 12", "aria-hidden": "true" });
      sw.appendChild(sv("line", { x1: "2", y1: "6", x2: "28", y2: "6", class: "iv-line iv-l-" + s.key }));
      lgVals[s.key] = el("b");
      legend.appendChild(el("span", { class: "iv-lg" }, [sw, el("span", { text: s.name }), lgVals[s.key]]));
    });
    var chartPanel = el("div", { class: "iv-panel" }, [
      el("div", { class: "iv-ptitle", text: "자산 변화" }),
      chartBox, legend
    ]);

    /* 버튼 */
    var btnStep = el("button", { type: "button", class: "gm-btn primary lg", text: "1년 보내기" });
    var btnAll = el("button", { type: "button", class: "gm-btn", text: "끝까지 보내기" });
    var btnReset = el("button", { type: "button", class: "gm-btn ghost", text: "다시 하기" });
    btnStep.addEventListener("click", function () { if (S && !S.done && !S.auto) step(); });
    btnAll.addEventListener("click", function () { if (S && !S.done && !S.auto) runAll(); });
    btnReset.addEventListener("click", function () { start(); });
    var btnRow = el("div", { class: "gm-row" }, [btnStep, btnAll, btnReset]);

    var result = el("div", { class: "gm-result iv-result gm-hide" });

    body.appendChild(msg);
    body.appendChild(stats);
    body.appendChild(colsWrap);
    body.appendChild(btnRow);
    body.appendChild(chartPanel);
    body.appendChild(result);

    /* ---------- 상태 ---------- */
    function newState() {
      var seed = ((Date.now() % 2147483647) ^ Math.floor(Math.random() * 2147483647)) >>> 0;
      var r = ui.rng(seed || 1);
      var crash = 3 + Math.floor(r() * 6);          /* 3~8년째 가운데 한 해 */
      if (crash > 8) crash = 8;
      var rets = [];
      for (var y = 1; y <= YEARS; y++) {
        var bond = 4 + (r() * 14 - 7);
        var stock = 8 + ((r() * 2 - 1) + (r() * 2 - 1) + (r() * 2 - 1)) * 15;
        if (y === crash) { bond = 6; stock = -32; }
        rets.push({ dep: 3, bond: round1(bond), stock: round1(stock) });
      }
      return {
        rets: rets, crash: crash, year: 0, done: false, auto: false,
        alloc: { dep: 30, bond: 30, stock: 40 },
        val: { mine: [START], dep: [START], bond: [START], stock: [START] },
        myRet: []
      };
    }

    function setAlloc(key, v) {
      if (!S || S.done || S.auto) { renderAlloc(); return; }
      v = clamp(Math.round(v / 10) * 10, 0, 100);
      var others = KEYS.filter(function (k) { return k !== key; });
      if (!dragBase || dragBase.key !== key) {
        dragBase = { key: key, a: S.alloc[others[0]], b: S.alloc[others[1]] };
      }
      var rest = 100 - v, a = dragBase.a, b = dragBase.b, na;
      if (a + b === 0) na = Math.round(rest / 20) * 10;
      else na = Math.round((rest * a) / (a + b) / 10) * 10;
      na = clamp(na, 0, rest);
      S.alloc[key] = v;
      S.alloc[others[0]] = na;
      S.alloc[others[1]] = rest - na;
      renderAlloc();
    }

    function renderAlloc() {
      var w = last(S.val.mine);
      var locked = S.done || S.auto;
      var label = [];
      KEYS.forEach(function (k) {
        var p = S.alloc[k];
        segs[k].style.flexGrow = String(p);
        segs[k].classList.toggle("is-zero", p === 0);
        segs[k].textContent = p >= 30 ? INFO[k].name + " " + p : (p > 0 ? String(p) : "");
        if (Number(sliders[k].value) !== p) sliders[k].value = String(p);
        sliders[k].disabled = locked;
        outs[k].textContent = p + "% · " + won(w * p / 100);
        label.push(INFO[k].name + " " + p + "%");
      });
      allocBar.setAttribute("aria-label", label.join(", "));
      presetBtns.forEach(function (pb) {
        var on = KEYS.every(function (k) { return pb.a[k] === S.alloc[k]; });
        pb.btn.classList.toggle("is-on", on);
        pb.btn.disabled = locked;
      });
    }

    /* ---------- 막대 ---------- */
    function setBar(col, v, animate) {
      var bar = col.bar, val = col.val;
      if (v == null) {
        bar.className = "iv-bar";
        bar.style.height = "0px";
        bar.style.top = "auto";
        bar.style.bottom = (BAR_H - ZERO) + "px";
        val.textContent = "";
        return;
      }
      var r = round1(v), up = r >= 0;
      var h = Math.max(3, Math.min(Math.abs(r) * PX, up ? 128 : 88));
      bar.className = "iv-bar " + (up ? "up" : "down");
      val.textContent = pct(r);
      val.className = "iv-val " + (up ? "up" : "down");
      if (up) {
        bar.style.top = "auto"; bar.style.bottom = (BAR_H - ZERO) + "px";
        val.style.top = "auto"; val.style.bottom = (BAR_H - ZERO + h + 4) + "px";
      } else {
        bar.style.bottom = "auto"; bar.style.top = ZERO + "px";
        val.style.bottom = "auto"; val.style.top = (ZERO + h + 4) + "px";
      }
      if (animate && !reduced()) {
        bar.style.transition = "none";
        bar.style.height = "0px";
        void bar.offsetHeight;
        bar.style.transition = "";
        ui.replay(val, "is-in");
      }
      bar.style.height = h + "px";
    }

    function renderBars(animate) {
      var y = S.year;
      if (y === 0) {
        barTitle.textContent = "바구니별 수익률";
        ["dep", "bond", "stock", "mine"].forEach(function (k) { setBar(cols[k], null); });
        barHint.textContent = "1년을 보내면 그해 수익률이 막대로 나옵니다.";
        crashTag.classList.add("gm-hide");
        return;
      }
      var r = S.rets[y - 1];
      barTitle.textContent = y + "년째 바구니별 수익률";
      setBar(cols.dep, r.dep, animate);
      setBar(cols.bond, r.bond, animate);
      setBar(cols.stock, r.stock, animate);
      setBar(cols.mine, S.myRet[y - 1], animate);
      var isCrash = y === S.crash;
      crashTag.classList.toggle("gm-hide", !isCrash);
      if (isCrash && animate) ui.replay(barRow, "is-shake");
      barHint.textContent = "내 바구니는 담은 비율대로 섞은 결과입니다.";
    }

    /* ---------- 그래프 ---------- */
    function niceStep(span) {
      var steps = [100, 200, 250, 500, 1000, 2000, 2500, 5000];
      for (var i = 0; i < steps.length; i++) if (span / steps[i] <= 5) return steps[i];
      return 10000;
    }

    function drawChart(animate) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      var W = Math.round(chartBox.clientWidth) || lastW || 600;
      lastW = W;
      var wide = W >= 520;
      var H = Math.round(clamp(W * 0.4, 230, 300));
      var m = { l: 54, r: wide ? 80 : 16, t: 26, b: 34 };
      var pw = Math.max(40, W - m.l - m.r), ph = H - m.t - m.b;
      var n = S.year;
      var lo = 900, hi = 1500, i;
      SERIES.forEach(function (s) {
        for (var j = 0; j <= n; j++) {
          lo = Math.min(lo, S.val[s.key][j]);
          hi = Math.max(hi, S.val[s.key][j]);
        }
      });
      var stp = niceStep(hi - lo);
      lo = Math.floor(lo / stp) * stp;
      hi = Math.ceil(hi / stp) * stp;
      function X(j) { return m.l + pw * j / YEARS; }
      function Y(v) { return m.t + ph * (1 - (v - lo) / (hi - lo)); }
      geo = { l: m.l, pw: pw, W: W, t: m.t, b: H - m.b, X: X };

      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.setAttribute("width", W);
      svg.setAttribute("height", H);

      var defs = sv("defs");
      var clip = sv("clipPath", { id: clipId });
      var clipRect = sv("rect", { x: "0", y: "0", width: String(W), height: String(H) });
      clip.appendChild(clipRect);
      defs.appendChild(clip);
      svg.appendChild(defs);

      /* 눈금 */
      svg.appendChild(sv("text", { x: m.l - 8, y: 14, class: "iv-axis", "text-anchor": "end" }, "만 원"));
      for (var v = lo; v <= hi + 0.5; v += stp) {
        svg.appendChild(sv("line", {
          x1: m.l, x2: m.l + pw, y1: Y(v), y2: Y(v),
          class: "iv-grid" + (v === START ? " base" : "")
        }));
        svg.appendChild(sv("text", { x: m.l - 8, y: Y(v) + 5, class: "iv-axis", "text-anchor": "end" }, fmt(v)));
      }
      for (i = 0; i <= YEARS; i++) {
        if (!wide && i % 2 === 1) continue;
        svg.appendChild(sv("text", {
          x: X(i), y: H - 10, class: "iv-axis",
          "text-anchor": i === 0 ? "start" : (i === YEARS && !wide ? "end" : "middle")
        }, i === 0 ? "시작" : i + "년"));
      }

      /* 폭락한 해 표시 */
      if (n >= S.crash) {
        svg.appendChild(sv("rect", {
          x: X(S.crash - 1), y: m.t, width: X(S.crash) - X(S.crash - 1), height: ph, class: "iv-crashband"
        }));
        svg.appendChild(sv("text", {
          x: (X(S.crash - 1) + X(S.crash)) / 2, y: m.t - 8, class: "iv-crashlabel", "text-anchor": "middle"
        }, "폭락"));
      }

      /* 선 */
      var g = sv("g", { "clip-path": "url(#" + clipId + ")" });
      SERIES.forEach(function (s) {
        var arr = S.val[s.key], d = "";
        for (var j = 0; j <= n; j++) d += (j ? " L " : "M ") + X(j).toFixed(1) + " " + Y(arr[j]).toFixed(1);
        if (n === 0) d += " L " + X(0).toFixed(1) + " " + Y(arr[0]).toFixed(1);
        g.appendChild(sv("path", { d: d, class: "iv-line iv-l-" + s.key }));
        if (s.key === "mine") {
          for (var q = 0; q < n; q++) {
            g.appendChild(sv("circle", { cx: X(q), cy: Y(arr[q]), r: 3, class: "iv-pt iv-p-mine" }));
          }
        }
        g.appendChild(sv("circle", {
          cx: X(n), cy: Y(arr[n]), r: s.key === "mine" ? 6 : 4, class: "iv-pt iv-end iv-p-" + s.key
        }));
      });
      svg.appendChild(g);

      /* 선 끝 이름표 (넓은 화면) */
      if (wide && n > 0) {
        var labs = SERIES.map(function (s) { return { s: s, y: Y(S.val[s.key][n]) }; });
        labs.sort(function (a, b) { return a.y - b.y; });
        for (i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 18) labs[i].y = labs[i - 1].y + 18;
        var over = last(labs).y - (H - m.b);
        if (over > 0) labs.forEach(function (l) { l.y -= over; });
        for (i = labs.length - 2; i >= 0; i--) if (labs[i + 1].y - labs[i].y < 18) labs[i].y = labs[i + 1].y - 18;
        labs.forEach(function (l) {
          svg.appendChild(sv("text", {
            x: X(n) + 12, y: l.y + 5,
            class: "iv-endlabel" + (l.s.key === "mine" ? " mine" : "") + (animate && !reduced() ? " is-in" : "")
          }, l.s.name));
        });
      }

      /* 살펴보기 선 */
      var guide = sv("line", { x1: 0, x2: 0, y1: m.t, y2: H - m.b, class: "iv-guide" });
      guide.style.display = "none";
      svg.appendChild(guide);
      geo.guide = guide;
      hoverYear = null;

      /* 새로 늘어난 구간만 왼쪽에서 오른쪽으로 드러낸다 */
      if (animate && n > 0 && !reduced()) {
        var from = X(n - 1) + 1, to = W, t0 = null, dur = 480;
        var stopAt = X(n) + 10;
        clipRect.setAttribute("width", String(from));
        var tick = function (t) {
          if (t0 === null) t0 = t;
          var p = Math.min(1, (t - t0) / dur);
          var e = 1 - Math.pow(1 - p, 3);
          clipRect.setAttribute("width", String(p >= 1 ? to : from + (stopAt - from) * e));
          raf = p < 1 ? requestAnimationFrame(tick) : 0;
        };
        raf = requestAnimationFrame(tick);
        later(function () { clipRect.setAttribute("width", String(to)); }, dur + 400);
      }
      renderLegend(n);
    }

    function renderLegend(y) {
      lgYear.textContent = y === 0 ? "시작" : y + "년째";
      SERIES.forEach(function (s) { lgVals[s.key].textContent = fmt(S.val[s.key][y]) + "만"; });
    }

    function onPoint(e) {
      if (!S || !geo) return;
      var rect = svg.getBoundingClientRect();
      if (!rect.width) return;
      var x = (e.clientX - rect.left) * (geo.W / rect.width);
      var y = clamp(Math.round((x - geo.l) / geo.pw * YEARS), 0, S.year);
      if (y === hoverYear) return;
      hoverYear = y;
      geo.guide.setAttribute("x1", geo.X(y));
      geo.guide.setAttribute("x2", geo.X(y));
      geo.guide.style.display = "";
      renderLegend(y);
    }
    function offPoint() {
      if (!S || !geo) return;
      hoverYear = null;
      geo.guide.style.display = "none";
      renderLegend(S.year);
    }
    svg.addEventListener("pointermove", onPoint);
    svg.addEventListener("pointerdown", onPoint);
    svg.addEventListener("pointerleave", offPoint);

    if (typeof ResizeObserver === "function") {
      new ResizeObserver(function () {
        var w = Math.round(chartBox.clientWidth);
        if (S && w > 0 && w !== lastW) drawChart(false);
      }).observe(chartBox);
    }

    /* ---------- 진행 ---------- */
    function worstOf(arr) {
      var idx = 0;
      for (var i = 1; i < arr.length; i++) if (arr[i] < arr[idx]) idx = i;
      return { year: idx + 1, ret: arr[idx] };
    }

    function renderStats(animate) {
      var y = S.year;
      stYear.textContent = y + " / " + YEARS + "년";
      if (animate) ui.countUp(stWealth, last(S.val.mine), 500, won);
      else setNow(stWealth, last(S.val.mine), won);
      stRetBox.classList.remove("green", "red");
      stWorstBox.classList.remove("red");
      if (y === 0) {
        stRet.textContent = "–";
        stWorstLabel.textContent = "가장 크게 줄어든 해";
        stWorst.textContent = "–";
        return;
      }
      var r = round1(S.myRet[y - 1]);
      stRet.textContent = pct(r);
      stRetBox.classList.add(r >= 0 ? "green" : "red");
      if (animate) ui.replay(stRet, "is-pop");
      var w = worstOf(S.myRet);
      if (round1(w.ret) < 0) {
        stWorstLabel.textContent = "가장 크게 줄어든 해 · " + w.year + "년째";
        stWorst.textContent = pct(w.ret);
        stWorstBox.classList.add("red");
      } else {
        stWorstLabel.textContent = "가장 크게 줄어든 해";
        stWorst.textContent = "없음";
      }
    }

    function renderButtons() {
      var locked = S.done || S.auto;
      btnStep.disabled = locked;
      btnAll.disabled = locked;
      btnStep.textContent = S.done ? "10년이 지났습니다" : "1년 보내기";
    }

    function setMsg(kind, text) {
      msg.className = "gm-msg" + (kind ? " " + kind : "");
      msg.textContent = text;
    }

    function step() {
      if (S.done) return;
      var y = S.year + 1, r = S.rets[y - 1];
      var my = (S.alloc.dep * r.dep + S.alloc.bond * r.bond + S.alloc.stock * r.stock) / 100;
      S.val.mine.push(last(S.val.mine) * (1 + my / 100));
      KEYS.forEach(function (k) { S.val[k].push(last(S.val[k]) * (1 + r[k] / 100)); });
      S.myRet.push(my);
      S.year = y;
      dragBase = null;

      var rm = round1(my);
      if (y === S.crash) {
        setMsg("bad", y + "년째에 주식이 폭락했습니다. 주식 " + pct(r.stock) + ", 채권 " + pct(r.bond) +
          "입니다. 내 자산은 " + (rm < 0 ? Math.abs(rm).toFixed(1) + "% 줄었습니다." : rm.toFixed(1) + "% 늘었습니다."));
      } else if (rm < 0) {
        setMsg("warn", y + "년째에는 내 자산이 " + Math.abs(rm).toFixed(1) + "% 줄었습니다.");
      } else {
        setMsg("good", y + "년째에는 내 자산이 " + rm.toFixed(1) + "% 늘었습니다.");
      }

      renderStats(true);
      renderBars(true);
      drawChart(true);
      if (y >= YEARS) { S.done = true; S.auto = false; }
      renderAlloc();
      renderButtons();
      if (S.done) later(finish, reduced() ? 50 : 700);
    }

    function runAll() {
      S.auto = true;
      renderAlloc();
      renderButtons();
      var gap = reduced() ? 150 : 650;
      (function next() {
        if (!S.auto || S.done) return;
        step();
        if (!S.done) later(next, gap);
      })();
    }

    function card(title, cls, rows) {
      return el("div", { class: "iv-card " + cls }, [
        el("div", { class: "iv-cardtitle", text: title }),
        el("dl", null, rows.reduce(function (acc, r) {
          acc.push(el("dt", { text: r[0] }));
          acc.push(r[1] instanceof Node ? el("dd", null, r[1]) : el("dd", { text: r[1] }));
          return acc;
        }, []))
      ]);
    }

    function finish() {
      var fin = last(S.val.mine), depFin = last(S.val.dep), stockFin = last(S.val.stock);
      function cagr(v) { return (Math.pow(v / START, 1 / YEARS) - 1) * 100; }
      var myWorst = worstOf(S.myRet);
      var stWorstY = worstOf(S.rets.map(function (r) { return r.stock; }));
      var infl = Math.pow(1.02, YEARS);
      var real = fin / infl;

      var finNode = el("b", { class: "iv-big", "data-now": String(START), text: won(START) });
      result.innerHTML = "";
      result.appendChild(el("h4", { text: "10년이 지났습니다" }));
      result.appendChild(el("p", null, ["1,000만 원이 ", finNode, "이 되었습니다."]));
      result.appendChild(el("div", { class: "iv-cards" }, [
        card("내 바구니", "mine", [
          ["최종 자산", won(fin)],
          ["연평균 수익률", pct(cagr(fin))],
          ["가장 나빴던 해", myWorst.year + "년째 " + pct(myWorst.ret)]
        ]),
        card("예금만", "dep", [
          ["최종 자산", won(depFin)],
          ["연평균 수익률", pct(cagr(depFin))],
          ["가장 나빴던 해", "해마다 " + pct(3)]
        ]),
        card("주식만", "stock", [
          ["최종 자산", won(stockFin)],
          ["연평균 수익률", pct(cagr(stockFin))],
          ["가장 나빴던 해", stWorstY.year + "년째 " + pct(stWorstY.ret)]
        ])
      ]));
      result.appendChild(el("p", { class: "iv-real" }, [
        "물가가 해마다 2% 올랐다면 실제 가치는 ",
        el("b", { text: won(real) }),
        "입니다. 예금만 넣었다면 실제 가치는 " + won(depFin / infl) + "입니다."
      ]));
      result.appendChild(el("p", {
        text: "물가가 그만큼 오르면 10년 뒤에는 " + won(START * infl) + "이 있어야 처음 1,000만 원과 가치가 같습니다."
      }));
      result.appendChild(el("div", { class: "gm-lesson" }, [
        el("b", { text: "기대 수익이 높은 곳은 흔들림도 큽니다." }),
        " 나누어 담으면 가장 나쁜 해의 손실이 줄어듭니다. 물가가 오르는 만큼은 벌어야 돈의 가치가 지켜집니다."
      ]));
      result.classList.remove("gm-hide");
      ui.replay(result, "is-in");
      ui.countUp(finNode, fin, 900, won);
      setMsg("", "10년이 지났습니다. 아래에서 결과를 확인합니다. 나누는 방법을 바꾸어 다시 해 볼 수 있습니다.");
    }

    function start() {
      clearTimers();
      S = newState();
      dragBase = null;
      result.classList.add("gm-hide");
      result.innerHTML = "";
      setMsg("", "목표: 1,000만 원을 세 바구니에 나누어 담고 10년 뒤 자산을 확인합니다. 해마다 나누는 비율을 바꿀 수 있습니다.");
      renderStats(false);
      renderAlloc();
      renderBars(false);
      drawChart(false);
      renderButtons();
    }

    start();
  };
})();
