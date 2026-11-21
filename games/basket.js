/* 만 원 장보기: 예산 제약과 기회비용 */
(function () {
  window.EcoGames = window.EcoGames || {};
  window.EcoGames["basket"] = function (root, ui) {
    var el = ui.el;
    var NS = "http://www.w3.org/2000/svg";
    var BUDGET = 10000;
    var GOODS = {
      b: { name: "빵", emoji: "🥐", price: 2000, each: "한 개", max: 5 },
      d: { name: "음료", emoji: "🧃", price: 1000, each: "한 잔", max: 10 }
    };
    /* 그림 좌표: 음료 한 잔은 가로 25, 빵 한 개는 세로 36 */
    var X0 = 50, UX = 25, Y0 = 232, UY = 36;

    var state = { b: 0, d: 0 };
    var timers = [];

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
    function won(v) { return ui.fmt(v) + "원"; }
    function px(d) { return X0 + d * UX; }
    function py(b) { return Y0 - b * UY; }
    function costOf(b, d) { return b * GOODS.b.price + d * GOODS.d.price; }
    function sv(tag, attrs, kids) {
      var node = document.createElementNS(NS, tag);
      if (attrs) {
        Object.keys(attrs).forEach(function (k) {
          if (k === "text") node.textContent = attrs[k];
          else node.setAttribute(k, attrs[k]);
        });
      }
      if (kids) kids.forEach(function (c) { node.appendChild(c); });
      return node;
    }

    var body = ui.frame(root, {
      badge: "체험",
      title: "만 원 장보기",
      sub: "만 원으로 빵과 음료를 골라 담고, 돈을 다 쓰는 선택을 찾아봅니다."
    });

    /* 돈 */
    var spentB = el("b", { text: won(0) });
    var leftB = el("b", { text: won(BUDGET) });
    spentB.setAttribute("data-now", 0);
    leftB.setAttribute("data-now", BUDGET);
    var leftBox = el("div", { class: "gm-stat blue bk-left-box" }, [el("span", { text: "남은 돈" }), leftB]);
    var stats = el("div", { class: "gm-stats" }, [
      el("div", { class: "gm-stat" }, [el("span", { text: "쓴 돈" }), spentB]),
      leftBox
    ]);
    var segB = el("i", { class: "bk-seg b" });
    var segD = el("i", { class: "bk-seg d" });
    var bar = el("div", { class: "bk-bar", role: "img", "aria-label": "만 원 가운데 쓴 돈" }, [segB, segD]);

    /* 고르는 단추 */
    var counts = {};
    var minus = {};
    function stepper(kind) {
      var g = GOODS[kind];
      counts[kind] = el("output", { class: "bk-count", text: "0" });
      minus[kind] = el("button", {
        type: "button", class: "bk-pm", text: "−", "aria-label": g.name + " 하나 빼기",
        onclick: function () { step(kind, -1); }
      });
      var plus = el("button", {
        type: "button", class: "bk-pm plus", text: "+", "aria-label": g.name + " 하나 담기",
        onclick: function () { step(kind, 1); }
      });
      return el("div", { class: "bk-step" }, [
        el("span", { class: "bk-ico", text: g.emoji, "aria-hidden": "true" }),
        el("div", { class: "bk-info" }, [
          el("b", { text: g.name }),
          el("span", null, [g.each + " ", el("b", { text: won(g.price) })])
        ]),
        el("div", { class: "bk-ctl" }, [minus[kind], counts[kind], plus])
      ]);
    }
    var steps = el("div", { class: "bk-steps" }, [stepper("b"), stepper("d")]);

    /* 쟁반 */
    var rows = { b: el("div", { class: "bk-tray-row" }), d: el("div", { class: "bk-tray-row" }) };
    var items = { b: [], d: [] };
    var trayHint = el("div", { class: "bk-tray-hint", text: "쟁반이 비어 있습니다." });
    var tray = el("div", { class: "bk-tray" }, [
      el("div", { class: "gm-label", text: "쟁반" }),
      trayHint, rows.b, rows.d
    ]);

    /* 예산선 그림 */
    var svg = sv("svg", { class: "bk-chart", viewBox: "0 0 340 276", role: "img", "aria-label": "가로는 음료, 세로는 빵을 나타내는 예산선 그림" });
    svg.appendChild(sv("polygon", { class: "bk-area", points: px(0) + "," + py(0) + " " + px(0) + "," + py(5) + " " + px(10) + "," + py(0) }));
    var bi, di;
    for (bi = 0; bi <= GOODS.b.max; bi++) {
      for (di = 0; di <= GOODS.d.max; di++) {
        var c = costOf(bi, di);
        svg.appendChild(sv("circle", {
          class: "bk-grid-dot " + (c < BUDGET ? "in" : c === BUDGET ? "on" : "out"),
          cx: px(di), cy: py(bi), r: c === BUDGET ? 3.4 : c < BUDGET ? 2.6 : 2.2
        }));
      }
    }
    svg.appendChild(sv("line", { class: "bk-axis", x1: X0, y1: Y0, x2: px(10) + 24, y2: Y0 }));
    svg.appendChild(sv("line", { class: "bk-axis", x1: X0, y1: Y0, x2: X0, y2: py(5) - 30 }));
    var xTicks = [], yTicks = [];
    for (di = 0; di <= GOODS.d.max; di++) {
      xTicks.push(sv("text", { class: "bk-tick", x: px(di), y: Y0 + 20, "text-anchor": "middle", text: String(di) }));
      svg.appendChild(xTicks[di]);
    }
    for (bi = 0; bi <= GOODS.b.max; bi++) {
      yTicks.push(sv("text", { class: "bk-tick", x: X0 - 11, y: py(bi) + 5, "text-anchor": "end", text: String(bi) }));
      svg.appendChild(yTicks[bi]);
    }
    svg.appendChild(sv("text", { class: "bk-axis-name", x: 336, y: 271, "text-anchor": "end", text: "음료(잔)" }));
    svg.appendChild(sv("text", { class: "bk-axis-name", x: 39, y: 20, "text-anchor": "end", text: "빵(개)" }));
    svg.appendChild(sv("line", { class: "bk-line", x1: px(0), y1: py(5), x2: px(10), y2: py(0) }));
    svg.appendChild(sv("text", { class: "bk-line-name", x: 182, y: 133, "text-anchor": "middle", transform: "rotate(35.75 182 133)", text: "예산선" }));

    var ghostIn = sv("g", { class: "bk-ghost-in" }, [
      sv("circle", { r: 9 }),
      sv("line", { x1: -4, y1: -4, x2: 4, y2: 4 }),
      sv("line", { x1: -4, y1: 4, x2: 4, y2: -4 })
    ]);
    var ghost = sv("g", { class: "bk-ghost" }, [ghostIn]);
    svg.appendChild(ghost);

    var dot = sv("g", { class: "bk-dot" }, [
      sv("circle", { class: "bk-ring", r: 9 }),
      sv("circle", { class: "bk-core", r: 8 })
    ]);
    svg.appendChild(dot);

    var pickText = el("b", { text: "" });
    var legend = el("div", { class: "bk-legend" }, [
      el("span", null, [el("i", { class: "k-area" }), "고를 수 있는 범위"]),
      el("span", null, [el("i", { class: "k-line" }), "예산선"]),
      el("span", { class: "bk-pick" }, [el("i", { class: "k-dot" }), pickText])
    ]);

    var msg = el("div", { class: "gm-msg", "aria-live": "polite" });
    var lesson = el("div", {
      class: "gm-lesson",
      text: "빵 한 개의 기회비용은 음료 두 잔입니다. 예산선 위의 점은 돈을 다 쓴 선택이고, 선 밖의 점은 지금 가진 돈으로는 고를 수 없습니다."
    });
    var againBtn = el("button", { type: "button", class: "gm-btn", text: "다시 하기", onclick: restart });

    body.appendChild(el("div", { class: "bk-grid" }, [
      el("div", { class: "bk-side" }, [stats, bar, steps, tray]),
      el("div", { class: "bk-fig" }, [svg, legend])
    ]));
    body.appendChild(msg);
    body.appendChild(lesson);
    body.appendChild(el("div", { class: "gm-row center" }, [againBtn]));

    function setMsg(text, kind) {
      msg.className = "gm-msg" + (kind ? " " + kind : "");
      msg.textContent = text;
    }

    function liveText(left) {
      if (left === 0) {
        if (state.b < GOODS.b.max) return "돈을 모두 썼습니다. 빵을 하나 더 사려면 음료 두 잔을 내려놓아야 합니다.";
        return "돈을 모두 썼습니다. 음료 두 잔을 사려면 빵 하나를 내려놓아야 합니다.";
      }
      if (left === BUDGET) return "아직 " + won(left) + "이 남았습니다. 빵과 음료를 담아 봅니다.";
      return "아직 " + won(left) + "이 남았습니다.";
    }

    function addItem(kind) {
      var node = el("span", { class: "bk-item is-pop", text: GOODS[kind].emoji });
      rows[kind].appendChild(node);
      items[kind].push(node);
    }
    function removeItem(kind) {
      var node = items[kind].pop();
      if (!node) return;
      node.classList.remove("is-pop");
      node.classList.add("is-out");
      later(function () { node.remove(); }, 170);
    }

    /* 숫자를 서서히 바꾸되, 화면이 멈춰 있어도 끝 값은 반드시 맞춘다. */
    function count(node, to, ms) {
      ui.countUp(node, to, ms, won);
      later(function () {
        if (node.getAttribute("data-now") === String(to)) node.textContent = won(to);
      }, ms + 150);
    }

    function render(ms) {
      var cost = costOf(state.b, state.d);
      var left = BUDGET - cost;
      ghostIn.setAttribute("class", "bk-ghost-in");
      leftBox.classList.remove("is-shake");
      count(spentB, cost, ms);
      count(leftB, left, ms);
      counts.b.textContent = state.b;
      counts.d.textContent = state.d;
      minus.b.disabled = state.b === 0;
      minus.d.disabled = state.d === 0;
      segB.style.width = (state.b * GOODS.b.price / BUDGET * 100) + "%";
      segD.style.width = (state.d * GOODS.d.price / BUDGET * 100) + "%";
      dot.style.transform = "translate(" + px(state.d) + "px," + py(state.b) + "px)";
      dot.setAttribute("class", "bk-dot" + (left === 0 ? " is-full" : ""));
      xTicks.forEach(function (t, i) { t.setAttribute("class", "bk-tick" + (i === state.d ? " is-on" : "")); });
      yTicks.forEach(function (t, i) { t.setAttribute("class", "bk-tick" + (i === state.b ? " is-on" : "")); });
      trayHint.classList.toggle("gm-hide", state.b + state.d > 0);
      pickText.textContent = "지금 고른 점: 빵 " + state.b + "개, 음료 " + state.d + "잔";
      pickText.parentNode.classList.toggle("is-full", left === 0);
      setMsg(liveText(left), left === 0 ? "good" : "");
    }

    function step(kind, delta) {
      var nb = state.b + (kind === "b" ? delta : 0);
      var nd = state.d + (kind === "d" ? delta : 0);
      if (nb < 0 || nd < 0) return;
      if (costOf(nb, nd) > BUDGET) { refuse(kind, nb, nd); return; }
      state.b = nb;
      state.d = nd;
      if (delta > 0) addItem(kind); else removeItem(kind);
      ui.replay(counts[kind], "is-pop");
      render(350);
    }

    /* 돈이 모자랄 때: 고른 것은 그대로 두고, 선 밖의 점을 잠깐 보여 준다. */
    function refuse(kind, nb, nd) {
      var left = BUDGET - costOf(state.b, state.d);
      var text = "돈이 모자랍니다. ";
      if (left > 0) {
        text += GOODS[kind].name + "은 " + won(GOODS[kind].price) + "인데 남은 돈은 " + won(left) + "입니다.";
      } else if (kind === "b") {
        text += state.d >= 2 ? "빵을 하나 더 사려면 음료 두 잔을 내려놓아야 합니다." : "만 원으로 빵은 다섯 개까지 살 수 있습니다.";
      } else {
        text += state.b >= 1 ? "음료를 더 사려면 빵 하나를 내려놓아야 합니다." : "만 원으로 음료는 열 잔까지 살 수 있습니다.";
      }
      setMsg(text, "bad");
      ui.replay(leftBox, "is-shake");
      ghost.setAttribute("transform", "translate(" + px(nd) + " " + py(nb) + ")");
      ghostIn.setAttribute("class", "bk-ghost-in");
      ghostIn.getBoundingClientRect();
      ghostIn.setAttribute("class", "bk-ghost-in is-on");
    }

    function restart() {
      clearTimers();
      state.b = 0;
      state.d = 0;
      items.b = [];
      items.d = [];
      rows.b.innerHTML = "";
      rows.d.innerHTML = "";
      ghostIn.setAttribute("class", "bk-ghost-in");
      render(300);
    }

    restart();
  };
})();
