(function () {
  document.querySelectorAll(".quiz").forEach(function (box) {
    var answer = box.getAttribute("data-a");
    var why = box.querySelector(".why");
    var text = why.textContent;
    var row = document.createElement("div");
    row.className = "ox";
    ["O", "X"].forEach(function (v) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = v === "O" ? "o" : "x";
      b.textContent = v === "O" ? "◯" : "✕";
      b.setAttribute("aria-label", v === "O" ? "맞다" : "틀리다");
      b.addEventListener("click", function () {
        if (box.classList.contains("done")) return;
        var ok = v === answer;
        box.classList.add("done", ok ? "ok" : "no");
        row.querySelectorAll("button").forEach(function (x) { x.disabled = true; });
        b.classList.add(ok ? "right" : "wrong");
        if (!ok) row.querySelector(answer === "O" ? ".o" : ".x").classList.add("right");
        why.innerHTML = "";
        var mark = document.createElement("b");
        mark.textContent = ok ? "맞았습니다." : "아닙니다.";
        why.appendChild(mark);
        why.appendChild(document.createTextNode("정답은 " + (answer === "O" ? "◯" : "✕") + ". " + text));
        b.classList.add(ok ? "is-pop" : "is-shake");
      });
      row.appendChild(b);
    });
    box.insertBefore(row, why);
  });
  /* 장을 다시 열면 퀴즈를 처음으로 */
  document.addEventListener("chapter:show", function () {});
})();
