const tileSize = 32;
const level = {
    tiles: [
    ],
    signs: Array(20).fill("")
};
const imagesDir = "/rtw-edit/images";
let TH; // variable referencing

q("#loading").parentElement.removeChild(q("#loading"));

function posToSize(position) {
    return position.map(v => v*tileSize);
}
function sizeToPos(position) {
    return position.map(v => v/tileSize);
}
function coordinatesWithin(p1, p2, p3) {
    return (
           p1[0] <= p3[0]
        && p2[0] >= p3[0]
        && p1[1] <= p3[1]
        && p2[1] >= p3[1]
    );
}
Array.prototype.equal = function(array) {
    if (this.length != array.length) return false;
    for (let i = 0; i < this.length; i++) {
        if (this[i] != array[i]) return false;
    }
    return true;
}
Array.prototype.direction = function(array, invert) {
    if (!invert) invert = false;
    let hchange = array[0]-this[0];
    let vchange = array[1]-this[1];
    if (Math.abs(hchange) > Math.abs(vchange)) {
        if ((hchange > 0) ^ invert) return [[1, 0], "right"];
        else return [[-1, 0], "left"];
    } else {
        if ((vchange > 0) ^ invert) return [[0, 1], "down"];
        else return [[0, -1], "up"];
    }
}
Array.prototype.sortV = function() {
    return this.sort((a,b) => (a-b));
}

let theme = "wood";
Object.entries(config.tiles).forEach(e => {
    e[1].name = e[0];
    e[1].image = imagesDir+"/"+e[1].image.replace("$theme$", theme);
});
let images = {};
let categories = {};
Object.values(config.tiles).forEach(t => {
    images[t.image] = {source: t.image};
});
for (let path of [imagesDir+"/symbols/pencil.png", imagesDir+"/symbols/block.png", imagesDir+"/symbols/path.png", imagesDir+"/symbols/move.png", imagesDir+"/symbols/question.png"]) {
    images[path] = {source: path};
}
config.categories.forEach(c => {
    categories[c] = Object.values(config.tiles).filter(t => t.categories.includes(c));
});
let imagesLoaded = false;

function loadImages(progressCallback) {
    let completed = 0;
    let total = Object.keys(images).length;
    return Promise.all(Object.keys(images).map(k => {
        return new Promise(resolve => {
            images[k].img = new Image();
            images[k].img.onload = () => {
                completed++;
                progressCallback(completed, total);
                resolve();
            }
            images[k].img.onerror = () => {
                function manual() {
                    window.location = "/crumpet/configure";
                }
                request("/api/rtw/config", response => {
                    if (response.status != 200) manual();
                    else try {
                        let data = JSON.parse(response.responseText);
                        if (Object.keys(data).length) {
                            manual();
                        } else {
                            request("/api/rtw/config", response => {
                                if (response.status == 204) {
                                    window.location = "/crumpet/autoconfigure?firstrun";
                                } else {
                                    manual();
                                }
                            }, {autoAttempted: true});
                        }
                    } catch (e) {
                        manual();
                    }
                });
            }
            images[k].img.src = images[k].source;
        });
    }));
}

function getCurrentSignIndex() {
    let value = q("#iCurrentSign").value;
    let currentSign = +value;
    if (currentSign >= 1 && currentSign <= 20) {
        return currentSign-1;
    } else {
        return null;
    }
}

function loadCurrentSign() {
    let currentSign = getCurrentSignIndex();
    if (currentSign !== null) {
        q("#iSignText").currentSign = currentSign;
        q("#iSignText").value = level.signs[currentSign];
    }
}

function registerHexTile(hex, layer) {
    // Create data
    const hexString = hex.toString(16).padStart(4, "0")
    const name = "Hex " + hexString
    tile = {
        name,
        image: imagesDir + "/symbols/question.png",
        categories: ["Metatiles"],
        layer,
        hex,
        drawHex: hexString
    }
    // do maintenance
    config.tiles[name] = tile
    categories["Metatiles"].push(tile)
    new TileSelector(TH, tile)
    return tile
}

let canvas = q("canvas");
let {width, height} = canvas.getBoundingClientRect();
canvas.width = width;
canvas.height = height;
let ctx = canvas.getContext("2d");

