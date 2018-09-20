if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", makeHeadersWork);
} else {
    makeHeadersWork();
}

function makeHeadersWork() {
    let dropdowns = [...document.querySelectorAll("#header > .headerArrow")];
    function dropdownToDiv(element) {
        return element.parentElement.children[[...element.parentElement.children].indexOf(element)-1];
    }
    window.addEventListener("mousedown", event => {
        //console.log(event);
        if (event.target.tagName == "A" && event.target.classList.contains("headerButton")) return;
        dropdowns.forEach(e => dropdownToDiv(e).style.display = "none");
    });
    dropdowns.forEach(element => {
        let divElement = dropdownToDiv(element);
        element.addEventListener("mousedown", () => {
            if (divElement.style.display != "inline-block") setTimeout(() => {
                if (divElement.style.display != "inline-block") divElement.style.display = "inline-block";
                else divElement.style.display = "none";
            });
        });
    });
    q("#headerExpandMenu").addEventListener("mousedown", () => {
        q("#header").classList.toggle("hidden");
    });
}