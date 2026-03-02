const sourceHtml = document.getElementById('sourceHtml');
const resultHtml = document.getElementById('resultHtml');
const textList = document.getElementById('textList');
const imageList = document.getElementById('imageList');
const parseStatus = document.getElementById('parseStatus');
const aiStatus = document.getElementById('aiStatus');

const state = {
  parsedDoc: null,
  textNodes: [],
  imageNodes: [],
  imageRefs: []
};

function setStatus(el, message, isError = false) {
  el.textContent = message;
  el.style.color = isError ? '#fca5a5' : '#93c5fd';
}

function clearLists() {
  textList.innerHTML = '';
  imageList.innerHTML = '';
}

function toAbsoluteUrl(url, baseUrl) {
  if (!url) return '';
  try {
    return new URL(url, baseUrl || window.location.href).href;
  } catch {
    return url;
  }
}

function looksLikeUrl(value) {
  return /^https?:\/\//i.test(value.trim());
}

async function loadUrlIntoSource() {
  const raw = sourceHtml.value.trim();
  if (!looksLikeUrl(raw)) {
    setStatus(parseStatus, 'Bitte gib eine vollständige URL mit http/https ein.', true);
    return;
  }

  setStatus(parseStatus, 'Lade URL-Inhalt...');
  try {
    const response = await fetch(raw);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    sourceHtml.value = await response.text();
    setStatus(parseStatus, 'URL erfolgreich geladen. Du kannst jetzt analysieren.');
  } catch (error) {
    setStatus(parseStatus, `URL konnte nicht geladen werden (${error.message}). Falls CORS blockiert, bitte HTML-Quelltext manuell einfügen.`, true);
  }
}

function parseSourceHtml() {
  const raw = sourceHtml.value.trim();
  if (!raw) {
    setStatus(parseStatus, 'Bitte zuerst Ursprungs-HTML einfügen.', true);
    return;
  }

  if (looksLikeUrl(raw)) {
    setStatus(parseStatus, 'Es wurde nur eine URL erkannt. Bitte zuerst auf „URL laden“ klicken oder den HTML-Quelltext einfügen.', true);
    return;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'text/html');

  if (doc.querySelector('parsererror')) {
    setStatus(parseStatus, 'HTML konnte nicht geparst werden. Bitte prüfen.', true);
    return;
  }

  const baseElement = doc.querySelector('base[href]');
  const baseHref = baseElement?.getAttribute('href') || '';

  state.parsedDoc = doc;
  state.textNodes = extractEditableTexts(doc.body);
  state.imageNodes = Array.from(doc.querySelectorAll('img'));
  state.imageRefs = extractImageReferences(doc, raw, baseHref);

  if (!state.textNodes.length) {
    state.textNodes = extractTextFromPlainSource(raw);
  }

  renderTextInputs();
  renderImageInputs();
  const foundImageCount = Math.max(state.imageNodes.length, state.imageRefs.length);
  setStatus(parseStatus, `Analyse fertig: ${state.textNodes.length} Texte, ${foundImageCount} Bilder gefunden.`);
}

function extractTextFromPlainSource(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^<[^>]+>$/.test(line));

  return lines.map((line) => ({ textContent: line }));
}

