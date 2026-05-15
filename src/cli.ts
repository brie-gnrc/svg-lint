import { Command } from 'commander';
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { lint, filterBySeverity } from './engine.js';
import { findSvgFiles, readFile } from './scanner.js';
import { formatText } from './reporter/text.js';
import { formatJson } from './reporter/json.js';
import { preview } from './preview.js';
import { startServer } from './web/server.js';
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
