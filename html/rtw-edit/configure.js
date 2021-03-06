if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", start);
} else {
    start();
}

class CheckButton extends ElemJS {
    constructor(text, callback) {
        super("button");
        this.text(text);
        this.savedText = text;
        this.direct("onclick", callback);
    }
    reset() {
        this.element.innerText = this.savedText;
        this.element.disabled = false;
    }
    loading(message = "") {
        this.element.innerText = message + "...";
        this.element.disabled = true;
    }
    check() {
        this.element.innerText = "🗸";
        this.element.disabled = false;
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            this.reset();
        }, 1000);
    }
}

class PathInput extends ElemJS {
    constructor(display) {
        super("input");
        this.display = display;
        this.display.element.style.display = "none";
        this.saved = true;
        this.direct("disabled", true).attribute("placeholder", "Required!");
        this.direct("oninput", () => this.setUnsaved());
        this.direct("onchange", () => this.setUnsaved());
    }
    setUnsaved() {
        this.saved = false;
        this.display.element.style.display = "";
        //this.element.style.backgroundColor = "#fdd";
        //this.element.style.backgroundColor = "#eff";
    }
    setSaved() {
        this.saved = true;
        this.display.element.style.display = "none";
        //this.element.style.backgroundColor = "";
    }
}

class ConfigEditor extends ElemJS {
    constructor(parent) {
        super("div");
        parent.appendChild(this.element);
        this.enabled = null;
        let savedDisplays = Array(2).fill().map(() => new ElemJS("span").text("unsaved!"));
        this.i_installationdir = new PathInput(savedDisplays[0]);
        this.i_leveldir = new PathInput(savedDisplays[1]);
        this.render();
        this.loadState();
    }
    loadState() {
        request("/api/rtw/config", response => {
            if (response.status == 200) {
                this.enabled = true;
                this.render();
                let data = JSON.parse(response.responseText);
                this.i_installationdir.element.value = data.installationDir || "";
                this.i_installationdir.element.disabled = false;
                this.i_leveldir.element.value = data.levelDir || "";
                this.i_leveldir.element.disabled = false;
            } else {
                this.enabled = false;
                this.disabledMessage = response.responseText;
            }
            this.render();
        });
    }
    saveState() {
        request("/api/rtw/config", response => {
            if (response.status == 204) {
                this.i_button.check();
                this.i_installationdir.setSaved();
                this.i_leveldir.setSaved();
            } else {
                alert(response.responseText);
            }
        }, {
            installationDir: this.i_installationdir.element.value,
            levelDir: this.i_leveldir.element.value
        });
    }
    render() {
        this.clearChildren();
        if (this.enabled === true) {
            this.child(
                new ElemJS("table").child(new ElemJS("tbody").child(
                    new ElemJS("tr").child(
                        new ElemJS("td").text("Installation directory")
                    ).child(
                        new ElemJS("td").child(
                            this.i_installationdir
                        )
                    ).child(
                        new ElemJS("td").child(
                            this.i_installationdir.display
                        )
                    )
                ).child(
                    new ElemJS("tr").child(
                        new ElemJS("td").text("Level directory")
                    ).child(
                        new ElemJS("td").child(
                            this.i_leveldir
                        )
                    ).child(
                        new ElemJS("td").child(
                            this.i_leveldir.display
                        )
                    )
                ))
            ).child(
                this.i_button = new CheckButton("Save paths", () => this.saveState())
            ).child(
                new ElemJS("button").text("Detect installation").direct("onclick", () => this.detect())
            )
        } else if (this.enabled === false) {
            this.child(new ElemJS("div").text(this.disabledMessage));
        } else {
            this.child(new ElemJS("div").text("Please wait, checking state..."));
        }
    }
    detect() {
        request("/api/rtw/detect", response => {
            if (response.status == 200) {
                this.i_installationdir.element.value = response.responseText;
                this.i_installationdir.setUnsaved();
                this.i_leveldir.element.value = response.responseText+"\\CustomLevels";
                this.i_leveldir.setUnsaved();
            } else {
                alert(response.responseText);
            }
        });
    }
}

class ImageInstallState extends ElemJS {
    constructor(parent) {
        super("div");
        this.state = {};
        parent.appendChild(this.element);
        this.i_installbutton = new CheckButton("Install/Update", () => this.install());
        this.loadState();
    }
    render() {
        this.clearChildren();
        this.child(
            new ElemJS("div").text(this.state.installed ? "Images are installed." : "Images are not installed.")
        ).child(
            new ElemJS("div").class("buttonContainer").child(
                this.i_installbutton
            )
        );
    }
    loadState() {
        return new Promise(resolve => {
            request("/api/rtw/installstate", response => {
                let data = JSON.parse(response.responseText);
                if (data.installed) {
                    this.state.installed = true;
                } else {
                    this.state.installed = false;
                }
                this.render();
                resolve();
            });
        });
    }
    install() {
        this.i_installbutton.loading("Downloading");
        request("/api/rtw/requestimages", response => {
            if (response.status == 204) {
                this.loadState().then(() => this.i_installbutton.check());
            } else {
                alert(response.responseText);
                this.i_installbutton.reset();
            }
        });
    }
}

function start() {
    let configEditor = new ConfigEditor(q("#configEditor"));
    let imageInstallState = new ImageInstallState(q("#imageInstallState"));
}