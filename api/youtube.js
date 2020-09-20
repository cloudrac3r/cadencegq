const ytdl = require("ytdl-core");
let auth = {};
const yts = require("youtube-search");
const rp = require("request-promise");
const fs = require("fs");
const fxp = require("fast-xml-parser");

const invidiousHost = "https://invidio.us";
const invidiojsHost = "http://localhost:4000";
const invidiojsEnabledModes = process.env.INVIDIOJS ? process.env.INVIDIOJS.split(":") : [];
function getInvidiousHost(mode) {
    if (invidiojsEnabledModes.includes(mode)) return invidiojsHost;
    else return invidiousHost;
}

const channelCacheTimeout = 4*60*60*1000;

let shareWords = [];
fs.readFile("util/words.txt", "utf8", (err, words) => {
    if (err) throw err;
    if (words) shareWords = words.split("\n");
})
const IDLetterIndex = []
.concat(Array(26).fill().map((_, i) => String.fromCharCode(i+65)))
.concat(Array(26).fill().map((_, i) => String.fromCharCode(i+97)))
.concat(Array(10).fill().map((_, i) => i.toString()))
.join("")
+"-_"

function getShareWords(id) {
    if (shareWords.length == 0) {
        console.error("Tried to get share words, but they aren't loaded yet!");
        return "";
    }
    // Convert ID string to binary number string
    let binaryString = "";
    for (let letter of id) {
        binaryString += IDLetterIndex.indexOf(letter).toString(2).padStart(6, "0");
    }
    binaryString = binaryString.slice(0, 64);
    // Convert binary string to words
    let words = [];
    for (let i = 0; i < 6; i++) {
        let bitFragment = binaryString.substr(i*11, 11).padEnd(11, "0");
        let number = parseInt(bitFragment, 2);
        let word = shareWords[number];
        words.push(word);
    }
    return words;
}
function getIDFromWords(words) {
    // Convert words to binary number string
    let binaryString = "";
    for (let word of words) {
        binaryString += shareWords.indexOf(word).toString(2).padStart(11, "0")
    }
    binaryString = binaryString.slice(0, 64);
    // Convert binary string to ID
    let id = "";
    for (let i = 0; i < 11; i++) {
        let bitFragment = binaryString.substr(i*6, 6).padEnd(6, "0");
        let number = parseInt(bitFragment, 2);
        id += IDLetterIndex[number];
    }
    return id;
}
function validateShareWords(words) {
    if (words.length != 6) throw new Error("Expected 6 words, got "+words.length);
    for (let word of words) {
        if (!shareWords.includes(word)) throw new Error(word+" is not a valid share word");
    }
}
function findShareWords(string) {
    if (string.includes(" ")) {
        return string.toLowerCase().split(" ");
    } else {
        let words = [];
        let currentWord = "";
        for (let i = 0; i < string.length; i++) {
            if (string[i] == string[i].toUpperCase()) {
                if (currentWord) words.push(currentWord);
                currentWord = string[i].toLowerCase();
            } else {
                currentWord += string[i];
            }
        }
        words.push(currentWord);
        return words;
    }
}

const {db, extra, pugCache} = require("../passthrough")
const cf = require("../util/common")

try {
    auth = require("../auth.json");
} catch (e) {
    cf.log("Invalid auth.json, cannot call YouTube API", "warning");
}

let channelCache = new Map();

function refreshCache() {
    for (let e of channelCache.entries()) {
        if (Date.now()-e[1].refreshed > channelCacheTimeout) channelCache.delete(e[0]);
    }
}

