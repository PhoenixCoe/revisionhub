"""Apply the shared navigation template to every normal app page."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
navigation = (ROOT / 'app/navigation.html').read_text().strip()
for page in ROOT.glob('*.html'):
    source = page.read_text()
    updated = re.sub(r'<nav class="main-navigation".*?</nav>', lambda _: navigation, source, flags=re.S)
    if updated != source:
        page.write_text(updated)

footer = (ROOT / 'app/footer.html').read_text().strip()
for page in ROOT.glob('*.html'):
    source = page.read_text()
    updated = re.sub(r'<footer class="hub-footer">.*?</footer>', lambda _: footer, source, flags=re.S)
    if updated != source:
        page.write_text(updated)
