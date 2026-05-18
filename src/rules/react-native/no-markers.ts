import type { LintMessage, RuleModule } from '../../types.js';

export const rnNoMarkers: RuleModule = {
  id: 'rn/no-markers',
  description: '<marker> elements are not supported by react-native-svg',
  platform: 'react-native',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    const elements = doc.getElementsByTagName('marker');
    for (let i = 0; i < elements.length; i++) {
      messages.push({
        ruleId: 'rn/no-markers',
        severity: 'error',
        message: 'Fig that! <marker> is not supported by react-native-svg',
        suggestion: 'Replace markers with explicit path elements drawn at the endpoints',
        element: 'marker',
      });
    }

    const markerAttrs = ['marker-start', 'marker-mid', 'marker-end'];
    const walk = (node: any) => {
      if (node.nodeType === 1) {
        for (const attr of markerAttrs) {
          if (node.getAttribute?.(attr)) {
            messages.push({
              ruleId: 'rn/no-markers',
              severity: 'error',
              message: `Fig that! ${attr} attribute on <${node.tagName}> is not supported by react-native-svg`,
              suggestion: 'Replace markers with explicit path elements drawn at the endpoints',
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