class BetterCanvas {
    constructor(ctx) {
        let canvas = ctx.canvas;
        Object.assign(this, {ctx, canvas});
        /*this.canvas.addEventListener("mousedown", event => {
            this.fillText(event.clientX+","+event.clientY, [event.clientX, event.clientY], "#f00", "20px Noto Sans");
        });*/
        this.canvas.oncontextmenu = event => {
            return false;
        }
        window.addEventListener("resize", event => {
            let {width, height} = canvas.getBoundingClientRect();
            canvas.width = width;
            canvas.height = height;
            for (let o of C.objects) {
                if (o.resize) o.resize();
            }
            this.ctx.lineWidth = 2;
            this.draw();
        });
        this.objects = [];
        this.ctx.lineWidth = 2;
    }
    clear() {
        this.drawRectCoords([0, 0], [this.canvas.width, this.canvas.height], 1, "#000");
    }
    drawRectCoords(pos1, pos2, fill, colour) {
        this.drawRectSize(pos1, pos2.map((v, i) => (v-pos1[i])), fill, colour);
    }
    drawRectSize([x, y], size, fill, colour) {
        if (typeof(size) == "number") size = [size, size];
        if (fill) {
            if (colour) this.ctx.fillStyle = colour;
            this.ctx.fillRect(x, y, ...size);
        } else {
            if (colour) this.ctx.strokeStyle = colour;
            this.ctx.strokeRect(x, y, ...size);
        }
    }
    drawImage([x, y], size, imageName) {
        let image = images[imageName].img;
        if (!image || !image.complete) return;
        if (typeof(size) == "number") size = [size, size];
        this.ctx.drawImage(image, x, y, ...size);
    }
    fillText(text, [x, y], colour, font) {
        if (colour) this.ctx.fillStyle = colour;
        if (font) this.ctx.font = font;
        this.ctx.fillText(text, x, y);
    }
    draw() {
        this.clear();
        this.objects.forEach(o => {
            o.draw();
        });
    }
}

