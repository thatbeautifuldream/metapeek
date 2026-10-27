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

Reads metadata when you open the popup. If the current document has no sharing image or description, it automatically checks the same URL’s public HTML. No setup or source switching. If that request fails, the current page’s metadata remains available. Previews are approximate; checks do not verify crawler access or indexing.

No account or analytics. Uses `activeTab` and `scripting` permissions. OG images load from their original host.

## Development

Run `pnpm install`. On a new machine, install the development browser once with `pnpm exec extension --no-telemetry install chrome`. Then run `pnpm dev` to launch a development browser with MetaPeek loaded and automatic reloads on file changes. Stop it with Ctrl+C. Extension.js handles development, production builds, previews, and ZIP packaging.

You can also load this folder unpacked without development tooling. Save changes and reopen the popup; reload the extension when changing the manifest.

Run `pnpm test` for dependency-free logic checks. See [design research and verification notes](docs/DESIGN.md).

## Package

Run `pnpm release` to run tests and let Extension.js build and package `dist/metapeek-chrome.zip`. Upload that ZIP as the release asset. This command prepares the artifact locally; it does not publish a GitHub release.

- `pnpm build` creates the production extension in `dist/chrome/`.
- `pnpm preview` opens the production build in Chrome.
- `pnpm zip` builds and packages the extension without running tests.

Extension.js packages the compiled extension and static files from `public/`. The ZIP has `manifest.json` at its root and excludes `scripts/`, `docs/`, `node_modules/`, package manifests, lockfiles, and development reload code. Requires Node.js and pnpm; no system ZIP utilities or custom packaging scripts are needed.

Inter is bundled locally. [Font license](public/Inter-LICENSE.txt).
