import { Command } from 'commander';
import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { lint, filterBySeverity } from './engine.js';
import { findSvgFiles, readFile } from './scanner.js';
import { formatText } from './reporter/text.js';
import { formatJson } from './reporter/json.js';
import { preview } from './preview.js';
import { startServer } from './web/server.js';
import { fixSvg } from './fixer.js';
import { rnPreview } from './rn-preview.js';
import type { Config, Severity } from './types.js';

export function createCli() {
  const program = new Command();

  program
    .name('svg-lint')
    .description('SVG compatibility checker for iOS/Xcode asset catalogs')
    .version('1.0.0')
    .argument('[files...]', 'SVG files to lint')
    .option('-d, --dir <path>', 'Scan directory recursively for SVG files')
    .option('-f, --format <type>', 'Output format: text | json', 'text')
    .option('-s, --severity <level>', 'Minimum severity to report: error | warning | info', 'info')
    .option('-c, --config <path>', 'Path to config file (.svglintrc.json)')
    .option('--ignore <patterns...>', 'Glob patterns to ignore')
    .option('--fix', 'Auto-fix issues (strip namespaces, remove <style>/<script>, inline CSS)')
    .action((files: string[], options) => {
      const config = loadConfig(options.config);
      const ignore = [...(config?.ignore ?? []), ...(options.ignore ?? [])];

      let svgFiles: string[] = [];

      if (options.dir) {
        svgFiles = findSvgFiles([resolve(options.dir, '**/*.svg')], ignore);
      }

      if (files.length > 0) {
        svgFiles = [...svgFiles, ...files.map(f => resolve(f))];
      }

      if (svgFiles.length === 0) {
        console.error('No SVG files found. Provide file paths or use --dir.');
        process.exit(2);
      }

      if (options.fix) {
        for (const filePath of svgFiles) {
          const content = readFile(filePath);
          const { fixed, applied } = fixSvg(content);
          if (applied.length > 0) {
            writeFileSync(filePath, fixed, 'utf-8');
            console.log(`Fixed: ${filePath}`);
            applied.forEach(a => console.log(`  • ${a}`));
          }
        }
      }

      const minSeverity = options.severity as Severity;
      const results = svgFiles.map(filePath => {
        const content = readFile(filePath);
        const result = lint(content, filePath, config ?? undefined);
        return filterBySeverity(result, minSeverity);
      });

      if (options.format === 'json') {
        console.log(formatJson(results));
      } else {
        const output = formatText(results);
        if (output.trim()) {
          console.log(output);
        } else {
          console.log('No doubt about it — all files are fig-tastic ✓');
        }
      }

      const hasErrors = results.some(r => r.messages.some(m => m.severity === 'error'));
      process.exit(hasErrors ? 1 : 0);
    });

  program
    .command('gui')
    .description('Launch web UI for uploading and checking SVG files')
    .option('-p, --port <number>', 'Port to run on', '3100')
    .action((options) => {
      startServer(parseInt(options.port, 10));
    });

  program
    .command('preview')
    .description('Build and launch SVGs on iOS Simulator to see actual CoreSVG rendering')
    .argument('<files...>', 'SVG files to preview')
    .option('--device <name>', 'Simulator device name', 'iPhone 16 Pro')
    .option('--device-id <id>', 'Simulator device UUID (overrides --device)')
    .action(async (files: string[], options) => {
      const resolved = files.flatMap(f => {
        if (f.includes('*')) return findSvgFiles([f]);
        return [resolve(f)];
      });
      if (resolved.length === 0) {
        console.error('No SVG files found.');
        process.exit(2);
      }
      await preview(resolved, { device: options.device, deviceId: options.deviceId });
    });

  program
    .command('convert')
    .description('Convert SVGs to React Native TypeScript components and preview in Expo')
    .argument('<files...>', 'SVG files to convert')
    .option('--preview', 'Launch Expo preview app on simulator after converting')
    .option('--platform <type>', 'Simulator platform: ios | android', 'ios')
    .action(async (files: string[], options) => {
      const resolved = files.flatMap(f => {
        if (f.includes('*')) return findSvgFiles([f]);
        return [resolve(f)];
      });
      if (resolved.length === 0) {
        console.error('No SVG files found.');
        process.exit(2);
      }
      if (options.preview) {
        await rnPreview(resolved, { platform: options.platform });
      } else {
        const { resolve: resolvePath } = await import('node:path');
        const { readFileSync, writeFileSync: writeFs } = await import('node:fs');
        const { transform } = await import('@svgr/core');
        for (const filePath of resolved) {
          const content = readFileSync(filePath, 'utf-8');
          const componentName = filePath
            .replace(/^.*[\\/]/, '')
            .replace(/\.svg$/i, '')
            .replace(/[^a-zA-Z0-9]/g, ' ')
            .split(' ')
            .filter(Boolean)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join('');
          const tsx = await transform(content, {
            typescript: true,
            native: true,
            dimensions: true,
            expandProps: 'end',
            exportType: 'default',
            plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx', '@svgr/plugin-prettier'],
          }, { componentName });
          const outPath = resolvePath(filePath.replace(/\.svg$/i, '.tsx'));
          writeFs(outPath, tsx, 'utf-8');
          console.log(`✓ ${filePath} → ${outPath}`);
        }
      }
    });

  program
    .command('watch')
    .description('Watch SVG files and re-lint on changes')
    .argument('[files...]', 'SVG files or glob patterns to watch')
    .option('-d, --dir <path>', 'Directory to watch recursively')
    .option('-s, --severity <level>', 'Minimum severity to report', 'info')
    .option('-c, --config <path>', 'Path to config file')
    .option('--fix', 'Auto-fix on each change')
    .action(async (files: string[], options) => {
      const { watch: chokidarWatch } = await import('chokidar');
      const config = loadConfig(options.config);
      const patterns: string[] = [];
      if (options.dir) patterns.push(resolve(options.dir, '**/*.svg'));
      if (files.length > 0) patterns.push(...files.map(f => resolve(f)));
      if (patterns.length === 0) patterns.push(resolve('.', '**/*.svg'));

      const minSeverity = options.severity as Severity;
      console.log('Watching for SVG changes... (Ctrl+C to stop)');

      const lintFile = (filePath: string) => {
        const absPath = resolve(filePath);
        if (options.fix) {
          const raw = readFile(absPath);
          const { fixed, applied } = fixSvg(raw);
          if (applied.length > 0) {
            writeFileSync(absPath, fixed, 'utf-8');
            console.log(`Fixed: ${absPath}`);
            applied.forEach(a => console.log(`  • ${a}`));
          }
        }
        const content = readFile(absPath);
        const result = filterBySeverity(lint(content, absPath, config ?? undefined), minSeverity);
        const output = formatText([result]);
        if (output.trim()) {
          console.log(output);
        } else {
          console.log(`✓ ${absPath}`);
        }
      };

      const watcher = chokidarWatch(patterns, { ignoreInitial: true, ignored: '**/node_modules/**' });
      watcher.on('add', lintFile);
      watcher.on('change', lintFile);
    });

  return program;
}

function loadConfig(configPath?: string): Partial<Config> | null {
  const path = configPath ? resolve(configPath) : resolve('.svglintrc.json');
  if (existsSync(path)) {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as Partial<Config>;
  }
  return null;
}
