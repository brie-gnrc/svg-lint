import type { LintMessage, RuleModule } from '../../types.js';

export const viewboxConsistency: RuleModule = {
  id: 'viewbox-consistency',
  description: 'Missing or mismatched viewBox can cause scaling issues in Xcode asset catalogs',
  platform: 'ios',
  defaultSeverity: 'warning',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    const svg = doc.documentElement;

    if (!svg || svg.tagName !== 'svg') return messages;

    const viewBox = svg.getAttribute('viewBox');
    const width = svg.getAttribute('width');
    const height = svg.getAttribute('height');

    if (!viewBox) {
      messages.push({
        ruleId: 'viewbox-consistency',
        severity: 'warning',
        message: 'Fig-ure out your viewBox! SVG is missing a viewBox attribute',
        suggestion: 'Add a viewBox attribute (e.g., viewBox="0 0 24 24") for consistent scaling',
        element: 'svg',
      });
      return messages;
    }

    if (!width || !height) {
      messages.push({
        ruleId: 'viewbox-consistency',
        severity: 'warning',
        message: 'Fig-ure out your dimensions! SVG has viewBox but missing width/height attributes',
        suggestion: 'Add width and height attributes matching the viewBox dimensions for reliable Xcode rendering',
        element: 'svg',
      });
    }

    if (width && height && viewBox) {
      const parts = viewBox.split(/[\s,]+/);
      if (parts.length === 4) {
        const vbWidth = parseFloat(parts[2]);
        const vbHeight = parseFloat(parts[3]);
        const w = parseFloat(width);
        const h = parseFloat(height);

        if (!isNaN(w) && !isNaN(h) && !isNaN(vbWidth) && !isNaN(vbHeight)) {
          const widthRatio = w / vbWidth;
          const heightRatio = h / vbHeight;
          if (Math.abs(widthRatio - heightRatio) > 0.01) {
            messages.push({
              ruleId: 'viewbox-consistency',
              severity: 'warning',
              message: 'That\'s a squished fig! Width/height aspect ratio does not match viewBox',
              suggestion: 'Ensure width/height and viewBox have the same aspect ratio to avoid distortion',
              element: 'svg',
            });
          }
        }
      }
    }

    return messages;
  },
};
