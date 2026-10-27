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
