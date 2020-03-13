const fs = require("fs");
const pj = require("path").join;
const nedb = require("nedb-promise");
const rp = require("request-promise");
const util = require("util");
const crypto = require("crypto");
const cp = require("child_process");
const os = require("os");
const request = require("request");

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

function getPatchedHash(token) {
    return new Promise(async resolve => {
        let values = await getValues();
        let readPromise = util.promisify(fs.readFile)(pj(values.installationDir, "res2.dat"), {encoding: null});
        readPromise.catch(() => {
            resolve(null);
        });
        readPromise.then(exe => {
            let patched = Buffer.concat([exe, Buffer.from(token)]);
            let hash = crypto.createHash("sha256").update(patched).digest("hex")
            resolve(hash);
        });
    });
}

function checkLocalAccess(handler) {
    return req => {
        return getValues().then(values => {
            if (values.remote) return [403, "This action is restricted. You can enable this action by installing Crumpet on your own computer."];
            else return handler(req);
        });
    }
}

let localMethods = [
    {
        route: "/api/rtw/download", methods: ["POST"], upload: "json", code: checkLocalAccess(({data}) => new Promise(async resolve => {
            let array = data.data;
            let buffer = Buffer.from(array);
            let values = await getValues();
            fs.writeFile(pj(values.levelDir, data.filename), buffer, {encoding: null}, err => {
                if (err) return resolve([400, err.stack || err.message || err.toString()]);
                else return resolve([204, ""]);
            });
        }))
    },
    {
        route: "/api/rtw/load", methods: ["GET"], code: checkLocalAccess(async ({params}) => {
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
        })
    },
    {
        route: "/api/rtw/config", methods: ["GET"], code: checkLocalAccess(() => {
            return getValues().then(data => [200, data]).catch(e => [500, e]);
        })
    },
    {
        route: "/api/rtw/config", methods: ["POST"], upload: "json", code: checkLocalAccess(({data}) => {
            if (!data) return Promise.resolve([400, "Give me some JSON, please."]);
            return replaceValues(data).then(() => [204, ""]);
        })
    },
    {
        route: "/api/rtw/installstate", methods: ["GET"], code: async () => {
            let contentDir = pj(__dirname, "..", "html", "rtw-edit");
            let contents = fs.readdirSync(contentDir);
            return [200, {installed: contents.includes("images")}];
        }
    },
    {
        route: "/api/rtw/requestimages", methods: ["GET"], code: checkLocalAccess(async () => {
            let token = await rp(remoteHost+"/api/rtw/token");
            let hash = await getPatchedHash(token);
            if (hash === null) return [400, "RTW files not found. Correct the installation directory path and try again."];
            return rp(remoteHost+"/api/rtw/fetchimages?token="+token+"&hash="+hash, {encoding: null}).then(async body => {
                let zipSavePath = pj(__dirname, "..", "html", "rtw-edit");
                await util.promisify(fs.writeFile)(pj(zipSavePath, "images.zip"), body, {encoding: null});
                if (os.platform().includes("win")) {
                    await util.promisify(cp.exec)("7z -aoa x images.zip", {
                        cwd: zipSavePath,
                        env: {PATH: "C:\\Program Files\\7-Zip;C:\\Program Files (x86)\\7-Zip"}}
                    )
                } else if (os.platform() == "linux") {
                    await util.promisify(cp.exec)("7z -aoa x images.zip", {
                        cwd: zipSavePath
                    }).catch(() => util.promisify(cp.exec)("unzip -o images.zip", {
                        cwd: zipSavePath
                    }));
                }
                return [204, ""];
            }).catch(error => {
                return [400, error.error || error.toString()];
            });
        })
    },{
        route: "/api/rtw/detect", methods: ["GET"], code: checkLocalAccess(async () => {
            if (os.platform() != "win32") return [400, "Unsupported operating system."];
            if (os.arch() == "x64") {
                var regdir = "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall";
            } else if (os.arch() == "x86") {
                var regdir = "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall";
            } else {
                return [400, "Unsupported architecture. (How did you manage to make this happen???)"];
            }
            let {stdout: programList} = await util.promisify(cp.exec)(`REG QUERY "${regdir}"`);
            let strings = ["Return To Wonderland", "Midnight Synergy Games Collection"];
            let name;
            while (!name && strings.length) {
                let compare = strings.shift();
                name = programList.split("\r\n").find(l => l.includes(compare));
                if (name) {
                    try {
                        let {stdout: data} = await util.promisify(cp.exec)(`REG QUERY "${name}"`);
                        let line = data.split("\r\n").find(l => l.trim().startsWith("InstallLocation"));
                        let tabs = line.trim().split("    ");
                        let msdir = tabs[2];
                        if (fs.readdirSync(msdir).includes("res2.dat")) return [200, msdir];
                        msdir = pj(msdir, "Return To Wonderland");
                        if (fs.readdirSync(msdir).includes("res2.dat")) return [200, msdir];
                        return [400, "Detected installation, but couldn't find data files."];
                    } catch (e) {
                        return [400, "Detected installation, but encountered an error while processing.\n\n"+e.stack];
                    }
                }
            }
            return [400, "Couldn't detect RTW installation."];
        })
    }
];

let remoteMethods = [
    {
        route: "/api/rtw/archive.zip", methods: ["GET"], code: async () => {
            return {stream: request("https://codeload.github.com/cloudrac3r/cadencegq/zip/master")};
        }
    },
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

module.exports = localMethods.concat(remoteMethods);
