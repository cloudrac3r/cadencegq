const fs = require("fs");
const pj = require("path").join;
const nedb = require("nedb-promise");
const rp = require("request-promise");
const util = require("util");
const crypto = require("crypto");
const cp = require("child_process");
const os = require("os");

const remoteHost = "https://cadence.moe";

const db = new nedb({filename: pj(__dirname, "..", "db", "rtwconfig.db"), autoload: true});

class TokenStore {
    constructor() {
        this.tokens = new Set();
        this.tokenExpiry = new Map();
        this.expiryTime = 20000; // 20 seconds
    }
    random() {
        return Math.random().toString().split(".")[1];
    }
    generate() {
        let token = "";
        while (token == "" || this.tokens.has(token)) {
            token = this.random();
        }
        this.tokens.add(token);
        this.tokenExpiry.set(token, setTimeout(() => this.delete(token), this.expiryTime));
        return token;
    }
    check(token) {
        return this.tokens.has(token);
    }
    delete(token) {
        this.tokens.delete(token);
        this.tokenExpiry.delete(token);
    }
}
const tokenStore = new TokenStore();

function getValues() {
    return db.findOne({}).then(values => values || {});
}

async function replaceValues(data) {
    await db.remove({});
    await db.insert(data);
}

async function getPatchedHash(token) {
    let values = await getValues();
    let exe = await util.promisify(fs.readFile)(pj(values.installationDir, "res2.dat"), {encoding: null});
    let patched = Buffer.concat([exe, Buffer.from(token)]);
    let hash = crypto.createHash("sha256").update(patched).digest("hex")
    return hash;
}

let localMethods = [
    {
        route: "/api/rtw/download", methods: ["POST"], code: ({data}) => new Promise(async resolve => {
            let array = data.data;
            let buffer = Buffer.from(array);
            let values = await getValues();
            fs.writeFile(pj(values.levelDir, data.filename), buffer, {encoding: null}, err => {
                if (err) return resolve([400, err.stack || err.message || err.toString()]);
                else return resolve([204, ""]);
            });
        })
    },
    {
        route: "/api/rtw/load", methods: ["GET"], code: async ({params}) => {
            if (!params.filename) return [400, "No filename provided"];
            if (params.filename == ".LV6") return [400, "Enter a filename into the filename input box and then click the button again."];
            let values = await getValues();
            let path = pj(values.levelDir, params.filename);
            return new Promise(resolve => {
                fs.exists(path, exists => {
                    if (!exists) return resolve([400, "File does not exist ("+params.filename+")"]);
                    fs.readFile(path, {encoding: null}, (err, buffer) => {
                        if (err) return resolve([400, err.stack || err.message || err.toString()]);
                        else return resolve([200, [...buffer]]);
                    });
                });
            });
        }
    },
    {
        route: "/api/rtw/config", methods: ["GET"], code: () => {
            return getValues().then(data => [200, data]).catch(e => [500, e]);
        }
    },
    {
        route: "/api/rtw/config", methods: ["POST"], code: ({data}) => {
            if (!data) return Promise.resolve([400, "Give me some JSON, please."]);
            return replaceValues(data).then(() => [204, ""]);
        }
    },
    {
        route: "/api/rtw/installstate", methods: ["GET"], code: async () => {
            let contentDir = pj(__dirname, "..", "html", "rtw-edit");
            let contents = fs.readdirSync(contentDir);
            return [200, {installed: contents.includes("images")}];
        }
    },
    {
        route: "/api/rtw/requestimages", methods: ["GET"], code: async () => {
            let token = await rp(remoteHost+"/api/rtw/token");
            let hash = await getPatchedHash(token);
            return rp(remoteHost+"/api/rtw/fetchimages?token="+token+"&hash="+hash, {encoding: null}).then(async body => {
                let zipSavePath = pj(__dirname, "..", "html", "rtw-edit");
                await util.promisify(fs.writeFile)(pj(zipSavePath, "images.zip"), body, {encoding: null});
                if (os.platform().includes("win")) {
                    await util.promisify(cp.exec)("7z x images.zip", {
                        cwd: zipSavePath,
                        env: {PATH: "C:\\Program Files\\7-Zip;C:\\Program Files (x86)\\7-Zip"}}
                    )
                } else if (os.platform() == "linux") {
                    await util.promisify(cp.exec)("7z x images.zip", {
                        cwd: zipSavePath
                    }).catch(() => util.promisify(cp.exec)("unzip images.zip", {
                        cwd: zipSavePath
                    }));
                }
                return [204, ""];
            }).catch(error => {
                return [400, error.error || error.toString()];
            });
        }
    }
];

let remoteMethods = [
    {
        route: "/api/rtw/token", methods: ["GET"], code: async () => {
            let token = tokenStore.generate();
            return [200, token];
        }
    },
    {
        route: "/api/rtw/fetchimages", methods: ["GET"], code: async ({params}) => {
            if (!params.token) return [400, "Missing token"];
            if (!tokenStore.check(params.token)) return [403, "Bad token"];
            if (!params.hash) return [400, "Missing hash"];
            let hashSolution = await getPatchedHash(params.token);
            if (params.hash != hashSolution) return [403, "Invalid hash"];

            let file = await util.promisify(fs.readFile)(pj(__dirname, "..", "content", "rtw_data", "images.zip"), {encoding: null});
            return {
                statusCode: 200,
                contentType: "application/zip",
                content: file
            }
        }
    }
]

module.exports = () => localMethods.concat(remoteMethods);