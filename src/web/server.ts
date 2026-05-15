import express from 'express';
import multer from 'multer';
import { resolve } from 'node:path';
import { lint } from '../engine.js';
import type { LintResult } from '../types.js';

const PUBLIC_DIR = resolve(import.meta.dirname, 'public');

const upload = multer({ storage: multer.memoryStorage() });

export function startServer(port = 3100) {
  const app = express();

  app.use('/public', express.static(PUBLIC_DIR));

  app.get('/', (_req, res) => {
    res.send(html());
  });

  app.post('/lint', upload.array('svgs'), (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No SVG files uploaded' });
      return;
    }

    const results: LintResult[] = files.map(file => {
      const content = file.buffer.toString('utf-8');
      return lint(content, file.originalname);
    });

    res.json({ results });
  });

  app.post('/preview', async (req, res) => {
    try {
      await new Promise<void>((resolve, reject) => {
        upload.array('svgs')(req as any, res as any, (err: any) => err ? reject(err) : resolve());
      });
      const files = (req as any).files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No SVG files uploaded' });
        return;
      }
      const { previewFromBuffers } = await import('../preview.js');
      await previewFromBuffers(files.map(f => ({ name: f.originalname, buffer: f.buffer })));
      res.json({ success: true, message: `${files.length} SVG(s) launched on simulator` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.listen(port, () => {
    console.log(`svg-lint GUI running at http://localhost:${port}`);
  });
}

function html(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/png" sizes="32x32" href="/public/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/public/favicon-16.png">
<link rel="apple-touch-icon" href="/public/apple-touch-icon.png">
<title>Figgity</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #e6edf3; min-height: 100vh; padding: 2rem 1rem; }
  .container { max-width: 900px; margin: 0 auto; }
  h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.25rem; }
  .title-row { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 1.5rem; }
  .steps { justify-content: center; }
  .figgy-icon { width: 48px; height: 48px; }
  .subtitle { color: #7d8590; font-size: 0.875rem; margin-bottom: 0; }
  .steps { display: flex; gap: 1.5rem; margin-bottom: 2rem; }
  .step { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; color: #7d8590; }
  .step-num { background: #30363d; color: #e6edf3; width: 1.5rem; height: 1.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; }
  .drop-zone { border: 2px dashed #30363d; border-radius: 12px; padding: 3rem 2rem; text-align: center; cursor: pointer; transition: all 0.15s; }
  .drop-zone:hover, .drop-zone.dragover { border-color: #58a6ff; background: #161b22; }
  .drop-zone p { color: #7d8590; margin-top: 0.75rem; font-size: 0.875rem; }
  .drop-zone .icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
  .drop-zone .cta { color: #58a6ff; font-weight: 500; font-size: 1rem; }
  input[type="file"] { display: none; }
  .file-list { margin-top: 1.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .file-chip { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 0.375rem 0.75rem; font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem; }
  .file-chip .remove { cursor: pointer; color: #7d8590; font-weight: bold; }
  .file-chip .remove:hover { color: #f85149; }
  .file-chip.clear-all { background: transparent; border-color: #6b0f2a; color: #6b0f2a; cursor: pointer; font-weight: 500; }
  .file-chip.clear-all:hover { background: #6b0f2a; border-color: #6b0f2a; color: #fff; }
  .btn { background: #2a7a6b; color: #fff; border: none; border-radius: 100px; padding: 0.625rem 1.5rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; margin-top: 1.5rem; transition: all 0.15s; }
  .btn:hover { background: #1f5f53; }
  .btn:disabled { background: #9e9e9e; color: #e0e0e0; cursor: not-allowed; opacity: 0.6; }
  .btn-secondary { background: transparent; border: 1.5px solid #2a7a6b; color: #2a7a6b; }
  .btn-secondary:hover { background: #2a7a6b; color: #fff; }
  .btn-secondary:disabled { background: transparent; border-color: #9e9e9e; color: #9e9e9e; opacity: 0.6; }
  .results { margin-top: 2rem; }
  .result-file { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; }
  .result-file h3 { font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; color: #e6edf3; }
  .result-file.clean h3 { color: #3fb950; }
  .msg { padding: 0.5rem 0; border-bottom: 1px solid #21262d; font-size: 0.8125rem; }
  .msg:last-child { border-bottom: none; }
  .msg .severity { display: inline-block; width: 1.25rem; text-align: center; margin-right: 0.5rem; }
  .msg .severity.error { color: #f85149; }
  .msg .severity.warning { color: #d29922; }
  .msg .severity.info { color: #58a6ff; }
  .msg .rule { color: #484f58; margin-left: 0.5rem; }
  .msg .suggestion { display: block; color: #7d8590; margin-top: 0.25rem; padding-left: 1.75rem; font-size: 0.75rem; }
  .summary { margin-top: 1rem; padding: 0.75rem 1rem; background: #161b22; border: 1px solid #30363d; border-radius: 6px; font-size: 0.8125rem; }
  .summary .errors { color: #f85149; }
  .summary .warnings { color: #d29922; }
  .summary .infos { color: #58a6ff; }
  .summary .clean { color: #3fb950; }
  .preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 0.75rem; margin-top: 1rem; margin-bottom: 1.5rem; }
  .preview-item { background: #fff; border-radius: 6px; padding: 0.5rem; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; position: relative; }
  .preview-item img { max-width: 100%; max-height: 100%; }
  .preview-item .name { position: absolute; bottom: -1.25rem; left: 0; right: 0; text-align: center; font-size: 0.625rem; color: #7d8590; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
</head>
<body>
<div class="container">

<div class="title-row">
  <img src="/public/figgy.png" alt="Figgy" class="figgy-icon">
  <div>
    <h1>Figgity</h1>
    <p class="subtitle">Figgy validates your SVGs, no doubt</p>
  </div>
</div>

<div class="steps">
  <div class="step"><span class="step-num">1</span> Upload SVGs</div>
  <div class="step"><span class="step-num">2</span> Check compatibility</div>
  <div class="step"><span class="step-num">3</span> Launch on simulator</div>
</div>

<div class="drop-zone" id="dropZone">
  <div class="icon">📂</div>
  <div class="cta">Drop SVG files here or click to browse</div>
  <p>Accepts .svg files only</p>
</div>
<input type="file" id="fileInput" multiple accept=".svg">

<div class="file-list" id="fileList"></div>
<div class="preview-grid" id="previewGrid"></div>

<div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
  <button class="btn" id="lintBtn" disabled>Check compatibility</button>
  <button class="btn btn-secondary" id="previewBtn" disabled>Launch on simulator</button>
</div>

<div class="results" id="results"></div>

</div><!-- .container -->

<script>
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const previewGrid = document.getElementById('previewGrid');
const lintBtn = document.getElementById('lintBtn');
const previewBtn = document.getElementById('previewBtn');
const resultsDiv = document.getElementById('results');

let files = [];

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  addFiles([...e.dataTransfer.files].filter(f => f.name.endsWith('.svg')));
});
fileInput.addEventListener('change', () => { addFiles([...fileInput.files]); fileInput.value = ''; });

function addFiles(newFiles) {
  const existing = new Set(files.map(f => f.name));
  for (const f of newFiles) {
    if (!existing.has(f.name)) { files.push(f); existing.add(f.name); }
  }
  render();
}

function removeFile(name) {
  files = files.filter(f => f.name !== name);
  render();
}

function clearAll() {
  files = [];
  resultsDiv.innerHTML = '';
  render();
}

function render() {
  lintBtn.disabled = files.length === 0;
  previewBtn.disabled = files.length === 0;
  fileList.innerHTML = files.map(f =>
    '<div class="file-chip"><span>' + esc(f.name) + '</span><span class="remove" onclick="removeFile(\\''+esc(f.name)+'\\')">×</span></div>'
  ).join('') + (files.length > 0 ? '<div class="file-chip clear-all" onclick="clearAll()">Clear all</div>' : '');
  previewGrid.innerHTML = files.map(f => {
    const url = URL.createObjectURL(f);
    return '<div class="preview-item"><img src="'+url+'" alt="'+esc(f.name)+'"><span class="name">'+esc(f.name)+'</span></div>';
  }).join('');
}

lintBtn.addEventListener('click', async () => {
  lintBtn.disabled = true;
  lintBtn.textContent = 'Checking...';
  const form = new FormData();
  files.forEach(f => form.append('svgs', f));
  try {
    const res = await fetch('/lint', { method: 'POST', body: form });
    const data = await res.json();
    renderResults(data.results);
  } catch (e) {
    resultsDiv.innerHTML = '<div class="summary"><span class="errors">Request failed: ' + esc(e.message) + '</span></div>';
  }
  lintBtn.disabled = false;
  lintBtn.textContent = 'Check compatibility';
});

function renderResults(results) {
  let totalE = 0, totalW = 0, totalI = 0;
  let html = '';
  for (const r of results) {
    const msgs = r.messages;
    const e = msgs.filter(m => m.severity === 'error').length;
    const w = msgs.filter(m => m.severity === 'warning').length;
    const i = msgs.filter(m => m.severity === 'info').length;
    totalE += e; totalW += w; totalI += i;
    html += '<div class="result-file' + (msgs.length === 0 ? ' clean' : '') + '">';
    html += '<h3>' + esc(r.filePath) + (msgs.length === 0 ? ' ✓ Compatible' : '') + '</h3>';
    for (const m of msgs) {
      const icon = m.severity === 'error' ? '✖' : m.severity === 'warning' ? '⚠' : 'ℹ';
      html += '<div class="msg"><span class="severity '+m.severity+'">' + icon + '</span>' + esc(m.message) + '<span class="rule">' + esc(m.ruleId) + '</span>';
      if (m.suggestion) html += '<span class="suggestion">→ ' + esc(m.suggestion) + '</span>';
      html += '</div>';
    }
    html += '</div>';
  }
  const total = totalE + totalW + totalI;
  let summary = '';
  if (total === 0) { summary = '<span class="clean">No doubt about it — all files are fig-tastic ✓</span>'; }
  else {
    const parts = [];
    if (totalE) parts.push('<span class="errors">' + totalE + ' error' + (totalE !== 1 ? 's' : '') + '</span>');
    if (totalW) parts.push('<span class="warnings">' + totalW + ' warning' + (totalW !== 1 ? 's' : '') + '</span>');
    if (totalI) parts.push('<span class="infos">' + totalI + ' info</span>');
    summary = parts.join(', ') + ' across ' + results.length + ' file' + (results.length !== 1 ? 's' : '');
  }
  resultsDiv.innerHTML = '<div class="summary">' + summary + '</div>' + html;
}

previewBtn.addEventListener('click', async () => {
  previewBtn.disabled = true;
  previewBtn.textContent = 'Launching...';
  const form = new FormData();
  files.forEach(f => form.append('svgs', f));
  try {
    const res = await fetch('/preview', { method: 'POST', body: form });
    const data = await res.json();
    if (data.success) {
      previewBtn.textContent = 'Launched ✓';
      setTimeout(() => { previewBtn.textContent = 'Launch on simulator'; previewBtn.disabled = false; }, 2000);
    } else {
      previewBtn.textContent = 'Failed';
      resultsDiv.innerHTML = '<div class="summary"><span class="errors">' + esc(data.error) + '</span></div>' + resultsDiv.innerHTML;
      setTimeout(() => { previewBtn.textContent = 'Launch on simulator'; previewBtn.disabled = false; }, 2000);
    }
  } catch (e) {
    previewBtn.textContent = 'Failed';
    resultsDiv.innerHTML = '<div class="summary"><span class="errors">' + esc(e.message) + '</span></div>' + resultsDiv.innerHTML;
    setTimeout(() => { previewBtn.textContent = 'Launch on simulator'; previewBtn.disabled = false; }, 2000);
  }
});

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
</script>
</body>
</html>`;
}
