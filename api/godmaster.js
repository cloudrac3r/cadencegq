module.exports = ({db, extra}) => {
    const qe = extra.qe;
    return [
        {
            route: "/api/godmaster", methods: ["GET"], code: async ({data}) => {
                let users = await db.all("SELECT username, summary FROM Godmaster INNER JOIN Accounts ON Godmaster.userID = Accounts.userID");
                return [200, users];
            }
        },
        {
            route: "/api/godmaster", methods: ["POST"], code: async ({data}) => {
                if (!data.token) return [401, 8];
                let account = await db.get("SELECT * FROM AccountTokens WHERE token = ?", data.token);
                if (!account) return [401, 8];
                if (account.expires < Date.now()) return [401, 8];
                if (!data.summary) return [400, 4];
                if (!data.summary.constructor || data.summary.constructor.name != "Array" || !data.summary.every(n => typeof(n) == "number")) return [400, 5];
                await db.run("DELETE FROM Godmaster WHERE userID = ?", account.userID);
                await db.run("INSERT INTO Godmaster VALUES (?, ?)", [account.userID, JSON.stringify(data.summary)]);
                return [204, ""];
            }
        }
    ]
}