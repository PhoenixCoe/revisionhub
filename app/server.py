"""IA Revision Hub app service. See README.md for school Google configuration."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from http.cookies import SimpleCookie
import hashlib, hmac, json, os, secrets, sqlite3, time
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get('IA_APP_DATA', str(ROOT.parent / '.ia-app-data')))
DATA.mkdir(parents=True, exist_ok=True)
DB = DATA / 'accounts.sqlite3'
PORT = int(os.environ.get('PORT', '4175'))
ORIGIN = os.environ.get('APP_ORIGIN', f'http://127.0.0.1:{PORT}').rstrip('/')
CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
DOMAIN = os.environ.get('SCHOOL_GOOGLE_DOMAIN', 'ipswichacademy.org.uk').lower()
try:
    from google.oauth2 import id_token
    from google.auth.transport.requests import Request
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

def db():
    c=sqlite3.connect(DB); c.row_factory=sqlite3.Row; return c
with db() as c:
    c.executescript('''CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, email TEXT, name TEXT, subjects TEXT DEFAULT '[]', tasks TEXT DEFAULT '[]');
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT, expires INTEGER);
    CREATE TABLE IF NOT EXISTS nonces (token TEXT PRIMARY KEY, expires INTEGER);
    CREATE TABLE IF NOT EXISTS attempts (address TEXT, at INTEGER);
    CREATE TABLE IF NOT EXISTS department_pages (subject TEXT PRIMARY KEY, draft TEXT, published TEXT, version INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS department_history (subject TEXT, version INTEGER, content TEXT, editor TEXT, at INTEGER);''')
    if 'picture' not in [row[1] for row in c.execute('PRAGMA table_info(students)')]:
        c.execute("ALTER TABLE students ADD COLUMN picture TEXT DEFAULT ''")
os.chmod(DB,0o600)
def safe_picture(value):
    if not isinstance(value,str): return ''
    url=urlparse(value)
    return value if url.scheme=='https' and (url.hostname or '').endswith('.googleusercontent.com') and not url.username and not url.password else ''

def hashed(value): return hashlib.sha256(value.encode()).hexdigest()
SUBJECT_POLICY = json.loads((ROOT / 'subject-policy.json').read_text())
def valid_subjects(subjects):
    if not isinstance(subjects, list) or any(not isinstance(s, str) for s in subjects): return False
    selected = set(subjects)
    policy = SUBJECT_POLICY
    known = set(policy['core'] + policy['combined'] + policy['triple'] + policy['options'] + policy['unlisted'])
    science = selected & set(policy['combined'] + policy['triple'])
    return (len(selected) == len(subjects) and selected <= known
            and set(policy['core']) <= selected
            and science in (set(policy['combined']), set(policy['triple']))
            and len(selected & set(policy['options'] + policy['unlisted'])) == policy['optionCount'])

def valid_profile(data):
    subjects=data.get('subjects'); tasks=data.get('tasks')
    if not isinstance(subjects,list) or len(subjects)>30 or any(not isinstance(s,str) or len(s)>100 for s in subjects): return False
    if not isinstance(tasks,list) or len(tasks)>100: return False
    return all(isinstance(t,dict) and isinstance(t.get('id'),str) and len(t['id'])<=64 and isinstance(t.get('text'),str) and 1<=len(t['text'].strip())<=200 and isinstance(t.get('done'),bool) for t in tasks)

# Set by the school administrator, never editable through a student profile.
STAFF = json.loads(os.environ.get('DEPARTMENT_EDITORS_JSON', '{}'))
def permissions(u):
    return STAFF.get(u['email'].lower(), []) if u else []
def valid_department(data):
    if not isinstance(data,dict) or data.get('layout') not in ['resources','exams','advice']: return False
    blocks=data.get('blocks')
    if not isinstance(blocks,list) or len(blocks)>30: return False
    for b in blocks:
        if not isinstance(b,dict) or b.get('type') not in ['text','announcement','resources']: return False
        if not isinstance(b.get('title'),str) or not 1<=len(b['title'].strip())<=100: return False
        if not isinstance(b.get('body'),str) or len(b['body'])>5000: return False
        links=b.get('links',[])
        if not isinstance(links,list) or len(links)>30: return False
        for link in links:
            if not isinstance(link,dict) or not isinstance(link.get('label'),str) or not 1<=len(link['label'])<=150: return False
            url=link.get('url','')
            if not isinstance(url,str) or len(url)>2000: return False
            parsed=urlparse(url)
            if parsed.scheme not in ['http','https'] or not parsed.netloc or parsed.username or parsed.password: return False
            if parsed.hostname=='sites.google.com' and '/revisionhub' in parsed.path: return False
    return True

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
    def log_message(self,*a): pass
    def cookie(self,name):
        try:
            c=SimpleCookie(self.headers.get('Cookie','')); return c[name].value if name in c else ''
        except Exception: return ''
    def cookie_header(self,name,value,age):
        return f'{name}={value}; HttpOnly; SameSite=Strict; Path=/; Max-Age={age}'+('; Secure' if ORIGIN.startswith('https:') else '')
    def response(self,code,data,cookie=None):
        body=json.dumps(data).encode(); self.send_response(code)
        self.send_header('Content-Type','application/json'); self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        if cookie: self.send_header('Set-Cookie',cookie)
        self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)
    def session(self):
        with db() as c: return c.execute('SELECT students.* FROM students JOIN sessions ON students.id=sessions.user_id WHERE token=? AND expires>?',(hashed(self.cookie('ia_session')),time.time())).fetchone()
    def public(self,u): return {'name':u['name'],'email':u['email'],'picture':safe_picture(u['picture']),'subjects':json.loads(u['subjects']),'tasks':json.loads(u['tasks']),'departments':permissions(u)}
    def do_GET(self):
        if self.path.startswith('/api/department?'):
            query=parse_qs(urlparse(self.path).query); subject=query.get('subject',[''])[0]
            if not subject.startswith('subjects/') or not (ROOT/(subject.split('/')[-1]+'.html')).is_file(): return self.response(404,{'error':'Unknown subject.'})
            editing=query.get('draft',['0'])[0]=='1'
            if editing and subject not in permissions(self.session()): return self.response(403,{'error':'You do not have permission to edit this department.'})
            defaults=json.loads((ROOT/'departments.json').read_text()).get(subject,{'layout':'exams','blocks':[]})
            with db() as c: row=c.execute('SELECT * FROM department_pages WHERE subject=?',(subject,)).fetchone()
            raw=(row['draft'] if editing else row['published']) if row else None
            return self.response(200,{'page':json.loads(raw) if raw else defaults,'version':row['version'] if row else 0})
        if self.path=='/api/me':
            u=self.session(); return self.response(200,{'user':self.public(u) if u else None})
        if self.path=='/api/auth/config':
            ready=bool(CLIENT_ID and DOMAIN and GOOGLE_AVAILABLE)
            nonce=secrets.token_urlsafe(32)
            with db() as c:
                c.execute('DELETE FROM nonces WHERE expires<?',(time.time(),))
                c.execute('INSERT INTO nonces VALUES (?,?)',(hashed(nonce),time.time()+600))
            return self.response(200,{'configured':ready,'clientId':CLIENT_ID if ready else '', 'nonce':nonce if ready else ''},self.cookie_header('ia_nonce',nonce,600))
        if self.path.startswith('/api/') or self.path.split('?')[0].startswith('/app/'):
            return self.response(404,{'error':'Not found.'})
        return super().do_GET()
    def do_POST(self):
        if self.headers.get('Origin')!=ORIGIN or self.headers.get('Content-Type','').split(';')[0]!='application/json': return self.response(403,{'error':'Please make this change from the app.'})
        try:
            n=int(self.headers.get('Content-Length','0'))
            if not 0<n<=65536: raise ValueError()
            data=json.loads(self.rfile.read(n))
            if not isinstance(data,dict): raise ValueError()
        except Exception: return self.response(400,{'error':'Invalid request.'})
        if self.path=='/api/auth/google':
            if not (CLIENT_ID and DOMAIN and GOOGLE_AVAILABLE): return self.response(503,{'error':'School sign-in has not been configured yet.'})
            with db() as c:
                c.execute('DELETE FROM attempts WHERE at<?',(time.time()-900,))
                if c.execute('SELECT COUNT(*) FROM attempts WHERE address=?',(self.client_address[0],)).fetchone()[0]>=30: return self.response(429,{'error':'Too many sign-in attempts. Try again later.'})
                c.execute('INSERT INTO attempts VALUES (?,?)',(self.client_address[0],time.time()))
            nonce=self.cookie('ia_nonce')
            try:
                info=id_token.verify_oauth2_token(str(data.get('credential','')),Request(),CLIENT_ID)
                if not info.get('email_verified') or info.get('hd','').lower()!=DOMAIN or not nonce or not hmac.compare_digest(info.get('nonce',''),nonce): raise ValueError()
                with db() as c:
                    cursor=c.execute('DELETE FROM nonces WHERE token=? AND expires>?',(hashed(nonce),time.time()))
                    if cursor.rowcount!=1: raise ValueError()
                    c.execute('INSERT INTO students(id,email,name,picture) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,name=excluded.name,picture=excluded.picture',(info['sub'],info['email'],info.get('name','Student'),safe_picture(info.get('picture',''))))
                    token=secrets.token_urlsafe(32)
                    c.execute('DELETE FROM sessions WHERE expires<?',(time.time(),))
                    c.execute('INSERT INTO sessions VALUES (?,?,?)',(hashed(token),info['sub'],time.time()+86400))
                    u=c.execute('SELECT * FROM students WHERE id=?',(info['sub'],)).fetchone()
                return self.response(200,{'user':self.public(u)},self.cookie_header('ia_session',token,86400))
            except Exception: return self.response(401,{'error':'Sign-in was not completed. Use your school Google account and try again.'})
        u=self.session()
        if not u: return self.response(401,{'error':'Please sign in again to save your revision.'})
        if self.path in ['/api/department/draft','/api/department/publish']:
            subject=data.get('subject','')
            if subject not in permissions(u): return self.response(403,{'error':'You do not have permission to edit this department.'})
            content=data.get('page')
            if not valid_department(content): return self.response(400,{'error':'Check the section titles, text and resource links.'})
            with db() as c:
                c.execute('BEGIN IMMEDIATE')
                row=c.execute('SELECT * FROM department_pages WHERE subject=?',(subject,)).fetchone()
                version=row['version'] if row else 0
                if data.get('version')!=version: return self.response(409,{'error':'Another editor saved changes. Reload before editing again.'})
                raw=json.dumps(content)
                published=raw if self.path.endswith('/publish') else (row['published'] if row else None)
                c.execute('INSERT INTO department_pages VALUES (?,?,?,?) ON CONFLICT(subject) DO UPDATE SET draft=excluded.draft,published=excluded.published,version=excluded.version',(subject,raw,published,version+1))
                if self.path.endswith('/publish'): c.execute('INSERT INTO department_history VALUES (?,?,?,?,?)',(subject,version+1,raw,u['id'],time.time()))
            return self.response(200,{'version':version+1})
        if self.path=='/api/logout':
            with db() as c: c.execute('DELETE FROM sessions WHERE token=?',(hashed(self.cookie('ia_session')),))
            return self.response(200,{'user':None},self.cookie_header('ia_session','',0))
        if self.path=='/api/profile':
            profile={'subjects':data.get('subjects',json.loads(u['subjects'])),'tasks':data.get('tasks',json.loads(u['tasks']))}
            if 'subjects' in data and not valid_subjects(data['subjects']): return self.response(400,{'error':'Choose exactly four options, plus English, Maths and one science course.'})
            if not valid_profile(profile): return self.response(400,{'error':'Check your subjects and revision tasks.'})
            tasks=[{'id':t['id'],'text':t['text'].strip(),'done':t['done']} for t in profile['tasks']]
            with db() as c:
                c.execute('UPDATE students SET subjects=?,tasks=? WHERE id=?',(json.dumps(profile['subjects']),json.dumps(tasks),u['id']))
                u=c.execute('SELECT * FROM students WHERE id=?',(u['id'],)).fetchone()
            return self.response(200,{'user':self.public(u)})
        return self.response(404,{'error':'Not found.'})
if __name__=='__main__':
    print(f'IA Revision app: {ORIGIN}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()
