(async () => {
  const a = window.RevisionAccount,
    esc = (s) =>
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
  const subjects = window.HUB_CONTENT.filter(
    (p) => p.id.startsWith("subjects/") && !p.id.endsWith("english-flashcards"),
  );
  const subject =
    new URLSearchParams(location.search).get("subject") || "subjects/geography";
  const current = subjects.find((p) => p.id === subject);
  if (!current) {
    document.getElementById("main").textContent = "Subject not found.";
    return;
  }
  const canEdit = a.user?.departments?.includes(subject);
  let page = { layout: "exams", blocks: [] },
    version = 0;
  try {
    const result = await a.request(
      "/api/department?subject=" +
        encodeURIComponent(subject) +
        (canEdit ? "&draft=1" : ""),
    );
    page = result.page;
    version = result.version;
  } catch {
    try {
      page = (await (await fetch("departments.json")).json())[subject] || page;
    } catch {}
  }
  if (!canEdit) {
    try {
      page =
        JSON.parse(localStorage.getItem("ia-department-draft-" + subject)) ||
        page;
    } catch {}
  }
  const main = document.getElementById("main");
  main.innerHTML = `<div class="hub-container department-editor"><div class="section-row"><h2 class="section-heading">${esc(current.title)}</h2><a class="text-button" href="${esc(subject.split("/").pop())}.html">View student page →</a></div><p class="editor-mode">${canEdit ? "Changes stay in draft until you publish." : "Editor preview: try a layout and save a draft on this device. Publishing requires a school account with department permission."}</p><div class="editor-layout"><form id="department-form"><label class="editor-label" for="department-layout">Show first</label><select id="department-layout"><option value="resources">Resources and department sections</option><option value="exams">Exam papers</option><option value="advice">Revision advice</option></select><p class="editor-help">Existing school resources and exam information stay on the page. Your sections appear in the resources area.</p><div id="department-blocks"></div><button type="button" class="text-button" id="add-block">+ Add a section</button><div class="editor-actions"><button class="primary-button" type="submit">Save draft</button><button class="text-button" type="button" id="preview-page">Preview changes</button><button class="primary-button" type="button" id="publish-page" ${canEdit ? "" : "disabled"}>Publish</button></div><p id="editor-status" role="status"></p></form><aside class="editor-preview"><h3>Student view</h3><iframe id="department-preview" title="Department page preview"></iframe></aside></div></div>`;
  const status = (t) =>
    (document.getElementById("editor-status").textContent = t);
  document.getElementById("department-layout").value = page.layout;
  function render() {
    document.getElementById("department-blocks").innerHTML = page.blocks
      .map(
        (b, i) =>
          `<fieldset class="editor-block" data-index="${i}"><legend>Section ${i + 1}</legend><div class="block-tools"><button type="button" data-move="-1" ${i === 0 ? "disabled" : ""} aria-label="Move section ${i + 1} up">↑ Up</button><button type="button" data-move="1" ${i === page.blocks.length - 1 ? "disabled" : ""} aria-label="Move section ${i + 1} down">↓ Down</button><button type="button" data-remove aria-label="Remove section ${i + 1}">Remove</button></div><label>Type<select data-field="type"><option value="text" ${b.type === "text" ? "selected" : ""}>Text</option><option value="announcement" ${b.type === "announcement" ? "selected" : ""}>Notice</option><option value="resources" ${b.type === "resources" ? "selected" : ""}>Resources</option></select></label><label>Heading<input data-field="title" required maxlength="100" value="${esc(b.title)}"></label><label>Text<textarea data-field="body" rows="4" maxlength="5000">${esc(b.body)}</textarea></label><label>Resource links <small>One per line: label | https://address</small><textarea data-field="links" rows="3" placeholder="Practice questions | https://example.org">${esc(b.links.map((l) => l.label + " | " + l.url).join("\n"))}</textarea></label></fieldset>`,
      )
      .join("");
  }
  function collect() {
    page.layout = document.getElementById("department-layout").value;
    page.blocks = [...document.querySelectorAll(".editor-block")].map((el) => ({
      type: el.querySelector("[data-field=type]").value,
      title: el.querySelector("[data-field=title]").value.trim(),
      body: el.querySelector("[data-field=body]").value,
      links: el
        .querySelector("[data-field=links]")
        .value.split("\n")
        .filter((l) => l.trim())
        .map((line) => {
          const split = line.indexOf("|");
          if (split < 1)
            throw new Error("Each link needs a label, a |, and a web address.");
          const label = line.slice(0, split).trim(),
            url = line.slice(split + 1).trim();
          let parsed;
          try {
            parsed = new URL(url);
          } catch {
            throw new Error("Enter a complete https:// address for each link.");
          }
          if (
            !["http:", "https:"].includes(parsed.protocol) ||
            parsed.username ||
            parsed.password
          )
            throw new Error("Use a normal http or https link.");
          if (
            parsed.hostname === "sites.google.com" &&
            parsed.pathname.includes("/revisionhub")
          )
            throw new Error(
              "Link directly to the resource instead of the original revision hub.",
            );
          return { label, url };
        }),
    }));
    if (page.blocks.some((b) => !b.title))
      throw new Error("Give each section a heading.");
  }
  function preview() {
    try {
      collect();
      sessionStorage.setItem(
        "ia-department-preview-" + subject,
        JSON.stringify(page),
      );
      document.getElementById("department-preview").src =
        subject.split("/").pop() + ".html?department-preview=1&v=" + Date.now();
      status("Preview updated. Nothing has been published.");
    } catch (e) {
      status(e.message);
    }
  }
  render();
  preview();
  document.getElementById("add-block").onclick = () => {
    try {
      collect();
      if (page.blocks.length >= 30)
        throw new Error("You can add up to 30 sections.");
      page.blocks.push({
        type: "text",
        title: "New section",
        body: "",
        links: [],
      });
      render();
      document.querySelector(".editor-block:last-child input").focus();
    } catch (e) {
      status(e.message);
    }
  };
  document.getElementById("department-blocks").onclick = (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    try {
      collect();
      const i = Number(button.closest("[data-index]").dataset.index);
      if (button.hasAttribute("data-remove")) page.blocks.splice(i, 1);
      else {
        const next = i + Number(button.dataset.move);
        if (next < 0 || next >= page.blocks.length) return;
        [page.blocks[i], page.blocks[next]] = [
          page.blocks[next],
          page.blocks[i],
        ];
      }
      render();
    } catch (e) {
      status(e.message);
    }
  };
  async function save(publish) {
    try {
      collect();
      if (canEdit) {
        const result = await a.request(
          "/api/department/" + (publish ? "publish" : "draft"),
          { subject, page, version },
        );
        version = result.version;
        status(
          publish
            ? "Published. Students will see this version."
            : "Draft saved. The student page has not changed.",
        );
      } else {
        localStorage.setItem(
          "ia-department-draft-" + subject,
          JSON.stringify(page),
        );
        status("Draft saved on this device. The student page has not changed.");
      }
    } catch (e) {
      status(e.message);
    }
  }
  document.getElementById("department-form").onsubmit = (e) => {
    e.preventDefault();
    save(false);
  };
  document.getElementById("preview-page").onclick = preview;
  document.getElementById("publish-page").onclick = () => save(true);
})();
