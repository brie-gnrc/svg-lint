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

    const platform = (req.body?.platform as string) || 'ios';
    const results: LintResult[] = files.map(file => {
      const content = file.buffer.toString('utf-8');
      return lint(content, file.originalname, { platform: platform as any });
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
      const remaining = lint(fixed, file.originalname).messages;
      return { filePath: file.originalname, fixed, applied, remaining };
    });
    res.json({ results });
  });

  app.post('/convert', upload.array('svgs'), async (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No SVG files uploaded' });
      return;
    }
    try {
      const { transform } = await import('@svgr/core');
      const results = await Promise.all(files.map(async (file) => {
        const content = file.buffer.toString('utf-8');
        const componentName = file.originalname
          .replace(/\.svg$/i, '')
          .replace(/[^a-zA-Z0-9]/g, ' ')
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join('');
        const rawJsx = await transform(content, {
          typescript: true,
          native: true,
          dimensions: false,
          expandProps: 'end',
          exportType: 'default',
          plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx', '@svgr/plugin-prettier'],
        }, { componentName });
        const widthMatch = content.match(/width=["']?(\d+)/);
        const heightMatch = content.match(/height=["']?(\d+)/);
        const vbMatch = content.match(/viewBox=["'](\d+)\s+(\d+)\s+(\d+)\s+(\d+)["']/);
        const w = widthMatch ? widthMatch[1] : vbMatch ? vbMatch[3] : '24';
        const h = heightMatch ? heightMatch[1] : vbMatch ? vbMatch[4] : '24';
        const viewBox = vbMatch ? `${vbMatch[1]} ${vbMatch[2]} ${vbMatch[3]} ${vbMatch[4]}` : `0 0 ${w} ${h}`;
        const svgBodyMatch = rawJsx.match(/<Svg[^>]*>([\s\S]*?)<\/Svg>/);
        const svgBody = (svgBodyMatch ? svgBodyMatch[1] : '')
          .replace(/\s*{["']?\s*["']?}\s*/g, '\n')
          .replace(/\n{3,}/g, '\n\n');
        const importTags = new Set<string>();
        const tagRegex = /<([A-Z][a-zA-Z]*)/g;
        let m;
        while ((m = tagRegex.exec(rawJsx)) !== null) {
          if (m[1] !== 'Svg' && m[1] !== 'View') importTags.add(m[1]);
        }
        const svgImports = importTags.size > 0
          ? `Svg, { ${[...importTags].join(', ')}, SvgProps }`
          : 'Svg, { SvgProps }';
        const jsx = `import * as React from 'react';
import { View } from 'react-native';
import ${svgImports} from 'react-native-svg';
import { useAppTheme } from '@app/core/theme';

const originalWidth = ${w};
const originalHeight = ${h};
const aspectRatio = originalWidth / originalHeight;

const ${componentName}: React.FC<SvgProps> = (props: SvgProps) => {
  const isThemeDark = useAppTheme().isThemeDark;
  const { semanticTokensTheme: theme } = useAppTheme();

  return (
    <View style={{ width: '100%', aspectRatio }}>
      <Svg width="100%" height="100%" viewBox={\`0 0 \${originalWidth} \${originalHeight}\`} {...props}>
${svgBody}
      </Svg>
    </View>
  );
};

export default ${componentName};
`;
        return { filePath: file.originalname, componentName, jsx };
      }));
      res.json({ results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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

  app.post('/rn-preview', upload.array('svgs'), async (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No SVG files uploaded' });
      return;
    }
    try {
      const { rnPreviewFromBuffers } = await import('../rn-preview.js');
      await rnPreviewFromBuffers(files.map(f => ({ name: f.originalname, buffer: f.buffer })));
      res.json({ success: true, message: `${files.length} component(s) written to RN preview app` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/tokens', async (req, res) => {
    try {
      const { buildTokenMap } = await import('../token-parser.js');
      const map = buildTokenMap();
      const tokens = map.allTokens.map(t => ({ path: t.path, light: t.lightHex, dark: t.darkHex }));
      res.json({ tokens });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/tokenize', express.json(), async (req, res) => {
    try {
      const { jsx, mappings } = req.body;
      // mappings: Array<{ hex: string, darkTokenPath: string, lightTokenPath: string, keep?: boolean }>
      let result = jsx;
      for (const m of mappings) {
        if (m.keep) continue;
        const escaped = m.hex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const hexRegex = new RegExp(`["']${escaped}["']`, 'gi');
        const replacement = `{isThemeDark ? theme.${m.darkTokenPath} : theme.${m.lightTokenPath}}`;
        result = result.replace(hexRegex, replacement);
      }
      res.json({ jsx: result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  app.post('/rn-preview-stream', upload.array('svgs'), async (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No SVG files uploaded' });
      return;
    }
    try {
      const { rnPreviewPrepare, launchOnSimulatorStreaming } = await import('../rn-preview.js');
      await rnPreviewPrepare(files.map(f => ({ name: f.originalname, buffer: f.buffer })));
      launchOnSimulatorStreaming(res);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/rn-preview-tsx', express.json({limit: '5mb'}), async (req, res) => {
    const { jsx, componentName } = req.body;
    if (!jsx || !componentName) {
      res.status(400).json({ error: 'Missing jsx or componentName' });
      return;
    }
    try {
      const { resolve } = await import('node:path');
      const { writeFileSync } = await import('node:fs');
      const { regenerateRegistry, launchOnSimulatorStreaming } = await import('../rn-preview.js');
      const { buildTokenMap } = await import('../token-parser.js');

      // Transform tokenized JSX for preview: replace useAppTheme with isDark prop
      let previewJsx = jsx;
      // Remove useAppTheme import
      previewJsx = previewJsx.replace(/import\s*\{[^}]*useAppTheme[^}]*\}\s*from\s*['"][^'"]+['"];\s*\n?/g, '');
      // Replace useAppTheme() calls with prop-based logic
      previewJsx = previewJsx.replace(/const\s+isThemeDark\s*=\s*useAppTheme\(\)\.isThemeDark;\s*\n?/g, '');
      previewJsx = previewJsx.replace(/const\s*\{\s*semanticTokensTheme:\s*theme\s*\}\s*=\s*useAppTheme\(\);\s*\n?/g, '');

      // Build token lookup so we can inline actual hex values
      const tokenMap = buildTokenMap();
      const byPath = new Map<string, { lightHex: string; darkHex: string }>();
      for (const t of tokenMap.allTokens) byPath.set(t.path, { lightHex: t.lightHex, darkHex: t.darkHex });
      // Replace theme.xxx references with actual hex values using isDark prop
      previewJsx = previewJsx.replace(/\{isThemeDark\s*\?\s*theme\.([^\s:]+)\s*:\s*theme\.([^\s}]+)\}/g, (_: string, darkPath: string, lightPath: string) => {
        const darkHex = byPath.get(darkPath)?.darkHex || '#ff00ff';
        const lightHex = byPath.get(lightPath)?.lightHex || '#ff00ff';
        return `{isDark ? '${darkHex}' : '${lightHex}'}`;
      });

      // Add isDark to props if not present
      if (!previewJsx.includes('isDark')) {
        previewJsx = previewJsx.replace(/(const\s+\w+:\s*React\.FC<[^>]*>\s*=\s*\()props(:\s*\w+\))/, '$1{ isDark, ...props }$2');
      }

      const rnDir = resolve(import.meta.dirname, '..', 'RNPreview', 'previews');
      writeFileSync(resolve(rnDir, `${componentName}.tsx`), previewJsx, 'utf-8');
      regenerateRegistry();
      launchOnSimulatorStreaming(res);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/stop-preview', async (req, res) => {
    const { execSync } = await import('node:child_process');
    const stopped: string[] = [];
    try {
      // Kill Metro bundler (RN)
      const metroPids = execSync('lsof -ti :8081', { encoding: 'utf-8' }).trim();
      if (metroPids) {
        execSync(`kill ${metroPids.split('\n').join(' ')}`, { encoding: 'utf-8' });
        stopped.push('Metro bundler');
      }
    } catch {}
    try {
      // Terminate RN app on simulator
      execSync('xcrun simctl terminate booted com.bskolaski.RNPreview 2>/dev/null', { encoding: 'utf-8' });
      stopped.push('RNPreview app');
    } catch {}
    try {
      // Terminate iOS app on simulator
      execSync('xcrun simctl terminate booted com.svglint.SVGPreview 2>/dev/null', { encoding: 'utf-8' });
      stopped.push('SVGPreview app');
    } catch {}
    res.json({ success: true, stopped });
  });

  app.post('/reload-rn-preview', async (req, res) => {
    const { execSync, spawn } = await import('node:child_process');
    const { resolve } = await import('node:path');
    const rnDir = resolve(import.meta.dirname, '..', 'RNPreview');
    try {
      // Kill existing Metro if running
      try {
        const pids = execSync('lsof -ti :8081', { encoding: 'utf-8' }).trim();
        if (pids) execSync(`kill ${pids.split('\n').join(' ')}`, { encoding: 'utf-8' });
      } catch {}
      // Start Metro
      const metro = spawn('npx', ['expo', 'start', '--port', '8081'], {
        cwd: rnDir,
        stdio: 'ignore',
        detached: true,
      });
      metro.unref();
      // Wait for Metro to be ready
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        try {
          execSync('lsof -ti :8081', { encoding: 'utf-8' });
          break;
        } catch {}
      }
      // Relaunch the app
      execSync('xcrun simctl terminate booted com.bskolaski.RNPreview 2>/dev/null || true', { encoding: 'utf-8' });
      execSync('xcrun simctl launch booted com.bskolaski.RNPreview 2>/dev/null', { encoding: 'utf-8' });
      res.json({ success: true });
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
<script src="/public/cm-bundle.js"></script>
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
    --critical: #fd5441;
    --critical-hover: #fba18e;
    --critical-pressed: #de2f26;
    --on-critical: #202936;
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
    --critical: #c3252a;
    --critical-hover: #de2f26;
    --critical-pressed: #a51c22;
    --on-critical: #ffffff;
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
  .platform-select { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
  .platform-card { background: var(--container); border: 1.5px solid var(--container-divider); border-radius: 8px; padding: 1rem; text-align: center; cursor: pointer; transition: all 0.15s; }
  .platform-card:hover { border-color: var(--accent); }
  .platform-card.active { border-color: var(--btn-primary); background: color-mix(in srgb, var(--btn-primary) 8%, var(--container)); }
  .platform-card .platform-icon { font-size: 1.5rem; margin-bottom: 0.375rem; }
  .platform-card .platform-name { font-size: 0.8125rem; font-weight: 600; color: var(--on-container-high); }
  .platform-card .platform-desc { font-size: 0.6875rem; color: var(--on-surface-muted); margin-top: 0.125rem; }
  .drop-zone { border: 2px dashed var(--border); border-radius: 12px; padding: 3rem 2rem; text-align: center; cursor: pointer; transition: all 0.15s; }
  .drop-zone:hover, .drop-zone.dragover { border-color: var(--accent); background: var(--surface-medium); }
  .drop-zone p { color: var(--on-surface-muted); margin-top: 0.75rem; font-size: 0.875rem; }
  .drop-zone .icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
  .drop-zone .cta { color: var(--accent); font-weight: 500; font-size: 1rem; }
  input[type="file"] { display: none; }
  .file-list { margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .file-chip.clear-all { background: var(--critical); border: 1.5px solid var(--critical); color: var(--on-critical); cursor: pointer; font-weight: 500; border-radius: 100px; padding: 0.375rem 1rem; font-size: 0.8rem; display: flex; align-items: center; transition: all 0.15s; }
  .file-chip.clear-all:hover { background: var(--critical-hover); border-color: var(--critical-hover); }
  .file-chip.clear-all:active { background: var(--critical-pressed); border-color: var(--critical-pressed); }
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
  .preview-item { border-radius: 8px; padding: 0; display: flex; flex-direction: column; position: relative; background: var(--container); border: 1px solid var(--container-divider); transition: background 0.2s; overflow: hidden; }
  .preview-item .preview-img { flex: 1; display: flex; align-items: center; justify-content: center; padding: 0.75rem; min-height: 100px; }
  .preview-item .preview-img img { max-width: 100%; max-height: 100px; }
  .preview-item .preview-footer { display: flex; align-items: center; justify-content: space-between; padding: 0.375rem 0.5rem; border-top: 1px solid var(--container-divider); background: var(--surface-medium); }
  .preview-item .preview-footer .name { font-size: 0.6875rem; color: var(--on-surface-medium); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
  .preview-item .remove { cursor: pointer; color: var(--on-surface-muted); font-size: 0.875rem; font-weight: bold; width: 1.25rem; height: 1.25rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.15s; flex-shrink: 0; }
  .preview-item .remove:hover { color: var(--error); background: var(--container-divider); }
  .preview-item .expand { position: absolute; top: 0.375rem; right: 0.375rem; cursor: pointer; color: var(--on-surface-muted); width: 1.5rem; height: 1.5rem; display: flex; align-items: center; justify-content: center; border-radius: 4px; background: var(--surface-medium); opacity: 0; transition: opacity 0.15s; border: 1px solid var(--container-divider); }
  .preview-item:hover .expand { opacity: 1; }
  .preview-item .expand:hover { color: var(--on-surface); background: var(--container-divider); }
  .lightbox { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); cursor: pointer; }
  .lightbox-content { background: var(--surface); border-radius: 12px; padding: 3rem; max-width: 90vw; max-height: 90vh; display: flex; flex-direction: column; align-items: center; gap: 1rem; cursor: default; position: relative; }
  .lightbox-content img { max-width: 640px; max-height: 65vh; width: 100%; height: auto; outline: 2px dashed var(--container-divider); outline-offset: 0; }
  .lightbox-content .lightbox-name { font-size: 0.875rem; color: var(--on-surface-medium); }
  .lightbox-close { position: absolute; top: 0.75rem; right: 0.75rem; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: none; background: var(--surface-medium); color: var(--on-surface); cursor: pointer; font-size: 1.25rem; line-height: 1; transition: background 0.15s; }
  .lightbox-close:hover { background: var(--container-divider); }
  .build-log { margin-top: 0.75rem; border: 1px solid var(--container-divider); border-radius: 8px; overflow: hidden; }
  .build-log-header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: var(--surface-medium); font-size: 0.75rem; font-weight: 600; color: var(--on-surface-medium); }
  .build-log-close { background: none; border: none; color: var(--on-surface-muted); cursor: pointer; font-size: 1rem; padding: 0; line-height: 1; }
  .build-log-close:hover { color: var(--on-surface); }
  .build-log-content { margin: 0; padding: 0.75rem; font-size: 0.6875rem; line-height: 1.4; max-height: 200px; overflow-y: auto; background: var(--container); color: var(--on-surface-medium); white-space: pre-wrap; word-break: break-all; }
  .preview-grid[data-bg="surface"] .preview-item .preview-img { background: var(--surface); }
  .bg-toggle { display: none; align-items: center; gap: 0.5rem; margin-top: 0.5rem; font-size: 0.75rem; color: var(--on-surface-muted); }
  .bg-toggle.visible { display: flex; }
  .bg-toggle span.label { font-size: 0.75rem; }
  .bg-toggle .bg-track { width: 2.75rem; height: 1.5rem; background: var(--surface-medium); border: 1px solid var(--border); border-radius: 100px; position: relative; cursor: pointer; transition: all 0.2s; }
  .bg-toggle .bg-track:hover { border-color: var(--accent); }
  .bg-toggle .bg-knob { position: absolute; top: 2px; left: 2px; width: 1.125rem; height: 1.125rem; background: var(--btn-primary); border-radius: 50%; transition: transform 0.2s; }
  .bg-toggle .bg-track.surface .bg-knob { transform: translateX(1.25rem); }
  .bg-toggle .bg-label { font-size: 0.6875rem; color: var(--on-surface-muted); }
  .btn-code-toggle { background: transparent; border: 1px solid var(--border); border-radius: 100px; padding: 0.25rem 0.75rem; font-size: 0.75rem; color: var(--on-surface-muted); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
  .btn-code-toggle:hover { border-color: var(--accent); color: var(--accent); }
  .code-block { position: relative; }
  .btn-copy { position: absolute; top: 0.75rem; right: 0.75rem; background: var(--surface-medium); border: 1px solid var(--border); border-radius: 6px; padding: 0.25rem 0.5rem; font-size: 0.75rem; color: var(--on-surface-muted); cursor: pointer; display: flex; align-items: center; gap: 0.25rem; transition: all 0.15s; }
  .btn-copy:hover { border-color: var(--accent); color: var(--accent); }
  .btn-copy svg { width: 14px; height: 14px; fill: currentColor; }
  .code-section { margin-top: 2rem; }
  .code-block { background: var(--surface); border: 1px solid var(--container-divider); border-radius: 8px; padding: 1.25rem 1.5rem; margin-bottom: 1rem; margin-top: 0.75rem; }
  .code-block h3 { font-size: 0.875rem; font-weight: 600; margin-bottom: 1rem; color: var(--on-container-high); }
  .code-block pre { font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, monospace; font-size: 0.8125rem; line-height: 1.8; color: var(--on-container-medium); white-space: pre; overflow-x: auto; counter-reset: line; }
  .code-block .line { display: block; }
  .code-block .line::before { counter-increment: line; content: counter(line); display: inline-block; width: 2.5rem; margin-right: 1rem; text-align: right; color: var(--on-surface-muted); opacity: 0.5; font-size: 0.75rem; user-select: none; }
  .svg-editor-container .cm-editor { max-height: 400px; overflow-y: auto; font-size: 0.8125rem; }
  .svg-editor-container .cm-editor .cm-scroller { overflow: auto; }
  .svg-editor-container .cm-editor.cm-focused { outline: none; }
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
<div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 1.5rem;">
<span style="font-size:0.7rem;color:var(--on-surface-muted);font-family:monospace;">v0.7.6</span>
<div class="theme-switch"><span>🌙</span><div class="theme-track" id="themeToggle"><div class="theme-knob"></div></div><span>☀️</span></div>
</div>
<div class="container">

<div class="title-row">
  <img src="/public/figgy.png" alt="Figgy" class="figgy-icon">
  <div>
    <h1>Figgity</h1>
    <p class="subtitle">Figgy validates your SVGs, no doubt</p>
  </div>
</div>

<div class="steps">
  <div class="step"><span class="step-num">1</span> Select platform</div>
  <div class="step"><span class="step-num">2</span> Upload SVGs</div>
  <div class="step"><span class="step-num">3</span> Check compatibility</div>
  <div class="step"><span class="step-num">4</span> Preview on simulator</div>
</div>

<div class="platform-select" id="platformSelect">
  <div class="platform-card active" data-platform="ios-native">
    <div class="platform-icon">🍎</div>
    <div class="platform-name">iOS native</div>
    <div class="platform-desc">CoreSVG / UIImage</div>
  </div>
  <div class="platform-card" data-platform="android-native">
    <div class="platform-icon">🤖</div>
    <div class="platform-name">Android native</div>
    <div class="platform-desc">VectorDrawable</div>
  </div>
  <div class="platform-card" data-platform="react-native">
    <div class="platform-icon">⚛️</div>
    <div class="platform-name">React Native</div>
    <div class="platform-desc">react-native-svg</div>
  </div>
</div>

<div id="uploadSection">
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
</div>

<div id="comingSoon" style="display:none; text-align:center; padding: 3rem 2rem;">
  <div style="font-size:2.5rem; margin-bottom:0.75rem;">🤖</div>
  <h2 style="font-size:1.125rem; font-weight:600; color:var(--on-surface-high); margin-bottom:0.5rem;">Android support coming soon</h2>
  <p style="color:var(--on-surface-muted); font-size:0.875rem;">VectorDrawable lint rules and emulator preview are on the roadmap.</p>
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
const platformCards = document.querySelectorAll('.platform-card');

let files = [];
let lastResults = null;
let selectedPlatform = 'ios-native';

platformCards.forEach(card => {
  card.addEventListener('click', () => {
    platformCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    selectedPlatform = card.getAttribute('data-platform');
    updatePlatformUI();
  });
});

function updatePlatformUI() {
  const uploadSection = document.getElementById('uploadSection');
  const comingSoon = document.getElementById('comingSoon');
  if (selectedPlatform === 'android-native') {
    uploadSection.style.display = 'none';
    comingSoon.style.display = 'block';
    previewBtn.style.display = 'none';
    resultsDiv.innerHTML = '';
  } else {
    uploadSection.style.display = '';
    comingSoon.style.display = 'none';
    if (selectedPlatform === 'react-native') {
      previewBtn.style.display = 'none';
    } else {
      previewBtn.style.display = '';
      previewBtn.textContent = 'Launch on simulator';
    }
  }
  // Show/hide convert buttons in results
  document.querySelectorAll('[data-convert-btn]').forEach(btn => {
    btn.style.display = selectedPlatform === 'react-native' ? '' : 'none';
  });
}

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

function expandPreview(name) {
  const file = files.find(f => f.name === name);
  if (!file) return;
  const url = URL.createObjectURL(file);
  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.innerHTML = '<div class="lightbox-content"><button class="lightbox-close" onclick="this.closest(\\'.lightbox\\').remove()">×</button><img src="' + url + '" alt="' + esc(name) + '"><span class="lightbox-name">' + esc(name) + '</span></div>';
  function close() { overlay.remove(); URL.revokeObjectURL(url); document.removeEventListener('keydown', handler); }
  function handler(e) { if (e.key === 'Escape') close(); }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', handler);
  document.body.appendChild(overlay);
}

function clearAll() {
  files = [];
  resultsDiv.innerHTML = '';
  render();
}

function render() {
  lintBtn.disabled = files.length === 0;
  previewBtn.disabled = files.length === 0;
  fileList.innerHTML = files.length > 0 ? '<div class="file-chip clear-all" onclick="clearAll()">Clear all</div>' : '';
  previewGrid.innerHTML = files.map(f => {
    const url = URL.createObjectURL(f);
    return '<div class="preview-item"><span class="expand" onclick="expandPreview(\\''+esc(f.name)+'\\')"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1h4a.5.5 0 010 1H2.707l3.147 3.146a.5.5 0 01-.708.708L2 2.707V5.5a.5.5 0 01-1 0v-4a.5.5 0 01.5-.5zm13 0h-4a.5.5 0 010 1h2.793l-3.147 3.146a.5.5 0 01.708.708L14 2.707V5.5a.5.5 0 011 0v-4a.5.5 0 00-.5-.5zM1.5 15h4a.5.5 0 000-1H2.707l3.147-3.146a.5.5 0 00-.708-.708L2 13.293V10.5a.5.5 0 00-1 0v4a.5.5 0 00.5.5zm13 0h-4a.5.5 0 010-1h2.793l-3.147-3.146a.5.5 0 01.708-.708L14 13.293V10.5a.5.5 0 011 0v4a.5.5 0 01-.5.5z"/></svg></span><div class="preview-img"><img src="'+url+'" alt="'+esc(f.name)+'"></div><div class="preview-footer"><span class="name">'+esc(f.name)+'</span><span class="remove" onclick="removeFile(\\''+esc(f.name)+'\\')">×</span></div></div>';
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
  form.append('platform', selectedPlatform === 'react-native' ? 'react-native' : 'ios');
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
  const resultFile = fixContainer.closest('.result-file');
  // Disable the fix button
  const fixBtn = resultFile.querySelector('[data-fix-btn]');
  if (fixBtn) { fixBtn.disabled = true; fixBtn.textContent = 'Fixed'; }
  if (r.applied.length === 0) {
    fixContainer.innerHTML = '<p style="color:var(--warning);margin:0.5rem 0;font-size:0.875rem;">⚠ No automatic fixes available — remaining issues require manual changes</p>';
    fixContainer.style.display = 'block';
    return;
  }
  // Populate fixed code
  const fixedCodeEl = document.getElementById(baseId + '-fixed');
  if (fixedCodeEl) {
    fixedCodeEl.querySelector('pre').innerHTML = highlightSvg(formatXml(r.fixed), []);
  }
  // Show code wrapper with fixed view
  const wrapper = resultFile.querySelector('.code-wrapper');
  if (wrapper) wrapper.style.display = '';
  const origEl = document.getElementById(baseId + '-orig');
  if (origEl) origEl.style.display = 'none';
  if (fixedCodeEl) fixedCodeEl.style.display = '';
  // Update buttons: rename Show SVG code -> Hide SVG code, show "Show original"
  const showCodeBtn = [...resultFile.querySelectorAll('.action-row button')].find(b => b.textContent === 'Show SVG code');
  if (showCodeBtn) showCodeBtn.textContent = 'Hide SVG code';
  const toggleBtn = resultFile.querySelector('[data-toggle-id]');
  if (toggleBtn) { toggleBtn.style.display = ''; toggleBtn.textContent = 'Show original'; }
  // Build fix results + download button below code
  let html = '<p style="margin:0.75rem 0 0.25rem;font-size:0.875rem;font-weight:600;color:var(--success);">✓ Fixed:</p>';
  html += '<ul style="margin:0.25rem 0 0;padding-left:1.25rem;color:var(--on-surface-medium);font-size:0.875rem;">';
  for (const a of r.applied) { html += '<li style="margin:0.25rem 0;">' + esc(a) + '</li>'; }
  html += '</ul>';
  if (r.remaining && r.remaining.length > 0) {
    html += '<p style="margin:0.75rem 0 0.25rem;font-size:0.875rem;font-weight:600;color:var(--warning);">⚠ Remaining issues (require manual fix):</p>';
    html += '<ul style="margin:0.25rem 0 0;padding-left:1.25rem;color:var(--on-surface-medium);font-size:0.875rem;">';
    for (const m of r.remaining) {
      const icon = m.severity === 'error' ? '✖' : m.severity === 'warning' ? '⚠' : 'ℹ';
      html += '<li style="margin:0.25rem 0;"><span style="color:var(--' + m.severity + ')">' + icon + '</span> ' + esc(m.message.split(/(?<=!) /)[0]) + ' <span style="opacity:0.7;">(' + esc(m.ruleId) + ')</span></li>';
    }
    html += '</ul>';
  } else {
    html += '<p style="margin:0.75rem 0 0;font-size:0.875rem;color:var(--success);">✓ All issues resolved</p>';
  }
  html += '<div style="margin-top:0.75rem;"><button class="btn btn-secondary" style="margin-top:0;" onclick="downloadFixed(\\'' + esc(filePath) + '\\')">Download fixed SVG</button></div>';
  fixContainer.innerHTML = html;
  fixContainer.style.display = 'block';
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

async function convertToJsx(filePath, btn) {
  const file = files.find(f => f.name === filePath);
  if (!file) return;
  btn.disabled = true;
  btn.textContent = 'Converting...';
  const form = new FormData();
  form.append('svgs', file);
  try {
    const res = await fetch('/convert', { method: 'POST', body: form });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const r = data.results[0];
    const resultFile = btn.closest('.result-file');
    let container = resultFile.querySelector('.jsx-output');
    if (!container) {
      container = document.createElement('div');
      container.className = 'jsx-output';
      resultFile.appendChild(container);
    }
    const jsxEditorId = 'jsx-editor-' + btoa(r.filePath).replace(/[^a-z0-9]/gi, '');
    container.innerHTML = '<p style="margin:0.75rem 0 0.25rem;font-size:0.875rem;font-weight:600;color:var(--on-surface);">JSX output: <code>' + esc(r.componentName) + '.tsx</code></p>'
      + '<div class="code-view-container" id="' + jsxEditorId + '-view"><div class="code-block" style="display:block;"><button class="btn-copy" onclick="copyCode(this)"><svg viewBox="0 0 16 16"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/></svg>Copy</button><pre>' + highlightJsx(r.jsx) + '</pre></div></div>'
      + '<div class="svg-editor-container" id="' + jsxEditorId + '" data-lang="jsx" style="display:none;margin-top:0.5rem;border-radius:8px;overflow:hidden;border:1px solid var(--border);"></div>'
      + '<div style="margin-top:0.5rem;display:flex;gap:0.5rem;flex-wrap:wrap;"><button class="btn btn-secondary" style="margin-top:0;" onclick="toggleJsxEdit(\\'' + jsxEditorId + '\\')">Edit .tsx</button><button class="btn btn-secondary" style="margin-top:0;" onclick="downloadJsx(\\'' + esc(r.componentName) + '\\', \\'' + jsxEditorId + '\\')">Download .tsx</button><button class="btn btn-secondary expo-preview-btn" style="margin-top:0;" onclick="previewInExpo(\\'' + esc(r.filePath) + '\\', this)">Preview in Expo</button><button class="btn btn-secondary expo-reload-btn" style="margin-top:0;display:none;" onclick="reloadRnPreview(this)">Reload preview</button><button class="btn btn-secondary expo-stop-btn" style="margin-top:0;display:none;" onclick="stopRnPreview(this)">Stop preview</button><button class="btn btn-secondary" style="margin-top:0;margin-left:auto;" onclick="showTokenPanel(this)">Tokenize colors</button></div>';
    container.dataset.jsx = r.jsx;
    container.dataset.componentName = r.componentName;
    container.dataset.filePath = r.filePath;
    container.style.display = 'block';
    btn.textContent = 'Converted';
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Convert to .tsx component';
    alert('Conversion failed: ' + e.message);
  }
}

function toggleJsxEdit(editorId) {
  const viewEl = document.getElementById(editorId + '-view');
  const editorEl = document.getElementById(editorId);
  if (!viewEl || !editorEl) return;
  const container = editorEl.closest('.jsx-output');
  const editBtn = [...container.querySelectorAll('button')].find(b => b.textContent === 'Edit .tsx' || b.textContent === 'View .tsx');

  if (editorEl.style.display === 'none') {
    viewEl.style.display = 'none';
    editorEl.style.display = '';
    if (editBtn) editBtn.textContent = 'View .tsx';
    if (!editorInstances[editorId] && window.CM) {
      const jsx = container.dataset.jsx || '';
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      const extensions = [
        CM.basicSetup, CM.javascript({jsx: true, typescript: true}), CM.EditorView.lineWrapping,
        CM.EditorView.updateListener.of(update => {
          if (update.docChanged) { container.dataset.jsx = update.state.doc.toString(); }
        }),
      ];
      if (isDark) extensions.push(CM.oneDark);
      const state = CM.EditorState.create({ doc: jsx, extensions });
      const view = new CM.EditorView({ state, parent: editorEl });
      editorInstances[editorId] = view;
    }
  } else {
    editorEl.style.display = 'none';
    viewEl.style.display = '';
    if (editBtn) editBtn.textContent = 'Edit .tsx';
    const pre = viewEl.querySelector('pre');
    if (pre) pre.innerHTML = highlightJsx(container.dataset.jsx || '');
  }
}

function downloadJsx(componentName, editorId) {
  const container = document.getElementById(editorId)?.closest('.jsx-output');
  const content = container?.dataset?.jsx || '';
  if (!content) return;
  const blob = new Blob([content], { type: 'text/typescript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = componentName + '.tsx'; a.click();
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
  lastResults = results;
  let totalE = 0, totalW = 0, totalI = 0;
  const clean = results.filter(r => r.messages.length === 0);
  const issues = results.filter(r => r.messages.length > 0);
  let html = '';
  for (const r of clean) {
    const id = 'code-' + btoa(r.filePath).replace(/[^a-z0-9]/gi, '');
    html += '<div class="result-file clean"><div class="result-header"><h3><span class="check">✓</span> ' + esc(r.filePath) + '</h3></div>';
    html += '<div style="margin-top:0.5rem;display:flex;gap:0.5rem;"><button class="btn btn-secondary" style="margin-top:0;" onclick="toggleCode(\\'' + id + '\\')">Show SVG code</button><button class="btn btn-secondary" style="margin-top:0;" onclick="toggleEditMode(\\'' + id + '\\')">Edit SVG</button><button class="btn btn-secondary" data-convert-btn style="margin-top:0;' + (selectedPlatform !== 'react-native' ? 'display:none;' : '') + '" onclick="convertToJsx(\\'' + esc(r.filePath) + '\\', this)">Convert to .tsx component</button></div>';
    html += '<div class="code-wrapper" style="display:none;">';
    html += '<div class="code-view-container" id="' + id + '-view"><div class="code-block" style="display:block;"><button class="btn-copy" onclick="copyCode(this)"><svg viewBox="0 0 16 16"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/></svg>Copy</button><pre>' + highlightSvg(formatXml(fileContents[r.filePath] || ''), []) + '</pre></div></div>';
    html += '<div class="svg-editor-container" id="' + id + '-editor" data-file="' + esc(r.filePath) + '" style="display:none;margin-top:0.5rem;border-radius:8px;overflow:hidden;border:1px solid var(--border);"></div>';
    html += '<div style="display:flex;gap:0.5rem;margin-top:0.5rem;display:none;" data-recheck-row><button class="btn btn-secondary" style="margin-top:0;" data-recheck-btn onclick="reCheckSvg(\\'' + esc(r.filePath) + '\\', this)">Re-check compatibility</button></div>';
    html += '</div>';
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
    html += '<div class="result-header"><h3>' + esc(r.filePath) + '</h3></div>';
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
    html += '<div class="action-row" style="display:flex;margin-top:0.75rem;align-items:center;justify-content:space-between;">';
    html += '<button class="btn btn-secondary" style="margin-top:0;" data-fix-btn onclick="fixFile(\\'' + esc(r.filePath) + '\\')">Fix issues</button>';
    html += '<div style="display:flex;gap:0.5rem;">';
    html += '<button class="btn btn-secondary" style="margin-top:0;display:none;" data-toggle-id="' + id + '" onclick="toggleCodeView(\\'' + id + '\\')">Show original</button>';
    html += '<button class="btn btn-secondary" style="margin-top:0;" onclick="toggleCode(\\'' + id + '\\')">Show SVG code</button>';
    html += '<button class="btn btn-secondary" style="margin-top:0;" onclick="toggleEditMode(\\'' + id + '\\')">Edit SVG</button>';
    html += '<button class="btn btn-secondary" data-convert-btn style="margin-top:0;' + (selectedPlatform !== 'react-native' ? 'display:none;' : '') + '" onclick="convertToJsx(\\'' + esc(r.filePath) + '\\', this)">Convert to .tsx component</button>';
    html += '</div></div>';
    html += '<div class="code-wrapper" style="display:none;">';
    html += '<div class="code-view-container" id="' + id + '-view"><div class="code-block" style="display:block;"><button class="btn-copy" onclick="copyCode(this)"><svg viewBox="0 0 16 16"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/></svg>Copy</button><pre>' + highlightSvg(formatXml(fileContents[r.filePath] || ''), msgs) + '</pre></div></div>';
    html += '<div class="svg-editor-container" id="' + id + '-editor" data-file="' + esc(r.filePath) + '" style="display:none;margin-top:0.5rem;border-radius:8px;overflow:hidden;border:1px solid var(--border);"></div>';
    html += '<div style="display:flex;gap:0.5rem;margin-top:0.5rem;display:none;" data-recheck-row><button class="btn btn-secondary" style="margin-top:0;" data-recheck-btn onclick="reCheckSvg(\\'' + esc(r.filePath) + '\\', this)">Re-check compatibility</button></div>';
    html += '</div>';
    html += '<div id="' + fixId + '" style="display:none;"></div>';
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

const editorInstances = {};

function toggleCode(id) {
  const viewEl = document.getElementById(id + '-view');
  if (!viewEl) return;
  const resultFile = viewEl.closest('.result-file');
  const wrapper = resultFile.querySelector('.code-wrapper');
  const codeBtn = [...resultFile.querySelectorAll('button')].find(b => b.textContent === 'Show SVG code' || b.textContent === 'Hide SVG code');

  if (wrapper.style.display === 'none') {
    wrapper.style.display = '';
    if (codeBtn) codeBtn.textContent = 'Hide SVG code';
  } else {
    wrapper.style.display = 'none';
    if (codeBtn) codeBtn.textContent = 'Show SVG code';
  }
}

function toggleEditMode(id) {
  const viewEl = document.getElementById(id + '-view');
  const editorEl = document.getElementById(id + '-editor');
  if (!viewEl || !editorEl) return;
  const resultFile = editorEl.closest('.result-file');
  const wrapper = editorEl.closest('.code-wrapper');
  const editBtn = [...resultFile.querySelectorAll('button')].find(b => b.textContent === 'Edit SVG' || b.textContent === 'Done editing');
  const recheckRow = wrapper.querySelector('[data-recheck-row]');
  const codeBtn = [...resultFile.querySelectorAll('button')].find(b => b.textContent === 'Show SVG code' || b.textContent === 'Hide SVG code');

  if (editorEl.style.display === 'none') {
    // Show wrapper if hidden
    if (wrapper.style.display === 'none') {
      wrapper.style.display = '';
      if (codeBtn) codeBtn.textContent = 'Hide SVG code';
    }
    viewEl.style.display = 'none';
    editorEl.style.display = '';
    if (editBtn) editBtn.textContent = 'Done editing';
    if (recheckRow) recheckRow.style.display = 'flex';
    if (!editorInstances[id] && window.CM) {
      const filePath = editorEl.dataset.file;
      const content = fileContents[filePath] || '';
      const formatted = formatXml(content);
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      const extensions = [
        CM.basicSetup,
        CM.xml(),
        CM.EditorView.lineWrapping,
        CM.EditorView.updateListener.of(update => {
          if (update.docChanged) {
            const newContent = update.state.doc.toString();
            fileContents[filePath] = newContent;
            const fileIdx = files.findIndex(f => f.name === filePath);
            if (fileIdx !== -1) {
              files[fileIdx] = new File([newContent], filePath, { type: 'image/svg+xml' });
            }
          }
        }),
      ];
      if (isDark) extensions.push(CM.oneDark);
      const state = CM.EditorState.create({ doc: formatted, extensions });
      const view = new CM.EditorView({ state, parent: editorEl });
      editorInstances[id] = view;
    }
  } else {
    editorEl.style.display = 'none';
    viewEl.style.display = '';
    if (editBtn) editBtn.textContent = 'Edit SVG';
    if (recheckRow) recheckRow.style.display = 'none';
    const filePath = editorEl.dataset.file;
    const pre = viewEl.querySelector('pre');
    if (pre) pre.innerHTML = highlightSvg(formatXml(fileContents[filePath] || ''), []);
  }
}

async function reCheckSvg(filePath, btn) {
  const content = fileContents[filePath];
  if (!content) return;
  btn.disabled = true;
  btn.textContent = 'Checking...';
  const form = new FormData();
  form.append('svgs', new File([content], filePath, { type: 'image/svg+xml' }));
  try {
    const res = await fetch('/check', { method: 'POST', body: form });
    const data = await res.json();
    if (data.results) {
      const allResults = [...data.results];
      files.forEach(f => {
        if (f.name !== filePath) {
          const existing = lastResults && lastResults.find(r => r.filePath === f.name);
          if (existing) allResults.push(existing);
        }
      });
      lastResults = allResults;
      renderResults(allResults);
    }
  } catch (e) {
    btn.textContent = 'Error';
  }
  btn.disabled = false;
  btn.textContent = 'Re-check compatibility';
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
      previewBtn.dataset.launched = 'true';
      setTimeout(() => { previewBtn.textContent = 'Relaunch on simulator'; previewBtn.disabled = false; }, 2000);
    } else {
      previewBtn.textContent = 'Failed';
      resultsDiv.innerHTML = '<div class="summary"><span class="errors">' + esc(data.error) + '</span></div>' + resultsDiv.innerHTML;
      setTimeout(() => { updatePlatformUI(); previewBtn.disabled = false; }, 2000);
    }
  } catch (e) {
    previewBtn.textContent = 'Failed';
    resultsDiv.innerHTML = '<div class="summary"><span class="errors">' + esc(e.message) + '</span></div>' + resultsDiv.innerHTML;
    setTimeout(() => { updatePlatformUI(); previewBtn.disabled = false; }, 2000);
  }
});

async function previewInExpo(filePath, btn) {
  const file = files.find(f => f.name === filePath);
  if (!file) return;
  btn.disabled = true;
  btn.textContent = 'Building...';

  // Create or reuse build log panel
  const resultFile = btn.closest('.result-file') || btn.closest('.jsx-output').parentElement;
  let logPanel = resultFile.querySelector('.build-log');
  if (!logPanel) {
    logPanel = document.createElement('div');
    logPanel.className = 'build-log';
    logPanel.innerHTML = '<div class="build-log-header"><span>Build output</span><button class="build-log-close" onclick="this.closest(\\'.build-log\\').style.display=\\'none\\'">×</button></div><pre class="build-log-content"></pre>';
    resultFile.appendChild(logPanel);
  }
  logPanel.style.display = 'block';
  const logContent = logPanel.querySelector('.build-log-content');
  logContent.textContent = '';

  const form = new FormData();
  form.append('svgs', file);

  try {
    const res = await fetch('/rn-preview-stream', { method: 'POST', body: form });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const msg = JSON.parse(line.slice(6));
          if (msg === '__DONE__') {
            btn.style.display = 'none';
            const container = btn.closest('div');
            container.querySelector('.expo-reload-btn').style.display = '';
            container.querySelector('.expo-stop-btn').style.display = '';
            logContent.textContent += '\\n✓ App launched on simulator';
            btn.disabled = false;
            return;
          } else if (msg === '__ERROR__') {
            btn.textContent = 'Build failed';
            const container = btn.closest('div');
            container.querySelector('.expo-stop-btn').style.display = '';
            setTimeout(() => { btn.textContent = 'Preview in Expo'; btn.disabled = false; }, 3000);
            return;
          } else {
            logContent.textContent += msg + '\\n';
            logContent.scrollTop = logContent.scrollHeight;
          }
        }
      }
    }
  } catch (e) {
    btn.textContent = 'Failed';
    logContent.textContent += '\\nError: ' + e.message;
    setTimeout(() => { btn.textContent = 'Preview in Expo'; btn.disabled = false; }, 3000);
  }
}

async function stopRnPreview(btn) {
  btn.disabled = true;
  btn.textContent = 'Stopping...';
  try {
    const res = await fetch('/stop-preview', { method: 'POST' });
    const data = await res.json();
    btn.textContent = data.stopped.length > 0 ? 'Stopped ✓' : 'Nothing running';
  } catch (e) {
    btn.textContent = 'Error: ' + e.message;
  }
  const container = btn.closest('div');
  setTimeout(() => {
    btn.style.display = 'none';
    container.querySelector('.expo-reload-btn').style.display = 'none';
    const previewBtn = container.querySelector('.expo-preview-btn');
    previewBtn.style.display = '';
    previewBtn.textContent = 'Preview in Expo';
    btn.disabled = false;
    btn.textContent = 'Stop preview';
  }, 2000);
}

async function reloadRnPreview(btn) {
  btn.disabled = true;
  btn.textContent = 'Reloading...';
  try {
    const res = await fetch('/reload-rn-preview', { method: 'POST' });
    const data = await res.json();
    btn.textContent = data.success ? 'Reloaded ✓' : 'Loading...';
  } catch (e) {
    btn.textContent = 'Error: ' + e.message;
  }
  setTimeout(() => { btn.disabled = false; btn.textContent = 'Reload preview'; }, 2000);
}


let tokenCache = null;
async function loadTokens() {
  if (tokenCache) return tokenCache;
  const res = await fetch('/tokens');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  tokenCache = data.tokens;
  return tokenCache;
}

function expandHex(hex) {
  const h = hex.toLowerCase();
  if (h.length === 4) return '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  return h;
}

function extractHexColors(jsx) {
  const hexRegex = /#[0-9a-fA-F]{3,8}\\b/g;
  const matches = jsx.match(hexRegex) || [];
  const unique = [...new Set(matches.map(h => expandHex(h)))];
  return unique;
}

async function showTokenPanel(btn) {
  const container = btn.closest('.jsx-output');
  const jsx = container.dataset.jsx;
  if (!jsx) return;

  let existing = container.querySelector('.token-panel');
  if (existing) { existing.style.display = existing.style.display === 'none' ? 'block' : 'none'; return; }

  btn.disabled = true;
  btn.textContent = 'Loading tokens...';

  try {
    const tokens = await loadTokens();
    const colors = extractHexColors(jsx);

    const panel = document.createElement('div');
    panel.className = 'token-panel';
    panel.style.cssText = 'margin-top:1rem;border:1px solid var(--border);border-radius:8px;padding:1rem;background:var(--surface-container);';

    // Read the original SVG for inline preview
    const filePath = container.dataset.filePath;
    const file = files.find(f => f.name === filePath);
    const svgContent = file ? await file.text() : '';

    const lightSurface = tokens.find(t => t.path === 'surface.surface')?.light || '#f6f6f6';
    const lightContainer = tokens.find(t => t.path === 'container.surfaceContainer')?.light || '#ffffff';
    const darkSurface = tokens.find(t => t.path === 'surface.surface')?.dark || '#111827';
    const darkContainer = tokens.find(t => t.path === 'container.surfaceContainer')?.dark || '#202936';

    let html = '<p style="font-size:0.875rem;font-weight:600;color:var(--on-surface);margin-bottom:0.75rem;">Color token assignment</p>';
    html += '<div style="font-size:0.75rem;color:var(--on-surface-muted);margin-bottom:0.75rem;">Assign each color to a design system token. The exported component will use theme ternaries.</div>';

    // Inline preview section
    html += '<div class="token-preview-section" style="margin-bottom:1rem;">';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">';
    html += '<div><div style="margin-bottom:0.5rem;"><span style="font-size:0.75rem;font-weight:600;color:var(--on-surface-muted);">Original</span></div>';
    html += '<div class="token-preview-frame" style="border-radius:8px;padding:1rem;border:1px solid var(--border);background:var(--surface);"><div class="preview-svg preview-original">' + svgContent + '</div></div></div>';
    html += '<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;"><span style="font-size:0.75rem;font-weight:600;color:var(--on-surface-muted);">Light</span>';
    html += '<select class="token-bg-select" onchange="updatePreviewBg(this)" style="font-size:0.7rem;padding:1px 4px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--on-surface);">';
    html += '<option value="' + lightSurface + '">surface</option><option value="' + lightContainer + '">surfaceContainer</option></select></div>';
    html += '<div class="token-preview-frame" style="border-radius:8px;padding:1rem;border:1px solid var(--border);background:' + lightSurface + ';"><div class="preview-svg preview-light">' + svgContent + '</div></div></div>';
    html += '<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;"><span style="font-size:0.75rem;font-weight:600;color:var(--on-surface-muted);">Dark</span>';
    html += '<select class="token-bg-select" onchange="updatePreviewBg(this)" style="font-size:0.7rem;padding:1px 4px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--on-surface);">';
    html += '<option value="' + darkSurface + '">surface</option><option value="' + darkContainer + '">surfaceContainer</option></select></div>';
    html += '<div class="token-preview-frame" style="border-radius:8px;padding:1rem;border:1px solid var(--border);background:' + darkSurface + ';"><div class="preview-svg preview-dark">' + svgContent + '</div></div></div>';
    html += '</div></div>';

    html += '<div style="display:grid;grid-template-columns:24px 70px 24px 1fr 24px 1fr;gap:0.5rem;align-items:center;margin-bottom:0.5rem;">';
    html += '<div></div><span style="font-size:0.7rem;font-weight:600;color:var(--on-surface-muted);">HEX</span>';
    html += '<div></div><span style="font-size:0.7rem;font-weight:600;color:var(--on-surface-muted);">LIGHT</span>';
    html += '<div></div><span style="font-size:0.7rem;font-weight:600;color:var(--on-surface-muted);">DARK</span>';
    html += '</div>';

    for (const hex of colors) {
      const matches = tokens.filter(t => t.light === hex || t.dark === hex);
      const suggested = matches.length > 0 ? matches[0].path : '';
      const suggestedLight = suggested ? tokens.find(t => t.path === suggested)?.light || '' : '';
      const suggestedDark = suggested ? tokens.find(t => t.path === suggested)?.dark || '' : '';

      html += '<div class="token-row" data-hex="' + hex + '" style="display:grid;grid-template-columns:24px 70px 24px 1fr 24px 1fr;gap:0.5rem;align-items:center;margin-bottom:0.5rem;">';

      html += '<div style="width:24px;height:24px;border-radius:4px;border:1px solid var(--border);background:' + hex + ';flex-shrink:0;"></div>';
      html += '<code style="font-size:0.75rem;">' + hex + '</code>';

      html += '<div class="token-swatch-light" style="width:24px;height:24px;border-radius:4px;border:1px solid var(--border);background:' + (suggestedLight || 'transparent') + ';"></div>';
      html += '<select class="token-select-light" onchange="updateTokenSwatch(this, \\'light\\')" style="font-size:0.75rem;padding:2px 4px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--on-surface);min-width:0;">';
      html += '<option value="" data-hex="">— keep as-is —</option>';
      for (const t of tokens) {
        const sel = t.path === suggested ? ' selected' : '';
        html += '<option value="' + t.path + '" data-hex="' + t.light + '"' + sel + '>' + t.path + ' (' + t.light + ')</option>';
      }
      html += '</select>';

      html += '<div class="token-swatch-dark" style="width:24px;height:24px;border-radius:4px;border:1px solid var(--border);background:' + (suggestedDark || 'transparent') + ';"></div>';
      html += '<select class="token-select-dark" onchange="updateTokenSwatch(this, \\'dark\\')" style="font-size:0.75rem;padding:2px 4px;border-radius:4px;border:1px solid var(--border);background:var(--surface);color:var(--on-surface);min-width:0;">';
      html += '<option value="" data-hex="">— same as light —</option>';
      for (const t of tokens) {
        const sel = t.path === suggested ? ' selected' : '';
        html += '<option value="' + t.path + '" data-hex="' + t.dark + '"' + sel + '>' + t.path + ' (' + t.dark + ')</option>';
      }
      html += '</select>';

      html += '</div>';
    }

    html += '<div style="margin-top:0.75rem;display:flex;gap:0.5rem;">';
    html += '<button class="btn" onclick="applyTokens(this)">Apply tokens and download .tsx</button>';
    html += '<button class="btn btn-secondary" onclick="previewWithTokens(this)">Preview with tokens</button>';
    html += '</div>';

    panel.innerHTML = html;
    panel.dataset.svgContent = svgContent;
    container.appendChild(panel);

    // Size SVGs to fit
    panel.querySelectorAll('.preview-svg svg').forEach(svg => {
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', 'auto');
    });

    btn.textContent = 'Tokenize colors';
    btn.disabled = false;
  } catch (e) {
    btn.textContent = 'Tokenize colors';
    btn.disabled = false;
    alert('Failed to load tokens: ' + e.message);
  }
}

function updateTokenSwatch(select, mode) {
  const row = select.closest('.token-row');
  const swatch = row.querySelector('.token-swatch-' + mode);
  const selected = select.options[select.selectedIndex];
  const hex = selected.dataset.hex || '';
  swatch.style.background = hex || 'transparent';
  refreshTokenPreview(select.closest('.token-panel'));
}

function refreshTokenPreview(panel) {
  if (!panel) return;
  const svgContent = panel.dataset.svgContent;
  if (!svgContent) return;
  const mappings = getTokenMappingsWithHex(panel, tokenCache);

  function applyColors(svg, mode) {
    let result = svg;
    for (const m of mappings) {
      if (m.keep) continue;
      const target = mode === 'light' ? m.lightHex : m.darkHex;
      result = result.split(m.hex).join(target);
      // Also handle case-insensitive by trying uppercase variant
      result = result.split(m.hex.toUpperCase()).join(target);
    }
    return result;
  }

  const lightDiv = panel.querySelector('.preview-light');
  const darkDiv = panel.querySelector('.preview-dark');
  if (lightDiv) {
    lightDiv.innerHTML = applyColors(svgContent, 'light');
    lightDiv.querySelectorAll('svg').forEach(s => { s.setAttribute('width', '100%'); s.setAttribute('height', 'auto'); });
  }
  if (darkDiv) {
    darkDiv.innerHTML = applyColors(svgContent, 'dark');
    darkDiv.querySelectorAll('svg').forEach(s => { s.setAttribute('width', '100%'); s.setAttribute('height', 'auto'); });
  }
}

function getTokenMappingsWithHex(panel, tokens) {
  const rows = panel.querySelectorAll('.token-row');
  const mappings = [];
  rows.forEach(row => {
    const hex = row.dataset.hex;
    const lightSelect = row.querySelector('.token-select-light');
    const darkSelect = row.querySelector('.token-select-dark');
    const lightPath = lightSelect.value;
    const darkPath = darkSelect.value || lightPath;
    if (!lightPath) {
      mappings.push({ hex, keep: true });
    } else {
      const lightOpt = lightSelect.options[lightSelect.selectedIndex];
      const darkOpt = darkSelect.value ? darkSelect.options[darkSelect.selectedIndex] : lightOpt;
      const lightHex = lightOpt.dataset.hex || hex;
      const darkHex = darkOpt.dataset.hex || lightHex;
      mappings.push({ hex, lightHex, darkHex, keep: false });
    }
  });
  return mappings;
}


function updatePreviewBg(select) {
  const frame = select.closest('div').parentElement.querySelector('.token-preview-frame');
  frame.style.background = select.value;
}

async function previewWithTokens(btn) {
  const panel = btn.closest('.token-panel');
  const container = panel.closest('.jsx-output');
  const jsx = container.dataset.jsx;
  const rows = panel.querySelectorAll('.token-row');

  const mappings = [];
  rows.forEach(row => {
    const hex = row.dataset.hex;
    const lightSelect = row.querySelector('.token-select-light');
    const darkSelect = row.querySelector('.token-select-dark');
    const lightPath = lightSelect.value;
    const darkPath = darkSelect.value || lightPath;
    if (!lightPath) {
      mappings.push({ hex, keep: true });
    } else {
      mappings.push({ hex, lightTokenPath: lightPath, darkTokenPath: darkPath, keep: false });
    }
  });

  btn.disabled = true;
  btn.textContent = 'Building...';

  try {
    const tokenRes = await fetch('/tokenize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsx, mappings }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error);

    container.dataset.jsx = tokenData.jsx;
    const viewEl = container.querySelector('.code-view-container pre');
    if (viewEl) viewEl.innerHTML = highlightJsx(tokenData.jsx);

    const componentName = container.dataset.componentName || 'Component';
    const resultFile = btn.closest('.result-file') || container.parentElement;
    let logPanel = resultFile.querySelector('.build-log');
    if (!logPanel) {
      logPanel = document.createElement('div');
      logPanel.className = 'build-log';
      logPanel.innerHTML = '<div class="build-log-header"><span>Build output</span><button class="build-log-close" onclick="this.closest(\\'.build-log\\').style.display=\\'none\\'">×</button></div><pre class="build-log-content"></pre>';
      resultFile.appendChild(logPanel);
    }
    logPanel.style.display = 'block';
    const logContent = logPanel.querySelector('.build-log-content');
    logContent.textContent = '';

    const res = await fetch('/rn-preview-tsx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsx: tokenData.jsx, componentName }),
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const msg = JSON.parse(line.slice(6));
          if (msg === '__DONE__') {
            btn.textContent = 'Preview with tokens';
            btn.disabled = false;
            return;
          }
          logContent.textContent += msg + '\\n';
          logContent.scrollTop = logContent.scrollHeight;
        }
      }
    }
    btn.textContent = 'Preview with tokens';
    btn.disabled = false;
  } catch (e) {
    btn.textContent = 'Preview with tokens';
    btn.disabled = false;
    alert('Preview failed: ' + e.message);
  }
}

async function applyTokens(btn) {
  const panel = btn.closest('.token-panel');
  const container = panel.closest('.jsx-output');
  const jsx = container.dataset.jsx;
  const rows = panel.querySelectorAll('.token-row');

  const mappings = [];
  rows.forEach(row => {
    const hex = row.dataset.hex;
    const lightSelect = row.querySelector('.token-select-light');
    const darkSelect = row.querySelector('.token-select-dark');
    const lightPath = lightSelect.value;
    const darkPath = darkSelect.value || lightPath;
    if (!lightPath) {
      mappings.push({ hex, keep: true });
    } else {
      mappings.push({ hex, lightTokenPath: lightPath, darkTokenPath: darkPath, keep: false });
    }
  });

  btn.disabled = true;
  btn.textContent = 'Applying...';

  try {
    const res = await fetch('/tokenize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsx, mappings }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    container.dataset.jsx = data.jsx;
    const codeBlock = container.querySelector('pre');
    codeBlock.innerHTML = highlightJsx(data.jsx);
    panel.style.display = 'none';

    const componentName = container.dataset.componentName || 'Component';
    const blob = new Blob([data.jsx], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = componentName + '.tsx'; a.click();
    URL.revokeObjectURL(url);

    btn.textContent = 'Apply tokens and download .tsx';
    btn.disabled = false;
  } catch (e) {
    btn.textContent = 'Apply tokens and download .tsx';
    btn.disabled = false;
    alert('Tokenize failed: ' + e.message);
  }
}

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

function highlightJsx(code) {
  const keywords = ['import','export','default','const','from','type','interface','extends','return'];
  const lines = code.split('\\n');
  return lines.map(line => {
    let h = '';
    let i = 0;
    while (i < line.length) {
      if (line[i] === '<') {
        let end = line.indexOf('>', i);
        if (end === -1) end = line.length - 1;
        const tag = line.slice(i, end + 1);
        const m = tag.match(/^(<\\/?)([A-Z][a-zA-Z]*)([\\s\\S]*?)(\\/)?>$/);
        if (m) {
          let inner = esc(m[3]).replace(/([a-zA-Z][a-zA-Z0-9]*)=(&quot;.*?&quot;)/g, '<span class="attr">$1</span>=<span class="val">$2</span>');
          inner = inner.replace(/([a-zA-Z][a-zA-Z0-9]*)=(\\{[^}]*\\})/g, '<span class="attr">$1</span>=<span class="val">$2</span>');
          inner = inner.replace(/(\\{\\.\\.\\.props\\})/g, '<span class="val">$1</span>');
          h += '<span class="bracket">' + esc(m[1]) + '</span><span class="tag">' + esc(m[2]) + '</span>' + inner + (m[4] ? '<span class="bracket">/</span>' : '') + '<span class="bracket">&gt;</span>';
        } else {
          h += esc(tag);
        }
        i = end + 1;
      } else if (line[i] === '"') {
        let end = line.indexOf('"', i + 1);
        if (end === -1) end = line.length - 1;
        h += '<span class="val">' + esc(line.slice(i, end + 1)) + '</span>';
        i = end + 1;
      } else if (/[a-zA-Z_]/.test(line[i])) {
        let end = i;
        while (end < line.length && /[a-zA-Z0-9_]/.test(line[end])) end++;
        const word = line.slice(i, end);
        if (keywords.includes(word)) h += '<span class="tag">' + word + '</span>';
        else h += esc(word);
        i = end;
      } else {
        h += esc(line[i]);
        i++;
      }
    }
    return '<span class="line">' + h + '</span>';
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
