/**
 * Default height of the header in its expanded (large) state and distance
 * over which the header fully collapses.
 */
export const DEFAULT_EXPANDED_HEIGHT = 120;

/**
 * Default height of the header in its collapsed (compact) state.
 */
export const DEFAULT_COLLAPSED_HEIGHT = 56;

/**
 * Height of the toolbar row containing icon buttons.
 */
export const TOOLBAR_HEIGHT = 44;

/**
 * Horizontal padding for the header content.
 */
export const HEADER_HORIZONTAL_PADDING = 16;

/**
 * Animation duration for opacity transitions (in ms).
 */
export const FADE_DURATION = 150;

/**
 * Test IDs for HeaderLeftScrollable component.
 */
export const HeaderLeftScrollableTestIds = {
  CONTAINER: 'header-left-scrollable-container',
  TOOLBAR: 'header-left-scrollable-toolbar',
  LEFT_ICON: 'header-left-scrollable-left-icon',
  RIGHT_ICON: 'header-left-scrollable-right-icon',
  COMPACT_TITLE: 'header-left-scrollable-compact-title',
  LARGE_CONTENT: 'header-left-scrollable-large-content',
  LARGE_TITLE: 'header-left-scrollable-large-title',
} as const;
