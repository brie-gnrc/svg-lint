import type { LintMessage, RuleModule } from '../../types.js';

const svg2Elements = ['mesh', 'meshrow', 'meshpatch', 'hatch', 'hatchpath', 'solidcolor'];

function walkElements(node: Node, callback: (el: Element) => void): void {
  if (node.nodeType === 1) callback(node as Element);
  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) {
    walkElements(children[i], callback);
  }
}

export const noSvg2Features: RuleModule = {
  id: 'no-svg2-features',
  description: 'SVG 2.0 features are not supported by CoreSVG',
  platform: 'ios',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];

    for (const tag of svg2Elements) {
      const elements = doc.getElementsByTagName(tag);
      for (let i = 0; i < elements.length; i++) {
        messages.push({
          ruleId: 'no-svg2-features',
          severity: 'error',
          message: `Not ripe yet! <${tag}> is an SVG 2.0 element CoreSVG doesn't support`,
          suggestion: 'Replace with SVG 1.1 compatible equivalents',
          element: tag,
        });
      }
    }

    walkElements(doc.documentElement, (el) => {
      if (el.getAttribute('paint-order')) {
        messages.push({
          ruleId: 'no-svg2-features',
          severity: 'error',
          message: `Not ripe yet! paint-order on <${el.tagName}> is an SVG 2.0 feature CoreSVG doesn't support`,
          suggestion: 'Remove paint-order and layer elements manually for desired rendering order',
          element: el.tagName,
        });
      }
    });

    return messages;
  },
};
