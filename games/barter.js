/* 물물교환 시장: 돈이 왜 생겼는가 (욕구의 이중 일치) */
(function () {
  window.EcoGames = window.EcoGames || {};
  window.EcoGames["barter"] = function (root, ui) {
    var el = ui.el;

    var ITEMS = {
      bread: { e: "🥐", n: "빵" },
      clothes: { e: "👕", n: "옷" },
      fish: { e: "🐟", n: "생선" },
      apple: { e: "🍎", n: "사과" },
      shoes: { e: "👟", n: "신발" },
      hammer: { e: "🔨", n: "망치" },
      bowl: { e: "🏺", n: "그릇" }
    };
    /* 가장 짧은 길: 빵 → 옷 → 생선 → 사과 → 신발 (네 번). 망치와 그릇은 아무도 원하지 않는다. */
    var TRADERS = [
      { id: "cloth", name: "옷가게", face: "👩", has: "clothes", wants: "bread" },
      { id: "fisher", name: "어부", face: "👨", has: "fish", wants: "clothes" },
      { id: "farmer", name: "농부", face: "👵", has: "apple", wants: "fish" },
      { id: "shoe", name: "구두장이", face: "👴", has: "shoes", wants: "apple" },
      { id: "smith", name: "대장장이", face: "🧔", has: "hammer", wants: "bread" },
      { id: "potter", name: "도공", face: "🧓", has: "bowl", wants: "fish" }
    ];
    var PRICE = 10;

    var rand = ui.rng((Date.now() % 2147483000) + 7);
    var timers = [];
    var tickId = null;
    var st = null;
    var order = [];
    var cards = [];
    var resA = null;
    var resB = null;

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
    function batchim(word) {
      var c = word.charCodeAt(word.length - 1) - 0xac00;
      return c >= 0 && c <= 11171 && c % 28 !== 0;
    }
    function josa(word, a, b) { return word + (batchim(word) ? a : b); }
    function shuffle(list) {
      var a = list.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(rand() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }

    var body = ui.frame(root, {
      badge: "미니게임",
      title: "물물교환 시장",
      sub: "빵을 들고 시장에 나가 신발을 구해 옵니다."
    });

    /* 위쪽: 시장 이름, 내 손, 기록 */
    var roundPill = el("div", { class: "bt-round" });
    var handItem = el("div", { class: "bt-hitem" });
    var handBox = el("div", { class: "bt-hbox" }, [el("span", { class: "gm-label", text: "내가 가진 것" }), handItem]);
    var goalBox = el("div", { class: "bt-hbox goal" }, [
      el("span", { class: "gm-label", text: "내가 원하는 것" }),
      el("div", { class: "bt-hitem" }, [el("span", { class: "bt-emo", text: ITEMS.shoes.e }), el("b", { text: ITEMS.shoes.n })])
    ]);
    var hand = el("div", { class: "bt-hand" }, [handBox, el("span", { class: "bt-harrow", text: "→", "aria-hidden": "true" }), goalBox]);

    var tradesB = el("b", { text: "0번" });
    var timeB = el("b", { text: "0초" });
    var stats = el("div", { class: "gm-stats" }, [
      el("div", { class: "gm-stat blue" }, [el("span", { text: "거래 횟수" }), tradesB]),
      el("div", { class: "gm-stat" }, [el("span", { text: "걸린 시간" }), timeB])
    ]);
    var trail = el("div", { class: "bt-trail", "aria-label": "내 손을 거쳐 간 물건" });
    var msg = el("div", { class: "gm-msg", "aria-live": "polite" });
    var market = el("div", { class: "bt-market" });

    var resetBtn = el("button", { type: "button", class: "gm-btn", text: "처음부터", onclick: fromStart });
    var nextBtn = el("button", { type: "button", class: "gm-btn primary lg gm-hide", text: "돈이 있는 시장으로", onclick: startB });
    var againBtn = el("button", { type: "button", class: "gm-btn", text: "다시 하기", onclick: restart });
    var endBox = el("div", { class: "bt-end" });

    body.appendChild(roundPill);
    body.appendChild(hand);
    body.appendChild(stats);
    body.appendChild(trail);
    body.appendChild(msg);
    body.appendChild(market);
    body.appendChild(el("div", { class: "gm-row center" }, [nextBtn, resetBtn, againBtn]));
    body.appendChild(endBox);

    function setMsg(text, kind) {
      msg.className = "gm-msg" + (kind ? " " + kind : "");
      msg.textContent = text;
    }
    function coinNode() { return el("i", { class: "bt-coin", "aria-hidden": "true" }); }
    function itemNodes(key) {
      if (key === "coin") return [coinNode(), el("b", { text: "코인" })];
      return [el("span", { class: "bt-emo", text: ITEMS[key].e }), el("b", { text: ITEMS[key].n })];
    }
    function fill(node, kids) {
      node.innerHTML = "";
      kids.forEach(function (k) { node.appendChild(k); });
    }

    /* 시계: 화면에 보이는 동안만 시간이 간다. */
    function secs() { return Math.ceil(st.ms / 1000); }
    function showTime() { timeB.textContent = secs() + "초"; }
    function tick() {
      var now = Date.now();
      if (root.offsetParent !== null) st.ms += Math.max(0, now - st.last);
      st.last = now;
      showTime();
    }
    function startClock() {
      if (tickId !== null) return;
      st.last = Date.now();
      tickId = setInterval(tick, 200);
    }
    function stopClock() {
      if (tickId === null) return;
      clearInterval(tickId);
      tickId = null;
      tick();
    }

    function renderHand(pop) {
      if (st.hold) fill(handItem, itemNodes(st.hold));
      else fill(handItem, [coinNode(), el("b", { text: st.coins + "코인" })]);
      if (pop) ui.replay(handItem, "is-pop");
    }
    function renderTrail() {
      trail.innerHTML = "";
      st.trail.forEach(function (key, i) {
        if (i > 0) trail.appendChild(el("span", { class: "bt-tarrow", text: "→", "aria-hidden": "true" }));
        var chip = el("span", { class: "bt-chip" + (i === st.trail.length - 1 ? " is-now" : "") },
          key === "coin" ? [coinNode()] : [ITEMS[key].e]);
        if (i === st.trail.length - 1 && i > 0) chip.classList.add("is-pop");
        trail.appendChild(chip);
      });
    }
    function showTrades(pop) {
      tradesB.textContent = st.trades + "번";
      if (pop) ui.replay(tradesB, "is-pop");
    }

    function buildMarket() {
      market.innerHTML = "";
      cards = order.map(function (t) {
        var hasV = el("span", { class: "bt-v" }, itemNodes(t.has));
        var wantV = el("span", { class: "bt-v" }, itemNodes(st.round === 1 ? t.wants : "coin"));
        var say = el("span", { class: "bt-say" });
        var tag = el("span", { class: "bt-tag" });
        var card = { t: t, hasV: hasV, wantV: wantV, say: say, tag: tag, sayTimer: null };
        card.node = el("button", { type: "button", class: "bt-card", onclick: function () { tap(card); } }, [
          el("span", { class: "bt-who" }, [el("span", { class: "bt-face", text: t.face, "aria-hidden": "true" }), el("span", { class: "bt-name", text: t.name })]),
          el("span", { class: "bt-line" }, [el("span", { class: "bt-k", text: "가진 것" }), hasV]),
          el("span", { class: "bt-line" }, [el("span", { class: "bt-k", text: "원하는 것" }), wantV]),
          tag,
          say
        ]);
        market.appendChild(card.node);
        return card;
      });
    }

    function refuse(card, text, line) {
      ui.replay(card.node, "is-shake");
      card.say.textContent = text;
      card.say.classList.add("is-on");
      if (card.sayTimer !== null) clearTimeout(card.sayTimer);
      card.sayTimer = later(function () {
        card.sayTimer = null;
        card.say.classList.remove("is-on");
      }, 1900);
      setMsg(line || card.t.name + ": " + text, "warn");
    }

    function burst() {
      var marks = ["✨", "🎉", "⭐"];
      for (var i = 0; i < 12; i++) {
        (function (i) {
          var ang = (Math.PI * 2 * i) / 12;
          var dist = 46 + (i % 3) * 16;
          var s = el("span", { class: "bt-spark", text: marks[i % 3], "aria-hidden": "true" });
          s.style.setProperty("--dx", Math.round(Math.cos(ang) * dist) + "px");
          s.style.setProperty("--dy", Math.round(Math.sin(ang) * dist) + "px");
          handBox.appendChild(s);
          later(function () { s.remove(); }, 950);
        })(i);
      }
      ui.replay(handBox, "is-win");
    }

    function tap(card) {
      if (!st || st.over) return;
      if (!st.started) { st.started = true; startClock(); }
      if (st.round === 1) tapA(card); else tapB(card);
    }

    /* 첫째 시장: 상대가 원하는 것을 내가 들고 있어야 바꿀 수 있다. */
    function tapA(card) {
      var t = card.t;
      if (st.done[t.id]) { refuse(card, "이미 거래를 마쳤습니다."); return; }
      if (t.wants !== st.hold) { refuse(card, "저는 " + josa(ITEMS[t.wants].n, "이", "가") + " 필요합니다."); return; }
      var gave = st.hold;
      st.hold = t.has;
      st.trades += 1;
      st.done[t.id] = true;
      st.trail.push(st.hold);
      fill(card.hasV, itemNodes(gave));
      fill(card.wantV, [el("b", { text: "없음" })]);
      card.tag.textContent = "거래 끝";
      card.node.classList.add("is-done");
      ui.replay(card.node, "is-pop");
      ui.floatText(card.node, ITEMS[gave].e + " ↔ " + ITEMS[st.hold].e, 14, 4);
      renderHand(true);
      renderTrail();
      showTrades(true);
      if (st.hold === "shoes") { finishA(); return; }
      var wanted = TRADERS.some(function (x) { return !st.done[x.id] && x.wants === st.hold; });
      if (!wanted) {
        resetBtn.classList.add("is-pulse");
        setMsg(josa(ITEMS[st.hold].n, "을", "를") + " 원하는 사람이 없습니다. 처음부터를 눌러 빵을 들고 다시 나섭니다.", "bad");
        return;
      }
      setMsg(josa(t.name, "과", "와") + " 바꾸었습니다. 이제 " + josa(ITEMS[st.hold].n, "을", "를") + " 원하는 사람을 찾습니다.", "");
    }

    function finishA() {
      stopClock();
      st.over = true;
      resA = { trades: st.trades, sec: Math.max(1, secs()) };
      timeB.textContent = resA.sec + "초";
      burst();
      setMsg("신발을 얻었습니다. 거래 " + resA.trades + "번, " + resA.sec + "초가 걸렸습니다.", "good");
      resetBtn.classList.add("gm-hide");
      resetBtn.classList.remove("is-pulse");
      nextBtn.classList.remove("gm-hide");
      nextBtn.classList.add("is-pulse");
    }

    /* 길이 막혔을 때: 빵을 들고 다시 나선다. 횟수와 시간은 이어진다. */
    function fromStart() {
      if (!st || st.round !== 1 || st.over) return;
      st.hold = "bread";
      st.done = {};
      st.trail = ["bread"];
      resetBtn.classList.remove("is-pulse");
      buildMarket();
      renderHand(true);
      renderTrail();
      setMsg("빵을 들고 처음부터 다시 나섭니다. 거래 횟수와 시간은 이어집니다.", "");
    }

    /* 둘째 시장: 누구나 코인을 받는다. */
    function tapB(card) {
      var t = card.t;
      if (st.hold === "bread") {
        st.hold = null;
        st.coins = PRICE;
        st.trades += 1;
        st.trail.push("coin");
        card.tag.textContent = "빵을 샀습니다";
        card.node.classList.add("is-bought");
        ui.replay(card.node, "is-pop");
        ui.floatText(card.node, "빵 → " + PRICE + "코인", 14, 4);
        renderHand(true);
        renderTrail();
        showTrades(true);
        setMsg(josa(t.name, "이", "가") + " 빵을 " + PRICE + "코인에 샀습니다. 이제 구두장이에게서 신발을 삽니다.", "");
        return;
      }
      if (t.has !== "shoes") {
        refuse(card, "저는 " + josa(ITEMS[t.has].n, "을", "를") + " 팝니다.", "신발은 구두장이에게 있습니다.");
        return;
      }
      st.hold = "shoes";
      st.coins = 0;
      st.trades += 1;
      st.trail.push("shoes");
      card.tag.textContent = "신발을 팔았습니다";
      card.node.classList.add("is-done");
      ui.replay(card.node, "is-pop");
      ui.floatText(card.node, PRICE + "코인 → 신발", 14, 4);
      renderHand(true);
      renderTrail();
      showTrades(true);
      finishB();
    }

    function finishB() {
      stopClock();
      st.over = true;
      resB = { trades: st.trades, sec: Math.max(1, secs()) };
      timeB.textContent = resB.sec + "초";
      burst();
      setMsg("신발을 얻었습니다. 거래 " + resB.trades + "번, " + resB.sec + "초가 걸렸습니다.", "good");
      later(showEnd, 500);
    }

    function compare(title, a, b, unit) {
      var max = Math.max(a, b, 1);
      function col(value, label, cls) {
        var num = el("b", { class: "bt-bar-num", text: "0" + unit });
        var barNode = el("i", { class: "bt-bar " + cls });
        later(function () {
          barNode.style.height = Math.max(6, Math.round((value / max) * 120)) + "px";
          ui.countUp(num, value, 800, function (v) { return ui.fmt(v) + unit; });
        }, 80);
        later(function () { num.textContent = ui.fmt(value) + unit; }, 1100);
        return el("div", { class: "bt-bar-col" }, [num, el("div", { class: "bt-bar-track" }, [barNode]), el("span", { class: "bt-bar-name", text: label })]);
      }
      return el("div", { class: "bt-cmp-box" }, [
        el("div", { class: "bt-cmp-title", text: title }),
        el("div", { class: "bt-bars" }, [col(a, "물물교환", "a"), col(b, "돈", "b")])
      ]);
    }

    function showEnd() {
      if (!resA || !resB) return;
      endBox.innerHTML = "";
      endBox.appendChild(el("div", { class: "gm-result bt-result" }, [
        el("h4", { text: "두 시장을 견주어 봅니다" }),
        el("div", { class: "bt-cmp" }, [
          compare("거래 횟수", resA.trades, resB.trades, "번"),
          compare("걸린 시간", resA.sec, resB.sec, "초")
        ]),
        el("div", {
          class: "gm-lesson",
          text: "물물교환은 내가 가진 것을 원하면서 내가 원하는 것을 가진 사람을 찾아야 합니다. 돈은 누구나 받아 주기 때문에 이 수고를 없애 줍니다. 이것이 교환의 매개라는 돈의 첫째 기능입니다."
        })
      ]));
    }

    function freshState(round) {
      return { round: round, hold: "bread", coins: 0, trades: 0, ms: 0, last: 0, started: false, over: false, done: {}, trail: ["bread"] };
    }

    function startRound(round) {
      clearTimers();
      if (tickId !== null) { clearInterval(tickId); tickId = null; }
      st = freshState(round);
      roundPill.textContent = round === 1 ? "첫째 시장: 물건과 물건을 바꿉니다" : "둘째 시장: 누구나 코인을 받습니다";
      roundPill.className = "bt-round" + (round === 2 ? " is-b" : "");
      ui.replay(roundPill, "is-pop");
      handBox.classList.remove("is-win");
      handBox.querySelectorAll(".bt-spark").forEach(function (s) { s.remove(); });
      buildMarket();
      renderHand(false);
      renderTrail();
      showTrades(false);
      showTime();
      nextBtn.classList.add("gm-hide");
      nextBtn.classList.remove("is-pulse");
      resetBtn.classList.toggle("gm-hide", round !== 1);
      resetBtn.classList.remove("is-pulse");
      if (round === 1) setMsg("상인을 눌러 물건을 바꿉니다. 상인은 자기가 원하는 것을 가져온 사람하고만 바꿉니다.", "");
      else setMsg("이번에는 누구나 코인을 받습니다. 빵을 팔 사람을 아무나 누릅니다. 값은 " + PRICE + "코인입니다.", "");
    }

    function startB() {
      if (!resA) return;
      startRound(2);
    }

    function restart() {
      resA = null;
      resB = null;
      endBox.innerHTML = "";
      order = shuffle(TRADERS);
      startRound(1);
    }

    restart();
  };
})();
