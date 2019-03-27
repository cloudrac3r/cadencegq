class Modal extends ElemJS {
    constructor(titleText) {
        super("div");
        this.titleText = titleText;
        this.body = null;
        this.class("modal");
        q("body").style.overflow = "hidden";
        document.body.appendChild(this.element);
    }
    generateBase() {
        this.clearChildren();
        this.body = new ElemJS("div").class("modal-body");
        this.child(
            new ElemJS("section").class("modal-child")
            .child(
                new ElemJS("header").text(this.titleText)
            ).child(
                this.body
            )
        )
    }
    dismiss() {
        q("body").style.overflow = "";
        this.element.remove();
    }
}

class ExportTypeModal extends Modal {
    constructor(callback) {
        super("Select export format");
        this.callback = callback;
        this.formats = [
            {
                name: "CloudTube/Invidious",
                generate: () => ({
                    subscriptions: lsm.array("subscriptions").array,
                    watch_history: lsm.get("trackWatchedVideos") == "1" ? lsm.array("watchedVideos").array : [],
                    preferences: []
                })
            }
        ]
        this.render();
    }
    render() {
        this.generateBase();
        this.select = new ElemJS("select");
        this.select.attribute("autocomplete", "off");
        this.formats.forEach(format => {
            let option = new ElemJS("option");
            option.text(format.name);
            option.format = format;
            this.select.child(option);
        });
        this.body.child(
            new ElemJS("div")
            .class("modal-expand")
            .child(this.select)
        ).child(
            new ElemJS("div")
            .class("modal-buttons")
            .child(
                new ElemJS("button")
                .text("Export")
                .direct("onclick", this.export.bind(this))
            ).child(
                new ElemJS("button")
                .text("Cancel")
                .direct("onclick", this.cancel.bind(this))
            )
        )
    }
    cancel() {
        this.callback(null);
        this.dismiss();
    }
    export() {
        let format = this.select.element.selectedOptions[0].js.format;
        let result = format.generate();
        this.callback(result);
        this.dismiss();
    }
}