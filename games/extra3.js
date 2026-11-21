(function () {
  var Games = (window.EcoGames = window.EcoGames || {});

  /* ───────── 돌려받는 세금 ───────── */
  Games.taxback = function (root, ui) {
    var el = ui.el;
    var body = ui.frame(root, { badge: "체험", title: "얼마를 돌려받을까", sub: "연금계좌에 넣은 돈과 고향사랑기부금을 움직여 세액공제를 계산합니다." });
    var st = { pension: 600, low: true, gift: 10 };

    function slider(label, key, min, max, step, unit) {
      var out = el("output");
      var input = el("input", { type: "range", class: "gm-range", min: min, max: max, step: step, value: st[key] });
      input.addEventListener("input", function () { st[key] = Number(input.value); out.textContent = st[key] + unit; draw(); });
      out.textContent = st[key] + unit;
      return el("label", { class: "gm-field" }, [el("div", { class: "gm-row" }, [el("span", { class: "gm-label", text: label }), out]), input]);
    }

    /* 연금계좌 */
    var bLow = el("button", { class: "gm-btn sm", text: "총급여 5,500만 원 이하", onclick: function () { st.low = true; draw(); } });
    var bHigh = el("button", { class: "gm-btn sm", text: "5,500만 원 초과", onclick: function () { st.low = false; draw(); } });
    var pRate = el("b"), pBack = el("b", { class: "bigv" }), pFill = el("i"), pNote = el("div", { class: "gm-msg" });
    var pension = el("div", { class: "box" }, [
      el("strong", { text: "연금저축과 IRP" }),
      slider("올해 넣은 돈 (두 계좌 합계)", "pension", 0, 900, 50, "만 원"),
      el("div", { class: "gm-row" }, [bLow, bHigh]),
      el("div", { class: "meter" }, [pFill]),
      el("div", { class: "gm-stats" }, [
        el("div", { class: "gm-stat" }, [el("span", { text: "공제율" }), pRate]),
        el("div", { class: "gm-stat green" }, [el("span", { text: "돌려받는 세금" }), pBack])
      ]),
      pNote
    ]);

    /* 고향사랑기부 */
    var gCredit = el("b"), gGift = el("b"), gCost = el("b"), gBar = el("div", { class: "stack" }), gNote = el("div", { class: "gm-msg" });
    var gift = el("div", { class: "box" }, [
      el("strong", { text: "고향사랑기부제" }),
      slider("올해 기부한 돈", "gift", 0, 50, 5, "만 원"),
      gBar,
      el("div", { class: "gm-stats" }, [
        el("div", { class: "gm-stat green" }, [el("span", { text: "돌려받는 세금" }), gCredit]),
        el("div", { class: "gm-stat blue" }, [el("span", { text: "답례품 (30%까지)" }), gGift]),
        el("div", { class: "gm-stat" }, [el("span", { text: "실제로 든 돈" }), gCost])
      ]),
      gNote
    ]);

    function won(v) { return (Math.round(v * 100) / 100).toLocaleString("ko-KR") + "만 원"; }
    function draw() {
      var rate = st.low ? 0.165 : 0.132;
      var back = st.pension * rate;
      bLow.classList.toggle("primary", st.low); bHigh.classList.toggle("primary", !st.low);
      pRate.textContent = (rate * 100).toFixed(1) + "%";
      pBack.textContent = won(back);
      pFill.style.width = (st.pension / 900) * 100 + "%";
      pNote.className = "gm-msg" + (st.pension >= 900 ? " good" : "");
      pNote.textContent = st.pension >= 900 ? "공제 한도 900만 원을 모두 채웠습니다. 이 가운데 연금저축으로 인정되는 것은 600만 원까지입니다."
        : st.pension > 600 ? "600만 원을 넘는 부분은 IRP에 넣어야 공제를 받습니다."
          : "연금저축만으로는 600만 원까지, IRP를 합치면 900만 원까지 공제를 받습니다.";

      var x = st.gift;
      var credit = Math.min(x, 10) + Math.max(0, Math.min(x, 20) - 10) * 0.44 + Math.max(0, x - 20) * 0.165;
      var present = x * 0.3;
      var cost = x - credit - present;
      gCredit.textContent = won(credit); gGift.textContent = won(present);
      gCost.textContent = cost < 0 ? "0원 (" + won(-cost) + " 이득)" : won(cost);
      gBar.innerHTML = "";
      if (x > 0) {
        gBar.appendChild(el("i", { class: "c", style: { width: (credit / x) * 100 + "%" }, text: "세액공제" }));
        gBar.appendChild(el("i", { class: "p", style: { width: (Math.min(present, x - credit) / x) * 100 + "%" }, text: "답례품" }));
        if (cost > 0) gBar.appendChild(el("i", { class: "m", style: { width: (cost / x) * 100 + "%" }, text: "내 부담" }));
      }
      gNote.className = "gm-msg" + (x > 0 && x <= 20 ? " good" : "");
      gNote.textContent = x === 0 ? "기부한 돈을 움직여 봅니다."
        : x <= 10 ? "10만 원까지는 낸 만큼 전부 세금에서 빼 줍니다. 답례품은 덤입니다."
          : x <= 20 ? "10만 원을 넘는 부분은 20만 원까지 44%를 빼 줍니다."
            : "20만 원을 넘는 부분은 16.5%만 빼 줍니다. 여기부터는 순수한 기부에 가깝습니다.";
    }

    body.appendChild(el("div", { class: "two" }, [pension, gift]));
    body.appendChild(el("p", { class: "gm-lesson", html: "세액공제는 <b>이미 낸 세금에서 돌려받는 것</b>입니다. 낸 세금이 공제액보다 적으면 그만큼만 돌려받습니다. 연금계좌에 넣은 돈은 <b>55세까지 묶이는 돈</b>이라는 점도 함께 따져야 합니다." }));
    draw();
  };
})();
