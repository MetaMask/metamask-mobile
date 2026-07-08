/**
 * Rive binding contract for the Social Leaderboard onboarding animation
 *
 * The motion team ships a single text-baked artboard: Rive renders all visuals,
 * copy, trader cards and buttons, and owns step navigation via its state
 * machine. React Native's role is the "hybrid" half — it pushes localized
 * strings + live trader data in through these data bindings, streams the top-3
 * avatars in via `referencedAssets`, and observes the state-machine triggers to
 * run the follow / notification / analytics / persistence logic. Mirrors the
 * Money onboarding pattern (`MoneyOnboardingView`).
 *
 * Update these names if the Rive file's artboard, state machine, bindings or
 * triggers change.
 */
export const RIVE_ARTBOARD_NAME = 'slb_onboarding_nux';
export const RIVE_STATE_MACHINE_NAME = 'State Machine 1';

/** Numeric data-binding inputs pushed into the artboard. */
export const RIVE_NUMBER_BINDINGS = {
  TRANSITION_SPEED: 'transitionSpeed',
} as const;

/**
 * Boolean data-binding inputs pushed into the artboard.
 *
 * `ALLOW_NOTIFICATIONS` toggles the Notify step's button layout and is driven
 * purely by notification state on ANY Notify step (post-follow step 3 and the
 * maybe-later variant step 3.1). `true` renders two buttons ("Allow
 * notifications" + "Got it") — pushed whenever a prompt is still needed;
 * `false` renders a single "Got it" — pushed once notifications are enabled.
 * `IS_READY` signals that RN has pushed the initial copy/data so the artboard
 * can proceed.
 */
export const RIVE_BOOLEAN_BINDINGS = {
  ALLOW_NOTIFICATIONS: 'allowNotificationsBoolean',
  IS_READY: 'isReady',
} as const;

/** Transition duration (ms) handed to the state machine. */
export const RIVE_TRANSITION_SPEED = 300;

/**
 * Duration (ms) of EACH phase of the RN title/description fade when the step
 * changes: the previous copy fades fully out, then the new copy fades in (a
 * sequential fade, not a cross-fade, so two different strings never overlap and
 * flicker). The full out+in therefore runs ~2× this value, tuned by feel to sit
 * a beat behind the artboard's own button fades rather than matching
 * `RIVE_TRANSITION_SPEED` exactly.
 */
export const TEXT_FADE_DURATION_MS = 320;

/**
 * State-machine triggers. Rive owns navigation: these triggers advance the
 * artboard's own steps, so RN must only *observe* them (via `useRiveTrigger`)
 * to run side effects — never intercept, or a button tap would no-op the
 * animation's transition.
 *
 * RN also uses these triggers to track the current step (the authored state
 * names — `init` / `scenario1` / `first` … — are opaque, so `onStateChanged`
 * can't be mapped reliably). `next`/`back`/`followTopTraders`/`maybeLater` move
 * `stepIndex`; `gotIt`/`allowNotifications` complete the flow — but only from the
 * Notify step, so a mis-wired earlier button can never boot the user out early.
 *
 * NOTE: `next`/`back` are fired both by the on-slide buttons AND by the
 * artboard's left/right tap-zones, from whichever slide is showing. So their
 * handlers must advance relative to the current step (never hardcode a target)
 * or the RN overlay copy desyncs from the slide Rive actually renders.
 */
export const RIVE_TRIGGERS = {
  CLOSE: 'close',
  NEXT: 'next',
  BACK: 'back',
  GOT_IT: 'gotIt',
  // Second "Got it" trigger the artboard fires from the single-button Notify
  // layout; observed alongside `gotIt` so both complete the flow.
  GOT_IT_2: 'gotIt 2',
  ALLOW_NOTIFICATIONS: 'allowNotifications',
  FOLLOW_TOP_TRADERS: 'followTopTraders',
  MAYBE_LATER: 'maybeLater',
} as const;

export type OnboardingSlideId = 'trade' | 'follow' | 'notify';

