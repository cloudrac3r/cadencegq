const mime = require("mime");
const pj = require("path").join;
const fs = require("fs");
const identify = require("buffer-signature").identify;
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
                    headers: {
                        "Cache-Control": "max-age=2592000, public"
                    },
                    content: content
                }
            }
        },
        {
            route: "/api/images/([a-f0-9]{6})/details", methods: ["GET"], code: async ({fill}) => {
                let imageID = fill[0];
                let dbr = await db.get("SELECT * FROM Images WHERE imageID = ?", imageID);
                if (!dbr) return [400, 1];
                delete dbr.author;
                return [200, dbr];
            }
        },
        {
            route: "/api/images", methods: ["POST"], code: async ({body}) => {
                if (!body.length) return [400, 4];
                const allowed = ["image/png", "image/jpeg"];
                let type = identify(body);
                if (!allowed.includes(type.mimeType)) return [400, 5];
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
                let dbr = await db.all("SELECT * FROM Images ORDER BY creationTime DESC");
                dbr.forEach(row => delete row.author);
                return [200, dbr];
            }
        }
    ]
}