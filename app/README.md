# Student app service

Run from the site folder:

```sh
python3 -m venv .venv
.venv/bin/pip install -r app/requirements.txt
GOOGLE_CLIENT_ID='your-web-client-id.apps.googleusercontent.com' .venv/bin/python app/server.py
```

Open http://127.0.0.1:4175. Without a client ID the app runs a clearly labelled device-only preview. No password accounts or simulated school authentication are provided.

School IT needs to create an OAuth client of type Web application with authorised JavaScript origin `http://127.0.0.1:4175` for this local preview. The school domain is `ipswichacademy.org.uk`. Use the actual HTTPS origin when deploying. A client secret is not needed for this Google Identity Services ID-token flow. Configure the consent screen and school app access appropriately.

The server verifies Google ID tokens using google-auth: signature, issuer, audience and expiry, plus the verified email, hosted domain and one-use nonce. The Google subject identifier keys student records. Subjects and tasks are stored in SQLite separately for every student. Authentication uses one-day HttpOnly session cookies and same-origin mutation checks. Google passwords and access tokens are not stored.

Configuration: `GOOGLE_CLIENT_ID`, `SCHOOL_GOOGLE_DOMAIN`, `APP_ORIGIN`, `PORT`, `IA_APP_DATA`. Store database files outside the served directory. The default database is in a sibling `.ia-app-data` folder. Do not bundle real student data with the source.

This is a local development server. A school deployment needs HTTPS hosting, a production application server, backups and a school-managed data retention policy. Real Google sign-in still requires end-to-end testing with the configured client; it has not been exercised in this preview.

Tests: `python3 app/test_server.py`. The tests use synthetic records in a separate temporary database to check account isolation, persistence, authentication, origin checks, validation and logout.

Official integration documentation: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token

## Department pages

The editor is at `/department-editor.html?subject=subjects/geography`. Without an authorised staff account it is a labelled local draft preview; Publish is disabled. The student page does not change when a draft is saved.

School administrators assign department access through `DEPARTMENT_EDITORS_JSON`, a JSON object mapping a verified teacher email to an array of subject IDs. Example shape: `{"teacher@example.invalid":["subjects/geography"]}`. No staff access has been assigned in this preview. Google sign-in configuration is still required.

Editors can choose which area opens first and add, edit, remove or reorder text, notice and resource sections. The common header, navigation and exam information remain consistent. Changes use optimistic version checks to prevent overwriting another teacher’s work. Published versions are retained in `department_history`; a restore interface is not yet included. Plain text is escaped and links are restricted to HTTP(S).

The original source content remains the baseline. Department sections supplement it rather than replacing the captured resources.

## Frontend maintenance

Primary navigation lives in `app/navigation.html`. After changing it, run `python3 app/sync_navigation.py` to apply it to every app page. Login stays separate from the main navigation.

Run `python3 app/check_frontend.py` for JavaScript syntax, duplicate HTML IDs, local asset references and consistent navigation. Source HTML, CSS and JavaScript have been formatted with Prettier 3.6.2. Vendor files are kept as distributed.
