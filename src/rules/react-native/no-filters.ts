import type { LintMessage, RuleModule } from '../../types.js';

const filterElements = ['filter', 'feGaussianBlur', 'feDropShadow', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feImage', 'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'feSpecularLighting', 'feTile', 'feTurbulence'];

export const rnNoFilters: RuleModule = {
  id: 'rn/no-filters',
  description: 'SVG filter elements are not supported by react-native-svg',
  platform: 'react-native',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    for (const tag of filterElements) {
      const elements = doc.getElementsByTagName(tag);
      for (let i = 0; i < elements.length; i++) {
        messages.push({
          ruleId: 'rn/no-filters',
          severity: 'error',
          message: `Oh fig no! <${tag}> is not supported by react-native-svg`,
          suggestion: 'Apply the filter effect in your design tool and flatten to paths before exporting',
          element: tag,
        });
      }
    }
    return messages;
  },
};
