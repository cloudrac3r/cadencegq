// @ts-check

const {render} = require("pinski/plugins")
const pug = require("pug")
const {db, extra, pugCache} = require("../passthrough")

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
		const posts = await db.all("SELECT * FROM BlogPosts ORDER BY year DESC, month DESC, day DESC")
		const timeline = new Timeline()
		for (const post of posts) {
			timeline.addPost(post)
		}
		return render(200, "pug/blog-list.pug", {
			years: timeline.export()
		})
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
		await db.run("INSERT INTO BlogPosts (year, month, day, title, slug, content) VALUES (?, ?, ?, ?, ?, ?)", [
			params.get("year"), params.get("month"), params.get("day"), params.get("title"), slug, params.get("content")
		])
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
			const rendered = pug.render(post.content)
			return render(200, "pug/blog-post.pug", {
				post,
				rendered
			})
		} else {
			return [404, "404: Blog post not found."]
		}
	}}
]
