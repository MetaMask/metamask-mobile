/**
 * Haptic feedback catalog — the single source of truth for all allowed haptic moments.
 *
 * Adding a new entry requires design + platform sign-off, a README row update,
 * and a QA sync note confirming animation/haptic alignment.
 */

// ────────────────────────────────────────────────────────────────────────────
// Notification moments — map 1:1 to expo-haptics notificationAsync types
// ────────────────────────────────────────────────────────────────────────────

/**
 * Notification-style haptic moments.
 *
 * These produce a distinct "notification" pattern (Taptic Engine on iOS)
 * and are reserved for outcome communication — never reuse across meanings.
 */
export const NotificationMoment = {
  /**
   * Task completed successfully (deposit confirmed, claim succeeded, tx mined).
   * Fires once per completed action — never on intermediate states.
   * Non-negotiable: every release must preserve this mapping.
   */
  Success: 'success',

  /**
   * **System** failure only — the app could not process a request.
   * NEVER use for user-participated negative outcomes (lost bet, liquidation).
   * Conflating outcome with error erodes user trust.
   * Non-negotiable: every release must preserve this mapping.
   */
  Error: 'error',

  /**
   * Compliance / access restriction alert (e.g. geo-blocked).
   * Optional moment — only when the catalog explicitly includes it.
   */
  Warning: 'warning',
} as const;

export type HapticNotificationMoment =
  (typeof NotificationMoment)[keyof typeof NotificationMoment];

// ────────────────────────────────────────────────────────────────────────────
// Impact moments — each maps to exactly one ImpactFeedbackStyle internally
// ────────────────────────────────────────────────────────────────────────────

/**
 * Impact-style haptic moments.
 *
 * Each entry maps to a single `ImpactFeedbackStyle` inside `play.ts`.
 * The underlying style is never exposed to call sites.
 */
export const ImpactMoment = {
  /** Quick amount selection — Light impact. Paired with quick amount selection animation. */
  QuickAmountSelection: 'quickAmountSelection',

  /** Slider step / tick — Light impact. Paired with slider animation. */
  SliderTick: 'sliderTick',

  /**
   * Browser WebView edge-swipe engaged (back / forward) — Light impact on touch-down
   * in the edge zone. Distinct from `SliderTick`; tuning slider ticks must not change
   * in-browser navigation gesture feedback.
   */
  EdgeGestureEngage: 'edgeGestureEngage',

  /**
   * Slider thumb press or release — Medium impact (grab / let go).
   * Distinct from `SliderTick` (discrete ticks / threshold crossings).
   */
  SliderGrip: 'sliderGrip',

  /** Tab bar press — Medium impact. Paired with tab transition animation. */
  TabChange: 'tabChange',

  /**
   * Pull-to-refresh stretch engaged — Light impact (early pull feedback).
   * Distinct from `PullToRefresh` (Medium), which fires when the reload commits.
   */
  PullToRefreshEngage: 'pullToRefreshEngage',

  /** Pull-to-refresh reload committed — Medium impact. */
  PullToRefresh: 'pullToRefresh',

  /** Chart crosshair / OHLC data point change — Light impact. */
  ChartCrosshair: 'chartCrosshair',
} as const;

export type HapticImpactMoment =
  (typeof ImpactMoment)[keyof typeof ImpactMoment];

// ────────────────────────────────────────────────────────────────────────────
// Union of all moments (for documentation / logging, not typically used at
// call sites — prefer the narrower types above)
// ────────────────────────────────────────────────────────────────────────────

export type HapticMoment = HapticNotificationMoment | HapticImpactMoment;

// ────────────────────────────────────────────────────────────────────────────
// Player interface — returned by useHaptics(), used for DI in tests
// ────────────────────────────────────────────────────────────────────────────

export interface HapticsPlayer {
  playSuccessNotification: () => Promise<void>;
  playErrorNotification: () => Promise<void>;
  playWarningNotification: () => Promise<void>;
  playImpact: (moment: HapticImpactMoment) => Promise<void>;
  playSelection: () => Promise<void>;
}
