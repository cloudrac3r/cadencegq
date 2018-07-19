const ytdl = require("ytdl-core");
const auth = require("../auth.json");
const yts = require("youtube-search");
const rp = require("request-promise");

module.exports = ({db}) => {
    return [
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
