#!/usr/local/bin/node

const fs = require("fs");
const http = require("http");
const https = require("https");
const tls = require("tls");
const path = require("path");
const mime = require("mime");
const sqlite = require("sqlite");
const cf = require("./util/common.js");
const accu = require("./util/accumulator.js");

const hostnames = ["cadence.gq", "cadence.moe"];
const httpPort = 8080;
const httpsPort = 8081;
const apiDir = "api";
const globalHeaders = {"Access-Control-Allow-Origin": "*"};
const hitUpdateMin = 10000;

const encrypt = fs.existsSync("/etc/letsencrypt");
let options;
if (encrypt) {
    function getFiles(hostname) {
        return {
            key: fs.readFileSync(`/etc/letsencrypt/live/${hostname}/privkey.pem`),
            cert: fs.readFileSync(`/etc/letsencrypt/live/${hostname}/cert.pem`),
            ca: [
                fs.readFileSync(`/etc/letsencrypt/live/${hostname}/fullchain.pem`)
            ]
        };
    }
    function getSecureContext(hostname) {
        return tls.createSecureContext(getFiles(hostname));
    }
    let secureContexts = {};
    for (let hostname of hostnames ) {
        secureContexts[hostname] = getSecureContext(hostname);
    }
    options = getFiles(hostnames[0]);
    options.SNICallback = function(domain, callback) {
        if (secureContexts[domain]) {
            callback(null, secureContexts[domain]);
        } else {
            callback(null, Object.values(secureContexts)[0]);
        }
    }
}

const webHandlers = fs.readdirSync(apiDir).map(f => path.join(apiDir, f));
const pageHandlers = [
    {web: "/", local: "index.html"},
    {web: "/pastes/list", local: "pastes/list.html"},
    {web: "/pastes/submit", local: "pastes/submit.html"},
    {web: "/pastes/[0-9]+", local: "pastes/paste.html"},
    {web: "/images/submit", local: "images/submit.html"},
    {web: "/pastes/[0-9]+/edit", local: "pastes/edit.html"},
    {web: "/images/list", local: "images/list.html"},
    {web: "/urls/submit", local: "urls/submit.html"},
    {web: "/urls/list", local: "urls/list.html"},
    {web: "/account", local: "account/details.html"},
    {web: "/about/privacy", local: "about/privacy.html"},
    {web: "/about/terms", local: "about/terms.html"},
    {web: "/about/api", local: "about/apidocs.html"},
    {web: "/about/contact", local: "about/contact.html"},
    {web: "/about/site", local: "about/site.html"},
    {web: "/examples", local: "examples/examples.html"},
    {web: "/about/javascript", local: "about/javascript.html"},
    {web: "/legacy/search", local: "legacy/search.html"},
    {web: "/legacy/[\\w-]+", local: "legacy/video.html"},
    {web: "/legacy/channel/[\\w-]+", local: "legacy/search.html"},
    {web: "/cloudtube/subscriptions", local: "cloudtube/subscriptions.html"},
    {web: "/cloudtube/settings", local: "cloudtube/settings.html"},
    {web: "/misc/discord.io", local: "misc/discordio.html"},
    {web: "/misc/godmaster", local: "misc/godmaster.html"},
    {web: "/misc/ccc", local: "misc/ccc.html"},
    {web: "/misc/archivesubmit", local: "/misc/archivesubmit.html"},
    {web: "/egg", local: "/egg/browse.html"},
    {web: "/egg/card/[0-9]+", local: "/egg/card.html"},
    {web: "/egg/card/[0-9]+/fill", local: "/egg/fill.html"},
    {web: "/egg/upload", local: "/egg/upload.html"}
];
const cacheControl = [
    "ttf", "png", "jpg", "svg"
];

// 2,373,711 hits collected before adding domain logging
let hitManager = new accu.AccumulatorManager(sqlite, 10000);
new accu.AccumulatorControl("pathHit", hitManager, "Hits", "url", "hits");
new accu.AccumulatorControl("domainHit", hitManager, "DomainHits", "domain", "hits");

let routeHandlers = [];
sqlite.open("db/main.db").then(db => {
    const extra = require("./util/extra.js")({db});
    webHandlers.forEach(h => {
        routeHandlers.push(...require(path.join(__dirname, h))({encrypt, cf, db, extra, resolveTemplates}));
    });
    cf.log("Loaded API modules", "info");
});

