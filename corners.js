/* Match the Student Hub's outward-facing corners to the actual layout. */
(() => {
  const selector =
    'button:not([role="tab"]),a.nav-item,a.text-button,a.primary-button,a.ol-item,a.subject-menu-link,a.action-card,a.exam-notice,a.dashboard-subject,a.search-result,a.student-profile,.study-sidebar nav a,.subject-card,.setup-subject,a.ql-tile';
  let pending = false;
  function update() {
    pending = false;
    const groups = new Map();
    document.querySelectorAll(selector).forEach((el) => {
      if (el.closest(".main-navigation")) return;
      if (el.matches(".ql-tile") && el.closest(".subject-card")) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push({ el, rect });
    });
    for (const entries of groups.values()) {
      entries.sort(
        (a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left,
      );
      const rows = [];
      for (const entry of entries) {
        let row = rows.find(
          (row) => Math.abs(row[0].rect.top - entry.rect.top) < 12,
        );
        if (!row) {
          row = [];
          rows.push(row);
        }
        row.push(entry);
      }
      for (const [rowIndex, row] of rows.entries()) {
        row.sort((a, b) => a.rect.left - b.rect.left);
        row.forEach(({ el }, index) => {
          let shape = "middle";
          if (entries.length === 1) shape = "single";
          else if (row.length === 1)
            shape =
              rowIndex === 0
                ? "both-top"
                : rowIndex === rows.length - 1
                  ? "both-bottom"
                  : "middle";
          else if (rows.length === 1)
            shape =
              index === 0
                ? "left"
                : index === row.length - 1
                  ? "right"
                  : "middle";
          else if (rowIndex === 0)
            shape =
              index === 0
                ? "left-top"
                : index === row.length - 1
                  ? "right-top"
                  : "middle";
          else if (rowIndex === rows.length - 1)
            shape =
              index === 0
                ? "left-bottom"
                : index === row.length - 1
                  ? "right-bottom"
                  : "middle";
          if (el.dataset.cornerShape !== shape) el.dataset.cornerShape = shape;
        });
      }
    }
  }
  function schedule() {
    if (!pending) {
      pending = true;
      requestAnimationFrame(update);
    }
  }
  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden", "open"],
  });
  new ResizeObserver(schedule).observe(document.body);
  window.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("click", schedule);
  document.fonts?.ready.then(schedule);
  schedule();
})();
