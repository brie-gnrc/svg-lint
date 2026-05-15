import type { LintMessage, RuleModule } from '../../types.js';

function walkElements(node: Node, callback: (el: Element) => void): void {
  if (node.nodeType === 1) callback(node as Element);
  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) {
    walkElements(children[i], callback);
  }
}

export const noDashedStrokes: RuleModule = {
  id: 'no-dashed-strokes',
  description: 'Dashed strokes have intermittent rendering issues in CoreSVG',
  platform: 'ios',
  defaultSeverity: 'info',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];

    walkElements(doc.documentElement, (el) => {
      const dashArray = el.getAttribute('stroke-dasharray');
      const style = el.getAttribute('style') || '';

      if ((dashArray && dashArray !== 'none') || style.includes('stroke-dasharray')) {
        messages.push({
          ruleId: 'no-dashed-strokes',
          severity: 'info',
          message: `Heads up, fig-face! Dashed stroke on <${el.tagName}> may render inconsistently in CoreSVG`,
          suggestion: 'Convert dashed strokes to individual path segments if rendering is incorrect',
          element: el.tagName,
        });
      }
    });

    return messages;
  },
};
