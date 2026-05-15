import type { LintMessage, RuleModule } from '../../types.js';

function walkElements(node: Node, callback: (el: Element) => void): void {
  if (node.nodeType === 1) callback(node as Element);
  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) {
    walkElements(children[i], callback);
  }
}

export const noCssStyling: RuleModule = {
  id: 'no-css-styling',
  description: 'CSS <style> blocks and complex style attributes may not be fully parsed by CoreSVG',
  platform: 'ios',
  defaultSeverity: 'warning',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];

    const styleElements = doc.getElementsByTagName('style');
    for (let i = 0; i < styleElements.length; i++) {
      messages.push({
        ruleId: 'no-css-styling',
        severity: 'warning',
        message: 'Fig-ured this would happen! <style> blocks are stripped by CoreSVG, shapes fallback to solid black',
        suggestion: 'Convert CSS classes into inline path attributes (e.g., <path fill="#ff0000" ... />)',
        element: 'style',
      });
    }

    walkElements(doc.documentElement, (el) => {
      const style = el.getAttribute('style');
      if (style && (style.includes('var(') || style.includes('@') || style.includes('calc('))) {
        messages.push({
          ruleId: 'no-css-styling',
          severity: 'warning',
          message: `Fig-ured this would happen! Complex CSS (var/calc/@) on <${el.tagName}> is not supported`,
          suggestion: 'Replace CSS functions with static values as presentation attributes',
          element: el.tagName,
        });
      }
    });

    return messages;
  },
};
