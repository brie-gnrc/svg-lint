import type { LintMessage, RuleModule } from '../../types.js';

function walkElements(node: Node, callback: (el: Element) => void): void {
  if (node.nodeType === 1) callback(node as Element);
  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) {
    walkElements(children[i], callback);
  }
}

export const noBlendModes: RuleModule = {
  id: 'no-blend-modes',
  description: 'CSS blend modes (mix-blend-mode, isolation) are not supported by CoreSVG',
  platform: 'ios',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];

    walkElements(doc.documentElement, (el) => {
      const style = el.getAttribute('style') || '';
      if (style.includes('mix-blend-mode') || style.includes('isolation')) {
        messages.push({
          ruleId: 'no-blend-modes',
          severity: 'error',
          message: `That's a bunch of fig-ments! Blend mode on <${el.tagName}> is ignored by CoreSVG`,
          suggestion: 'Flatten blended layers in your design tool before exporting',
          element: el.tagName,
        });
      }
    });

    return messages;
  },
};
