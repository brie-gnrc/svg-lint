import type { LintMessage, RuleModule } from '../../types.js';

export const rnNoForeignObject: RuleModule = {
  id: 'rn/no-foreign-object',
  description: '<foreignObject> is not supported by react-native-svg',
  platform: 'react-native',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    const elements = doc.getElementsByTagName('foreignObject');
    for (let i = 0; i < elements.length; i++) {
      messages.push({
        ruleId: 'rn/no-foreign-object',
        severity: 'error',
        message: 'Fig out of here! <foreignObject> has no React Native equivalent',
        suggestion: 'Replace HTML content inside <foreignObject> with native RN components rendered outside the SVG',
        element: 'foreignObject',
      });
    }
    return messages;
  },
};
