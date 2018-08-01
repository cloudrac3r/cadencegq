#!/usr/local/bin/node

const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const mime = require("mime");
const sqlite = require("sqlite");
const cf = require("./util/common.js");

const hostname = "cadence.gq";
const httpPort = 8080;
const httpsPort = 8081;
const apiDir = "api";
const globalHeaders = {"Access-Control-Allow-Origin": "*"};
const hitUpdateMin = 10000;

const encrypt = fs.existsSync("/etc/letsencrypt");
let options;
if (encrypt) {
    options = {
        key: fs.readFileSync(`/etc/letsencrypt/live/${hostname}/privkey.pem`),
        cert: fs.readFileSync(`/etc/letsencrypt/live/${hostname}/cert.pem`),
        ca: [
            fs.readFileSync(`/etc/letsencrypt/live/${hostname}/fullchain.pem`)
        ]
    };
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
    {web: "/cloudtube", local: "youtube/search.html"},
    {web: "/cloudtube/search", local: "youtube/search.html"},
    {web: "/cloudtube/channel/\\S+", local: "youtube/search.html"},
    {web: "/cloudtube/[\\w-]+", local: "youtube/video.html"}
];
const cacheControl = [
    "ttf", "png", "jpg", "svg"
];

let lastHitsUpdate = 0;
let pendingHitUpdates = {};
let hitUpdatesAllowed = true;

let routeHandlers = [];
sqlite.open("db/main.db").then(db => {
    const extra = require("./util/extra.js")({db});
    webHandlers.forEach(h => {
        routeHandlers.push(...require(path.join(__dirname, h))({db, extra}));
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

function serverRequest(req, res) {
    let headers = {};
    if (cacheControl.includes(req.url.split(".")[1])) headers["Cache-Control"] = "max-age=604800, public";
    //console.log(">>> "+req.url+" "+req["user-agent"]);
    while (req.url.match(/%[0-9A-Fa-f]{2}/)) {
        req.url = req.url.replace(/%[0-9A-Fa-f]{2}/, Buffer.from(req.url.match(/%([0-9A-Fa-f]{2})/)[1], "hex").toString("utf8"));
    }
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
        if (match && h.methods.includes(req.method)) {
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
                        h.code({req, reqPath, fill, params, body, data}).then(resolve);
                    });
                } else {
                    h.code({req, reqPath, fill, params}).then(resolve);
                }
            }).then(result => {
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
                if (result.statusCode == 200) addHit(reqPath);
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
                    Promise.all(promises).then(results => {
                        results.filter(r => r).forEach(result => {
                            page = page.replace("<!-- TEMPLATE "+result.template+" -->", result.content);
                        });
                        headers["Content-Length"] = Buffer.byteLength(page);
                        cf.log("Using pageHandler "+h.web+" ("+h.local+") to respond to "+reqPath, "spam");
                        res.writeHead(200, Object.assign({"Content-Type": mimeType(h.local)}, headers, globalHeaders));
                        res.write(page, () => {
                            res.end();
                            addHit(reqPath);
                        });
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
                        addHit(reqPath);
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

async function addHit(url) {
    if (!encrypt) return;
    if (url.includes("account")) return;
    pendingHitUpdates[url] = pendingHitUpdates[url] ? pendingHitUpdates[url]+1 : 1;
    if (Date.now()-lastHitsUpdate < hitUpdateMin || !hitUpdatesAllowed || !sqlite.driver.open) return;
    const db = sqlite;
    hitUpdatesAllowed = false;
    lastHitsUpdate = Date.now();
    let allHits = await sqlite.all("SELECT * FROM Hits");
    await db.run("BEGIN TRANSACTION");
    Promise.all(Object.keys(pendingHitUpdates).map(key => {
        let promise;
        if (key != 0) {
            let row = allHits.find(row => row.url == key);
            if (row) {
                promise = db.run("UPDATE Hits SET hits = ? WHERE url = ?", [row.hits+pendingHitUpdates[key], key]);
            } else {
                promise = db.run("INSERT INTO Hits VALUES (?, ?)", [key, pendingHitUpdates[key]]);
            }
        }
        delete pendingHitUpdates[key];
        return promise;
    })).then(async () => {
        await db.run("END TRANSACTION");
        hitUpdatesAllowed = true;
        cf.log("Updated hit counts", "spam");
    }).catch(async err => {
        cf.log("Error while updating hit counts\n"+err, "error");
        await db.run("ROLLBACK");
        hitUpdatesAllowed = true;
    });
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