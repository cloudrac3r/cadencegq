# [cadence.gq](https://cadence.gq/)

My website of utilities, including a YouTube player, image hosting, URL shortening, and a pastebin.

## TODOs

- Finish implementing YouTube playlists
- Consider changing cadence.gq to cadence.moe
- Add API request ranges

## Contributing

Got a bone to pick? Found a bug? Please, start a pull request or open an issue. I won't hurt you.

If you'd rather not share your thoughts with the entire world, you can talk to me privately using any of the details from [the contact page.](https://cadence.gq/about/contact)

If you're planning on writing some code of your own, please read a couple of paragraphs down in this document.

## Running your own instance

- Clone the repo
- `npm install`
- Create `db/main.db` according to the schema in `db/main-schema.sql`. `db/old.db`, an old version of the database, is also available, but note that modifications would be needed to use it with the current code.
- Create `auth.json` with the content `{"yt_api_key": "blah"}` replacing `blah` with an actual YouTube API key.
- If you want to use HTTPS, first obtain a Let's Encrypt certificate, then change `hostnames` in `index.js`. If you don't want to use HTTPS or just want to run the site behind a LAN, you don't have to change the hostname.
- Again, for HTTPS only, set your server's IP address at the bottom of `index.js`.
- Set the ports to use at the top of `index.js`.
- Change the contact details and crypto address in `html/about/contact.html`. Or don't, if you want people to send money to me instead of to you. Haha, who am I kidding. Nobody will ever send me money.

## File organisation

|Directory   |Purpose   |
|------------|----------|
|api         |API modules|
|content     |User-submitted content|
|db          |Database files|
|html        |Files to give direct access to. URL aliases and templates are set in index.js|
|html/images |Pages for the image hosting portion of the site|
|html/fonts  |Font files and small image files|
|templates   |Templates to apply to HTML files|
|util        |Server utilities needed in more than one file|

## Editing the code

I use Visual Studio Code to create this, but of course you may use whatever text editor you like.

Be sure to follow these guidelines for writing and formatting your code:

- End lines with semicolons, (optional for multi-line strings and lines that are entirely closing brackets)
- Indent with 4 spaces
- Indent where it makes sense
- Curly braces go on the same line as the `if` or `function`
- Strings are delimited with double quotes or backticks, not single quotes
- Use `let` or `const` instead of `var` where possible
- If logging strings, use `cf.log` rather than `console.log`

The front end must work correctly in the latest Firefox and Chrome for computers. Edge support would be nice, but I do not care about any other browsers. If it happens to work on mobile, great, but I have never actually tested on mobile and mobile support is not currently a priority.

Do not use any files hosted on other websites in the front end. For example, do not contact a CDN for images, fonts, or JavaScript libraries. If you really need other people's files, check their license, then copy them into the project.

Please try to keep the number of node modules to a minimum. Only install another module if you *really* need to.