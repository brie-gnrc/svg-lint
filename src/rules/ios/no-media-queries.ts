import type { LintMessage, RuleModule } from '../../types.js';

export const noMediaQueries: RuleModule = {
  id: 'no-media-queries',
  description: 'CSS media queries (e.g., prefers-color-scheme) are entirely ignored by CoreSVG',
  platform: 'ios',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    const styleElements = doc.getElementsByTagName('style');

    for (let i = 0; i < styleElements.length; i++) {
      const content = styleElements[i].textContent || '';
      if (content.includes('@media')) {
        messages.push({
          ruleId: 'no-media-queries',
          severity: 'error',
          message: 'That\'s fig-ile thinking! @media queries are entirely ignored by CoreSVG — stuck on default variant',
          suggestion: 'Split the graphic into separate light/dark assets and map them to an Xcode Image Set Asset Catalog',
          element: 'style',
        });
      }
    }

    return messages;
  },
};
