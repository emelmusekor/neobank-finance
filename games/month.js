/* 한 달 살기: 월급 250만 원으로 한 달을 산다. 금액 단위는 모두 만 원.
   언제나  세금·보험 + 고정비 + 식비 + 선택 지출 + 저축 + 남은 돈 = 월급 250 + 카드빚  이 성립한다. */
(function () {
  "use strict";
  window.EcoGames = window.EcoGames || {};

  var SALARY = 250;
  var TAX = 25;
  var JOY_MAX = 20;
  var SVG_NS = "http://www.w3.org/2000/svg";
  var FIXED = [
    { icon: "🏠", name: "월세", cost: 50 },
    { icon: "📶", name: "통신비", cost: 5 },
    { icon: "🚌", name: "교통비", cost: 8 }
  ];
  var CATS = [
    { key: "tax", name: "세금·보험" },
    { key: "fixed", name: "고정비" },
    { key: "food", name: "식비" },
    { key: "opt", name: "선택 지출" },
    { key: "jar", name: "저축" },
    { key: "cash", name: "남은 돈" }
  ];

  function foodCard() {
    return {
      cat: "food", icon: "🍚", title: "식비", desc: "이번 주 밥을 어떻게 먹을지 정합니다.",
      options: [
        { label: "집에서 해 먹기", cost: 12, joy: 1 },
        { label: "해 먹기와 배달 반반", cost: 18, joy: 2 },
        { label: "매일 배달", cost: 28, joy: 3 }
      ]
    };
  }
  var WEEKS = [
    [foodCard(), {
      cat: "opt", icon: "👫", title: "친구 약속", desc: "친구가 주말에 만나자고 합니다.",
      options: [
        { label: "집에서 논다", cost: 2, joy: 1 },
        { label: "맛집에 간다", cost: 6, joy: 2 }
      ]
    }],
    [foodCard(), {
      cat: "opt", icon: "👟", title: "반값 할인 운동화", desc: "정가 18만 원이 9만 원입니다.", note: "살 것 목록에는 없던 물건입니다.",
      options: [
        { label: "산다", cost: 9, joy: 2, after: "반값이어도 9만 원이 나갔습니다." },
        { label: "안 산다", cost: 0, joy: 0, after: "계획에 없던 지출 9만 원을 막았습니다." }
      ]
    }],
    [foodCard(), {
      cat: "opt", icon: "📱", title: "휴대폰 고장", desc: "휴대폰이 켜지지 않습니다.",
      options: [
        { label: "고친다", cost: 15, joy: 0 },
        { label: "새로 산다 (할부)", cost: 8, joy: 2, loan: 88, sub: "이번 달 8만 원, 다음 달부터 11개월 동안 8만 원씩 냅니다." }
      ]
    }],
    [foodCard(), {
      cat: "opt", icon: "💌", title: "친구 결혼식", desc: "친구 결혼식에 축의금을 냅니다.",
      options: [
        { label: "축의금 10만 원", cost: 10, joy: 1 },
        { label: "축의금 5만 원", cost: 5, joy: 0 }
      ]
    }]
  ];

  function sv(tag, attrs, text) {
    var n = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function man(v) { return Math.round(v) + "만 원"; }

  window.EcoGames["month"] = function (root, ui) {
    var el = ui.el;
    var body = ui.frame(root, { badge: "시뮬레이션", title: "한 달 살기", sub: "첫 월급 250만 원으로 한 달을 살아 봅니다." });
    var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var timers = [];
    var S = null;

    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function clearTimers() { timers.forEach(function (t) { clearTimeout(t); }); timers = []; }

    /* ── 항상 보이는 숫자 ── */
    var stWeek = el("b", { text: "준비" });
    var stCash = el("b", { text: "0만 원" });
    var stJar = el("b", { text: "0만 원" });
    var stJoy = el("b", { text: "0" });
    var stDebt = el("b", { text: "0만 원" });
    var debtNote = el("small");
    var hearts = [];
    var heartRow = el("div", { class: "mo-hearts", "aria-hidden": "true" });
    for (var hi = 0; hi < JOY_MAX / 2; hi++) {
      var fill = el("i", { text: "♥︎" });
      hearts.push(fill);
      heartRow.appendChild(el("span", { class: "mo-heart" }, ["♥︎", fill]));
    }
    var boxCash = el("div", { class: "gm-stat blue" }, [el("span", { text: "남은 돈" }), stCash]);
    var boxJar = el("div", { class: "gm-stat green" }, [el("span", { text: "저축" }), stJar]);
    var boxJoy = el("div", { class: "gm-stat mo-stat-joy" }, [
      el("span", { text: "만족" }),
      el("div", { class: "mo-joy" }, [el("div", { class: "mo-joy-num" }, [stJoy, el("em", { text: " / " + JOY_MAX })]), heartRow])
    ]);
    var boxDebt = el("div", { class: "gm-stat red gm-hide" }, [el("span", { text: "빚" }), stDebt, debtNote]);
    var stats = el("div", { class: "mo-stats" }, [
      el("div", { class: "gm-stat mo-stat-week" }, [el("span", { text: "주차" }), stWeek]),
      boxCash, boxJar, boxJoy, boxDebt
    ]);

    /* ── 쌓이는 막대 ── */
    var segs = {};
    var legs = {};
    var bar = el("div", { class: "mo-bar", role: "img", "aria-label": "월급이 어디에 쓰였는지 보여 주는 막대" });
    var legend = el("div", { class: "mo-legend" });
    CATS.forEach(function (c) {
      var label = el("span");
      var seg = el("div", { class: "mo-seg mo-c-" + c.key, title: c.name }, [label]);
      segs[c.key] = { box: seg, label: label };
      bar.appendChild(seg);
      var amount = el("b", { text: "0만 원" });
      legs[c.key] = amount;
      legend.appendChild(el("div", { class: "mo-leg" }, [el("i", { class: "mo-c-" + c.key }), el("span", { text: c.name }), amount]));
    });
    var mark = el("div", { class: "mo-mark gm-hide" });
    var over = el("p", { class: "mo-over gm-hide" });
    var barSec = el("div", { class: "mo-bar-sec" }, [
      el("div", { class: "mo-bar-title", text: "월급 250만 원이 가는 곳" }),
      el("div", { class: "mo-bar-box" }, [bar, mark]),
      over,
      legend
    ]);

    var stage = el("div", { class: "mo-stage" });
    var result = el("div", { class: "gm-result gm-hide" });
    var foot = el("div", { class: "gm-row mo-foot gm-hide" }, [
      el("button", { class: "gm-btn sm ghost", type: "button", text: "다시 하기", onclick: restart })
    ]);

    body.appendChild(stats);
    body.appendChild(barSec);
    body.appendChild(stage);
    body.appendChild(result);
    body.appendChild(foot);

    function reset() {
      clearTimers();
      S = { week: -1, cash: 0, jar: 0, jarStart: 0, withdrawn: 0, tax: 0, fixed: 0, food: 0, opt: 0, card: 0, loan: 0, joy: 0, done: [false, false], asking: false };
      [stCash, stJar, stDebt].forEach(function (n) { n.setAttribute("data-now", 0); });
      stWeek.textContent = "준비";
      result.classList.add("gm-hide");
      result.innerHTML = "";
      stage.classList.remove("gm-hide");
      stage.innerHTML = "";
      sync(200);
    }

    /* 상태를 화면에 옮긴다. */
    function sync(ms) {
      var total = SALARY + S.card;
      var debt = S.card + S.loan;
      ui.countUp(stCash, S.cash, ms, man);
      ui.countUp(stJar, S.jar, ms, man);
      stJoy.textContent = String(S.joy);
      hearts.forEach(function (node, i) {
        node.style.width = ui.clamp((S.joy - i * 2) / 2, 0, 1) * 100 + "%";
      });
      boxDebt.classList.toggle("gm-hide", debt <= 0);
      ui.countUp(stDebt, debt, ms, man);
      debtNote.textContent = S.card > 0 && S.loan > 0 ? "카드빚 " + S.card + "만 · 할부 " + S.loan + "만"
        : S.card > 0 ? "카드빚" : S.loan > 0 ? "휴대폰 할부" : "";
      CATS.forEach(function (c) {
        var v = S[c.key];
        var share = v / total;
        segs[c.key].box.style.width = share * 100 + "%";
        segs[c.key].box.classList.toggle("tiny", share < 0.075);
        segs[c.key].label.textContent = String(v);
        ui.countUp(legs[c.key], v, ms, man);
      });
      mark.classList.toggle("gm-hide", S.card <= 0);
      over.classList.toggle("gm-hide", S.card <= 0);
      if (S.card > 0) {
        mark.style.left = (SALARY / total) * 100 + "%";
        over.textContent = "굵은 선이 월급 250만 원입니다. 선 오른쪽 " + S.card + "만 원은 카드로 당겨 쓴 돈입니다.";
      }
    }

    function floatOn(box, text, minus) {
      ui.floatText(box, text, 14, 2, minus);
    }

    /* ── 시작 화면 ── */
    function showStart() {
      reset();
      foot.classList.add("gm-hide");
      stage.appendChild(el("div", { class: "mo-start" }, [
        el("div", { class: "mo-start-art", "aria-hidden": "true" }, [
          el("span", { text: "💼" }), el("span", { text: "💰" }), el("span", { text: "🗓️" })
        ]),
        el("div", { class: "gm-msg", text: "월급 250만 원으로 한 달을 살고, 저축을 남기고 빚 없이 마칩니다." }),
        el("div", { class: "gm-row center" }, [
          el("button", { class: "gm-btn primary lg", type: "button", text: "월급 받기", onclick: restart })
        ])
      ]));
    }

    function restart() {
      reset();
      foot.classList.remove("gm-hide");
      runIntro();
      keepInView();
    }

    function keepInView() {
      try {
        var r = root.getBoundingClientRect();
        if (r.height > 0 && r.top < 0 && root.scrollIntoView) root.scrollIntoView({ block: "start" });
      } catch (e) { /* 보이지 않는 동안에는 건너뛴다 */ }
    }

    /* ── 0단계: 월급에서 빠지는 돈 (자동) ── */
    function runIntro() {
      var ledger = el("div", { class: "mo-ledger" });
      stage.appendChild(el("div", { class: "mo-step-title", text: "월급날입니다" }));
      stage.appendChild(ledger);

      function row(icon, name, amount, note) {
        ledger.appendChild(el("div", { class: "mo-row" }, [
          el("span", { class: "mo-row-ico", "aria-hidden": "true", text: icon }),
          el("div", { class: "mo-row-name" }, [el("b", { text: name }), note ? el("small", { text: note }) : null]),
          el("b", { class: "mo-row-amt " + (amount < 0 ? "minus" : "plus"), text: (amount < 0 ? "−" : "+") + Math.abs(amount) + "만 원" })
        ]));
        floatOn(boxCash, (amount < 0 ? "−" : "+") + Math.abs(amount) + "만 원", amount < 0);
      }
      function sum(name, amount) {
        ledger.appendChild(el("div", { class: "mo-row sum" }, [
          el("div", { class: "mo-row-name" }, [el("b", { text: name })]),
          el("b", { class: "mo-row-amt", text: amount + "만 원" })
        ]));
      }

      var steps = [
        function () { S.cash = SALARY; row("💰", "월급", SALARY); },
        function () {
          S.tax = TAX; S.cash -= TAX;
          row("🧾", "세금과 보험료", -TAX, "월급을 받기 전에 미리 빠집니다 (원천징수). 소비에 쓰는 돈이 아니어서 비소비지출이라고 합니다.");
        },
        function () { sum("실수령액", S.cash); }
      ];
      FIXED.forEach(function (f) {
        steps.push(function () { S.fixed += f.cost; S.cash -= f.cost; row(f.icon, "고정비 · " + f.name, -f.cost); });
      });
      steps.push(function () { sum("고정비를 내고 남은 돈", S.cash); });
      steps.push(askSaving);

      var gap = reduced ? 80 : 750;
      steps.forEach(function (fn, i) {
        later(function () { fn(); sync(gap * 0.8); }, 200 + i * gap);
      });
    }

    /* ── 1단계: 저축을 언제 할까 ── */
    function askSaving() {
      var buttons = [];
      function pick(amount) {
        if (S.week >= 0 || S.jarStart > 0) return;
        buttons.forEach(function (b, i) { b.disabled = true; b.classList.toggle("on", [0, 30, 60][i] === amount); });
        S.jar = amount;
        S.jarStart = amount;
        S.cash -= amount;
        S.week = 0;
        if (amount > 0) {
          floatOn(boxCash, "−" + amount + "만 원", true);
          floatOn(boxJar, "+" + amount + "만 원", false);
          ui.replay(boxJar, "is-pop");
        }
        sync(600);
        later(showWeek, reduced ? 60 : 800);
      }
      [0, 30, 60].forEach(function (amount) {
        var b = el("button", { class: "mo-save", type: "button", onclick: function () { pick(amount); } }, [
          el("b", { text: amount ? amount + "만 원" : "0원" }),
          el("span", { text: amount ? "먼저 떼어 놓는다" : "남으면 저축한다" }),
          el("small", { text: "생활비 " + (S.cash - amount) + "만 원" })
        ]);
        buttons.push(b);
      });
      stage.appendChild(el("div", { class: "mo-ask" }, [
        el("div", { class: "mo-step-title", text: "저축을 언제 할까요?" }),
        el("p", { text: "먼저 떼어 놓을 금액을 고릅니다. 0원을 고르면 한 달을 살고 남는 돈을 저축합니다." }),
        el("div", { class: "mo-saves" }, buttons)
      ]));
    }

    /* ── 2단계: 4주 동안의 선택 ── */
    function showWeek() {
      var cards = WEEKS[S.week];
      var last = S.week === WEEKS.length - 1;
      S.done = [false, false];
      S.asking = false;
      stWeek.textContent = (S.week + 1) + "/4";

      var nextBtn = el("button", { class: "gm-btn primary lg", type: "button", disabled: true, text: last ? "결산 보기" : "다음 주", onclick: nextWeek });
      var pips = el("div", { class: "mo-pips", "aria-hidden": "true" }, WEEKS.map(function (w, i) {
        return el("i", { class: i < S.week ? "past" : i === S.week ? "now" : "" });
      }));
      var grid = el("div", { class: "mo-cards" });

      function buildCard(card, idx) {
        var footBox = el("div", { class: "mo-card-foot" });
        var buttons = [];
        var box;

        function commit(oi, source) {
          var o = card.options[oi];
          var short = Math.max(0, o.cost - S.cash);
          var fromJar = short > 0 && source === "jar" ? Math.min(S.jar, short) : 0;
          var fromCard = short - fromJar;
          S.cash -= o.cost - short;
          S.jar -= fromJar;
          S.withdrawn += fromJar;
          S.card += fromCard;
          S[card.cat] += o.cost;
          S.joy = ui.clamp(S.joy + o.joy, 0, JOY_MAX);
          if (o.loan) S.loan += o.loan;
          S.done[idx] = true;
          S.asking = false;
          grid.classList.remove("asking");

          buttons.forEach(function (b, i) { b.disabled = true; b.classList.toggle("on", i === oi); });
          box.classList.add("done");
          footBox.innerHTML = "";
          if (fromJar > 0) footBox.appendChild(el("div", { class: "gm-msg warn", text: "저축에서 " + fromJar + "만 원을 꺼냈습니다. 저축이 " + S.jar + "만 원으로 줄었습니다." }));
          if (fromCard > 0) footBox.appendChild(el("div", { class: "gm-msg bad", text: "신용카드로 " + fromCard + "만 원을 냈습니다. 카드빚이 " + S.card + "만 원이 되었습니다." }));
          if (o.loan) footBox.appendChild(el("div", { class: "gm-msg bad", text: "할부 빚 " + o.loan + "만 원이 남았습니다. 다음 달부터 11개월 동안 8만 원씩 냅니다." }));
          if (o.after) footBox.appendChild(el("p", { class: "mo-after", text: o.after }));

          if (o.cost > 0) floatOn(boxCash, "−" + o.cost + "만 원", true);
          if (o.joy > 0) floatOn(boxJoy, "♥ +" + o.joy, false);
          if (fromJar > 0) { floatOn(boxJar, "−" + fromJar + "만 원", true); ui.replay(boxJar, "is-shake"); }
          if (fromCard > 0 || o.loan) ui.replay(boxDebt, "is-shake");
          sync(500);
          nextBtn.disabled = !(S.done[0] && S.done[1]);
        }

        function cancel() {
          S.asking = false;
          grid.classList.remove("asking");
          box.classList.remove("short");
          footBox.innerHTML = "";
          buttons.forEach(function (b) { b.disabled = false; b.classList.remove("on"); });
        }

        function tryPick(oi) {
          if (S.done[idx] || S.asking) return;
          var o = card.options[oi];
          var short = o.cost - S.cash;
          if (short <= 0) { commit(oi, null); return; }
          S.asking = true;
          grid.classList.add("asking");
          box.classList.add("short");
          buttons.forEach(function (b, i) { b.disabled = true; b.classList.toggle("on", i === oi); });
          var fromJar = Math.min(S.jar, short);
          var jarLabel = fromJar >= short ? "저축에서 " + short + "만 원을 꺼낸다"
            : "저축 " + fromJar + "만 원을 꺼내고 " + (short - fromJar) + "만 원은 카드로 낸다";
          footBox.innerHTML = "";
          footBox.appendChild(el("div", { class: "mo-short is-shake" }, [
            el("b", { text: "돈이 " + short + "만 원 모자랍니다." }),
            el("span", { text: S.jar > 0 ? "저축에서 꺼내거나 신용카드로 내야 합니다." : "저축해 둔 돈이 없습니다. 신용카드로 내야 합니다." }),
            el("div", { class: "gm-row" }, [
              S.jar > 0 ? el("button", { class: "gm-btn", type: "button", text: jarLabel, onclick: function () { commit(oi, "jar"); } }) : null,
              el("button", { class: "gm-btn red", type: "button", text: "신용카드로 " + short + "만 원을 낸다", onclick: function () { commit(oi, "card"); } }),
              el("button", { class: "gm-btn ghost", type: "button", text: "다시 고른다", onclick: cancel })
            ])
          ]));
        }

        var opts = el("div", { class: "mo-opts" }, card.options.map(function (o, oi) {
          var b = el("button", { class: "mo-opt", type: "button", onclick: function () { tryPick(oi); } }, [
            el("span", { class: "mo-opt-name", text: o.label }),
            el("span", { class: "mo-opt-meta" }, [
              el("em", { class: o.cost ? "minus" : "", text: o.cost ? "−" + o.cost + "만 원" : "0원" }),
              el("i", { class: o.joy ? "" : "zero", text: "♥︎ +" + o.joy })
            ]),
            o.sub ? el("span", { class: "mo-opt-sub", text: o.sub }) : null
          ]);
          buttons.push(b);
          return b;
        }));

        box = el("div", { class: "mo-card mo-card-" + card.cat }, [
          el("div", { class: "mo-card-head" }, [
            el("span", { class: "mo-card-ico", "aria-hidden": "true", text: card.icon }),
            el("div", null, [
              el("b", { text: card.title }),
              el("span", { text: card.desc }),
              card.note ? el("small", { text: card.note }) : null
            ])
          ]),
          opts,
          footBox
        ]);
        return box;
      }

      stage.innerHTML = "";
      stage.appendChild(el("div", { class: "mo-week-head" }, [
        el("div", { class: "mo-step-title", text: (S.week + 1) + "주" }),
        pips
      ]));
      if (S.week === 0) {
        stage.appendChild(el("div", {
          class: "gm-msg" + (S.jarStart > 0 ? " good" : ""),
          text: S.jarStart > 0
            ? S.jarStart + "만 원을 먼저 저축으로 옮겼습니다. 남은 " + S.cash + "만 원으로 4주를 삽니다."
            : "먼저 떼어 놓지 않았습니다. " + S.cash + "만 원으로 4주를 살고 남으면 저축합니다."
        }));
      }
      cards.forEach(function (card, idx) { grid.appendChild(buildCard(card, idx)); });
      stage.appendChild(grid);
      stage.appendChild(el("div", { class: "gm-row center" }, [nextBtn]));
      keepInView();
    }

    function nextWeek() {
      if (!(S.done[0] && S.done[1])) return;
      clearTimers();
      S.week += 1;
      if (S.week >= WEEKS.length) finish();
      else showWeek();
    }

    /* ── 결산 ── */
    function pct(v) {
      return String(Math.round((v / SALARY) * 1000) / 10);
    }

    function donut(total) {
      var size = 220, c = size / 2, r = 76, len = 2 * Math.PI * r;
      var svg = sv("svg", { class: "mo-donut", viewBox: "0 0 " + size + " " + size, role: "img", "aria-label": "한 달 결산 그래프" });
      svg.appendChild(sv("circle", { cx: c, cy: c, r: r, class: "mo-donut-track" }));
      var acc = 0;
      var arcs = [];
      CATS.forEach(function (cat) {
        var v = S[cat.key];
        if (v <= 0) return;
        var full = (v / total) * len;
        var draw = full > 6 ? full - 2 : full;
        var arc = sv("circle", { cx: c, cy: c, r: r, class: "mo-arc mo-s-" + cat.key, transform: "rotate(-90 " + c + " " + c + ")" });
        arc.style.strokeDasharray = (reduced ? draw : 0) + " " + len;
        arc.style.strokeDashoffset = String(-acc);
        arc.appendChild(sv("title", null, cat.name + " " + v + "만 원"));
        arcs.push([arc, draw]);
        acc += full;
        svg.appendChild(arc);
      });
      svg.appendChild(sv("text", { x: c, y: c - 12, "text-anchor": "middle", class: "mo-donut-cap" }, "합계"));
      svg.appendChild(sv("text", { x: c, y: c + 18, "text-anchor": "middle", class: "mo-donut-num" }, total + "만 원"));
      later(function () {
        arcs.forEach(function (a) { a[0].style.strokeDasharray = a[1] + " " + len; });
      }, 80);
      return svg;
    }

    function finish() {
      var debt = S.card + S.loan;
      var total = 0;
      CATS.forEach(function (c) { total += S[c.key]; });   /* = 250 + 카드빚 */
      stWeek.textContent = "결산";
      stage.innerHTML = "";
      stage.classList.add("gm-hide");
      foot.classList.add("gm-hide");

      var table = el("div", { class: "mo-table" }, CATS.map(function (c) {
        var amount = el("b", { text: "0만 원" });
        ui.countUp(amount, S[c.key], 900, man);
        return el("div", { class: "mo-tr" }, [el("i", { class: "mo-c-" + c.key }), el("span", { text: c.name }), amount]);
      }));
      table.appendChild(el("div", { class: "mo-tr sum" }, [el("i"), el("span", { text: "합계" }), el("b", { text: total + "만 원" })]));

      var savedLine;
      if (S.jar >= 60) savedLine = "소득의 24% 이상을 저축했습니다.";
      else if (S.jar > 0) savedLine = "소득의 " + pct(S.jar) + "%를 저축했습니다." + (S.withdrawn > 0 ? " 떼어 놓은 돈 중 " + S.withdrawn + "만 원은 다시 꺼내 썼습니다." : "");
      else if (S.jarStart > 0) savedLine = "떼어 놓은 저축 " + S.jarStart + "만 원을 모두 꺼내 썼습니다. 저축한 돈이 없습니다.";
      else if (S.cash > 0) savedLine = "먼저 떼어 놓은 저축이 없습니다. 남은 돈 " + S.cash + "만 원은 저축 통장으로 옮겨야 지킬 수 있습니다.";
      else savedLine = "저축한 돈이 없습니다.";

      var debtLine = null;
      if (S.card > 0 && S.loan > 0) debtLine = "빚이 " + debt + "만 원 남았습니다. 카드빚 " + S.card + "만 원과 할부 " + S.loan + "만 원입니다. 카드빚은 다음 달 월급에서 갚아야 합니다.";
      else if (S.card > 0) debtLine = "카드빚 " + S.card + "만 원이 남았습니다. 다음 달 월급에서 갚아야 합니다.";
      else if (S.loan > 0) debtLine = "휴대폰 할부 " + S.loan + "만 원이 남았습니다. 다음 달부터 11개월 동안 고정비가 8만 원씩 늘어납니다.";

      result.innerHTML = "";
      result.appendChild(el("h4", { text: "한 달 결산" }));
      result.appendChild(el("div", { class: "mo-final" }, [donut(total), table]));
      result.appendChild(el("p", {
        class: "mo-check",
        text: S.card > 0
          ? "합계 " + total + "만 원 = 월급 " + SALARY + "만 원 + 카드빚 " + S.card + "만 원"
          : "합계 " + total + "만 원 = 월급 " + SALARY + "만 원"
      }));
      result.appendChild(el("div", { class: "gm-stats mo-end-stats" }, [
        el("div", { class: "gm-stat green" }, [el("span", { text: "저축률" }), el("b", { text: pct(S.jar) + "%" }), el("small", { text: "저축 " + S.jar + "만 ÷ 월급 " + SALARY + "만" })]),
        debt > 0 ? el("div", { class: "gm-stat red" }, [
          el("span", { text: "빚" }), el("b", { text: debt + "만 원" }),
          el("small", { text: S.card > 0 && S.loan > 0 ? "카드빚 " + S.card + "만 + 할부 " + S.loan + "만" : S.card > 0 ? "카드빚" : "휴대폰 할부 남은 금액" })
        ]) : el("div", { class: "gm-stat" }, [el("span", { text: "빚" }), el("b", { text: "없음" }), el("small", { text: "카드빚과 할부가 없습니다" })]),
        el("div", { class: "gm-stat" }, [el("span", { text: "만족" }), el("b", { text: S.joy + " / " + JOY_MAX }), el("small", { text: "♥︎ 하나가 2점입니다" })])
      ]));
      result.appendChild(el("p", { class: "mo-sum-line", text: savedLine }));
      if (debtLine) result.appendChild(el("p", { class: "mo-sum-line debt", text: debtLine }));
      if (S.card > 0 && S.jar > 0) {
        result.appendChild(el("p", {
          class: "mo-sum-line debt",
          text: "저축 " + S.jar + "만 원에서 카드빚 " + S.card + "만 원을 빼면 " + (S.jar >= S.card ? "실제로 모은 돈은 " + (S.jar - S.card) + "만 원입니다." : "모은 돈보다 빚이 " + (S.card - S.jar) + "만 원 더 많습니다.")
        }));
      }
      result.appendChild(el("div", { class: "gm-lesson" }, [
        el("b", { text: "저축은 쓰고 남은 돈이 아니라 먼저 떼어 놓는 돈입니다." }),
        " 꼭 필요한 지출과 갖고 싶은 지출을 나누면 줄일 곳이 보입니다. 할부와 카드는 다음 달의 나에게서 빌리는 돈입니다."
      ]));
      result.appendChild(el("div", { class: "gm-row center" }, [
        el("button", { class: "gm-btn primary", type: "button", text: "다시 하기", onclick: restart })
      ]));
      result.classList.remove("gm-hide");
      keepInView();
    }

    showStart();
  };
})();
