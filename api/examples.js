const pj = require("path").join;
const cf = require("../util/common.js");
const util = require("util");
const fs = require("fs");
const pb = require("prettier-bytes");

module.exports = () => {
    const files = [
        {
            filename: "urls-comma.csv",
            mime: "text/csv",
            description: "Comma separated"
        },{
            filename: "doggo.jpg",
            mime: "image/jpeg",
            description: "0° orientation, 2621×1969 px"
        },{
            filename: "security.mp4",
            mime: "video/mp4",
            description: "0:35, h264, 480×360@30, 1721kb/s"
        },{
            filename: "breakfast.ogg",
            mime: "audio/x-vorbis+ogg"
        },{
            filename: "editor.png",
            mime: "image/png"
        },{
            filename: "soup.txt",
            mime: "text/plain"
        }
    ];
    Promise.all(files.map(f => new Promise(resolve => {
        util.promisify(fs.stat)(pj("html/examples", f.filename)).then(stats => {
            f.size = pb(stats.size);
            resolve();
        }).catch(err => {
            cf.log("Failed to load size of example file: "+f.filename+"\n"+err, "error");
            resolve();
        });
    }))).then(() => {
        cf.log("Loaded size of all example files", "spam");
    });
    return [
        {
            route: "/api/examples", methods: ["GET"], code: async () => {
                return [200, files];
            }
        }
    ]
}