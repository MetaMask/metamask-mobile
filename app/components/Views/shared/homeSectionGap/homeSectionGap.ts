import type { BoxSpacing } from '@metamask/design-system-react-native';

/**
 * Pixel options Andrew can compare for the space between home-tab sections.
 * Each value is an existing Tailwind/Box step (1 step = 4px).
 */
export const HOME_SECTION_GAP_OPTIONS = [8, 12, 16, 24] as const;

export type HomeSectionGapPx = (typeof HOME_SECTION_GAP_OPTIONS)[number];

/** `'production'` keeps the SectionDivider default. The others are review values. */
export type HomeSectionGapSelection = 'production' | HomeSectionGapPx;

/**
 * Production space on each side of a homepage section line.
 * `SectionDivider` defaults to `marginVertical={5}` (20px).
 */
export const PRODUCTION_SECTION_DIVIDER_MARGIN_STEP =
  5 as const satisfies BoxSpacing;

/** Box step for each review value. `2` is 8px, `3` is 12px, `4` is 16px, `6` is 24px. */
export const HOME_SECTION_GAP_STEP = {
  8: 2,
  12: 3,
  16: 4,
  24: 6,
} as const satisfies Record<HomeSectionGapPx, BoxSpacing>;

/**
 * Space from the home header block to the first section.
 * This used to be the divider's 20px top margin. It is now step 4 (16px)
 * and does not follow the between-section switch.
 */
export const HOME_HEADER_TO_CONTENT_PX = 16;

export const HOME_SECTION_GAP_CONTROL_TEST_ID = 'home-section-gap-control';

export const HOME_HEADER_TO_CONTENT_TEST_ID = 'home-header-to-content';

/** Test id for one segment of the between-section control. */
export const homeSectionGapOptionTestId = (
  selection: HomeSectionGapSelection,
): string => `home-section-gap-option-${selection}`;

/**
 * Margin step applied to homepage section dividers.
 * Production stays on the design-system default of 20px.
 *
 * @param selection - Production or one of 8, 12, 16, 24.
 * @returns The Box spacing step.
 */
export function homeSectionDividerMarginStep(
  selection: HomeSectionGapSelection,
): BoxSpacing {
  if (selection === 'production') {
    return PRODUCTION_SECTION_DIVIDER_MARGIN_STEP;
  }

  return HOME_SECTION_GAP_STEP[selection];
}

/**
 * Tailwind class that keeps the header-to-content gap at 16px while the
 * section divider's own top margin changes with the review switch.
 * React Native does not collapse margins, so this class sits on the
 * sections wrapper and adds to the first divider's top margin.
 *
 * @param selection - Production or one of 8, 12, 16, 24.
 * @returns A margin-top utility, or `undefined` when the divider top is already 16px.
 */
export function homeHeaderToContentClassName(
  selection: HomeSectionGapSelection,
): string | undefined {
  const deltaPx =
    HOME_HEADER_TO_CONTENT_PX - homeSectionDividerMarginStep(selection) * 4;

  if (deltaPx === 0) {
    return undefined;
  }

  const step = Math.abs(deltaPx) / 4;
  const direction = deltaPx < 0 ? '-' : '';

  return `${direction}mt-${step}`;
}

/**
 * Maps a control segment value to a selection.
 *
 * @param value - Segment value from the dev control.
 * @returns The selection, or `undefined` when the value is not one of the review options.
 */
export function parseHomeSectionGapSelection(
  value: string,
): HomeSectionGapSelection | undefined {
  if (value === 'production') {
    return 'production';
  }

  return HOME_SECTION_GAP_OPTIONS.find((option) => String(option) === value);
}
