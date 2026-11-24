// PROTOTYPE-DO-NOT-MERGE
/**
 * Every screen on the Kalshi Paper real-screens page, keyed by the ID shown
 * above its caption on the board (KP-01, KP-02, ...).
 *
 * Given a Paper node link, search this file for the node ID (the last part of
 * the link) to find the screen's file and how to reach it in the prototype.
 * Developer options > Open Kalshi prototype lists the scenarios and failure
 * switches named in `reach`. Keep this map in step with the board.
 */
export const KALSHI_PROTOTYPE_PAPER_PAGE =
  'https://app.paper.design/file/01M78EE7WQ41JDTCG688FYYEJ6/p-4-2';

export interface KalshiPrototypeScreen {
  /** The board the screen sits on. */
  board: string;
  /** The screen's title on the board. */
  title: string;
  /** The Paper node of the screen group (phone and caption). */
  paperNode: string;
  /** The file that renders it, or null when the prototype does not build it. */
  file: string | null;
  /** How to reach it from Developer options > Open Kalshi prototype. */
  reach: string;
}

export const KALSHI_PROTOTYPE_SCREENS: Record<string, KalshiPrototypeScreen> = {
  'KP-01': {
    board: 'Level 1: consent and codes',
    title: 'Predictions: Get started',
    paperNode: 'B07-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypePredictionsHome.tsx',
    reach:
      'Any scenario: the prototype Predictions screen with its get-started card',
  },
  'KP-02': {
    board: 'Level 1: consent and codes',
    title: 'Loading',
    paperNode: 'AZJ-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypeLoading.tsx',
    reach:
      'New user (has MFA): tap the get-started card; shows while the session loads',
  },
  'KP-03': {
    board: 'Level 1: consent and codes',
    title: 'Verify your identity',
    paperNode: 'AXL-2',
    file: 'app/components/UI/KYC/Views/SumSub/VerifyIdentity.tsx',
    reach: 'New user (has MFA): tap the get-started card',
  },
  'KP-04': {
    board: 'Level 1: consent and codes',
    title: 'Our verification partners: tick',
    paperNode: 'AW7-2',
    file: 'app/components/UI/KYC/Views/SumSub/PartnerTerms.tsx',
    reach:
      'New user (has MFA): Verify your identity, then open the partners page',
  },
  'KP-05': {
    board: 'Level 1: consent and codes',
    title: 'Our verification partners: agreed',
    paperNode: 'AUS-2',
    file: 'app/components/UI/KYC/Views/SumSub/PartnerTerms.tsx',
    reach: 'New user (has MFA): the partners page after ticking the box',
  },
  'KP-06': {
    board: 'Level 1: consent and codes',
    title: 'Kalshi terms: Socure',
    paperNode: 'AT5-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypeTerms.tsx',
    reach:
      'New user (has MFA): after the shared consent, the Kalshi terms page',
  },
  'KP-07': {
    board: 'Level 1: consent and codes',
    title: 'Kalshi terms: agreed',
    paperNode: 'ARH-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypeTerms.tsx',
    reach: 'New user (has MFA): the Kalshi terms page after agreeing',
  },
  'KP-08': {
    board: 'Level 1: consent and codes',
    title: 'Enter your verification code',
    paperNode: 'AQC-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypeCodeScreen.tsx',
    reach: 'New user (has MFA): after the Kalshi terms; the code is 000000',
  },
  'KP-09': {
    board: 'Level 1: consent and codes',
    title: 'Verify your phone number',
    paperNode: 'APH-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypePhoneEntry.tsx',
    reach: 'New user (has MFA): after the email code, or Left part way through',
  },
  'KP-10': {
    board: 'Level 1: consent and codes',
    title: 'Enter your verification code',
    paperNode: 'AOE-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypeCodeScreen.tsx',
    reach: 'New user (has MFA): after the phone number; the code is 000000',
  },
  'KP-11': {
    board: 'Level 1: consent and codes',
    title: 'catch-up consent (not final)',
    paperNode: 'AML-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypeTerms.tsx',
    reach: 'Returning UKYC user: tap the get-started card',
  },
  'KP-12': {
    board: 'Level 1: consent and codes',
    title: 'Different email for Kalshi',
    paperNode: 'AK2-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypeEmailEntry.tsx',
    reach:
      'New user (has MFA): on the email code screen, use a different email',
  },
  'KP-13': {
    board: 'Level 1: consent and codes',
    title: 'Email code not sent',
    paperNode: 'ALQ-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/codeNotSentAlert.ts',
    reach: 'Turn on Fail Kalshi code sends, then reach the email code screen',
  },
  'KP-14': {
    board: 'Level 1: consent and codes',
    title: 'Wrong or expired code',
    paperNode: 'AI1-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypeCodeScreen.tsx',
    reach:
      'New user (has MFA): enter any code other than 000000 on the email code screen',
  },
  'KP-15': {
    board: 'Level 1: consent and codes',
    title: 'Phone code not sent',
    paperNode: 'AG2-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/codeNotSentAlert.ts',
    reach: 'Turn on Fail Kalshi code sends, then reach the phone code screen',
  },
  'KP-16': {
    board: 'Level 1: consent and codes',
    title: 'Wrong or expired code',
    paperNode: 'AF2-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypeCodeScreen.tsx',
    reach:
      'New user (has MFA): enter any code other than 000000 on the phone code screen',
  },
  'KP-17': {
    board: 'Level 1: name and linking',
    title: 'Your details',
    paperNode: 'BDO-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypeSumsubScreen.tsx',
    reach:
      'New user (has MFA): after the phone code (placeholder for the Sumsub SDK)',
  },
  'KP-18': {
    board: 'Level 1: name and linking',
    title: 'Verifying your details',
    paperNode: 'BA7-2',
    file: 'app/components/UI/KYC/Views/Status/KycPending.tsx',
    reach: 'New user (has MFA): submit the Sumsub step',
  },
  'KP-19': {
    board: 'Level 1: name and linking',
    title: 'Identity verified',
    paperNode: 'BCY-2',
    file: 'app/components/UI/KYC/Views/Status/IdentityVerified.tsx',
    reach: 'New user (has MFA): wait on Verifying until the review approves',
  },
  'KP-20': {
    board: 'Level 1: name and linking',
    title: "Couldn't start verification",
    paperNode: 'BC5-2',
    file: 'app/components/UI/KYC/Views/SumSub/SumSubKyc.tsx (showKycSumSubLaunchError)',
    reach: 'Turn on Fail the Sumsub launch, then reach the Sumsub step',
  },
  'KP-21': {
    board: 'Level 1: name and linking',
    title: 'ID and selfie (Level 2)',
    paperNode: 'B8F-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypeSumsubScreen.tsx',
    reach: 'Placeholder for the Sumsub SDK ID and selfie step (same session)',
  },
  'KP-22': {
    board: 'Level 1: name and linking',
    title: "We couldn't verify your identity",
    paperNode: 'B99-2',
    file: 'app/components/UI/KYC/Views/Status/KycRejected.tsx',
    reach: "Verifying, then Resolve the review: Can't verify",
  },
  'KP-23': {
    board: 'Level 2: step-up',
    title: 'Heads-up',
    paperNode: 'BNG-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypeStepUp.tsx',
    reach: 'Step-up required: tap the card',
  },
  'KP-24': {
    board: 'Level 2: step-up',
    title: 'ID and selfie',
    paperNode: 'BMZ-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypeSumsubScreen.tsx',
    reach: 'Step-up required: continue from the heads-up',
  },
  'KP-25': {
    board: 'Level 2: step-up',
    title: 'Verifying your identity',
    paperNode: 'BM5-2',
    file: 'app/components/UI/KYC/Views/Status/KycPending.tsx',
    reach: 'Step-up required: submit the Sumsub step',
  },
  'KP-26': {
    board: 'Level 2: step-up',
    title: 'Identity verified',
    paperNode: 'BLE-2',
    file: 'app/components/UI/KYC/Views/Status/IdentityVerified.tsx',
    reach: 'Step-up required: wait on Verifying until the review approves',
  },
  'KP-27': {
    board: 'Level 2: step-up',
    title: 'Predictions: Verify your ID',
    paperNode: 'BHO-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypePredictionsHome.tsx',
    reach: 'Step-up required: the Predictions card before starting',
  },
  'KP-28': {
    board: 'Level 2: step-up',
    title: "We couldn't verify your identity",
    paperNode: 'BKC-2',
    file: 'app/components/UI/KYC/Views/Status/KycRejected.tsx',
    reach: "Step-up required, then Resolve the review: Can't verify",
  },
  'KP-29': {
    board: 'Level 2: status card and push',
    title: 'Status card: In review',
    paperNode: 'BZ7-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypeStatusCard.tsx',
    reach: 'Verifying: the card on Predictions',
  },
  'KP-30': {
    board: 'Level 2: status card and push',
    title: 'Push: Identity verified',
    paperNode: 'BYH-2',
    file: null,
    reach: 'Not built: system push notification, drawn in Paper only',
  },
  'KP-31': {
    board: 'Level 2: status card and push',
    title: 'Status card: Verified',
    paperNode: 'BVY-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypeStatusCard.tsx',
    reach: 'Verified: the card on Predictions',
  },
  'KP-32': {
    board: 'Level 2: status card and push',
    title: 'Push: Action needed',
    paperNode: 'BV6-2',
    file: null,
    reach: 'Not built: system push notification, drawn in Paper only',
  },
  'KP-33': {
    board: 'Level 2: status card and push',
    title: 'Status card: Action needed',
    paperNode: 'BSN-2',
    file: 'app/components/UI/KYC/Kalshi/prototype/KalshiPrototypeStatusCard.tsx',
    reach: "Can't verify: the card on Predictions",
  },
};
