/**
 * Rive binding contract for the Social Leaderboard onboarding animation
 * (`app/animations/onboarding_nux_v1.riv`).
 *
 * The motion team ships a single text-baked artboard: Rive renders all visuals,
 * copy, trader cards and buttons, and owns step navigation via its state
 * machine. React Native's role is the "hybrid" half — it pushes localized
 * strings + live trader data in through these data bindings and observes the
 * state-machine triggers to run the follow / notification / analytics /
 * persistence logic. Mirrors the Money onboarding pattern
 * (`MoneyOnboardingView`).
 *
 * Update these names if the Rive file's artboard, state machine, bindings or
 * triggers change.
 */
export const RIVE_ARTBOARD_NAME = 'Money_Account';
export const RIVE_STATE_MACHINE_NAME = 'State Machine 1';

/** Numeric data-binding inputs pushed into the artboard. */
export const RIVE_NUMBER_BINDINGS = {
  TRANSITION_SPEED: 'transitionSpeed',
  COIN_SEQ: 'coinSeq',
  CARD_SEQ: 'cardSeq',
} as const;

/** Transition duration (ms) handed to the state machine. */
export const RIVE_TRANSITION_SPEED = 300;

/**
 * State-machine triggers. Rive owns navigation: these triggers advance the
 * artboard's own steps, so RN must only *observe* them (via `useRiveTrigger`)
 * to run side effects — never intercept, or a button tap would no-op the
 * animation's transition.
 */
export const RIVE_TRIGGERS = {
  CLOSE: 'close',
  NEXT: 'next',
  GOT_IT: 'gotIt',
  ALLOW_NOTIFICATIONS: 'allowNotifications',
  FOLLOW_TOP_TRADERS: 'followTopTraders',
  MAYBE_LATER: 'maybeLater',
} as const;

export type OnboardingSlideId = 'trade' | 'follow' | 'notify';

/**
 * Authored slot order inside the `.riv` (1-based): step 1 = Trade,
 * step 2 = Notify, step 3 = Follow. The state machine plays
 * Trade -> Notify -> Follow, so this is the order RN reports for analytics and
 * pushes copy into. Reorder here (and re-author the Rive file) if the UX order
 * changes.
 */
export const RIVE_STEP_SLOTS: readonly OnboardingSlideId[] = [
  'trade',
  'notify',
  'follow',
];

type StepTextField = 'title' | 'content' | 'primaryButton' | 'secondaryButton';

/** Builds a `stepText{n}/{field}` binding path for the given 1-based slot. */
export const riveStepTextBinding = (
  slot: number,
  field: StepTextField,
): string => `stepText${slot}/${field}`;

type TraderField = 'name' | 'period' | 'profitAmount' | 'profitPercent';

/** Builds a `traderTop{rank}/{field}` binding path for the given 1-based rank. */
export const riveTraderBinding = (rank: number, field: TraderField): string =>
  `traderTop${rank}/${field}`;

/** Window label shown on each trader card (leaderboard data is 7-day). */
export const RIVE_TRADER_PERIOD = '7D';

/**
 * Optional map of Rive state-machine state names -> step index, used by
 * `onStateChanged` for per-step analytics and terminal-state detection once the
 * motion team confirms the authored state names. Until then it stays empty and
 * step tracking is driven by the trigger callbacks (which are deterministic).
 * Instrument `onStateChanged` in dev to discover the names, then fill this in.
 */
export const RIVE_STATE_TO_STEP_INDEX: Record<string, number> = {};

/** Number of top traders surfaced on the "Follow the best" step. */
export const ONBOARDING_TOP_TRADERS_LIMIT = 3;

/**
 * When `MM_SOCIAL_LEADERBOARD_ONBOARDING_SKIP_SEEN=true`, the onboarding is not
 * persisted as seen and Wallet home will navigate to it on every mount. For
 * local dev/QA only — remove or unset before release.
 */
export const isSocialLeaderboardOnboardingSkipSeen =
  process.env.MM_SOCIAL_LEADERBOARD_ONBOARDING_SKIP_SEEN === 'true';
