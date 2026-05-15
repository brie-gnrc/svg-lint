import chalk from 'chalk';
import type { LintResult, Severity } from '../types.js';

const severityColors: Record<Severity, (s: string) => string> = {
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
};

const severityIcons: Record<Severity, string> = {
  error: '✖',
  warning: '⚠',
  info: 'ℹ',
};

export function formatText(results: LintResult[]): string {
  const lines: string[] = [];
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalInfo = 0;

  for (const result of results) {
    if (result.messages.length === 0) continue;

    lines.push('');
    lines.push(chalk.underline(result.filePath));

    for (const msg of result.messages) {
      const icon = severityIcons[msg.severity];
      const color = severityColors[msg.severity];
      lines.push(`  ${color(icon)} ${msg.message} ${chalk.dim(`(${msg.ruleId})`)}`);
      if (msg.suggestion) {
        lines.push(`    ${chalk.dim('→')} ${chalk.dim(msg.suggestion)}`);
      }

      if (msg.severity === 'error') totalErrors++;
      else if (msg.severity === 'warning') totalWarnings++;
      else totalInfo++;
    }
  }

  const total = totalErrors + totalWarnings + totalInfo;
  if (total > 0) {
    lines.push('');
    const parts: string[] = [];
    if (totalErrors > 0) parts.push(chalk.red(`${totalErrors} error${totalErrors !== 1 ? 's' : ''}`));
    if (totalWarnings > 0) parts.push(chalk.yellow(`${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''}`));
    if (totalInfo > 0) parts.push(chalk.blue(`${totalInfo} info`));
    lines.push(`  ${parts.join(', ')}`);
    lines.push('');
  }

  return lines.join('\n');
}
