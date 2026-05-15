import type { LintMessage, RuleModule } from '../../types.js';

export const noForeignObject: RuleModule = {
  id: 'no-foreign-object',
  description: 'foreignObject is not supported by CoreSVG',
  platform: 'ios',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    const elements = doc.getElementsByTagName('foreignObject');
    for (let i = 0; i < elements.length; i++) {
      messages.push({
        ruleId: 'no-foreign-object',
        severity: 'error',
        message: 'That\'s a fig-ment of your imagination! <foreignObject> is not supported by CoreSVG',
        suggestion: 'Remove foreignObject elements and use native SVG elements instead',
        element: 'foreignObject',
      });
    }
    return messages;
  },
};
