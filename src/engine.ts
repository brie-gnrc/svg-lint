import { parseSvg } from './parser.js';
import { iosRules, reactNativeRules } from './rules/index.js';
import type { Config, LintMessage, LintResult, RuleModule, Severity } from './types.js';

const severityOrder: Record<Severity, number> = { error: 3, warning: 2, info: 1 };

export function lint(content: string, filePath: string, config?: Partial<Config>): LintResult {
  const doc = parseSvg(content);
  const platform = config?.platform ?? 'ios';
  const rules = platform === 'react-native' ? reactNativeRules : iosRules;
  const ruleOverrides = config?.rules ?? {};

  const messages: LintMessage[] = [];

  for (const rule of rules) {
    const override = ruleOverrides[rule.id];
    if (override === 'off') continue;

    const severity: Severity = typeof override === 'string'
      ? override
      : typeof override === 'object' && override?.severity
        ? override.severity
        : rule.defaultSeverity;

    const results = rule.check(doc);
    for (const msg of results) {
      messages.push({ ...msg, severity });
    }
  }

  return { filePath, messages };
}

export function filterBySeverity(result: LintResult, minSeverity: Severity): LintResult {
  const min = severityOrder[minSeverity];
  return {
    ...result,
    messages: result.messages.filter(m => severityOrder[m.severity] >= min),
  };
}
