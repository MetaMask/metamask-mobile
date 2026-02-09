import AppConstants from '../../../core/AppConstants';

// Existing browser constants
export const IPFS_GATEWAY_DISABLED_ERROR =
  'IPFS gateway is disabled on security and privacy settings';
export const { HOMEPAGE_URL, NOTIFICATION_NAMES, OLD_HOMEPAGE_URL_HOST } =
  AppConstants;
export const HOMEPAGE_HOST = new URL(HOMEPAGE_URL)?.hostname;
export const MM_MIXPANEL_TOKEN = process.env.MM_MIXPANEL_TOKEN;

/**
 * Browser Tab Gesture Navigation Constants
 *
 * These constants control the gesture detection zones and thresholds
 * for swipe navigation and pull-to-refresh functionality.
 */

/**
 * Edge detection threshold in pixels.
 * Touches within this distance from the left/right edge of the screen
 * will trigger back/forward swipe gestures.
 */
export const EDGE_THRESHOLD = 20;

/**
 * Swipe completion threshold as a percentage of screen width.
 * User must swipe at least this percentage of the screen width
 * to complete a back/forward navigation.
 */
export const SWIPE_THRESHOLD = 0.3;

/**
 * Pull distance threshold in pixels.
 * User must pull down at least this many pixels to trigger a page refresh.
 */
export const PULL_THRESHOLD = 80;

/**
 * Scroll position threshold for "at top" detection in pixels.
 * Used to account for Android WebView quirks where scrollY might not be exactly 0.
 * If scrollY <= this value, the page is considered scrolled to the top.
 */
export const SCROLL_TOP_THRESHOLD = 5;

/**
 * Pull-to-refresh activation zone height in pixels.
 * Only touches starting in the top N pixels of the WebView can trigger
 * the pull-to-refresh gesture. This prevents interference with normal
 * WebView interactions (tapping links, buttons, etc.).
 */
export const PULL_ACTIVATION_ZONE = 50;
