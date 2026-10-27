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
    image: image?.value || '',
    imageTag: image?.name || '',
    tags: [{ name: 'title', value: document.title }, ...canonical, ...relevant],
  };
}

function safeUrl(value, base) {
  try {
    const url = new URL(value, base);
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch { return null; }
}

function render(data) {
  const status = document.querySelector('#status');
  document.querySelector('#site').textContent = new URL(data.url).hostname;
  const imageUrl = safeUrl(data.image, data.base);
  if (imageUrl) {
    const image = document.querySelector('#image');
    document.querySelector('#preview').hidden = false;
    document.querySelector('#image-link').href = imageUrl;
    document.querySelector('#image-caption').textContent = data.imageTag;
    image.addEventListener('error', () => {
      document.querySelector('#preview').hidden = true;
      status.hidden = false;
      status.textContent = 'OG image could not be loaded. Its URL is listed below.';
    }, { once: true });
    image.src = imageUrl;
    status.hidden = true;
  } else {
    status.textContent = data.image ? 'OG image URL is invalid or unsupported.' : 'No OG image found.';
  }
  const list = document.querySelector('#metadata');
  list.replaceChildren();
  const tags = [...data.tags];
  for (const name of ['description', 'og:title', 'og:description', 'og:image']) {
    if (!tags.some((tag) => tag.name.toLowerCase() === name)) tags.push({ name, value: '' });
  }
  for (const { name, value } of tags) {
    const row = document.createElement('div');
    row.className = 'row';
    const term = document.createElement('dt');
    term.textContent = name;
    const detail = document.createElement('dd');
    detail.textContent = value || 'Missing or empty';
    if (!value) detail.className = 'missing';
    row.append(term, detail);
    list.append(row);
  }
}

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:\/\//.test(tab.url || '')) {
      throw new Error('Open a website to inspect its metadata.');
    }
    const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: inspectPage });
    if (!result?.result) throw new Error('No page data returned.');
    render(result.result);
  } catch {
    document.querySelector('#status').textContent = 'Cannot inspect this page. Open a regular website and try again. Chrome internal pages and the Web Store are restricted.';
  }
}
init();