function mimeType(type) {
    const types = {
        "ttf": "application/font-sfnt"
    };
    return types[type.split(".")[1]] || mime.getType(type);
}

function toRange(data, req) {
    let range = "";
    if (req.headers.range && req.headers.range.startsWith("bytes")) {
        range = req.headers.range.match(/^bytes=(.*)$/)[1];
    }
    let rangeStart = range.split("-")[0] || 0;
    let rangeEnd = range.split("-")[1] || data.length-1;
    let statusCode = range ? 206 : 200;
    let headers = range ? {"Accept-Ranges": "bytes", "Content-Range": "bytes "+rangeStart+"-"+rangeEnd+"/"+data.length} : {};
    let result;
    if (!range) result = data;
    else if (range.match(/\d-\d/)) result = data.slice(range.split("-")[0]);
    else if (range.match(/\d-$/)) result = data.slice(range.split("-")[0]);
    else if (range.match(/^-\d/)) result = data.slice(0, range.split("-")[1]);
    else result = data;
    return {result, headers, statusCode};
}

async function resolveTemplates(page) {
    let promises = [];
    let template;
    let regex = /<!-- TEMPLATE (\S+?) -->/g;
    while (template = regex.exec(page)) {
        let templateName = template[1];
        promises.push(new Promise(resolve => {
            fs.readFile(path.join(__dirname, "templates", templateName+".html"), {encoding: "utf8"}, (err, content) => {
                if (err) resolve(undefined);
                else resolve({template: templateName, content: content});
            });
        }));
    }
    let results = await Promise.all(promises);
    results.filter(r => r).forEach(result => {
        page = page.replace("<!-- TEMPLATE "+result.template+" -->", result.content);
    });
    return page;
}