/**
 * Analytics slide reported for each RN `stepIndex`:
 * - 0 Trade  (step 1)
 * - 1 Follow (step 2)
 * - 2 Notify (step 3 — reached via "Follow the top three")
 * - 3 Notify (step 3.1 — reached via "Maybe later"; same `notify` screen)
 *
 * The Notify step is terminal: "Allow notifications"/"Got it" complete the flow.
 * Step 2's "Follow the top three"/"Maybe later" only advance to Notify, so they
 * are NOT terminal.
 */
export const SLIDE_BY_STEP_INDEX: readonly OnboardingSlideId[] = [
  'trade',
  'follow',
  'notify',
  'notify',
];

/** Analytics `nux_step` reported for each RN `stepIndex`. */
export const NUX_STEP_BY_STEP_INDEX = [
  'step_1',
  'step_2',
  'step_3',
  'step_3',
] as const;

/** RN `stepIndex` of the (terminal) Notify step and its "3.1" copy variant. */
export const NOTIFY_STEP_INDEX = 2;

type StepTextField = 'title' | 'content' | 'primaryButton' | 'secondaryButton';

/** Builds a `stepText{n}/{field}` binding path for the given 1-based slot. */
export const riveStepTextBinding = (
  slot: number,
  field: StepTextField,
): string => `stepText${slot}/${field}`;

type TraderField = 'name' | 'profitAmount';

/** Builds a `traderTop{rank}/{field}` binding path for the given 1-based rank. */
export const riveTraderBinding = (rank: number, field: TraderField): string =>
  `traderTop${rank}/${field}`;

/**
 * Referenced-asset keys for the trader avatars (marked "Referenced", not
 * "Embedded", in the Rive editor). Order matches the top-3 trader ranks. RN
 * fills these slots at runtime with dynamic HTTPS avatar URLs (or a bundled
 * placeholder) via the `<Rive referencedAssets={...} />` prop.
 */
export const RIVE_AVATAR_ASSET_KEYS = [
  'leaderboard_card_1_avatar',
  'leaderboard_card_2_avatar',
  'leaderboard_card_3_avatar',
] as const;

/**
 * Motion-team placeholder avatars, one per card slot. Used when a trader has no
 * real profile image (`hasRealAvatar` is false) — the legacy Rive runtime can
 * only consume image URLs/bundled files, not the address-derived Maskicon used
 * elsewhere in the app.
 *
 * TODO(future): replace with a rasterized Maskicon per address if we ever need
 * the Rive cards to match the rest of the follow-trading surfaces.
 */
export const RIVE_AVATAR_PLACEHOLDERS: readonly number[] = [
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
  require('../../../../images/leaderboard_card_1_avatar-6249125.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
  require('../../../../images/leaderboard_card_2_avatar-6249126.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
  require('../../../../images/leaderboard_card_3_avatar-6249127.png'),
];

/**
 * Referenced-asset sources for the token logos on the Notify-step buy cards
 * (marked "Referenced" in the Rive editor). Keyed by the plain asset name the
 * motion team exposes in the artboard (`nova`/`blast`/`punch`, no id suffix).
 * These are static bundled images, so they can be merged into the frozen
 * `referencedAssets` mapping alongside the dynamic avatars.
 */
export const RIVE_TOKEN_ASSET_SOURCES: Readonly<Record<string, number>> = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
  nova: require('../../../../images/nova-6273546.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
  blast: require('../../../../images/blast-6273535.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
  punch: require('../../../../images/punch-6223749.png'),
};

/** Number of top traders surfaced on the "Follow the best" step. */
export const ONBOARDING_TOP_TRADERS_LIMIT = 3;

/**
 * Pure safety net for the rare case the artboard is mounted before the
 * top-traders fetch has settled. It bounds how long we wait before mounting the
 * artboard anyway with bundled placeholder avatars for any trader whose real
 * data hasn't arrived yet.
 *
 * In the normal flow this rarely fires: the leaderboard is usually opened from
 * the home "Weekly Top Traders" section, which has already warmed the same
 * react-query cache, so the onboarding's `useTopTraders` resolves immediately.
 */
export const REFERENCED_ASSETS_TIMEOUT_MS = 1500;
