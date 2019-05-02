class ElemJS {
    constructor(type) {
        this.element = document.createElement(type);
        this.element.js = this;
        this.children = [];
    }
    class() {
        for (let name of arguments) if (name) this.element.classList.add(name);
        return this;
    }
    direct(name, value) {
        if (name) this.element[name] = value;
        return this;
    }
    attribute(name, value) {
        if (name) this.element.setAttribute(name, value);
        return this;
    }
    style(name, value) {
        if (name) this.element.style[name] = value;
        return this;
    }
    id(name) {
        if (name) this.element.id = name;
        return this;
    }
    text(name) {
        this.element.innerText = name;
        return this;
    }
    html(name) {
        this.element.innerHTML = name;
        return this;
    }
    child(toAdd, position) {
        if (typeof(toAdd) == "object") {
            toAdd.parent = this;
            if (typeof(position) == "number") {
                this.element.insertBefore(toAdd.element, this.element.children[position]);
                this.children.splice(position, 0, toAdd);
            } else {
                this.element.appendChild(toAdd.element);
                this.children.push(toAdd);
            }
        }
        return this;
    }
    clearChildren() {
        this.children.length = 0;
        while (this.element.lastChild) this.element.removeChild(this.element.lastChild);
    }
    register(property) {
        this._link = property;
        return this;
    }
    link(property) {
        let children = [this];
        while (!this[property]) {
            let child = children.shift();
            if (child._link == property) {
                this[property] = child;
            } else {
                children = children.concat(child.children);
            }
        }
        return this;
    }
}