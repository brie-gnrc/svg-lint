import type { LintMessage, RuleModule } from '../../types.js';

const meshElements = ['mesh', 'meshrow', 'meshpatch', 'meshGradient'];

export const noUnsupportedGradients: RuleModule = {
  id: 'no-unsupported-gradients',
  description: 'Certain gradient features (reflect/repeat spread, mesh) are not supported by CoreSVG',
  platform: 'ios',
  defaultSeverity: 'warning',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];

    for (const tag of ['linearGradient', 'radialGradient']) {
      const elements = doc.getElementsByTagName(tag);
      for (let i = 0; i < elements.length; i++) {
        const spread = elements[i].getAttribute('spreadMethod');
        if (spread === 'reflect' || spread === 'repeat') {
          messages.push({
            ruleId: 'no-unsupported-gradients',
            severity: 'warning',
            message: `Ripe for trouble! <${tag}> with spreadMethod="${spread}" is not supported by CoreSVG`,
            suggestion: 'Use spreadMethod="pad" (default) or manually extend gradient stops',
            element: tag,
          });
        }
      }
    }

    for (const tag of meshElements) {
      const elements = doc.getElementsByTagName(tag);
      if (elements.length > 0) {
        messages.push({
          ruleId: 'no-unsupported-gradients',
          severity: 'warning',
          message: `Ripe for trouble! <${tag}> (SVG2 mesh gradient) is not supported by CoreSVG`,
          suggestion: 'Replace mesh gradients with standard linear/radial gradients',
          element: tag,
        });
      }
    }

    return messages;
  },
};