function serverRequest(req, res) {
    if (req.headers.host) hitManager.add("domainHit", req.headers.host);
    req.gmethod = req.method == "HEAD" ? "GET" : req.method;
    if (!req.headers.host) req.headers.host = hostnames[0];
    let headers = {};
    try {
        req.url = decodeURI(req.url);
    } catch (e) {
        res.writeHead(400, {"Content-Type": "text/plain"});
        res.end("Malformed URI");
        return;
    }
    if (cacheControl.includes(req.url.split(".").slice(-1)[0])) headers["Cache-Control"] = "max-age=604800, public";
    let [reqPath, paramString] = req.url.split("?");
    if (reqPath.length > 5) reqPath = reqPath.replace(/\/+$/, "");
    let params = {};
    if (paramString) paramString.split("&").forEach(p => {
        let [key, value] = p.split("=");
        params[key] = value;
    });
    // Attempt to use routeHandlers first
    let foundRoute = routeHandlers.find(h => {
        let rr = new RegExp("^"+h.route+"$");
        let match = reqPath.match(rr);
        if (match && h.methods.includes(req.gmethod)) {
            cf.log("Using routeHandler "+h.route+" to respond to "+reqPath, "spam");
            new Promise(resolve => {
                let fill = match.slice(1);
                if (req.method == "POST" || req.method == "PATCH") {
                    let buffers = [];
                    req.on("data", (chunk) => {
                        buffers.push(chunk);
                    });
                    req.on("end", (chunk) => {
                        let body = Buffer.concat(buffers);
                        let data;
                        try {
                            data = JSON.parse(body);
                        } catch (e) {};
                        h.code({req, reqPath, res, fill, params, body, data}).then(resolve);
                    });
                } else {
                    h.code({req, reqPath, res, fill, params}).then(resolve);
                }
            }).then(result => {
                if (result === null) {
                    cf.log("Ignoring null response for request "+reqPath, "info");
                    return;
                }
                if (result.constructor.name == "Array") {
                    let newResult = {statusCode: result[0], content: result[1]};
                    if (typeof(newResult.content) == "number") newResult.content = {code: newResult.content};
                    result = newResult;
                }
                if (!result.contentType) result.contentType = (typeof(result.content) == "object" ? "application/json" : "text/plain");
                if (typeof(result.content) == "object" && ["Object", "Array"].includes(result.content.constructor.name)) result.content = JSON.stringify(result.content);
                if (!result.headers) result.headers = {};
                headers["Content-Length"] = Buffer.byteLength(result.content);
                res.writeHead(result.statusCode, Object.assign({"Content-Type": result.contentType}, headers, result.headers, globalHeaders));
                res.write(result.content);
                res.end();
                if (result.statusCode == 200) hitManager.add("pathHit", reqPath);
            });
            return true;
        }
    });
    if (!foundRoute) {
        // If that fails, try pageHandlers
        foundRoute = pageHandlers.find(h => {
            let rr = new RegExp("^"+h.web+"$");
            let match = reqPath.match(rr);
            if (match) {
                fs.readFile(path.join(__dirname, "html", h.local), {encoding: "utf8"}, (err, page) => {
                    if (err) throw err;
                    resolveTemplates(page).then(page => {
                        headers["Content-Length"] = Buffer.byteLength(page);
                        cf.log("Using pageHandler "+h.web+" ("+h.local+") to respond to "+reqPath, "spam");
                        res.writeHead(200, Object.assign({"Content-Type": mimeType(h.local)}, headers, globalHeaders));
                        if (req.method == "HEAD") {
                            res.end();
                        } else {
                            res.write(page, () => {
                                res.end();
                                hitManager.add("pathHit", reqPath);
                            });
                        }
                    });
                });
                return true;
            } else {
                return false;
            }
        });
        if (!foundRoute) {
            // If THAT fails, try reading the html directory for a matching file
            let filename = path.join(__dirname, "html", reqPath);
            fs.stat(filename, (err, stats) => {
                if (err || stats.isDirectory()) {
                    cf.log("Couldn't handle request for "+reqPath, "warning");
                    res.writeHead(404, Object.assign({"Content-Type": "text/plain"}, globalHeaders));
                    res.write("404 Not Found");
                    res.end();
                    return;
                }
                //console.log(stats);
                if (stats.size < 50*10**6 || req.headers["Range"]) { //TODO: remove range check
                    cf.log("Using file directly for "+reqPath+" (read)", "spam");
                    fs.readFile(filename, {encoding: null}, (err, content) => {
                        if (err) throw err;
                        let ranged = toRange(content, req);
                        headers["Content-Length"] = Buffer.byteLength(ranged.result);
                        res.writeHead(ranged.statusCode, Object.assign({"Content-Type": mimeType(reqPath)}, ranged.headers, headers, globalHeaders));
                        res.write(ranged.result);
                        res.end();
                        hitManager.add("pathHit", reqPath);
                    });
                } else {
                    cf.log("Using file directly for "+reqPath+" (stream)", "spam");
                    let stream = fs.createReadStream(filename);
                    headers["Content-Length"] = stats.size;
                    res.writeHead(200, Object.assign({"Content-Type": mimeType(reqPath)}, headers, globalHeaders));
                    let resReady = true;
                    stream.on("readable", () => {
                        if (resReady) doRead();
                        else {
                            //console.log("(waiting for flush)");
                            pending = true;
                        }
                    });
                    function doRead() {
                        let data = stream.read();
                        if (data == null) return; //console.log("No data available");
                        let flushed = res.write(data);
                        //console.log("Wrote data: "+data.length);
                        if (flushed) {
                            //console.log("Flushed data automatically, will read again");
                            doRead();
                        } else {
                            //console.log("Flushing data...");
                            resReady = false;
                            res.once("drain", () => {
                                //console.log("Flushed data manually, will read again");
                                resReady = true;
                                doRead();
                            });
                        }
                    }
                    stream.on("end", () => {
                        console.log("Stream ended.");
                        res.end();
                    });
                }
            });
        }
    }
}

function secureRedirect(req, res) {
    res.writeHead(301, {"Location": `https://${req.headers.host}${req.url}`});
    res.end();
}
if (encrypt) {
    http.createServer(secureRedirect).listen(httpPort, "45.77.232.172");
    //http.createServer(secureRedirect).listen(httpPort, "2001:19f0:5801:c62:5400:01ff:fe50:2b8f");
    https.createServer(options, serverRequest).listen(httpsPort, "45.77.232.172");
    //https.createServer(options, serverRequest).listen(httpsPort, "2001:19f0:5801:c62:5400:01ff:fe50:2b8f");
} else {
    http.createServer(serverRequest).listen(httpPort);
}

cf.log("Started server", "info");