/* Course selection rules shared with the account server through subject-policy.json. */
window.RevisionSubjects = {
  policy: null,
  ready: null,
  valid(subjects) {
    const p = this.policy;
    if (!p || !Array.isArray(subjects) || new Set(subjects).size !== subjects.length) return false;
    const known = [...p.core, ...p.combined, ...p.triple, ...p.options];
    if (subjects.some(id => !known.includes(id)) || !p.core.every(id => subjects.includes(id))) return false;
    const science = subjects.filter(id => [...p.combined, ...p.triple].includes(id));
    const completeScience = [p.combined, p.triple].some(course => course.length === science.length && course.every(id => science.includes(id)));
    return completeScience && subjects.filter(id => p.options.includes(id)).length === p.optionCount;
  }
};
window.RevisionSubjects.ready = fetch('subject-policy.json').then(response => {
  if (!response.ok) throw new Error('Subject choices could not load. Please reload the page.');
  return response.json();
}).then(policy => { window.RevisionSubjects.policy = policy; });
