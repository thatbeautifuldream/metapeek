# MetaPeek

Shows the current page’s OG image and metadata in a Chrome popup.

## Install

1. [Download metapeek.zip](https://github.com/thatbeautifuldream/metapeek/releases/latest/download/metapeek.zip). Don’t unzip it.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Drag **metapeek.zip** from Finder or File Explorer onto that page.
4. Open a website and click MetaPeek in Chrome’s extensions menu.

If ZIP installation is blocked, extract it into a folder, click **Load unpacked**, and select the folder containing `manifest.json`. Keep that folder.

Fixed-size popup with the site’s favicon, OG image, and scrollable metadata. Long values scroll inside their rows.

Shows OG and Twitter tags, title, description, canonical URL, and robots tags. Reopen the popup to refresh. Chrome internal pages and the Web Store are restricted.

No build step, account, or analytics. Uses `activeTab` and `scripting` permissions. OG images load from their original host.

## Package

Run `node scripts/package.js` to package the latest commit into `metapeek.zip` in your system’s temp folder, with `manifest.json` at its root. Requires Node.js, Git, `zip`, and `unzip`.

Optional: `node scripts/package.js 0.0.3 /path/to/metapeek.zip`.