class World {
    constructor(C, size) {
        Object.assign(this, {C, size});
        C.objects.push(this);
        this.tiles = [];
        this.tempTiles = [];
        this.undo = [];
        this.zoom = 1;
        this.scroll = [0, 0];
        this.mm = [0, 0];
        this.selections = {left: config.tiles["Floor"], right: config.tiles["Empty tile"]};
        this.drawStyle = "pencil";
        this.heldTile = null;
        this.markedTiles = [];
        this.lastButtons = 0;
        this.lastEvent = null;
        this.lastClickObject = undefined;
        this.C.canvas.addEventListener("wheel", event => {
            let deltaY = Math.sign(event.deltaY) * 53;
            if (event.ctrlKey) {
                let posBefore = this.worldToPos([event.clientX, event.clientY]);
                if (deltaY > 0) {
                    this.zoom = this.zoom*0.9;
                } else if (deltaY < 0) {
                    this.zoom = this.zoom*(1/0.9);
                }
                let posAfter = this.worldToPos([event.clientX, event.clientY]);
                for (let i of [0, 1]) this.scroll[i] += (posBefore[i]-posAfter[i])*this.zoom;
            } else if (event.shiftKey) {
                this.scroll[0] += deltaY;
            } else {
                this.scroll[1] += deltaY;
            }
            event.preventDefault();
            this.C.draw();
        });
        ["mousedown", "mousemove", "mouseup"].forEach(e => this.C.canvas.addEventListener(e, event => this.handleMouseEvent(e, event)));
        document.addEventListener("keydown", event => {
            if (event.target.tagName != "INPUT" && event.target.tagName != "TEXTAREA") {
                if (event.ctrlKey && event.key == "s") {
                    let saveToast = q("#saveToast");
                    saveToast.innerText = "Saving...";
                    saveToast.setAttribute("data-state", "saving");
                    saveToast.classList.add("toast-pop");
                    this.save(true, result => {
                        if (!result) {
                            saveToast.innerText = "Save complete!";
                            saveToast.setAttribute("data-state", "complete");
                            setTimeout(() => {
                                saveToast.classList.remove("toast-pop");
                            }, 600);
                        } else {
                            saveToast.innerText = "Save failed.";
                            saveToast.setAttribute("data-state", "failed");
                            setTimeout(() => {
                                saveToast.classList.remove("toast-pop");
                            }, 2400);
                        }
                    });
                    event.preventDefault();
                } else if (event.ctrlKey && event.key == "z") {
                    if (this.undo.length) {
                        this.tiles = [...this.undo.pop()];
                        this.C.draw();
                    }
                }
            }
        });
        document.addEventListener("keypress", event => {
            if (event.target.tagName != "INPUT" && event.target.tagName != "TEXTAREA") {
                if (event.key == "a") {
                    this.drawStyle = "pencil";
                    this.C.draw();
                } else if (event.key == "s" || event.key == "b") {
                    this.drawStyle = "block";
                    this.C.draw();
                } else if (event.key == "d") {
                    this.drawStyle = "move";
                    this.C.draw();
                } else if (event.key == "f") {
                    this.drawStyle = "path";
                    this.C.draw();
                } else if (event.key == "0") {
                    this.zoom = 1;
                    this.scroll = [0, 0];
                    this.C.draw();
                }
            }
        });
        q("#iCurrentSign").addEventListener("input", () => loadCurrentSign())
        q("#iSignText").addEventListener("input", event => {
            let currentSign = getCurrentSignIndex();
            if (currentSign !== null) {
                level.signs[currentSign] = event.currentTarget.value;
            }
        });
        q("#iMetatileCreator").addEventListener("keypress", event => {
            const self = event.target
            if (event.key !== "Enter") return
            if (!self.value.match(/^[0-9a-fA-F]{4}$/)) return
            const littleEndian = self.value.toLowerCase()
            const bigEndian = littleEndian.slice(2) + littleEndian.slice(0, 2)
            const hex = parseInt(bigEndian, 16)
            registerHexTile(hex, 0)
            self.value = ""
            TH.W.C.draw() // redraw canvas to show new item in tile selector
        })

        loadCurrentSign();
    }
    handleMouseEvent(type, event) {
        this.lastEvent = event;
        let object;
        let objects = this.C.objects.filter(o =>
               o.position1
            && o.position2
            && coordinatesWithin(o.position1, o.position2, [event.clientX, event.clientY])
        );
        if (!object) object = objects.find(o => o.constructor.name == "TileMenu");
        if (!object) object = objects.slice(-1)[0];
        let coords = object && [event.clientX-object.position1[0], event.clientY-object.position1[1]];
        switch (event.type) {
        case "mousedown":
            this.lastButtons = event.buttons;
            if (object) {
                this.lastClickObject = object;
                if (object.click) object.click("mousedown", coords, event);
            } else {
                if ((event.buttons == 1 && this.drawStyle == "block") || event.buttons == 3 || event.buttons == 4) {
                    this.mm = sizeToPos(this.worldToPos([event.clientX, event.clientY])).map(v => Math.floor(v));
                } else if (this.drawStyle == "pencil") {
                    if (event.buttons == 1) {
                        this.createTileAtCursor(event, this.selections.left);
                    } else if (event.buttons == 2) {
                        this.createTileAtCursor(event, this.selections.right);
                    }
                } else if (this.drawStyle == "move") {
                    let pos = sizeToPos(this.worldToPos([event.clientX, event.clientY])).map(v => Math.floor(v));
                    let index = this.tiles.map((t, i) => ({t, i})).filter(o => o.t.position.equal(pos)).sort((a, b) => (b.t.tile.layer - a.t.tile.layer))[0].i;
                    if (index >= 0) {
                        this.heldTile = this.tiles[index];
                        this.tiles.splice(index, 1);
                        this.C.draw();
                    }
                } else if (this.drawStyle == "path") {
                    this.markedTiles.length = [];
                } else if (this.drawStyle == "block") {
                    this.lastButtons = 0;
                }
            }
            break;
        case "mousemove":
            if (object) {
                if (object.click) object.click("mousemove", coords, event);
            } else {
                if (this.drawStyle == "pencil" || this.drawStyle == "block") {
                    let pos = sizeToPos(this.worldToPos([event.clientX, event.clientY]));
                    let distanceToEdge = pos.map(v => v-Math.floor(v)).sortV()[0];
                    let posFloor = pos = pos.map(v => Math.floor(v));
                    if (distanceToEdge > 0.5) distanceToEdge = 1-distanceToEdge;
                    if (this.lastButtons == 4 || this.lastButtons == 3 || (this.lastButtons == 1 && this.drawStyle == "block")) {
                        this.tempTiles.length = 0;
                        let p1 = [[this.mm[0], posFloor[0]].sortV()[0], [this.mm[1], posFloor[1]].sortV()[0]];
                        let p2 = [[this.mm[0], posFloor[0]].sortV()[1], [this.mm[1], posFloor[1]].sortV()[1]];
                        for (let i = p1[0]; i <= p2[0]; i++) {
                            for (let j = p1[1]; j <= p2[1]; j++) {
                                this.tempTiles.push(new Tile(this, [i, j], this.selections.left, true));
                            }
                        }
                        C.draw();
                    } else if (this.lastButtons == 1) {
                        if (distanceToEdge > 0.1) this.createTileAtCursor(event, this.selections.left);
                    } else if (this.lastButtons == 2) {
                        if (distanceToEdge > 0.1) this.createTileAtCursor(event, this.selections.right);
                    }
                } else if (this.drawStyle == "path") {
                    if (this.lastButtons) {
                        let pos = sizeToPos(this.worldToPos([event.clientX, event.clientY])).map(v => Math.floor(v));
                        if (!this.markedTiles.some(m => m.equal(pos))) this.markedTiles.push(pos);
                        let image;
                        if (this.selections.left.name.startsWith("Conveyor")) {
                            image = config.tiles["Conveyor D 1"].image;
                        } else {
                            image = config.tiles["Ice centre"].image;
                        }
                        this.C.drawImage(this.posToWorld(pos.map(v => v*tileSize)), 32*this.zoom, image);
                    }
                }
            }
            break;
        case "mouseup":
            if (object) {
                if (object.click) object.click("mouseup", coords, event);
            } else {
                if (this.drawStyle == "pencil" || this.drawStyle == "block") {
                    if (this.lastButtons == 4 || this.lastButtons == 3 || (this.lastButtons && this.drawStyle == "block")) {
                        if (this.tempTiles.length) {
                            this.createUndoState();
                            this.tempTiles.forEach(tile => {
                                new Tile(this, tile.position, tile.tile);
                            });
                            this.tempTiles.length = 0;
                        } else if (this.lastButtons == 4 || this.lastButtons == 3) {
                            let pos = sizeToPos(this.worldToPos([event.clientX, event.clientY])).map(v => Math.floor(v));
                            let targetTile = this.tiles.filter(t => t.position.equal(pos)).sort((a, b) => (b.tile.layer - a.tile.layer))[0];
                            let newTile;
                            if (targetTile) {
                                newTile = targetTile.tile;
                            } else {
                                newTile = config.tiles["Empty tile"];
                            }
                            if (newTile) {
                                if (this.selections.right == newTile) {
                                    this.selections.right = this.selections.left;
                                }
                                this.selections.left = newTile;
                            }
                        }
                        this.C.draw();
                    }
                } else if (this.drawStyle == "move") {
                    if (this.heldTile) {
                        this.createTileAtCursor(event, this.heldTile.tile);
                        this.C.draw();
                        this.heldTile = null;
                    }
                } else if (this.drawStyle == "path") {
                    if (this.markedTiles.length) {
                        for (let i = 0; i < this.markedTiles.length; i++) {
                            if (this.selections.left.name.startsWith("Conveyor")) {
                                let type = this.selections.left.name.match(/\d/)[0];
                                let tile = config.tiles["Conveyor D "+type];
                                let j = i == this.markedTiles.length-1 ? i-1 : i;
                                let d = this.markedTiles[j].direction(this.markedTiles[j+1], false);
                                tile = config.tiles["Conveyor "+d[1][0].toUpperCase()+" "+type];
                                new Tile(this, this.markedTiles[i], tile);
                            } else {
                                let tile = config.tiles["Ice centre"];
                                if (i >= 1 && i < this.markedTiles.length-1) {
                                    let d = [
                                        this.markedTiles[i-1].direction(this.markedTiles[i], true),
                                        this.markedTiles[i].direction(this.markedTiles[i+1], false)
                                    ];
                                    tile = config.tiles["Ice "+(d[0][1][0]+d[1][1][0]).toUpperCase()] || config.tiles["Ice "+(d[1][1][0]+d[0][1][0]).toUpperCase()] || config.tiles["Ice centre"];
                                }
                                new Tile(this, this.markedTiles[i], tile);
                            }
                        }
                        this.markedTiles = [];
                    }
                    this.C.draw();
                }
            }
            this.lastButtons = 0;
            break;
        }
        if (this.heldTile) {
            this.C.draw();
            let offset = 16;
            if (this.heldTile.tile.layer == 0) {
                this.C.drawRectSize([event.clientX-15, event.clientY-15], 32, 1, "rgba(30, 30, 30, 0.6)");
                offset = 18;
            }
            this.C.drawImage([event.clientX-offset, event.clientY-offset], 32, this.heldTile.tile.image || this.heldTile.tile.tile.image);
        }
    }
    createUndoState() {
        this.undo.push([...this.tiles]);
    }
    draw() {
        let drawableTiles = this.tiles
        .filter(t => !this.tempTiles.find(tt => tt.position.equal(t.position) && tt.tile.layer == t.tile.layer))
        .concat(this.tempTiles)
        .sort((a,b) => (a.tile.layer-b.tile.layer))
        .forEach(t => t.draw());
    }
    posToWorld(position) {
        return position.map((v, i) => (v*this.zoom-this.scroll[i]));
    }
    worldToPos(position) {
        return position.map((v, i) => ((v+this.scroll[i])/this.zoom));
    }
    eraseLevel() {
        this.tiles.length = 0;
    }
    loadLevel(level) {
        level.tiles.forEach(t => {
            let tile = new Tile(this, t.position, t.tile);
        });
    }
    createTileAtCursor(event, tile) {
        let pos = sizeToPos(this.worldToPos([event.clientX, event.clientY])).map(v => Math.floor(v));
        if (this.tiles.find(t => t.position.equal(pos) && t.tile.name == tile.name)) return false;
        this.undo.push([...this.tiles]);
        while (config.undoBufferMaxSize && this.undo.length > config.undoBufferMaxSize) this.undo.shift();
        new Tile(this, pos, tile);
        this.C.draw();
        return true;
    }
    removeTilesAt([x, y], layer) {
        let index;
        while ((index = this.tiles.findIndex(e => e.position[0] == x && e.position[1] == y && e.tile.layer == layer)) >= 0) {
            this.tiles.splice(index, 1);
        }
    }
    getEdges() {
        if (!this.tiles.length) return [[0, 0, 0, 0], 0, 0];
        let edges = [].concat(this.tiles[0].position, this.tiles[0].position);
        for (let tile of this.tiles) {
            if (tile.position[0] < edges[0]) edges[0] = tile.position[0];
            if (tile.position[0] > edges[2]) edges[2] = tile.position[0];
            if (tile.position[1] < edges[1]) edges[1] = tile.position[1];
            if (tile.position[1] > edges[3]) edges[3] = tile.position[1];
            //if (!layers.includes(tile.tile.layer)) layers.push(tile.tile.layer);
        }
        let result = [edges, edges[2]-edges[0]+1, edges[3]-edges[1]+1];
        return result;
    }
    load(data) {
        this.tiles.length = 0;
        let pointer = 0;
        function readInt() {
            let int = 0;
            for (let i = 3; i >= 0; i--) {
                int = int << 8;
                int += data[pointer+i];
            }
            pointer += 4;
            return int;
        }
        function readString() {
            let length = readInt();
            let string = String.fromCharCode(...data.slice(pointer, pointer+length));
            pointer += length;
            return string;
        }
        // Header
        readString();
        // Filename
        q("#iFilename").value = readString();
        // Random 4 bytes
        readInt();
        // Level name
        q("#iLevelName").value = readString();
        // Custom content
        for (let type of ["Houses", "Models", "Textures", "Background"]) {
            let exists = readInt();
            let string = readString();
            q("#i"+type).value = string;
        }
        // Timer
        q("#iTimer").value = readInt();
        // Style
        q("#iStyle").value = readInt();
        // Background
        q("#iBackground").value = readInt();
        // Dimensions
        let width = readInt();
        let height = readInt();
        let hashMap = new Map();
        // All tiles in all layers
        for (let layer = 0; layer <= 1; layer++) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let hex = readInt();
                    if (hex) {
                        // Check cache
                        let tile = hashMap.get(hex);
                        if (!tile) {
                            // Load tile by searching
                            tile = Object.values(config.tiles).find(t => t.hex == hex);
                            if (!tile) {
                                // This tile does not exist; add custom hex tile
                                tile = registerHexTile(hex, layer)
                            }
                            hashMap.set(hex, tile);
                        }
                        if (tile) {
                            new Tile(this, [x, y], tile);
                        }
                    }
                }
            }
        }
        // Signs
        for (let sign = 0; sign < 20; sign++) {
            let lines = readString().split("#");
            lines = lines.slice(0, 4);
            lines = lines.map(l => l.trim());
            level.signs[sign] = lines.join("\n").trim();
        }
        loadCurrentSign();
        // Music
        q("#iMusic").value = readInt();
        this.C.draw();
        q("#settings").style.display = "none";
    }
    save(server, callback) {
        if (!callback) callback = new Function();
        let array = [];
        function pushInt(int) {
            for (let i = 0; i < 4; i++) { // 4 bytes in an int
                array.push(int & 0xff); // send lowest byte to fragments
                int = int >> 8; // shift right, so we'll deal with a larger part next
            }
        }
        function pushString(string) {
            pushInt(string.length);
            for (let i = 0; i < string.length; i++) array.push(string[i].charCodeAt(0));
        }
        // Header
        pushString("Stinky & Loof Level File v6");
        // Filename
        let filename = q("#iFilename").value.toUpperCase() || "CCEXPORT";
        pushString(filename);
        // Random 4 bytes
        for (let i = 0; i < 4; i++) array.push(Math.floor(Math.random()*256));
        // Level name
        let levelName = q("#iLevelName").value || "Level";
        pushString(levelName);
        // Custom content
        for (let type of ["Houses", "Models", "Textures", "Background"]) {
            let value = q("#i"+type).value;
            pushInt(0); // Unknown purpose?
            pushString(value); // String
        }
        // Timer
        pushInt(parseInt(q("#iTimer").value) || 300);
        // Style
        pushInt(parseInt(q("#iStyle").value) || 0);
        // Background
        pushInt(parseInt(q("#iBackground").value) || 0);
        // Organise tiles
        //let layers = [];
        let [edges, width, height] = this.getEdges();
        // Width and height
        pushInt(width);
        pushInt(height);
        // Take each layer in turn
        //for (let layer of layers) {
        for (let layer = 0; layer <= 1; layer++) {
            let tilesInLayer = this.tiles.filter(t => t.tile.layer == layer);
            for (let y = edges[1]; y <= edges[3]; y++) {
                for (let x = edges[0]; x <= edges[2]; x++) {
                    let tile = tilesInLayer.find(t => t.position.equal([x, y]));
                    if (tile) pushInt(tile.tile.hex);
                    else pushInt(0);
                }
            }
        }
        // Signs
        for (let sign = 0; sign < 20; sign++) {
            let lines = level.signs[sign].split("\n");
            lines = lines.slice(0, 4);
            lines = lines.map(l => l.trim().slice(0, 50));
            let content = lines.join("#").trim();
            pushString(content);
        }
        // Music
        let music = parseInt(q("#iMusic").value) || 1;
        pushInt(music);
        if (server) {
            // Write to file
            request("/api/rtw/download", response => {
                if (response.status == 204) {
                    callback(null);
                } else {
                    callback(response.responseText);
                }
            }, {filename: filename+".LV6", data: array});
        } else {
            return array;
        }
    }
}

