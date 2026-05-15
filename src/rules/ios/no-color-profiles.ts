import type { LintMessage, RuleModule } from '../../types.js';

const nonSrgbPatterns = ['display-p3', 'adobe-rgb', 'prophoto-rgb', 'cmyk', 'icc-color'];

function walkElements(node: Node, callback: (el: Element) => void): void {
  if (node.nodeType === 1) callback(node as Element);
  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) {
    walkElements(children[i], callback);
  }
}

export const noColorProfiles: RuleModule = {
  id: 'no-color-profiles',
  description: 'Non-sRGB color spaces (Display P3, Adobe RGB, CMYK) cause washed-out or shifted colors in CoreSVG',
  platform: 'ios',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];

    const profiles = doc.getElementsByTagName('color-profile');
    for (let i = 0; i < profiles.length; i++) {
      messages.push({
        ruleId: 'no-color-profiles',
        severity: 'error',
        message: 'Looking a little unripe! <color-profile> detected; non-sRGB profiles cause color shifting',
        suggestion: 'Force the color export profile to standard sRGB in your design tool',
        element: 'color-profile',
      });
    }

    walkElements(doc.documentElement, (el) => {
      for (let i = 0; i < el.attributes.length; i++) {
        const value = el.attributes[i].value.toLowerCase();
        for (const pattern of nonSrgbPatterns) {
          if (value.includes(pattern)) {
            messages.push({
              ruleId: 'no-color-profiles',
              severity: 'error',
              message: `Looking a little unripe! "${pattern}" on <${el.tagName}> causes color shifting on device screens`,
              suggestion: 'Force the color export profile to standard sRGB in your design tool',
              element: el.tagName,
            });
            break;
          }
        }
      }
    });

    return messages;
  },
};
