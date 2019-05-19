var exports;
if (!exports) exports = {};

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
    "storyboards": [
        {
            label: "Enable storyboards",
            comment: "Storyboards are the preview thumbnails that appear when you hover the video timeline.",
            lsm: "settingDisableStoryboards",
            invert: true
        },{
            label: "Preload storyboards",
            comment: "Load thumbnails before they are needed so they can be displayed sooner when you do need them.",
            lsm: "settingDisableStoryboardPreload",
            invert: true
        }
    ],
    "privacy": [
        {
            label: "Store watch history",
            comment:
                "The list of watched videos is stored locally and is never sent to another server. "+
                "If enabled, watched status will be displayed next to each video on your subscriptions page.",
            lsm: "trackWatchedVideos",
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
        if (exportValue) q("#export-box").value = typeof(exportValue) == "string" ? exportValue : JSON.stringify(exportValue);
    });
}

function importData() {
    let messageModal = new MessageModal("Importing...", "");
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
            messageModal.setState({bodyText: "Syncing subscriptions..."});
            uploadSubscriptions(data.subscriptions).then(() => {
                messageModal.setState({
                    displayButtons: true,
                    titleText: "Import complete",
                    bodyText:
                        "Your subscriptions and watch history have been replaced with the data you imported. "+
                        "If you are logged in, the imported subscriptions have been synchronised to your account. "+
                        "If you imported watch history, the setting to save it on CloudTube has automatically been turned on."
                });
            });
        } else if (format == "NewPipe") {
            let ids = [];
            let promises = [];
            data.subscriptions.forEach(s => {
                let [mode, part] = s.url.split("/").slice(-2);
                if (mode == "channel") ids.push(part);
                else promises.push(new Promise(resolve => {
                    request(`/api/youtube/channels/${part}/info`, resolve)
                }));
            });
            if (promises.length) messageModal.setState({bodyText: "Resolving channels..."});
            Promise.all(promises).then(results => {
                results.forEach(result => {
                    let json = JSON.parse(result.responseText);
                    ids.push(json.authorId);
                });
                lsm.array("subscriptions").array = ids;
                lsm.array("subscriptions").write();
                messageModal.setState({bodyText: "Syncing subscriptions..."});
                uploadSubscriptions(ids).then(() => {
                    messageModal.setState({
                        displayButtons: true,
                        titleText: "Import complete",
                        bodyText:
                            "That data has been imported and your old subscriptions have been overwritten. "+
                            "If you are logged in, the imported subscriptions have been synchronised to your account."
                    });
                });
            });
        } else if (format == "FreeTube") {
            data.subscriptions = data.subscriptions.filter(item => {
                return item && !data.subscriptions.find(s => s._id == item._id && s.$$deleted == true)
            });
            let ids = data.subscriptions.map(s => s.channelId).filter(s => s);
            lsm.array("subscriptions").array = ids;
            lsm.array("subscriptions").write();
            messageModal.setState({bodyText: "Syncing subscriptions..."});
            uploadSubscriptions(ids).then(() => {
                messageModal.setState({
                    displayButtons: true,
                    titleText: "Import complete",
                    bodyText:
                        "That data has been imported and your old subscriptions have been overwritten. "+
                        "If you are logged in, the imported subscriptions have been synchronised to your account."
                });
            });
        }
    }
    let body = q("#export-box").value.trim();
    if (!body) return messageModal.setState({displayButtons: true, titleText: "Import failed", bodyText: "Paste the data to import into the box, then try again."});
    let data;
    try {
        data = JSON.parse(body);
    } catch (e) {
        try {
            data = body.split("\n").map(l => JSON.parse(l));
        } catch(e) {
            return messageModal.setState({displayButtons: true, titleText: "Import failed", bodyText: "That data is not valid JSON."});
        }
    }
    try {
        if (typeof(data) == "object" && data && !data.subscriptions) data = {subscriptions: data};
        if (data && typeof(data.subscriptions) == "object" && data.subscriptions.constructor.name == "Array") {
            if (typeof(data.subscriptions[0]) == "string" && data.subscriptions[0].startsWith("UC") && data.subscriptions[0].length == 24) {
                return importUsing(data, "CloudTube"); // also Invidious
            } else if (typeof(data.subscriptions[0].url) == "string" && data.subscriptions[0].url.startsWith("https://www.youtube.com")) {
                return importUsing(data, "NewPipe");
            } else if (typeof(data.subscriptions[0]._id) == "string") {
                return importUsing(data, "FreeTube");
            }
        }
        return messageModal.setState({displayButtons: true, titleText: "Import failed", bodyText: "The format of the data wasn't recognised."});
    } catch (e) {
        console.error(e);
        return messageModal.setState({displayButtons: true, titleText: "Import failed", bodyText: "An unknown error occurred while trying to process that data. This is probably because the data is invalid."});
    }
}