function fetchChannel(channelID, ignoreCache) {
    refreshCache();
    let cache = channelCache.get(channelID);
    if (cache && !ignoreCache) {
        if (cache.constructor.name == "Promise") {
            //cf.log("Waiting on promise for "+channelID, "info");
            return cache;
        } else {
            //cf.log("Using cache for "+channelID+", expires in "+Math.floor((channelCacheTimeout-Date.now()+cache.refreshed)/1000/60)+" minutes", "spam");
            return Promise.resolve(cache.data);
        }
    } else {
        //cf.log("Setting new cache for "+channelID, "spam");
        let promise = new Promise(resolve => {
            let channelType = channelID.startsWith("UC") && channelID.length == 24 ? "channel_id" : "user";
            rp(`https://second.cadence.moe/api/v1/channels/${channelID}/latest`).then(body => {
                let author = null
                let authorID = null
                let videos = JSON.parse(body);
                videos.forEach(v => {
                    author = v.author;
                    authorID = v.authorID;
                    v.published = v.published * 1000;
                });
                const data = {author: author, authorID: authorID, latestVideos: videos}
                channelCache.set(channelID, {refreshed: Date.now(), data});
                //cf.log("Set new cache for "+channelID, "spam");
                resolve(data);
            }).catch(error => {
                cf.log("Error while refreshing "+channelID, "error");
                cf.log(error, "error");
                channelCache.delete(channelID);
                resolve(null);
            });
        });
        channelCache.set(channelID, promise);
        return promise;
    }
}

