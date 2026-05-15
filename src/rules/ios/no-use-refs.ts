import type { LintMessage, RuleModule } from '../../types.js';

export const noUseRefs: RuleModule = {
  id: 'no-use-refs',
  description: '<defs>/<use> reference trees fail to resolve in CoreSVG, resulting in empty regions',
  platform: 'ios',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    const useElements = doc.getElementsByTagName('use');
    for (let i = 0; i < useElements.length; i++) {
      messages.push({
        ruleId: 'no-use-refs',
        severity: 'error',
        message: 'Figgy can\'t find it! <use> reference trees fail to resolve, leaving empty regions',
        suggestion: 'Use optimization tools (e.g., SVGOMG) to expand clones into explicit paths',
        element: 'use',
      });
    }
    return messages;
  },
};
