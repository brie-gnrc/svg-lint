import type { LintMessage, RuleModule } from '../../types.js';

function walkElements(node: Node, callback: (el: Element, depth: number) => void, depth = 0): void {
  if (node.nodeType === 1) callback(node as Element, depth);
  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) {
    walkElements(children[i], callback, depth + 1);
  }
}

export const noOpacityStacks: RuleModule = {
  id: 'no-opacity-stacks',
  description: 'Nested opacity/alpha layers cause rendering glitches and color bleeding in CoreSVG',
  platform: 'ios',
  defaultSeverity: 'warning',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    let nestedOpacityCount = 0;

    function walkWithOpacityContext(node: Node, parentHasOpacity: boolean): void {
      if (node.nodeType !== 1) return;
      const el = node as Element;
      const opacity = el.getAttribute('opacity');
      const style = el.getAttribute('style') || '';
      const hasOpacity = (opacity !== null && opacity !== '1') || /opacity\s*:\s*(?!1\b)/.test(style);

      if (hasOpacity && parentHasOpacity) {
        nestedOpacityCount++;
      }

      const children = node.childNodes;
      for (let i = 0; i < children.length; i++) {
        walkWithOpacityContext(children[i], hasOpacity || parentHasOpacity);
      }
    }

    walkWithOpacityContext(doc.documentElement, false);

    if (nestedOpacityCount > 0) {
      messages.push({
        ruleId: 'no-opacity-stacks',
        severity: 'warning',
        message: `Preserve the jam! ${nestedOpacityCount} nested opacity layer(s) detected — triggers glitches and color bleeding in CoreSVG`,
        suggestion: 'Flatten overlapping vector layers or apply explicit opacity attributes to individual path nodes',
        element: 'svg',
      });
    }

    return messages;
  },
};