class Tile {
    constructor(W, position, tile, dontAdd) {
        Object.assign(this, {W, position, tile});
        if (!dontAdd) {
            this.W.removeTilesAt(this.position, this.tile.layer);
            if (!this.tile.delete) this.W.tiles.push(this);
        }
    }
    posToSize() {
        return this.position.map(v => v*tileSize);
    }
    pos2ToSize() {
        return this.position.map(v => (v+1)*tileSize);
    }
    draw() {
        let size = tileSize*this.W.zoom;
        if (images[this.tile.image]) W.C.drawImage(W.posToWorld(this.posToSize()), tileSize*W.zoom, this.tile.image);
        else W.C.drawRectSize(W.posToWorld(this.posToSize()), tileSize*W.zoom, true, this.tile.image);
        if (this.tile.drawHex) {
            const textSize = Math.floor(10.5 * this.W.zoom)
            const textPos = W.posToWorld(this.posToSize())
            textPos[0] += size*20/32
            textPos[1] += size*23/32
            // draw second byte first due to little-endian convention
            this.W.C.fillText(this.tile.drawHex.slice(2), textPos, "#000", textSize+"px Noto Sans")
            textPos[1] += size*9/32
            this.W.C.fillText(this.tile.drawHex.slice(0, 2), textPos, "#000", textSize+"px Noto Sans")
        }
    }
}

