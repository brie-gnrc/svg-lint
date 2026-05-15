# SVG export guidelines for iOS

These guidelines help ensure SVG assets render correctly in Xcode asset catalogs and native iOS apps. iOS uses CoreSVG (a limited SVG renderer) — not a browser engine — so many standard SVG features silently fail or render incorrectly.

## Quick checklist before export

- [ ] All text converted to outlines
- [ ] No embedded raster images (photos, screenshots)
- [ ] No blur, drop shadow, or other filter effects
- [ ] No masks — use boolean operations instead
- [ ] No blend modes (multiply, overlay, screen, etc.)
- [ ] Gradients use "pad" spread only (no reflect/repeat)
- [ ] No CSS classes or `<style>` blocks — colors must be inline
- [ ] No dark mode media queries in the SVG
- [ ] Color profile set to sRGB
- [ ] viewBox and width/height attributes present and matching

---

## Figma

### Export settings

1. Select the frame or component
2. Under Export, choose **SVG**
3. Uncheck "Include id attribute"
4. Check "Outline text" (or manually flatten text before export)
5. Do NOT check "Include images" — embedded images won't render

### Common pitfalls in Figma

| What you did | Why it breaks | What to do instead |
|---|---|---|
| Used a blur or drop shadow effect | CoreSVG ignores `<filter>` elements entirely | Fake shadows with offset shapes and reduced opacity, or export as PDF |
| Used a mask layer | Masks render as uncropped bounding boxes or vanish | Use boolean subtract/intersect operations to cut shapes |
| Used blend modes (multiply, overlay, etc.) | CoreSVG ignores `mix-blend-mode` | Flatten the blended layers: right-click → Flatten Selection |
| Embedded an image (photo/raster) inside the frame | `<image>` elements don't render in CoreSVG | Provide raster assets separately as PNGs at @1x/@2x/@3x |
| Used a gradient with "reflect" or "repeat" | Only "pad" (default) spread method works | Manually extend gradient stops to cover the full shape |
| Left text as editable text | Text renders as unformatted serif or disappears | Outline text: right-click → Outline Stroke, or use export setting |
| Used "Auto" layout with clip content | Can produce `<clipPath>` in SVG output | Flatten the frame or remove clipping before export |
| Used component instances without detaching | Produces `<use>` / `<defs>` references that CoreSVG can't resolve | Detach instances or flatten before export |
| Used Display P3 color profile in document | Colors appear washed out or shifted on device | Set document color space to sRGB in File → Color Profile |

### Recommended Figma workflow

1. Design your icon/illustration normally — use whatever features you want
2. Before export, duplicate the frame (keep the editable original)
3. On the duplicate: flatten all layers, outline text, remove effects
4. Export the flattened duplicate as SVG
5. Run `npm start` and upload to svg-lint to verify

---

## Illustrator

### Export settings

