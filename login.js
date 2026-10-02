(async () => {
  const a = window.RevisionAccount;
  if (a.user) {
    location.replace(window.RevisionSubjects.valid(a.user.subjects) ? "index.html" : "setup.html");
    return;
  }
  document.getElementById("main").innerHTML =
    `<div class="login-layout login-welcome">
      <section class="login-intro" aria-labelledby="welcome-title">
        <div class="login-school-brand"><img src="images/ipswich-academy-small-logo.ico" alt="" class="login-school-logo"><span>Ipswich Academy</span></div>
        <div class="login-intro-copy"><img src="images/revision-hub-logo.png" alt="" class="login-hub-logo"><h1 id="welcome-title">Revision starts <em>here.</em></h1><p>Your subjects. Your resources. Your next step.</p></div>
        <ul class="login-feature-tiles" aria-label="What you can do">
          <li><i class="fa-solid fa-book-open" aria-hidden="true"></i><span>Subject resources</span></li>
          <li><i class="fa-solid fa-file-lines" aria-hidden="true"></i><span>Exam papers</span></li>
          <li><i class="fa-solid fa-list-check" aria-hidden="true"></i><span>Your checklist</span></li>
        </ul>
      </section>
      <section class="login-card" aria-labelledby="login-title">
        <div class="login-entry-symbol"><i class="fa-solid fa-user-graduate" aria-hidden="true"></i></div>
        <span class="login-kicker">IA Revision Hub</span><h2 id="login-title">Ready to revise?</h2><p>Sign in with your school account to keep your subjects and checklist together.</p>
        <div class="school-account-hint"><i class="fa-solid fa-school" aria-hidden="true"></i><span>@ipswichacademy.org.uk</span></div>
        <div id="google-signin"></div><p id="signin-status" role="status">Checking school sign-in…</p>
        <div class="login-guest"><button class="primary-button" id="continue-guest" type="button"><i class="fa-solid fa-laptop" aria-hidden="true"></i> Continue on this device <svg class="ql-arrow" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button><p>Saved in this browser only.</p></div>
        <div class="login-first-time"><i class="fa-solid fa-sliders" aria-hidden="true"></i><div><strong>First visit?</strong><p>Choose your options and science course next.</p></div></div>
      </section></div>`;
  document.getElementById("continue-guest").addEventListener("click", () => {
    try {
      sessionStorage.setItem("ia-guest-session", "true");
      location.href = "setup.html";
    } catch {
      document.getElementById("signin-status").textContent =
        "Allow browser storage to continue on this device.";
    }
  });
  const status = document.getElementById("signin-status");
  try {
    const config = await a.request("/api/auth/config");
    if (!config.configured) {
      status.textContent =
        "School Google sign-in is not connected yet. You can continue on this device for now.";
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onerror = () => {
      status.textContent =
        "Google sign-in could not load. Refresh to try again, or continue on this device.";
    };
    script.onload = () => {
      google.accounts.id.initialize({
        client_id: config.clientId,
        nonce: config.nonce,
        auto_select: false,
        callback: async (response) => {
          status.textContent = "Signing in…";
          try {
            const result = await a.request("/api/auth/google", {
              credential: response.credential,
            });
            sessionStorage.removeItem("ia-guest-session");
            location.href = "setup.html";
          } catch (error) {
            status.textContent = error.message;
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
      status.textContent = "Sign in with your @ipswichacademy.org.uk account.";
    };
    document.head.append(script);
  } catch {
    status.textContent =
      "School sign-in is unavailable right now. You can continue on this device.";
  }
})();
