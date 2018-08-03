const ytdl = require("ytdl-core");
const auth = require("../auth.json");
const yts = require("youtube-search");
const rp = require("request-promise");
const fs = require("fs");

module.exports = ({db, resolveTemplates}) => {
    return [
        {
            route: "/rewrite/video/([\\w-]+)", methods: ["GET"], code: ({reqPath, fill}) => new Promise(resolve => {
                rp(`https://invidio.us/api/v1/videos/${fill[0]}`).then(body => {
                    try {
                        let data = JSON.parse(body);
                        fs.readFile("html/rewrite/video.html", {encoding: "utf8"}, (err, page) => {
                            resolveTemplates(page).then(page => {
                                page = page.replace('"<!-- videoInfo -->"', body);
                                let metaOGTags =
                                    `<meta property="og:title" content="${data.title.replace('"', "'")} — CloudTube video" />\n`+
                                    `<meta property="og:type" content="video.movie" />\n`+
                                    `<meta property="og:image" content="${data.videoThumbnails.medium.url}" />\n`+
                                    `<meta property="og:url" content="https://cadence.gq${reqPath}" />\n`+
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
            route: "/rewrite/channel/([\\w-]+)", methods: ["GET"], code: ({reqPath, fill}) => new Promise(resolve => {
                Promise.all([
                    rp(`https://invidio.us/api/v1/channels/${fill[0]}`),
                    rp(`https://invidio.us/api/v1/channels/${fill[0]}/videos`)
                ]).then(([channelInfo, channelVideos]) => {
                    try {
                        channelInfo = JSON.parse(channelInfo);
                        channelVideos = JSON.parse(channelVideos);
                        fs.readFile("html/rewrite/channel.html", {encoding: "utf8"}, (err, page) => {
                            resolveTemplates(page).then(page => {
                                page = page.replace('"<!-- channelInfo -->"', JSON.stringify([channelInfo, channelVideos]));
                                let metaOGTags =
                                    `<meta property="og:title" content="${channelInfo.author.replace('"', "'")} — CloudTube channel" />\n`+
                                    `<meta property="og:type" content="video.movie" />\n`+
                                    `<meta property="og:image" content="${channelInfo.authorBanners[0].url}" />\n`+
                                    `<meta property="og:url" content="https://cadence.gq${reqPath}" />\n`+
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
            route: "/rewrite/search", methods: ["GET"], code: ({req, params}) => new Promise(resolve => {
                fs.readFile("html/rewrite/search.html", {encoding: "utf8"}, (err, page) => {
                    if (err) throw err;
                    resolveTemplates(page).then(page => {
                        if (params.q) { // search terms were entered
                            let order = "relevance"; // waiting on support from invidious api
                            rp(`https://invidio.us/api/v1/search?q=${params.q}`).then(body => {
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
