/* 마을 가로등: 함께 쓰는 것을 위해 얼마를 낼지 정하는 놀이 */
(function () {
  "use strict";
  window.EcoGames = window.EcoGames || {};
  window.EcoGames["lamp"] = function (root, ui) {
    var el = ui.el;
    var ROUNDS = 6, FREE = 3, GIVE = 10, LAMPS = 8;
    var P = [
      { name: "나", face: "🙂" },
      { name: "하나", face: "😊" },
      { name: "두리", face: "🤔" },
      { name: "세찌", face: "😎" }
    ];

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
    function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
    /* 코인은 2.5 단위로만 움직인다. */
    function fc(v) {
      var r = Math.round(v * 2) / 2;
      return r % 1 === 0 ? String(r) : r.toFixed(1);
    }
    /* 숫자를 바로 바꾼다. 아직 돌고 있던 숫자 올리기의 마지막 장면이 덮어쓰지 못하게 한 번 더 건다. */
    function setNow(node, v, f) {
      node.setAttribute("data-now", v);
      node.textContent = f(v);
      ui.countUp(node, v, 1, f);
    }

    /* ---------- 화면 틀 ---------- */
    var body = ui.frame(root, {
      badge: "미니게임",
      title: "마을 가로등",
      sub: "네 사람이 가로등 모금함에 얼마를 낼지 정합니다."
    });

    var msg = el("div", { class: "gm-msg" });

    var stRound = el("b"), stMode = el("b"), stMine = el("b", { "data-now": "0" }), stAll = el("b", { "data-now": "0" });
    var stModeBox = el("div", { class: "gm-stat" }, [el("span", { text: "걷는 방식" }), stMode]);
    var stats = el("div", { class: "gm-stats" }, [
      el("div", { class: "gm-stat" }, [el("span", { text: "회차" }), stRound]),
      stModeBox,
      el("div", { class: "gm-stat blue" }, [el("span", { text: "내 코인" }), stMine]),
      el("div", { class: "gm-stat" }, [el("span", { text: "마을 전체 코인" }), stAll])
    ]);

    /* 거리와 가로등 */
    var lamps = [];
    var lampRow = el("div", { class: "lp-lamps" });
    for (var i = 0; i < LAMPS; i++) {
      var lamp = el("div", { class: "lp-lamp" }, [
        el("i", { class: "lp-pool" }), el("i", { class: "lp-pole" }), el("i", { class: "lp-head" })
      ]);
      lamp.style.transitionDelay = (i * 70) + "ms";
      lamps.push(lamp);
      lampRow.appendChild(lamp);
    }
    var street = el("div", { class: "lp-street", role: "img" }, [
      el("span", { class: "lp-moon", text: "🌙" }),
      el("div", { class: "lp-houses", text: "🏠 🏡 🏠 🏡 🏠" }),
      lampRow,
      el("div", { class: "lp-ground" })
    ]);
    var streetCap = el("div", { class: "lp-cap" });

    /* 모금함 */
    var potNum = el("b", { class: "lp-potnum", "data-now": "0", text: "0" });
    var potX2 = el("span", { class: "lp-x2", text: "두 배" });
    var potNote = el("div", { class: "lp-potnote" });
    var pot = el("div", { class: "lp-pot" }, [
      el("div", { class: "lp-slot" }),
      el("div", { class: "lp-potlabel", text: "가로등 모금함" }),
      el("div", { class: "lp-potval" }, [potNum, el("small", { text: "코인" })]),
      potX2
    ]);

    /* 네 사람 */
    var people = P.map(function (p, idx) {
      var bubble = el("div", { class: "lp-bubble", text: "" });
      var face = el("div", { class: "lp-face", text: p.face });
      var total = el("b", { "data-now": "0", text: "0" });
      var tag = el("div", { class: "lp-tag gm-hide", text: "가장 많이 얻음" });
      var box = el("div", { class: "lp-person" + (idx === 0 ? " me" : "") }, [
        bubble, face,
        el("div", { class: "lp-name", text: p.name }),
        el("div", { class: "lp-total" }, [total, el("small", { text: "코인" })]),
        tag
      ]);
      return { box: box, bubble: bubble, face: face, total: total, tag: tag };
    });
    var peopleRow = el("div", { class: "lp-people" }, people.map(function (p) { return p.box; }));

    var stage = el("div", { class: "lp-stage" }, [street, streetCap, pot, potNote, peopleRow]);

    /* 고르기 */
    var giveBtns = [0, 5, 10].map(function (v) {
      var b = el("button", { type: "button", class: "gm-btn lg lp-give" + (v === 10 ? " primary" : ""), text: v + "코인" });
      b.addEventListener("click", function () { if (S && !S.busy && !S.done && S.round < FREE) play(v); });
      return b;
    });
    var chooseBox = el("div", { class: "lp-choose" }, [
      el("div", { class: "lp-ask", text: "받은 10코인 가운데 얼마를 모금함에 넣겠습니까?" }),
      el("div", { class: "lp-givebtns" }, giveBtns)
    ]);
    var taxBtn = el("button", { type: "button", class: "gm-btn lg primary", text: "세금 내기" });
    taxBtn.addEventListener("click", function () { if (S && !S.busy && !S.done && S.round >= FREE) play(GIVE); });
    var taxBox = el("div", { class: "lp-taxcard gm-hide" }, [
      el("div", { class: "lp-taxicon", text: "📜" }),
      el("div", { class: "lp-taxtext" }, [
        el("b", { text: "마을 회의에서 세금으로 걷기로 했습니다." }),
        el("span", { text: "이제부터 네 사람 모두 10코인씩 냅니다." })
      ]),
      taxBtn
    ]);
    var control = el("div", { class: "lp-control" }, [chooseBox, taxBox]);

    /* 회차별 표 */
    var tbody = el("tbody");
    var footCells = P.map(function () { return el("td", { class: "num", text: "0" }); });
    var table = el("table", { class: "lp-table" }, [
      el("thead", null, el("tr", null, [el("th", { text: "회" })].concat(P.map(function (p) {
        return el("th", { class: "num" }, [el("span", { class: "lp-thface", text: p.face }), el("span", { text: p.name })]);
      })).concat([el("th", { class: "num", text: "모금함" })]))),
      tbody,
      el("tfoot", null, el("tr", null, [el("th", { scope: "row", text: "누적" })].concat(footCells).concat([el("td")])))
    ]);
    var tableBox = el("div", { class: "lp-tablebox" }, [
      el("div", { class: "lp-tablewrap" }, table),
      el("div", { class: "lp-tablecap", text: "윗줄은 낸 코인, 아랫줄은 그 회에 얻은 코인입니다. 얻은 코인은 10에서 낸 코인을 빼고 나누어 받은 몫을 더한 값입니다." })
    ]);

    var btnReset = el("button", { type: "button", class: "gm-btn ghost", text: "다시 하기" });
    btnReset.addEventListener("click", function () { start(); });
    var btnRow = el("div", { class: "gm-row" }, [btnReset]);

    var result = el("div", { class: "gm-result lp-result gm-hide" });

    body.appendChild(msg);
    body.appendChild(stats);
    body.appendChild(stage);
    body.appendChild(control);
    body.appendChild(tableBox);
    body.appendChild(btnRow);
    body.appendChild(result);

    /* ---------- 규칙 ---------- */
    /* 하나·두리·세찌가 r회(1부터)에 내는 코인 */
    function botMoves(r) {
      if (r === 1) return [10, 5, 0];
      var p = S.rounds[r - 2].paid;
      var othersAvg = (p[0] + p[2] + p[3]) / 3;                 /* 하나가 본 다른 세 사람의 평균 */
      var hana = othersAvg < 2.5 ? 0 : (othersAvg >= 5 ? 10 : 5);
      var allAvg = (p[0] + p[1] + p[2] + p[3]) / 4;             /* 두리는 네 사람 평균을 따라간다 */
      var duri = Math.max(0, Math.min(10, Math.round(allAvg / 5) * 5));
      return [hana, duri, 0];
    }

    function phaseTotals(from, to) {
      var t = [0, 0, 0, 0];
      S.rounds.slice(from, to).forEach(function (r) { r.earn.forEach(function (e, i) { t[i] += e; }); });
      return t;
    }

    /* ---------- 그리기 ---------- */
    function setMsg(kind, text) {
      msg.className = "gm-msg" + (kind ? " " + kind : "");
      msg.textContent = text;
    }

    function setLamps(potCoins) {
      var lit = Math.round(potCoins / (GIVE * P.length) * LAMPS);
      lamps.forEach(function (l, i) { l.classList.toggle("on", i < lit); });
      street.style.setProperty("--lp-lit", String(lit / LAMPS));
      street.setAttribute("aria-label", "가로등 " + LAMPS + "개 가운데 " + lit + "개 켜짐");
      streetCap.textContent = lit === 0
        ? "가로등이 모두 꺼져 있습니다."
        : (lit === LAMPS ? "가로등 " + LAMPS + "개가 모두 켜졌습니다." : "가로등 " + LAMPS + "개 가운데 " + lit + "개가 켜졌습니다.");
    }

    function renderStats(animate) {
      var cur = Math.min(S.round + 1, ROUNDS);
      var tax = S.round >= FREE;
      stRound.textContent = cur + " / " + ROUNDS + "회";
      stMode.textContent = tax ? "세금" : "자율 모금";
      stModeBox.classList.toggle("green", tax);
      function put(node, v) { if (animate) ui.countUp(node, v, 500, fc); else setNow(node, v, fc); }
      put(stMine, S.totals[0]);
      put(stAll, sum(S.totals));
      people.forEach(function (p, i) { put(p.total, S.totals[i]); });
      footCells.forEach(function (c, i) { c.textContent = fc(S.totals[i]); });
    }

    function renderControl() {
      var tax = S.round >= FREE;
      control.classList.toggle("gm-hide", S.done);
      chooseBox.classList.toggle("gm-hide", tax);
      taxBox.classList.toggle("gm-hide", !tax);
      giveBtns.forEach(function (b) { b.disabled = S.busy || S.done; });
      taxBtn.disabled = S.busy || S.done;
      taxBtn.textContent = "세금 내기";
    }

    function cell(top, bottom, cls) {
      return el("td", { class: "num" + (cls ? " " + cls : "") }, [
        el("span", { class: "lp-paid", text: top }), el("b", { text: bottom })
      ]);
    }

    function addRoundRow(n, r) {
      var tr = el("tr", { class: "lp-row" }, [el("th", { scope: "row", text: n + "회" })]
        .concat(r.paid.map(function (c, i) { return cell(c === 0 ? "안 냄" : c + " 냄", fc(r.earn[i]), c === 0 ? "zero" : ""); }))
        .concat([cell(r.pot + " 모임", "몫 " + fc(r.share))]));
      tbody.appendChild(tr);
    }

    function addSumRow(label, t, markTop) {
      var max = Math.max.apply(null, t);
      var tr = el("tr", { class: "lp-sum" }, [el("th", { scope: "row", text: label })]
        .concat(t.map(function (v) {
          var top = markTop && v === max;
          return el("td", { class: "num" + (top ? " top" : "") }, [el("b", { text: fc(v) }), top ? el("span", { class: "lp-best", text: "가장 많음" }) : null]);
        }))
        .concat([el("td", { class: "num" }, el("b", { text: fc(sum(t)) }))]));
      tbody.appendChild(tr);
    }

    function addNoteRow(text) {
      tbody.appendChild(el("tr", { class: "lp-noterow" }, el("td", { colspan: "6", text: text })));
    }

    /* 동전 하나를 from 에서 to 로 날린다. */
    function fly(from, to, delay, dur) {
      if (reduced()) return;
      later(function () {
        var s = stage.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
        if (!s.width || !a.width || !b.width) return;
        var x0 = a.left + a.width / 2 - s.left, y0 = a.top + a.height / 2 - s.top;
        var x1 = b.left + b.width / 2 - s.left, y1 = b.top + b.height / 2 - s.top;
        var c = el("span", { class: "lp-coin" });
        c.style.left = x0 + "px";
        c.style.top = y0 + "px";
        stage.appendChild(c);
        void c.offsetWidth;
        c.style.transitionDuration = dur + "ms";
        c.style.transform = "translate(" + (x1 - x0).toFixed(1) + "px," + (y1 - y0).toFixed(1) + "px)";
        later(function () { c.remove(); }, dur + 60);
      }, delay);
    }

    /* ---------- 한 회 진행 ---------- */
    function play(myGive) {
      if (S.busy || S.done) return;
      S.busy = true;
      var n = S.round + 1;
      var tax = n > FREE;
      var paid = tax ? [GIVE, GIVE, GIVE, GIVE] : [myGive].concat(botMoves(n));
      var potCoins = sum(paid);
      var share = potCoins * 2 / P.length;
      var earn = paid.map(function (c) { return GIVE - c + share; });
      var R = { paid: paid, pot: potCoins, share: share, earn: earn };
      var k = reduced() ? 0.2 : 1;

      renderControl();
      people.forEach(function (p) { p.tag.classList.add("gm-hide"); p.box.classList.remove("is-top"); });

      /* 1) 각자 낸다 */
      potX2.classList.remove("is-on");
      setNow(potNum, 0, fc);
      potNote.textContent = "";
      setMsg("", tax ? n + "회: 세금으로 네 사람 모두 10코인씩 냅니다." : n + "회: 각자 정한 만큼 모금함에 넣습니다.");
      people.forEach(function (p, i) {
        p.bubble.textContent = paid[i] === 0 ? "안 냄" : paid[i] + " 냄";
        p.bubble.className = "lp-bubble is-on" + (paid[i] === 0 ? " zero" : "");
        ui.replay(p.bubble, "is-pop");
        for (var c = 0; c < paid[i] / 5; c++) fly(p.face, pot, 80 + c * 140 + i * 60, 560);
      });

      /* 2) 모금함에 모인다 */
      later(function () {
        ui.countUp(potNum, potCoins, 350, fc);
        ui.replay(pot, "is-pop");
        setMsg("", n + "회: 모금함에 " + potCoins + "코인이 모였습니다.");
      }, 850 * k);

      /* 3) 두 배가 되고 가로등이 켜진다 */
      later(function () {
        potX2.classList.add("is-on");
        ui.replay(potX2, "is-pop");
        ui.countUp(potNum, potCoins * 2, 450, fc);
        setLamps(potCoins);
        setMsg("", n + "회: 모금함이 두 배가 되어 " + (potCoins * 2) + "코인입니다. 네 사람이 " + fc(share) + "코인씩 똑같이 나눕니다.");
      }, 1650 * k);

      /* 4) 똑같이 나누어 돌려받는다 */
      later(function () {
        potNote.textContent = "한 사람 몫 " + fc(share) + "코인";
        if (share > 0) {
          people.forEach(function (p, i) {
            fly(pot, p.face, i * 70, 560);
            fly(pot, p.face, 130 + i * 70, 560);
          });
        }
      }, 2500 * k);

      /* 5) 셈을 마친다 */
      later(function () {
        S.rounds.push(R);
        earn.forEach(function (e, i) { S.totals[i] += e; });
        S.round = n;
        people.forEach(function (p, i) {
          p.bubble.textContent = "+" + fc(earn[i]);
          p.bubble.className = "lp-bubble is-on gain";
          ui.replay(p.bubble, "is-pop");
        });
        addRoundRow(n, R);
        renderStats(true);

        if (n === FREE) {
          var t = phaseTotals(0, FREE);
          var max = Math.max.apply(null, t);
          addSumRow("1~3회", t, true);
          addNoteRow("4회부터는 세금으로 걷습니다.");
          people.forEach(function (p, i) {
            var top = t[i] === max;
            p.tag.classList.toggle("gm-hide", !top);
            p.box.classList.toggle("is-top", top);
          });
          var meToo = t[0] === max;
          setMsg("warn", "자율 모금 3회 동안 한 코인도 내지 않은 " + (meToo ? "나와 세찌가 " : "세찌가 ") + fc(max) +
            "코인으로 가장 많이 얻었습니다. 마을 회의가 열립니다.");
          ui.replay(taxBox, "is-in");
        } else if (n === ROUNDS) {
          addSumRow("4~6회", phaseTotals(FREE, ROUNDS), false);
        } else if (tax) {
          setMsg("good", n + "회: 모두 10코인을 내고 20코인씩 얻었습니다. 가로등이 모두 켜졌습니다.");
        } else {
          var mine = earn[0], sej = earn[3];
          setMsg(potCoins === 0 ? "bad" : "", n + "회: 나는 " + fc(mine) + "코인, 세찌는 " + fc(sej) + "코인을 얻었습니다." +
            (potCoins === 0 ? " 아무도 내지 않아 가로등이 꺼졌습니다." : ""));
        }

        if (n >= ROUNDS) {
          S.done = true;
          S.busy = false;
          renderControl();
          later(finish, 500 * k);
        } else {
          later(function () { S.busy = false; renderControl(); }, 250 * k);
        }
      }, 3200 * k);
    }

    function finish() {
      var a = phaseTotals(0, FREE), b = phaseTotals(FREE, ROUNDS);
      var best = Math.max.apply(null, a);
      var rows = P.map(function (p, i) {
        return el("tr", null, [
          el("th", { scope: "row" }, [el("span", { class: "lp-thface", text: p.face }), " " + p.name]),
          el("td", { class: "num" + (a[i] === best ? " top" : ""), text: fc(a[i]) }),
          el("td", { class: "num", text: fc(b[i]) }),
          el("td", { class: "num sum", text: fc(a[i] + b[i]) })
        ]);
      });
      rows.push(el("tr", { class: "lp-allrow" }, [
        el("th", { scope: "row", text: "마을 전체" }),
        el("td", { class: "num", text: fc(sum(a)) }),
        el("td", { class: "num", text: fc(sum(b)) }),
        el("td", { class: "num sum", text: fc(sum(a) + sum(b)) })
      ]));
      var table2 = el("table", { class: "lp-table lp-final" }, [
        el("thead", null, el("tr", null, [
          el("th", { text: "얻은 코인" }),
          el("th", { class: "num", text: "자율 모금 (1~3회)" }),
          el("th", { class: "num", text: "세금 (4~6회)" }),
          el("th", { class: "num", text: "합계" })
        ])),
        el("tbody", null, rows)
      ]);
      var maxPhase = FREE * (GIVE * P.length * 2);

      result.innerHTML = "";
      result.appendChild(el("h4", { text: "6회가 끝났습니다" }));
      result.appendChild(el("p", {
        text: "자율 모금 3회 동안 마을 전체가 얻은 코인은 " + fc(sum(a)) + "코인입니다. 세금으로 걷은 3회 동안은 " + fc(sum(b)) + "코인입니다."
      }));
      result.appendChild(el("div", { class: "lp-tablewrap" }, table2));
      result.appendChild(el("p", {
        text: "한 회에 모두 10코인씩 내면 마을 전체가 80코인을 얻고, 아무도 내지 않으면 40코인을 얻습니다. 3회 동안 가장 많이 얻을 수 있는 코인은 " + maxPhase + "코인입니다."
      }));
      if (a[3] > b[3]) {
        result.appendChild(el("p", {
          text: "세찌는 자율 모금 때 " + fc(a[3]) + "코인, 세금 때 " + fc(b[3]) + "코인을 얻었습니다. 내지 않던 사람은 세금을 내면 몫이 줄기 때문에 스스로 내려 하지 않습니다."
        }));
      } else {
        result.appendChild(el("p", {
          text: "자율 모금 때 가장 많이 얻은 사람은 한 코인도 내지 않은 사람입니다. 그 결과 모금함에 모인 코인이 적어 모두의 몫이 줄었습니다."
        }));
      }
      result.appendChild(el("div", { class: "gm-lesson" }, [
        el("b", { text: "돈을 내지 않아도 가로등 불빛은 똑같이 받습니다." }),
        " 그래서 각자에게는 내지 않는 쪽이 이익이고, 모두가 그렇게 하면 가로등은 켜지지 않습니다. 함께 쓰는 것을 세금으로 마련하는 이유입니다."
      ]));
      result.classList.remove("gm-hide");
      ui.replay(result, "is-in");
      setMsg("", "6회가 끝났습니다. 아래에서 자율 모금과 세금을 견주어 봅니다.");
    }

    function start() {
      clearTimers();
      Array.prototype.slice.call(stage.querySelectorAll(".lp-coin")).forEach(function (c) { c.remove(); });
      S = { round: 0, rounds: [], totals: [0, 0, 0, 0], busy: false, done: false };
      tbody.innerHTML = "";
      result.classList.add("gm-hide");
      result.innerHTML = "";
      people.forEach(function (p) {
        p.bubble.textContent = "";
        p.bubble.className = "lp-bubble";
        p.tag.classList.add("gm-hide");
        p.box.classList.remove("is-top");
      });
      potX2.classList.remove("is-on");
      setNow(potNum, 0, fc);
      potNote.textContent = "";
      setLamps(0);
      setMsg("", "목표: 6회 동안 코인을 모읍니다. 모금함에 넣은 코인은 두 배가 되어 네 사람에게 똑같이 나뉩니다.");
      renderStats(false);
      renderControl();
    }

    start();
  };
})();
