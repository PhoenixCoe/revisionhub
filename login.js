(async () => {
  const a = window.RevisionAccount;
  if (a.user) {
    location.replace(a.user.subjects.length ? "index.html" : "setup.html");
    return;
  }
  document.getElementById("main").innerHTML =
    `<div class="login-layout"><section class="login-intro"><div class="login-school-brand"><img src="https://ipswichacademy.paradigmtrust.org/wp-content/uploads/2024/05/logo.png" alt="Ipswich Academy" class="login-school-logo"></div><div class="login-intro-copy"><span class="login-label">Revision Hub</span><h1>Your next step<br>starts here.</h1><p>Your subjects, exam papers and revision checklist. Ready when you are.</p><div class="login-intro-note"><svg class="ql-arrow" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Sign in. Choose your subjects. Get started.</span></div></div></section><section class="login-card" aria-labelledby="login-title"><h2 id="login-title">Sign in to Revision Hub</h2><p>Use your school Google account to save your subjects and checklist to your account.</p><p class="school-domain">name.surname@ipswichacademy.org.uk</p><div id="google-signin"></div><p id="signin-status" role="status">Checking school sign-in…</p><div class="login-guest"><button class="primary-button" id="continue-guest" type="button">Continue on this device</button><p>Your choices and checklist stay in this browser until you clear its data. They won’t sync to your school account.</p></div></section></div>`;
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
