// @ts-check

const {render} = require("pinski/plugins")
const pug = require("pug")
const {Feed} = require("feed")
const {db, extra, pugCache} = require("../passthrough")
const rp = require("request-promise")
const webring = require("../util/webring")

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

/**
 * @typedef Post
 * @property {number} id
 * @property {number} year
 * @property {number} month
 * @property {number} day
 * @property {string} title
 * @property {string} slug
 * @property {string} content
 * @property {number} previous
 */

undefined

class GroupContainer {
	constructor(childClass) {
		this.childClass = childClass
		this.children = new Map()
	}

	getOrCreateChild(id) {
		if (this.children.has(id)) return this.children.get(id)
		const child = new this.childClass(id)
		this.children.set(id, child)
		return child
	}
}

class Timeline extends GroupContainer {
	constructor() {
		super(Year)
	}

	addPost(post) {
		const year = this.getOrCreateChild(post.year)
		year.addPost(post)
	}

	export() {
		return [...this.children.values()].map(year => ({
			number: year.number,
			months: [...year.children.values()].map(month => ({
				number: month.number,
				name: monthNames[month.number-1],
				posts: month.posts.map(post => {
					const date = new Date()
					date.setUTCFullYear(post.year)
					date.setUTCMonth(post.month-1)
					date.setUTCDate(post.day)
					return {
						date: date.toISOString().split("T")[0],
						slug: post.slug,
						title: post.title
					}
				})
			}))
		}))
	}
}

class Year extends GroupContainer {
	constructor(number) {
		super(Month)
		this.number = number
	}

	/**
	 * @param {Post} post
	 */
	addPost(post) {
		const month = this.getOrCreateChild(post.month)
		month.addPost(post)
	}
}

class Month {
	constructor(number) {
		this.number = number
		/** @type {Post[]} */
		this.posts = []
	}

	/** @param {Post} post */
	addPost(post) {
		this.posts.push(post)
	}
}

