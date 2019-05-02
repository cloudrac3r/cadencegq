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