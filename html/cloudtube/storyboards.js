class SBStore {
    constructor() {
        this.ranges = [];
        this.images = {};
        this._cache = [];
    }
    loadFromVTT(vtt) {
        let lines = vtt.split("\n").map(l => l.trim());
        if (lines[0] != "WEBVTT") throw new Error("Not a VTT file");
        lines = lines.slice(2);
        while (lines.length) {
            let times = lines.shift();
            let [start, end] = times.split(" --> ").map(s => s.split(":").reduce((p, c, i, a) => p + (60**(a.length-i-1)*c), 0));
            let text = lines.shift();
            if (text !== undefined) this.ranges.push({times, start, end, text});
            lines.shift();
        }
    }
    find(time) {
        let found = this.ranges.find(item => item.start <= time && time < item.end);
        if (found) return found;
        else return null;
    }
    preload() {
        let uniqueURLs = [];
        let previous = "";
        this.ranges.forEach(range => {
            let normalised = range.text.split("#")[0];
            if (previous != normalised) {
                previous = normalised;
                uniqueURLs.push(normalised);
            }
        });
        uniqueURLs.forEach(url => {
            let image = new Image();
            image.src = url;
            this._cache.push(image);
        });
    }
}

class Storyboard {
    constructor(video, sbStore) {
        /** @type {HTMLVideoElement} */
        this.video = video;
        /** @type {SBStore} */
        this.sbStore = sbStore;
        
        this.left = 0;
        this.time = 0;
        this.visible = false;
        this.currentImage = "";
        this.backgroundPosition = "0px 0px";
        this.range = this.sbStore.find(0);

        // input event fires when track clicked, but event has wrong position,
        // causing storyboard to jump to where the thumb used to be, so prevent that
        this.lastHoverLocation;
        // fix the previous fix
        // this actually works pretty well
        this.inputsSinceHoverBroke = 0;
        // prevent mousemove event firing and hiding the video, then input event firing and showing it a millisecond later,
        // causing a visual flicker when moving the mouse upwards after dragging the thumb along the track
        this.lastInputTime = 0;

        this.container = document.createElement("div");
        this.container.classList.add("storyboard");
        this.container.style.display = "none";
        if (this.getVendor() == "firefox") this.container.style.bottom = "46px";
        this.display = document.createElement("div");
        this.display.classList.add("storyboard-fg");
        this.timeDisplay = document.createElement("div");
        this.timeDisplay.classList.add("storyboard-time");
        this.timeDisplay.textContent = "0:00";
        this.currentTimeContainer = q("#currentTimeContainer");

        q(".videoContainer").appendChild(this.container);
        this.container.appendChild(this.display);
        this.container.appendChild(this.timeDisplay);

        /*this.video.addEventListener("input", () => {
            this.lastInputTime = Date.now();
            let location = this.timeToLocation(this.video.currentTime);
            //console.log("[i]", location);
            if (Math.abs(this.lastHoverLocation-location) > 20) {
                this.inputsSinceHoverBroke++;
                if (this.inputsSinceHoverBroke <= 2) return;
            } else {
                this.inputsSinceHoverBroke = 0;
            }
            this.calculate(location);
        });*/
        let addedSeeking = false;
        const seekAction = () => {
            this.video.addEventListener("seeking", () => {
                this.lastInputTime = Date.now();
                let location = this.timeToLocation(this.video.currentTime);
                this.calculate(location);
            });
        }
        this.video.addEventListener("loadedmetadata", () => {
            if (addedSeeking) {
                addedSeeking = false;
                this.video.removeEventListener("seeking", seekAction);
            }
        });
        this.video.addEventListener("seeked", () => {
            this.visible = false;
            this.update();
            if (!addedSeeking) {
                addedSeeking = true;
                this.video.addEventListener("seeking", seekAction);
            }
        });

        this.video.addEventListener("mousemove", event => {
            setTimeout(() => {
                if (Date.now()-this.lastInputTime > 200) {
                    let lowEnough = this.eventIsLowEnough(event);
                    if (lowEnough) {
                        let location = this.eventToLocation(event);
                        //console.log("[m]", location);
                        this.calculate(location);
                    } else {
                        this.visible = false;
                        this.update();
                    }
                }
            });
        });
        this.video.addEventListener("mouseleave", () => {
            this.visible = false;
            this.update();
        });

        this.update();
    }

    update() {
        this.container.style.display = this.visible ? "" : "none";
        if (this.visible) {
            this.container.style.left = this.left+"px";
            this.timeDisplay.textContent = prettySeconds(this.time);
            if (this.range) {
                this.display.style.background = "url("+this.range.text.split("#")[0]+")";
                this.display.style.width = (this.range.text.split("#")[1].split(",")[2]-1)+"px";
            } else {
                this.display.style.background = "epic";
            }
            this.display.style.backgroundPosition = this.backgroundPosition;
        }
    }

