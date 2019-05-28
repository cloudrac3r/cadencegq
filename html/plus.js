/* Utility functions */

let loginDetails = undefined;
let loginAttempted = false;
let loginCallbacks = [];

function q(w) {
    return document.querySelector(w);
}

function request(url, callback, body, method) {
    if (!callback) callback = new Function();
    if (!method) method = (body ? "POST" : "GET");
    let requester = new XMLHttpRequest();
    requester.addEventListener("load", () => {
        console.log(requester);
        callback(requester);
    });
    requester.open(method, url);
    if (body) {
        if (typeof(body) == "object" && ["Array", "Object"].includes(body.constructor.name)) body = JSON.stringify(body);
        requester.send(body);
    } else {
        requester.send();
    }
    console.log(method, url, body);
}

const lsmDefaults = {
    "subscriptions": "",
    "watchedVideos": "",
    "trackWatchedVideos": "0"
}

const lsm = {
    get: function(key, replace) {
        if (replace === undefined) replace = lsmDefaults[key];
        if (replace) lsm.setup(key, replace);
        return localStorage.getItem(key);
    },
    set: function(key, value) {
        localStorage.setItem(key, value);
    },
    array: function(key) {
        lsm.setup(key, "");
        return lsm.arrayStorage[key] || (lsm.arrayStorage[key] = new LSMArray(key, lsm.get(key)));
    },
    arrayStorage: {},
    setup: function(key, value) {
        if (localStorage.getItem(key) == null) lsm.set(key, value);
    }
}

class LSMArray {
    constructor(key, string) {
        this.separator = ",";
        this.key = key;
        this.read(string);
    }
    read(string) {
        string = string.replace(/^,|,$/g, "");
        if (string) {
            this.array = string.split(this.separator);
        } else {
            this.array = [];
        }
        this.string = string;
        this.write();
    }
    write() {
        this.string = this.array.join(this.separator);
        lsm.set(this.key, this.string);
    }
    add(item, singular) {
        if (singular && this.array.includes(item)) {
            return false;
        } else {
            this.array.push(item);
            this.write();
            return true;
        }
    }
    remove(item) {
        let index = this.array.indexOf(item);
        if (index != -1) {
            this.array.splice(index, 1);
            this.write();
            return true;
        } else {
            return false;
        }
    }
    clear() {
        this.array.length = 0;
        this.write();
    }
}

for (let key of Object.keys(lsmDefaults)) {
    lsm.setup(key, lsmDefaults[key]);
}

for (let object of [HTMLCollection.prototype, NodeList.prototype]) {
    if (!object[Symbol.iterator]) {
        object[Symbol.iterator] = function() { return this };
        object.next = function() {
            if (this._index == undefined) this._index = 0;
            if (this[this._index]) return {done: false, value: this[this._index++]};
            this._index = 0;
            return {done: true, value: undefined};
        }
    }
}

/* Usable functions */

function loadPaste(pasteID, callback) {
    if (!callback) callback = new Function();
    request("/api/pastes/"+pasteID, result => {
        let {author, content, creationTime} = JSON.parse(result.responseText);
        callback(author, content, creationTime);
    });
}

function loadImageDetails(imageID, callback) {
    if (!callback) callback = new Function();
    request("/api/images/"+imageID+"/details", result => {
        let {extension, creationTime} = JSON.parse(result.responseText);
        callback(extension, creationTime);
    });
}

function loadPasteList(args, callback) {
    if (!callback) callback = new Function();
    request(`/api/pastes?preview=${args.preview}`, result => {
        callback(JSON.parse(result.responseText));
    });
}

function loadImageList(args, callback) {
    if (!callback) callback = new Function();
    request(`/api/images`, result => {
        callback(JSON.parse(result.responseText));
    });
}

function loadURLList(args, callback) {
    if (!callback) callback = new Function();
    request(`/api/urls`, result => {
        callback(JSON.parse(result.responseText));
    });
}

function submitPaste(content, author, callback) {
    if (!callback) callback = new Function();
    request("/api/pastes", result => {
        try {
            let {pasteID} = JSON.parse(result.responseText);
            callback(pasteID);
        } catch (e) {
            callback();
        }
    }, Object.assign(author, {content}));
}

