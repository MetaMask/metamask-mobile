// PROTOTYPE-DO-NOT-MERGE
/**
 * Dev-only design prototype for the Kalshi onboarding flow. Every string the
 * prototype shows that has no agreed copy yet is marked `[PROTO]`; George's
 * screens keep their copy unchanged.
 */

/** The code every fake accepts; anything else is wrong. */
export const PROTOTYPE_CODE = '123456';

/** The verified MetaMask email the fakes hand back. */
export const PROTOTYPE_EMAIL = 'designer@example.com';

/** The phone number the fake accepts and echoes back. */
export const PROTOTYPE_PHONE = '+18888888888';

/** The UKYC session id the fakes hand out. */
export const PROTOTYPE_SESSION_ID = 'proto-session-1';

/** How long the fake Sumsub "launch" waits before its view presents. */
export const PROTOTYPE_SUMSUB_LAUNCH_DELAY_MS = 1200;

/** How long the fake code check waits before it answers. */
export const PROTOTYPE_CODE_CHECK_DELAY_MS = 400;

/** The country the fakes answer with (ISO 3166-1 alpha-3). */
export const PROTOTYPE_GEO_COUNTRY = 'USA';

/** Scenarios the fake engine knows. Leg 1 wires the first two. */
export const PROTOTYPE_SCENARIO_IDS = [
  'newUserHasMfa',
  'returningUkycUser',
] as const;

export type PrototypeScenarioId = (typeof PROTOTYPE_SCENARIO_IDS)[number];

/**
 * The picker's rows. Leg 1 walks the happy path for a user who already has
 * MetaMask MFA; the rows keep the launcher's shape so leg 2 can add more.
 */
export const PROTOTYPE_SCENARIOS: Record<
  PrototypeScenarioId,
  { title: string; description: string }
> = {
  newUserHasMfa: {
    title: 'New user (has MFA)',
    description:
      'Consent and terms, the Kalshi email and phone codes, Sumsub, then Verified.',
  },
  returningUkycUser: {
    title: 'Returning UKYC user',
    description:
      'Already has an idOS identity: the catch-up consent, then the Kalshi email code, then Verified.',
  },
};

/**
 * Kalshi copy taken from George's branch (`KalshiOnboarding.tsx` and
 * `kalshiErrors.ts`), kept exactly as he wrote it.
 */
export const GEORGE_COPY = {
  kalshiTerms: {
    title: 'Kalshi terms',
    body: 'Review Kalshi’s agreements to open a Kalshi account.',
    accept: 'Accept and submit',
  },
  phone: {
    title: 'Your phone',
    body: 'Kalshi texts a code to this number. Demo: +18888888888.',
    sendCode: 'Send code',
  },
  phoneCode: {
    body: 'Enter the code Kalshi texted you.',
  },
  /** His message for a refused code, from `kalshiErrors.ts`. */
  codeRefused:
    'That code is wrong or has expired. Check it and try again, or send a new code.',
  waiting: {
    title: 'Verifying your identity',
    body: 'This usually takes a few minutes. You can leave and come back.',
    checkAgain: 'Check again',
  },
  done: {
    title: 'Identity verified',
    body: 'Kalshi has your verified identity. Predict activates your account when you start trading.',
  },
} as const;

/** Copy the prototype owns. Anything without agreed design copy sits here. */
export const PROTOTYPE_COPY = {
  devOptions: {
    title: 'Kalshi prototype',
    description:
      '[PROTO] Fake the Kalshi onboarding backend and open the prototype Predictions screen.',
    enter: 'Enter prototype',
    reset: 'Reset prototype',
  },
  picker: {
    title: 'Kalshi prototype',
    description:
      '[PROTO] Pick a scenario, then use the get-started card on the prototype Predictions screen. Codes are 123456.',
  },
  ukycCheck: {
    title: '[PROTO] Already completed UKYC?',
    body: '[PROTO] Answers which path the prototype walks.',
    yes: 'Yes',
    no: 'No',
  },
  vendorTerms: {
    prefix: '[PROTO] By continuing you agree to',
  },
  lockup: 'MetaMask × Kalshi',
  useDifferentEmail: 'Use a different email',
  sumsub: {
    title: 'Sumsub (placeholder)',
    body: 'User enters their details in Sumsub’s environment',
    continue: 'Continue',
  },
} as const;
