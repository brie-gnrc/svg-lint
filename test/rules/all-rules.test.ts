import { describe, it, expect } from 'vitest';
import { lint } from '../../src/engine.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixture = (name: string) => readFileSync(resolve(__dirname, '../fixtures', name), 'utf-8');

describe('svg-lint rules', () => {
  it('passes a valid SVG with no issues', () => {
    const result = lint(fixture('valid.svg'), 'valid.svg');
    expect(result.messages).toHaveLength(0);
  });

  it('detects filter elements', () => {
    const result = lint(fixture('invalid-filters.svg'), 'test.svg');
    const filterMsgs = result.messages.filter(m => m.ruleId === 'no-filters');
    expect(filterMsgs.length).toBeGreaterThan(0);
    expect(filterMsgs[0].severity).toBe('error');
  });

  it('detects text elements', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><text>hi</text></svg>';
    const result = lint(svg, 'test.svg');
    expect(result.messages.some(m => m.ruleId === 'no-text-elements')).toBe(true);
  });

  it('detects foreignObject', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><foreignObject width="10" height="10"></foreignObject></svg>';
    const result = lint(svg, 'test.svg');
    expect(result.messages.some(m => m.ruleId === 'no-foreign-object')).toBe(true);
  });

  it('detects scripts and animations', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><script>x</script><animate attributeName="x" dur="1s"/></svg>';
    const result = lint(svg, 'test.svg');
    const msgs = result.messages.filter(m => m.ruleId === 'no-scripts-animations');
    expect(msgs.length).toBe(2);
  });

  it('detects embedded raster images', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><image href="data:image/png;base64,abc"/></svg>';
    const result = lint(svg, 'test.svg');
    expect(result.messages.some(m => m.ruleId === 'no-embedded-raster')).toBe(true);
  });

  it('detects CSS style blocks', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><style>.a{fill:red}</style></svg>';
    const result = lint(svg, 'test.svg');
    expect(result.messages.some(m => m.ruleId === 'no-css-styling')).toBe(true);
  });

  it('detects blend modes in style attributes', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><rect style="mix-blend-mode: multiply" width="10" height="10"/></svg>';
    const result = lint(svg, 'test.svg');
    expect(result.messages.some(m => m.ruleId === 'no-blend-modes')).toBe(true);
  });

  it('detects mask elements', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><defs><mask id="m"><rect width="10" height="10"/></mask></defs></svg>';
    const result = lint(svg, 'test.svg');
    expect(result.messages.some(m => m.ruleId === 'no-masks')).toBe(true);
  });

  it('detects complex clip paths', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><defs><clipPath id="c"><text>x</text></clipPath></defs></svg>';
    const result = lint(svg, 'test.svg');
    expect(result.messages.some(m => m.ruleId === 'no-complex-clip-paths')).toBe(true);
  });

  it('detects use elements', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><use href="#foo"/></svg>';
    const result = lint(svg, 'test.svg');
    expect(result.messages.some(m => m.ruleId === 'no-use-refs')).toBe(true);
  });

  it('detects unsupported gradient spread methods', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><defs><linearGradient spreadMethod="reflect"><stop offset="0"/></linearGradient></defs></svg>';
    const result = lint(svg, 'test.svg');
    expect(result.messages.some(m => m.ruleId === 'no-unsupported-gradients')).toBe(true);
  });

  it('detects SVG2 features', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><rect paint-order="stroke" width="10" height="10"/></svg>';
    const result = lint(svg, 'test.svg');
    expect(result.messages.some(m => m.ruleId === 'no-svg2-features')).toBe(true);
  });

  it('detects missing viewBox', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="10" height="10"/></svg>';
    const result = lint(svg, 'test.svg');
    expect(result.messages.some(m => m.ruleId === 'viewbox-consistency')).toBe(true);
  });

  it('detects aspect ratio mismatch', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="50"><rect width="10" height="10"/></svg>';
    const result = lint(svg, 'test.svg');
    const msg = result.messages.find(m => m.ruleId === 'viewbox-consistency');
    expect(msg?.message).toContain('aspect ratio');
  });

  it('detects dashed strokes', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><line stroke-dasharray="5 3" x1="0" y1="0" x2="24" y2="24"/></svg>';
    const result = lint(svg, 'test.svg');
    expect(result.messages.some(m => m.ruleId === 'no-dashed-strokes')).toBe(true);
  });

  it('detects non-standard namespaces', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:custom="http://example.com" viewBox="0 0 24 24" width="24" height="24"><rect width="10" height="10"/></svg>';
    const result = lint(svg, 'test.svg');
    expect(result.messages.some(m => m.ruleId === 'no-namespaces')).toBe(true);
  });

  it('detects non-sRGB color profiles', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><rect fill="color(display-p3 1 0 0)" width="10" height="10"/></svg>';
    const result = lint(svg, 'test.svg');
    expect(result.messages.some(m => m.ruleId === 'no-color-profiles')).toBe(true);
  });

  it('detects media queries in style blocks', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><style>@media (prefers-color-scheme: dark) { .icon { fill: white; } }</style></svg>';
    const result = lint(svg, 'test.svg');
    expect(result.messages.some(m => m.ruleId === 'no-media-queries')).toBe(true);
  });

  it('detects nested opacity stacks', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><g opacity="0.5"><rect opacity="0.7" width="10" height="10"/></g></svg>';
    const result = lint(svg, 'test.svg');
    expect(result.messages.some(m => m.ruleId === 'no-opacity-stacks')).toBe(true);
  });

  it('respects rule overrides to disable rules', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><text>hi</text></svg>';
    const result = lint(svg, 'test.svg', { rules: { 'no-text-elements': 'off' } });
    expect(result.messages.some(m => m.ruleId === 'no-text-elements')).toBe(false);
  });
});
