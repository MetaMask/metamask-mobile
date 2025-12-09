/**
 * Default height of the header in its expanded (large) state.
 */
export const DEFAULT_EXPANDED_HEIGHT = 140;

/**
 * Default height of the header in its collapsed (compact) state.
 */
export const DEFAULT_COLLAPSED_HEIGHT = 56;

/**
 * Default scroll distance over which the header fully collapses.
 */
export const DEFAULT_COLLAPSE_THRESHOLD = 120;

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
 * Test IDs for HeaderScrollable component.
 */
export const HeaderScrollableTestIds = {
  CONTAINER: 'header-scrollable-container',
  TOOLBAR: 'header-scrollable-toolbar',
  LEFT_ICON: 'header-scrollable-left-icon',
  RIGHT_ICON: 'header-scrollable-right-icon',
  COMPACT_TITLE: 'header-scrollable-compact-title',
  LARGE_CONTENT: 'header-scrollable-large-content',
  LARGE_TITLE: 'header-scrollable-large-title',
} as const;

