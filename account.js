(() => {
  const a = window.RevisionAccount,
    main = document.getElementById("main");
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
  const local = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  };
  let tasks = a.user ? a.user.tasks : local("ia-revision-tasks");
  if (!Array.isArray(tasks)) tasks = [];
  async function save(next) {
    if (a.user) await a.save({ tasks: next });
    else localStorage.setItem("ia-revision-tasks", JSON.stringify(next));
    tasks = next;
    renderTasks();
  }
  function renderTasks() {
    const list = document.getElementById("task-list");
    list.innerHTML = tasks.length
      ? tasks
          .map(
            (t) =>
              `<li class="revision-task ${t.done ? "complete" : ""}"><label><input type="checkbox" data-task="${esc(t.id)}" ${t.done ? "checked" : ""}><span>${esc(t.text)}</span></label><button class="remove-task" data-remove="${esc(t.id)}" aria-label="Remove task: ${esc(t.text)}">×</button></li>`,
          )
          .join("")
      : '<li class="task-empty"><p>No tasks yet. You could add a topic to revisit or a past paper to finish.</p></li>';
    const done = tasks.filter((t) => t.done).length;
    document.getElementById("revision-progress").max = Math.max(
      tasks.length,
      1,
    );
    document.getElementById("revision-progress").value = done;
    document.getElementById("task-progress").textContent = tasks.length
      ? `${tasks.filter((t) => t.done).length} of ${tasks.length} tasks completed`
      : "Keep a note of what you need to revise.";
  }
  function render() {
    const user = a.user;
    const saved = user ? user.subjects : local("ia-revision-subjects");
    const subjects = window.HUB_CONTENT.filter((p) => saved.includes(p.id));
    main.innerHTML = `<div class="hub-container account-container"><div class="revision-dashboard"><section class="revision-plan"><div class="section-row"><h2 class="section-heading">To revise</h2></div><div class="checklist-summary"><p id="task-progress" aria-live="polite"></p><progress id="revision-progress" value="0" max="1" aria-label="Completed revision tasks"></progress></div><form id="task-form"><label for="new-task">Add something to your list</label><div class="task-input"><input id="new-task" maxlength="200" required placeholder="e.g. Complete a maths practice paper" autocomplete="off"><button class="primary-button" type="submit">Add task</button></div></form><ul id="task-list"></ul><p class="account-caption">${user ? "Saved to your school account." : "Saved in this browser. You can use the checklist before signing in."}</p></section><aside class="revision-subjects"><div class="section-row"><h2 class="section-heading">My subjects</h2></div><div class="quicklinks dashboard-subject-grid">${subjects.length ? subjects.map((p) => window.RevisionSubjectCard(p)).join("") : "<p>Choose your subjects to see their resources here.</p>"}</div><a class="manage-subjects" href="setup.html">${subjects.length ? "Change subjects" : "Choose my subjects"} <span aria-hidden="true"><svg class="ql-arrow" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a></aside></div><div class="account-inline-help"><div><strong>Revision advice</strong><p>The school’s notes on self-testing, practice papers and planning your time.</p></div><a href="revision-skills.html">Read the advice <svg class="ql-arrow" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a></div>${user ? `<div class="account-session"><p>Your subjects and checklist are saved to your account.</p><button class="text-button" id="sign-out">Sign out</button></div>` : `<section class="account-signin"><div><h3>School account</h3><p class="account-caption" id="signin-status">Checking school sign-in…</p></div><div id="google-signin"></div></section>`}<p id="dashboard-status" role="status"></p></div>`;
    renderTasks();
    const status = (message) =>
      (document.getElementById("dashboard-status").textContent = message);
    document
      .getElementById("task-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = document.getElementById("new-task");
        const text = input.value.trim();
        if (!text) return;
        if (tasks.length >= 100)
          return status(
            "Your checklist is full. Remove finished tasks to add more.",
          );
        const button = e.submitter;
        button.disabled = true;
        try {
          await save([
            ...tasks,
            { id: crypto.randomUUID(), text, done: false },
          ]);
          input.value = "";
          status("Task added.");
          input.focus();
        } catch (e) {
          status(e.message);
        } finally {
          button.disabled = false;
        }
      });
    document
      .getElementById("task-list")
      .addEventListener("change", async (e) => {
        if (!e.target.dataset.task) return;
        const target = e.target;
        target.disabled = true;
        try {
          await save(
            tasks.map((t) =>
              t.id === target.dataset.task ? { ...t, done: target.checked } : t,
            ),
          );
        } catch (e) {
          renderTasks();
          status(e.message);
        }
      });
    document
      .getElementById("task-list")
      .addEventListener("click", async (e) => {
        const button = e.target.closest("[data-remove]");
        if (!button) return;
        button.disabled = true;
        try {
          await save(tasks.filter((t) => t.id !== button.dataset.remove));
          status("Task removed.");
        } catch (e) {
          button.disabled = false;
          status(e.message);
        }
      });
    document.getElementById("sign-out")?.addEventListener("click", async () => {
      try {
        await a.request("/api/logout", {});
        sessionStorage.removeItem("ia-guest-session");
        location.href = "login.html";
      } catch (e) {
        status(e.message);
      }
    });
    if (!user) setupGoogle();
  }
  async function setupGoogle() {
    const status = document.getElementById("signin-status");
    try {
      const config = await a.request("/api/auth/config");
      if (!config.configured) {
        status.textContent =
          "Google sign-in is not connected yet. For now, your subjects and tasks are saved in this browser.";
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onerror = () =>
        (status.textContent =
          "Google sign-in could not load. Please try refreshing.");
      script.onload = () => {
        google.accounts.id.initialize({
          client_id: config.clientId,
          nonce: config.nonce,
          auto_select: false,
          callback: async (response) => {
            try {
              status.textContent = "Signing in…";
              const signed = await a.request("/api/auth/google", {
                credential: response.credential,
              });
              location.href = "setup.html";
            } catch (e) {
              status.textContent = e.message;
            }
          },
        });
        google.accounts.id.renderButton(
          document.getElementById("google-signin"),
          {
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
          },
        );
        status.textContent = "Use your school Google account.";
      };
      document.head.append(script);
    } catch {
      status.textContent =
        "Google sign-in is not connected yet. For now, your subjects and tasks are saved in this browser.";
    }
  }
  render();
})();
