(async () => {
  const a = window.RevisionAccount;
  if (a.user) {
    location.replace(window.RevisionSubjects.valid(a.user.subjects) ? "index.html" : "setup.html");
    return;
  }
  document.getElementById("main").innerHTML =
    `<div class="login-layout"><section class="login-intro"><div class="login-school-brand"><img src="images/ipswich-academy-small-logo.ico" alt="Ipswich Academy" class="login-school-logo"></div><div class="login-intro-copy"><img src="images/revision-hub-logo.png" alt="" class="login-hub-logo"><span class="login-label">Ipswich Academy</span><h1>Revision Hub</h1><p>Find revision materials for your courses and keep track of what you need to practise.</p><ul class="login-features"><li>Exam timings, marks and question structure</li><li>Resources from your subject departments</li><li>A checklist for topics and practice papers</li></ul><div class="login-intro-note"><svg class="ql-arrow" viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Choose four options, then your science course.</span></div></div></section><section class="login-card" aria-labelledby="login-title"><h2 id="login-title">Sign in to Revision Hub</h2><p>Use your school Google account to save your subjects and checklist to your account.</p><p class="school-domain">name.surname@ipswichacademy.org.uk</p><div class="login-details"><h3>Before you start</h3><p>Choose the four option subjects you study, then select Combined or Triple Science. English, Maths and Science are included automatically.</p><h3>Keep your revision together</h3><p>Open your subject resources, check exam paper details and keep a checklist of what to practise. You can change your subjects in My revision.</p></div><div id="google-signin"></div><p id="signin-status" role="status">Checking school sign-in…</p><div class="login-guest"><button class="primary-button" id="continue-guest" type="button">Continue on this device</button><p>Your choices and checklist stay in this browser until you clear its data. They won’t sync to your school account.</p></div></section></div>`;
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
