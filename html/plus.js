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
    request(`/api/pastes?start=${args.start}&end=${args.end}&limit=${args.limit}&preview=${args.preview}`, result => {
        callback(JSON.parse(result.responseText));
    });
}

function loadImageList(args, callback) {
    if (!callback) callback = new Function();
    request(`/api/images?limit=${args.limit}`, result => {
        callback(JSON.parse(result.responseText));
    });
}

function loadURLList(args, callback) {
    if (!callback) callback = new Function();
    request(`/api/urls?limit=${args.limit}`, result => {
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

function submitURL(url, author, callback) {
    if (!callback) callback = new Function();
    request("/api/urls", result => {
        try {
            let {hash} = JSON.parse(result.responseText);
            callback(hash);
        } catch (e) {
            callback();
        }
    }, Object.assign(author, {target: url}));
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
            if (c.inject) td.innerHTML = value;
            else td.innerText = value;
            let style = "text-align: "+c.align+"; ";
            if (c.css) style += c.css;
            td.setAttribute("style", c.css);
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
    for (let box of document.querySelectorAll(".infoBox")) {
        let dismissed = localStorage.getItem("ibdismiss");
        if (!dismissed.includes(box.getAttribute("ibid"))) {
            let closeButton = document.createElement("img");
            closeButton.src = "/fonts/cross.svg";
            closeButton.onclick = function() {
                box.parentElement.removeChild(box);
                localStorage.setItem("ibdismiss", localStorage.getItem("ibdismiss")+box.getAttribute("ibid")+",");
            }
            box.children[0].appendChild(closeButton);
            box.style.display = "block";
        }
    }
}

if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", postLoad);
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