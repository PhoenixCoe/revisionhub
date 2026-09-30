(() => {
  const a = window.RevisionAccount;
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const core = ["subjects/mathematics", "subjects/english"];
  const combined = ["subjects/science-combined"];
  const triple = [
    "subjects/biology-triple-science",
    "subjects/chemistry-triple-science",
    "subjects/physics-triple-science",
  ];
  let saved = [];
  try {
    saved = a.user
      ? a.user.subjects
      : JSON.parse(localStorage.getItem("ia-revision-subjects") || "[]");
  } catch {}
  if (!Array.isArray(saved)) saved = [];
  const options = window.HUB_CONTENT.filter(
    (p) =>
      p.id.startsWith("subjects/") &&
      !p.id.endsWith("english-flashcards") &&
      ![...core, ...combined, ...triple].includes(p.id),
  ).sort((a, b) => a.title.localeCompare(b.title));
  const chosen = new Set(
    saved.filter((id) => options.some((p) => p.id === id)),
  );
  let science = saved.includes(combined[0])
    ? "combined"
    : triple.every((id) => saved.includes(id))
      ? "triple"
      : "";
  const optionIcons = {
    art: "palette",
    "business-studies": "briefcase",
    "computer-science": "code",
    "film-studies": "film",
    french: "language",
    "further-maths-and-statistics": "calculator",
    geography: "earth-europe",
    "health-and-fitness": "heart-pulse",
    history: "landmark",
    "hospitality-and-catering": "utensils",
    imedia: "photo-film",
    music: "music",
    pe: "person-running",
    "performing-arts": "masks-theater",
    "religious-studies": "hands-praying",
  };
  let step = 1;
  function render() {
    document.getElementById("main").innerHTML =
      `<div class="hub-container setup-container"><div class="setup-brand"><img src="https://ipswichacademy.paradigmtrust.org/wp-content/uploads/2024/05/logo.png" alt="Ipswich Academy" class="setup-school-logo"></div><h2 tabindex="-1" id="setup-heading">${step === 1 ? "Choose your options" : "Choose your science course"}</h2><p class="setup-intro">${step === 1 ? "Select the option subjects you study." : "Choose the course you study at school."}</p>${step === 1 ? '<p class="setup-core-note">Maths, English and Science are included automatically.</p>' : ""}<form id="setup-form"><fieldset><legend class="setup-visually-hidden">${step === 1 ? "Your option subjects" : "Choose one science course"}</legend><div class="setup-grid ${step === 2 ? "science-grid" : ""}">${step === 1 ? options.map((p) => `<label class="setup-subject option-choice"><input type="checkbox" name="option" value="${esc(p.id)}" ${chosen.has(p.id) ? "checked" : ""}><span class="option-symbol" aria-hidden="true"><i class="fa-solid fa-${optionIcons[p.id.split("/").pop()] || "book-open"}"></i></span><span class="option-title">${esc(p.title)}</span><span class="option-check" aria-hidden="true"><i class="fa-solid fa-check"></i></span></label>`).join("") : `<label class="setup-subject option-choice science-choice"><input type="radio" name="science" value="combined" required ${science === "combined" ? "checked" : ""}><span class="option-symbol" aria-hidden="true"><i class="fa-solid fa-flask"></i></span><span class="option-title">Combined Science</span><span class="option-check" aria-hidden="true"><i class="fa-solid fa-check"></i></span></label><label class="setup-subject option-choice science-choice"><input type="radio" name="science" value="triple" required ${science === "triple" ? "checked" : ""}><span class="option-symbol" aria-hidden="true"><i class="fa-solid fa-atom"></i></span><span class="option-title">Triple Science<small>Biology, Chemistry and Physics</small></span><span class="option-check" aria-hidden="true"><i class="fa-solid fa-check"></i></span></label>`}</div></fieldset><p id="setup-status" role="status"></p><div class="setup-actions">${step === 2 ? '<button type="button" class="text-button" id="setup-back"><svg class="ql-arrow back-arrow" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Back</button>' : '<p id="selection-count" aria-live="polite"></p>'}<button class="primary-button" type="submit">${step === 1 ? 'Next <svg class="ql-arrow" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : 'Start revising <svg class="ql-arrow" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'}</button></div></form><p class="account-caption">${a.user ? "Saved to your school account." : "Saved on this device."}</p></div>`;
    const form = document.getElementById("setup-form");
    const count = () => {
      const target = document.getElementById("selection-count");
      if (target)
        target.textContent =
          chosen.size +
          " option" +
          (chosen.size === 1 ? "" : "s") +
          " selected";
    };
    count();
    form.addEventListener("change", (e) => {
      if (e.target.name === "option") {
        e.target.checked
          ? chosen.add(e.target.value)
          : chosen.delete(e.target.value);
        count();
      } else if (e.target.name === "science") science = e.target.value;
    });
    document.getElementById("setup-back")?.addEventListener("click", () => {
      step = 1;
      render();
      document.getElementById("setup-heading").focus();
      window.scrollTo(0, 0);
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (step === 1) {
        step = 2;
        render();
        document.getElementById("setup-heading").focus();
        window.scrollTo(0, 0);
        return;
      }
      if (!science) return;
      const selected = [
        ...core,
        ...chosen,
        ...(science === "triple" ? triple : combined),
      ];
      e.submitter.disabled = true;
      try {
        if (a.user) await a.save({ subjects: selected });
        else
          localStorage.setItem(
            "ia-revision-subjects",
            JSON.stringify(selected),
          );
        localStorage.setItem("ia-setup-complete", "true");
        location.href = "index.html";
      } catch (error) {
        document.getElementById("setup-status").textContent = error.message;
        e.submitter.disabled = false;
      }
    });
  }
  render();
})();
