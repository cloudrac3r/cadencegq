# [cadence.gq](https://cadence.gq/)

My website of utilities, including image hosting, URL shortening, and a pastebin.

## TODOs

- Add YouTube playlists
- Update database schema
- Consider changing cadence.gq to cadence.moe
- Add API request ranges

## Contributing

Got a bone to pick? Found a bug? Please, start a pull request or open an issue. I won't hurt you.

If you'd rather not share your thoughts with the entire world, you can talk to me privately using any of the details from [the contact page.](https://cadence.gq/about/contact)

## File organisation

|Directory   |Purpose   |
|------------|----------|
|api         |API modules|
|content     |User-submitted content|
|db          |Database files|
|html        |Files to give direct access to. URL aliases and templates are set in index.js|
|html/images |Pages for the images portion of the site (not images required on all pages)|
|html/fonts  |Fonts and images required on all pages|
|templates   |Templates to apply to HTML files|
|util        |Server utilities needed in more than one file|

## Running your own instance

I use Visual Studio Code to create this site, but of course you may use whatever text editor you like.

- Clone the repo
- `npm install`
- Create `db/main.db` according to the schema in `db/main-schema.sql`. `db/old.db`, an old version of the database, is also available, but note that modifications would be needed to use it with the current code.
- Create `auth.json` with the content `{"yt_api_key": "blah"}` replacing `blah` with an actual YouTube API key.
- If you want to use HTTPS, first obtain a Let's Encrypt certificate, then change `hostnames` in `index.js`. If you don't want to use HTTPS or just want to run the site behind a LAN, you don't have to change the hostname.
- Again, for HTTPS only, set your server's IP address at the bottom of `index.js`.
- Set the ports to use at the top of `index.js`.
- Change the contact details and crypto address in `html/about/contact.html`. Or don't, if you want people to send money to me instead of to you. Haha, who am I kidding. Nobody will ever send me money.
