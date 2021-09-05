let config = {
    tiles: {
        "Empty tile": {
            image: "old/blank.png",
            categories: ["Terrain", "Common"],
            layer: 0,
            hex: 0x0000,
            delete: true
        },
        "Floor": {
            image: "editor/floor-a.png",
            categories: ["Terrain", "Common"],
            layer: 0,
            hex: 0x0064
        },
        "Floor B": {
            image: "editor/floor-b.png",
            categories: ["Terrain"],
            layer: 0,
            hex: 0x0065
        },
        "Floor C": {
            image: "editor/floor-c.png",
            categories: ["Terrain"],
            layer: 0,
            hex: 0x0066
        },
        "Floor D": {
            image: "editor/floor-d.png",
            categories: ["Terrain"],
            layer: 0,
            hex: 0x0067
        },
        "Invisible wall": {
            image: "editor/floor-x.png",
            categories: ["Terrain"],
            layer: 0,
            hex: 0x0068
        },
        "Wall": {
            image: "editor/wall-top.png",
            categories: ["Terrain", "Common"],
            layer: 0,
            hex: 0x00C8
        },
        "Pit": {
            image: "editor/wall-hole.png",
            categories: ["Terrain"],
            layer: 0,
            hex: 0x00C9
        },
        "Wall 1.5": {
            image: "editor/wall-1.5.png",
            categories: ["Terrain"],
            layer: 0,
            hex: 0x00CA
        },
        "Wall 2.0": {
            image: "editor/wall-2.0.png",
            categories: ["Terrain"],
            layer: 0,
            hex: 0x00CB
        },
        "Fake wall": {
            image: "editor/fakewall-top.png",
            categories: ["Terrain"],
            layer: 0,
            hex: 0x05DC
        },
        "Fake wall 1.5": {
            image: "editor/fakewall-1.5.png",
            categories: ["Terrain"],
            layer: 0,
            hex: 0x05DD
        },
        "Fake wall 2.0": {
            image: "editor/fakewall-2.0.png",
            categories: ["Terrain"],
            layer: 0,
            hex: 0x05DE
        },
        "Water": {
            image: "editor/water.png",
            categories: ["Terrain", "Common"],
            layer: 0,
            hex: 0x012C
        },
        "Lava": {
            image: "editor/lava.png",
            categories: ["Terrain", "Common"],
            layer: 0,
            hex: 0x0384
        },
        "Trampoline": {
            image: "editor/trampoline.png",
            categories: ["Terrain"],
            layer: 0,
            hex: 0x0708
        },
        "Ice centre": {
            image: "editor/ice-centre.png",
            categories: ["Ice & Conveyors"],
            layer: 0,
            hex: 0x0190
        },
        "Ice DL": {
            image: "editor/ice-downleft.png",
            categories: ["Ice & Conveyors"],
            layer: 0,
            hex: 0x0192
        },
        "Ice DR": {
            image: "editor/ice-downright.png",
            categories: ["Ice & Conveyors"],
            layer: 0,
            hex: 0x0191
        },
        "Ice UL": {
            image: "editor/ice-upleft.png",
            categories: ["Ice & Conveyors"],
            layer: 0,
            hex: 0x0193
        },
        "Ice UR": {
            image: "editor/ice-upright.png",
            categories: ["Ice & Conveyors"],
            layer: 0,
            hex: 0x0194
        }
    },
    categories: [
        "Recent",
        "Common",
        "Terrain",
        "Objects",
        "Buttons & Gates",
        "Ice & Conveyors",
        "Cannons",
        "Crossings",
        "Spikes & Electro",
        "Teleporters",
        "Enemies",
        "Generators",
        "Scenery",
        "Effects",
        "Signs",
        "Metatiles"
    ],
    themes: [
        "aztec",
        "castle",
        "cave",
        "garden",
        "jade",
        "purple",
        "sand",
        "spooky",
        "wood"
    ],
    undoBufferMaxSize: 0
}

{
    let index = 0;
    ["conveyor-1", "conveyor-2", "pink", "yellow", "green", "blue", "red", "indigo", "white"].forEach(colour => {
        ["square", "round", "star"].forEach(type => {
            let name = `${colour[0].toUpperCase()}${colour.slice(1)} ${type} button`;
            let image = "editor/button-"+colour+"-"+type+".png";
            config.tiles[name] = {
                image,
                categories: ["Buttons & Gates"],
                layer: 0,
                hex: 0x044C+index
            }
            index++;
        });
    });
}

