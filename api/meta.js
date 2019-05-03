const cf = require("../util/common.js");
const pj = require("path").join;
const simpleGit = require("simple-git")(pj(__dirname, ".."));

module.exports = ({db}) => {
    return [
        {
            route: "/api/stats", methods: ["GET"], code: () => new Promise(resolve => {
                let output = {};
                output.dependencies = Object.keys(require("../package.json").dependencies);
                output.nodeVersion = process.version;
                Promise.all([
                    db.get("SELECT SUM(hits) AS hits FROM Hits"),
                    new Promise(resolve => {
                        simpleGit.log({"--no-decorate": null}, (err, log) => {
                            resolve(log.all[0]);
                        });
                    })
                ]).then(([hitsRow, gitLog]) => {
                    output.requests = hitsRow.hits;
                    output.latestCommit = gitLog.hash.slice(0, 7);
                    output.latestCommitTime = new Date(gitLog.date).getTime();
                    resolve([200, output]);
                });
            })
        },
        {
            route: "/api/hits", methods: ["GET"], code: async () => {
                let rows = await db.all("SELECT * FROM Hits ORDER BY hits DESC");
                rows = rows.slice(0, 12);
                let columns = [[], []];
                for (let row of rows) {
                    columns[1].push(Object.values(row)[0]);
                    columns[0].push(Object.values(row)[1]);
                }
                let table = cf.tableify(columns, ["right", "left"]);
                return [200, table];
            }
        }
    ]
}