module.exports = [
    {
        route: "/v/(.*)", methods: ["GET"], code: async ({fill}) => {
            let id;
            let wordsString = fill[0];
            wordsString = wordsString.replace(/%20/g, " ")
            if (wordsString.length == 11) {
                id = wordsString
            } else {
                let words = findShareWords(wordsString);
                try {
                    validateShareWords(words);
                } catch (e) {
                    return [400, e.message];
                }
                id = getIDFromWords(words);
            }
            return {
                statusCode: 301,
                contentType: "text/html",
                content: "Redirecting...",
                headers: {
                    "Location": "/cloudtube/video/"+id
                }
            }
        }
    },
    {
        route: "/cloudtube/video/([\\w-]+)", methods: ["GET"], code: ({req, fill}) => new Promise(resolve => {
            rp(`${getInvidiousHost("video")}/api/v1/videos/${fill[0]}`).then(body => {
                try {
                    let data = JSON.parse(body);
                    let page = pugCache.get("pug/old/cloudtube-video.pug").web({data})
                    page = page.replace('"<!-- videoInfo -->"', () => body);
                    let shareWords = getShareWords(fill[0]);
                    page = page.replace('"<!-- shareWords -->"', () => JSON.stringify(shareWords));
                    page = page.replace("<title></title>", () => `<title>${data.title} — CloudTube video</title>`);
                    while (page.includes("yt.www.watch.player.seekTo")) page = page.replace("yt.www.watch.player.seekTo", "seekTo");
                    let metaOGTags =
                        `<meta property="og:title" content="${data.title.replace(/&/g, "&amp;").replace(/"/g, "&quot;")} — CloudTube video" />\n`+
                        `<meta property="og:type" content="video.movie" />\n`+
                        `<meta property="og:image" content="https://invidio.us/vi/${fill[0]}/mqdefault.jpg" />\n`+
                        `<meta property="og:url" content="https://${req.headers.host}${req.url}" />\n`+
                        `<meta property="og:description" content="CloudTube is a free, open-source YouTube proxy." />\n`
                    page = page.replace("<!-- metaOGTags -->", () => metaOGTags);
                    resolve({
                        statusCode: 200,
                        contentType: "text/html",
                        content: page
                    });
                } catch (e) {
                    resolve([400, "Error parsing data from Invidious"]);
                }
            }).catch(err => {
                resolve([500, "Error requesting data from Invidious"]);
            });
        })
    },
    {
        route: "/cloudtube/channel/([\\w-]+)", methods: ["GET"], code: ({req, fill}) => new Promise(resolve => {
            fetchChannel(fill[0]).then(data => {
                try {
                    let page = pugCache.get("pug/old/cloudtube-channel.pug").web()
                    page = page.replace('"<!-- channelInfo -->"', () => JSON.stringify(data));
                    page = page.replace("<title></title>", () => `<title>${data.author} — CloudTube channel</title>`);
                    let metaOGTags =
                        `<meta property="og:title" content="${data.author.replace(/&/g, "&amp;").replace(/"/g, "&quot;")} — CloudTube channel" />\n`+
                        `<meta property="og:type" content="video.movie" />\n`+
                        // `<meta property="og:image" content="${data.authorThumbnails[0].url.split("=")[0]}" />\n`+
                        `<meta property="og:url" content="https://${req.headers.host}${req.url}" />\n`+
                        `<meta property="og:description" content="CloudTube is a free, open-source YouTube proxy." />\n`
                    page = page.replace("<!-- metaOGTags -->", () => metaOGTags);
                    resolve({
                        statusCode: 200,
                        contentType: "text/html",
                        content: page
                    });
                } catch (e) {
                    resolve([400, "Error parsing data from Invidious"]);
                }
            }).catch(err => {
                resolve([500, "Error requesting data from Invidious"]);
            });
        })
    },
    {
        route: "/cloudtube/playlist/([\\w-]+)", methods: ["GET"], code: ({req, fill}) => new Promise(resolve => {
            rp(`${getInvidiousHost("playlist")}/api/v1/playlists/${fill[0]}`).then(body => {
                try {
                    let data = JSON.parse(body);
                    let page = pugCache.get("pug/old/cloudtube-playlist.pug").web()
                    page = page.replace('"<!-- playlistInfo -->"', () => body);
                    page = page.replace("<title></title>", () => `<title>${data.title} — CloudTube playlist</title>`);
                    while (page.includes("yt.www.watch.player.seekTo")) page = page.replace("yt.www.watch.player.seekTo", "seekTo");
                    let metaOGTags =
                        `<meta property="og:title" content="${data.title.replace(/&/g, "&amp;").replace(/"/g, "&quot;")} — CloudTube playlist" />\n`+
                        `<meta property="og:type" content="video.movie" />\n`+
                        `<meta property="og:url" content="https://${req.headers.host}${req.url}" />\n`+
                        `<meta property="og:description" content="CloudTube is a free, open-source YouTube proxy." />\n`
                    if (data.videos[0]) metaOGTags += `<meta property="og:image" content="https://invidio.us/vi/${data.videos[0].videoId}/mqdefault.jpg" />\n`;
                    page = page.replace("<!-- metaOGTags -->", () => metaOGTags);
                    resolve({
                        statusCode: 200,
                        contentType: "text/html",
                        content: page
                    });
                } catch (e) {
                    resolve([400, "Error parsing data from Invidious"]);
                }
            }).catch(err => {
                resolve([500, "Error requesting data from Invidious"]);
            });
        })
    },
    {
        route: "/cloudtube/search", methods: ["GET"], upload: "json", code: ({req, url}) => new Promise(resolve => {
            const params = url.searchParams
            console.log("URL:", req.url)
            console.log("Headers:", req.headers)
            let page = pugCache.get("pug/old/cloudtube-search.pug").web()
            if (params.has("q")) { // search terms were entered
                let sort_by = params.get("sort_by") || "relevance";
                rp(`${getInvidiousHost("search")}/api/v1/search?q=${encodeURIComponent(decodeURIComponent(params.get("q")))}&sort_by=${sort_by}`).then(body => {
                    try {
                        // json.parse?
                        page = page.replace('"<!-- searchResults -->"', () => body);
                        page = page.replace("<title></title>", () => `<title>${decodeURIComponent(params.get("q"))} — CloudTube search</title>`);
                        let metaOGTags =
                            `<meta property="og:title" content="${decodeURIComponent(params.get("q")).replace(/"/g, '\\"')} — CloudTube search" />\n`+
                            `<meta property="og:type" content="video.movie" />\n`+
                            `<meta property="og:url" content="https://${req.headers.host}${req.path}" />\n`+
                            `<meta property="og:description" content="CloudTube is a free, open-source YouTube proxy." />\n`
                        page = page.replace("<!-- metaOGTags -->", () => metaOGTags);
                        resolve({
                            statusCode: 200,
                            contentType: "text/html",
                            content: page
                        });
                    } catch (e) {
                        resolve([400, "Error parsing data from Invidious"]);
                    }
                }).catch(err => {
                    resolve([500, "Error requesting data from Invidious"]);
                });
            } else { // no search terms
                page = page.replace("<!-- searchResults -->", "");
                page = page.replace("<title></title>", `<title>CloudTube search</title>`);
                let metaOGTags =
                    `<meta property="og:title" content="CloudTube search" />\n`+
                    `<meta property="og:type" content="video.movie" />\n`+
                    `<meta property="og:url" content="https://${req.headers.host}${req.path}" />\n`+
                    `<meta property="og:description" content="CloudTube is a free, open-source YouTube proxy." />\n`
                page = page.replace("<!-- metaOGTags -->", () => metaOGTags);
                resolve({
                    statusCode: 200,
                    contentType: "text/html",
                    content: page
                });
            }
        })
    },
    {
        route: "/api/youtube/subscribe", methods: ["POST"], upload: "json", code: async ({data}) => {
            if (!data.channelID) return [400, 1];
            if (!data.token) return [400, 8];
            let userRow = await db.get("SELECT userID FROM AccountTokens WHERE token = ?", data.token);
            if (!userRow || userRow.expires <= Date.now()) return [401, 8];
            let subscriptions = (await db.all("SELECT channelID FROM AccountSubscriptions WHERE userID = ?", userRow.userID)).map(r => r.channelID);
            let nowSubscribed;
            if (subscriptions.includes(data.channelID)) {
                await db.run("DELETE FROM AccountSubscriptions WHERE userID = ? AND channelID = ?", [userRow.userID, data.channelID]);
                nowSubscribed = false;
            } else {
                await db.run("INSERT INTO AccountSubscriptions VALUES (?, ?)", [userRow.userID, data.channelID]);
                nowSubscribed = true;
            }
            return [200, {channelID: data.channelID, nowSubscribed}];
        }
    },
    {
        route: "/api/youtube/subscriptions", methods: ["POST"], upload: "json", code: async ({data}) => {
            let subscriptions;
            if (data.token) {
                let userRow = await db.get("SELECT userID FROM AccountTokens WHERE token = ?", data.token);
                if (!userRow || userRow.expires <= Date.now()) return [401, 8];
                subscriptions = (await db.all("SELECT channelID FROM AccountSubscriptions WHERE userID = ?", userRow.userID)).map(r => r.channelID);
            } else {
                if (data.subscriptions && data.subscriptions.constructor.name == "Array" && data.subscriptions.every(i => typeof(i) == "string")) subscriptions = data.subscriptions;
                else return [400, 4];
            }
            if (data.force) {
                for (let channelID of subscriptions) channelCache.delete(channelID);
                return [204, ""];
            } else {
                let videos = [];
                let channels = [];
                let failedCount = 0
                await Promise.all(subscriptions.map(s => fetchChannel(s).then(data => {
                    if (data) {
                        videos = videos.concat(data.latestVideos);
                        channels.push({author: data.author, authorID: data.authorId, authorThumbnails: data.authorThumbnails});
                    } else {
                        failedCount++
                    }
                })));
                videos = videos.sort((a, b) => (b.published - a.published))
                let limit = 60;
                if (data.limit && !isNaN(+data.limit) && (+data.limit > 0)) limit = +data.limit;
                videos = videos.slice(0, limit);
                channels = channels.sort((a, b) => (a.author.toLowerCase() < b.author.toLowerCase() ? -1 : 1));
                return [200, {videos, channels, failedCount}];
            }
        }
    },
    {
        route: "/api/youtube/subscriptions/import", methods: ["POST"], upload: "json", code: async ({data}) => {
            if (!data) return [400, 3];
            if (!typeof(data) == "object") return [400, 5];
            if (!data.token) return [401, 8];
            let userRow = await db.get("SELECT userID FROM AccountTokens WHERE token = ?", data.token);
            if (!userRow || userRow.expires <= Date.now()) return [401, 8];
            if (!data.subscriptions) return [400, 4];
            if (!data.subscriptions.every(v => typeof(v) == "string")) return [400, 5];
            await db.run("BEGIN TRANSACTION");
            await db.run("DELETE FROM AccountSubscriptions WHERE userID = ?", userRow.userID);
            await Promise.all(data.subscriptions.map(v =>
                db.run("INSERT OR IGNORE INTO AccountSubscriptions VALUES (?, ?)", [userRow.userID, v])
            ))
            await db.run("END TRANSACTION");
            return [204, ""];
        }
    },
    {
        route: "/api/youtube/channels/([\\w-]+)/info", methods: ["GET"], code: ({fill}) => {
            return rp(`${getInvidiousHost("channel")}/api/v1/channels/${fill[0]}`).then(body => {
                return {
                    statusCode: 200,
                    contentType: "application/json",
                    content: body
                }
            }).catch(e => {
                console.error(e);
                return [500, "Unknown request error, check console"]
            });
        }
    },
    {
        route: "/api/youtube/alternate/.*", methods: ["GET"], code: async ({req}) => {
            return [404, "Please leave me alone. This endpoint has been removed and it's never coming back. Why not try youtube-dl instead? https://github.com/ytdl-org/youtube-dl/\nIf you own a bot that accesses this endpoint, please send me an email: https://cadence.moe/about/contact\nHave a nice day.\n"];
            return null
            return [400, {error: `/api/youtube/alternate has been removed. The page will be reloaded.<br><img src=/ onerror=setTimeout(window.location.reload.bind(window.location),5000)>`}]
        }
    },
    {
        route: "/api/youtube/dash/([\\w-]+)", methods: ["GET"], code: ({fill}) => new Promise(resolve => {
            let id = fill[0];
            let sentReq = rp({
                url: `https://invidio.us/api/manifest/dash/id/${id}?local=true`,
                timeout: 8000
            });
            sentReq.catch(err => {
                if (err.code == "ETIMEDOUT" || err.code == "ESOCKETTIMEDOUT" || err.code == "ECONNRESET") resolve([502, "Request to Invidious timed out"]);
                else {
                    console.log(err);
                    resolve([500, "Unknown request error, check console"]);
                }
            });
            sentReq.then(body => {
                let data = fxp.parse(body, {ignoreAttributes: false});
                resolve([200, data]);
            }).catch(err => {
                if (err.code == "ETIMEDOUT" || err.code == "ESOCKETTIMEDOUT" || err.code == "ECONNRESET") resolve([502, "Request to Invidious timed out"]);
                else {
                    console.log(err);
                    resolve([500, "Unknown parse error, check console"]);
                }
            });
        })
    },
    {
        route: "/api/youtube/get_endscreen", methods: ["GET"], code: async ({params}) => {
            if (!params.v) return [400, 1];
            let data = await rp("https://www.youtube.com/get_endscreen?v="+params.v);
            data = data.toString();
            try {
                if (data == `""`) {
                    return {
                        statusCode: 204,
                        content: "",
                        contentType: "text/html",
                        headers: {"Access-Control-Allow-Origin": "*"}
                    }
                } else {
                    let json = JSON.parse(data.slice(data.indexOf("\n")+1));
                    let promises = [];
                    for (let e of json.elements.filter(e => e.endscreenElementRenderer.style == "WEBSITE")) {
                        for (let thb of e.endscreenElementRenderer.image.thumbnails) {
                            let promise = rp(thb.url, {encoding: null});
                            promise.then(image => {
                                let base64 = image.toString("base64");
                                thb.url = "data:image/jpeg;base64,"+base64;
                            });
                            promises.push(promise);
                        }
                    }
                    await Promise.all(promises);
                    return {
                        statusCode: 200,
                        content: json,
                        contentType: "application/json",
                        headers: {"Access-Control-Allow-Origin": "*"}
                    }
                }
            } catch (e) {
                return [500, "Couldn't parse endscreen data\n\n"+data];
            }
        }
    },
    {
        route: "/api/youtube/video/([\\w-]+)", methods: ["GET"], code: ({fill}) => {
            return new Promise(resolve => {
                ytdl.getInfo(fill[0]).then(info => {
                    resolve([200, Object.assign(info, {constructor: new Object().constructor})]);
                }).catch(err => {
                    resolve([400, err]);
                });
            });
        }
    },
    {
        route: "/api/youtube/channel/(\\S+)", methods: ["GET"], code: ({fill}) => {
            return new Promise(resolve => {
                rp(
                    "https://www.googleapis.com/youtube/v3/channels?part=contentDetails"+
                    `&id=${fill[0]}&key=${auth.yt_api_key}`
                ).then(channelText => {
                    let channel = JSON.parse(channelText);
                    let playlistIDs = channel.items.map(i => i.contentDetails.relatedPlaylists.uploads);
                    Promise.all(playlistIDs.map(pid => rp(
                        "https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails"+
                        `&playlistId=${pid}&maxResults=50&key=${auth.yt_api_key}`
                    ))).then(playlistsText => {
                        let playlists = playlistsText.map(pt => JSON.parse(pt));;
                        let items = [].concat(...playlists.map(p => p.items))
                        .map(i => i.contentDetails)
                        .sort((a, b) => (a.videoPublishedAt > b.videoPublishedAt ? -1 : 1))
                        .slice(0, 50);
                        rp(
                            "https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet"+
                            `&id=${items.map(i => i.videoId).join(",")}&key=${auth.yt_api_key}`
                        ).then(videosText => {
                            let videos = JSON.parse(videosText);
                            videos.items.forEach(v => {
                                let duration = v.contentDetails.duration.slice(2).replace(/\D/g, ":").slice(0, -1).split(":")
                                .map((t, i) => {
                                    if (i) t = t.padStart(2, "0");
                                    return t;
                                });
                                if (duration.length == 1) duration.splice(0, 0, "0");
                                v.duration = duration.join(":");
                            });
                            resolve([200, videos.items]);
                        });
                    });
                }).catch(err => {
                    resolve([500, "Unexpected promise rejection error. This should not happen. Contact Cadence as soon as possible."]);
                    console.log("Unexpected promise rejection error!");
                    console.log(err);
                });
            });
        }
    },
    {
        route: "/api/youtube/search", methods: ["GET"], code: ({params}) => {
            return new Promise(resolve => {
                if (!params || !params.q) return resolve([400, "Missing ?q parameter"]);
                let searchObject = {
                    maxResults: +params.maxResults || 20,
                    key: auth.yt_api_key,
                    type: "video"
                };
                if (params.order) searchObject.order = params.order;
                yts(params.q, searchObject, (err, search) => {
                    if (err) {
                        resolve([500, "YouTube API error. This should not happen. Contact Cadence as soon as possible."]);
                        console.log("YouTube API error!");
                        console.log(search);
                    } else {
                        rp(
                            "https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id="+
                            search.map(r => r.id).join(",")+
                            "&key="+auth.yt_api_key
                        ).then(videos => {
                            JSON.parse(videos).items.forEach(v => {
                                let duration = v.contentDetails.duration.slice(2).replace(/\D/g, ":").slice(0, -1).split(":")
                                .map((t, i) => {
                                    if (i) t = t.padStart(2, "0");
                                    return t;
                                });
                                if (duration.length == 1) duration.splice(0, 0, "0");
                                search.find(r => r.id == v.id).duration = duration.join(":");
                            });
                            resolve([200, search]);
                        });
                    }
                });
            });
        }
    }
]
