import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

export interface FixResult {
  fixed: string;
  applied: string[];
}

const allowedNamespaces = new Set(['xmlns', 'xmlns:xlink', 'xmlns:svg']);

export function fixSvg(content: string): FixResult {
  const applied: string[] = [];
  const doc = new DOMParser().parseFromString(content, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg) return { fixed: content, applied };

  stripNamespaces(svg as any, applied);
  removeStyleBlocks(doc as any, applied);
  removeScriptsAndAnimations(doc as any, applied);
  inlineCssStyles(doc as any, applied);

  if (applied.length === 0) {
    return { fixed: content, applied };
  }

  const fixed = new XMLSerializer().serializeToString(doc);
  return { fixed, applied };
}

function stripNamespaces(svg: Element, applied: string[]): void {
  const toRemove: string[] = [];
  for (let i = 0; i < svg.attributes.length; i++) {
    const attr = svg.attributes[i];
    if (attr.name.startsWith('xmlns:') && !allowedNamespaces.has(attr.name)) {
      toRemove.push(attr.name);
    }
  }
  for (const name of toRemove) {
    svg.removeAttribute(name);
    applied.push(`Removed namespace: ${name}`);
  }
}

function removeStyleBlocks(doc: Document, applied: string[]): void {
  const styles = doc.getElementsByTagName('style');
  const toRemove: Element[] = [];
  for (let i = 0; i < styles.length; i++) {
    toRemove.push(styles[i] as unknown as Element);
  }
  for (const el of toRemove) {
    el.parentNode?.removeChild(el);
    applied.push('Removed <style> block');
  }
}

function removeScriptsAndAnimations(doc: Document, applied: string[]): void {
  const tags = ['script', 'animate', 'animateTransform', 'animateMotion', 'set'];
  for (const tag of tags) {
    const elements = doc.getElementsByTagName(tag);
    const toRemove: Element[] = [];
    for (let i = 0; i < elements.length; i++) {
      toRemove.push(elements[i] as unknown as Element);
    }
    for (const el of toRemove) {
      el.parentNode?.removeChild(el);
      applied.push(`Removed <${tag}> element`);
    }
  }
}

function inlineCssStyles(doc: Document, applied: string[]): void {
  // Simple inline: convert style="prop: val; ..." to presentation attributes
  const walk = (node: Node) => {
    if (node.nodeType === 1) {
      const el = node as Element;
      const style = el.getAttribute('style');
      if (style && !style.includes('var(') && !style.includes('calc(')) {
        const props = style.split(';').map(s => s.trim()).filter(Boolean);
        let inlined = 0;
        for (const prop of props) {
          const [name, ...valParts] = prop.split(':');
          if (name && valParts.length > 0) {
            const attrName = name.trim();
            const attrVal = valParts.join(':').trim();
            el.setAttribute(attrName, attrVal);
            inlined++;
          }
        }
        if (inlined > 0) {
          el.removeAttribute('style');
          applied.push(`Inlined ${inlined} style properties on <${el.tagName}>`);
        }
      }
    }
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
      walk(children[i]);
    }
  };
  walk(doc.documentElement);
}