class TileHolder {
    constructor(W) {
        Object.assign(this, {W});
        this.resize();
        this.spacing = 4;
        this.border = 4;
        this.topMargin = 40;
        this.width = Math.floor((this.position2[0] - this.position1[0] - this.border*2) / (tileSize + this.spacing));
        this.W.C.objects.push(this);
        this.tiles = [];
        this.objects = [];
        this.category = "Common";
    }
    draw() {
        this.W.C.drawRectCoords(this.position1, this.position2, true, "skyblue");
        this.W.C.drawRectCoords(this.position1, this.position2, false, "#444");
        this.getTiles().forEach((tile, index) => {
            tile.draw(index);
        });
        this.objects.forEach(object => object.draw());
    }
    click(type, coords, event) {
        if (type == "mousedown") {
            let target = this.getTiles().map((tile, index) => ({t: tile, c: tile.indexToCoords(index)})).find(tc => coordinatesWithin(tc.c, tc.c.map(v => v+tileSize), coords));
            if (target) {
                let button = event.buttons == 2 ? "right" : "left";
                let otherButton = button == "left" ? "right" : "left";
                if (this.W.selections[otherButton] == target.t.tile) this.W.selections[otherButton] = this.W.selections[button];
                this.W.selections[button] = target.t.tile;
                if (this.category != "Recent") {
                    let index;
                    while ((index = categories.Recent.indexOf(target.t.tile)) != -1) categories.Recent.splice(index, 1);
                    categories.Recent.unshift(target.t.tile);
                }
                this.W.C.draw();
            }
        }
    }
    getTiles() {
        let result = categories[this.category].map(t => this.tiles.find(tt => tt.tile.name == t.name));
        return result;
    }
    resize() {
        this.position1 = [canvas.width-282, 110]
        this.position2 = [canvas.width-10, canvas.height - 8]
    }
}

