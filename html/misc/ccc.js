const externalc = (function() {
    function random(min, max) {
        return Math.floor(Math.random()*(max-min-1)+min);
    }

    function listify(array, empty, surround) {
        if (!array) array = [];
        if (!empty) empty = "nothing";
        if (surround) array = array.map(i => surround+i+surround);
        switch (array.length) {
        case 0:
            return empty; // For empty arrays, return "nothing" (or the specified result)
        case 1:
            return array[0]; // For arrays with 1 item, just return that item
        case 2:
            return array[0]+" and "+array[1]; // For arrays with 2 items, connect them with " and ".
        default:
            return array[0]+", "+listify(array.slice(1)); // For arrays with more than 2 items, recurse.
        }
    }

    Array.prototype.shuffle = function() {
        let na = [];
        let oa = [...this];
        while (oa.length) {
            na.push(...oa.splice(Math.floor(Math.random()*oa.length), 1));
        }
        return na;
    }


    const functions = [
        {
            triggers: ["roll"],
            code: (string, trigger, n1, n2) => {
                if (n1 && n2) return random(n1, n2);
                else if (n1) return random(n1, 100);
                else return random(0, 100);
            }
        },{
            triggers: ["bot", "mentions?(\[\d+\])?", "8", "g?contains\[.*?\]", "posted[0-9]+", "username", "user", "name", "id", "avatar",
                "defaultavatar", "defavatar", "mention", "ping", "nickname", "thennick", "thennickname", "nick", "role", "color", "colour",
                "rolecolor", "rolecolour", "status", "game", "cname", "cid", "cmention", "position", "cposition", "pos", "cpos", "sname",
                "sregion", "region", "sicon", "icon", "sid", "mid", "ctopic", "topic", "message", "content", "executablemessage",
                "executablecontent", "execmessage", "execcontent", "emessage", "econtent", "word", "emoji", "avataremoji", "ae", "noun",
                "verb", "adjective", "adj", "true", "false", "char", "character", "allmentions", "obamatokens", "ot", "obamatokensmax",
                "otm", "obamatokensgiven", "otg", "discriminator", "tag", "8hippo", "8confirm", "8bp", "8bodypart", "8fet", "8fetish"],
            code: (string, trigger) => {
                return "example "+trigger+" here";
            }
        },{
            triggers: ["u", "caps"],
            code: (string) => {
                return string.toUpperCase();
            }
        },{
            triggers: ["l"],
            code: (string) => {
                return string.toLowerCase();
            }
        },{
            triggers: ["wavy"],
            code: (string) => {
                return string.split("").map(s => Math.random() < 0.5 ? s.toLowerCase() : s.toUpperCase()).join("");
            }
        },{
            triggers: ["rep", "replace"],
            code: (string, trigger, bad, good, ...input) => {
                return input.join("|").split(bad).join(good);
            }
        },{
            triggers: ["choose"],
            code: (string, trigger, ...options) => {
                return options[Math.floor(Math.random()*options.length)];
            }
        },{
            triggers: ["len", "length"],
            code: (string) => {
                return string.length;
            }
        },{
            triggers: ["stretch"],
            code: (string, trigger, input, length) => {
                if (length == input.length) return input;
                else if (length == 0) return "";
                else if (length == 1) return input[0] || "";
                else if (length == 2) return input[0]+input.slice(-1)[0];
                else if (length > input.length) {
                    let output = "";
                    for (let i = 0; i < length; i++) {
                        output += input[Math.floor(i/length*input.length)]
                    }
                    return output;
                } else {
                    input = input.trim();
                    if (input.length < length) input += " ".repeat(length-input.length);
                    while (input.length > length && input.match(/[aeiou]$/i)) input = input.replace(/[aeiou]$/i, "");
                    while (input.length > length && input.includes(" ")) input = input.replace(" ", "");
                    if (input.length == length) return input;
                    let output = new Array().fill(length);
                    [...input].forEach((l, i) => {
                        let n = Math.ceil(i/input.length*(length-1));
                        if (!output[n] || output[n].match(/[aeiou]/i)) output[n] = l;
                    });
                    if (output.length != length) throw new Error("Stretch output length is longer than requested");
                    return output.join("");
                }
            }
        },{
            triggers: ["st", "nd", "rd", "th"],
            code: (string) => {
                let units = parseInt(string.slice(-1)[0]);
                let tens = parseInt(strng.slice(-2, -1)[0] || "0");
                if (tens == 1) return string+"th";
                else {
                    if (units == 1) return string+"st";
                    else if (units == 2) return string+"nd";
                    else if (units == 3) return string+"rd";
                    else return string+"th";
                }
            }
        },{
            triggers: ["8color", "8colour"],
            code: () => {
                return random(0, 0xffffff).toString(16).padStart(6, "0");
            }
        },{
            triggers: ["m", "maths?"],
            code: (string) => {
                let result = math.eval(string);
                if (result == true) return 1;
                else if (result == false) return 0;
                else if (result == undefined) return "OwO";
                else return result;
            }
        },{
            triggers: ["hover"],
            code: () => {
                return "HOVERABLE EMOJI";
            }
        },{
            triggers: ["shuffle"],
            code: (string, trigger, ...options) => {
                return options.shuffle().join("|");
            }
        },{
            triggers: ["none"],
            code: (string) => {
                return string;
            }
        },{
            triggers: ["entries"],
            code: (string, trigger, ...options) => {
                return options.length;
            }
        },{
            triggers: ["aes", "small", "fancy", "circles", "jank", "old", "lines", "squares"],
            code: () => {
                return "fancy text isn't implemented here yet, but is in rsrb";
            }
        },{
            triggers: ["and"],
            code: (string, trigger, ...options) => {
                return listify(options);
            }
        },{
            triggers: ["chunk"],
            code: (string, trigger, selection, ...options) => {
                let start = selection.split(":")[0] || 0;
                let end = selection.split(":")[1] || selection.split(":")[0] || options.length;
                let result = options.slice(start, end);
                return result.join("|");
            }
        },{
            triggers: ["slice"],
            code: (string, trigger, selection, input) => {
                let start = selection.split(":")[0] || 0;
                let end = selection.split(":")[1] || selection.split(":")[0] || input.length;
                let result = input.slice(start, end);
                return result;
            }
        },{
            triggers: ["repeat"],
            code: (string, trigger, words, count) => {
                let result = words.repeat(count);
                return result;
            }
        },{
            triggers: ["iif"],
            code: (string, trigger, condition, caseTrue, caseFalse) => {
                if (condition == "1") return caseTrue;
                else return caseFalse;
            }
        },{
            triggers: ["foreach"],
            code: (string, trigger, variable, index, code, ...values) => {
                return values.map((v, i) => "|"+run(code.replace(/<\\>/g, "").replace(/^\[#/, "[").replace("{"+variable+"}", v).replace("{"+index+"}", i)).output).join("");
            }
        },{
            triggers: ["asc"],
            code: (string, trigger, ...values) => {
                return String.fromCharCode(...values);
            }
        }
    ];

    function matchOpenBracket(input) {
        let regex = /(.*?[^\\])\[/msg;
        let match = ["", "<\\>"];
        while (match && match[1].endsWith("<\\>")) {
            match = regex.exec(input);
        }
        return match;
    }

    function countOpen(input) {
        let open = 0;
        for (let i = 0; i < input.length; i++) {
            if (input[i] == "[" && input[i-1] != "\\") open++;
            if (input[i] == "]" && input[i-1] != "\\") open--;
        }
        return open;
    }

    function locateBoundaries(input, startIndex) {
        if (startIndex === undefined) {
            let match = matchOpenBracket(input);
            startIndex = match.index+match[0].length-1;
        }
        let index = startIndex+1;
        let open = 1;
        while (open != 0 && index < input.length) {
            if (input[index] == "[" && input[index-1] != "\\"/* && input.slice(index-4, index-1) != "<\\>"*/) open++;
            if (input[index] == "]" && input[index-1] != "\\"/* && input.slice(index-4, index-1) != "<\\>"*/) open--;
            index++;
        }
        if (open == 0) {
            let endIndex = index-1;
            return {
                indexes: {
                    start: startIndex,
                    end: endIndex
                },
                sections: {
                    pre: input.slice(0, startIndex),
                    middle: input.slice(startIndex+1, endIndex),
                    post: input.slice(endIndex+1)
                }
            };
        } else {
            return null;
        }
    }

    function calculateFragments(input) {
        let fragments = input.split("|");
        let i = 0;
        while (i < fragments.length) {
            if (fragments[i].endsWith("\\")) {
                fragments[i] = fragments[i].slice(0, -1)+"|"+(fragments[i+1] || "");
                fragments.splice(i+1, 1);
            } else if (fragments[i].endsWith("<\\>")) {
                fragments[i] = fragments[i]+"|"+(fragments[i+1] || "");
                fragments.splice(i+1, 1);
            } else i++;
        }
        return fragments;
    }

    function executeFragments(fragments) {
        let output = "";
        for (let n of functions) {
            if (n.triggers.some(t => new RegExp("^"+t+"$").exec(fragments[0]))) {
                output += n.code(fragments.slice(1).join("|"), fragments[0], ...fragments.slice(1));
            }
        }
        return output;
    }

    const run = function(input, inner) {
        let open = countOpen(input);
        if (open != 0) return {open, output: input};
        input = " "+input;
        let numbers = [];
        let regex = /[^\\]\[(\d*)#/msg;
        while (match = regex.exec(input)) { // Set up <\>[n#]
            let boundaries = locateBoundaries(input, match.index+1);
            if (!boundaries.sections.pre.endsWith("<\\>")) {
                if (match[1] && !numbers.includes(match[1])) numbers.push(match[1]);
                /*let newMiddle = "";
                let open = 0;
                for (let i = 0; i < boundaries.sections.middle.length; i++) {
                    if (boundaries.sections.middle[i] == "[" && boundaries.sections.middle[i-1] != "\\") open++;
                    if (boundaries.sections.middle[i] == "]" && boundaries.sections.middle[i-1] != "\\") open--;
                    if (boundaries.sections.middle[i] == "|") {
                        if (open == 0) newMiddle += "<\\>|";
                        else newMiddle += "|";
                    } else newMiddle += boundaries.sections.middle[i];
                }*/
                input = boundaries.sections.pre + "<\\>[" + boundaries.sections.middle.replace(/([\[\]\|])/g, "<\\>$1") + "<\\>]" + boundaries.sections.post;
            }
        }
        let output = "";
        // let match = input.match(/^(.*?[^\\])\[(.*?[^\\])\](.*)$/ms);
        while (matchOpenBracket(" "+input)) {
            input = " "+input;
            let boundaries = locateBoundaries(input);
            if (boundaries) {
                output += boundaries.sections.pre.slice(1);
                let middle = run(boundaries.sections.middle, true).output;
                let fragments = calculateFragments(middle);
                output += executeFragments(fragments);
                input = boundaries.sections.post;
            } else {
                throw new Error("locateBoundaries or matchOpenBracket is broken - expected boundaries, got none");
            }
        }
        output += input;
        if (!inner) { // Clean up <\>[n#]
            numbers.sort((a, b) => parseInt(a) - parseInt(b));
            for (let n of numbers) { // <\>[n#
                let regex = new RegExp("<\\\\>\\["+n+"#", "ms");
                while (match = output.match(regex)) {
                    let boundaries = locateBoundaries(output, match.index+3);
                    output = boundaries.sections.pre.slice(0, -3) + "[" + boundaries.sections.middle.slice(1+n.length).replace(/<\\>/g, "") + "]" + boundaries.sections.post;
                }
            }
            if (numbers.length) output = run(output).output;
        }
        return {open: 0, output: output.slice(1)};
    }

    /*

        r"\[none\|(.*?(?<!\\)(?<!\<\\\>))\]",
        r"\[entries(\|.*?)?(?<!\\)(?<!\<\\\>)\]",
        r"\[(aes|small|fancy|circles|jank|old|lines|squares)\|(.*?)(?<!\\)(?<!\<\\\>)\]",
        r"\[and(\|.*?)?(?<!\\)(?<!\<\\\>)\]",
        r"\[i(nline)?if?\|(.*?(?<!\\)(?<!\<\\\>))\|(.*?(?<!\\)(?<!\<\\\>))\|(.*?(?<!\\)(?<!\<\\\>))\]",
        r"\[chunk\|([0-9]+|[0-9]+:-?[0-9]+|[0-9]+:|:-?[0-9]+)(\|.*?)?(?<!\\)(?<!\<\\\>)\]",*/

    return {functions, run};
})();