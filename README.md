THMcards
====================

THMcards ist eine digitale Neuauflage eines klassischen Lerninstruments. Der Service bietet Studenten einen modernen und intuitiven Zugang zu einer der nachweislich erfolgreichsten Lernmethoden. THMcards wird als moderne Single­Page­Application entwickelt und legt in der ersten Ausbaustufe den Fokus auf Desktop­-Browser.


Installationsanleitung
----------------------

THMcards benötigt zum Betrieb eine Installation von *node.js*, sowie als Datenbankmangementsystem *CouchDB*.

Im Hauptverzeichnis finden sich die Datei *development_settings.json*, sowie *production_settings.json*. In dieser sind Einstellungen zur Datenbankverbindung, sowie den Callback-Urls der Authentifizierungsprovider wie Google oder Facebook vorzunehmen. Dies ist jeweils für das Entwicklungs- und Produktivsystem möglich.

Die benötigten Datenbankviews können über das Python-Script *createviews.py* angelegt werden. Vor der Ausführung ist darauf zu achten, dort ebenfalls die Zugangsdaten zur CouchDB einzutragen. Weiter müssen die Dokumente aus der Datei *default_badges* im Ordner couchviews manuell in die Datenbank übertragen werden.

Die Installation von THMcards erfolgt über den Node Package Manager (NPM). Dieser wird automatisch zusammen mit node.js installiert. Im Verzeichnis der Applikation ist der folgende Befehl abzusetzen:

`npm install`

Alle Modulabhängigkeiten, welche in der Datei *package.json* aufgeführt sind, werden aufgelöst und die Module installiert. Je nach aktuellem Systembenutzer sind für diesen Schritt gegebenenfalls Administratorrechte notwendig.
Nach erfolgreicher Installation kann die Applikation über den Befehl

`node app.js`

gestartet werden.

Als Standardeinstellung kann THMcards auf Port 3000 unter der Adresse localhost im Browser aufgerufen werden.

Um THMcards dauerhaft zu betreiben, kann die Applikation mit forever als Daemon gestartet werden.

`npm -g install forever`
`forever start app.js`


Umschalten zwischen Entwicklungs- und Produktivumgebung erfolgt über die Umgebungsvariable NODE_ENV (default ist development):

`NODE_ENV=production forever start app.js`



Credits
---------------------

Entwicklung: Daniel Knapp, Jan Kammer
Projektleitung: Prof. Dr. Klaus Quibeldey-Cirkel

Verwendete OpenSource-Projekte:

[node.js](http://nodejs.org)
[Backbone](http://backbonejs.org)
[Marionette](http://marionettejs.com)
[Underscore](http://underscorejs.org)
[Bootstrap](http://getbootstrap.com)
[jQuery](http://jquery.com)

Danke für die Unterstützung an:

F112a (M.Sc. Christoph Thelen, M.Sc. Paul-Christian Volkmer)
AGQLS

THMcards is powered by Technische Hochschule Mittelhessen - University of Applied Sciences.