function editPaste(pasteID, content, token, callback) {
    if (!callback) callback = new Function();
    request("/api/pastes/"+pasteID, result => {
        try {
            let success = result.status == 204;
            callback(success);
        } catch (e) {
            callback();
        }
    }, {content, token}, "PATCH");
}

function submitImage(file, username, callback) {
    if (!callback) callback = new Function();
    let url = "/api/images";
    if (username) url += "?author="+username;
    request(url, result => {
        try {
            let {imageID} = JSON.parse(result.responseText);
            callback(imageID);
        } catch (e) {
            callback();
        }
    }, file);
}

function getExamples(callback) {
    request("/api/examples", result => {
        try {
            callback(JSON.parse(result.responseText));
        } catch (e) {
            callback();
        }
    });
}

function getServerInfo(callback) {
    request("/api/stats", result => {
        try {
            callback(JSON.parse(result.responseText));
        } catch (e) {
            callback();
        }
    });
}

function clear() {
    document.getElementById("content").value = "";
}

function fadeElement(element, stayTime, fadeTime) {
    if (element.attributes["data-fade"]) return;
    element.setAttribute("data-fade", "");
    let current = 1;
    function setFade() {
        element.style.opacity = current;
        setTimeout(() => {
            current -= 0.01;
            if (current >= 0) {
                setFade();
            } else {
                element.removeAttribute("data-fade", "");
            }
        }, fadeTime/100);
    }
    setTimeout(setFade, stayTime);
    element.style.opacity = 1;
}

function uninject(value) { // note: don't use this
    if (typeof(value) == "string") value = value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    return value;
}

function dataToTable(columns, rows) {
    let output = [];
    rows.forEach(row => {
        let tr = document.createElement("tr");
        columns.forEach(c => {
            let td = document.createElement("td");
            let value = (c.transform ? c.transform(row[c.name], row) : row[c.name]);
            if (value instanceof HTMLElement) {
                td.appendChild(value);
            } else {
                if (c.inject) td.innerHTML = value;
                else td.innerText = value;
            }
            let style = "text-align: "+c.align+"; ";
            if (c.css) style += c.css;
            td.setAttribute("style", style);
            tr.appendChild(td);
        });
        output.push(tr);
    });
    return output;
}

function humaniseDate(date) {
    let array = new Date(date).toDateString().split(" ");
    return (+array[2])+" "+array[1]+" "+array[3];
}

function getLoginDetails(callback) {
    if (!callback) callback = new Function();
    if (loginAttempted) {
        if (loginDetails === undefined) loginCallbacks.push(callback);
        else callback(loginDetails);
    } else {
        loginCallbacks.push(callback);
        loginAttempted = true;
        let token = localStorage.getItem("token");
        if (token) {
            request("/api/accounts/tokens/"+token, result => {
                try {
                    if (result.status == 200) {
                        loginDetails = JSON.parse(result.responseText);
                        lsm.array("subscriptions").array = loginDetails.subscriptions;
                        lsm.array("subscriptions").write();
                        con();
                    } else {
                        localStorage.removeItem("token");
                        loginDetails = null;
                        con();
                    }
                } catch (e) {
                    localStorage.removeItem("token");
                    loginDetails = null;
                    con();
                }
            });
        } else {
            loginDetails = null;
            con();
        }
    }
    function con() {
        loginCallbacks.forEach(callback => callback(loginDetails));
    }
}

function login(username, password, callback) {
    if (!callback) callback = new Function();
    request("/api/accounts/tokens", result => {
        try {
            let token = JSON.parse(result.responseText).token;
            localStorage.setItem("token", token, Infinity);
            callback(token);
        } catch (e) {
            callback();
        };
    }, {username, password});
}

function logout(callback) {
    if (!callback) callback = new Function();
    request("/api/accounts/tokens/"+localStorage.getItem("token"), () => {
        localStorage.removeItem("token");
        callback();
    }, undefined, "DELETE");
}

function createAccount(username, password, callback) {
    if (!callback) callback = new Function();
    request("/api/accounts", result => {
        if (result.status == 204) callback(true);
        else callback(false);
    }, {username, password});
}

