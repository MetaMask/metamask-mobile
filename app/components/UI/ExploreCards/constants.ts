import type { WithSpringConfig } from 'react-native-reanimated';
import { brandColor } from '@metamask/design-tokens';
import type { DeckCardType } from './types';

/** Max cards per deck. */
export const DECK_SIZE = 10;

/** Per-type quotas (sum = DECK_SIZE). */
export const DECK_MIX: Record<DeckCardType, number> = {
  crypto: 3,
  perp: 2,
  prediction: 2,
  news: 2,
  trader: 1,
  // crypto: 6,
  // perp: 3,
  // prediction: 4,
  // news: 4,
  // trader: 3,
};

/** Order in which shortfall slots are redistributed to other types. */
export const DECK_TYPE_PRIORITY: DeckCardType[] = [
  'crypto',
  'perp',
  'prediction',
  'news',
  'trader',
];

/** Fraction of screen width the card must travel to commit a swipe. */
export const SWIPE_COMMIT_DISTANCE_RATIO = 0.4;

/** px/s fling velocity that commits a swipe regardless of distance. */
export const SWIPE_COMMIT_VELOCITY = 800;

/** Card rotation (degrees) at a full-width drag. */
export const MAX_ROTATION_DEG = 12;

/** Cards rendered in the stack (active + behind). */
export const VISIBLE_STACK_SIZE = 3;

/** Build the deck with whatever data arrived once this elapses. */
export const DECK_LOAD_TIMEOUT_MS = 4000;

/**
 * Ignore the feeds' "all settled" signal for this long after mount. Some
 * hooks report not-loading on their very first render (before their fetch
 * effects run), which previously froze the deck with only the fastest feed
 * (the perps stream) — a mono-type deck.
 */
export const SETTLE_GRACE_MS = 500;

/** Duration of the fly-off animation when a swipe commits. */
export const SWIPE_OFF_DURATION_MS = 260;

/** Scale decrement per stack level behind the active card. */
export const STACK_SCALE_STEP = 0.05;

/**
 * How far (pt) each behind-card's top edge peeks above the card in front.
 * Cards fill the stage, so the stack reveals itself at the top edge (the
 * bottoms stay tucked behind the active card, near the thumb zone).
 */
export const STACK_PEEK_STEP = 12;

/** Snappy, minimal-bounce spring (mirrors Toast's TOAST_SPRING_CONFIG). */
export const DECK_SPRING_CONFIG: WithSpringConfig = {
  dampingRatio: 0.85,
  duration: 500,
};

/** Stagger (ms) between each card's entrance in the mount cascade. */
export const DECK_ENTRANCE_STAGGER_MS = 80;

/**
 * Per-type gradient border accents, one distinct hue sweep per card type,
 * pulled from the raw brand palette so they stay vivid in both themes.
 */
export const CARD_ACCENTS: Record<DeckCardType, [string, string]> = {
  crypto: [brandColor.blue400, brandColor.purple400],
  perp: [brandColor.orange400, brandColor.yellow300],
  prediction: [brandColor.purple400, brandColor.red300],
  news: [brandColor.blue300, brandColor.indigo500],
  trader: [brandColor.green400, brandColor.lime300],
};

/** Celebration gradient for the end-of-deck card. */
export const EMPTY_CARD_ACCENT: [string, string] = [
  brandColor.purple400,
  brandColor.green300,
];

/** Accent for the Now-tab entry banner. */
export const BANNER_ACCENT: [string, string] = [
  brandColor.purple400,
  brandColor.blue400,
];

/** Thickness (pt) of the gradient card border. */
export const CARD_BORDER_WIDTH = 2;

/** One full cross-fade of the border gradient (looped, auto-reversing). */
export const CARD_BORDER_SHIFT_DURATION_MS = 2200;
