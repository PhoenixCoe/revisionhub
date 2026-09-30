"""Check shared navigation, local assets and JavaScript syntax without a browser."""
from pathlib import Path
from html.parser import HTMLParser
import subprocess

ROOT = Path(__file__).resolve().parent.parent
class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.destinations = []
        self.assets = []
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if attrs.get('id'): self.ids.append(attrs['id'])
        if attrs.get('data-nav'): self.destinations.append(attrs['data-nav'])
        if tag in ('script', 'img', 'link'):
            url = attrs.get('src') or attrs.get('href')
            if url and not url.startswith(('https:', 'http:', 'data:', '//')):
                self.assets.append(url.split('?')[0])

for file in ROOT.glob('*.html'):
    page = Page()
    page.feed(file.read_text())
    assert len(page.ids) == len(set(page.ids)), f'Duplicate IDs: {file.name}'
    if page.destinations:
        assert page.destinations == ['home', 'subjects', 'revision-skills', 'intervention', 'account'], file.name
    for asset in page.assets:
        assert (ROOT / asset).is_file(), f'Missing {asset} on {file.name}'
for file in ROOT.glob('*.js'):
    subprocess.run(['node', '--check', str(file)], check=True, capture_output=True)
print('All pages passed navigation, unique-ID, local-asset and JavaScript checks.')