function makeInfoBoxesWork() {
    if (!localStorage.getItem("ibdismiss")) localStorage.setItem("ibdismiss", "");
    let dismissed = localStorage.getItem("ibdismiss");
    for (let box of document.querySelectorAll(".infoBox")) {
        if (box.getAttribute("ibid") && !dismissed.includes(box.getAttribute("ibid")) && box.getAttribute("complete") != "1") {
            let closeButton = document.createElement("img");
            closeButton.src = "/fonts/cross.svg";
            closeButton.onclick = function() {
                box.parentElement.removeChild(box);
                if (box.getAttribute("ibid") != "null") localStorage.setItem("ibdismiss", localStorage.getItem("ibdismiss")+box.getAttribute("ibid")+",");
            }
            if (box.hasAttribute("data-ibclosebutton")) {
                closeButton.style.display = "none";
                let textButton = document.createElement("button");
                textButton.textContent = box.getAttribute("data-ibclosebutton");
                textButton.onclick = closeButton.onclick;
                box.children[0].children[0].appendChild(textButton);
            }
            box.children[0].appendChild(closeButton);
            box.style.display = "block";
            box.setAttribute("complete", "1");
        }
    }
}

class ElemJS {
    constructor(type) {
        this.element = document.createElement(type);
        this.element.js = this;
        this.children = [];
    }
    class() {
        for (let name of arguments) if (name) this.element.classList.add(name);
        return this;
    }
    direct(name, value) {
        if (name) this.element[name] = value;
        return this;
    }
    attribute(name, value) {
        if (name) this.element.setAttribute(name, value);
        return this;
    }
    style(name, value) {
        if (name) this.element.style[name] = value;
        return this;
    }
    id(name) {
        if (name) this.element.id = name;
        return this;
    }
    text(name) {
        this.element.innerText = name;
        return this;
    }
    html(name) {
        this.element.innerHTML = name;
        return this;
    }
    child(toAdd, position) {
        if (typeof(toAdd) == "object") {
            toAdd.parent = this;
            if (typeof(position) == "number") {
                this.element.insertBefore(toAdd.element, this.element.children[position]);
                this.children.splice(position, 0, toAdd);
            } else {
                this.element.appendChild(toAdd.element);
                this.children.push(toAdd);
            }
        }
        return this;
    }
    clearChildren() {
        this.children.length = 0;
        while (this.element.lastChild) this.element.removeChild(this.element.lastChild);
    }
    register(property) {
        this._link = property;
        return this;
    }
    link(property) {
        let children = [this];
        while (!this[property]) {
            let child = children.shift();
            if (child._link == property) {
                this[property] = child;
            } else {
                children = children.concat(child.children);
            }
        }
        return this;
    }
}

function prettySeconds(seconds, alwaysHours) {
    let minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    let hours = Math.floor(minutes / 60);
    minutes = minutes % 60;
    let output = [];
    if (alwaysHours || hours) {
        output.push(hours);
        output.push(minutes.toString().padStart(2, "0"));
    } else {
        output.push(minutes);
    }
    output.push(seconds.toString().padStart(2, "0"));
    return output.join(":");
}

function viewCountText(count) {
    const units = ["", "K", "M", "B"];
    let log = Math.log10(count);
    let exp = (log - log % 3);
    let unit = units[exp/3];
    let value = count / 10**exp;
    if (Math.floor(value).toString().length == 1) value = value.toFixed(1);
    else value = Math.floor(value);
    let viewsPlural = " view";
    if (count != 1) viewsPlural += "s";
    return value+unit+viewsPlural;
}

if (document.readyState != "complete") {
    window.onload = postLoad;
} else {
    postLoad();
}
function postLoad() {
    makeInfoBoxesWork();
    let bodyLoadExists = false;
    try {
        bodyLoad
        bodyLoadExists = true;
    } catch (e) {};
    if (bodyLoadExists) bodyLoad();
    getLoginDetails(login => {
        let accountStatus = q("#accountState");
        if (login) {
            accountStatus.innerText = "Logged in as "+login.username;
        } else {
            accountStatus.innerText = "Log in";
        }
        checkMobileHeader();
    });
}