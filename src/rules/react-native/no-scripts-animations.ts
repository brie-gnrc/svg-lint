import type { LintMessage, RuleModule } from '../../types.js';

const tags = ['script', 'animate', 'animateTransform', 'animateMotion', 'set'];

export const rnNoScriptsAnimations: RuleModule = {
  id: 'rn/no-scripts-animations',
  description: 'Scripts and SMIL animations are not supported by react-native-svg',
  platform: 'react-native',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    for (const tag of tags) {
      const elements = doc.getElementsByTagName(tag);
      for (let i = 0; i < elements.length; i++) {
        messages.push({
          ruleId: 'rn/no-scripts-animations',
          severity: 'error',
          message: `That's a fig deal! <${tag}> is not supported in react-native-svg`,
          suggestion: 'Use React Native Animated API or Reanimated for animations instead',
          element: tag,
        });
      }
    }
    return messages;
  },
};
