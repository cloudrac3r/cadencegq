if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", makeHeadersWork);
} else {
    makeHeadersWork();
}

function makeHeadersWork() {
    let dropdowns = [...document.querySelectorAll("#header .headerArrow")];
    function dropdownToDiv(element) {
        return element.parentElement.children[[...element.parentElement.children].indexOf(element)+1];
    }
    window.addEventListener("click", event => {
        //console.log(event);
        if (event.target.tagName == "A" && event.target.classList.contains("headerButton")) return;
        dropdowns.forEach(e => dropdownToDiv(e).style.display = "none");
    });
    dropdowns.forEach(element => {
        let divElement = dropdownToDiv(element);
        element.addEventListener("click", () => {
            if (divElement.style.display != "block") setTimeout(() => {
                if (divElement.style.display != "block") divElement.style.display = "block";
                else divElement.style.display = "none";
            });
        });
    });
    document.querySelector("#headerExpandMenu").addEventListener("click", () => {
        document.querySelector("#header").classList.toggle("hidden");
    });
}