    getVendor() {
        if (document.mozFullScreenElement === undefined) return "chrome";
        else return "firefox";
    }
    
    getEdges() {
        let vendor = this.getVendor();
        if (vendor == "chrome") {
            var edges = [37, 37];
            //if (this.video.duration >= 10*60) edges[0] += 7;
            //if (this.video.currentTime >= 10*60) edges[0] += 7;
        } else {
            var edges = [54, 160];
            let hasHours = this.video.duration >= 60*60;
            let videoDisplayTime = prettySeconds(Math.floor(this.video.currentTime), hasHours) + " / " + prettySeconds(Math.floor(this.video.duration));
            if (this.currentTimeContainer.textContent == videoDisplayTime) {
                edges[1] += this.currentTimeContainer.clientWidth;
            } else {
                this.currentTimeContainer.textContent = videoDisplayTime;
                edges[1] += this.currentTimeContainer.clientWidth;
            }
        }
        return edges;
    }

    calculate(location) {
        let allowed = this.isLocationAllowed(location)
        && this.video.readyState != 0
        && typeof(this.time) == "number"
        && !isNaN(this.time)

        if (allowed) {
            location = this.snapLocation(location);
            this.lastHoverLocation = location;
            this.visible = true;
            this.time = this.locationToTime(location);
            this.left = this.locationToLeft(location);
            this.calculateRange();
            this.update();
        } else {
            this.visible = false;
            this.update();
        }
    }

    calculateRange() {
        this.range = this.sbStore.find(this.time);
        if (this.range) {
            let coords = this.range.text.split("#")[1];
            if (coords && coords.match(/^xywh=(\d+,){3}\d+$/)) {
                let [x, y] = coords.split("=")[1].split(",");
                this.backgroundPosition = `-${x}px -${y}px`;
            }
        }
    }

    getVideoCoords() {
        let rect = this.video.getBoundingClientRect();
        return [
            Math.round(rect.left) + window.scrollX,
            Math.round(rect.top) + window.scrollY,
            this.video.clientWidth,
            this.video.clientHeight
        ]
    }
    
    eventToLocation(event) {
        return event.clientX - Math.round(this.video.getBoundingClientRect().left);
    }

    eventIsLowEnough(event) {
        const videoCoords = this.getVideoCoords();
        const vendor = this.getVendor();
        if (vendor == "chrome") {
            var maxDistance = 24;
        } else {
            var maxDistance = 40;
        }

        let distance = (videoCoords[1] + videoCoords[3]) - event.pageY;
        return distance <= maxDistance;
    }


    locationToBarPixels(location) {
        const edges = this.getEdges();
        return location - edges[0];
    }

    snapLocation(location) {
        const videoWidth = this.video.clientWidth;
        const edges = this.getEdges();
        // snap to edges
        location = Math.min(Math.max(location, edges[0]), videoWidth-edges[1]);
        //location = Math.min(Math.max(location, 
        return location;
    }

    isLocationAllowed(location) {
        const videoWidth = this.video.clientWidth;
        const edges = this.getEdges();
        const permittedDistance = 30;

        return edges[0]-permittedDistance <= location && location <= videoWidth-edges[1]+permittedDistance;
    }

    locationToTime(location) {
        const videoWidth = this.video.clientWidth;
        const edges = this.getEdges();
        const barPixels = this.locationToBarPixels(location);
    
        let fraction = barPixels / (videoWidth - edges[1] - edges[0]);
        let time = Math.round(fraction * this.video.duration);
        return time;
    }

    timeToLocation(time) {
        const videoWidth = this.video.clientWidth;
        const edges = this.getEdges();

        let location = Math.floor(time / this.video.duration * (videoWidth - edges[1] - edges[0]) + edges[0]);
        return location;
    }

    locationToLeft(location) {
        const thumbnailWidth = this.container.clientWidth;
        return location - thumbnailWidth/2;
    }
}

if (lsm.get("settingDisableStoryboards") != "1") {
    var sbStore = new SBStore();
    var storyboard = new Storyboard(q("video"), sbStore);
    request(`https://invidio.us/api/v1/storyboards/${window.location.pathname.split("/")[3]}?height=90`, response => {
        if (response.status == 200) {
            sbStore.loadFromVTT(response.responseText);
            if (lsm.get("settingDisableStoryboardPreload") != "1") sbStore.preload();
        }
    });
}
