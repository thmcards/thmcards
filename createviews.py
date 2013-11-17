import httplib, json
import sys
import socket
import os, io
import base64

class CouchConnection(httplib.HTTPConnection):
	"""docstring for CouchConnection"""
	def __init__(self, host="127.0.0.1", port=5984, username="admin", password="admin"):
		httplib.HTTPConnection.__init__(self, host, port)
		self.username = username
		self.password = password		

	def request(self, method, path, body="", header={}):
		if self.username != "" and self.password != "":
			creds = base64.encodestring('%s:%s' % (username, password)).replace('\n', '')
			header["Authorization"] = "Basic %s" % creds
		httplib.HTTPConnection.request(self, method, path, body, header)
		

def database_exists(conn, db):
	conn.request("HEAD", "/" + db)
	res = conn.getresponse()
	res.read()
	return res.status == 200

def database_create(conn, db):
	conn.request("PUT", "/" + db)
	res = conn.getresponse()
	res.read()
	return res.status == 201

def view_exists(conn, view_url):
	conn.request("HEAD", view_url)
	res = conn.getresponse()
	res.read()
	return res.status == 200

def view_create(conn, view_url, view):
	conn.request("POST", view_url, view.read(), { "Content-Type": "application/json" })
	res = conn.getresponse()
	res.read()
	return res.status == 201

def view_read(conn, view_url):
	conn.request("GET", view_url)
	res = conn.getresponse()
	return res.read()

def view_revision(conn, view_url):
	view_document = json.loads(view_read(conn, view_url))
	return view_document["_rev"]

def view_update_revision(conn, view_url, view):
	view_updated = json.loads(view.read())
	view_updated["_rev"] = view_revision(conn, view_url)
	return json.dumps(view_updated)

def view_update(conn, view_url, view):
	conn.request("PUT", view_url, view_update_revision(conn, view_url, view), { "Content-Type": "application/json" })
	res = conn.getresponse()
	res.read()
	return res.status == 201

def view_process(conn, db, view):
	view_url = "/" + db + "/_design/" + os.path.basename(view)
	print view_url
	if not view_exists(conn, view_url):
		if not view_create(conn, "/" + db, open(view, "r")):
			print "... creation FAILED!"
	else:
		if not view_update(conn, view_url, open(view, "r")):
			print "... update FAILED!"


host = "localhost"
port = "5984"
db = "thmcards"
username = "admin"
password = "admin"

viewpath = "couchviews"

conn = CouchConnection(host, port, username, password)
try:
	if not database_exists(conn, db):
		print "Creating database '" + db + "'..."
		if not database_create(conn, db):
			print "... FAILED"
	else:
		print "Database '" + db + "' already exists."

	for view in os.listdir(viewpath):
		print "Creating view '" + view + "'..."
		view_process(conn, db, viewpath + "/" + view)
except socket.error as e:
	print "Could not connect to CouchDB <" + str(e) + ">! Exiting..."
	sys.exit(1)




