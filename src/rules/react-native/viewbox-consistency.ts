import type { LintMessage, RuleModule } from '../../types.js';

export const rnViewboxConsistency: RuleModule = {
  id: 'rn/viewbox-consistency',
  description: 'Missing viewBox causes sizing issues in react-native-svg',
  platform: 'react-native',
  defaultSeverity: 'warning',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    const svg = doc.documentElement;
    if (!svg) return messages;

    const viewBox = svg.getAttribute('viewBox');
    if (!viewBox) {
      messages.push({
        ruleId: 'rn/viewbox-consistency',
        severity: 'warning',
        message: 'Figgy says: missing viewBox attribute — the SVG won\'t scale properly in React Native',
        suggestion: 'Add a viewBox matching the width/height, e.g. viewBox="0 0 24 24"',
        element: 'svg',
      });
    }

    return messages;
  },
};
