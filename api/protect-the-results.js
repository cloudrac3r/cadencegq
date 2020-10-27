const {render} = require("pinski/plugins")
const fetch = require("node-fetch")

let data = null
let lastLoaded = null

function loadPage(page) {
	const url = `https://api.mobilize.us/v1/events?include_promoted=1&organization_id=4991&page=${page}&per_page=100&timeslot_start=gte_now`
	return fetch(url).then(res => res.json()).then(root => root.data)
}

const allowedTimeZones = new Map([
	["UTC", "UTC"],
	["Pacific/Honolulu", "Hawaii (Pacific/Honolulu)"],
	["America/Anchorage", "Alaska (America/Anchorage)"],
	["America/Los_Angeles", "PT (America/Los_Angeles)"],
	["America/Phoenix", "MST (America/Phoenix)"],
	["America/Chicago", "CT (America/Chicago)"],
	["America/New_York", "ET (America/New_York)"]
])

async function loadAllPages() {
	let ok = true
	let pageNo = 1
	let events = []
	while (ok) {
		const page = await loadPage(pageNo)
		if (page == null) {
			ok = false
		} else {
			events = events.concat(page)
			pageNo++
		}
	}
	const states = new Map()
	events = events.filter(event => {
		return event.address_visibility === "PUBLIC" // only events with location available
	})
	events.forEach(event => {
		const state = event.location.region
		if (states.has(state)) states.get(state).push(event)
		else states.set(state, [event])
	})
	const sortedStates = [...states.keys()].sort()
	data = {
		states: sortedStates.map(key => ({
			code: key,
			events: states.get(key).sort((a, b) => {
				if (a.location.postal_code < b.location.postal_code) return -1
				else if (b.location.postal_code > a.location.postal_code) return 1
				else return 0
			})
		}))
	}
	lastLoaded = Date.now()
	console.log(`ProtectTheResults: Loaded ${sortedStates.length} states and ${events.length} events`)
}

loadAllPages()
setInterval(() => loadAllPages(), 60*60*1000).unref()

module.exports = [
	{route: "/misc/protect-the-results", methods: ["GET"], code: ({url}) => {
		const params = url.searchParams
		const options = {}
		if (allowedTimeZones.has(params.get("timezone"))) {
			options.timezone = params.get("timezone")
		} else {
			options.timezone = "UTC"
		}
		return Promise.resolve(render(200, "pug/protect-the-results.pug", {lastLoaded, options, allowedTimeZones, data}))
	}}
]
