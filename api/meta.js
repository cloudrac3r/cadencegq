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
        }
    ]
}