class TileMenu {
    constructor(TH) {
        Object.assign(this, {TH});
        this.W = this.TH.W;
        //this.TH.objects.push(this);
        this.W.C.objects.push(this);
        this.lineHeight = this.TH.topMargin-this.TH.border;
        this.menuOpen = false;
        this.resize()
    }
    draw() {
        if (!this.menuOpen) {
            this.drawMenuItem(this.TH.category, 0);
        } else {
            Object.keys(categories).forEach((c,i) => this.drawMenuItem(c, i));
        }
    }
    drawMenuItem(item, index) {
        let offset = index*this.lineHeight;
        this.W.C.drawRectCoords([this.position1[0], this.position1[1]+offset], [this.position2[0], this.position1[1]+offset+this.lineHeight], 1, "#599bb6");
        //this.W.C.drawRectCoords([this.position1[0], this.position2[1]+offset], [this.position2[0], this.position2[1]+offset], 0, "#444");
        this.W.C.fillText(item, [this.TH.position1[0]+8, this.TH.position1[1]+32+offset], "#000", "30px Noto Sans");
    }
    click(type, coords, event) {
        if (type == "mousedown") {
            if (this.menuOpen) {
                this.menuOpen = false;
                this.position2 = this.closedPosition;
                let index = Math.floor(coords[1]/this.lineHeight);
                this.TH.category = Object.keys(categories)[index];
            } else {
                this.menuOpen = true;
                this.position2 = this.openPosition;
            }
            this.W.C.draw();
        }
    }
    resize() {
        this.position1 = this.TH.position1.map(v => v += this.TH.border);
        this.closedPosition = [this.TH.position2[0]-this.TH.border, this.TH.position1[1]+this.TH.topMargin];
        this.openPosition = [this.TH.position2[0]-this.TH.border, this.TH.position1[1]+Object.keys(categories).length*this.lineHeight];
        this.position2 = this.closedPosition;
    }
}

