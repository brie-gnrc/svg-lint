import type { LintMessage, RuleModule } from '../../types.js';

export const noMasks: RuleModule = {
  id: 'no-masks',
  description: 'SVG <mask> elements are not reliably supported by CoreSVG',
  platform: 'ios',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    const elements = doc.getElementsByTagName('mask');
    for (let i = 0; i < elements.length; i++) {
      messages.push({
        ruleId: 'no-masks',
        severity: 'error',
        message: 'You\'re in a jam! <mask> renders uncropped bounding boxes or shapes vanish in CoreSVG',
        suggestion: 'Flatten/merge shapes using a boolean "Subtract" tool in your design editor before export',
        element: 'mask',
      });
    }
    return messages;
  },
};
