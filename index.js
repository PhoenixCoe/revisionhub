(async () => {
  await window.RevisionAccount.ready;
  const startPage = document.body.dataset.page;
  if (startPage?.endsWith("english-flashcards")) {
    location.replace("english.html#flashcards");
    return;
  }
  let guestSession = false;
  try {
    guestSession =
      sessionStorage.getItem("ia-guest-session") === "true" ||
      localStorage.getItem("ia-setup-complete") === "true";
  } catch {}
  if (
    startPage === "login" ||
    (!window.RevisionAccount.user &&
      !guestSession &&
      startPage !== "department-editor" &&
      !new URLSearchParams(location.search).has("department-preview"))
  ) {
    if (startPage !== "login") {
      location.replace("login.html");
      return;
    }
    document.body.classList.add("onboarding");
    const script = document.createElement("script");
    script.src = "login.js?v=footer-clean2";
    document.body.append(script);
    return;
  }

  let setupComplete = false;
  try {
    setupComplete = window.RevisionAccount.user
      ? window.RevisionAccount.user.subjects.length > 0
      : localStorage.getItem("ia-setup-complete") === "true";
  } catch {}
  let profileSubjects = window.RevisionAccount.user?.subjects;
  if (!profileSubjects) {
    try {
      profileSubjects = JSON.parse(
        localStorage.getItem("ia-revision-subjects") || "[]",
      );
    } catch {
      profileSubjects = [];
    }
  }
  if (!Array.isArray(profileSubjects)) profileSubjects = [];
  if (
    profileSubjects &&
    (!["subjects/mathematics", "subjects/english"].every((id) =>
      profileSubjects.includes(id),
    ) ||
      !(
        profileSubjects.includes("subjects/science-combined") ||
        [
          "subjects/biology-triple-science",
          "subjects/chemistry-triple-science",
          "subjects/physics-triple-science",
        ].every((id) => profileSubjects.includes(id))
      ))
  )
    setupComplete = false;
  if (
    startPage === "setup" ||
    (!setupComplete &&
      startPage !== "department-editor" &&
      !new URLSearchParams(location.search).has("department-preview"))
  ) {
    document.body.classList.add("onboarding");
    document.title = "Choose your subjects | Revision Hub";
    const script = document.createElement("script");
    script.src = "setup.js?v=choices3";
    document.body.append(script);
    return;
  }

  const pages = window.HUB_CONTENT;
  let departmentSettings = {};
  try {
    departmentSettings = await (await fetch("departments.json")).json();
  } catch {}
  if (startPage?.startsWith("subjects/")) {
    try {
      const result = await window.RevisionAccount.request(
        "/api/department?subject=" + encodeURIComponent(startPage),
      );
      departmentSettings[startPage] = result.page;
    } catch {}
    if (new URLSearchParams(location.search).has("department-preview")) {
      try {
        const draft = JSON.parse(
          sessionStorage.getItem("ia-department-preview-" + startPage),
        );
        if (draft) departmentSettings[startPage] = draft;
      } catch {}
    }
  }

  const main = document.getElementById("main");
  const esc = (s) =>
    String(s ?? "").replace(
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
  const clean = (s) =>
    String(s ?? "")
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
      .replace(/—/g, ", ")
      .trim();
  const arrow =
    '<svg class="ql-arrow" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function icon(name) {
    const names = {
      book: "book-open",
      maths: "calculator",
      science: "flask",
      art: "palette",
      business: "briefcase",
      code: "code",
      film: "film",
      language: "language",
      globe: "earth-europe",
      heart: "heart",
      history: "landmark",
      food: "utensils",
      media: "photo-film",
      music: "music",
      sport: "person-running",
      drama: "masks-theater",
      faith: "hands-praying",
      physics: "atom",
      calendar: "calendar-days",
    };
    return `<span class="subject-icon" aria-hidden="true"><i class="fa-solid fa-${names[name] || "book-open"}"></i></span>`;
  }
  const subjects = pages.filter(
    (p) => p.id.startsWith("subjects/") && !p.id.endsWith("english-flashcards"),
  );
  const priority = ["english", "mathematics", "science-combined"];
  subjects.sort((a, b) => {
    const ai = priority.indexOf(a.id.split("/").pop()),
      bi = priority.indexOf(b.id.split("/").pop());
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  const icons = {
    english: "book",
    mathematics: "maths",
    "science-combined": "science",
    art: "art",
    "business-studies": "business",
    "computer-science": "code",
    "film-studies": "film",
    french: "language",
    "further-maths-and-statistics": "maths",
    geography: "globe",
    "health-and-fitness": "heart",
    history: "history",
    "hospitality-and-catering": "food",
    imedia: "media",
    music: "music",
    pe: "sport",
    "performing-arts": "drama",
    "religious-studies": "faith",
    "biology-triple-science": "science",
    "chemistry-triple-science": "science",
    "physics-triple-science": "physics",
  };
  function tile(p) {
    return `<a class="ql-tile" href="#/${esc(p.id)}">${icon(icons[p.id.split("/").pop()])}<h2>${esc(p.title)}</h2>${arrow}</a>`;
  }
  function safeUrl(url) {
    if (url.startsWith("#/")) return url;
    try {
      const u = new URL(url);
      if (!["http:", "https:"].includes(u.protocol)) return "#/home";
      if (u.hostname === "sites.google.com") return "#/home";
      return u.href;
    } catch {
      return "#/home";
    }
  }
  function link(url, label, extra = "") {
    const u = safeUrl(url);
    return `<a class="ol-item" href="${esc(u)}" ${u.startsWith("#") ? "" : 'target="_blank" rel="noopener noreferrer"'}><span>${esc(label)}${extra ? `<small>${esc(extra)}</small>` : ""}</span>${arrow}</a>`;
  }
  function savedSubjects() {
    if (window.RevisionAccount.user)
      return window.RevisionAccount.user.subjects;
    try {
      return JSON.parse(
        localStorage.getItem("ia-revision-subjects") || "[]",
      ).filter((id) => subjects.some((p) => p.id === id));
    } catch {
      return [];
    }
  }
  function saveSubjects(ids) {
    const a = window.RevisionAccount;
    if (a.user) {
      const previous = a.user.subjects;
      a.user.subjects = ids;
      a.save({ subjects: ids }).catch((e) => {
        a.user.subjects = previous;
        a.report(e.message);
      });
    } else {
      try {
        localStorage.setItem("ia-revision-subjects", JSON.stringify(ids));
      } catch {
        a.report("This browser could not save your subjects.");
      }
    }
  }
  function subjectCard(p, pinnable = false) {
    const saved = savedSubjects().includes(p.id);
    return `<div class="subject-card${saved ? " is-saved" : ""}"><a class="ql-tile" href="${pageURL(p.id)}">${icon(icons[p.id.split("/").pop()])}<h2>${esc(p.title)}</h2>${pinnable ? "" : arrow}</a>${pinnable ? `<button class="pin-subject" data-pin="${esc(p.id)}" aria-label="${saved ? "Unpin" : "Pin"} ${esc(p.title)}" aria-pressed="${saved}" title="${saved ? "Unpin" : "Pin"} subject"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/></svg></button>` : ""}</div>`;
  }
  window.RevisionSubjectCard = subjectCard;
  function home() {
    const user = window.RevisionAccount.user;
    let tasks = [];
    try {
      tasks = user
        ? user.tasks
        : JSON.parse(localStorage.getItem("ia-revision-tasks") || "[]");
    } catch {}
    if (!Array.isArray(tasks)) tasks = [];
    const completed = tasks.filter((t) => t.done === true).length;
    const name = user?.name?.trim();
    document.querySelector(".hero h1").textContent = name
      ? "Hello, " + name + "!"
      : "Hello!";
    document.querySelector(".hero-content__text>p").textContent =
      "Your subjects, your checklist, your next step.";
    const selected = subjects.filter((p) => savedSubjects().includes(p.id));
    main.innerHTML = `<div class="hub-container platform-home"><section class="home-progress" aria-labelledby="progress-title"><div class="section-row"><h2 class="section-heading" id="progress-title">Your study overview</h2><a class="text-button" href="account.html">Open checklist <svg class="ql-arrow" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a></div><dl class="revision-stats"><div><dt>Options chosen</dt><dd>${selected.filter((p) => !["subjects/english", "subjects/mathematics", "subjects/science-combined", "subjects/biology-triple-science", "subjects/chemistry-triple-science", "subjects/physics-triple-science"].includes(p.id)).length}</dd></div><div><dt>Tasks completed</dt><dd>${completed}<small> of ${tasks.length}</small></dd></div><div><dt>Tasks still to do</dt><dd>${tasks.length - completed}</dd></div></dl><p class="stats-caption">${tasks.length ? "Maths, English and Science are compulsory and are not counted as options. Counts from your current revision checklist. Completing a task means you have ticked it off." : "Maths, English and Science are not counted as options. No revision tasks yet. Add your first task in My revision to start tracking your checklist."} ${user ? "Saved to your school account." : "Saved in this browser."}</p></section><section class="home-key-info"><div class="section-row"><div><h2 class="section-heading">Key information</h2></div></div><div class="key-info-grid"><a class="exam-notice" href="https://drive.google.com/file/d/1HS9sv_103hDHQ5vN4-NzLmHnm5gUY16Q/view?usp=sharing" target="_blank" rel="noopener noreferrer"><span class="notice-label">YEAR 11</span><h3>November mock timetable</h3><p>Check the school’s printable timetable and plan your preparation.</p><span class="card-action">View timetable ${arrow}</span></a><a class="exam-notice intervention-notice" href="intervention.html"><span class="notice-label">EXTRA SUPPORT</span><h3>Intervention sessions</h3><p>Find out about extra help with your revision.</p><span class="card-action">View intervention ${arrow}</span></a></div></section><section class="dashboard-launch"><div>${icon("book")}<div><h2>My revision</h2><p>Open your subjects and revision checklist.</p></div></div><a class="primary-link" href="account.html">Open My revision ${arrow}</a></section><section class="home-subjects"><div class="section-row"><h2 class="section-heading">My subjects</h2><a class="text-button" href="account.html">Manage subjects ${arrow}</a></div><div class="quicklinks">${selected.map((p) => subjectCard(p)).join("")}</div>${selected.length ? "" : "<p>Choose your subjects in setup to get started.</p>"}</section><section class="platform-support"><div class="section-row"><h2 class="section-heading">Revision help</h2></div><div class="action-grid"><a class="action-card" href="revision-skills.html">${icon("book")}<div><h3>Revision skills</h3><p>The school’s advice on revision and self-testing.</p><span class="card-action">Read the advice ${arrow}</span></div></a><a class="action-card" href="https://drive.google.com/open?id=1Lht-ivUX8hHC_ctdWN8eaKW8sl4xVoQ7ptxsj7jLgAU" target="_blank" rel="noopener noreferrer">${icon("calendar")}<div><h3>Plan your week</h3><p>Download a blank weekly revision timetable.</p><span class="card-action">Open template ${arrow}</span></div></a><a class="action-card flashcards-highlight" href="english.html#flashcards">${icon("book")}<div><h3>English flashcards</h3><p>Practise texts, poetry and language skills.</p><span class="card-action">Open flashcards ${arrow}</span></div></a></div></section><div class="platform-footer-help"><strong>Need help finding something?</strong><p>Ask your subject teacher or Miss Ince.</p><a href="subjects.html">Browse every subject ${arrow}</a></div></div>`;
  }
  function directory() {
    main.innerHTML = `<div class="hub-container"><header class="directory-intro"><div class="breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">›</span><span>Subjects</span></div><h2 id="page-title">Your subjects</h2><p>Course details, exam information and revision resources, all in one place.</p></header><div class="directory-controls"><div class="filter-chips" role="group" aria-label="Filter subjects"><button data-filter="all" aria-pressed="true">All subjects</button><button data-filter="saved" aria-pressed="false">My subjects</button><button data-filter="core" aria-pressed="false">Core</button><button data-filter="options" aria-pressed="false">Options</button><button data-filter="science" aria-pressed="false">Triple science</button></div><label class="search-field"><input id="subject-search" type="search" aria-label="Search subjects" placeholder="Search subjects"></label></div><div class="directory-meta"><span id="result-count" aria-live="polite"></span><span>Choose your subjects in setup.</span></div><div class="quicklinks" id="subject-grid"></div><div id="empty" class="empty-state" hidden><h3>No subjects to show</h3><p id="empty-message"></p><button class="text-button" id="reset-directory">Show all subjects</button></div></div>`;
    let filter = "all";
    const search = document.getElementById("subject-search");
    function render() {
      const saved = savedSubjects();
      const found = subjects.filter((p) => {
        const core = priority.includes(p.id.split("/").pop());
        const triple = p.id.includes("triple-science");
        return (
          p.title.toLowerCase().includes(search.value.toLowerCase().trim()) &&
          (filter === "all" ||
            (filter === "saved" && saved.includes(p.id)) ||
            (filter === "core" && core) ||
            (filter === "science" && triple) ||
            (filter === "options" && !core && !triple))
        );
      });
      document.getElementById("subject-grid").innerHTML = found
        .map((p) => subjectCard(p, false))
        .join("");
      document.getElementById("result-count").textContent =
        found.length + " subject" + (found.length === 1 ? "" : "s");
      document.getElementById("empty").hidden = !!found.length;
      document.getElementById("empty-message").textContent =
        filter === "saved"
          ? "Choose your subjects in setup to see them here."
          : "Try a different name or clear the filters.";
      document
        .querySelectorAll("[data-filter]")
        .forEach((b) =>
          b.setAttribute("aria-pressed", String(b.dataset.filter === filter)),
        );
    }
    search.addEventListener("input", render);
    document.querySelectorAll("[data-filter]").forEach((b) =>
      b.addEventListener("click", () => {
        filter = b.dataset.filter;
        render();
      }),
    );
    document.getElementById("subject-grid").addEventListener("click", (e) => {
      const b = e.target.closest("[data-pin]");
      if (!b) return;
      const saved = savedSubjects();
      saveSubjects(
        saved.includes(b.dataset.pin)
          ? saved.filter((id) => id !== b.dataset.pin)
          : [...saved, b.dataset.pin],
      );
      render();
      document.querySelector(`[data-pin="${b.dataset.pin}"]`)?.focus();
    });
    document.getElementById("reset-directory").addEventListener("click", () => {
      filter = "all";
      search.value = "";
      render();
    });
    render();
  }
  const domainNames = {
    "www.aqa.org.uk": "AQA course specification",
    "www.ocr.org.uk": "OCR course information",
    "qualifications.pearson.com": "Edexcel course information",
    "www.eduqas.co.uk": "Eduqas course information",
    "www.bbc.co.uk": "BBC Bitesize",
    "www.physicsandmathstutor.com": "Physics & Maths Tutor",
    "www.my-gcsescience.com": "My GCSE Science",
    "studyrocket.co.uk": "Study Rocket",
    "revise4science.weebly.com": "Revise 4 Science",
    "resources.wjec.co.uk": "WJEC revision resources",
    "resources-legacy.wjec.co.uk": "WJEC revision resources",
    "www.hoddereducation.com": "Health and Fitness revision book",
    "www.ncfe.org.uk": "NCFE course information",
    "www.youtube.com": "Revision video",
    "www.mathsgenie.co.uk": "Maths Genie",
    "sparxmaths.com": "Sparx Maths",
    "sparxscience.com": "Sparx Science",
    "auralia.cloud": "Auralia",
    "www.teoria.com": "Teoria exercises",
    "www.musictheory.net": "MusicTheory.net",
    "www.bizzwizard.co.uk": "BizzWizard",
  };
  function friendly(l, b) {
    if (l.text && !/^(https?:\/\/|www\.)/.test(l.text.trim()))
      return clean(l.text)
        .replace(/^Open (Document|Presentation), /, "")
        .replace(/ in new window$/, "");
    let rest = clean(b?.text || "")
      .replace(l.text || l.url, "")
      .replace(/^[\s:–-]+|[\s:–-]+$/g, "");
    if (rest && rest.length < 85) return rest;
    try {
      const u = new URL(l.url);
      if (
        u.pathname.includes("video%20links") ||
        u.pathname.includes("video links")
      )
        return "Core practical video links";
      return domainNames[u.hostname] || u.hostname.replace(/^www\./, "");
    } catch {
      return "Open resource";
    }
  }
  function grouped(page) {
    let groups = [];
    for (const s of page.sections.slice(1)) {
      let group = null;
      for (const b of s.blocks) {
        if (/^h[12]$/.test(b.tag)) {
          group = {
            title: clean(b.text),
            blocks: [],
            links: [],
            images: [],
            embeds: [],
          };
          groups.push(group);
        } else {
          if (!group) {
            group = groups.at(-1) || {
              title: "Revision information",
              blocks: [],
              links: [],
              images: [],
              embeds: [],
            };
            if (!groups.length) groups.push(group);
          }
          group.blocks.push(b);
        }
      }
      if (!group) {
        group = groups.at(-1) || {
          title: "Revision information",
          blocks: [],
          links: [],
          images: [],
          embeds: [],
        };
        if (!groups.length) groups.push(group);
      }
      if (!s.blocks.length && s.text.trim())
        group.blocks.push({ tag: "p", text: s.text, links: [] });
      const used = new Set(s.blocks.flatMap((b) => b.links).map((l) => l.url));
      group.links.push(...s.links.filter((l) => !used.has(l.url)));
      group.images.push(...s.images.filter((i) => i.local));
      group.embeds.push(...s.embeds.filter((e) => e.src));
    }
    if (window.PAPER_DETAILS?.[page.id]) {
      groups = groups.filter(
        (g) => !/^Exam structure$|^Paper [1-6]:/i.test(g.title),
      );
      groups.unshift({
        title: "Exam papers at a glance",
        papers: true,
        blocks: [],
        links: [],
        images: [],
        embeds: [],
      });
    }
    const custom = (departmentSettings[page.id]?.blocks || []).map((b) => ({
      title: b.title,
      custom: b,
      blocks: [],
      links: [],
      images: [],
      embeds: [],
    }));
    return [
      ...custom,
      ...groups.filter(
        (g) =>
          g.papers ||
          g.blocks.length ||
          g.links.length ||
          g.images.length ||
          g.embeds.length,
      ),
    ];
  }
  function blockHTML(b) {
    const text = clean(b.text);
    if (!text) return "";
    const ls = b.links.filter((l) => !l.url.includes("#h."));
    if (ls.length === 1) {
      const l = ls[0];
      let remaining = text
        .replace(clean(l.text), "")
        .replace(/^[\s:–-]+|[\s:–-]+$/g, "");
      if (!remaining || /^(https?:\/\/|www\.)/.test(clean(l.text))) {
        const label = friendly(l, b);
        const note = remaining.length > 85 ? remaining : "";
        return `<div class="resource-links">${link(l.url, label, note)}</div>`;
      }
    }
    let html = esc(text);
    for (const l of ls) {
      if (!l.text) continue;
      const href = safeUrl(l.url);
      html = html.replace(
        esc(clean(l.text)),
        `<a href="${esc(href)}" ${href.startsWith("#") ? "" : 'target="_blank" rel="noopener noreferrer"'}>${esc(friendly(l, b))}</a>`,
      );
    }
    if (b.tag === "h3" || b.tag === "h4") return `<h3>${html}</h3>`;
    if (b.tag === "li") return `<ul><li>${html}</li></ul>`;
    return `<p>${html}</p>`;
  }
  function embedHTML(e, page, group, i) {
    let url = e.src;
    const title = group.title || page.title;
    const isVideo = url.includes("youtube.com/embed/");
    let open = url.replace("/preview", "/view").replace("/embed", "/present");
    if (isVideo)
      open = "https://www.youtube.com/watch?v=" + url.split("/embed/")[1];
    return `<div class="resource-links">${link(open, isVideo ? ["Listen to Bach: Badinerie", "Listen to Toto: Africa"][i] || "Open video" : `Open ${title}`)}</div><iframe class="document-frame" src="${esc(url)}" title="${esc(title)}${i ? " " + (i + 1) : ""}" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  }
  function sectionTitle(title) {
    return (
      {
        "Useful revision resources": "Revision resources",
        "Useful Revision Resources": "Revision resources",
        "Useful Revision Reference": "Reference resources",
        "Here is a blank revision timetable you can use to plan your revision and intervention:":
          "Weekly revision timetable",
        "To make the most of your time and effort, focus on these key strategies:":
          "Revision techniques",
        "Why does intervention matter?": "How intervention helps",
      }[title] || title
    );
  }
  function sectionCategory(g) {
    if (g.flashcards) return "flashcards";
    if (g.custom) return "resources";
    return /course details|exam structure|exam papers at a glance/i.test(
      g.title,
    )
      ? "exams"
      : /tips|technique|practice exam skills|master the theory|revision techniques/i.test(
            g.title,
          )
        ? "advice"
        : "resources";
  }

  function paperOverview(page, i) {
    const d = window.PAPER_DETAILS[page.id];
    return `<section class="content-section paper-overview" id="section-${i}" data-category="exams" aria-labelledby="heading-${i}"><div class="paper-heading"><div><p class="paper-eyebrow">COURSE & ASSESSMENT</p><h2 id="heading-${i}">Your exam papers</h2></div><span class="board-label"><i class="fa-solid fa-graduation-cap" aria-hidden="true"></i> ${esc(d.board)}</span></div><p class="paper-intro">Compare the papers below, then open each one for its question structure and course details.</p>${d.note ? `<p class="paper-note">${esc(d.note)}</p>` : ""}<div class="paper-cards">${d.papers.map((p, n) => `<article class="paper-card"><div class="paper-card-heading"><span class="paper-number" aria-hidden="true">${String(n + 1).padStart(2, "0")}</span><h3>${esc(p.name)}</h3></div><dl><div><dt><i class="fa-solid fa-clock" aria-hidden="true"></i> Duration</dt><dd>${esc(p.duration)}</dd></div><div><dt><i class="fa-solid fa-pen" aria-hidden="true"></i> Marks</dt><dd>${esc(p.marks)}</dd></div><div><dt><i class="fa-solid fa-chart-pie" aria-hidden="true"></i> Weighting</dt><dd>${esc(p.weight)}</dd></div></dl><details class="paper-structure" ${n === 0 ? "open" : ""}><summary>Questions and paper details <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary><div><h4>Questions & structure</h4><p>${esc(p.questions)}</p>${p.detail ? `<h4>What to expect</h4><p>${esc(p.detail)}</p>` : ""}</div></details></article>`).join("")}</div><aside class="exam-next"><i class="fa-solid fa-arrow-turn-up" aria-hidden="true"></i><div><h3>Put the paper into practice</h3><p>Pick a topic to revise, try a practice question, then check your answer against the mark scheme. Record what you need to revisit in your checklist.</p><a class="text-button" href="account.html">Open my revision checklist <svg class="ql-arrow" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a></div></aside><p class="paper-source">${esc(d.provenance)} ${d.source ? `<a href="${esc(d.source)}" target="_blank" rel="noopener noreferrer">Exam-board specification ↗</a>` : ""} ${d.extraSource ? `<a href="${esc(d.extraSource)}" target="_blank" rel="noopener noreferrer">Literature specification ↗</a>` : ""}</p></section>`;
  }

  function sectionHTML(g, i, page) {
    if (g.custom) {
      const b = g.custom;
      return `<section class="content-section department-block ${esc(b.type)}" id="section-${i}" data-category="resources"><h2>${esc(b.title)}</h2>${b.body
        .split("\n")
        .filter(Boolean)
        .map((t) => `<p>${esc(t)}</p>`)
        .join(
          "",
        )}<div class="resource-links">${b.links.map((l) => link(l.url, l.label)).join("")}</div></section>`;
    }
    if (g.papers) return paperOverview(page, i);
    const imageLinks = g.links.filter((l) => !l.text);
    const extra = g.links
      .map((l, k) => {
        let label = l.text ? friendly(l) : friendly(l);
        if (/Formulae Sheet/i.test(g.title))
          label = ["Formulae sheet 1", "Formulae sheet 2"][k] || label;
        if (/Revision Guides/i.test(g.title))
          label =
            ["Foundation revision guide", "Higher revision guide"][k] || label;
        return link(l.url, label);
      })
      .join("");
    const images = g.images.length
      ? `<details class="image-disclosure"><summary>View ${/formula/i.test(g.title) ? "formulae sheets" : "resource images"}</summary><div class="source-images">${g.images.map((im, k) => `<figure>${imageLinks[k] ? `<a class="image-link" href="${esc(safeUrl(imageLinks[k].url))}" target="_blank" rel="noopener noreferrer">` : ""}<img src="${esc(im.local)}" alt="${esc(im.alt || g.title + " " + (k + 1))}" loading="lazy">${imageLinks[k] ? "</a>" : ""}</figure>`).join("")}</div></details>`
      : "";
    let blocks = g.blocks
      .map(blockHTML)
      .join("")
      .replace(/<\/li><\/ul><ul><li>/g, "</li><li>");
    if (page.id === "subjects/history")
      blocks = blocks.replace(
        "Hard copies of revision booklets are available from the</li><li>History office",
        "Hard copies of revision booklets are available from the History office",
      );
    if (page.id === "subjects/performing-arts")
      blocks = blocks.replace(
        "<p>Key definitions</p>",
        "<p>Ask your teacher for the key definitions resource.</p>",
      );
    let note = "";
    if (page.id === "subjects/music" && g.title === "Exam structure")
      note =
        '<p class="notice">The school’s resources give different exam durations. Confirm the duration with your music teacher.</p>';
    if (
      page.id === "subjects/computer-science" &&
      g.title === "Revision Master Classes"
    )
      note =
        '<p class="notice">Check Aim 13 or ask Miss Ince for current session times.</p>';
    return `<section class="content-section" id="section-${i}" data-category="${sectionCategory(g)}" aria-labelledby="heading-${i}"><h2 id="heading-${i}">${esc(sectionTitle(g.title))}</h2>${blocks}${extra ? `<div class="resource-links">${extra}</div>` : ""}${images}${g.embeds.map((e, j) => `<details class="embed-disclosure"><summary>View ${esc(sectionTitle(g.title))}</summary>${embedHTML(e, page, g, j)}</details>`).join("")}${note}</section>`;
  }
  function pageView(page) {
    const groups = grouped(page);
    if (page.id === "subjects/english") {
      const cards = pages.find((p) => p.id.endsWith("english-flashcards"));
      if (cards)
        groups.push(...grouped(cards).map((g) => ({ ...g, flashcards: true })));
    }
    const isSubject = page.id.startsWith("subjects/");
    const flashcards = page.id.endsWith("english-flashcards");
    const preferred = departmentSettings[page.id]?.layout || "exams";
    const categories = [
      preferred,
      ...["exams", "resources", "flashcards", "advice"].filter(
        (c) => c !== preferred,
      ),
    ].filter((c) => groups.some((g) => sectionCategory(g) === c));
    const labels = {
      flashcards: "Flashcards",
      resources: "Revision resources",
      exams: "Exam papers",
      advice: "Revision advice",
    };
    const title = page.title;
    const intro = flashcards
      ? "Choose a text to open its flashcards and Quizlet set."
      : isSubject
        ? "Find your resources, understand the exams and focus your revision."
        : page.id === "revision-skills"
          ? "Plan your time, test your knowledge and build a revision routine that works for you."
          : "Get support from your teachers and make the most of revision sessions.";
    main.innerHTML = `<div class="hub-container subject-container"><header class="subject-header"><div class="breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">›</span>${isSubject ? '<a href="subjects.html">Subjects</a><span aria-hidden="true">›</span>' : ""}<span>${esc(title)}</span></div><div class="subject-title-row">${icon(icons[page.id.split("/").pop()] || "book")}<div><h2 tabindex="-1" id="page-title">${esc(title)}</h2><p>${intro}</p></div></div></header>${isSubject && categories.length > 1 ? `<div class="subject-tabs" role="tablist" aria-label="Subject information">${categories.map((c, i) => `<button role="tab" id="tab-${c}" data-category-tab="${c}" aria-selected="${i === 0}" tabindex="${i === 0 ? "0" : "-1"}" aria-controls="subject-panel">${labels[c]}</button>`).join("")}</div>` : ""}<div class="study-layout"><aside class="study-sidebar"><h3>Quick access</h3><nav aria-label="Page sections">${groups.map((g, i) => `<a href="#section-${i}" data-section-nav="${i}" data-category="${sectionCategory(g)}">${esc(sectionTitle(g.title))}</a>`).join("")}</nav><div class="study-help"><h3>Need help?</h3><p>Ask your subject teacher or Miss Ince if you can’t find what you need.</p><a href="revision-skills.html">Revision skills ${arrow}</a></div></aside><div class="page-content" id="subject-panel" ${isSubject && categories.length > 1 ? 'role="tabpanel" tabindex="0"' : ""}>${groups.map((g, i) => sectionHTML(g, i, page)).join("")}${page.id === "intervention" ? '<section class="content-section"><h2>Find your sessions</h2><p>Ask your subject teacher or Miss Ince for the current intervention timetable.</p></section>' : ""}</div></div></div>`;
    if (window.RevisionAccount.user?.departments?.includes(page.id)) {
      const edit = document.createElement("a");
      edit.className = "department-edit-link";
      edit.href =
        "department-editor.html?subject=" + encodeURIComponent(page.id);
      edit.textContent = "Edit department page";
      document.querySelector(".subject-header").append(edit);
    }

    if (isSubject && categories.length > 1) {
      let active = categories[0];
      const buttons = [...document.querySelectorAll("[data-category-tab]")];
      function selectCategory(c) {
        active = c;
        buttons.forEach((b) => {
          b.setAttribute("aria-selected", String(b.dataset.categoryTab === c));
          b.tabIndex = b.dataset.categoryTab === c ? 0 : -1;
        });
        document
          .getElementById("subject-panel")
          .setAttribute("aria-labelledby", "tab-" + c);
        document
          .querySelectorAll(
            ".page-content>[data-category],.study-sidebar [data-category]",
          )
          .forEach((el) => (el.hidden = el.dataset.category !== c));
      }
      function applyHash() {
        const category = location.hash.slice(1);
        if (categories.includes(category)) {
          selectCategory(category);
          return;
        }
        const target = document.getElementById(location.hash.slice(1));
        if (target?.dataset.category) {
          selectCategory(target.dataset.category);
          target.scrollIntoView({ behavior: "instant", block: "start" });
        }
      }
      buttons.forEach((b, i) => {
        b.addEventListener("click", () => {
          selectCategory(b.dataset.categoryTab);
          history.replaceState(
            null,
            "",
            location.pathname + location.search + "#" + b.dataset.categoryTab,
          );
        });
        b.addEventListener("keydown", (e) => {
          let next;
          if (e.key === "ArrowRight") next = (i + 1) % buttons.length;
          if (e.key === "ArrowLeft")
            next = (i - 1 + buttons.length) % buttons.length;
          if (e.key === "Home") next = 0;
          if (e.key === "End") next = buttons.length - 1;
          if (next !== undefined) {
            e.preventDefault();
            buttons[next].click();
            buttons[next].focus();
          }
        });
      });
      selectCategory(active);
      applyHash();
      window.addEventListener("hashchange", applyHash);
    }
  }
  function pageURL(id) {
    return id === "home" ? "index.html" : id.split("/").pop() + ".html";
  }
  function resolveLinks() {
    document.querySelectorAll('a[href^="#/"]').forEach((a) => {
      const [id, q] = a.getAttribute("href").slice(2).split("?");
      const section = new URLSearchParams(q || "").get("section");
      a.href = pageURL(id) + (section !== null ? "#section-" + section : "");
    });
  }
  const profile = window.RevisionAccount.user;
  const profileLink = document.createElement("a");
  profileLink.className = "student-profile";
  profileLink.href = profile ? "account.html" : "login.html";
  profileLink.setAttribute(
    "aria-label",
    profile
      ? "Open account for " + profile.name
      : "Sign in to your school account",
  );
  const profileAvatar = document.createElement("span");
  profileAvatar.className = "student-avatar";
  profileAvatar.textContent =
    profile?.name
      ?.trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  if (profile?.picture) {
    try {
      const url = new URL(profile.picture);
      if (
        url.protocol === "https:" &&
        url.hostname.endsWith(".googleusercontent.com")
      ) {
        const img = document.createElement("img");
        img.src = url.href;
        img.alt = "";
        img.referrerPolicy = "no-referrer";
        img.addEventListener("error", () => img.remove());
        profileAvatar.append(img);
      }
    } catch {}
  }
  const profileName = document.createElement("span");
  profileName.className = "student-name";
  profileName.textContent = profile?.name || "Sign in";
  profileLink.append(profileAvatar, profileName);
  document.querySelector(".main-navigation").append(profileLink);
  const currentId = document.body.dataset.page || "home";
  const currentPage = pages.find((p) => p.id === currentId);
  const heroIcon = document.querySelector(".page-hero-icon");
  if (heroIcon)
    heroIcon.innerHTML = icon(
      icons[currentId.split("/").pop()] ||
        (currentId === "intervention" ? "heart" : "book"),
    );
  if (currentId === "home") home();
  else if (currentId === "subjects") directory();
  else if (currentPage) pageView(currentPage);
  resolveLinks();
  document.title =
    (currentId === "home"
      ? "Revision Hub"
      : (currentPage?.title ||
          (currentId === "setup"
            ? "Set up your revision"
            : currentId === "department-editor"
              ? "Department editor"
              : "My revision")) + " | Revision Hub") + " | Ipswich Academy";
  document.querySelectorAll("[data-nav]").forEach((a) => {
    if (
      a.dataset.nav ===
      (currentId === "subjects" || currentId.startsWith("subjects/")
        ? "subjects"
        : currentId)
    )
      a.setAttribute("aria-current", "page");
  });
  document.querySelector(".skip-link").addEventListener("click", (e) => {
    e.preventDefault();
    main.focus();
    main.scrollIntoView();
  });
  // The old preview links still lead to the new standalone documents.
  if (location.hash.startsWith("#/")) {
    const [id, q] = location.hash.slice(2).split("?");
    const section = new URLSearchParams(q || "").get("section");
    location.replace(
      pageURL(id) + (section !== null ? "#section-" + section : ""),
    );
  }
  const subjectButton = document.getElementById("subjects-button");
  const subjectPanel = document.getElementById("subjects-panel");
  function closeSubjects() {
    subjectPanel.hidden = true;
    subjectButton.setAttribute("aria-expanded", "false");
  }
  subjectButton.addEventListener("click", () => {
    const opening = subjectPanel.hidden;
    subjectPanel.hidden = !opening;
    subjectButton.setAttribute("aria-expanded", String(opening));
    if (opening) document.getElementById("menu-search").focus();
  });
  let menuFilter = "all";
  function renderMenu() {
    const term = document
      .getElementById("menu-search")
      .value.toLowerCase()
      .trim();
    const saved = savedSubjects();
    const found = subjects.filter((p) => {
      const core = priority.includes(p.id.split("/").pop());
      const triple = p.id.includes("triple-science");
      return (
        p.title.toLowerCase().includes(term) &&
        (menuFilter === "all" ||
          (menuFilter === "saved" && saved.includes(p.id)) ||
          (menuFilter === "core" && core) ||
          (menuFilter === "options" && !core && !triple) ||
          (menuFilter === "science" && triple))
      );
    });
    found.sort((a, b) => a.title.localeCompare(b.title));
    document.getElementById("menu-count").textContent =
      found.length + " subject" + (found.length === 1 ? "" : "s");
    document
      .querySelectorAll("[data-menu-filter]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.menuFilter === menuFilter),
        ),
      );
    document.getElementById("menu-subjects").innerHTML =
      found
        .map(
          (p) =>
            `<a class="subject-menu-link ${p.id === currentId ? "current" : ""}" href="${pageURL(p.id)}" ${p.id === currentId ? 'aria-current="page"' : ""}>${icon(icons[p.id.split("/").pop()])}<span>${esc(p.title)}${p.id === currentId ? "<small>Current page</small>" : ""}</span>${arrow}</a>`,
        )
        .join("") ||
      '<p class="empty-search">' +
        (menuFilter === "saved"
          ? "Choose your subjects in setup to keep them here."
          : "No matching subjects. Try another name or group.") +
        "</p>";
  }
  document.querySelectorAll("[data-menu-filter]").forEach((b) =>
    b.addEventListener("click", () => {
      menuFilter = b.dataset.menuFilter;
      renderMenu();
    }),
  );
  document.getElementById("close-subjects").addEventListener("click", () => {
    closeSubjects();
    subjectButton.focus();
  });
  subjectButton.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      subjectPanel.hidden = false;
      subjectButton.setAttribute("aria-expanded", "true");
      document.getElementById("menu-search").focus();
    }
  });
  document.getElementById("menu-search").addEventListener("input", renderMenu);
  renderMenu();
  document.addEventListener("click", (e) => {
    if (!subjectPanel.contains(e.target) && !subjectButton.contains(e.target))
      closeSubjects();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !subjectPanel.hidden) {
      closeSubjects();
      subjectButton.focus();
    }
  });
  const searchDialog = document.getElementById("search-dialog");
  const globalInput = document.getElementById("global-search");
  const searchResults = document.getElementById("search-results");
  document.getElementById("search-button").addEventListener("click", () => {
    closeSubjects();
    searchDialog.showModal();
    globalInput.focus();
    showResults();
  });
  document
    .getElementById("close-search")
    .addEventListener("click", () => searchDialog.close());
  searchDialog.addEventListener("click", (e) => {
    if (e.target === searchDialog) searchDialog.close();
  });
  const entries = [];
  pages
    .filter((p) => p.id !== "home" && p.id !== "subjects")
    .forEach((p) => {
      entries.push({
        label: p.title,
        context: "Subject or guidance page",
        url: pageURL(p.id),
        keywords: p.title,
      });
      grouped(p).forEach((g, i) => {
        entries.push({
          label: g.title,
          context: p.title,
          url: pageURL(p.id) + "#section-" + i,
          keywords:
            p.title +
            " " +
            g.title +
            " " +
            g.blocks.map((b) => b.text).join(" "),
        });
      });
    });
  function showResults() {
    const term = globalInput.value.toLowerCase().trim();
    const matches = term
      ? entries
          .filter((e) => e.keywords.toLowerCase().includes(term))
          .slice(0, 40)
      : entries.filter((e) =>
          [
            "Revision skills",
            "Mathematics",
            "English",
            "Science (combined)",
            "Intervention",
          ].includes(e.label),
        );
    searchResults.innerHTML =
      matches
        .map(
          (e) =>
            `<a class="search-result" href="${esc(e.url)}"><span><strong>${esc(e.label)}</strong><small>${esc(e.context)}</small></span>${arrow}</a>`,
        )
        .join("") ||
      '<p class="empty-search">No results. Try a subject, topic or resource name.</p>';
    document.getElementById("search-status").textContent = term
      ? matches.length + " matching results"
      : "Quick access";
  }
  globalInput.addEventListener("input", showResults);
  // Keep generated subject-search results on real page URLs too.
  const subjectSearch = document.getElementById("subject-search");
  if (subjectSearch) subjectSearch.addEventListener("input", resolveLinks);

  searchResults.addEventListener("click", (e) => {
    if (e.target.closest("a")) searchDialog.close();
  });

  if (["account", "setup", "department-editor"].includes(currentId)) {
    const script = document.createElement("script");
    script.src =
      (currentId === "setup"
        ? "setup.js"
        : currentId === "department-editor"
          ? "department-editor.js"
          : "account.js") + "?v=revision-tiles1";
    document.body.append(script);
  }
})();
