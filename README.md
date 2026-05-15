# svg-lint

SVG compatibility checker for iOS/Xcode asset catalogs. Catches unsupported SVG features that break when rendered by CoreSVG in Xcode, and previews how iOS actually renders your SVGs on a simulator.

## Prerequisites

- **Node.js** 18+ and npm
- **Xcode** 15+ with command line tools installed (`xcode-select --install`)
- **iOS Simulator** runtime (comes with Xcode; verify with `xcrun simctl list runtimes`)

## Install

```bash
cd svg-lint
npm install
```

## Usage

### Lint SVGs for iOS compatibility

```bash
# Single file
npx tsx bin/svg-lint.ts icon.svg

# Multiple files
npx tsx bin/svg-lint.ts assets/home.svg assets/settings.svg

# Scan a directory recursively
npx tsx bin/svg-lint.ts -d ./assets/icons

# Show only errors (skip warnings and info)
npx tsx bin/svg-lint.ts -d ./assets -s error

# JSON output for CI pipelines
npx tsx bin/svg-lint.ts -d ./assets --format json

# Ignore specific patterns
npx tsx bin/svg-lint.ts -d ./assets --ignore "**/legacy/**"
```

Exit codes: `0` = no errors, `1` = errors found, `2` = tool failure.

### Web GUI

Launch a local web interface for drag-and-drop SVG uploading and linting:

```bash
npx tsx bin/svg-lint.ts gui

# Custom port
npx tsx bin/svg-lint.ts gui --port 8080
```

Opens at `http://localhost:3100`. Drop one or more SVG files onto the page, click "Check compatibility", and see results with severity icons and fix suggestions. The page also shows a browser-rendered preview of each SVG alongside the lint results.

### Preview SVGs on iOS Simulator

See exactly how iOS renders your SVGs through CoreSVG (the same engine Xcode asset catalogs use):

```bash
# Preview one or more SVGs
npx tsx bin/svg-lint.ts preview icon.svg logo.svg

# Use a specific simulator device
npx tsx bin/svg-lint.ts preview --device "iPhone 14 Pro" icon.svg

# Use a device UUID directly
npx tsx bin/svg-lint.ts preview --device-id 63951FA2-40E1-487A-8470-81B36078AB6E icon.svg

# Preview all SVGs in a directory
npx tsx bin/svg-lint.ts preview assets/*.svg
```

This command:
1. Boots the iOS Simulator (defaults to iPhone 16 Pro)
2. Builds and installs the SVGPreview companion app
3. Pushes your SVG files into the app
4. Launches the app showing your SVGs rendered by CoreSVG

Tap any thumbnail to see the full-size rendering with a checkerboard background (for transparency visibility).

## What it checks

svg-lint validates against 18 iOS/Xcode CoreSVG rules:

| Rule | Severity | Issue |
|------|----------|-------|
| no-filters | error | `<filter>`, `<feGaussianBlur>`, `<feDropShadow>`, etc. |
| no-text-elements | error | `<text>`, `<tspan>`, `<textPath>` |
| no-foreign-object | error | `<foreignObject>` |
| no-scripts-animations | error | `<script>`, `<animate>`, SMIL attributes |
| no-embedded-raster | error | `<image>` with base64 or external href |
| no-css-styling | warning | `<style>` blocks, complex CSS in attributes |
| no-blend-modes | error | `mix-blend-mode`, `isolation` |
| no-masks | error | `<mask>` elements |
| no-complex-clip-paths | error | `<clipPath>` elements |
| no-use-refs | error | `<use>` / `<defs>` reference trees |
| no-unsupported-gradients | warning | `spreadMethod="reflect\|repeat"`, mesh gradients |
| no-svg2-features | error | SVG 2.0 elements (`<mesh>`, `paint-order`, etc.) |
| viewbox-consistency | warning | Missing viewBox, aspect ratio mismatches |
| no-dashed-strokes | info | `stroke-dasharray` (intermittent rendering bugs) |
| no-namespaces | info | Non-standard XML namespace prefixes |
| no-color-profiles | error | Display P3, Adobe RGB, CMYK color references |
| no-media-queries | error | `@media` queries in style blocks |
| no-opacity-stacks | warning | Nested opacity layers causing glitches |

## Configuration

Create a `.svglintrc.json` in your project root to override rule severities:

```json
{
  "platform": "ios",
  "rules": {
    "no-dashed-strokes": "off",
    "no-css-styling": "error",
    "viewbox-consistency": "error"
  },
  "ignore": ["**/legacy/**"]
}
```

Valid severity values: `"error"`, `"warning"`, `"info"`, `"off"`.

## Recommended workflow

1. Designer exports SVGs from Figma/Sketch
2. Run `npx tsx bin/svg-lint.ts -d ./exported-assets` to catch issues immediately
3. For any flagged files, run `npx tsx bin/svg-lint.ts preview flagged-icon.svg` to see the actual iOS rendering
4. Share results with design team with specific fix suggestions from the lint output
5. Add `svg-lint --format json` to CI to prevent broken SVGs from merging

## Running tests

```bash
npm test
```
