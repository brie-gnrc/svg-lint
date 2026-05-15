export type Severity = 'error' | 'warning' | 'info';

export interface LintMessage {
  ruleId: string;
  severity: Severity;
  message: string;
  suggestion?: string;
  element?: string;
}

export interface RuleModule {
  id: string;
  description: string;
  platform: 'ios' | 'android' | 'universal';
  defaultSeverity: Severity;
  check(doc: Document): LintMessage[];
}

export interface LintResult {
  filePath: string;
  messages: LintMessage[];
}

export interface Config {
  platform: 'ios' | 'android';
  rules: Record<string, Severity | 'off' | { severity: Severity; options?: Record<string, unknown> }>;
  ignore: string[];
}
