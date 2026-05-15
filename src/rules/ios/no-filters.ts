import type { LintMessage, RuleModule } from '../../types.js';

const filterElements = ['filter', 'feGaussianBlur', 'feDropShadow', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feImage', 'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'feSpecularLighting', 'feTile', 'feTurbulence'];

export const noFilters: RuleModule = {
  id: 'no-filters',
  description: 'SVG filter elements are not supported by CoreSVG in Xcode asset catalogs',
  platform: 'ios',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    for (const tag of filterElements) {
      const elements = doc.getElementsByTagName(tag);
      for (let i = 0; i < elements.length; i++) {
        messages.push({
          ruleId: 'no-filters',
          severity: 'error',
          message: `Oh fig no! <${tag}> is not supported by Xcode's CoreSVG renderer`,
          suggestion: 'Filtered assets completely break in CoreSVG; export the file as a vector PDF or an uncompressed PNG scale block instead',
          element: tag,
        });
      }
    }
    return messages;
  },
};
