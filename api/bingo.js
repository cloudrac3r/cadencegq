module.exports = ({db, extra}) => {
    return [
        {
            route: "/api/bingo", methods: ["GET"], code: async () => {
                let cards = await db.all("SELECT DISTINCT BingoCards.* FROM BingoCards INNER JOIN BingoTagsMap ON BingoCards.id = BingoTagsMap.cardid INNER JOIN BingoTags ON BingoTagsMap.tagid = BingoTags.id ORDER BY BingoCards.id DESC");
                let tagsMap = await db.all("SELECT * FROM BingoTagsMap INNER JOIN BingoTags ON BingoTagsMap.tagid = BingoTags.id");
                for (let card of cards) {
                    card.tags = tagsMap.filter(t => t.cardid == card.id).map(t => t.name);
                }
                return [200, cards];
            }
        },
        {
            route: "/api/bingo/([0-9]+)", methods: ["GET"], code: async ({fill}) => {
                let id = parseInt(fill[0]);
                if (!id) return [400, 2];
                let card = await db.get("SELECT * FROM BingoCards WHERE id = ?", id);
                if (!card) return [400, 4];
                let tags = await db.all("SELECT name FROM BingoTagsMap INNER JOIN BingoTags ON BingoTagsMap.tagid = BingoTags.id WHERE cardid = ?", id);
                let tiles = await db.all("SELECT * FROM BingoTiles WHERE cardid = ?", id);
                card.tags = tags.map(t => t.name);
                card.tiles = tiles;
                return [200, card];
            }
        },
        {
            route: "/api/bingo/tags", methods: ["GET"], code: async () => {
                let tags = await db.all("SELECT * FROM BingoTags");
                return [200, tags];
            }
        },
        {
            route: "/api/bingo/submit", methods: ["POST"], code: async ({data}) => {
                // Error checking
                if (!data.title) return [400, "Missing title"];
                if (!data.url) return [400, "Missing image URL"];
                if (!data.tags) return [400, "Missing tags"];
                if (data.tags.constructor.name != "Array") return [400, "Tags is not an array"];
                if (data.tags.length == 0) return [400, "No tags in array"];
                let validTags = (await db.all("SELECT id FROM BingoTags")).map(r => r.id);
                if (data.tags.some(t => typeof(t) != "number" || !validTags.includes(t))) return [400, "Tags is not an array of numbers"];
                if (!data.coords) return [400, "No coordinate data"];
                if (data.coords.constructor.name != "Object") return [400, "Coordinate data is not an object"];
                if (Object.values(data.coords).some(v => typeof(v) != "number" || isNaN(v) || v < 0)) return [400, "Coordinate data is not an object of positive numbers"];
                let missing = ["dimX", "dimY", "startX", "startY", "width", "height", "spaceX", "spaceY"].find(k => isNaN(parseInt(data.coords[k])));
                if (missing) return [400, "Missing coordinate data key "+missing];
                if (!data.username) data.username = null;
                // Actually do stuff
                await db.run("INSERT INTO BingoCards VALUES (NULL, ?, ?, NULL)", [data.title, data.url]);
                let {seq: newID} = await db.get("SELECT seq FROM sqlite_sequence WHERE name = 'BingoCards'");
                await db.run("BEGIN TRANSACTION");
                let promises = data.tags.map(t => db.run("INSERT INTO BingoTagsMap VALUES (?, ?)", [newID, t]));
                for (let iy = 0; iy < data.coords.dimY; iy++) {
                    for (let ix = 0; ix < data.coords.dimX; ix++) {
                        let x = data.coords.startX+ix*(data.coords.width+data.coords.spaceX);
                        let y = data.coords.startY+iy*(data.coords.height+data.coords.spaceY);
                        promises.push(db.run("INSERT INTO BingoTiles VALUES (NULL, ?, ?, ?, ?, ?)", [newID, x, y, x+data.coords.width, y+data.coords.height]));
                    }
                }
                await Promise.all(promises);
                await db.run("END TRANSACTION");
                return [200, "/egg/card/"+newID];
            }
        }
    ]
}