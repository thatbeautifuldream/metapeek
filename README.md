# MetaPeek

Shows the current page’s OG image and metadata in a Chrome popup.

<details>
<summary>Screenshot from 0.0.1</summary>

<img width="419" height="601" alt="Screenshot 2026-10-27 at 5 34 42 PM" src="https://github.com/user-attachments/assets/39460e55-a40e-480e-a15e-d5436d8bad0d" />

</details>

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

Run `python3 scripts/package.py` to create `/tmp/metapeek.zip` with `manifest.json` at its root.
