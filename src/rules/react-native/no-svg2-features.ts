import type { LintMessage, RuleModule } from '../../types.js';

const svg2Elements = ['mesh', 'meshrow', 'meshpatch', 'meshgradient', 'hatch', 'hatchpath', 'solidcolor'];

export const rnNoSvg2Features: RuleModule = {
  id: 'rn/no-svg2-features',
  description: 'SVG 2.0 elements are not supported by react-native-svg',
  platform: 'react-native',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    for (const tag of svg2Elements) {
      const elements = doc.getElementsByTagName(tag);
      for (let i = 0; i < elements.length; i++) {
        messages.push({
          ruleId: 'rn/no-svg2-features',
          severity: 'error',
          message: `Oh fig! <${tag}> is an SVG 2.0 feature not supported by react-native-svg`,
          suggestion: 'Use SVG 1.1 equivalents or flatten the effect in your design tool',
          element: tag,
        });
      }
    }
    return messages;
  },
};
