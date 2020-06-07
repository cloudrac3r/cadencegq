let dropdowns

class Dropdown {
    constructor(alignmentElement) {
        this.alignmentElement = alignmentElement
        this.title = this.alignmentElement.firstElementChild
        this.title.addEventListener("click", this.onClick.bind(this))
        this.contents = this.alignmentElement.lastElementChild
        this.contents.addEventListener("click", event => event.stopPropagation())
        this.hide()
    }
    show() {
        dropdowns.forEach(d => d.hide())
        this.title.setAttribute("aria-expanded", "true")
        this.contents.style.display = "block"
        this.visible = true
    }
    hide() {
        this.title.setAttribute("aria-expanded", "false")
        this.contents.style.display = "none"
        this.visible = false
    }
    onClick(event) {
        if (this.visible) this.hide()
        else this.show()
        event.preventDefault()
        event.stopPropagation()
    }
}

dropdowns = [...document.querySelectorAll(".dropdown-alignment")].map(a => new Dropdown(a))

window.addEventListener("click", () => {
    dropdowns.forEach(d => d.hide())
})

document.querySelector("#headerExpandMenu").addEventListener("click", () => {
    document.querySelector("#header").classList.toggle("hidden")
})
