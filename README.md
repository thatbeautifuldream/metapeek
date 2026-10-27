# MetaPeek

A tiny Chrome extension for debugging the current page’s OG image and relevant metadata. Click the extension, see the image and tags. That’s it.

## Install

1. Clone this private repository (requires access):
   ```sh
   git clone https://github.com/thatbeautifuldream/metapeek.git
   ```
   Or download and extract the repository ZIP from GitHub.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the `metapeek` folder containing `manifest.json`.
5. Pin **MetaPeek** from Chrome’s extensions menu, visit a website, and click its icon.

No dependencies, build step, account, or backend.

## What it shows

- The first nonempty `og:image` / `og:image:url`, clickable to open the full image
- Page title and canonical URLs
- Description, robots, googlebot, author, and viewport tags
- All Open Graph (`og:*`) and Twitter (`twitter:*`) tags
- Duplicate tags, empty values, and missing core OG fields

Values are read from the page’s current DOM, including JavaScript updates already made when you open the popup. This is not a social crawler or a cache checker. Reopen the popup to refresh. Image hosts can block loading; the original URL remains visible in the metadata.

Chrome internal pages, the Chrome Web Store, and other protected pages cannot be inspected. Only HTTP(S) websites are supported.

## Privacy and permissions

Manifest V3. Only `activeTab` and `scripting` are requested, to read the active page when you click the extension. No persistent access to all websites, storage, analytics, or background process. The OG image is loaded directly from its URL, so its host receives a normal image request.

## Development

Edit `popup.html`, `popup.css`, or `popup.js`, then click **Reload** on the extension at `chrome://extensions` and reopen the popup. No compilation required.

Inter is bundled locally under the SIL Open Font License; see `fonts/LICENSE.txt`.
