import fg from 'fast-glob';
import { readFileSync } from 'node:fs';

export function findSvgFiles(patterns: string[], ignore: string[] = []): string[] {
  return fg.sync(patterns, {
    ignore: ['**/node_modules/**', ...ignore],
    absolute: true,
  });
}

export function readFile(filePath: string): string {
  return readFileSync(filePath, 'utf-8');
}
