import express from 'express';
import multer from 'multer';
import { resolve } from 'node:path';
import { lint } from '../engine.js';
import { fixSvg } from '../fixer.js';
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

  app.post('/fix', upload.array('svgs'), (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No SVG files uploaded' });
      return;
    }
    const results = files.map(file => {
      const content = file.buffer.toString('utf-8');
      const { fixed, applied } = fixSvg(content);
      return { filePath: file.originalname, fixed, applied };
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
  :root {
    --surface: #111827;
    --surface-medium: #374151;
    --on-surface-high: #ffffff;
    --on-surface-medium: #cdd2d8;
    --on-surface-muted: #9ca3af;
    --border: #4b5563;
    --border-subtle: #1f2937;
    --container: #202936;
    --container-medium: #4a5666;
    --on-container-high: #ffffff;
    --on-container-medium: #cdd2d8;
    --container-divider: #4a5666;
    --preview-bg: #ffffff;
    --accent: #58a6ff;
    --btn-primary: #2ba17f;
    --btn-primary-hover: #58cca2;
    --btn-primary-pressed: #1b846c;
    --on-primary: #111827;
    --critical: #6b0f2a;
    --error: #f85149;
    --warning: #d29922;
    --info: #58a6ff;
    --success: #3fb950;
  }
  [data-theme="light"] {
    --surface: #f3f6f8;
    --surface-medium: #d3d1d1;
    --on-surface-high: #191817;
    --on-surface-medium: #443f3f;
    --on-surface-muted: #6b7280;
    --border: #d3d1d1;
    --border-subtle: #e5e7eb;
    --container: #ffffff;
    --container-medium: #e6ebf0;
    --on-container-high: #191817;
    --on-container-medium: #595352;
    --container-divider: #ebeaea;
    --preview-bg: #f3f6f8;
    --accent: #117261;
    --btn-primary: #117261;
    --btn-primary-hover: #1b846c;
    --btn-primary-pressed: #0f5f55;
    --on-primary: #ffffff;
    --error: #dc2626;
    --warning: #b45309;
    --info: #2563eb;
    --success: #16a34a;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--surface); color: var(--on-surface-medium); min-height: 100vh; padding: 2rem 1rem; transition: background 0.2s, color 0.2s; }
  .container { max-width: 1300px; margin: 0 auto; }
  h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.25rem; color: var(--on-surface-high); }
  .title-row { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 1.5rem; }
  .steps { justify-content: center; }
  .figgy-icon { width: 48px; height: 48px; }
  .subtitle { color: var(--on-surface-medium); font-size: 0.875rem; margin-bottom: 0; }
  .steps { display: flex; gap: 1.5rem; margin-bottom: 2rem; }
  .step { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; color: var(--on-surface-muted); }
  .step-num { background: var(--border); color: var(--on-surface-high); width: 1.5rem; height: 1.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; }
  .drop-zone { border: 2px dashed var(--border); border-radius: 12px; padding: 3rem 2rem; text-align: center; cursor: pointer; transition: all 0.15s; }
  .drop-zone:hover, .drop-zone.dragover { border-color: var(--accent); background: var(--surface-medium); }
  .drop-zone p { color: var(--on-surface-muted); margin-top: 0.75rem; font-size: 0.875rem; }
  .drop-zone .icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
  .drop-zone .cta { color: var(--accent); font-weight: 500; font-size: 1rem; }
  input[type="file"] { display: none; }
  .file-list { margin-top: 1.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .file-chip { background: var(--surface-medium); border: 1px solid var(--border); border-radius: 6px; padding: 0.375rem 0.75rem; font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem; }
  .file-chip .remove { cursor: pointer; color: var(--on-surface-muted); font-weight: bold; }
  .file-chip .remove:hover { color: var(--error); }
  .file-chip.clear-all { background: transparent; border: 1.5px solid var(--critical); color: var(--critical); cursor: pointer; font-weight: 500; border-radius: 100px; padding: 0.375rem 1rem; }
  .file-chip.clear-all:hover { background: var(--critical); border-color: var(--critical); color: #fff; }
  .btn { background: var(--btn-primary); color: var(--on-primary); border: none; border-radius: 100px; padding: 0.625rem 1.5rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; margin-top: 1.5rem; transition: all 0.15s; }
  .btn:hover { background: var(--btn-primary-hover); }
  .btn:active { background: var(--btn-primary-pressed); }
  .btn:disabled { background: #9e9e9e; color: #e0e0e0; cursor: not-allowed; opacity: 0.6; }
  .btn-secondary { background: transparent; border: 1.5px solid var(--btn-primary); color: var(--btn-primary); }
  .btn-secondary:hover { background: var(--btn-primary); color: #fff; }
  .btn-secondary:disabled { background: transparent; border-color: #9e9e9e; color: #9e9e9e; opacity: 0.6; }
  .results { margin-top: 2rem; }
  .result-file { background: var(--container); border: 1px solid var(--container-divider); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; }
  .result-file .result-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
  .result-file h3 { font-size: 0.875rem; font-weight: 600; color: var(--on-container-high); }
  .result-file.clean h3 { color: var(--on-container-high); }
  .result-file.clean .check { color: var(--success); margin-right: 0.25rem; }
  .msg { padding: 0.75rem 0; border-bottom: 1px solid var(--container-divider); font-size: 0.875rem; }
  .msg:last-child { border-bottom: none; }
  .msg p { margin: 0.25rem 0; }
  .msg strong { color: var(--on-container-high); }
  .msg .severity { display: inline-block; width: 1.25rem; text-align: center; margin-right: 0.5rem; }
  .msg .severity.error { color: var(--error); }
  .msg .severity.warning { color: var(--warning); }
  .msg .severity.info { color: var(--info); }
  .msg .msg-error { color: var(--on-container-high); }
  .msg .msg-rule { color: var(--on-container-medium); padding-left: 1.75rem; }
  .msg .msg-suggestion { color: var(--on-container-medium); padding-left: 1.75rem; }
  .summary { margin-top: 1rem; margin-bottom: 1rem; padding: 0.75rem 1rem; background: var(--container-medium); border: 1px solid var(--container-divider); border-radius: 6px; font-size: 0.875rem; }
  .summary .errors { color: var(--error); }
  .summary .warnings { color: var(--warning); }
  .summary .infos { color: var(--info); }
  .summary .clean { color: var(--success); }
  .preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(9.375rem, 1fr)); gap: 0.75rem; margin-top: 1rem; margin-bottom: 1.5rem; }
  .preview-item { border-radius: 6px; padding: 0.5rem; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; position: relative; }
  .preview-item img { max-width: 100%; max-height: 100%; }
  .preview-item .name { position: absolute; bottom: -1.25rem; left: 0; right: 0; text-align: center; font-size: 0.625rem; color: var(--on-surface-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .btn-code-toggle { background: transparent; border: 1px solid var(--border); border-radius: 100px; padding: 0.25rem 0.75rem; font-size: 0.75rem; color: var(--on-surface-muted); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
  .btn-code-toggle:hover { border-color: var(--accent); color: var(--accent); }
  .code-block { position: relative; }
  .btn-copy { position: absolute; top: 0.75rem; right: 0.75rem; background: var(--surface-medium); border: 1px solid var(--border); border-radius: 6px; padding: 0.25rem 0.5rem; font-size: 0.75rem; color: var(--on-surface-muted); cursor: pointer; display: flex; align-items: center; gap: 0.25rem; transition: all 0.15s; }
  .btn-copy:hover { border-color: var(--accent); color: var(--accent); }
  .btn-copy svg { width: 14px; height: 14px; fill: currentColor; }
  .code-section { margin-top: 2rem; }
  .code-block { background: var(--container); border: 1px solid var(--container-divider); border-radius: 8px; padding: 1.25rem 1.5rem; margin-bottom: 1rem; }
  .code-block h3 { font-size: 0.875rem; font-weight: 600; margin-bottom: 1rem; color: var(--on-container-high); }
  .code-block pre { font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, monospace; font-size: 0.8125rem; line-height: 1.8; color: var(--on-container-medium); white-space: pre; overflow-x: auto; counter-reset: line; }
  .code-block .line { display: block; }
  .code-block .line::before { counter-increment: line; content: counter(line); display: inline-block; width: 2.5rem; margin-right: 1rem; text-align: right; color: var(--on-surface-muted); opacity: 0.5; font-size: 0.75rem; user-select: none; }
  .code-block .line.error-line { background: rgba(248, 81, 73, 0.1); border-left: 3px solid var(--error); margin-left: -0.5rem; padding-left: 0.5rem; }
  .code-block .line.warning-line { background: rgba(210, 153, 34, 0.1); border-left: 3px solid var(--warning); margin-left: -0.5rem; padding-left: 0.5rem; }
  .code-block .tag { color: var(--btn-primary); }
  .code-block .attr { color: var(--warning); }
  .code-block .val { color: var(--success); }
  .code-block .bracket { color: var(--on-container-muted, var(--on-surface-muted)); }
  .theme-switch { position: absolute; top: 1.5rem; right: 1.5rem; display: flex; align-items: center; gap: 0.5rem; }
  .theme-switch span { font-size: 0.875rem; }
  .theme-track { width: 2.75rem; height: 1.5rem; background: var(--surface-medium); border: 1px solid var(--border); border-radius: 100px; position: relative; cursor: pointer; transition: all 0.2s; }
  .theme-track:hover { border-color: var(--accent); }
  .theme-knob { position: absolute; top: 2px; left: 2px; width: 1.125rem; height: 1.125rem; background: var(--btn-primary); border-radius: 50%; transition: transform 0.2s; }
  [data-theme="light"] .theme-knob { transform: translateX(1.25rem); }
</style>
</head>
<body>
<div class="theme-switch"><span>🌙</span><div class="theme-track" id="themeToggle"><div class="theme-knob"></div></div><span>☀️</span></div>
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

let fileContents = {};

lintBtn.addEventListener('click', async () => {
  lintBtn.disabled = true;
  lintBtn.textContent = 'Checking...';
  fileContents = {};
  for (const f of files) { fileContents[f.name] = await f.text(); }
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

let fixedContents = {};

async function fixFile(filePath) {
  const file = files.find(f => f.name === filePath);
  if (!file) return;
  const form = new FormData();
  form.append('svgs', file);
  const res = await fetch('/fix', { method: 'POST', body: form });
  const data = await res.json();
  const r = data.results[0];
  fixedContents[filePath] = r.fixed;
  const baseId = 'code-' + btoa(filePath).replace(/[^a-z0-9]/gi, '');
  const fixContainer = document.getElementById('fix-' + btoa(filePath).replace(/[^a-z0-9]/gi, ''));
  if (!fixContainer) return;
  if (r.applied.length === 0) {
    fixContainer.innerHTML = '<p style="color:var(--success);margin:0.5rem 0;">No fixes needed</p>';
    fixContainer.style.display = 'block';
    return;
  }
  const fixedCodeEl = document.getElementById(baseId + '-fixed');
  if (fixedCodeEl) {
    fixedCodeEl.querySelector('pre').innerHTML = highlightSvg(formatXml(r.fixed), []);
  }
  // Show fixed code, hide original
  const origEl = document.getElementById(baseId + '-orig');
  if (origEl) origEl.style.display = 'none';
  if (fixedCodeEl) fixedCodeEl.style.display = '';
  // Update toggle button text
  const resultFile = fixContainer.closest('.result-file');
  const codeBtn = [...resultFile.querySelectorAll('.btn-code-toggle')].find(b => b.textContent === 'Show SVG code' || b.textContent === 'Hide SVG code');
  if (codeBtn) codeBtn.textContent = 'Hide SVG code';
  // Show buttons above code + applied fixes below code
  let infoHtml = '<div style="display:flex;gap:0.5rem;margin-top:0.5rem;margin-bottom:0.75rem;justify-content:flex-end;">';
  infoHtml += '<button class="btn btn-secondary" onclick="downloadFixed(\\'' + esc(filePath) + '\\')">Download fixed SVG</button>';
  infoHtml += '<button class="btn btn-secondary" data-toggle-id="' + baseId + '" onclick="toggleCodeView(\\'' + baseId + '\\')">Show original</button>';
  infoHtml += '</div>';
  fixContainer.innerHTML = infoHtml;
  fixContainer.style.display = 'block';
  // Add applied fixes below the code blocks
  let appliedId = 'applied-' + btoa(filePath).replace(/[^a-z0-9]/gi, '');
  let existingApplied = document.getElementById(appliedId);
  if (!existingApplied) {
    existingApplied = document.createElement('div');
    existingApplied.id = appliedId;
    const codeParent = fixedCodeEl || origEl;
    if (codeParent) codeParent.parentNode.insertBefore(existingApplied, codeParent.nextSibling?.nextSibling || null);
  }
  let appliedHtml = '<p style="margin:0.75rem 0 0.25rem;font-size:0.875rem;font-weight:600;color:var(--on-container-high);">Applied fixes:</p>';
  appliedHtml += '<ul style="margin:0.25rem 0 0;padding-left:1.25rem;color:var(--on-surface-medium);font-size:0.875rem;">';
  for (const a of r.applied) { appliedHtml += '<li style="margin:0.25rem 0;">' + esc(a) + '</li>'; }
  appliedHtml += '</ul>';
  existingApplied.innerHTML = appliedHtml;
}

function downloadFixed(filePath) {
  const content = fixedContents[filePath];
  if (!content) return;
  const blob = new Blob([content], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filePath; a.click();
  URL.revokeObjectURL(url);
}

function toggleCodeView(id) {
  const origEl = document.getElementById(id + '-orig');
  const fixedEl = document.getElementById(id + '-fixed');
  const btn = document.querySelector('[data-toggle-id="' + id + '"]');
  if (!fixedEl || !origEl) return;
  if (fixedEl.style.display === 'none') {
    fixedEl.style.display = 'block';
    origEl.style.display = 'none';
    btn.textContent = 'Show original';
  } else {
    fixedEl.style.display = 'none';
    origEl.style.display = 'block';
    btn.textContent = 'Show fixed';
  }
}

function renderResults(results) {
  let totalE = 0, totalW = 0, totalI = 0;
  const clean = results.filter(r => r.messages.length === 0);
  const issues = results.filter(r => r.messages.length > 0);
  let html = '';
  for (const r of clean) {
    const id = 'code-' + btoa(r.filePath).replace(/[^a-z0-9]/gi, '');
    html += '<div class="result-file clean"><div class="result-header"><h3><span class="check">✓</span> ' + esc(r.filePath) + '</h3>';
    html += '<button class="btn-code-toggle" onclick="toggleCode(\\'' + id + '\\')">Show SVG code</button></div>';
    html += '<div class="code-block" id="' + id + '" style="display:none;" data-file="' + esc(r.filePath) + '"><button class="btn-copy" onclick="copyCode(this)"><svg viewBox="0 0 16 16"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/></svg>Copy</button><pre>' + highlightSvg(formatXml(fileContents[r.filePath] || ''), []) + '</pre></div>';
    html += '</div>';
  }
  for (const r of issues) {
    const msgs = r.messages;
    const e = msgs.filter(m => m.severity === 'error').length;
    const w = msgs.filter(m => m.severity === 'warning').length;
    const i = msgs.filter(m => m.severity === 'info').length;
    totalE += e; totalW += w; totalI += i;
    const id = 'code-' + btoa(r.filePath).replace(/[^a-z0-9]/gi, '');
    const fixId = 'fix-' + btoa(r.filePath).replace(/[^a-z0-9]/gi, '');
    html += '<div class="result-file">';
    html += '<div class="result-header"><h3>' + esc(r.filePath) + '</h3>';
    html += '<div style="display:flex;gap:0.5rem;align-items:center;">';
    html += '<button class="btn-code-toggle" onclick="fixFile(\\'' + esc(r.filePath) + '\\')">Fix issues</button>';
    html += '<button class="btn-code-toggle" onclick="toggleCode(\\'' + id + '\\')">Show SVG code</button>';
    html += '</div></div>';
    for (const m of msgs) {
      const icon = m.severity === 'error' ? '✖' : m.severity === 'warning' ? '⚠' : 'ℹ';
      html += '<div class="msg">';
      const msgParts = m.message.split(/(?<=!) /);
      const pun = msgParts.length > 1 ? msgParts[0] : '';
      const detail = msgParts.length > 1 ? msgParts.slice(1).join(' ') : m.message;
      html += '<p class="msg-error"><span class="severity '+m.severity+'">' + icon + '</span><strong>' + esc(pun) + '</strong> ' + esc(detail) + '</p>';
      html += '<p class="msg-rule"><strong>Rule:</strong> ' + esc(m.ruleId) + '</p>';
      if (m.suggestion) html += '<p class="msg-suggestion"><strong>Suggested fix:</strong> ' + esc(m.suggestion) + '</p>';
      html += '</div>';
    }
    html += '<div id="' + fixId + '" style="display:none;"></div>';
    html += '<div class="code-block" id="' + id + '-orig" style="display:none;" data-file="' + esc(r.filePath) + '"><button class="btn-copy" onclick="copyCode(this)"><svg viewBox="0 0 16 16"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/></svg>Copy</button><pre>' + highlightSvg(formatXml(fileContents[r.filePath] || ''), msgs.map(m => ({element: m.element || '', severity: m.severity}))) + '</pre></div>';
    html += '<div class="code-block" id="' + id + '-fixed" style="display:none;" data-file="' + esc(r.filePath) + '"><button class="btn-copy" onclick="copyCode(this)"><svg viewBox="0 0 16 16"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/></svg>Copy</button><pre></pre></div>';
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

function toggleCode(id) {
  const el = document.getElementById(id) || document.getElementById(id + '-orig');
  if (!el) return;
  const resultFile = el.closest('.result-file');
  const btns = resultFile.querySelectorAll('.btn-code-toggle');
  const btn = [...btns].find(b => b.textContent === 'Show SVG code' || b.textContent === 'Hide SVG code');
  if (el.style.display === 'none') {
    el.style.display = '';
    if (btn) btn.textContent = 'Hide SVG code';
    const fixedEl = document.getElementById(id + '-fixed');
    if (fixedEl && fixedEl.style.display !== 'none') {
      fixedEl.style.display = '';
    }
  } else {
    el.style.display = 'none';
    if (btn) btn.textContent = 'Show SVG code';
    const fixedEl = document.getElementById(id + '-fixed');
    if (fixedEl) fixedEl.style.display = 'none';
  }
}

function copyCode(btn) {
  const block = btn.closest('.code-block');
  const filename = block.getAttribute('data-file');
  const raw = fileContents[filename] || block.querySelector('pre').textContent;
  navigator.clipboard.writeText(raw).then(() => {
    btn.innerHTML = '<svg viewBox="0 0 16 16"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg>Copied';
    setTimeout(() => { btn.innerHTML = '<svg viewBox="0 0 16 16"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/></svg>Copy'; }, 2000);
  });
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


function formatXml(xml) {
  let formatted = '';
  let indent = 0;
  const parts = xml.replace(/>\\s*</g, '>\\n<').split('\\n');
  for (let part of parts) {
    part = part.trim();
    if (!part) continue;
    if (part.startsWith('</')) indent = Math.max(0, indent - 1);
    formatted += '  '.repeat(indent) + part + '\\n';
    if (part.startsWith('<') && !part.startsWith('</') && !part.startsWith('<?') && !part.endsWith('/>') && !part.includes('</')) indent++;
  }
  return formatted.trim();
}

function highlightSvg(code, flaggedElements) {
  const lines = code.split('\\n');
  return lines.map(line => {
    let highlighted = esc(line)
      .replace(/(&lt;\\/?)([a-zA-Z][a-zA-Z0-9:-]*)/g, '<span class="bracket">$1</span><span class="tag">$2</span>')
      .replace(/(\\/?)(&gt;)/g, '<span class="bracket">$1$2</span>')
      .replace(/([a-zA-Z][a-zA-Z0-9:-]*)=(\\&quot;[^&]*?\\&quot;)/g, '<span class="attr">$1</span>=<span class="val">$2</span>');
    let lineClass = 'line';
    if (flaggedElements && flaggedElements.length > 0) {
      const rawLine = line.trim();
      for (const f of flaggedElements) {
        if (rawLine.match(new RegExp('<' + f.element + '[\\\\s>/]')) || rawLine.match(new RegExp('</' + f.element + '>'))) {
          lineClass += f.severity === 'error' ? ' error-line' : ' warning-line';
          break;
        }
      }
    }
    return '<span class="' + lineClass + '">' + highlighted + '</span>';
  }).join('');
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

const themeToggle = document.getElementById('themeToggle');
if (localStorage.getItem('figgity-theme') === 'light') document.documentElement.setAttribute('data-theme', 'light');
themeToggle.addEventListener('click', () => {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  if (isLight) { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('figgity-theme', 'dark'); }
  else { document.documentElement.setAttribute('data-theme', 'light'); localStorage.setItem('figgity-theme', 'light'); }
});
</script>
</body>
</html>`;
}
