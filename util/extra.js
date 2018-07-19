const crypto = require("crypto");
const util = require("util");
const fs = require("fs");

module.exports = function ({db}) {
    const extra = {
        qe: function(callback, statusCode, error) {
            if (typeof(error) == "number") {
                error = {code: error};
            }
            let contentType = (typeof(error) == "object" ? "application/json" : "text/plain")
            callback({
                statusCode,
                contentType,
                headers: [],
                content: error
            });
        },
        salt: function(length = 32) {
            return Buffer.from(Array(length).fill().map(a => Math.random()*80+32)).toString();
        },
        hash: function(data) {
            return crypto.createHash("sha256").update(data).digest("hex");
        },
        verifyPassword: async function(username, password, extended) {
            let result = await db.get("SELECT hash, salt FROM Accounts WHERE username = ?", username);
            if (!result) return (extended ? [false, 2] : false);
            let inputHash = extra.hash(password+result.salt);
            if (result.hash == inputHash) return (extended ? [true, 0] : true);
            else return (extended ? [false, 8] : false);
        },
        rfp: (filename, encoding) => util.promisify(fs.readFile)(filename, {encoding}),
        rdp: dir => util.promisify(fs.readdir)(dir),
        resolveAuthor: row => {
            if (row.authorAccount) row.author = row.username;
            delete row.authorAccount;
            delete row.username;
            return row;
        },
        resolveAuthorInput: async data => {
            data.authorAccount = 0;
            if (data.token) {
                data.authorAccount = 1;
                let account = await db.get("SELECT userID FROM AccountTokens WHERE token = ?", data.token);
                if (!account) {
                    if (!data.username) return [false, [401, 8]];
                } else {
                    data.username = account.userID.toString();
                }
            }
            if (!data.username) {
                data.authorAccount = 1;
                data.username = "0";
            }
            data.username = data.username.toString().slice(0, 30);
            return [true, data];
        }
    };
    return extra;
}