class TileSelector {
    constructor(TH, tile) {
        Object.assign(this, {TH, tile});
        this.W = this.TH.W;
        TH.tiles.push(this);
    }
    draw(index) {
        let position = this.indexToCoords(index, true);
        if (images[this.tile.image]) W.C.drawImage(position, tileSize, this.tile.image);
        else this.W.C.drawRectSize(position, tileSize, true, this.tile.image);
        if (this.W.selections.left == this.tile) {
            this.W.C.drawRectSize(position, tileSize, false, "#009");
        } else if (this.W.selections.right == this.tile) {
            this.W.C.drawRectSize(position, tileSize, false, "#900");
        }
        if (this.tile.drawHex) {
            const textSize = 10
            const textPos = position
            textPos[0] += 20
            textPos[1] += 23
            // draw second byte first due to little-endian convention
            this.W.C.fillText(this.tile.drawHex.slice(2), textPos, "#000", textSize+"px Noto Sans")
            textPos[1] += 9
            this.W.C.fillText(this.tile.drawHex.slice(0, 2), textPos, "#000", textSize+"px Noto Sans")
        }
    }
    indexToCoords(index, global) {
        let position = [(index%TH.width), Math.floor(index/TH.width)];
        position = position.map((v,i) => v*tileSize + position[i]*TH.spacing + TH.border);
        if (global) position = position.map((v,i) => v + TH.position1[i]);
        position[1] += TH.topMargin;
        return position;
    }
}

