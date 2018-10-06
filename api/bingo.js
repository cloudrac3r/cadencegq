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
                let tags = await db.all("SELECT name FROM BingoTagsMap INNER JOIN BingoTags ON BingoTagsMap.tagid = BingoTags.id WHERE cardid = ?", id);
                let tiles = await db.all("SELECT * FROM BingoTiles WHERE cardid = ?", id);
                card.tags = tags.map(t => t.name);
                card.tiles = tiles;
                return [200, card];
            }
        }
    ]
}