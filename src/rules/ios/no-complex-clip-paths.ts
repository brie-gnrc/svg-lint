import type { LintMessage, RuleModule } from '../../types.js';

export const noComplexClipPaths: RuleModule = {
  id: 'no-complex-clip-paths',
  description: 'clipPath elements render uncropped bounding boxes or disappear entirely in CoreSVG',
  platform: 'ios',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    const clipPaths = doc.getElementsByTagName('clipPath');

    for (let i = 0; i < clipPaths.length; i++) {
      messages.push({
        ruleId: 'no-complex-clip-paths',
        severity: 'error',
        message: 'You\'re in a jam! <clipPath> renders uncropped bounding boxes or shapes vanish in CoreSVG',
        suggestion: 'Flatten/merge shapes using a boolean "Subtract" tool in your design editor before export',
        element: 'clipPath',
      });
    }

    return messages;
  },
};