class FilterManager extends ElemJS {
    constructor(container) {
        super("div");
        this.class("filter-manager");
        container.appendChild(this.element);
        this.filters = [];
        this.filterContainer = new ElemJS("div");
        this.child(this.filterContainer);
        this.loadLsm();
        this.element.addEventListener("input", this.input.bind(this));
        this.element.addEventListener("change", this.change.bind(this));
    }
    loadLsm() {
        let data = JSON.parse(lsm.get("videoFilter"));
        if (data) {
            data.forEach(filter => this.addFilter(filter, true));
        }
        this.render();
    }
    saveLsm() {
        let data = this.filters.map(f => f.getData());
        lsm.set("videoFilter", JSON.stringify(data));
    }
    addFilter(filterData, noRender) {
        this.filters.push(new Filter(filterData, this));
        if (!noRender) this.render();
    }
    removeFilter(filter) {
        this.filters = this.filters.filter(f => f != filter);
        this.saveLsm();
        this.render();
    }
    render() {
        this.filterContainer.clearChildren();
        this.filters.forEach(f => this.filterContainer.child(f));
    }
    input(event) {
        if (event.target.tagName == "INPUT") {
            this.saveLsm();
        }
    }
    change() {
        this.saveLsm();
    }
}

class Filter extends ElemJS {
    constructor(data, manager) {
        super("div");
        this.class("filter-item");
        this.manager = manager;
        this.conditions = [];
        this.conditionsElement = new ElemJS("div")
        .class("filter-condition-container")
        data.forEach(condition => this.addCondition(condition, true));
        this.render();
    }
    addCondition(conditionData, noRender) {
        this.conditions.push(new FilterCondition(conditionData, this));
        if (!noRender) this.render();
    }
    removeCondition(target) {
        this.conditions = this.conditions.filter(condition => condition != target);
        this.manager.saveLsm();
        this.render();
    }
    render() {
        this.clearChildren();
        this.child(
            this.conditionsElement
        ).child(
            new ElemJS("div")
            .class("filter-button-container")
            .child(
                new ElemJS("button")
                .text("Add condition")
                .direct("onclick", () => this.addCondition())
            ).child(
                new ElemJS("button")
                .class("button-dangerous")
                .text("Remove filter")
                .direct("onclick", this.remove.bind(this))
            )
        )
        this.conditionsElement.clearChildren();
        this.conditions.forEach(c => this.conditionsElement.child(c));
    }
    remove() {
        this.manager.removeFilter(this);
    }
    getData() {
        return this.conditions.map(c => c.getData());
    }
}

class FilterCondition extends ElemJS {
    constructor(data, filter) {
        super("div");
        this.class("filter-condition");
        this.filter = filter;
        this.child(
            this.propertySelect = new ElemJS("select")
            .child(new ElemJS("option").text("Title").direct("value", "title"))
            .child(new ElemJS("option").text("Author").direct("value", "author"))
            .child(new ElemJS("option").text("Video ID").direct("value", "id"))
            .child(new ElemJS("option").text("Author ID").direct("value", "authorId"))
        ).child(
            this.comparisonInvert = new ElemJS("select")
            .child(new ElemJS("option").text("does").direct("value", "does"))
            .child(new ElemJS("option").text("does not").direct("value", "doesnot"))
        ).child(
            this.comparisonCase = new ElemJS("select")
            .child(new ElemJS("option").text("match case").direct("value", "matchcase"))
            .child(new ElemJS("option").text("ignore case").direct("value", "ignorecase"))
        ).child(
            this.comparisonType = new ElemJS("select")
            .child(new ElemJS("option").text("equal").direct("value", "equal"))
            .child(new ElemJS("option").text("contain").direct("value", "contain"))
        ).child(
            this.valueInput = new ElemJS("input")
            .direct("style", "width: 200px;")
            .direct("placeholder", "Value")
        ).child(
            new ElemJS("button")
            .direct("onclick", this.remove.bind(this))
            .child(
                new ElemJS("img")
                .direct("src", "/fonts/cross.svg")
                .direct("alt", "Remove filter condition.")
            )
        )
        if (data) this.setData(data);
    }
    setData(data) {
        this.propertySelect.element.value = data.key;
        this.comparisonInvert.element.value = data.comparison.invert ? "doesnot" : "does";
        this.comparisonCase.element.value = data.comparison.match_case ? "matchcase" : "ignorecase";
        this.comparisonType.element.value = data.comparison.type
        this.valueInput.element.value = data.value;
    }
    getData() {
        return {
            key: this.propertySelect.element.value,
            comparison: {
                invert: this.comparisonInvert.element.value == "doesnot",
                match_case: this.comparisonCase.element.value == "matchcase",
                type: this.comparisonType.element.value
            },
            value: this.valueInput.element.value
        }
    }
    remove() {
        this.filter.removeCondition(this);
    }
}

function bodyLoad() {
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

    let filterManager = new FilterManager(q("#filter-container"));

    exports.addFilter = function() {
        filterManager.addFilter([]);
    }
}