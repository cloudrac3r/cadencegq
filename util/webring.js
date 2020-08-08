const rp = require("request-promise")

let webring = {}
function fetchWebring() {
	rp("https://ring.knightsofthelambdacalcul.us/5/raw").then(body => {
		let links = []
		body.replace(/href="(.+?)">(.+?)<\//g, (substring, link, name) => {
			links.push({link, name})
		})
		if (links.length === 3) {
			Object.assign(webring, {
				home: links[1],
				previous: links[0],
				next: links[2]
			})
		}
	})
}
fetchWebring()
const webringFetchInterval = setInterval(fetchWebring, 2*60*60*1000)

module.exports = webring
