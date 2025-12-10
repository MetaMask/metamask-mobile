import { Dimensions } from 'react-native';
import type { SwipeGestureConfig } from './PredictSwipeGame.types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Screen dimensions
 */
export const DIMENSIONS = {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
} as const;

/**
 * Default bet amount in USD
 */
export const DEFAULT_BET_AMOUNT = 5;

/**
 * Available preset bet amounts
 */
export const BET_AMOUNTS = [1, 5, 10, 25, 50, 100] as const;

/**
 * Minimum and maximum bet amounts
 */
export const BET_LIMITS = {
  MIN: 1,
  MAX: 100,
} as const;

/**
 * Undo window duration in milliseconds (matches rate limit)
 */
export const UNDO_WINDOW_MS = 5000;

/**
 * Number of cards to prefetch previews for
 */
export const PREFETCH_COUNT = 3;

/**
 * Number of cards to show in the stack behind current card
 */
export const VISIBLE_STACK_COUNT = 2;

/**
 * Auto-refresh interval for price previews (ms)
 */
export const PREVIEW_REFRESH_INTERVAL = 10000;

/**
 * Default gesture configuration
 */
export const DEFAULT_GESTURE_CONFIG: SwipeGestureConfig = {
  horizontalThreshold: 100,
  verticalThreshold: 80,
  snapBackDuration: 300,
  exitDuration: 250,
  velocityThreshold: 500,
};

/**
 * Card animation settings
 */
export const CARD_ANIMATION = {
  // Levitating animation
  LEVITATE_AMPLITUDE: 6, // pixels (reduced for subtlety)
  LEVITATE_DURATION: 2000, // ms per half-cycle (slower)

  // Stack offset per card - cards peek from ABOVE
  STACK_OFFSET_Y: -12, // pixels (negative = peek above the active card)
  STACK_SCALE_DECREASE: 0.04, // 4% smaller per card (subtle)
  STACK_OPACITY_DECREASE: 0, // No opacity - fully visible cards

  // Rotation during swipe
  MAX_ROTATION_DEGREES: 12,

  // Scale during swipe
  MIN_SCALE: 0.92,
} as const;

/**
 * Swipe indicator colors (using design system tokens)
 */
export const SWIPE_COLORS = {
  YES: {
    background: 'bg-success-muted',
    icon: 'success',
    text: 'text-success-default',
  },
  NO: {
    background: 'bg-error-muted',
    icon: 'error',
    text: 'text-error-default',
  },
  SKIP: {
    background: 'bg-muted',
    icon: 'default',
    text: 'text-muted',
  },
} as const;

/**
 * Test IDs for E2E testing
 */
export const SWIPE_GAME_TEST_IDS = {
  CONTAINER: 'swipe-game-container',
  CARD: 'swipe-card',
  CARD_TITLE: 'swipe-card-title',
  CARD_IMAGE: 'swipe-card-image',
  BET_AMOUNT_SELECTOR: 'bet-amount-selector',
  YES_INDICATOR: 'yes-indicator',
  NO_INDICATOR: 'no-indicator',
  SKIP_INDICATOR: 'skip-indicator',
  UNDO_TOAST: 'undo-toast',
  UNDO_BUTTON: 'undo-button',
  PROGRESS_INDICATOR: 'progress-indicator',
} as const;
