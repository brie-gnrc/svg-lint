# svg-lint roadmap

## Preview

- [ ] Real device support via `xcodebuild` with device destination and wireless debugging
- [ ] Side-by-side comparison view (SVG source rendering vs. CoreSVG rendering)
- [ ] Screenshot capture mode (save simulator rendering to PNG for CI diffing)
- [ ] Auto-refresh when SVG files change on disk (file watcher)
- [ ] Dark mode toggle in preview app to test appearance variants

## Android support

- [ ] Android rule modules (`src/rules/android/`)
- [ ] `--platform android` CLI flag to select rule subset
- [ ] Rules for Android VectorDrawable limitations (no gradients on strokes, limited path ops, no pattern fills)
- [ ] Android preview via `adb push` to a companion app on emulator/device
- [ ] Android companion app using `ImageView` + `SVGImageDecoder`

## Linting

- [ ] `--fix` mode for automatable issues (inline CSS, remove `<style>` blocks, strip namespaces)
- [ ] SVGO integration for auto-fixing `<use>` expansion
- [ ] Config file (`.svglintrc.json`) with per-rule severity overrides
- [ ] Watch mode for continuous linting during design handoff
- [ ] Figma plugin integration (lint on export)

## CI/CD

- [ ] GitHub Action wrapper for running svg-lint in pull requests
- [ ] PR comment annotations with lint results
- [ ] SARIF output format for GitHub Code Scanning integration
