// Dependency-free checks for URL handling, preview fallbacks, and audit semantics.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({ URL });
vm.runInContext(readFileSync(path.join(__dirname, '../popup.js'), 'utf8').split('const $ =')[0], context);
const { safeUrl, first, getPreview, audit } = context;
const page = entries => ({ url: 'https://example.com/page', base: 'https://example.com/docs/', tags: entries.map(([name, value]) => ({name, value})) });
const complete = [['title', 'Page title'], ['description', 'Page description'], ['canonical', '/page'], ['og:title', 'Social title'], ['og:description', 'Social description'], ['og:type', 'website'], ['og:url', '/page'], ['og:image', '/cover.jpg']];

test('URLs resolve relative paths and reject unsafe schemes', () => {
  assert.equal(safeUrl('../cover.jpg', 'https://example.com/docs/'), 'https://example.com/cover.jpg');
  for (const value of ['', ' ', 'javascript:alert(1)', 'data:image/png;base64,abc', 'file:///etc/passwd', 'https://[invalid']) assert.equal(safeUrl(value, 'https://example.com/'), null);
});
test('social preview uses OG while search uses document metadata', () => {
  const data = page(complete);
  assert.equal(getPreview(data, 'social').title.value, 'Social title');
  assert.equal(getPreview(data, 'search').title.value, 'Page title');
  assert.equal(getPreview(data, 'search').description.name, 'description');
});
test('lookup is case insensitive and skips blank fallback values', () => {
  const data = page([['OG:TITLE', '  '], ['title', 'Fallback'], ['og:image:url', '/cover.jpg']]);
  assert.equal(getPreview(data, 'social').title.value, 'Fallback');
  assert.equal(getPreview(data, 'social').image.name, 'og:image:url');
  assert.equal(first(data, 'absent').value, '');
});
test('complete metadata passes all ten checks', () => {
  assert.equal(audit(page(complete)).length, 10);
  assert.equal(audit(page(complete)).filter(check => check.level === 'review').length, 0);
});
test('missing data is actionable and review items sort first', () => {
  const checks = audit(page([['title', 'Present']]));
  assert.equal(checks[0].level, 'review');
  assert.ok(checks.find(check => check.title === 'og:title is missing').detail.includes('Add og:title'));
});
test('repeated images are allowed; repeated titles are flagged', () => {
  assert.equal(audit(page([...complete, ['og:image', '/second.jpg']])).filter(check => check.level === 'review').length, 0);
  assert.ok(audit(page([...complete, ['title', 'Other']])).some(check => check.title === 'Repeated single-value fields'));
});
test('robots noindex and none are recognized without matching unrelated words', () => {
  for (const value of ['noindex, follow', 'NOINDEX', 'none', 'max-snippet:10, noindex']) assert.ok(audit(page([...complete, ['robots', value]])).some(check => check.title === 'Page requests no indexing'));
  assert.ok(!audit(page([...complete, ['robots', 'index, follow']])).some(check => check.title === 'Page requests no indexing'));
});
test('invalid canonical and image URLs are flagged', () => {
  const checks = audit(page([['canonical', 'javascript:void(0)'], ['og:image', 'data:text/html,x']]));
  assert.ok(checks.some(check => check.title === 'canonical needs a valid URL'));
  assert.ok(checks.some(check => check.title === 'Social image is missing or invalid'));
});

