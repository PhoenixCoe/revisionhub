# IA Revision Hub

Open `index.html` directly, or serve this folder with `python3 -m http.server 4173 --bind 127.0.0.1`.

The remake uses the original IARevisionHubMock CSS, with responsive and accessibility additions in `revision.css`. It includes 21 subject pages, English flashcards, revision skills and intervention information captured from the school site. Navigation stays inside the remake. Documents and learning resources open directly. There is no dyslexia-friendly font control.

`content.js` contains the captured school content. `index.js` renders page content, the searchable subject menu and site-wide resource search. Each subject has its own standalone HTML file and URL. The ticker is removed. `navigation.css` provides the Material 3 navigation surfaces and controls. The supplied original folders were not modified.

## Known limits

- Additional browser downloads were blocked when automatic approval review hit a usage limit. The November mock timetable remains available through its printable document link. The intervention timetable image, completed revision timetable example, Computer Science session timetable and other undownloaded source images still need importing.
- Music duration is corrected to approximately 75 minutes using the Eduqas specification. Some other assessment fields still require school confirmation.
- External school documents retain their existing access permissions and may require school sign-in.
- The local header image was downloaded from the school site. The mockup's exact remote banner could not be saved in this session.


Latest layout: standalone page headers, navigation above the hero, searchable subject groups, and a homepage ordered as key information, subjects, revision guidance, then useful resources. The original neutral tiles and purple accents are retained.

## Student platform update

Use the app server in `app/README.md` for school accounts. The static preview still supports clearly labelled device-only subjects and tasks. First visits open setup; completed setup leads to My revision. Subject selection belongs in setup, while the directory remains available for browsing. Account saving uses verified Google identity and SQLite. The confirmed school domain is ipswichacademy.org.uk; the OAuth client ID has not yet been provided.

`papers.js` adds structured assessment cards for all subjects. Verified updates link to the relevant board guidance. Unknown fields remain explicitly unconfirmed. History timing and French listening reading-time corrections are included; Music duration is resolved using the Eduqas specification. Further Maths and Statistics still needs school qualification details.

The rebuilt platform uses three main navigation choices, first-visit subject setup, a personal dashboard and pastel surfaces based on the official school palette: purple #7B2E8F and orange #E08656. Colour reference: https://ipswichacademy.paradigmtrust.org/ (checked 27 September 2026).

## Original Student Hub styling and department editing

`original-hub.css` now replaces the pastel theme stylesheet in the live pages. It restores the supplied Student Hub’s neutral grey tiles, purple rules, compact photo header and asymmetric corners. Notices retain restrained tinted backgrounds.

Department defaults are in `departments.json`. The department editor supports reusable text, notice and resource sections, reordering, draft preview and permission-controlled publishing. The department API tests pass. The latest visual inspection was blocked by browser URL security policy, so the final appearance needs reviewing in the running preview.
