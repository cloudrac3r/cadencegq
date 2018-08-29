const crypto = require("crypto");

module.exports = ({db, extra}) => {
    const qe = extra.qe;
    return [
        {
            route: "/api/accounts", methods: ["POST"], code: async ({data}) => {
                if (!data) return [400, 3];
                if (["username", "password"].some(w => !data[w])) return [400, 4];
                let {username, password} = data;
                if (username.length > 30) return [413, 6];
                let used = await db.get("SELECT 1 FROM Accounts WHERE username = ?", username);
                if (used) return [403, 9];
                let salt = extra.salt();
                let hash = extra.hash(password+salt);
                await db.run("INSERT INTO Accounts VALUES (NULL, ?, ?, ?)", [username, hash, salt]);
                return [204, ""];
            }
        },
        {
            route: "/api/accounts", methods: ["PATCH"], code: async ({data}) => {
                if (!data) return [400, 3];
                if (["username", "password", "newPassword"].some(w => !data[w])) return [400, 4];
                let {username, password, newPassword, newUsername} = data;
                if (!newUsername) newUsername = username;
                if (newUsername.length > 30) return [413, 6];
                if (!await extra.verifyPassword(username, password)) return [401, 8];
                let newSalt = extra.salt();
                let newHash = extra.hash(newPassword+newSalt);
                await db.run("BEGIN TRANSACTION");
                await Promise.all([
                    db.run("UPDATE Accounts SET hash = ?, salt = ?, username = ? WHERE username = ?", [newHash, newSalt, newUsername, username]),
                    db.run("UPDATE AccountTokens SET expires = ? WHERE userID = (SELECT userID FROM Accounts WHERE username = ?)", [Date.now(), username])
                ]);
                await db.run("END TRANSACTION");
                return [204, ""];
            }
        },
        {
            route: "/api/accounts/tokens", methods: ["POST"], code: async ({data}) => {
                if (!data) return [400, 3];
                if (["username", "password"].some(w => !data[w])) return [400, 4];
                let {username, password} = data;
                if (!await extra.verifyPassword(username, password)) return [401, 8];
                let token = extra.hash(extra.salt());
                let expires = Date.now()+30*24*60*60*1000;
                await db.run("INSERT INTO AccountTokens VALUES ((SELECT userID FROM Accounts WHERE username = ?), ?, ?)", [username, token, expires]);
                return [201, {token, expires}];
            }
        },
        {
            route: "/api/accounts/tokens/([0-9a-f]+)", methods: ["DELETE"], code: async ({fill}) => {
                let token = fill[0];
                if (!token) return [400, 1];
                let row = await db.get("SELECT expires FROM AccountTokens WHERE token = ?", token);
                if (!row || row.expires <= Date.now()) return [401, 8];
                await db.run("UPDATE AccountTokens SET expires = ? WHERE token = ?", [Date.now(), token]);
                return [204, ""];
            }
        },
        {
            route: "/api/accounts/tokens/([0-9a-f]+)", methods: ["GET"], code: async ({fill}) => {
                let token = fill[0];
                if (!token) return [400, 1];
                let row = await db.get("SELECT username, expires FROM Accounts INNER JOIN AccountTokens ON Accounts.userID = AccountTokens.userID WHERE token = ?", token);
                if (!row || row.expires <= Date.now()) return [401, 8];
                row.subscriptions = (await db.all("SELECT channelID FROM AccountSubscriptions INNER JOIN AccountTokens ON AccountTokens.userID = AccountSubscriptions.userID WHERE token = ?", token)).map(r => r.channelID);
                return [200, row];
            }
        }
    ]
}