{
    let index = 0;
    for (let colour of ["exit", "pink", "yellow", "green", "blue", "red", "indigo", "white"]) {
        for (let direction of ["horizontal", "vertical"]) {
            let name = `${colour[0].toUpperCase()}${colour.slice(1)} ${direction} gate`;
            let image = `editor/gate-${colour}-${direction[0]}.png`;
            config.tiles[name] = {
                image,
                categories: ["Buttons & Gates"],
                layer: 0,
                hex: 0x03E8+index
            }
            index++;
        }
    }
}

{
    let index = 0;
    ["water", "lava", "space"].forEach(type => {
        let maxSteps = 3;
        for (let steps = 1; steps <= maxSteps; steps++) {
            let name = type[0].toUpperCase()+type.slice(1).toLowerCase()+" bridge ("+steps+")";
            let image = "editor/bridge-"+type+"-"+steps+".png";
            config.tiles[name] = {
                image,
                categories: ["Crossings"],
                layer: 0,
                hex: 0x0258+index
            }
            index++;
        }
    });
}

{
    for (let type of ["spikes", "electro"]) {
        for (let speed = 1; speed <= 4; speed++) {
            let name = `${type[0].toUpperCase()}${type.slice(1)} (${speed})`;
            let image = `editor/${type}-${speed}.png`;
            let hex = type == "spikes"
                ? 0x0577+speed
                : 0x02BB+speed
            config.tiles[name] = {
                image,
                categories: ["Spikes & Electro"],
                layer: 0,
                hex
            }
        }
    }
}

{
    ["water", "space", "lava"].forEach((type, index) => {
        let name = type[0].toUpperCase()+type.slice(1).toLowerCase()+" transporter";
        let image = "editor/transporter-"+type+".png";
        config.tiles[name] = {
            image,
            categories: ["Crossings"],
            layer: 0,
            hex: 0x06A4+index
        }
    });
}

{
    ["red", "yellow", "green", "indigo", "pink", "blue", "white", "black"].forEach((colour, index) => {
        let name = colour[0].toUpperCase()+colour.slice(1).toLowerCase()+" teleporter";
        let image = "editor/teleporter-"+colour+".png";
        config.tiles[name] = {
            image,
            categories: ["Teleporters"],
            layer: 0,
            hex: 0x04B0+index
        }
    });
}

{
    let index = 0;
    let conveyorCount = 2;
    for (let count = 1; count <= conveyorCount; count++) {
        ["u", "r", "d", "l", "u/d", "r/l", "d/u", "l/r"].forEach(direction => {
            let name = "Conveyor "+direction.toUpperCase()+" "+count;
            let image = "editor/conveyor-"+direction.replace("/", "")+"-"+count+".png";
            config.tiles[name] = {
                image,
                categories: ["Ice & Conveyors"],
                layer: 0,
                hex: 0x01F4+index
            }
            index++;
        });
    }
}

{
    ["", "push"].forEach(push => {
        let index = push ? 0x076C : 0x0320;
        ["up", "right", "down", "left"].forEach(direction => {
            let cannonCount = 4;
            for (let count = 1; count <= cannonCount; count++) {
                let name = (push ? "Push cannon " : "Cannon")+direction+" "+count;
                let image = "editor/"+push+"cannon-"+direction+"-"+count+".png";
                config.tiles[name] = {
                    image,
                    categories: ["Cannons"],
                    layer: 0,
                    hex: index
                }
                index++;
            }
        });
    });
}

{
    [
        ["Wooden box", "wood"],
        ["Steel box", "steel"],
        ["Reflector 1", "reflector-1"],
        ["Reflector 2", "reflector-2"],
        ["Boulder", "boulder"],
        ["Plasma cube", "plasma"],
        ["Explosive barrel", "barrel"],
        ["Prism", "prism"],
        ["Sticky cube", "stickycube"],
        ["Red link sphere", "linksphere-red"],
        ["Yellow link sphere", "linksphere-yellow"],
        ["Green link sphere", "linksphere-green"],
        ["Blue link sphere", "linksphere-blue"]
    ].forEach((type, index) => {
        let name = type[0]+" factory";
        let image = "editor/boxfactory-"+type[1]+".png";
        config.tiles[name] = {
            image,
            categories: ["Generators"],
            layer: 0,
            hex: 0x0640+index
        }
    });
}

