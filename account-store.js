"use strict";
window.RevisionAccount = { user: null, available: false, ready: null };
const account = window.RevisionAccount;
account.request = async (path, data) => {
  const response = await fetch(path, {
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
  });
  if (!response.ok) {
    let message = "Your changes could not be saved. Please try again.";
    try {
      message = (await response.json()).error || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
};
account.ready = account
  .request("/api/me")
  .then((result) => {
    account.user = result.user;
    account.available = true;
  })
  .catch(() => {});
account.save = async (data) => {
  const result = await account.request("/api/profile", data);
  account.user = result.user;
};
account.report = (message) => {
  let notice = document.getElementById("account-notice");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "account-notice";
    notice.setAttribute("role", "alert");
    document.body.append(notice);
  }
  notice.textContent = message;
};
