import type { RuleModule } from '../../types.js';
import { rnNoFilters } from './no-filters.js';
import { rnNoForeignObject } from './no-foreign-object.js';
import { rnNoScriptsAnimations } from './no-scripts-animations.js';
import { rnNoCssStyling } from './no-css-styling.js';
import { rnNoMarkers } from './no-markers.js';
import { rnNoRelativeUnits } from './no-relative-units.js';
import { rnNoSvg2Features } from './no-svg2-features.js';
import { rnNoNamespaces } from './no-namespaces.js';
import { rnViewboxConsistency } from './viewbox-consistency.js';

export const reactNativeRules: RuleModule[] = [
  rnNoFilters,
  rnNoForeignObject,
  rnNoScriptsAnimations,
  rnNoCssStyling,
  rnNoMarkers,
  rnNoRelativeUnits,
  rnNoSvg2Features,
  rnNoNamespaces,
  rnViewboxConsistency,
];
