import type {
  HardwareTier,
  NetworkTier,
} from '../../../util/deviceCapability/types';
import {
  BoxBackgroundColor,
  BoxBorderColor,
  type BoxBorderWidth,
} from '@metamask/design-system-react-native';

/**
 * Semantic elevation roles. These are not a stack of treatments.
 * Light and dark use different cues, so a role maps to existing
 * design-system tokens rather than to "border, then shadow, then glass".
 */
export const ElevationRole = {
  /** App canvas. No container. */
  Base: 'base',
  /** Cards and page sections on the canvas. Flat fill. */
  Section: 'section',
  /** A group nested inside a section. Flat fill. */
  Subsection: 'subsection',
  /** Toast, menu, popover, or other floating UI with no scrim. */
  Floating: 'floating',
  /** Sheet or modal over a scrim. Opaque. */
  Sheet: 'sheet',
  /**
   * Chrome that content scrolls under: tab bar, header capsule, floating
   * control. A material, not a fill step.
   */
  Glass: 'glass',
} as const;

export type ElevationRole = (typeof ElevationRole)[keyof typeof ElevationRole];

export type GlassMaterial = 'glass' | 'blur' | 'opaque';

export interface ElevationFillSpec {
  backgroundColor: BoxBackgroundColor;
  borderColor?: BoxBorderColor;
  borderWidth?: BoxBorderWidth;
  /** `lg` always. `md` only in light, where the fill does not step. */
  shadow?: 'md-light' | 'lg';
}

/**
 * Token map for fill roles. Glass has no fill token: the material is the
 * surface, and its opaque fallback is `background.section` plus `border.muted`.
 *
 * Controls (the Buy / Swap tiles) are not in this map. They use
 * `background.muted`, which means "button", not "raised container".
 */
export const ELEVATION_FILL: Record<
  Exclude<ElevationRole, 'glass'>,
  ElevationFillSpec
> = {
  [ElevationRole.Base]: {
    backgroundColor: BoxBackgroundColor.BackgroundDefault,
  },
  [ElevationRole.Section]: {
    backgroundColor: BoxBackgroundColor.BackgroundSection,
  },
  [ElevationRole.Subsection]: {
    backgroundColor: BoxBackgroundColor.BackgroundSubsection,
  },
  [ElevationRole.Floating]: {
    backgroundColor: BoxBackgroundColor.BackgroundElevated2,
    borderColor: BoxBorderColor.BorderAlternative,
    borderWidth: 1,
    shadow: 'md-light',
  },
  [ElevationRole.Sheet]: {
    backgroundColor: BoxBackgroundColor.BackgroundElevated1,
    borderColor: BoxBorderColor.BorderAlternative,
    borderWidth: 1,
    shadow: 'lg',
  },
};

export interface ResolveGlassMaterialInput {
  isGlassEnabled: boolean;
  isBlurEnabled: boolean;
  hardwareTier: HardwareTier | null;
  /**
   * Read so the caller applies the device-capability matrix. Blur is local,
   * so the tier does not change the material. `null` is unknown, not offline.
   */
  networkTier: NetworkTier | null;
}

/**
 * Picks the glass-role material.
 *
 * Low hardware skips both Liquid Glass and blur. Unknown hardware (`null`)
 * stays on the product path. Network tier is accepted and ignored: a slow
 * connection does not make a local backdrop sample cheaper or more expensive.
 */
export const resolveGlassMaterial = ({
  isGlassEnabled,
  isBlurEnabled,
  hardwareTier,
  networkTier: _networkTier,
}: ResolveGlassMaterialInput): GlassMaterial => {
  if (hardwareTier === 'LOW') {
    return 'opaque';
  }
  if (isGlassEnabled) {
    return 'glass';
  }
  if (isBlurEnabled) {
    return 'blur';
  }
  return 'opaque';
};
