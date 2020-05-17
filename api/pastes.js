// @ts-check

const {db, extra} = require("../passthrough")

module.exports = [
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
        route: "/api/pastes", methods: ["POST"], upload: "json", code: async ({data}) => {
            if (!data) return [400, 3];
            if (!data.content) return [400, 4];
            if (typeof data.token !== "string") return [401, 8];
            const account = await db.get("SELECT Accounts.userID, Accounts.canUpload FROM Accounts INNER JOIN AccountTokens USING (userID) WHERE AccountTokens.token = ?", [data.token]);
            if (!account) return [401, 8];
            if (!account.canUpload) return [403, 12];
            await db.run("INSERT INTO Pastes VALUES (NULL, 1, ?, ?, ?, NULL)", [account.userID, data.content, Date.now()]);
            let {seq: pasteID} = await db.get("SELECT seq FROM sqlite_sequence WHERE name = 'Pastes'");
            return [201, {pasteID}];
        }
    },
    {
        route: "/api/pastes/([0-9]+)", methods: ["PATCH"], upload: "json", code: async ({fill, data}) => {
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
        route: "/api/pastes", methods: ["GET"], code: async ({url}) => {
            let maxPreview = 5000;
            let preview = 400;
            let newPreview = undefined;
            if (url.searchParams.has("preview")) {
                newPreview = parseInt(url.searchParams.get("preview"));
                if (!isNaN(newPreview)) {
                    preview = Math.max(Math.min(newPreview, maxPreview), 0);
                }
            }
            let filterName = null
            if (url.searchParams.has("author")) {
                filterName = url.searchParams.get("author")
            }
            let dbr
            if (filterName != null) {
                dbr = await db.all("SELECT Pastes.*, Accounts.username FROM Pastes LEFT JOIN Accounts ON Pastes.author = Accounts.userID WHERE Accounts.username = ? ORDER BY pasteID DESC", [filterName]);
            } else {
                dbr = await db.all("SELECT Pastes.*, Accounts.username FROM Pastes LEFT JOIN Accounts ON Pastes.author = Accounts.userID ORDER BY pasteID DESC");
            }
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
