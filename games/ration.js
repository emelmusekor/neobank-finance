/* 빵 두 개, 손님 다섯: 모자란 것을 나누는 규칙 네 가지 */
(function () {
  window.EcoGames = window.EcoGames || {};
  window.EcoGames["ration"] = function (root, ui) {
    var el = ui.el;
    var BREAD = "🍞";

    /* 도착 순서, 낼 수 있는 값, 배고픈 정도가 서로 어긋나도록 정했다.
       먼저 온 순서: 가온·나래 / 값: 라온·다솜 / 배고픔: 마루·나래 */
    var PEOPLE = [
      { name: "가온", face: "👦", order: 1, pay: 2000, hunger: 2 },
      { name: "나래", face: "👧", order: 2, pay: 1500, hunger: 4 },
      { name: "다솜", face: "👩", order: 3, pay: 6000, hunger: 1 },
      { name: "라온", face: "👨", order: 4, pay: 8000, hunger: 3 },
      { name: "마루", face: "👵", order: 5, pay: 3500, hunger: 5 }
    ];

    var RULES = [
      { id: "first", label: "먼저 온 순서", pre: "치른 대가는 ", cost: "기다린 시간" },
      { id: "lot", label: "추첨", pre: "빵을 가른 것은 ", cost: "운" },
      { id: "price", label: "값을 많이 내는 순서", pre: "치른 대가는 ", cost: "돈" },
      { id: "need", label: "가장 배고픈 순서", pre: "치른 대가는 ", cost: "필요를 증명하는 수고" }
    ];

    var rand = ui.rng((Date.now() % 2147483000) + 1);
    var timers = [];
    var tried = {};

    function later(fn, ms) {
      var id = setTimeout(function () {
        var i = timers.indexOf(id);
        if (i >= 0) timers.splice(i, 1);
        fn();
      }, ms);
      timers.push(id);
      return id;
    }
    function clearTimers() {
      timers.forEach(function (id) { clearTimeout(id); });
      timers = [];
    }
    function reduced() {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
    function batchim(word) {
      var c = word.charCodeAt(word.length - 1) - 0xac00;
      return c >= 0 && c <= 11171 && c % 28 !== 0;
    }
    function topTwo(key, dir) {
      var idx = PEOPLE.map(function (p, i) { return i; });
      idx.sort(function (a, b) { return (PEOPLE[a][key] - PEOPLE[b][key]) * dir; });
      return idx.slice(0, 2);
    }
    function drawTwo() {
      var a = Math.floor(rand() * 5);
      var b = Math.floor(rand() * 4);
      if (b >= a) b += 1;
      return a < b ? [a, b] : [b, a];
    }
    function pickFor(rule) {
      if (rule.id === "first") return topTwo("order", 1);
      if (rule.id === "price") return topTwo("pay", -1);
      if (rule.id === "need") return topTwo("hunger", -1);
      return drawTwo();
    }

    var body = ui.frame(root, {
      badge: "체험",
      title: "빵 두 개, 손님 다섯",
      sub: "빵을 나누는 규칙 네 가지를 모두 눌러 봅니다."
    });

    /* 규칙 버튼 */
    var ruleBtns = {};
    var rulesBox = el("div", { class: "rt-rules" }, RULES.map(function (rule) {
      var btn = el("button", {
        type: "button",
        class: "gm-btn rt-rule",
        onclick: function () { choose(rule); }
      }, [el("span", { class: "rt-check", text: "✓", "aria-hidden": "true" }), el("span", { text: rule.label })]);
      ruleBtns[rule.id] = btn;
      return btn;
    }));

    /* 빵과 손님 */
    var slots = [0, 1].map(function () { return el("span", { class: "rt-slot", text: BREAD }); });
    var flies = [0, 1].map(function () { return el("span", { class: "rt-fly", text: BREAD, "aria-hidden": "true" }); });
    var cards = PEOPLE.map(function (p) {
      var dots = el("span", { class: "rt-dots", role: "img", "aria-label": "5단계 가운데 " + p.hunger + "단계" },
        [1, 2, 3, 4, 5].map(function (n) { return el("i", { class: n <= p.hunger ? "on" : null }); }));
      var got = el("span", { class: "rt-got", text: BREAD, "aria-hidden": "true" });
      var node = el("div", { class: "rt-card" }, [
        got,
        el("div", { class: "rt-face", text: p.face }),
        el("div", { class: "rt-name", text: p.name }),
        el("div", { class: "rt-attr a-first" }, [el("span", { text: "도착" }), el("b", { text: p.order + "번째" })]),
        el("div", { class: "rt-attr a-price" }, [el("span", { text: "값" }), el("b", { text: ui.fmt(p.pay) + "원" })]),
        el("div", { class: "rt-attr a-need" }, [el("span", { text: "배고픔" }), dots])
      ]);
      return { node: node, got: got };
    });

    var stage = el("div", { class: "rt-stage" }, [
      el("div", { class: "rt-plate" }, [
        el("span", { class: "rt-plate-label", text: "남은 빵은 두 개입니다" }),
        el("div", { class: "rt-slots" }, slots)
      ]),
      el("div", { class: "rt-people" }, cards.map(function (c) { return c.node; })),
      flies[0],
      flies[1]
    ]);

    var note = el("p", { class: "rt-note", text: "값은 빵 하나에 낼 수 있는 돈입니다. 배고픔은 점이 많을수록 큽니다." });
    var msg = el("div", { class: "gm-msg" });

    /* 해 본 규칙 */
    var tallyCount = el("b", { text: "0 / 4" });
    var tallyRows = {};
    var tally = el("div", { class: "rt-tally" }, [
      el("div", { class: "rt-tally-head" }, [el("span", { text: "해 본 규칙" }), tallyCount])
    ].concat(RULES.map(function (rule) {
      var who = el("span", { class: "rt-t-who", text: "–" });
      var cost = el("span", { class: "rt-t-cost", text: "" });
      var row = el("div", { class: "rt-trow" }, [
        el("span", { class: "rt-t-rule" }, [el("i", { "aria-hidden": "true" }), el("span", { text: rule.label })]),
        who,
        cost
      ]);
      tallyRows[rule.id] = { row: row, who: who, cost: cost };
      return row;
    })));

    var lesson = el("div", {
      class: "gm-lesson gm-hide",
      text: "빵은 어떤 규칙으로 나누어도 두 개뿐입니다. 규칙이 바뀌면 빵을 얻는 사람과 치르는 대가가 달라집니다. 시장은 그 가운데 값을 많이 내는 순서를 쓰는 방식입니다."
    });

    var againBtn = el("button", { type: "button", class: "gm-btn", text: "다시 하기", onclick: restart });

    body.appendChild(rulesBox);
    body.appendChild(stage);
    body.appendChild(note);
    body.appendChild(msg);
    body.appendChild(tally);
    body.appendChild(lesson);
    body.appendChild(el("div", { class: "gm-row center" }, [againBtn]));

    function setMsg(children, kind) {
      msg.className = "gm-msg" + (kind ? " " + kind : "");
      msg.innerHTML = "";
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        msg.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      });
    }

    function resetStage() {
      cards.forEach(function (c) { c.node.classList.remove("is-win", "is-lose", "is-roll"); });
      slots.forEach(function (s) { s.classList.remove("is-empty"); });
      flies.forEach(function (f) { f.classList.remove("is-on"); });
    }

    function markActive(id) {
      RULES.forEach(function (rule) {
        ruleBtns[rule.id].classList.toggle("primary", rule.id === id);
        ruleBtns[rule.id].classList.toggle("is-tried", !!tried[rule.id]);
      });
      if (id) stage.setAttribute("data-rule", id);
      else stage.removeAttribute("data-rule");
    }

    function choose(rule) {
      clearTimers();
      resetStage();
      markActive(rule.id);
      var pair = pickFor(rule);
      if (rule.id !== "lot" || reduced()) {
        setMsg("빵을 나누고 있습니다.");
        deliver(rule, pair);
        return;
      }
      setMsg("추첨하고 있습니다.");
      var n = 0;
      (function roll() {
        cards.forEach(function (c) { c.node.classList.remove("is-roll"); });
        if (n >= 9) { deliver(rule, pair); return; }
        drawTwo().forEach(function (i) { cards[i].node.classList.add("is-roll"); });
        n += 1;
        later(roll, 110);
      })();
    }

    function deliver(rule, pair) {
      var fast = reduced();
      pair.forEach(function (personIndex, k) {
        later(function () { fly(k, personIndex, fast); }, fast ? 0 : k * 240);
      });
      later(function () { settle(rule, pair); }, fast ? 20 : 240 + 700);
    }

    function fly(k, personIndex, fast) {
      var card = cards[personIndex];
      var f = flies[k];
      var slot = slots[k];
      if (!fast) {
        var s = stage.getBoundingClientRect();
        var a = slot.getBoundingClientRect();
        var b = card.got.getBoundingClientRect();
        f.style.transition = "none";
        f.style.transform = "translate(" + (a.left - s.left) + "px," + (a.top - s.top) + "px)";
        f.classList.add("is-on");
        void f.offsetWidth;
        f.style.transition = "";
        f.style.transform = "translate(" + (b.left - s.left) + "px," + (b.top - s.top) + "px) rotate(360deg)";
      }
      slot.classList.add("is-empty");
      later(function () {
        f.classList.remove("is-on");
        card.node.classList.add("is-win");
        ui.replay(card.got, "is-pop");
      }, fast ? 0 : 620);
    }

    function settle(rule, pair) {
      var winners = pair.map(function (i) { return PEOPLE[i].name; });
      var losers = [];
      cards.forEach(function (c, i) {
        if (pair.indexOf(i) < 0) {
          c.node.classList.add("is-lose");
          losers.push(PEOPLE[i].name);
        } else {
          c.node.classList.add("is-win");
        }
      });
      var winText = winners[0] + (batchim(winners[0]) ? "과 " : "와 ") + winners[1] + (batchim(winners[1]) ? "이" : "가");
      var lastLoser = losers[losers.length - 1];
      setMsg([
        el("div", null, [winText + " 빵을 얻었습니다. " + rule.pre, el("b", { text: rule.cost }), "입니다."]),
        el("div", { class: "rt-lose-line", text: losers.join(", ") + (batchim(lastLoser) ? "은" : "는") + " 빈손으로 돌아갔습니다." })
      ], "good");

      tried[rule.id] = true;
      var t = tallyRows[rule.id];
      t.row.classList.add("is-on");
      t.who.textContent = winners.join(", ");
      t.cost.textContent = rule.cost;
      ui.replay(t.row, "is-flash");
      var count = RULES.filter(function (r) { return tried[r.id]; }).length;
      tallyCount.textContent = count + " / 4";
      markActive(rule.id);
      if (count === RULES.length && lesson.classList.contains("gm-hide")) {
        lesson.classList.remove("gm-hide");
        ui.replay(lesson, "is-in");
      }
    }

    function restart() {
      clearTimers();
      resetStage();
      tried = {};
      markActive(null);
      RULES.forEach(function (rule) {
        var t = tallyRows[rule.id];
        t.row.classList.remove("is-on", "is-flash");
        t.who.textContent = "–";
        t.cost.textContent = "";
      });
      tallyCount.textContent = "0 / 4";
      lesson.classList.add("gm-hide");
      setMsg("규칙을 하나 누르면 빵 두 개가 손님에게 갑니다.");
    }

    restart();
  };
})();
