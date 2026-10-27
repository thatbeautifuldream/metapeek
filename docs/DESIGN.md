# MetaPeek design notes

Research date: October 27, 2026. Consulted the connected Mobbin MCP and examined six web screen previews from Linear and Vercel. The implementation remains plain HTML, CSS, and JavaScript with a bundled Inter font. No runtime packages, build tooling, additional permissions, or backend were introduced.

## References applied

[Vercel’s Open Graph inspector](https://mobbin.com/screens/59accd16-ad18-4d18-9247-6f366473e52e) pairs a sharing preview with metadata explanations, explicit missing values, and copy actions. MetaPeek adopts the relationship between visible output and its source fields. It shows the source names and describes missing fields in Checks. Its preview is deliberately an approximation rather than a claim to reproduce a platform renderer.

[Linear’s project properties](https://mobbin.com/screens/c2cbaff3-1a8d-4fd4-af9a-c5c31533082c) use restrained typography, compact labels, and low-contrast separation. MetaPeek applies that density to metadata while allowing values to wrap at their natural height. One scrolling content region replaces the old nested scrolling inside fixed-height rows.

[Vercel’s model list](https://mobbin.com/screens/61429e4f-029d-42b1-95a9-578e24114b18) puts search and category filtering together above the data. MetaPeek uses that pattern for tag names and values, with General, Open Graph, and Twitter / X groups.

[Vercel’s logs](https://mobbin.com/screens/c6b747bc-29d1-4b25-806d-2bd2ac71633f) keeps refresh and export utilities close to the inspection workflow. MetaPeek exposes refresh in the header and a report action in the persistent footer.

Also examined [Linear’s project editor](https://mobbin.com/screens/b9e792b3-0f36-4269-a805-3e2ad3903a4b) and [project details](https://mobbin.com/screens/2915c8d2-e8b4-4dc9-8e11-387331c5cd41). Their large workspace shells are not appropriate for an extension popup, so MetaPeek uses a compact, single-column layout.

## Product decisions

The initial view answers what sharing this page might look like. Search preview is a second mode. Preview sources reveal fallback behavior: social title and description prefer Open Graph, then Twitter, then page metadata; search uses the document title and meta description. Twitter / X values remain directly inspectable in Tags; the social preview uses Open Graph rather than claiming a platform-specific X renderer.

Tags shows actual named metadata, title elements, and canonical links from the current page. Empty values and duplicates remain visible. Search matches both names and values, individual values can be copied, and `/` focuses search. Long values wrap without inner scrollbars. The report contains every collected field and the checklist results regardless of the selected filter.

Checks puts review items first and avoids a synthetic SEO score. Missing required Open Graph properties follow the [Open Graph protocol](https://ogp.me/); description and canonical checks are suggestions. Repeated images are permitted. Repeated single-value metadata, invalid HTTP(S) URLs, and noindex directives are called out. [Google documents no fixed title length limit](https://developers.google.com/search/docs/appearance/title-link), so character counts are descriptive rather than arbitrary pass/fail rules.

The extension reads the current page and automatically checks its public HTML when sharing metadata is absent. It does not inspect robots.txt, guarantee indexing, or test platform caches. Image failures are reported separately from missing metadata. Remote images and favicons are requested without a referrer.

## Verification

Run `node --test scripts/test.js` for dependency-free tests covering URL safety, fallback selection, missing metadata, duplicates, noindex directives, and invalid URLs. Additional DOM checks in a temporary jsdom environment exercised extraction, navigation, filtering, copy, keyboard search, refresh, failed images, stale image events, restricted pages, and retry. Chromium fixture rendering was inspected through Argent at the popup’s 600px content height. The fixture mocks Chrome APIs; this does not replace checking the loaded extension on real websites.


## Metadata retrieval

The popup uses a single self-contained inspection function in the active tab, following the direct scripting pattern in [Superlevels’ popup source](https://github.com/levelsio/superlevels/blob/main/popup.js). Superlevels has no OG metadata inspector; it does not solve this specific metadata retrieval case.

Verified in the user’s Chrome on `github.com/thatbeautifuldream/bakbak-monorepo`: the signed-in document had 28 meta elements with no sharing metadata. Fetching the same URL without credentials returned HTTP 200 with an OG title, description, and 1200 × 600 image. A DOM-only inspector therefore misses the public sharing data on this page.

If the live document lacks a sharing image and description, the inspection function requests the same URL’s public HTML and uses that document when it contains sharing metadata. This is automatic, with no source selector or cookie banner. A ten-second timeout, redirect rejection, HTML content-type check, response size limit, and URL-change guard bound the request. Failure preserves current-page data. Reports record whether metadata came from the current document or fetched HTML. No new permissions, dependencies, servers, or background processes are required.

Verification: eleven dependency-free tests pass, including a regression for this exact GitHub metadata gap and network failure. DOM interaction checks cover navigation, filtering, copy, refresh, image errors, and retry. Updating the already-installed Chrome extension remains manual because automation of chrome://extensions is blocked by browser policy.
