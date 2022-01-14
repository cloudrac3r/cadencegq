const fs = require("fs");

let shareWords = [];
fs.readFile("util/words.txt", "utf8", (err, words) => {
    if (err) throw err;
    if (words) shareWords = words.split("\n");
})
const IDLetterIndex = []
.concat(Array(26).fill().map((_, i) => String.fromCharCode(i+65)))
.concat(Array(26).fill().map((_, i) => String.fromCharCode(i+97)))
.concat(Array(10).fill().map((_, i) => i.toString()))
.join("")
+"-_"

function getShareWords(id) {
    if (shareWords.length == 0) {
        console.error("Tried to get share words, but they aren't loaded yet!");
        return "";
    }
    // Convert ID string to binary number string
    let binaryString = "";
    for (let letter of id) {
        binaryString += IDLetterIndex.indexOf(letter).toString(2).padStart(6, "0");
    }
    binaryString = binaryString.slice(0, 64);
    // Convert binary string to words
    let words = [];
    for (let i = 0; i < 6; i++) {
        let bitFragment = binaryString.substr(i*11, 11).padEnd(11, "0");
        let number = parseInt(bitFragment, 2);
        let word = shareWords[number];
        words.push(word);
    }
    return words;
}
function getIDFromWords(words) {
    // Convert words to binary number string
    let binaryString = "";
    for (let word of words) {
        binaryString += shareWords.indexOf(word).toString(2).padStart(11, "0")
    }
    binaryString = binaryString.slice(0, 64);
    // Convert binary string to ID
    let id = "";
    for (let i = 0; i < 11; i++) {
        let bitFragment = binaryString.substr(i*6, 6).padEnd(6, "0");
        let number = parseInt(bitFragment, 2);
        id += IDLetterIndex[number];
    }
    return id;
}
function validateShareWords(words) {
    if (words.length != 6) throw new Error("Expected 6 words, got "+words.length);
    for (let word of words) {
        if (!shareWords.includes(word)) throw new Error(word+" is not a valid share word");
    }
}
function findShareWords(string) {
    if (string.includes(" ")) {
        return string.toLowerCase().split(" ");
    } else {
        let words = [];
        let currentWord = "";
        for (let i = 0; i < string.length; i++) {
            if (string[i] == string[i].toUpperCase()) {
                if (currentWord) words.push(currentWord);
                currentWord = string[i].toLowerCase();
            } else {
                currentWord += string[i];
            }
        }
        words.push(currentWord);
        return words;
    }
}

const {db, extra, pugCache} = require("../passthrough")
const cf = require("../util/common")

module.exports = [
    {
        route: "/v/(.*)", methods: ["GET"], code: async ({fill}) => {
            let id;
            let wordsString = fill[0];
            wordsString = wordsString.replace(/%20/g, " ")
            if (wordsString.length == 11) {
                id = wordsString
            } else {
                let words = findShareWords(wordsString);
                try {
                    validateShareWords(words);
                } catch (e) {
                    return [400, e.message];
                }
                id = getIDFromWords(words);
            }
            return {
                statusCode: 301,
                contentType: "text/html",
                content: "Redirecting...",
                headers: {
                    "Location": "https://tube.cadence.moe/watch?v="+id
                }
            }
        }
    },
    {
        route: "/cloudtube/video/([\\w-]+)", methods: ["GET"], code: async ({req, fill}) => {
            return {
                statusCode: 301,
                contentType: "text/html",
                content: "Redirecting...",
                headers: {
                    "Location": "https://tube.cadence.moe/watch?v="+fill[0]
                }
            }
        }
    },
    {
        route: "/cloudtube/channel/([\\w-]+)", methods: ["GET"], code: async ({req, fill}) => {
            return {
                statusCode: 301,
                contentType: "text/html",
                content: "Redirecting...",
                headers: {
                    "Location": "https://tube.cadence.moe/channel/"+fill[0]
                }
            }
        }
    },
    {
        route: "/cloudtube/playlist/([\\w-]+)", methods: ["GET"], code: async ({req, fill}) => {
            return {
                statusCode: 301,
                contentType: "text/html",
                content: "Redirecting...",
                headers: {
                    "Location": "https://tube.cadence.moe/playlist?list="+fill[0]
                }
            }
        }
    }
]
