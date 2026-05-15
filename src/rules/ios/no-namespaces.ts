import type { LintMessage, RuleModule } from '../../types.js';

const allowedNamespaces = new Set(['xmlns', 'xmlns:xlink', 'xmlns:svg']);

export const noNamespaces: RuleModule = {
  id: 'no-namespaces',
  description: 'Non-standard namespace prefixes may cause parsing issues in CoreSVG',
  platform: 'ios',
  defaultSeverity: 'info',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    const svg = doc.documentElement;
    if (!svg) return messages;

    const attrs = svg.attributes;
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      if (attr.name.startsWith('xmlns:') && !allowedNamespaces.has(attr.name)) {
        messages.push({
          ruleId: 'no-namespaces',
          severity: 'info',
          message: `Just a fig-ment! Non-standard namespace "${attr.name}" may cause issues in CoreSVG`,
          suggestion: `Remove the ${attr.name} namespace declaration if not required`,
          element: 'svg',
        });
      }
    }

    return messages;
  },
};
