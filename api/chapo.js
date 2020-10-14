const pat = require("../auth.json").gitlab_personal_access_token
const fetch = require("node-fetch")

let emojis = null
let emojisCached = 0

module.exports = [
	{
		route: "/api/chapo/emojis", methods: ["GET"], code: async () => {
			if (emojis && Date.now() - emojisCached < 60*60*1000) { // one hour
				return emojis
			} else {
				emojisCached = Date.now()
				return emojis = (async () => {
					async function fetchEmojis(page) {
						const url = `https://gitlab.com/api/v4/projects/19692201/repository/tree?path=ui/public/emojis&per_page=100&page=${page}`
						const res = await fetch(url, {
							headers: {
								"PRIVATE-TOKEN": pat
							}
						})
						const headers = res.headers
						const files = await res.json()
						return {
							headers,
							files
						}
					}

					const first = await fetchEmojis(1)
					let result = first.files
					const totalPages = first.headers.get("X-Total-Pages")
					if (totalPages > 1) {
						result = result.concat(
							...await Promise.all(
								Array(totalPages-1).fill().map((_, i) => fetchEmojis(i+2).then(x => x.files))
							)
						)
					}
					return {
						statusCode: 200,
						contentType: "application/json",
						content: result
					}
				})()
			}
		}
	}
]
