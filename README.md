# [cadence.moe](https://cadence.moe/)

My website of utilities, including a YouTube player, image hosting, URL shortening, and a pastebin.

## TODOs

- Finish implementing YouTube playlists
- Add API request ranges

## Contributing

Got a bone to pick? Found a bug? Please, start a pull request or open an issue. I won't hurt you.

If you'd rather not share your thoughts with the entire world, you can talk to me privately using any of the details from [the contact page.](https://cadence.moe/about/contact)

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
