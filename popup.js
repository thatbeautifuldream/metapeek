// Injected into the active page; keep self-contained.
function inspectPage() {
  const head = document.head;
  const tags = [...head.querySelectorAll('meta')].map(tag => ({
    name: tag.getAttribute('property') || tag.getAttribute('name') || tag.getAttribute('http-equiv') || (tag.hasAttribute('charset') ? 'charset' : ''),
    value: tag.getAttribute('content') || tag.getAttribute('charset') || '',
  })).filter(tag => tag.name);
  const canonical = [...head.querySelectorAll('link[rel]')]
    .filter(link => link.rel.toLowerCase().split(/\s+/).includes('canonical'))
    .map(link => ({ name: 'canonical', value: link.getAttribute('href') || '' }));
  return {
    url: location.href, base: document.baseURI,
    favicon: [...head.querySelectorAll('link[rel]')].find(link => link.rel.toLowerCase().split(/\s+/).includes('icon'))?.href || new URL('/favicon.ico', location.href).href,
    tags: [...head.querySelectorAll('title')].map(tag => ({name: 'title', value: tag.textContent})).concat(canonical, tags),
  };
}

function safeUrl(value, base) {
  if (!value?.trim()) return null;
  try { const url = new URL(value, base); return /^https?:$/.test(url.protocol) ? url.href : null; }
  catch { return null; }
}
function values(data, name) { return data.tags.filter(tag => tag.name.toLowerCase() === name).map(tag => tag.value.trim()); }
function first(data, ...names) {
  for (const name of names) { const value = values(data, name).find(Boolean); if (value) return { name, value }; }
  return { name: 'Not provided', value: '' };
}
function getPreview(data, mode) {
  const social = mode === 'social';
  return {
    title: first(data, ...(social ? ['og:title', 'title'] : ['title'])),
    description: first(data, ...(social ? ['og:description', 'description'] : ['description'])),
    image: first(data, 'og:image', 'og:image:url'),
    url: first(data, ...(social ? ['og:url', 'canonical'] : ['canonical'])),
  };
}
function audit(data) {
  const checks = [];
  const add = (ok, title, detail) => checks.push({ level: ok ? 'pass' : 'review', title, detail });
  for (const [name, help] of [
    ['title', 'Add a descriptive <title> to identify this page in browser tabs and search.'],
    ['description', 'Add a meta description that summarizes this page. Search engines may use other text.'],
    ['canonical', 'Consider a canonical link to identify the preferred URL for this content.'],
    ['og:title', 'Add og:title to control the title in social link previews.'],
    ['og:description', 'Add og:description to describe the page when shared.'],
    ['og:type', 'Add og:type, such as website or article.'],
    ['og:url', 'Add og:url to identify this page in Open Graph.'],
  ]) {
    const found = first(data, name).value;
    const isUrl = name === 'canonical' || name === 'og:url';
    const ok = Boolean(found && (!isUrl || safeUrl(found, data.base)));
    add(ok, ok ? `${name} is present` : found ? `${name} needs a valid URL` : `${name} is missing`, ok ? (isUrl ? safeUrl(found, data.base) : `${found.length} characters. Present does not guarantee how platforms display it.`) : help);
  }
  const image = first(data, 'og:image', 'og:image:url');
  const imageUrl = safeUrl(image.value, data.base);
  add(Boolean(imageUrl), imageUrl ? 'Social image is defined' : 'Social image is missing or invalid', imageUrl ? 'Image URL is valid. Loading here does not confirm that social crawlers can access it.' : 'Add og:image with an accessible image URL.');
  const robots = ['robots', 'googlebot'].flatMap(name => values(data, name)).join(',');
  const noindex = /(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/i.test(robots);
  add(!noindex, noindex ? 'Page requests no indexing' : 'No noindex meta directive found', noindex ? 'A robots or googlebot meta tag includes noindex (or none). Confirm that this is intentional.' : 'This checks meta tags only. HTTP headers and robots.txt are not inspected.');
  const duplicateNames = ['title', 'description', 'canonical', 'og:title', 'og:description', 'og:type', 'og:url', 'twitter:card', 'twitter:title', 'twitter:description'];
  const duplicates = duplicateNames.filter(name => values(data, name).length > 1);
  add(!duplicates.length, duplicates.length ? 'Repeated single-value fields' : 'No repeated single-value fields', duplicates.length ? `Review ${duplicates.join(', ')}. Consumers may choose different values. Multiple Open Graph images are allowed.` : 'Title, description, canonical, and primary social text fields are not repeated.');
  return checks.sort((a, b) => (a.level === 'review' ? 0 : 1) - (b.level === 'review' ? 0 : 1));
}

const $ = selector => document.querySelector(selector);
let pageData = null;
let currentView = 'preview';
let previewMode = 'social';
let filter = 'all';
let inspection = 0;
let feedbackTimer;

function announce(message) {
  clearTimeout(feedbackTimer);
  $('#footer-status').textContent = message;
  feedbackTimer = setTimeout(() => {
    $('#footer-status').textContent = pageData ? `${pageData.tags.length} tags · Rendered HTML` : 'No page inspected';
  }, 2500);
}
async function copy(text, message) {
  try { await navigator.clipboard.writeText(text); announce(message); }
  catch { announce('Copy failed. Please try again.'); }
}
function showView(view) {
  currentView = view;
  for (const button of document.querySelectorAll('[data-view]')) {
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  for (const name of ['preview', 'tags', 'checks']) $(`#${name}-panel`).hidden = name !== view;
  $('#workspace').scrollTop = 0;
}
function renderTags() {
  if (!pageData) return;
  const query = $('#search').value.trim().toLowerCase();
  const tags = pageData.tags.filter(tag => {
    const group = /^og:/i.test(tag.name) ? 'og' : /^twitter:/i.test(tag.name) ? 'twitter' : 'general';
    return (filter === 'all' || filter === group) && `${tag.name} ${tag.value}`.toLowerCase().includes(query);
  });
  const fragment = document.createDocumentFragment();
  for (const { name, value } of tags) {
    const row = document.createElement('div'); row.className = 'row';
    const term = document.createElement('dt'); term.textContent = name;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'copy-value'; button.textContent = 'Copy'; button.setAttribute('aria-label', `Copy ${name}`);
    button.addEventListener('click', () => copy(value, `Copied ${name}`));
    term.append(button);
    const detail = document.createElement('dd'); detail.textContent = value.trim() ? value : 'Empty value';
    row.append(term, detail); fragment.append(row);
  }
  $('#metadata').replaceChildren(fragment);
  $('#results-count').textContent = `${tags.length} of ${pageData.tags.length} tags`;
  $('#no-results').hidden = tags.length > 0;
}
function renderSources(preview) {
  const fragment = document.createDocumentFragment();
  for (const [label, source] of [['Title', preview.title], ['Description', preview.description], ...(previewMode === 'social' ? [['Image', preview.image]] : []), ['URL', preview.url]]) {
    const row = document.createElement('div'); row.className = 'source';
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'); dd.textContent = source.value ? source.name : label === 'URL' ? 'Current page URL' : 'Not provided';
    row.append(dt, dd); fragment.append(row);
  }
  $('#sources').replaceChildren(fragment);
}
function renderPreview() {
  const preview = getPreview(pageData, previewMode);
  const host = new URL(pageData.url).hostname;
  $('#social-preview').hidden = previewMode !== 'social';
  $('#search-preview').hidden = previewMode !== 'search';
  for (const button of document.querySelectorAll('[data-preview]')) button.setAttribute('aria-pressed', String(button.dataset.preview === previewMode));
  $('#preview-domain').textContent = first(pageData, 'og:site_name').value || host;
  $('#preview-title').textContent = preview.title.value || 'No title provided';
  $('#preview-description').textContent = preview.description.value || 'No description provided.';
  $('#search-site').textContent = host;
  $('#search-url').textContent = safeUrl(preview.url.value, pageData.base) || pageData.url;
  $('#search-title').textContent = preview.title.value || 'No title provided';
  $('#search-description').textContent = preview.description.value || 'No meta description provided. Search engines may generate a snippet from page content.';
  renderSources(preview);
}
function loadImage(data) {
  // Replace the node so a previous inspection's pending load cannot update this one.
  const previous = $('#image'); const image = previous.cloneNode(false); previous.replaceWith(image);
  image.removeAttribute('src'); image.style.opacity = '0';
  const link = $('#image-link'); link.removeAttribute('href');
  const status = $('#image-status'); status.hidden = false;
  $('#image-size').hidden = true;
  const source = first(data, 'og:image', 'og:image:url');
  const url = safeUrl(source.value, data.base);
  if (!url) { status.textContent = source.value ? 'Social image URL is invalid.' : 'No social image defined.'; return; }
  status.textContent = 'Loading social image…';
  image.onload = () => {
    if (!image.isConnected) return;
    image.style.opacity = '1'; status.hidden = true; link.href = url;
    $('#image-size').textContent = `${image.naturalWidth} × ${image.naturalHeight}`;
    $('#image-size').hidden = false;
  };
  image.onerror = () => { if (image.isConnected) status.textContent = 'Image could not be loaded. Its URL is available in Tags.'; };
  image.src = url;
}
function renderChecks() {
  const checks = audit(pageData);
  const count = checks.filter(check => check.level === 'review').length;
  $('#check-count').textContent = String(count);
  $('#check-count').classList.toggle('attention', count > 0);
  const heading = document.createElement('h1'); heading.textContent = count ? `${count} ${count === 1 ? 'item' : 'items'} to review` : 'The essentials are in place';
  const description = document.createElement('p'); description.textContent = count ? 'A focused checklist for search and sharing.' : 'All checks passed for the metadata inspected.';
  $('#check-summary').replaceChildren(heading, description);
  const fragment = document.createDocumentFragment();
  for (const check of checks) {
    const row = document.createElement('article'); row.className = 'check'; row.dataset.level = check.level;
    const mark = document.createElement('span'); mark.className = 'check-mark'; mark.textContent = check.level === 'pass' ? '✓' : '!'; mark.setAttribute('aria-label', check.level === 'pass' ? 'Passed' : 'Review');
    const content = document.createElement('div'); const title = document.createElement('h2'); title.textContent = check.title;
    const detail = document.createElement('p'); detail.textContent = check.detail;
    content.append(title, detail); row.append(mark, content); fragment.append(row);
  }
  $('#checks').replaceChildren(fragment);
}
function render(data) {
  pageData = data;
  $('#site').textContent = new URL(data.url).hostname; $('#site').title = data.url;
  $('#tag-count').textContent = String(data.tags.length);
  const favicon = $('#favicon'); favicon.style.opacity = '0'; favicon.removeAttribute('src');
  favicon.onload = () => { favicon.style.opacity = '1'; }; favicon.onerror = () => { favicon.style.opacity = '0'; };
  const faviconUrl = safeUrl(data.favicon, data.base); if (faviconUrl) favicon.src = faviconUrl;
  renderPreview(); loadImage(data); renderTags(); renderChecks(); showView(currentView);
  $('#copy-report').disabled = false;
  $('#footer-status').textContent = `${data.tags.length} tags · Rendered HTML`;
}
async function init() {
  const request = ++inspection;
  clearTimeout(feedbackTimer); pageData = null;
  $('main').setAttribute('aria-busy', 'true');
  $('#refresh').disabled = true; $('#retry').disabled = true; $('#copy-report').disabled = true;
  $('#error').hidden = true; $('#workspace').hidden = false;
  $('#footer-status').textContent = 'Inspecting metadata…'; $('#page-state').textContent = 'Reading';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:\/\//i.test(tab.url || '')) throw new Error('Open an HTTP or HTTPS website, then refresh. Browser pages and extension pages cannot be inspected.');
    const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: inspectPage });
    if (!result?.result) throw new Error('No metadata returned. Reload the website and try again.');
    if (request !== inspection) return;
    render({ ...result.result, favicon: tab.favIconUrl || result.result.favicon });
    $('#page-state').textContent = 'Live page';
  } catch (error) {
    if (request !== inspection) return;
    $('#error').hidden = false; $('#workspace').hidden = true;
    $('#error-message').textContent = error.message?.startsWith('Open ') ? error.message : 'This page could not be inspected. Chrome restricts access to the Web Store and some protected pages. Reload the website or try another tab.';
    $('#site').textContent = 'No page inspected'; $('#page-state').textContent = 'Unavailable';
    $('#tag-count').textContent = '0'; $('#check-count').textContent = '0'; $('#check-count').classList.remove('attention');
    $('#favicon').style.opacity = '0'; $('#footer-status').textContent = 'No page inspected';
  } finally {
    if (request === inspection) { $('main').setAttribute('aria-busy', 'false'); $('#refresh').disabled = false; $('#retry').disabled = false; }
  }
}
for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => showView(button.dataset.view));
for (const button of document.querySelectorAll('[data-preview]')) button.addEventListener('click', () => { previewMode = button.dataset.preview; if (pageData) renderPreview(); });
for (const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click', () => {
  filter = button.dataset.filter;
  for (const item of document.querySelectorAll('[data-filter]')) item.setAttribute('aria-pressed', String(item === button));
  renderTags();
});
$('#search').addEventListener('input', renderTags);
$('#show-tags').addEventListener('click', () => { showView('tags'); $('#search').focus(); });
$('#refresh').addEventListener('click', init); $('#retry').addEventListener('click', init);
$('#copy-report').addEventListener('click', () => {
  if (!pageData) return;
  const report = [`MetaPeek — ${pageData.url}`, '', 'Metadata', ...pageData.tags.map(tag => `${tag.name}: ${tag.value || '(empty)'}`), '', 'Checks', ...audit(pageData).map(check => `[${check.level === 'pass' ? 'PASS' : 'REVIEW'}] ${check.title}: ${check.detail}`), '', 'Inspected rendered HTML only. Previews are approximate; crawler access and indexing are not verified.'].join('\n');
  copy(report, 'Report copied');
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); showView('tags'); $('#search').focus(); }
});
init();
