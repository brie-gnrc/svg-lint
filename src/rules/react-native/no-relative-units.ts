import type { LintMessage, RuleModule } from '../../types.js';

const unitPattern = /(\d+)(em|rem|%|vw|vh|vmin|vmax|ex|ch)/;
const dimensionAttrs = ['width', 'height', 'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'x2', 'y1', 'y2', 'font-size', 'stroke-width'];

export const rnNoRelativeUnits: RuleModule = {
  id: 'rn/no-relative-units',
  description: 'Relative/viewport units are unreliable in react-native-svg',
  platform: 'react-native',
  defaultSeverity: 'warning',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    const walk = (node: any) => {
      if (node.nodeType === 1) {
        for (const attr of dimensionAttrs) {
          const val = node.getAttribute?.(attr);
          if (val && unitPattern.test(val)) {
            const match = val.match(unitPattern)!;
            messages.push({
              ruleId: 'rn/no-relative-units',
              severity: 'warning',
              message: `Heads up, fig! "${match[2]}" units on <${node.tagName}> ${attr} may not render correctly in react-native-svg`,
              suggestion: 'Use absolute pixel values or unitless numbers for reliable rendering',
              element: node.tagName,
            });
          }
        }
      }
      const children = node.childNodes;
      if (children) {
        for (let i = 0; i < children.length; i++) walk(children[i]);
      }
    };
    walk(doc.documentElement);
    return messages;
  },
};
