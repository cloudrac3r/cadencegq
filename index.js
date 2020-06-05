#!/usr/local/bin/node
// @ts-check

const sqlite = require("sqlite");
const cf = require("./util/common.js");
const accu = require("./util/accumulator.js");
const {Pinski} = require("pinski")
const plugins = require("pinski/plugins")

const server = new Pinski({
	port: 8080,
	relativeRoot: __dirname,
	filesDir: "html",
	basicCacheControl: {
		exts: [
			"ttf", "woff2", "svg", "gif", "webmanifest", "ico",
			"png", "jpg", "jpeg",
			"PNG", "JPG", "JPEG"
		],
		seconds: 604800
	},
	globalHeaders: {"Access-Control-Allow-Origin": "*"}
})
plugins.setInstance(server)

server.addSassDir("sass")
server.addRoute("/blog.css", "sass/blog.sass", "sass")

server.addPugDir("pug", ["pug/old/includes"])
server.addPugDir("pug/old", ["pug/old/includes"])
server.addRoute("/", "pug/old/home.pug", "pug")

server.addRoute("/tor", "pug/tor.pug", "pug")

server.addRoute("/misc/mxid", "pug/mxid.pug", "pug")

server.addRoute("/pastes/list", "pug/old/pastes-list.pug", "pug")
server.addRoute("/pastes/submit", "pug/old/pastes-submit.pug", "pug")
server.addRoute("/pastes/[0-9]+", "pug/old/pastes-view.pug", "pug")
server.addRoute("/pastes/[0-9]+/edit", "pug/old/pastes-edit.pug", "pug")

server.addRoute("/images/submit", "pug/old/images-submit.pug", "pug")
server.addRoute("/images/list", "pug/old/images-list.pug", "pug")

server.addRoute("/urls/submit", "pug/old/urls-submit.pug", "pug")
server.addRoute("/urls/list", "pug/old/urls-list.pug", "pug")

server.addRoute("/account", "pug/old/account-details.pug", "pug")

server.addRoute("/about/privacy", "pug/old/about-privacy.pug", "pug")
server.addRoute("/about/terms", "pug/old/about-terms.pug", "pug")
server.addRoute("/about/api", "pug/old/about-apidocs.pug", "pug")
server.addRoute("/about/contact", "pug/old/about-contact.pug", "pug")
server.addRoute("/about/pgp", "pug/old/about-pgp.pug", "pug")
server.addRoute("/about/site", "pug/old/about-site.pug", "pug")
server.addRoute("/about/javascript", "pug/old/about-javascript.pug", "pug")

server.addRoute("/examples", "pug/old/examples.pug", "pug")

server.addRoute("/cloudtube/subscriptions", "pug/old/cloudtube-subscriptions.pug", "pug")
server.addRoute("/cloudtube/settings", "pug/old/cloudtube-settings.pug", "pug")

server.addRoute("/misc/discord.io", "pug/old/misc-discordio.pug", "pug")
server.addRoute("/misc/godmaster", "pug/old/misc-godmaster.pug", "pug")
server.addRoute("/misc/ccc", "pug/old/misc-ccc.pug", "pug")
server.addRoute("/misc/archivesubmit", "pug/old/misc-archivesubmit.pug", "pug")

server.addRoute("/egg", "pug/old/egg-browse.pug", "pug")
server.addRoute("/egg/card/[0-9]+", "pug/old/egg-card.pug", "pug")
server.addRoute("/egg/card/[0-9]+/fill", "pug/old/egg-fill.pug", "pug")
server.addRoute("/egg/upload", "pug/old/egg-upload.pug", "pug")

server.addRoute("/crumpet", "html/rtw-edit/index.html")
server.addRoute("/crumpet/configure", "html/rtw-edit/configure.html")
server.addRoute("/crumpet/autoconfigure", "html/rtw-edit/autoconfigure.html")
server.addRoute("/crumpet/manual", "pug/old/crumpet-manual.pug", "pug")

server.addRoute("/blog", "pug/blog-list.pug", "pug")

server.addRoute("/friends", "pug/old/friends.pug", "pug")

// 2,373,711 hits collected before adding domain logging
// 9,401,434 hits collected before pinski (2020-03-13)
let hitManager = new accu.AccumulatorManager(sqlite, 10000);
new accu.AccumulatorControl("pathHit", hitManager, "Hits", "url", "hits");
new accu.AccumulatorControl("domainHit", hitManager, "DomainHits", "domain", "hits");

sqlite.open("db/main.db").then(db => {
	const extra = require("./util/extra")({db})
	cf.log("Loaded database", "info")
	const passthrough = require("./passthrough")
	passthrough.db = db
	passthrough.extra = extra
	passthrough.pugCache = server.getExports().pugCache
	server.addAPIDir("api")
	server.startServer()
	cf.log("Started server", "info")
});
