import type { LintMessage, RuleModule } from '../../types.js';

const animationElements = ['script', 'animate', 'animateTransform', 'animateMotion', 'set'];

export const noScriptsAnimations: RuleModule = {
  id: 'no-scripts-animations',
  description: 'Scripts and SMIL animations are not supported by CoreSVG',
  platform: 'ios',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    for (const tag of animationElements) {
      const elements = doc.getElementsByTagName(tag);
      for (let i = 0; i < elements.length; i++) {
        messages.push({
          ruleId: 'no-scripts-animations',
          severity: 'error',
          message: `Don't even fig about it! <${tag}> is not supported in Xcode asset catalogs`,
          suggestion: 'Remove all scripts and animation elements; use static SVGs for asset catalogs',
          element: tag,
        });
      }
    }
    return messages;
  },
};
