import type { LintResult } from '../types.js';

export function formatJson(results: LintResult[]): string {
  return JSON.stringify(results, null, 2);
}
