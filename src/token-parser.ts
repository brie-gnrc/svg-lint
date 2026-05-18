import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

export interface TokenMatch {
  path: string;
  lightHex: string;
  darkHex: string;
}

export interface TokenMap {
  byLightHex: Map<string, TokenMatch[]>;
  byDarkHex: Map<string, TokenMatch[]>;
  allTokens: TokenMatch[];
}

function resolveHex(value: unknown): string | null {
  if (typeof value === 'string' && value.startsWith('#')) return value.toLowerCase();
  if (typeof value === 'string' && value.startsWith('rgba')) return value;
  return null;
}

function flattenTokens(obj: Record<string, unknown>, prefix: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = flattenTokens(value as Record<string, unknown>, path);
      for (const [k, v] of nested) result.set(k, v);
    } else {
      const hex = resolveHex(value);
      if (hex) result.set(path, hex);
    }
  }
  return result;
}

function loadTokensFromPackage(): { light: Record<string, unknown>; dark: Record<string, unknown> } {
  // Read the Tokens.tsx source and evaluate it to extract the token objects
  const tokenPath = resolve('node_modules/@generac/prism-design-system/src/theme/Tokens.tsx');
  let src = readFileSync(tokenPath, 'utf-8');

  // Strip TypeScript type annotations and imports
  src = src.replace(/^import .*$/gm, '');
  src = src.replace(/:\s*SemanticTokensTheme/g, '');
  src = src.replace(/export const /g, 'const ');

  // Wrap in a function that returns what we need
  const fn = new Function(`
    ${src}
    return { light: semanticTokensLight, dark: semanticTokensDark, colors: color };
  `);
  return fn();
}

export function buildTokenMap(): TokenMap {
  const { light, dark, colors } = loadTokensFromPackage();
  const lightFlat = flattenTokens(light as Record<string, unknown>, '');
  const darkFlat = flattenTokens(dark as Record<string, unknown>, '');

  // Add core colors as tokens (same hex for light and dark)
  for (const [name, hex] of Object.entries(colors as Record<string, string>)) {
    const path = `color.${name}`;
    const normalized = hex.toLowerCase();
    lightFlat.set(path, normalized);
    darkFlat.set(path, normalized);
  }

  const allTokens: TokenMatch[] = [];
  const byLightHex = new Map<string, TokenMatch[]>();
  const byDarkHex = new Map<string, TokenMatch[]>();

  for (const [path, lightHex] of lightFlat) {
    const darkHex = darkFlat.get(path) || lightHex;
    const match: TokenMatch = { path, lightHex, darkHex };
    allTokens.push(match);

    const lightKey = lightHex.toLowerCase();
    if (!byLightHex.has(lightKey)) byLightHex.set(lightKey, []);
    byLightHex.get(lightKey)!.push(match);

    const darkKey = darkHex.toLowerCase();
    if (!byDarkHex.has(darkKey)) byDarkHex.set(darkKey, []);
    byDarkHex.get(darkKey)!.push(match);
  }

  return { byLightHex, byDarkHex, allTokens };
}

export function findTokensForHex(map: TokenMap, hex: string): TokenMatch[] {
  const normalized = hex.toLowerCase();
  const lightMatches = map.byLightHex.get(normalized) || [];
  const darkMatches = map.byDarkHex.get(normalized) || [];
  const seen = new Set<string>();
  const results: TokenMatch[] = [];
  for (const m of [...lightMatches, ...darkMatches]) {
    if (!seen.has(m.path)) {
      seen.add(m.path);
      results.push(m);
    }
  }
  return results;
}
