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

class ConfigEditor extends ElemJS {
    constructor(parent) {
        super("div");
        parent.appendChild(this.element);
        
        this.child(
            new ElemJS("table").child(new ElemJS("tbody").child(
                new ElemJS("tr").child(
                    new ElemJS("td").text("Installation directory")
                ).child(
                    new ElemJS("td").child(
                        this.i_installationdir = new ElemJS("input").direct("disabled", true)
                    )
                )
            ).child(
                new ElemJS("tr").child(
                    new ElemJS("td").text("Level directory")
                ).child(
                    new ElemJS("td").child(
                        this.i_leveldir = new ElemJS("input").direct("disabled", true)
                    )
                )
            ))
        ).child(
            this.i_button = new CheckButton("Save paths", () => this.saveState())
        )

        this.loadState();
    }
    loadState() {
        request("/api/rtw/config", response => {
            let data = JSON.parse(response.responseText);
            this.i_installationdir.element.value = data.installationDir;
            this.i_installationdir.element.disabled = false;
            this.i_leveldir.element.value = data.levelDir;
            this.i_leveldir.element.disabled = false;
        });
    }
    saveState() {
        request("/api/rtw/config", response => {
            if (response.status == 204) {
                this.i_button.check();
            } else {
                alert(response.responseText);
            }
        }, {
            installationDir: this.i_installationdir.element.value,
            levelDir: this.i_leveldir.element.value
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
        request("/api/rtw/installstate", response => {
            let data = JSON.parse(response.responseText);
            if (data.installed) {
                this.state.installed = true;
            } else {
                this.state.installed = false;
            }
            this.render();
        });
    }
    install() {
        this.i_installbutton.loading("Downloading...");
        request("/api/rtw/requestimages", response => {
            if (response.status == 204) {
                this.i_installbutton.check();
            } else {
                alert(response.responseText);
            }
        });
    }
}

function start() {
    let configEditor = new ConfigEditor(q("#configEditor"));
    let imageInstallState = new ImageInstallState(q("#imageInstallState"));
}