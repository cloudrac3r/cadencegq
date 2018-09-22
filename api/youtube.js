const ytdl = require("ytdl-core");
const auth = require("../auth.json");
const yts = require("youtube-search");
const rp = require("request-promise");
const fs = require("fs");
const fxp = require("fast-xml-parser");

module.exports = ({db, resolveTemplates}) => {
    return [
        {
            route: "/cloudtube/video/([\\w-]+)", methods: ["GET"], code: ({req, fill}) => new Promise(resolve => {
                rp(`https://invidio.us/api/v1/videos/${fill[0]}`).then(body => {
                    try {
                        let data = JSON.parse(body);
                        fs.readFile("html/cloudtube/video.html", {encoding: "utf8"}, (err, page) => {
                            resolveTemplates(page).then(page => {
                                page = page.replace('"<!-- videoInfo -->"', body);
                                page = page.replace("<title></title>", `<title>${data.title} — CloudTube video</title>`);
                                while (page.includes("yt.www.watch.player.seekTo")) page = page.replace("yt.www.watch.player.seekTo", "seekTo");
                                let metaOGTags =
                                    `<meta property="og:title" content="${data.title.replace('"', "'")} — CloudTube video" />\n`+
                                    `<meta property="og:type" content="video.movie" />\n`+
                                    `<meta property="og:image" content="https://invidio.us/vi/${fill[0]}/mqdefault.jpg" />\n`+
                                    `<meta property="og:url" content="https://cadence.gq${req.path}" />\n`+
                                    `<meta property="og:description" content="CloudTube is a free, open-source YouTube proxy." />\n`
                                page = page.replace("<!-- metaOGTags -->", metaOGTags);
                                resolve({
                                    statusCode: 200,
                                    contentType: "text/html",
                                    content: page
                                });
                            });
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
                Promise.all([
                    rp(`https://invidio.us/api/v1/channels/${fill[0]}`),
                    rp(`https://invidio.us/api/v1/channels/${fill[0]}/videos`)
                ]).then(([channelInfo, channelVideos]) => {
                    try {
                        channelInfo = JSON.parse(channelInfo);
                        channelVideos = JSON.parse(channelVideos);
                        fs.readFile("html/cloudtube/channel.html", {encoding: "utf8"}, (err, page) => {
                            resolveTemplates(page).then(page => {
                                page = page.replace('"<!-- channelInfo -->"', JSON.stringify([channelInfo, channelVideos]));
                                page = page.replace("<title></title>", `<title>${channelInfo.author} — CloudTube channel</title>`);
                                let metaOGTags =
                                    `<meta property="og:title" content="${channelInfo.author.replace('"', "'")} — CloudTube channel" />\n`+
                                    `<meta property="og:type" content="video.movie" />\n`+
                                    `<meta property="og:image" content="${channelInfo.authorBanners[0].url}" />\n`+
                                    `<meta property="og:url" content="https://cadence.gq${req.path}" />\n`+
                                    `<meta property="og:description" content="CloudTube is a free, open-source YouTube proxy." />\n`
                                page = page.replace("<!-- metaOGTags -->", metaOGTags);
                                resolve({
                                    statusCode: 200,
                                    contentType: "text/html",
                                    content: page
                                });
                            });
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
            route: "/cloudtube/search", methods: ["GET"], code: ({req, params}) => new Promise(resolve => {
                fs.readFile("html/cloudtube/search.html", {encoding: "utf8"}, (err, page) => {
                    if (err) throw err;
                    resolveTemplates(page).then(page => {
                        if (params.q) { // search terms were entered
                            let sort_by = params.sort_by || "relevance";
                            rp(`https://invidio.us/api/v1/search?q=${params.q}&sort_by=${sort_by}`).then(body => {
                                try {
                                    // json.parse?
                                    page = page.replace('"<!-- searchResults -->"', body);
                                    page = page.replace("<title></title>", `<title>${params.q} — CloudTube search</title>`);
                                    let metaOGTags =
                                        `<meta property="og:title" content="${params.q} — CloudTube search" />\n`+
                                        `<meta property="og:type" content="video.movie" />\n`+
                                        `<meta property="og:url" content="https://cadence.gq${req.path}" />\n`+
                                        `<meta property="og:description" content="CloudTube is a free, open-source YouTube proxy." />\n`
                                    page = page.replace("<!-- metaOGTags -->", metaOGTags);
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
                                `<meta property="og:url" content="https://cadence.gq${req.path}" />\n`+
                                `<meta property="og:description" content="CloudTube is a free, open-source YouTube proxy." />\n`
                            page = page.replace("<!-- metaOGTags -->", metaOGTags);
                            resolve({
                                statusCode: 200,
                                contentType: "text/html",
                                content: page
                            });
                        }
                    });
                });
            })
        },
        {
            route: "/api/youtube/subscribe", methods: ["POST"], code: async ({data}) => {
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
            route: "/api/youtube/subscriptions", methods: ["POST"], code: async ({data}) => {
                let subscriptions;
                if (data.token) {
                    let userRow = await db.get("SELECT userID FROM AccountTokens WHERE token = ?", data.token);
                    if (!userRow || userRow.expires <= Date.now()) return [401, 8];
                    subscriptions = (await db.all("SELECT channelID FROM AccountSubscriptions WHERE userID = ?", userRow.userID)).map(r => r.channelID);
                } else {
                    if (data.subscriptions && data.subscriptions.constructor.name == "Array" && data.subscriptions.every(i => typeof(i) == "string")) subscriptions = data.subscriptions;
                    else return [400, 4];
                }
                let videos = [];
                let channels = [];
                await Promise.all(subscriptions.map(s => new Promise(resolve => {
                    Promise.all([
                        rp(`https://invidio.us/api/v1/channels/${s}`),
                        rp(`https://www.youtube.com/feeds/videos.xml?channel_id=${s}`)
                    ]).then(([body, xml]) => {
                        let data = JSON.parse(body);
                        let feedItems = fxp.parse(xml).feed.entry;
                        data.latestVideos.forEach(v => {
                            v.author = data.author;
                            let feedItem = feedItems.find(i => i["yt:videoId"] == v.videoId);
                            if (feedItem) v.published = new Date(feedItem.published).getTime();
                            else v.published = v.published * 1000;
                        });
                        videos = videos.concat(data.latestVideos);
                        channels.push({author: data.author, authorID: data.authorId});
                        resolve();
                    }).catch(resolve);
                })));
                videos = videos.sort((a, b) => (b.published - a.published)).slice(0, 60);
                channels = channels.sort((a, b) => (a.author.toLowerCase() < b.author.toLowerCase() ? -1 : 1));
                return [200, {videos, channels}];
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
                        type: "video",
                        videoDimension: "2d"
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
}
