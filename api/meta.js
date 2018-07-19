const cf = require("../util/common.js");

module.exports = ({db}) => {
    return [
        {
            route: "/api/stats", methods: ["GET"], code: async () => {
                let output = {};
                output.dependencies = Object.keys(require("../package.json").dependencies);
                output.nodeVersion = process.version;
                output.requests = (await db.get("SELECT SUM(hits) AS hits FROM Hits")).hits;
                return [200, output];
            }
        },
        {
            route: "/api/hits", methods: ["GET"], code: async () => {
                let rows = await db.all("SELECT * FROM Hits ORDER BY hits DESC");
                rows = rows.slice(0, 6);
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