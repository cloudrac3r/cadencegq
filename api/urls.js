const crypto = require("crypto");

module.exports = ({db, extra}) => {
    const qe = extra.qe;
    return [
        {
            route: "/api/urls/([0-9a-f]{6})", methods: ["GET"], code: async ({fill}) => {
                let hash = fill[0];
                let row = await db.get("SELECT target FROM URLs WHERE hash = ?", hash);
                if (!row) return [200, 2];
                else return {
                    statusCode: 303,
                    contentType: "text/html",
                    headers: {"Location": row.target},
                    content: ""
                }
            }
        },
        {
            route: "/api/urls/([0-9a-f]{6})/details", methods: ["GET"], code: async ({fill}) => {
                let hash = fill[0];
                let row = await db.get("SELECT URLs.*, Accounts.username FROM URLs LEFT JOIN Accounts ON URLs.author = Accounts.userID WHERE hash = ?", hash);
                row = extra.resolveAuthor(row);
                if (!row) return [400, 2];
                else return [200, row];
            }
        },
        {
            route: "/api/urls", methods: ["POST"], code: async ({data}) => {
                if (!data) return [400, 3];
                if (!data.target) return [400, 4];
                if (!data.target.match(new RegExp(`https?://([a-z0-9]\.)+[a-z]{2,}(/.+)?`))) return [400, 5];
                let result = await extra.resolveAuthorInput(data);
                if (!result[0]) return result[1];
                data = result[1];
                if (data.authorAccount == 0) {
                    let usernames = await db.all("SELECT username FROM Accounts");
                    usernames = usernames.map(u => u.username);
                    if (usernames.includes(data.username)) return [403, 9];
                }
                let hash = extra.hash(data.target).slice(0, 6);
                let dbr = await db.all("SELECT * FROM URLs");
                if (dbr.find(row => row.target == data.target)) return [200, {hash: dbr.find(row => row.target == data.target).hash}];
                while (dbr.find(row => row.hash == hash)) hash = (parseInt("0x"+hash)+1).toString(16);
                await db.run("INSERT INTO URLs VALUES (?, ?, ?, ?, ?, NULL)", [hash, data.authorAccount, data.username, data.target, Date.now()]);
                return [201, {hash}];
            }
        },
        {
            route: "/api/urls", methods: ["GET"], code: async ({params}) => {
                let dbr = await db.all("SELECT URLs.*, Accounts.username FROM URLs LEFT JOIN Accounts ON URLs.author = Accounts.userID ORDER BY creationTime DESC");
                dbr = dbr.map(row => extra.resolveAuthor(row));
                return [200, dbr];
            }
        }
    ]
}