for (let i of ["blockedVideos", "blockedTitles", "blockedAuthors", "blockedAuthorIDs"]) lsm.setup(i, "");

const filters = [
    {
        related: video => video.videoId,
        feed: video => video.videoId,
        disallow: id => lsm.array("blockedVideos").array.includes(id)
    },{
        related: video => video.title,
        feed: video => video.title,
        disallow: title => lsm.array("blockedTitles").array.some(setting => title.toLowerCase().includes(setting.toLowerCase()))
    },{
        related: video => video.author,
        feed: video => video.author,
        disallow: name => lsm.array("blockedAuthors").array.some(setting => setting.toLowerCase() == name.toLowerCase())
    },{
        feed: video => video.authorId,
        disallow: id => lsm.array("blockedAuthorIDs").array.includes(id)
    }
]

function filterVideos(feed, source) {
    if (!source) throw new Error("No source provided to filterVideos");
    let result = feed.filter(video => !filters.some(f => f[source] ? f.disallow(f[source](video)) : false));
    return [result, feed.length - result.length];
}