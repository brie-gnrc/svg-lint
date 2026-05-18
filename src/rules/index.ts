import type { RuleModule } from '../types.js';
export { reactNativeRules } from './react-native/index.js';
import { noFilters } from './ios/no-filters.js';
import { noTextElements } from './ios/no-text-elements.js';
import { noForeignObject } from './ios/no-foreign-object.js';
import { noScriptsAnimations } from './ios/no-scripts-animations.js';
import { noEmbeddedRaster } from './ios/no-embedded-raster.js';
import { noCssStyling } from './ios/no-css-styling.js';
import { noBlendModes } from './ios/no-blend-modes.js';
import { noMasks } from './ios/no-masks.js';
import { noComplexClipPaths } from './ios/no-complex-clip-paths.js';
import { noUseRefs } from './ios/no-use-refs.js';
import { noUnsupportedGradients } from './ios/no-unsupported-gradients.js';
import { noSvg2Features } from './ios/no-svg2-features.js';
import { viewboxConsistency } from './ios/viewbox-consistency.js';
import { noDashedStrokes } from './ios/no-dashed-strokes.js';
import { noNamespaces } from './ios/no-namespaces.js';
import { noColorProfiles } from './ios/no-color-profiles.js';
import { noMediaQueries } from './ios/no-media-queries.js';
import { noOpacityStacks } from './ios/no-opacity-stacks.js';

export const iosRules: RuleModule[] = [
  noFilters,
  noTextElements,
  noForeignObject,
  noScriptsAnimations,
  noEmbeddedRaster,
  noCssStyling,
  noBlendModes,
  noMasks,
  noComplexClipPaths,
  noUseRefs,
  noUnsupportedGradients,
  noSvg2Features,
  viewboxConsistency,
  noDashedStrokes,
  noNamespaces,
  noColorProfiles,
  noMediaQueries,
  noOpacityStacks,
];
