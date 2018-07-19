Map.prototype.toObject = function() {
    let array = [...this];
    let object = {};
    array.forEach(i => object[i[0]] = i[1]);
    return object;
}

module.exports = {
    // Log a message to console with a prefix
    log: function(text, severity) {
        let prefixes = {"error": "[#]", "warning": "[!]", "info": "[.]", "spam": "[ ]", "unknown": "[?]", "responseInfo": "( )", "responseError": "(!)"}; // Names and types of logging
        text = module.exports.stringify(text, true);
        let prefix = (prefixes[severity] || prefixes.unknown)+" ["+module.exports.getSixTime()+"] ";
        text = text.replace(/\n/g, "\n"+prefix.replace(/([[(]).([\])])/, "$1^$2")); // Deal with newlines (prefix each line)
        console.log(prefix+text);
    },
    // Given a time, return "HHMMSS"
    getSixTime: function(when, seperator) {
        let d = new Date(when || Date.now());
        if (!seperator) seperator = "";
        return d.getHours().toString().padStart(2, "0")+seperator+d.getMinutes().toString().padStart(2, "0")+seperator+d.getSeconds().toString().padStart(2, "0");
    },
    // Prepend the appropriate indefinite article to a string.
    indefArtify(string, plural) {
        if (plural) {
            return "some "+string;
        } else {
            if (string.match(/^[aeiou]/)) {
                return "an "+string;
            } else {
                return "a "+string;
            }
        }
    },
    // Get specific arguments from a string.
    sarg: function(input, count, char) {
        if (!char) char = " "; // Split at spaces unless told otherwise
        input = module.exports.stringify(input);
        if (typeof(count) == "number") { // Given a number? Just .split
            return input.split(char)[count];
        } else if (typeof(count) == "string") { // Given a string? Treat - as an extender
            if (count.charAt(0) == "-") { // If it starts with -
                return input.split(char).slice(parseInt(count.slice(1))).join(char); // Select everything before
            } else { // (If it ends with -)
                return input.split(char).slice(parseInt(count.split("-")[0])).join(char); // Select everything after
            }
        }
    },
    // Convert any object (well, not yet) to a string for logging, sending, etc.
    stringify: function(input, longJSON) {
        if (typeof(input) == "number") return input.toString();
        if (typeof(input) == "boolean") return input.toString();
        if (!input) return "undefined";
        if (typeof(input) == "object") {
            if (input.constructor.name.includes("Error") && input.stack) {
                return input.stack;
            } else {
                if (longJSON) return JSON.stringify(input, null, 4);
                else return JSON.stringify(input);
            }
        }
        if (typeof(input) == "string") return input;
        if (typeof(input) == "function") return "(Function)";
        return "unknown";
    },
    // Get a random number between two inputs. Includes maximum value.
    rint: function(min, max) {
        return Math.floor(Math.random()*(max-min+1)+min);
    },
    // The better command argument function.
    carg: function(input, prefix, split, altSplit, name) {
        if (!split) split = " ";
        if (!altSplit) altSplit = ";";
        let output = {prefix: prefix, split: split, altSplit: altSplit, name: name};
        output.input = input;
        output.words = input.replace(split, "\n").split("\n");
        output.regularWords = output.words.filter(i => !i.match(/^[+-][a-z]/i) && !i.match(/\w=[^\s]/));
        output.nonNumbers = output.regularWords.filter(i => parseFloat(i) != i);
        output.altWords = output.regularWords.join(split).split(altSplit).map(i => module.exports.trim(i, split));
        output.numbers = output.regularWords.filter(i => parseFloat(i) == i);
        output.flags = {on: output.words.filter(i => i.match(/^\+[a-z]/i)).map(i => i.slice(1)), off: output.words.filter(i => i.match(/^-[a-z]/i)).map(i => i.slice(1))};
        output.switches = {};
        output.words.filter(i => i.match(/\w=[^\s]/)).forEach(i => output.switches[module.exports.trim(i).split("=")[0]] = module.exports.trim(i).split("=")[1]);
        return output;
    },
    // Return a random element from a supplied array.
    rarray: function(array) {
        return array[module.exports.rint(0, array.length-1)];
    },
    // Convert an array of strings to a humanised list.
    listify: function(array, empty, surround) {
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
            return array[0]+", "+module.exports.listify(array.slice(1)); // For arrays with more than 2 items, recurse.
        }
    },
    // Map a value from a range to a different range
    map: function(value, inMin, inMax, outMin, outMax) {
        return (value-inMin) * (outMax-outMin) / (inMax-inMin) + outMin;
    },
    // Trim leading and trailing spaces (or another character) from a string.
    trim: function(string, remove) {
        if (!remove) remove = " ";
        return string.replace(new RegExp(`^${remove}+|${remove}+$`, "g"), "");
    },
    // Check if one object has all the same immediate properties as another.
    slimMatch: function(objects) {
        let result = Object.keys(objects[0]).every(p => objects[0][p]==objects[1][p]);
        if (!result) {
            return false;
        } else if (objects.length <= 2) {
            return true;
        } else {
            return module.exports.slimMatch(objects.slice(1));;
        }
    },
    // Change an English word to its plural form (or not)
    plural: function(word, number) {
        var plurals = {
            is: "are", foot: "feet", person: "people", werewolf: "werewolves", wolf: "wolves"
        };
        if (number != 1) {
            if (plurals[word] != undefined) {
                word = plurals[word];
            } else {
                if (word.endsWith("s") || word.endsWith("ch")) {
                    word += "es";
                } else {
                    word += "s";
                }
            }
        }
        return word;
    },
    // Capitalise the first letter of a sentence
    capitalise: function(string, lowerOthers, everyWord) {
        if (everyWord) {
            string = string.split(" ").map(s => module.exports.capitalise(s, lowerOthers)).join(" ");
        } else {
            if (lowerOthers) {
                string = string.toLowerCase();
            }
            string = string.charAt(0).toUpperCase()+string.slice(1);
        }
        return string;
    },
    // Get a XX:XX:XX formatted string from a Date object (UTC time).
    getReadableTime: function(date, detail, ampm) {
        let result;
        if (ampm) {
            result = (date.getUTCHours()%12 || 12).toString()+":"+date.getUTCMinutes().toString().padStart(2, "0")+":"+date.getUTCSeconds().toString().padStart(2, "0");
        } else {
            result = date.getUTCHours().toString()+":"+date.getUTCMinutes().toString().padStart(2, "0")+":"+date.getUTCSeconds().toString().padStart(2, "0");
        }
        if (detail) {
            result = result.split(":").slice(0, detail).join(":");
        }
        if (ampm) result += " "+(date.getUTCHours() < 12 ? "AM" : "PM");
        return result;
    },
    // Output a 2D array as an aligned table.
    /* Input in the format
     * ( [ ["Row 1", "Row 2", "Row 3"],
     *     ["Answer 1", "Answer 2", "Answer 3"] ],
     *   ["left", "right"] ) */
    tableify: function(columns, align) {
        for (let i = 0; i < columns.length; i++) { // Convert all entries to strings
            for (let j = 0; j < columns[0].length; j++) {
                if (typeof(columns[i][j]) == "undefined") {
                    columns[i][j] = "undefined";
                } else {
                    columns[i][j] = columns[i][j].toString();
                }
            }
        }
        if (!align) align = []; // undefined align defaults to left
        let output = []; // A place to put output
        for (let c = 0; c < columns.length; c++) { // Loop over all columns
            let temp = []; // A place to put one column
            let length = 0; // Longest string so far
            for (let i of columns[c]) if (i.length > length) length = i.length; // Fill in length
            for (let i of columns[c]) { // Add input to temp
                if (align[c] == "left") {
                    temp.push(i.padEnd(length, " "));
                } else {
                    temp.push(i.padStart(length, " "));
                }
            }
            output.push(temp); // Add temp to output
        }
        let outputString = ""; // What will be returned
        for (let i = 0; i < output[0].length; i++) { // Loop over all rows
            for (let j = 0; j < output.length; j++) { // Loop over row items
                outputString += output[j][i]; // Append to outputString
                if (j < output.length-1) outputString += "  "; // Space-pad columns
            }
            if (i < output[0].length-1) outputString += "\n"; // Seperate rows with a newline
        }
        return outputString;
    },
    iterateObject: function(object, iterator) {
        for (let key in Object.keys(object)) {
            iterator(key, object[key]);
        }
    },
    o2a: function(object, includeKeys) {
        if (includeKeys) return Object.keys(object).map(key => ({key, item: object[key]}));
        else return Object.keys(object).map(key => object[key]);
    },
    mergeObjects: function(objArr) { // Stolen from StackOverflow: https://stackoverflow.com/a/383245
        if (objArr.length >= 3) {
            objArr = [objArr[0], module.exports.mergeObjects(objArr.slice(1))];
        }
        let obj1 = objArr[0];
        let obj2 = objArr[1];
        for (var p in obj2) {
            try {
                if (obj2[p].constructor == Object) {
                    obj1[p] = module.exports.mergeObjects([obj1[p], obj2[p]]);
                } else {
                    obj1[p] = obj2[p];
                }
            } catch (e) {
                obj1[p] = obj2[p];
            }
        }
        return obj1;
    },
    numberToFullwidth: function(number) {
        if (number.toString().length > 1) {
            return number.toString().split("").map(n => module.exports.numberToFullwidth(n)).join("");
        } else {
            const fullwidth = ["𝟢", "𝟣", "𝟤", "𝟥", "𝟦", "𝟧", "𝟨", "𝟩", "𝟪", "𝟫"];
            return fullwidth[number];
        }
    },
    argsToArray: function(input) {
        let args = [];
        Object.values(input).forEach(v => {
            args.push(v);
        });
        return args;
    }
}
