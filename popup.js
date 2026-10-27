// Runs in the active page. Keep this function self-contained for executeScript.
function inspectPage() {
  const tags = [...document.head.querySelectorAll('meta')].map((tag) => ({
    name: tag.getAttribute('property') || tag.getAttribute('name') || '',
    value: tag.getAttribute('content') || '',
  }));
  const relevant = tags.filter(({ name }) => /^(og:|twitter:)/i.test(name)
    || /^(description|robots|googlebot|author|viewport)$/i.test(name));
  const canonical = [...document.head.querySelectorAll('link[rel]')]
    .filter((link) => link.rel.toLowerCase().split(/\s+/).includes('canonical'))
    .map((link) => ({ name: 'canonical', value: link.href }));
  const images = tags.filter(({ name, value }) => /^og:image(?::url)?$/i.test(name) && value.trim());
  const image = images[0];
  return {
    url: location.href,
    base: document.baseURI,
    favicon: [...document.head.querySelectorAll('link[rel]')].find((link) => /^(icon|shortcut icon)$/i.test(link.rel))?.href || new URL('/favicon.ico', location.href).href,
    image: image?.value || '',
    imageTag: image?.name || '',
    tags: [{ name: 'title', value: document.title }, ...canonical, ...relevant],
  };
}

function safeUrl(value, base) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value, base);
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch { return null; }
}

function render(data) {
  document.querySelector('main').setAttribute('aria-busy', 'false');
  const status = document.querySelector('#status');
  const site = document.querySelector('#site');
  site.textContent = new URL(data.url).hostname;
  site.title = data.url;
  const favicon = document.querySelector('#favicon');
  favicon.onload = () => { favicon.style.opacity = '1'; };
  favicon.onerror = () => { favicon.style.opacity = '0'; };
  const faviconUrl = safeUrl(data.favicon, data.base);
  if (faviconUrl) favicon.src = faviconUrl;

  const image = document.querySelector('#image');
  const link = document.querySelector('#image-link');
  image.style.opacity = '0';
  link.removeAttribute('href');
  status.hidden = false;
  const imageUrl = data.image.trim() ? safeUrl(data.image, data.base) : null;
  if (imageUrl) {
    status.textContent = 'Loading…';
    image.onload = () => {
      image.style.opacity = '1';
      status.hidden = true;
      link.href = imageUrl;
    };
    image.onerror = () => { status.textContent = 'Image unavailable'; };
    image.src = imageUrl;
  } else {
    image.removeAttribute('src');
    status.textContent = 'No OG image';
  }
  document.querySelector('#image-caption').textContent = data.imageTag || 'og:image';
  const list = document.querySelector('#metadata');
  const tags = [...data.tags];
  for (const name of ['description', 'og:title', 'og:description', 'og:image']) {
    if (!tags.some((tag) => tag.name.toLowerCase() === name)) tags.push({ name, value: '' });
  }
  const fragment = document.createDocumentFragment();
  for (const { name, value } of tags) {
    const row = document.createElement('div');
    row.className = 'row';
    const term = document.createElement('dt');
    term.textContent = name;
    term.title = name;
    const detail = document.createElement('dd');
    detail.textContent = value || '—';
    detail.title = value || 'Missing';
    if (!value) detail.className = 'missing';
    else {
      detail.tabIndex = 0;
      detail.setAttribute('aria-label', name);
    }
    row.append(term, detail);
    fragment.append(row);
  }
  list.replaceChildren(fragment);
  document.querySelector('#details').scrollTop = 0;
}

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:\/\//.test(tab.url || '')) {
      throw new Error('Open a website to inspect its metadata.');
    }
    const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: inspectPage });
    if (!result?.result) throw new Error('No page data returned.');
    render({ ...result.result, favicon: tab.favIconUrl || result.result.favicon });
  } catch {
    document.querySelector('main').setAttribute('aria-busy', 'false');
    document.querySelector('#status').textContent = 'Cannot inspect this page';
    document.querySelector('#metadata').replaceChildren();
  }
}
init();
