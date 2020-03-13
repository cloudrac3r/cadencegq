const fsp = require("fs").promises;
const pj = require("path").join;
const friendsDir = pj(__dirname, "../html/friends");
const pb = require("prettier-bytes");

const {db, extra} = require("../passthrough")

module.exports = [
    {
        route: "/api/friends/index", methods: ["GET"], code: async ({url}) => {
            const params = url.searchParams
            if (!params.has("token")) return [401, 8];
            let row = await db.get("SELECT Accounts.userID, expires FROM Accounts INNER JOIN AccountTokens ON Accounts.userID = AccountTokens.userID WHERE token = ?", params.get("token"));
            if (!row || row.expires <= Date.now()) return [401, 8];
            if (row.userID != 1) return [403, 11];
            let files = await fsp.readdir(friendsDir);
            files = await Promise.all(files.map(f => fsp.stat(pj(friendsDir, f)).then(stat => {
                if (stat.isDirectory()) return null;
                else return {
                    filename: f,
                    size: pb(stat.size),
                    modified: stat.mtimeMs
                }
            })));
            files = files.filter(f => f);
            return [200, files];
        }
    }
]
