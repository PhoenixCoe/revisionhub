import os, tempfile, unittest, threading, http.client, json, time
from unittest.mock import patch
os.environ['IA_APP_DATA']=tempfile.mkdtemp(prefix='ia-account-tests-')
import server

class AccountTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
  cls.port=cls.http.server_port
  server.ORIGIN=f'http://127.0.0.1:{cls.port}'
  threading.Thread(target=cls.http.serve_forever,daemon=True).start()
  with server.db() as c:
   for uid in ['one','two']:
    c.execute('INSERT INTO students(id,email,name) VALUES (?,?,?)',(uid,uid+'@example.invalid',uid))
    c.execute('INSERT INTO sessions VALUES (?,?,?)',(server.hashed(uid),uid,time.time()+600))
 @classmethod
 def tearDownClass(cls): cls.http.shutdown();cls.http.server_close()
 def request(self,path,body=None,cookie='',origin=None):
  conn=http.client.HTTPConnection('127.0.0.1',self.port)
  conn.request('POST' if body is not None else 'GET',path,body=json.dumps(body) if body is not None else None,headers={'Content-Type':'application/json','Origin':origin or server.ORIGIN,'Cookie':'ia_session='+cookie})
  response=conn.getresponse();result=(response.status,json.loads(response.read()));conn.close();return result
 def test_verified_profile_picture(self):
  picture='https://lh3.googleusercontent.com/a/test'
  with server.db() as c: c.execute('UPDATE students SET picture=? WHERE id=?',(picture,'one'))
  profile=self.request('/api/me',cookie='one')[1]['user']
  self.assertEqual(profile['picture'],picture)
  self.assertEqual(profile['name'],'one')
  self.assertEqual(server.safe_picture('https://googleusercontent.com.evil.invalid/a'),'')
  self.assertEqual(server.safe_picture('javascript:alert(1)'),'')
  self.assertEqual(server.safe_picture(None),'')
 def test_unauthenticated_save_rejected(self):self.assertEqual(self.request('/api/profile',{'subjects':[]})[0],401)
 def test_cross_origin_rejected(self):self.assertEqual(self.request('/api/profile',{'subjects':[]},'one','https://other.invalid')[0],403)
 def test_account_isolation_and_persistence(self):
  self.assertEqual(self.request('/api/profile',{'subjects':['subjects/english']},'one')[0],200)
  self.assertEqual(self.request('/api/me',cookie='one')[1]['user']['subjects'],['subjects/english'])
  self.assertEqual(self.request('/api/me',cookie='two')[1]['user']['subjects'],[])
 def test_invalid_tasks_rejected(self):self.assertEqual(self.request('/api/profile',{'tasks':[{'text':'','id':'x','done':False}]},'one')[0],400)
 def test_unconfigured_google_is_not_fake_login(self):self.assertEqual(self.request('/api/auth/google',{'credential':'fake'})[0],503)
 def test_logout_revokes_session(self):
  self.assertEqual(self.request('/api/logout',{},'two')[0],200)
  self.assertIsNone(self.request('/api/me',cookie='two')[1]['user'])
 def test_department_permissions_drafts_and_publish(self):
  subject='subjects/geography'; query='/api/department?subject='+subject
  page={'layout':'resources','blocks':[{'type':'announcement','title':'Revision session','body':'Test content','links':[]}]}
  server.STAFF={'one@example.invalid':[subject]}
  self.assertEqual(self.request(query+'&draft=1',cookie='two')[0],403)
  self.assertEqual(self.request('/api/department/publish',{'subject':subject,'page':page,'version':0},'two')[0],403)
  self.assertEqual(self.request('/api/department/draft',{'subject':subject,'page':page,'version':0},'one')[0],200)
  self.assertEqual(self.request(query)[1]['page']['blocks'],[])
  self.assertEqual(self.request(query+'&draft=1',cookie='one')[1]['page'],page)
  self.assertEqual(self.request('/api/department/publish',{'subject':subject,'page':page,'version':0},'one')[0],409)
  self.assertEqual(self.request('/api/department/publish',{'subject':subject,'page':page,'version':1},'one')[0],200)
  self.assertEqual(self.request(query)[1]['page'],page)
  with server.db() as c:self.assertEqual(c.execute('SELECT count(*) FROM department_history').fetchone()[0],1)
 def test_department_url_validation(self):
  bad={'layout':'exams','blocks':[{'type':'resources','title':'Links','body':'','links':[{'label':'Bad','url':'javascript:alert(1)'}]}]}
  self.assertFalse(server.valid_department(bad))
if __name__=='__main__':unittest.main()