1. File → Export → Export As → SVG
2. Styling: **Presentation Attributes** (not Internal CSS or Inline Styles)
3. Font: **Convert to Outlines**
4. Images: **Preserve** (then manually remove any `<image>` elements, or better: don't embed images)
5. Object IDs: **Minimal**
6. Minify: Yes
7. Uncheck "Responsive" (ensures width/height attributes are present)

### Common pitfalls in Illustrator

| What you did | Why it breaks | What to do instead |
|---|---|---|
| Used "Internal CSS" styling option | CoreSVG strips `<style>` blocks; shapes render solid black | Choose "Presentation Attributes" in SVG export |
| Applied an Illustrator effect (blur, glow, shadow) | Exports as `<filter>` which CoreSVG ignores | Use Effect → Rasterize on the effect layer, then expand |
| Used a clipping mask | `<clipPath>` renders incorrectly or not at all | Use Pathfinder → Minus Front/Intersect to cut shapes |
| Used an opacity mask | `<mask>` elements fail in CoreSVG | Flatten transparency: Object → Flatten Transparency |
| Placed a linked/embedded image | `<image>` elements don't render | Keep raster assets separate |
| Used Illustrator's "CSS Properties" in SVG options | Generates class-based styling that CoreSVG ignores | Use "Presentation Attributes" for inline styles |
| Used artboard larger than artwork | viewBox/dimension mismatch causes scaling issues | Fit artboard to artwork: Object → Artboards → Fit to Artwork |
| Left color space as CMYK or Adobe RGB | Colors shift dramatically on device screens | Edit → Assign Profile → sRGB before exporting |
| Used pattern fills | Patterns rely on `<defs>` references CoreSVG can't resolve | Expand patterns: Object → Expand |

### Recommended Illustrator workflow

1. Set document color mode to RGB (File → Document Color Mode → RGB)
2. Design your asset
3. Before export: Select All → Object → Expand Appearance
4. Flatten transparency if any opacity/blend modes used
5. Outline all text: Type → Create Outlines
6. Use Pathfinder instead of masks for shape cutting
7. Export with "Presentation Attributes" styling
8. Run through svg-lint to verify

---

## What CoreSVG actually supports

These SVG features render correctly on iOS:

- Basic shapes: `<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polygon>`, `<polyline>`
- Paths: `<path>` with all standard commands
- Groups: `<g>` with transform attributes
- Linear and radial gradients (with `spreadMethod="pad"`)
- Fill and stroke with solid colors
- Opacity on individual elements (avoid deeply nested opacity)
- viewBox and basic transforms (translate, scale, rotate)
- Solid stroke styles (width, linecap, linejoin)

---

## What CoreSVG does NOT support

| Feature | What happens | Severity |
|---|---|---|
| `<filter>`, `<feGaussianBlur>`, `<feDropShadow>` | Completely ignored, shape renders without effect | Critical |
| `<text>`, `<tspan>` | Renders wrong font or disappears | Critical |
| `<mask>` | Uncropped bounding box or shape vanishes | Critical |
| `<clipPath>` | Uncropped or missing | Critical |
| `<use>` / `<defs>` references | Empty regions where referenced content should be | Critical |
| `<foreignObject>` | Completely ignored | Critical |
| `<script>`, `<animate>` | Stripped out | Critical |
| `<image>` (embedded raster) | Does not render | Critical |
| `<style>` blocks (CSS) | Stripped; shapes fallback to black fill | High |
| `mix-blend-mode` | Ignored | High |
| `@media` queries (dark mode) | Ignored; always renders default variant | High |
| Non-sRGB colors (P3, Adobe RGB, CMYK) | Colors shift or wash out | High |
| `spreadMethod="reflect"` or `"repeat"` | Gradient stops abruptly | Medium |
| `stroke-dasharray` | Intermittent rendering bugs | Low |
| SVG 2.0 features (`<mesh>`, `paint-order`) | Not supported | Critical |

---

## Testing your SVGs

### Automated lint (catches issues instantly)

```bash
cd svg-lint
npm start
```

Upload your SVGs at `http://localhost:3100` — the checker will flag any incompatible features with specific fix suggestions.

### Visual preview (see actual iOS rendering)

Click "Launch on simulator" in the web GUI, or from terminal:

```bash
npm run preview -- path/to/your-icon.svg
```

This shows exactly how iOS renders the SVG using the same CoreSVG engine as Xcode asset catalogs.

---

## FAQ

**Q: Can I use gradients?**
Yes — linear and radial gradients work fine. Just don't use `spreadMethod="reflect"` or `"repeat"`. Keep spread as "pad" (the default).

**Q: Can I use opacity?**
Yes on individual elements. Avoid deeply nesting groups with opacity inside other groups with opacity — this causes color bleeding and glitches.

**Q: Can I use clipping in Figma?**
Use boolean operations (Union, Subtract, Intersect, Exclude) instead of clip masks. Boolean ops bake the cut into the path data; clip masks export as `<clipPath>` which CoreSVG can't handle.

**Q: My colors look different on device — why?**
Your document is likely in Display P3 or Adobe RGB. Switch to sRGB in your design tool's color settings before exporting.

**Q: What about dark mode variants?**
Don't use `@media (prefers-color-scheme: dark)` inside the SVG — CoreSVG ignores it. Instead, export separate light/dark SVGs and configure them as appearance variants in the Xcode Image Set Asset Catalog.

**Q: My SVG uses a lot of `<use>` references — is there a quick fix?**
Run it through [SVGOMG](https://jakearchibald.github.io/svgomg/) or use SVGO with the `--disable=reuseElements` flag to expand all `<use>` references into inline paths.

**Q: What if I need a blur/shadow effect?**
Export the asset as a **vector PDF** instead of SVG (Xcode handles PDF effects better), or provide pre-rendered PNG assets at @1x/@2x/@3x scales.
