const typeMap = [
    {
        key: "blockedTitles",
        text: "Video title"
    },{
        key: "blockedAuthors",
        text: "Author name"
    },{
        key: "blockedVideos",
        text: "Video ID"
    },{
        key: "blockedAuthorIDs",
        text: "Author ID"
    }
];

const sections = {
    "endcards": [
        {
            label: "Enable end cards",
            comment: "End cards are interactive overlays to other videos, channels, playlists, and websites at the end of videos.",
            lsm: "disableEndCards",
            invert: true
        },{
            label: "Use canvas to enhance end cards",
            comment:
                "HTML canvas can be used to make end cards look slightly prettier. No fingerprinting takes place, but if you're "+
                "concerned about the possibility, you can turn this off.",
            lsm: "disableEndCardsCanvas",
            invert: true
        }
    ],
    "other": [
        {
            label: "Prefer webm format over mp4",
            comment: "Useful if your browser has problems with mp4 playback.",
            lsm: "preferWebm",
            invert: false
        },
        {
            label: "Use Invidious to proxy thumbnails",
            comment: "Using a proxy will be a little slower but more private.",
            lsm: "disableProxyThumbnails",
            invert: true
        },
        {
            label: "Use Invidious to proxy video streams",
            comment: " ",
            lsm: "settingInvidiousDash",
            options: [
                "Never",
                "When required",
                "Always"
            ],
            defaultIndex: 1
        },
        {
            label: "Show proper dates instead of time passed since that event",
            comment:
                'The default behaviour (unchecked) is to display dates as "x days ago", "x months ago", etc.<br>'+
                'Checking this box will make them instead display as an actual date like "12 March 2019".<br>'+
                'However, these dates are still calculated from the "x months ago" text, and will therefore be somewhat inaccurate.',
            lsm: "settingApproximateDates",
            invert: false
        },
        {
            label: "Show links to the legacy player",
            comment: `I'd quite like to deprecate the legacy player. If you turn this on, please <a href="/about/contact">tell me</a> why you need it.`,
            lsm: "enableLegacyLinks",
            invert: false
        }
    ]
};

function manageKeypress(event) {
    if (event.key == "Enter") {
        addTag();
    }
}

function addTag(value, type) {
    if (!type) {
        type = q("#tagTypeSelection").selectedOptions[0].value;
        value = q("#tagInput").value.trim();
        q("#tagInput").value = "";
    }
    lsm.array(type).add(value, true);
    let ne = q("#subStorage").children[0].cloneNode(true);
    ne.children[0].innerText = value;
    ne.children[1].innerText = typeMap.find(t => t.key == type).text;
    ne.children[1].setAttribute("data-type", type);
    q("#tagVisible").appendChild(ne);
}

function removeTag(event) {
    if (!event.path) event.path = event.composedPath();
    let tr = event.path.find(e => e.tagName == "TR");
    lsm.array(tr.children[1].getAttribute("data-type")).remove(tr.children[0].innerText.trim());
    let tbody = event.path.find(e => e.tagName == "TBODY");
    tbody.removeChild(tr);
}

function bodyLoad() {
    let select = q("select");
    for (let type of typeMap) {
        let option = document.createElement("option");
        option.innerText = type.text;
        option.value = type.key;
        select.appendChild(option);
        for (let setting of lsm.array(type.key).array) {
            addTag(setting, type.key);
        }
    }
    for (let sectionName in sections) {
        let sectionElement = q(`[data-sectionid="${sectionName}"]`);
        for (let setting of sections[sectionName]) {
            let base = document.createElement("div");
            if (setting.options) {
                var input = document.createElement("select");
                input.style.display = "block";
                input.id = setting.lsm;
                input.onchange = updateFlags;
                setting.options.forEach((option, i) => {
                    let o = document.createElement("option");
                    o.innerText = option;
                    input.appendChild(o);
                    if (option == lsm.get(setting.lsm)) input.selectedIndex = i;
                });
                if (lsm.get(setting.lsm) === null) input.selectedIndex = setting.defaultIndex;
            } else {
                var input = document.createElement("input");
                input.type = "checkbox";
                input.id = setting.lsm;
                input.onchange = updateFlags;
                input.checked = (lsm.get(setting.lsm) == "1") ^ setting.invert;
            }
            let label = document.createElement("label");
            label.setAttribute("for", setting.lsm);
            label.innerHTML = setting.label;
            if (input.tagName != "SELECT") base.appendChild(input);
            base.appendChild(label);
            if (input.tagName == "SELECT") base.appendChild(input);
            sectionElement.appendChild(base);
            if (setting.comment) {
                let comment = document.createElement("div");
                comment.innerHTML = setting.comment;
                sectionElement.appendChild(comment);
            }
        }
    }
}

function updateFlags() {
    for (let section of Object.values(sections)) {
        for (let setting of section) {
            let input = q("#"+setting.lsm);
            if (input.tagName == "INPUT") {
                var value = +(setting.invert ^ input.checked);
            } else if (input.tagName == "SELECT") {
                var value = input.selectedOptions[0].innerText;
            }
            lsm.set(setting.lsm, value);
        }
    }
}

function exportData() {
    new ExportTypeModal(exportValue => {
        if (exportValue) q("#export-box").value = JSON.stringify(exportValue);
    });
}

function importData() {
    function importUsing(data, format) {
        if (format == "CloudTube") {
            lsm.array("subscriptions").array = data.subscriptions;
            lsm.array("subscriptions").write();
            if (data.watch_history.length == 0) {
                lsm.set("trackWatchedVideos", "0");
                lsm.set("watchedVideos", "");
            } else {
                lsm.set("trackWatchedVideos", "1");
                lsm.array("watchedVideos").array = data.watch_history;
                lsm.array("watchedVideos").write();
            }
            if (lsm.get("token")) request("/api/youtube/subscriptions/import", new Function(), {token: lsm.get("token"), subscriptions: data.subscriptions});
            return new MessageModal("Import complete", "Your subscriptions and watch history have been replaced with the data you imported. If you are logged in, the imported subscriptions have been synchronised to your account. If you imported watch history, the setting to save it here has automatically been turned on.");
        }
    }
    let body = q("#export-box").value.trim();
    if (!body) return new MessageModal("Import failed", "Paste the data to import into the box, then try again.");
    let data;
    try {
        data = JSON.parse(body);
    } catch (e) {
        return new MessageModal("Import failed", "That data is not valid JSON.");
    }
    try {
        if (typeof(data.subscriptions) == "object" && data.subscriptions.constructor.name == "Array") {
            if (typeof(data.subscriptions[0]) == "string" && data.subscriptions[0].startsWith("UC") && data.subscriptions[0].length == 24) {
                return importUsing(data, "CloudTube"); // also Invidious
            } else if (typeof(data.subscriptions == "object") && typeof(data.subscriptions[0].url) == "string" && data.subscriptions[0].url.startsWith("https://www.youtube.com")) {
                //return importUsing(data, "NewPipe");
            }
        }
        return new MessageModal("Import failed", "The format of the data wasn't recognised.");
    } catch (e) {
        console.error(e);
        return new MessageModal("Import failed", "An unknown error occurred while trying to process that data. This is probably because the data is invalid.");
    }
}