{
    [
        ["Coily", "coily"],
        ["Z-Bot (left)", "zbotleft"],
        ["Z-Bot (right)", "zbotright"],
        ["Kaboom (left)", "kaboomleft"],
        ["Kaboom (right)", "kaboomright"],
        ["UFO (left)", "ufoleft"],
        ["UFO (right)", "uforight"],
        ["Red chomper", "chomperred"],
        ["Gold chomper", "chompergold"],
        ["Ghost", "ghost"],
        ["Rainbow spirit", "spirit"],
        ["Z-Bot (broken)", "zbotbroken"]
    ].forEach((type, index) => {
        let name = type[0]+" warp gate";
        let image = "editor/warpgate-"+type[1]+".png";
        config.tiles[name] = {
            image,
            categories: ["Generators"],
            layer: 0,
            hex: 0x0898+index
        }
    });
}

{
    for (let i = 1; i <= 20; i++) {
        config.tiles["Sign "+i] = {
            image: "editor/floor-sign-"+i+".png",
            categories: "Signs",
            layer: 0,
            hex: 0x0513+i
        }
    }
}

{
    let cmap = [
        ["Objects", "Common"],
        ["Objects"],
        ["Enemies"],
        ["Objects", "Common", "Enemies", "Scenery", "Effects"],
        ["Scenery"],
        ["Effects"]
    ]

    let omap = [
        ["Empty object", "old/blank2.png", 3, true],
        ["Stinky", "editor/stinky.png", 0],
        ["Loof", "editor/loof.png", 0],
        ["Qookie", "editor/qookie.png", 1],
        ["Peegue", "editor/peegue.png", 1],
        ["Rainbow coin", "old/coin.png", 0],
        ["Level exit", "editor/exit.png", 0],
        ["Bonus time", "editor/clock.png", 1],
        ["Bonus coin", "editor/bonus.png", 0],
        ["Wooden box", "editor/woodenbox.png", 0],
        ["Steel box", "editor/steelbox.png", 0],
        ["Reflector 1", "editor/reflector1.png", 1],
        ["Reflector 2", "editor/reflector2.png", 1],
        ["Boulder", "editor/boulder.png", 0],
        ["Plasma cube", "editor/plasmacube.png", 1],
        ["Explosive barrel", "editor/explosivebarrel.png", 1],
        ["Prism", "editor/prism.png", 1],
        ["Coily", "editor/coily.png", 2]
    ];
    for (let start of ["up", "right", "down", "left"]) {
        for (let change of ["left", "right"]) {
            omap.push(["Z-Bot ("+start+", "+change+")", "editor/zbot-"+start[0]+"-"+change[0]+".png", 2]);
        }
    }
    omap.push(["Z-Bot (broken)", "editor/zbot-broken.png", 2]);
    for (let start of ["up", "right", "down", "left"]) {
        for (let change of ["left", "right"]) {
            omap.push(["Kaboom ("+start+", "+change+")", "editor/kaboom-"+start[0]+"-"+change[0]+".png", 2]);
        }
    }
    for (let start of ["up", "right", "down", "left"]) {
        for (let change of ["left", "right"]) {
            omap.push(["UFO ("+start+", "+change+")", "editor/ufo-"+start[0]+"-"+change[0]+".png", 2]);
        }
    }
    omap = omap.concat([
        ["Chomper (red)", "editor/chomper-red.png", 2],
        ["Chomper (gold)", "editor/chomper-gold.png", 2],
        ["Ghost", "editor/ghost.png", 2],
        ["Rainbow spirit", "editor/spirit.png", 2],
        ["UFO mothership", "editor/mothership.png", 2],
        ["Fish", "editor/fish.png", 4],
        ["Fireball", "editor/fireball.png", 1],
        ["Pillar", "editor/pillar.png", 4],
        ["Small spike", "editor/spike-small.png", 4],
        ["Large spike", "editor/spike-large.png", 4],
        ["Fountain", "editor/fountain.png", 4],
        ["Large pyramid", "editor/pyramid-large.png", 4],
        ["Small pyramid", "editor/pyramid-small.png", 4],
        ["Large wooden box", "editor/largebox.png", 4],
        ["Lamp", "editor/lamp.png", 4]
    ]);
    for (let direction of ["down", "right", "left", "up", "1", "2", "3", "4"]) {
        omap.push(["House component ("+direction+")", "editor/house-"+direction+".png", 4]);
    }
    omap = omap.concat([
        ["Snowy tree", "editor/tree-snow.png", 4],
        ["Thin snowy tree", "editor/tree-thinsnow.png", 4],
        ["Tree", "editor/tree-regular.png", 4],
        ["Wide snowy tree", "editor/tree-widesnow.png", 4],
        ["Small mushroom", "editor/mushroom-small.png", 4],
        ["Large mushroom", "editor/mushroom-large.png", 4],
        ["Plant", "editor/plant.png", 4],
        ["Stinker statue", "editor/statue-regular.png", 4],
        ["Rainbow stinker statue", "editor/statue-rainbow.png", 4],
        ["Snowman", "editor/snowman.png", 4],
        ["Custom model A", "editor/letter-a.png", 4],
        ["Custom model B", "editor/letter-b.png", 4],
        ["Custom model C", "editor/letter-c.png", 4],
        ["Custom model D", "editor/letter-d.png", 4],
        ["Red tint (global)", "editor/global-red.png", 5],
        ["Green tint (global)", "editor/global-green.png", 5],
        ["Blue tint (global)", "editor/global-blue.png", 5],
        ["Yellow tint (global)", "editor/global-yellow.png", 5],
        ["Falling snow effect (global)", "editor/global-snow.png", 5],
        ["Rain effect (global)", "editor/global-rain.png", 5],
        ["Lightning effect (global)", "editor/global-lightning.png", 5],
        ["Cycling rainbow tint (global)", "editor/global-rainbow.png", 5]
    ]);
    for (let i = 0; i < omap.length; i++) {
        let entry = omap[i];
        config.tiles[entry[0]] = {
            image: entry[1],
            categories: cmap[entry[2]],
            layer: 1,
            hex: i
        }
        if (entry[3]) config.tiles[entry[0]].delete = entry[3];
    }
}

