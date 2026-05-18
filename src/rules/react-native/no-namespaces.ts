import type { LintMessage, RuleModule } from '../../types.js';

const allowedNamespaces = new Set(['xmlns', 'xmlns:xlink', 'xmlns:svg']);

export const rnNoNamespaces: RuleModule = {
  id: 'rn/no-namespaces',
  description: 'Non-standard namespace prefixes cause build errors in react-native-svg',
  platform: 'react-native',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    const svg = doc.documentElement;
    if (!svg) return messages;
    for (let i = 0; i < svg.attributes.length; i++) {
      const attr = svg.attributes[i];
      if (attr.name.startsWith('xmlns:') && !allowedNamespaces.has(attr.name)) {
        messages.push({
          ruleId: 'rn/no-namespaces',
          severity: 'error',
          message: `Figgy alert! Namespace "${attr.name}" will cause a build error in React Native`,
          suggestion: 'Remove the namespace declaration — use the --fix flag to strip automatically',
          element: 'svg',
        });
      }
    }
    return messages;
  },
};
