module.exports = ({db, extra}) => {
    const qe = extra.qe;
    return [
        {
            route: "/api/pastes/([0-9]+)", methods: ["GET"], code: async ({fill}) => {
                let pasteID = fill[0];
                if (pasteID == undefined) return [400, 1];
                let paste = await db.get("SELECT Pastes.*, Accounts.username FROM Pastes LEFT JOIN Accounts ON Pastes.author = Accounts.userID WHERE pasteID = ?", pasteID);
                if (!paste) return [400, 2];
                paste = extra.resolveAuthor(paste);
                return [200, paste];
            }
        },
        {
            route: "/api/pastes/([0-9]+)/raw", methods: ["GET"], code: async ({fill}) => {
                let pasteID = fill[0];
                if (pasteID == undefined) return [400, 1];
                let paste = await db.get("SELECT content FROM Pastes WHERE pasteID = ?", pasteID);
                if (!paste) return [400, 2];
                return [200, paste.content];
            }
        },
        {
            route: "/api/pastes", methods: ["POST"], code: async ({data}) => {
                if (!data) return [400, 3];
                if (!data.content) return [400, 4];
                let result = await extra.resolveAuthorInput(data);
                if (!result[0]) return result[1];
                data = result[1];
                if (data.authorAccount == 0) {
                    let usernames = await db.all("SELECT username FROM Accounts");
                    usernames = usernames.map(u => u.username);
                    if (usernames.includes(data.username)) return [403, 9];
                }
                await db.run("INSERT INTO Pastes VALUES (NULL, ?, ?, ?, ?, NULL)", [data.authorAccount, data.username, data.content, Date.now()]);
                let {seq: pasteID} = await db.get("SELECT seq FROM sqlite_sequence WHERE name = 'Pastes'");
                return [201, {pasteID}];
            }
        },
        {
            route: "/api/pastes/([0-9]+)", methods: ["PATCH"], code: async ({fill, data}) => {
                let pasteID = fill[0];
                if (pasteID == undefined) return [400, 1];
                if (!data) return [400, 3];
                if (data.content == undefined) return [400, 4];
                if (!data.token) return [401, 8];
                let account = await db.get("SELECT userID, expires FROM AccountTokens WHERE token = ?", data.token);
                if (!account || account.expires <= Date.now()) return [401, 8];
                let paste = await db.get("SELECT author FROM Pastes WHERE pasteID = ?", pasteID);
                if (account.userID != paste.author) return [401, 8];
                if (data.content === "") {
                    await db.run("DELETE FROM Pastes WHERE pasteID = ?", pasteID);
                } else {
                    await db.run("UPDATE Pastes SET content = ? WHERE pasteID = ?", [data.content, pasteID]);
                }
                return [204, ""];
            }
        },
        {
            route: "/api/pastes", methods: ["GET"], code: async ({params}) => {
                let maxLimit = 100;
                let maxPreview = 10000;
                ["start", "end", "limit", "preview"].forEach(k => {
                    params[k] = parseInt(params[k]);
                    if (isNaN(params[k])) delete params[k];
                });
                let start = parseInt(params.start);
                let end = parseInt(params.end);
                let limit = (params.limit ? Math.min(params.limit, maxLimit) : maxLimit);
                let preview = (params.preview ? Math.min(params.preview, maxPreview) : 400);
                let promise;
                if (!start && !end) {
                    promise = db.all("SELECT Pastes.*, Accounts.username FROM Pastes LEFT JOIN Accounts ON Pastes.author = Accounts.userID ORDER BY creationTime DESC LIMIT ?", limit);
                } else {
                    if (!start) start = 0;
                    if (!end) end = Infinity; // Hope this doesn't break anything
                    promise = db.all("SELECT Pastes.*, Accounts.username FROM Pastes LEFT JOIN Accounts ON Pastes.author = Accounts.userID WHERE pasteID >= ? AND pasteID <= ? ORDER BY pasteID ASC LIMIT ?", [start, end, limit]);
                }
                let dbr = await promise;
                dbr = dbr.map(row => {
                    if (preview <= 0) delete row.content;
                    else row.content = row.content.slice(0, preview);
                    row = extra.resolveAuthor(row);
                    return row;
                });
                return [200, dbr];
            }
        }
    ]
}