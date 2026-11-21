/* 진짜일까, 사기일까: 금융 사기 문자 가려내기 */
(function () {
  window.EcoGames = window.EcoGames || {};
  window.EcoGames["scam"] = function (root, ui) {
    var el = ui.el;

    /* parts 안의 { h: "..." } 는 답을 고른 뒤 색을 칠해 보여 주는 수상한 표현이다. */
    var MSGS = [
      {
        from: "010-0000-0000", sub: "저장되지 않은 번호", face: "?",
        ctx: "모르는 번호로 문자가 왔습니다.",
        parts: ["[○○택배] 고객님의 택배가 ", { h: "주소 오류" }, "로 배송되지 못했습니다. ", { h: "아래 주소를 눌러" }, " 배송지를 고쳐 주십시오. ", { h: "bit.example/abc" }],
        scam: true,
        why: "모르는 번호가 보낸 링크는 누르지 않고, 택배 앱에서 직접 확인합니다."
      },
      {
        from: "010-0000-0000", sub: "저장되지 않은 번호", face: "?",
        ctx: "어머니 휴대폰에 모르는 번호로 문자가 왔습니다.",
        parts: ["엄마, 나 ", { h: "휴대폰이 고장 났어" }, ". 지금 친구 휴대폰으로 보내는 거야. ", { h: "급하니까" }, " 엄마 휴대폰으로 ", { h: "인증번호가 오면 이 번호로 바로 보내 줘" }, "."],
        scam: true,
        why: "가족이라고 하면서 모르는 번호로 인증번호를 달라고 하면 사기입니다."
      },
      {
        from: "○○투자 정보방", sub: "처음 보는 단체 대화방", face: "?",
        ctx: "처음 보는 단체 대화방에 초대되었습니다.",
        parts: [{ h: "원금 100% 보장" }, ", ", { h: "한 달 수익 30%" }, ". ", { h: "선착순 50명" }, "만 받습니다. ", { h: "오늘 안에" }, " 신청하십시오."],
        scam: true,
        why: "원금 보장과 높은 수익을 함께 약속하는 투자는 없습니다."
      },
      {
        from: "○○은행", sub: "은행 앱 알림", face: "은",
        ctx: "조금 전 편의점에서 체크카드로 4,500원을 냈습니다.",
        parts: ["[○○은행] 오늘 14:02 체크카드 4,500원 결제. 잔액 23,500원."],
        scam: false,
        why: "내가 한 결제를 알려 주는 알림이고, 요구하는 것이 없습니다."
      },
      {
        from: "010-0000-0000", sub: "저장되지 않은 번호", face: "?",
        ctx: "모르는 번호로 문자가 왔습니다.",
        parts: [{ h: "○○지방검찰청 수사관" }, " 김○○입니다. 귀하의 계좌가 범죄에 쓰였습니다. ", { h: "지금 바로" }, " 예금을 모두 ", { h: "안전 계좌로 옮기십시오" }, ". ", { h: "이 일은 누구에게도 알리면 안 됩니다." }],
        scam: true,
        why: "검찰이나 경찰은 돈을 다른 계좌로 옮기라고 하지 않습니다."
      },
      {
        from: "○○초등학교", sub: "학교 알리미", face: "학",
        ctx: "내일은 체험학습을 가는 날입니다.",
        parts: ["[○○초등학교] 내일은 체험학습 날입니다. 도시락과 물을 준비해 주십시오. 8시 40분까지 교실로 모입니다."],
        scam: false,
        why: "학교에서 보낸 준비물 안내이고, 돈이나 개인정보를 요구하지 않습니다."
      },
      {
        from: "010-0000-0000", sub: "저장되지 않은 번호", face: "?",
        ctx: "대출을 신청한 적이 없는데 문자가 왔습니다.",
        parts: ["[○○금융] 고객님은 ", { h: "저금리 대출이 승인" }, "되었습니다. 대출금을 받으려면 ", { h: "먼저 수수료 30만 원을 입금" }, "해 주십시오."],
        scam: true,
        why: "대출을 해 주겠다며 돈을 먼저 보내라고 하면 사기입니다."
      },
      {
        from: "나래", sub: "저장된 친구", face: "나",
        ctx: "어제 친구 나래에게 5,000원을 빌려주었습니다.",
        parts: ["어제 빌린 5,000원 보냈어. 확인해 봐. 고마워."],
        scam: false,
        why: "요구하는 것이 없고, 내 은행 앱에서 직접 확인하면 됩니다."
      }
    ];
    var HABITS = [
      "모르는 링크는 누르지 않습니다.",
      "비밀번호와 인증번호는 누구에게도 알려 주지 않습니다.",
      "원금 보장과 높은 수익을 함께 약속하면 의심합니다.",
      "급하게 돈을 보내라고 하면 끊고 직접 확인합니다."
    ];
    var TOTAL = MSGS.length;

    var rand = ui.rng((Date.now() % 2147483000) + 13);
    var timers = [];
    var order = [];
    var idx = 0;
    var score = 0;
    var answered = false;

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
    function shuffle(list) {
      var a = list.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(rand() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }

    var body = ui.frame(root, {
      badge: "퀴즈",
      title: "진짜일까, 사기일까",
      sub: "문자 여덟 개를 읽고 사기인지 괜찮은지 가려냅니다."
    });

    /* 진행 */
    var progB = el("b", { text: "1 / " + TOTAL });
    var scoreB = el("b", { text: "0" });
    var stats = el("div", { class: "gm-stats" }, [
      el("div", { class: "gm-stat" }, [el("span", { text: "문제" }), progB]),
      el("div", { class: "gm-stat green" }, [el("span", { text: "맞힌 수" }), scoreB])
    ]);
    var dots = [];
    var dotRow = el("div", { class: "sc-dots", "aria-hidden": "true" }, MSGS.map(function () {
      var d = el("i");
      dots.push(d);
      return d;
    }));

    /* 휴대폰 화면 */
    var faceEl = el("span", { class: "sc-face", "aria-hidden": "true" });
    var fromEl = el("b", { class: "sc-from-name" });
    var subEl = el("span", { class: "sc-from-sub" });
    var bubble = el("div", { class: "sc-bubble" });
    var phone = el("div", { class: "sc-phone" }, [
      el("div", { class: "sc-notch", "aria-hidden": "true" }),
      el("div", { class: "sc-from" }, [faceEl, el("div", { class: "sc-from-text" }, [fromEl, subEl])]),
      el("div", { class: "sc-thread" }, [bubble, el("span", { class: "sc-time", text: "방금 받음" })]),
      el("div", { class: "sc-home", "aria-hidden": "true" })
    ]);

    var ctxEl = el("div", { class: "sc-ctx" });
    var scamBtn = el("button", { type: "button", class: "gm-btn lg sc-pick sc-no", text: "사기입니다", onclick: function () { answer(true); } });
    var safeBtn = el("button", { type: "button", class: "gm-btn lg sc-pick sc-ok", text: "괜찮습니다", onclick: function () { answer(false); } });
    var feedHead = el("b", { class: "sc-feed-head" });
    var feedWhy = el("span", { class: "sc-feed-why" });
    var feed = el("div", { class: "gm-msg sc-feed gm-hide", "aria-live": "polite" }, [feedHead, feedWhy]);
    var nextBtn = el("button", { type: "button", class: "gm-btn primary lg sc-next gm-hide", text: "다음", onclick: next });
    var act = el("div", { class: "sc-act" }, [
      el("div", { class: "sc-btns" }, [scamBtn, safeBtn]),
      feed,
      nextBtn
    ]);
    var main = el("div", { class: "sc-main" }, [ctxEl, phone, act]);
    var endBox = el("div", { class: "sc-end gm-hide" });
    var againBtn = el("button", { type: "button", class: "gm-btn", text: "다시 하기", onclick: restart });

    body.appendChild(stats);
    body.appendChild(dotRow);
    body.appendChild(main);
    body.appendChild(endBox);
    body.appendChild(el("div", { class: "gm-row center" }, [againBtn]));

    function show() {
      var m = order[idx];
      answered = false;
      progB.textContent = (idx + 1) + " / " + TOTAL;
      dots.forEach(function (d, i) { d.classList.toggle("is-now", i === idx); });
      ctxEl.textContent = m.ctx;
      faceEl.textContent = m.face;
      faceEl.classList.toggle("is-unknown", m.face === "?");
      fromEl.textContent = m.from;
      subEl.textContent = m.sub;
      bubble.className = "sc-bubble";
      bubble.innerHTML = "";
      m.parts.forEach(function (p) {
        if (typeof p === "string") bubble.appendChild(document.createTextNode(p));
        else bubble.appendChild(el("span", { class: "sc-hl", text: p.h }));
      });
      ui.replay(bubble, "is-in");
      scamBtn.disabled = false;
      safeBtn.disabled = false;
      scamBtn.classList.remove("is-picked", "is-answer");
      safeBtn.classList.remove("is-picked", "is-answer");
      feed.classList.add("gm-hide");
      nextBtn.classList.add("gm-hide");
      nextBtn.textContent = idx === TOTAL - 1 ? "결과 보기" : "다음";
    }

    function answer(saysScam) {
      if (answered || idx >= TOTAL) return;
      answered = true;
      var m = order[idx];
      var right = saysScam === m.scam;
      if (right) {
        score += 1;
        scoreB.textContent = String(score);
        ui.replay(scoreB, "is-pop");
      }
      dots[idx].classList.remove("is-now");
      dots[idx].classList.add(right ? "is-right" : "is-wrong");
      ui.replay(dots[idx], "is-pop");
      scamBtn.disabled = true;
      safeBtn.disabled = true;
      (saysScam ? scamBtn : safeBtn).classList.add("is-picked");
      (m.scam ? scamBtn : safeBtn).classList.add("is-answer");
      bubble.classList.add(m.scam ? "is-scam" : "is-safe");
      if (!right) ui.replay(phone, "is-shake");
      feed.className = "gm-msg sc-feed " + (right ? "good" : "bad");
      feedHead.textContent = (right ? "맞았습니다. " : "틀렸습니다. ") + (m.scam ? "이 문자는 사기입니다." : "이 문자는 괜찮습니다.");
      feedWhy.textContent = m.why;
      ui.replay(feed, "is-in");
      nextBtn.classList.remove("gm-hide");
    }

    function next() {
      if (!answered) return;
      idx += 1;
      if (idx >= TOTAL) { finish(); return; }
      show();
    }

    function finish() {
      main.classList.add("gm-hide");
      var num = el("b", { class: "sc-score-num", text: "0" });
      var words = score === TOTAL
        ? "여덟 문제를 모두 맞혔습니다."
        : TOTAL + "문제 가운데 " + score + "문제를 맞혔습니다. 다시 하면서 틀린 까닭을 확인합니다.";
      endBox.innerHTML = "";
      endBox.appendChild(el("div", { class: "gm-result" }, [
        el("h4", { text: "결과" }),
        el("div", { class: "sc-score" }, [num, el("span", { text: " / " + TOTAL })]),
        el("p", { text: words }),
        el("div", { class: "gm-lesson" }, [
          el("b", { class: "sc-habit-title", text: "사기를 막는 네 가지 습관" }),
          el("ol", { class: "sc-habits" }, HABITS.map(function (h, i) {
            return el("li", { text: h, style: { animationDelay: (0.15 + i * 0.18) + "s" } });
          }))
        ])
      ]));
      endBox.classList.remove("gm-hide");
      var finalScore = score;
      later(function () { ui.countUp(num, finalScore, 700); }, 60);
      later(function () { num.textContent = String(finalScore); }, 950);
    }

    function restart() {
      clearTimers();
      order = shuffle(MSGS);
      idx = 0;
      score = 0;
      scoreB.textContent = "0";
      dots.forEach(function (d) { d.className = ""; });
      endBox.classList.add("gm-hide");
      endBox.innerHTML = "";
      main.classList.remove("gm-hide");
      show();
    }

    restart();
  };
})();
