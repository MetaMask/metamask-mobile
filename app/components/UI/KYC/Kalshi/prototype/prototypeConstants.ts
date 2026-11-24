// PROTOTYPE-DO-NOT-MERGE
/**
 * Dev-only design prototype for the Kalshi onboarding flow. Every string the
 * prototype shows that has no agreed copy yet is marked `[PROTO]`; George's
 * screens keep their copy unchanged.
 */

/** The code every fake accepts; anything else is wrong. */
export const PROTOTYPE_CODE = '000000';

/** The verified MetaMask email the fakes hand back. */
export const PROTOTYPE_EMAIL = 'designer@example.com';

/** The phone number the fake accepts and echoes back. */
export const PROTOTYPE_PHONE = '+18888888888';

/** The UKYC session id the fakes hand out. */
export const PROTOTYPE_SESSION_ID = 'proto-session-1';

/** How long the fake Sumsub "launch" waits before its view presents. */
export const PROTOTYPE_SUMSUB_LAUNCH_DELAY_MS = 1200;

/** How long the entry status check (UKYC and Kalshi link) holds the fox loader. */
export const PROTOTYPE_ENTRY_CHECK_DELAY_MS = 2000;

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
    title: 'Verifying identity',
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
      '[PROTO] Pick a scenario, then use the get-started card on the prototype Predictions screen. Codes are 000000.',
  },
  ukycCheck: {
    title: '[PROTO] Already completed UKYC?',
    body: '[PROTO] Answers which path the prototype walks.',
    yes: 'Yes',
    no: 'No',
  },
  /** The Kalshi terms page, from the Paper design (Kalshi Logic, 9DM / 9FA). */
  kalshiTerms: {
    stepIndicator: 'Step 3 of 3',
    title: 'Kalshi terms',
    body: "Review and accept Kalshi's terms to open a Kalshi account.",
    sectionTitle: 'Terms and privacy',
    kalshiGroupTitle: 'Kalshi',
    socureGroupTitle: 'Socure',
    socureBody:
      'Kalshi receives the ID photos and selfie you take in MetaMask and shares them with Socure, its service provider, to verify you. Kalshi never sells them.',
    /** The Socure consent, split around its two inline links. */
    socureConsent: {
      beforeTerms:
        "I explicitly consent to Socure, Kalshi's service provider, collecting, using and keeping my facial images and the biometric data derived from them for up to 2 years to verify my identity, as described in the Socure ",
      termsOfUse: 'Terms of Use',
      between: ' and ',
      privacyNotice: 'Privacy Notice',
      after: '.',
    },
    /** The footer agreement, split around its inline link. */
    agreement: {
      before:
        "By tapping Agree and continue, I agree to Kalshi's Member Agreements and Rulebooks, and acknowledge Kalshi's ",
      privacyPolicy: 'Privacy Policy',
      after: '.',
    },
    scrollToContinue: 'Scroll to continue',
    agreeToConsentAbove: 'Agree to consent above',
    agreeAndContinue: 'Agree and continue',
  },
  lockup: 'MetaMask × Kalshi',
  /** The Kalshi email code screen's copy; the fake address is masked where
   * the screen renders the body. */
  emailCode: {
    title: "Enter Kalshi's verification code",
    body: 'Check your email for a 6-digit code from Kalshi. We sent it to {maskedEmail}.',
  },
  /** The phone code screen, worded like the email one under the same wordmark. */
  /** Shown on the phone code screen when no number was passed in. */
  phoneCodeFallbackNumber: 'your phone',
  phoneCode: {
    title: "Enter Kalshi's verification code",
    body: 'Check your messages for a 6-digit code from Kalshi. We sent it to {phoneNumber}.',
  },
  /** The email screen behind "Use my Kalshi email", for an existing Kalshi account. */
  emailEntry: {
    title: 'Already have a Kalshi account?',
    body: "Enter the email you use for Kalshi. We'll send it a 6-digit code to link your account to MetaMask.",
    placeholder: 'Kalshi account email',
    invalid: 'Enter a valid email address.',
  },
  /** The phone number screen, worded like the code screens. */
  phoneEntry: {
    title: 'Verify your phone number',
    body: 'Kalshi will text a 6-digit code to this number.',
    invalid: 'Enter a valid phone number.',
  },
  useDifferentEmail: 'Use my Kalshi email',
  sumsub: {
    title: 'Sumsub (placeholder)',
    body: 'User enters their details in Sumsub’s environment',
    continue: 'Continue',
  },
} as const;

/**
 * The Kalshi Privacy Policy, also linked from the terms page footer. It is
 * acknowledged, not agreed to.
 */
export const PROTOTYPE_KALSHI_PRIVACY_POLICY_URL =
  'https://kalshi.com/privacy-policy';

/**
 * The Kalshi documents the terms page links, in the design's order. The
 * official links Kalshi and Socure confirmed for the integration (Nov 2026);
 * the documents are accepted by Agree and continue, with no Kalshi checkbox.
 */
export const PROTOTYPE_KALSHI_DOCUMENTS = [
  {
    id: 'kalshiex-member-agreement',
    title: 'KalshiEX LLC Member Agreement',
    url: 'https://kalshi-public-docs.s3.amazonaws.com/regulatory/agreement/kalshi_member_agreement.pdf',
  },
  {
    id: 'kalshi-klear-member-agreement',
    title: 'Kalshi Klear LLC Member Agreement',
    url: 'https://kalshi-public-docs.s3.amazonaws.com/regulatory/agreement/klear_member_agreement.pdf',
  },
  {
    id: 'kalshiex-rulebook',
    title: 'KalshiEX LLC Rulebook',
    url: 'https://kalshi-public-docs.s3.amazonaws.com/regulatory/rulebook/Kalshi%20DCM%20Rulebook%20v.1.31.pdf',
  },
  {
    id: 'kalshi-klear-rulebook',
    title: 'Kalshi Klear LLC Rulebook',
    url: 'https://kalshi-public-docs.s3.amazonaws.com/regulatory/rulebook/DCO%20Rulebook%201.6.docx.pdf',
  },
  {
    id: 'kalshi-privacy-policy',
    title: 'Kalshi Privacy Policy',
    url: PROTOTYPE_KALSHI_PRIVACY_POLICY_URL,
  },
] as const;

/**
 * Socure's documents for the biometric consent: the Terms of Use for its
 * document and selfie verification, and its Global Services Privacy Notice
 * (its DocV privacy notice redirects there).
 */
export const PROTOTYPE_SOCURE_LINKS = {
  termsOfUse: 'https://www.socure.com/docv-terms-of-use',
  privacyNotice: 'https://www.socure.com/privacy-en',
} as const;
