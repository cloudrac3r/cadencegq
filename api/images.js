const mime = require("mime");
const pj = require("path").join;
const fs = require("fs");
const mmmagic = new (require("mmmagic").Magic)();
const crypto = require("crypto");
const util = require("util");

module.exports = ({db, extra}) => {
    let qe = extra.qe;
    return [
        {
            route: "/api/images/([a-f0-9]{6})(\\.[a-z]*)?", methods: ["GET"], code: async ({fill}) => {
                let imageID = fill[0];
                let image = await db.get("SELECT extension FROM Images WHERE imageID = ?", imageID);
                if (!image) return [400, 1];
                let content = await extra.rfp(pj("content/images", imageID), null);
                return {
                    statusCode: 200,
                    contentType: mime.getType(image.extension),
                    content: content
                }
            }
        },
        {
            route: "/api/images/([a-f0-9]{6})/details", methods: ["GET"], code: async ({fill}) => {
                let imageID = fill[0];
                let image = db.get("SELECT * FROM Images WHERE imageID = ?", imageID);
                if (!image) return [400, 1];
                else return [400, dbr];
            }
        },
        {
            route: "/api/images", methods: ["POST"], code: async ({body}) => {
                if (!body.length) return [400, 4];
                const allowed = [
                    {file: "PNG image data", ext: "png"},
                    {file: "JPEG image data", ext: "jpg"}
                ];
                let result = await new Promise(resolve => {
                    mmmagic.detect(body, (err, result) => resolve(result));
                });
                let type = allowed.find(a => result.startsWith(a.file));
                if (!type) return [400, 5];
                let hash = extra.hash(body).slice(0, 6);
                let files = await extra.rdp("content/images");
                let target;
                while (!target) {
                    if (files.includes(hash)) {
                        let copy = await extra.rfp(pj("content/images", hash));
                        if (body.equals(copy)) return [200, {imageID: hash}];
                        else hash = (parseInt("0x"+hash)+1).toString(16);
                    } else target = hash;
                }
                await util.promisify(fs.writeFile)(pj("content/images", hash), body, {encoding: null});
                await db.run("INSERT INTO Images VALUES (?, ?, NULL, ?, NULL)", [hash, type.ext, Date.now()]);
                return [201, {imageID: hash}];
            }
        },
        {
            route: "/api/images", methods: ["GET"], code: async ({params}) => {
                let maxLimit = 100;
                ["limit"].forEach(k => {
                    params[k] = parseInt(params[k]);
                    if (isNaN(params[k])) delete params[k];
                });
                let limit = (params.limit ? Math.min(params.limit, maxLimit) : maxLimit);
                let dbr = await db.all("SELECT * FROM Images ORDER BY creationTime DESC LIMIT ?", limit);
                dbr.forEach(row => delete row.author);
                return [200, dbr];
            }
        }
    ]
}