function extractImageReferences(doc, raw, baseHref) {
  const refs = [];

  for (const img of doc.querySelectorAll('img')) {
    refs.push({ src: toAbsoluteUrl(img.getAttribute('src') || '', baseHref), alt: img.getAttribute('alt') || '', node: img, kind: 'img' });
  }

  for (const a of doc.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href') || '';
    if (/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(href)) {
      refs.push({ src: toAbsoluteUrl(href, baseHref), alt: a.textContent.trim(), node: a, kind: 'link' });
    }
  }

  const rawMatches = raw.match(/(?:https?:\/\/|\/)?[^\s"'<>]+\.(?:png|jpe?g|webp|gif|svg)(?:\?[^\s"'<>]*)?/gi) || [];
  for (const src of rawMatches) {
    refs.push({ src: toAbsoluteUrl(src, baseHref), alt: '', node: null, kind: 'raw' });
  }

  const dedup = new Map();
  for (const ref of refs) {
    if (!ref.src) continue;
    if (!dedup.has(ref.src)) dedup.set(ref.src, ref);
  }
  return Array.from(dedup.values());
}

function extractEditableTexts(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const value = node.textContent.trim();
      if (!value) return NodeFilter.FILTER_REJECT;
      if (node.parentElement && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  let current;
  while ((current = walker.nextNode())) {
    nodes.push(current);
  }
  return nodes;
}

function renderTextInputs() {
  textList.innerHTML = '';

  if (!state.textNodes.length) {
    textList.innerHTML = '<p>Keine editierbaren Texte gefunden.</p>';
    return;
  }

  state.textNodes.forEach((node, index) => {
    const wrap = document.createElement('div');
    wrap.className = 'item';

    const label = document.createElement('label');
    label.textContent = `Text ${index + 1}`;

    const input = document.createElement('textarea');
    input.rows = 2;
    input.value = node.textContent.trim();
    input.dataset.type = 'text';
    input.dataset.index = String(index);

    input.addEventListener('input', () => {
      state.textNodes[index].textContent = input.value;
    });

    wrap.append(label, input);
    textList.appendChild(wrap);
  });
}

function renderImageInputs() {
  imageList.innerHTML = '';

  if (!state.imageRefs.length) {
    imageList.innerHTML = '<p>Keine Bilder gefunden.</p>';
    return;
  }

  state.imageRefs.forEach((imageRef, index) => {
    const wrap = document.createElement('div');
    wrap.className = 'item';

    const srcLabel = document.createElement('label');
    srcLabel.textContent = `Bild ${index + 1}: URL (${imageRef.kind})`;

    const srcInput = document.createElement('input');
    srcInput.value = imageRef.src || '';
    srcInput.addEventListener('input', () => {
      state.imageRefs[index].src = srcInput.value;
      if (state.imageRefs[index].node && state.imageRefs[index].kind === 'img') {
        state.imageRefs[index].node.setAttribute('src', srcInput.value);
      }
      if (state.imageRefs[index].node && state.imageRefs[index].kind === 'link') {
        state.imageRefs[index].node.setAttribute('href', srcInput.value);
      }
    });

    const altLabel = document.createElement('label');
    altLabel.textContent = 'Alt-Text';

    const altInput = document.createElement('input');
    altInput.value = imageRef.alt || '';
    altInput.addEventListener('input', () => {
      state.imageRefs[index].alt = altInput.value;
      if (state.imageRefs[index].node && state.imageRefs[index].kind === 'img') {
        state.imageRefs[index].node.setAttribute('alt', altInput.value);
      }
    });

    wrap.append(srcLabel, srcInput, altLabel, altInput);
    imageList.appendChild(wrap);
  });
}

async function requestAi(prompt) {
  const apiKey = document.getElementById('apiKey').value.trim();
  const model = document.getElementById('model').value.trim();

  if (!apiKey || !model) {
    throw new Error('API-Key und Modell sind erforderlich.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      messages: [
        { role: 'system', content: 'Du lieferst nur JSON ohne Erklärung.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`API Fehler: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function aiSuggestTexts() {
  if (!state.textNodes.length) {
    setStatus(aiStatus, 'Bitte zuerst HTML analysieren.', true);
    return;
  }

  const texts = state.textNodes.map((t, i) => `${i + 1}. ${t.textContent.trim()}`).join('\n');
  const prompt = `Erstelle kreative deutsche Alternativen für diese Texte. Gib nur JSON mit {"texts":["..."]} zurück, gleiche Reihenfolge:\n${texts}`;

  try {
    setStatus(aiStatus, 'KI erzeugt Textvorschläge...');
    const content = await requestAi(prompt);
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.texts)) throw new Error('Ungültige KI-Antwort für Texte.');

    parsed.texts.forEach((text, i) => {
      if (state.textNodes[i]) state.textNodes[i].textContent = text;
    });
    renderTextInputs();
    setStatus(aiStatus, 'Textvorschläge übernommen.');
  } catch (error) {
    setStatus(aiStatus, `KI-Textvorschlag fehlgeschlagen: ${error.message}`, true);
  }
}

async function aiSuggestImages() {
  if (!state.imageRefs.length) {
    setStatus(aiStatus, 'Bitte zuerst HTML analysieren.', true);
    return;
  }

  const images = state.imageRefs
    .map((img, i) => `${i + 1}. src=${img.src || ''}, alt=${img.alt || ''}`)
    .join('\n');
  const prompt = `Erstelle neue, realistische Bildideen. Gib nur JSON mit {"images":[{"src":"https://...","alt":"..."}]} zurück:\n${images}`;

  try {
    setStatus(aiStatus, 'KI erzeugt Bildideen...');
    const content = await requestAi(prompt);
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.images)) throw new Error('Ungültige KI-Antwort für Bilder.');

    parsed.images.forEach((image, i) => {
      if (!state.imageRefs[i]) return;
      state.imageRefs[i].src = image.src || '';
      state.imageRefs[i].alt = image.alt || '';

      if (state.imageRefs[i].node && state.imageRefs[i].kind === 'img') {
        state.imageRefs[i].node.setAttribute('src', image.src || '');
        state.imageRefs[i].node.setAttribute('alt', image.alt || '');
      }
      if (state.imageRefs[i].node && state.imageRefs[i].kind === 'link') {
        state.imageRefs[i].node.setAttribute('href', image.src || '');
      }
    });
    renderImageInputs();
    setStatus(aiStatus, 'Bildideen übernommen.');
  } catch (error) {
    setStatus(aiStatus, `KI-Bildideen fehlgeschlagen: ${error.message}`, true);
  }
}

function buildHtml() {
  if (!state.parsedDoc) {
    setStatus(parseStatus, 'Bitte zuerst Ursprungs-HTML analysieren.', true);
    return;
  }

  resultHtml.value = '<!DOCTYPE html>\n' + state.parsedDoc.documentElement.outerHTML;
}

async function copyResult() {
  if (!resultHtml.value.trim()) {
    setStatus(parseStatus, 'Bitte zuerst finale HTML erzeugen.', true);
    return;
  }

  try {
    await navigator.clipboard.writeText(resultHtml.value);
    setStatus(parseStatus, 'Finale HTML wurde in die Zwischenablage kopiert.');
  } catch {
    setStatus(parseStatus, 'Kopieren fehlgeschlagen. Bitte manuell kopieren.', true);
  }
}

document.getElementById('parseBtn').addEventListener('click', parseSourceHtml);
document.getElementById('loadUrlBtn').addEventListener('click', loadUrlIntoSource);
document.getElementById('buildBtn').addEventListener('click', buildHtml);
document.getElementById('copyBtn').addEventListener('click', copyResult);
document.getElementById('aiTextBtn').addEventListener('click', aiSuggestTexts);
document.getElementById('aiImageBtn').addEventListener('click', aiSuggestImages);

clearLists();
