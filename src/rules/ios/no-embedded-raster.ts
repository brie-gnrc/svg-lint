import type { LintMessage, RuleModule } from '../../types.js';

export const noEmbeddedRaster: RuleModule = {
  id: 'no-embedded-raster',
  description: 'Embedded raster images in SVGs are not reliably rendered by CoreSVG',
  platform: 'ios',
  defaultSeverity: 'error',
  check(doc: Document): LintMessage[] {
    const messages: LintMessage[] = [];
    const elements = doc.getElementsByTagName('image');
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const href = el.getAttribute('href') || el.getAttribute('xlink:href') || '';
      messages.push({
        ruleId: 'no-embedded-raster',
        severity: 'error',
        message: `What the fig! <image> with ${href.startsWith('data:') ? 'embedded base64' : 'external'} source won't render`,
        suggestion: 'Remove embedded raster images; use vector paths or provide raster assets separately',
        element: 'image',
      });
    }
    return messages;
  },
};
