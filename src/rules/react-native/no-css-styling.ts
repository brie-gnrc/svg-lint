import type { LintMessage, RuleModule } from '../../types.js';

export const rnNoCssStyling: RuleModule = {
  id: 'rn/no-css-styling',
  description: '<style> blocks and CSS features are not supported by react-native-svg',
  platform: 'react-native',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    const styles = doc.getElementsByTagName('style');
    for (let i = 0; i < styles.length; i++) {
      messages.push({
        ruleId: 'rn/no-css-styling',
        severity: 'error',
        message: 'Oh fig! <style> blocks are not processed by react-native-svg',
        suggestion: 'Inline all CSS properties as presentation attributes on each element, or use the --fix flag',
        element: 'style',
      });
    }

    const walk = (node: any) => {
      if (node.nodeType === 1) {
        const style = node.getAttribute?.('style');
        if (style && (style.includes('var(') || style.includes('calc('))) {
          messages.push({
            ruleId: 'rn/no-css-styling',
            severity: 'error',
            message: `Figgin' heck! CSS var()/calc() in style attribute on <${node.tagName}> won't work in react-native-svg`,
            suggestion: 'Replace CSS variables and calc() with static values',
            element: node.tagName,
          });
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
