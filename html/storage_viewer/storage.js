{
    let token = lsm.get("token");
    if (!token) {
        q("#storageLoading").textContent = "You are not logged in.";
        q("#storageLoading").classList.add("errorDisplay");
    }
    request("/api/friends/index?token="+token, response => {
        let data = JSON.parse(response.responseText);
        if (response.status != 200) {
            q("#storageLoading").classList.add("errorDisplay");
            if (data.code == 8) {
                q("#storageLoading").textContent = "Invalid login token. Please log in.";
            } else if (data.code == 11) {
                q("#storageLoading").textContent = "You are logged in, but your account is not permitted to access this page.";
            } else {
                q("#storageLoading").textContent = "An unknown error occurred. You probably don't have permission to access this page.";
            }
        } else {
            q("#storageLoading").style.display = "none";

            data.sort((a, b) => (b.modified - a.modified));

            let table = new ElemJS("table").child(new ElemJS("thead").child(new ElemJS("tr").child(
                new ElemJS("th").text("Filename")
            ).child(
                new ElemJS("th").text("Size")
            ).child(
                new ElemJS("th").text("Modified")
            )))
            let tbody = new ElemJS("tbody");
            table.child(tbody);
            
            data.forEach(file =>
                tbody.child(
                    new ElemJS("tr").child(
                        new ElemJS("td").child(
                            new ElemJS("a").text(file.filename).attribute("href", "/friends/"+file.filename)
                        )
                    ).child(
                        new ElemJS("td").text(file.size)
                    ).child(
                        new ElemJS("td").text(new Date(file.modified).toLocaleString())
                    )
                )
            )

            q("#tableContainer").appendChild(table.element);
        }
    });
}