class Button {
    constructor(W, title, y1, y2, c1, c2) {
        Object.assign(this, {W, title, y1, y2, c1, c2});
        this.resize()
        this.spacing = 4;
        this.border = 4;
        this.W.C.objects.push(this);
    }
    draw() {
        this.W.C.drawRectCoords(this.position1, this.position2, true, this.c1);
        this.W.C.drawRectCoords(this.position1, this.position2, false, this.c2);
        this.W.C.fillText(this.title, [this.position1[0]+8, this.position1[1]+32], "#000", "30px Noto Sans");
    }
    resize() {
        this.position1 = [canvas.width-282, this.y1]
        this.position2 = [canvas.width-10, this.y2]
    }
}

class ElementToggle extends Button {
    constructor(W, title, element, y1, y2, c1, c2) {
        super(W, title, y1, y2, c1, c2);
        this.element = element;
        this.element.style.display = "none";
    }
    click(type, coords, event) {
        if (type == "mousedown") {
            if (this.element.style.display == "none") {
                this.element.style.display = "";
                if (this.show) this.show();
            } else {
                this.element.style.display = "none";
                if (this.hide) this.hide();
            }
        }
    }
}

class DrawMode extends Button {
    constructor(W, y1, y2) {
        super(W, "Mode", y1, y2, "#67c941", "#408425");
        this.vc = height => Math.floor((this.position1[1]+this.position2[1]+height)/2-height);
        this.buttons = [
            {
                image: imagesDir+"/symbols/pencil.png",
                mode: "pencil"
            },{
                image: imagesDir+"/symbols/block.png",
                mode: "block"
            },{
                image: imagesDir+"/symbols/move.png",
                mode: "move"
            },{
                image: imagesDir+"/symbols/path.png",
                mode: "path"
            }
        ];

        let old = this.draw;
        this.draw = (() => {
            old.call(this);
            this.buttons.forEach((button, index) => {
                let x = this.position2[0]-(34*(this.buttons.length-index))-5;
                this.W.C.drawImage([x, this.vc(32)], 32, button.image);
                if (button.mode == this.W.drawStyle) this.W.C.drawRectSize([x, this.vc(32)], 32, false, "#243e19");
            });
        });
    }
    click(type, coords, event) {
        if (type == "mousedown") {
            let buttonIndex = Math.floor(this.buttons.length-(this.position2[0]-this.position1[0]-coords[0]-7)/34);
            if (!this.buttons[buttonIndex]) return;
            this.W.drawStyle = this.buttons[buttonIndex].mode;
            this.W.C.draw();
        }
    }
}

class Settings extends ElementToggle {
    constructor(W, y1, y2) {
        super(W, "Settings", q("#settings"), y1, y2, "#e2adee", "#829");
    }
    show() {
        let [width, height] = this.W.getEdges().slice(1);
        q("#dimensions").innerHTML = `Width: ${width}, Height: ${height}`;
        if (width < 14 || height < 14) q("#dimensions").innerHTML += `<span class="dimensionWarning">Warning: must be at least 14×14</span>`;
    }
}

let C = new BetterCanvas(ctx);
ctx.fillStyle = "#f00";
let W = new World(C, [canvas.width, canvas.height]);
TH = new TileHolder(W);
let TM = new TileMenu(TH);
let ST = new Settings(W, 10, 55);
let DM = new DrawMode(W, 60, 105);
W.loadLevel(level);
loadImages((completed, total) => {
    C.drawRectCoords([20, 90], [20+(completed/total*280), 95], true, "#00b");
}).then(() => {
    imagesLoaded = true;
    Object.values(config.tiles).forEach(t => new TileSelector(TH, t));
    C.draw();
    window.addEventListener("beforeunload", function(event) {
        event.preventDefault();
        event.returnValue = "";
    });
});
C.fillText("Loading images...", [20, 80], "#000", "40px sans-serif");
C.drawRectCoords([20, 90], [300, 95], true, "#88f");
