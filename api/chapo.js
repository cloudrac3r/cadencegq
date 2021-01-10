const pat = require("../auth.json").gitlab_personal_access_token
const fetch = require("node-fetch")
const {redirect} = require("pinski/plugins")

let emojis = null
let emojisCached = 0

module.exports = [
	{
		route: "/misc/chapo-chat-emojis", methods: ["GET"], code: async () => {
			return redirect("https://www.chapo.chat/post/71337", 302)
		}
	},

	{
		route: "/api/chapo/emojis", methods: ["GET"], code: async () => {
			return redirect("https://www.chapo.chat/post/71337", 302)

			if (emojis && Date.now() - emojisCached < 60*60*1000) { // one hour
				return emojis
			} else {
				emojisCached = Date.now()
				return emojis = fetch("https://git.chapo.chat/api/v1/repos/chapo-collective/hexbear-frontend/contents/public/emojis/").then(res => res.json()).then(root => {
					return {
						statusCode: 200,
						contentType: "application/json",
						content: root
					}
				})
			}
		}
	}
]
