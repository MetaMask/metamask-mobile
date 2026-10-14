/**
 * Both profile onboarding files reference (do not embed) their `Inter` font.
 * Their text styles use variable `wght` 400–600, mostly 500; the bundled Inter
 * is static, so Medium covers all of them. Module-level so the mapping
 * identity never changes.
 */
export const PROFILE_ONBOARDING_RIVE_ASSETS = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
  Inter: { source: require('../../../../fonts/Inter-Medium.ttf') },
};

/**
 * Runtime contract for `social_v1_social-onboarding.riv` (intro step).
 *
 * Artboard `content` (393×440) is bound to the `Main` view model. Copy, trader
 * names, token logos and avatars are baked into the file, so no strings or
 * images are pushed in.
 *
 * `Main` view model:
 * - `continue` (trigger, RN → Rive): Podium → Activity → Post.
 * - `back` (trigger, RN → Rive): Post → Activity → Podium.
 * - `currentStep` (number, Rive → RN): 1 Podium, 2 Activity, 3 Post.
 * - `onboardingCompleted` (trigger, Rive → RN): fires as Post celebration starts.
 * - `moneyGun` (nested `MoneyGunControls` view model): authored defaults.
 */
export const PROFILE_ONBOARDING_RIVE_ARTBOARD = 'content';
export const PROFILE_ONBOARDING_RIVE_STATE_MACHINE = 'State Machine 1';

export const PROFILE_ONBOARDING_RIVE_PATHS = {
  CONTINUE: 'continue',
  BACK: 'back',
  CURRENT_STEP: 'currentStep',
  ONBOARDING_COMPLETED: 'onboardingCompleted',
} as const;

/**
 * Runtime contract for `social_v1_profile-ready.riv` (ready step).
 *
 * Artboard `Profile Ready` (416×419) is bound to the `Profile Ready` view
 * model. Intro plays once, then Loop runs until `exit` turns on Outro; a second
 * layer orbits the embedded preset avatars continuously.
 *
 * `Profile Ready` view model (all RN → Rive):
 * - `avatar` (image): the card avatar; defaults to an embedded stand-in.
 * - `displayName` (string).
 * - `handle` (string): rendered verbatim, so include the leading `@`.
 * - `isVerified` (boolean): verified badge visibility.
 * - `exit` (boolean): plays Outro from Loop.
 */
export const PROFILE_READY_RIVE_ARTBOARD = 'Profile Ready';
export const PROFILE_READY_RIVE_STATE_MACHINE = 'Profile Ready';

export const PROFILE_READY_RIVE_PATHS = {
  AVATAR: 'avatar',
  DISPLAY_NAME: 'displayName',
  HANDLE: 'handle',
  IS_VERIFIED: 'isVerified',
  EXIT: 'exit',
} as const;