module.exports = [
	{route: "/blog", methods: ["GET"], code: async () => {
		/** @type {Post[]} */
		const posts = await db.all("SELECT * FROM BlogPosts ORDER BY published DESC")
		const timeline = new Timeline()
		for (const post of posts) {
			timeline.addPost(post)
		}
		return render(200, "pug/blog-list.pug", {
			years: timeline.export()
		})
	}},

	{route: "/blog/(rss|atom)\\.xml", methods: ["GET"], code: async ({fill, url}) => {
		const query = url.searchParams
		let limit = parseInt(query.get("limit")) || 30
		if (limit < 0) limit = 30

		const feed = new Feed({
			title: "Cadence's Blog",
			id: "https://cadence.moe/blog",
			description: "https://cadence.moe/blog",
			link: "https://cadence.moe/blog",
			feedLinks: {
				rss: "https://cadence.moe/blog/rss.xml",
				atom: "https://cadence.moe/blog/atom.xml"
			},
			author: {
				name: "Cadence Ember",
				link: "https://cadence.moe/blog"
			}
		})
		const rows = await db.all("SELECT * FROM BlogPosts ORDER BY published DESC LIMIT ?", limit)
		for (const row of rows) {
			feed.addItem({
				title: row.title,
				description: pug.render(row.content),
				link: `https://cadence.moe/blog/${row.slug}`,
				id: `https://cadence.moe/blog/${row.slug}`,
				published: new Date(row.published), // first published date
				date: new Date(row.published) // last modified date
			})
		}

		const kind = fill[0]
		if (kind === "rss") {
			var data = {
				contentType: "application/rss+xml", // see https://stackoverflow.com/questions/595616/what-is-the-correct-mime-type-to-use-for-an-rss-feed,
				content: feed.rss2()
			}
		} else if (kind === "atom") {
			var data = {
				contentType: "application/atom+xml", // see https://en.wikipedia.org/wiki/Atom_(standard)#Including_in_HTML
				content: feed.atom1()
			}
		}

		return {
			statusCode: 200,
			contentType: data.contentType,
			headers: {
				"Cache-Control": "public, max-age=600"
			},
			content: data.content
		}
	}},

	{route: "/blog/write", methods: ["GET"], code: async () => {
		const draft = await db.get("SELECT * FROM BlogDrafts")
		let locals = {}
		if (draft) {
			locals = draft
		}
		return render(200, "pug/blog-write.pug", locals)
	}},

	{route: "/blog/submit", methods: ["POST"], upload: "true", code: async ({body}) => {
		const params = new URLSearchParams(body.toString())
		if (!params.has("token")) return [401, 8];
		let row = await db.get("SELECT Accounts.userID, expires FROM Accounts INNER JOIN AccountTokens ON Accounts.userID = AccountTokens.userID WHERE token = ?", params.get("token"));
		if (!row || row.expires <= Date.now()) return [401, 8];
		if (row.userID !== 1) return [403, 11];
		console.log(params)
		const slug = params.get("year") + "-" + params.get("month").padStart(2, "0") + "-" + params.get("day").padStart(2, "0") + "-" + params.get("slug")
		await db.run("DELETE FROM BlogDrafts")
		const existing = await db.get("SELECT * FROM BlogPosts WHERE slug = ?", slug)
		if (existing) {
			await db.run("UPDATE BlogPosts SET content = ? WHERE slug = ?", [params.get("content"), slug])
		} else {
			const latest = await db.get("SELECT * FROM BlogPosts ORDER BY published DESC limit 1")
			await db.run("INSERT INTO BlogPosts (year, month, day, title, slug, content, published, previous) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
				params.get("year"), params.get("month"), params.get("day"), params.get("title"), slug, params.get("content"), Date.now(), latest.id
			])
		}
		// https://github.com/bkardell/auto-archive
		console.log(`Sending page to the wayback machine: https://cadence.moe/blog/${slug}`)
		rp("https://dawn-rain-4cff.bkardell.workers.dev", {
			method: "POST",
			json: true,
			body: {
				snapshotURL: `https://cadence.moe/blog/${slug}`
			}
		}).then(() => {
			console.log("Page archived!")
		}).catch(error => {
			console.log("Page wasn't archived:", error)
		})
		return {
			statusCode: 303,
			contentType: "text/html",
			content: "Redirecting...",
			headers: {
				"Location": "/blog/"+slug
			}
		}
	}},

	{route: "/blog/draft", methods: ["POST"], upload: "true", code: async ({body}) => {
		const params = new URLSearchParams(body.toString())
		if (!params.has("token")) return [401, 8];
		let row = await db.get("SELECT Accounts.userID, expires FROM Accounts INNER JOIN AccountTokens ON Accounts.userID = AccountTokens.userID WHERE token = ?", params.get("token"));
		if (!row || row.expires <= Date.now()) return [401, 8];
		if (row.userID !== 1) return [403, 11];
		console.log(params)
		await db.run("DELETE FROM BlogDrafts")
		await db.run("INSERT INTO BlogDrafts (year, month, day, title, slug, content) VALUES (?, ?, ?, ?, ?, ?)", [
			params.get("year"), params.get("month"), params.get("day"), params.get("title"), params.get("slug"), params.get("content")
		])
		return {
			statusCode: 303,
			contentType: "text/html",
			content: "Redirecting...",
			headers: {
				"Location": "/blog/write"
			}
		}
	}},

	{route: "/blog/(\\d[\\w-]+)", methods: ["GET"], code: async ({fill}) => {
		/** @type {Post} */
		const post = await db.get("SELECT * FROM BlogPosts WHERE slug = ?", fill[0])
		if (post) {
			const previous = await db.get("SELECT * FROM BlogPosts WHERE id = ?", post.previous)
			const next = await db.get("SELECT * FROM BlogPosts WHERE previous = ?", post.id)
			const rendered = pug.render(post.content)
			const date = new Date()
			date.setUTCFullYear(post.year)
			date.setUTCMonth(post.month-1)
			date.setUTCDate(post.day)
			const dateText = date.toISOString().split("T")[0]
			return render(200, "pug/blog-post.pug", {
				post,
				rendered,
				previous,
				next,
				dateText,
				webring
			})
		} else {
			return [404, "404: Blog post not found."]
		}
	}},

	{route: "/blog/(\\d[\\w-]+)/edit", methods: ["GET"], code: async ({fill}) => {
		/** @type {Post} */
		const post = await db.get("SELECT * FROM BlogPosts WHERE slug = ?", fill[0])
		post.slug = post.slug.split("-").slice(3).join("-") || post.slug
		if (post) {
			return render(200, "pug/blog-write.pug", post)
		} else {
			return [404, "404: Blog post not found."]
		}
	}}
]