config.tiles["Sticky cube"] = {
    image: "editor/stickycube.png",
    categories: ["Objects"],
    layer: 0,
    hex: 0x07D0
}

for (let i = 0; i < 4; i++) {
    let colours = ["red", "yellow", "green", "blue"];
    config.tiles["Link sphere ("+colours[i]+")"] = {
        image: "editor/linksphere-"+colours[i]+".png",
        categories: ["Objects"],
        layer: 0,
        hex: 0x0834+i
    }
}

{
    let offset = 0;
    for (let type of ["blue", "red"]) {
        for (let charname of ["stinky", "loof", "qookie", "peegue"]) {
            config.tiles["Shadow stinker ("+charname+", "+type+")"] = {
                image: "editor/shadow-"+charname+"-"+type+".png",
                categories: ["Enemies"],
                layer: 0,
                hex: 0x0960+offset
            }
            offset++;
        }
    }
}

config.tiles["3D (global)"] = {
    image: "editor/3d.png",
    categories: ["Effects"],
    layer: 0,
    hex: 0x08FC
}

// Popular metatiles
config.tiles["Invisible floor"] = {
    image: "custom/ghost-floor.png",
    categories: ["Metatiles"],
    layer: 0,
    hex: 0x0069,
    drawHex: "0069"
}
config.tiles["Invisible water"] = {
    image: "custom/ghost-water.png",
    categories: ["Metatiles"],
    layer: 0,
    hex: 0x012d,
    drawHex: "012D"
}
config.tiles["Invisible lava"] = {
    image: "custom/ghost-lava.png",
    categories: ["Metatiles"],
    layer: 0,
    hex: 0x0385,
    drawHex: "0385"
}
config.tiles["Invisible trampoline"] = {
    image: "custom/ghost-trampoline.png",
    categories: ["Metatiles"],
    layer: 0,
    hex: 0x0709,
    drawHex: "0709"
}
{
    ["u", "r", "d", "l", "u/d", "r/l", "d/u", "l/r"].forEach((direction, index) => {
        let name = "Invisible conveyor "+direction.toUpperCase();
        let image = "custom/ghost-conveyor-"+direction.replace("/", "")+"-2.png";
        const hex = 0x0204+index
        config.tiles[name] = {
            image,
            categories: ["Metatiles"],
            layer: 0,
            hex,
            drawHex: hex.toString(16).padStart(4, "0").toUpperCase()
        }
    });
}
