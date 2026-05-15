import { DOMParser } from '@xmldom/xmldom';

export function parseSvg(content: string): Document {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'image/svg+xml');
  return doc;
}