test('inspection includes live metadata outside head without reading SVG titles', async () => {
  const tag = attrs => ({ getAttribute: name => attrs[name] ?? null, hasAttribute: name => name in attrs });
  const headMeta = tag({name: 'viewport', content: 'width=device-width'});
  const bodyMeta = [tag({property: ' og:title ', content: 'Client-rendered title'}), tag({property: 'og:image', content: '/social.jpg'}), tag({name: 'description', content: 'Client-rendered description'})];
  const icon = {...tag({href: '/icon.svg'}), rel: 'alternate icon', href: 'https://example.com/icon.svg'};
  const canonical = {...tag({href: '/page'}), rel: 'canonical'};
  const document = {
    baseURI: 'https://example.com/', querySelector: () => null,
    head: {querySelectorAll: selector => selector === 'title' ? [{textContent: 'Document title'}] : selector === 'meta' ? [headMeta] : []},
    querySelectorAll: selector => selector === 'meta' ? [headMeta, ...bodyMeta] : selector === 'link[rel]' ? [icon, canonical] : [],
  };
  const fixture = vm.createContext({URL, document, location: {href: 'https://example.com/page'}});
  vm.runInContext(readFileSync(path.join(__dirname, '../popup.js'), 'utf8').split('const $ =')[0], fixture);
  const data = await fixture.inspectPage();
  assert.equal(first(data, 'og:title').value, 'Client-rendered title');
  assert.equal(first(data, 'og:image').value, '/social.jpg');
  assert.equal(first(data, 'description').value, 'Client-rendered description');
  assert.equal(first(data, 'canonical').value, '/page');
  assert.equal(first(data, 'title').value, 'Document title');
  assert.equal(data.favicon, 'https://example.com/icon.svg');
});

test('social preview uses Twitter fallbacks without inventing missing Open Graph fields', () => {
  const data = page([['title', 'Page'], ['twitter:title', 'X title'], ['twitter:description', 'X description'], ['twitter:image', '/x.png']]);
  const preview = getPreview(data, 'social');
  assert.equal(preview.title.name, 'twitter:title'); assert.equal(preview.image.name, 'twitter:image');
  assert.equal(preview.description.value, 'X description');
  assert.ok(audit(data).some(check => check.title === 'og:title is missing'));
});

test('GitHub-style signed-in shell retrieves its real sharing metadata without source UI', async () => {
  const makeDocument = entries => ({
    baseURI: 'https://github.com/thatbeautifuldream/bakbak-monorepo',
    head: {querySelectorAll: () => [{textContent: 'Bakbak'}]},
    querySelector: () => null,
    querySelectorAll: selector => selector === 'meta' ? entries.map(([name, value]) => ({getAttribute: attr => attr === 'property' ? name : attr === 'content' ? value : null, hasAttribute: () => false})) : [],
  });
  const url = 'https://github.com/thatbeautifuldream/bakbak-monorepo';
  const image = 'https://opengraph.githubassets.com/09208f1fa7fe72bc372fcdf3e97c7ceb7bedc0070e8e8bee626864ae78b31ee4/thatbeautifuldream/bakbak-monorepo';
  const publicDoc = makeDocument([['og:title', 'GitHub - thatbeautifuldream/bakbak-monorepo: Talk to Website'], ['og:image', image], ['og:description', 'Talk to Website.']]);
  let requests = 0;
  const fixture = vm.createContext({URL, AbortSignal, document: makeDocument([]), location: {href:url},
    DOMParser: class {parseFromString(html, type) {assert.equal(html, '<html>fixture</html>'); assert.equal(type, 'text/html'); return publicDoc;}},
    fetch: async (requestUrl, options) => {
      requests++; assert.equal(requestUrl, url); assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
      return {ok: true, headers: {get: () => 'text/html; charset=utf-8'}, text: async () => '<html>fixture</html>'};
    },
  });
  vm.runInContext(readFileSync(path.join(__dirname, '../popup.js'), 'utf8').split('const $ =')[0], fixture);
  const data = await fixture.inspectPage();
  assert.equal(requests, 1); assert.equal(getPreview(data, 'social').image.value, image);
  assert.equal(getPreview(data, 'social').description.value, 'Talk to Website.');
  assert.equal(data.acquisition, 'html');
  fixture.fetch = async () => {throw new Error('Network unavailable');};
  const failed = await fixture.inspectPage();
  assert.equal(failed.acquisition, 'page'); assert.equal(first(failed, 'title').value, 'Bakbak');
});
