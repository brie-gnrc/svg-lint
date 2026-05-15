import type { LintMessage, RuleModule } from '../../types.js';

const textElements = ['text', 'tspan', 'textPath'];

export const noTextElements: RuleModule = {
  id: 'no-text-elements',
  description: 'Text elements require fonts that may not be available; outline text before exporting',
  platform: 'ios',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    for (const tag of textElements) {
      const elements = doc.getElementsByTagName(tag);
      for (let i = 0; i < elements.length; i++) {
        messages.push({
          ruleId: 'no-text-elements',
          severity: 'error',
          message: `Unbe-leaf-able! <${tag}> renders unformatted serif letters or omits the wording completely in CoreSVG`,
          suggestion: 'Convert all text nodes into permanent outlines/paths in your editor',
          element: tag,
        });
      }
    }
    return messages;
  },
};
