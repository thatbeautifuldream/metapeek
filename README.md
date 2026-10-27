# MetaPeek

Inspect the current page’s metadata, preview its search and social appearance, and find missing fields in a compact Chrome popup.

## Install

1. [Download metapeek.zip](https://github.com/thatbeautifuldream/metapeek/releases/latest/download/metapeek.zip). Don’t unzip it.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Drag **metapeek.zip** from Finder or File Explorer onto that page.
4. Open a website and click MetaPeek in Chrome’s extensions menu.

If ZIP installation is blocked, extract it into a folder, click **Load unpacked**, and select the folder containing `manifest.json`. Keep that folder.

- **Preview:** approximate social and search cards, image dimensions, and the tags used for each preview.
- **Tags:** search names or values, filter General / Open Graph / Twitter tags, and copy individual values. Press `/` to search.
- **Checks:** review missing fields, invalid URLs, duplicate single-value tags, and noindex directives.
- **Copy report:** copy all collected metadata and check results. **Refresh** reinspects the active page.

The popup is 440 × 600 pixels. Values wrap in a single scrolling content area. Chrome internal pages and the Web Store are restricted.

Inspection uses the rendered document head. Previews are approximate; platform crawlers can see different HTML. Checks do not verify HTTP headers, robots.txt, crawler access, or indexing.

No build step, account, or analytics. Uses `activeTab` and `scripting` permissions. OG images load from their original host.

## Development

Load this folder as an unpacked extension. After editing, reload MetaPeek at `chrome://extensions` and reopen its popup. No build step is needed.

Run `pnpm test` for dependency-free logic checks. See [design research and verification notes](DESIGN.md).

## Package

Run `pnpm release` to run tests and create `dist/metapeek.zip` from the current files, including uncommitted changes. Upload that ZIP as the release asset. This command prepares the artifact locally; it does not publish a GitHub release.

Use `pnpm zip` to create the ZIP without running tests. To package a specific Git tag or commit, use `pnpm zip 0.0.3`; optionally add an output path: `pnpm zip 0.0.3 /path/to/metapeek.zip`.

Only the extension manifest, popup HTML/CSS/JS, and bundled fonts/license are included. Package manifests, lockfiles, development scripts, documentation, and `node_modules` are excluded. Requires Node.js, pnpm, `zip`, and `unzip`; packaging a Git ref also requires Git.

Inter is bundled locally. [Font license](fonts/LICENSE.txt).
