// PROTOTYPE-DO-NOT-MERGE
import {
  KycApiError,
  type KycDisclaimer,
  type KycDisclaimersCatalog,
  type KycStep,
  type KycStepStatus,
} from '@metamask/kyc-controller';
import {
  PROTOTYPE_CODE,
  PROTOTYPE_EMAIL,
  PROTOTYPE_GEO_COUNTRY,
  PROTOTYPE_KALSHI_DOCUMENTS,
  PROTOTYPE_PHONE,
  PROTOTYPE_SESSION_ID,
  type PrototypeScenarioId,
} from './prototypeConstants';

/**
 * What the fakes keep for the Kalshi vendor, shaped like the controller's
 * state plus the `mfaCompleted` flag the screens read.
 */
export interface PrototypeVendorState {
  step: KycStep | null;
  status: KycStepStatus | null;
  sessionId: string | null;
  mfaCompleted?: boolean;
}

/** What one scenario scripts. Adding a scenario is adding one of these. */
export interface PrototypeScenarioSpec {
  /** The vendor state the flow starts on. */
  entry: {
    step: KycStep | null;
    status: KycStepStatus | null;
    sessionId: string | null;
    mfaCompleted: boolean;
    /** The fake MFA session is valid, so MFA would resolve without a code. */
    hasValidMfaSession: boolean;
  };
  /** The user has an idOS identity, so the flow skips Sumsub. */
  hasIdosIdentity: boolean;
  /**
   * The idOS and SumSub consents were already given, so the terms show the
   * vendor's page alone (the catch-up consent).
   */
  isSessionCatalogEmpty: boolean;
  /** What a pending decision settles on; `undefined` stays pending. */
  decisionOutcome?: KycStepStatus;
  /** How the email code misbehaves, for leg 2. */
  emailCodeScript?: 'wrongOnce' | 'expiredUntilResent';
}

/**
 * The script one scenario walks. Every transition takes one of these and
 * returns the next, so a scenario walk is reproducible in tests.
 */
export interface PrototypeScriptState {
  scenario: PrototypeScenarioId;
  vendor: PrototypeVendorState;
  hasValidMfaSession: boolean;
  /** The phone code was sent from the phone step and is being entered. */
  phoneCodeSent: boolean;
  /** Reads of a pending decision, so the outcome lands on a later read. */
  decisionReads: number;
  /** How many Kalshi email code checks have been refused. */
  emailCodeFailures: number;
  /** A new Kalshi email code was sent, so an expired one works again. */
  emailCodeResent: boolean;
  /** The last refused check, so the caller answers with kyc-api's error. */
  refusedCode: boolean;
}

/** How many reads of a pending decision to leave unanswered. */
const DECISION_READS_BEFORE_OUTCOME = 2;

/** The two scenarios leg 1 wires. Leg 2 adds the unhappy ones here. */
export const PROTOTYPE_SCENARIO_SPECS: Record<
  PrototypeScenarioId,
  PrototypeScenarioSpec
> = {
  newUserHasMfa: {
    entry: {
      step: 'terms',
      status: 'none',
      sessionId: null,
      mfaCompleted: true,
      hasValidMfaSession: true,
    },
    hasIdosIdentity: false,
    isSessionCatalogEmpty: false,
    decisionOutcome: 'approved',
  },
  returningUkycUser: {
    entry: {
      step: 'terms',
      status: 'none',
      sessionId: PROTOTYPE_SESSION_ID,
      mfaCompleted: true,
      hasValidMfaSession: true,
    },
    hasIdosIdentity: true,
    isSessionCatalogEmpty: true,
    decisionOutcome: 'approved',
  },
};

/**
 * A refused Kalshi email or phone code, as kyc-api answers it. George's
 * screen turns the code into its own copy.
 */
export const prototypeCodeError = () =>
  new KycApiError(
    400,
    'The code is wrong or has expired.',
    'invalid_or_expired_code',
  );

const assertCode = (code: string): void => {
  if (code !== PROTOTYPE_CODE) {
    throw prototypeCodeError();
  }
};

/** The fake idOS and SumSub documents behind the first two terms pages. */
const SESSION_CATALOG: KycDisclaimersCatalog = {
  idOS: [
    {
      key: 'idos-terms',
      version: '1',
      title: 'idOS Terms of Use',
      url: 'https://idos.network/terms-of-use',
    },
  ],
  kycProvider: [
    {
      key: 'sumsub-terms',
      version: '1',
      title: 'SumSub Terms of Use',
      url: 'https://sumsub.com/terms-of-use',
    },
  ],
};

/** The Kalshi documents behind the vendor terms page. */
const VENDOR_DISCLAIMERS: KycDisclaimer[] = PROTOTYPE_KALSHI_DOCUMENTS.map(
  (document) => ({
    id: document.id,
    display_name: document.title,
    url: document.url,
  }),
);

/** The script as a scenario starts. */
export const enterScenario = (
  scenario: PrototypeScenarioId,
): PrototypeScriptState => {
  const spec = PROTOTYPE_SCENARIO_SPECS[scenario];
  return {
    scenario,
    vendor: {
      step: spec.entry.step,
      status: spec.entry.status,
      sessionId: spec.entry.sessionId,
      mfaCompleted: spec.entry.mfaCompleted,
    },
    hasValidMfaSession: spec.entry.hasValidMfaSession,
    phoneCodeSent: false,
    decisionReads: 0,
    emailCodeFailures: 0,
    emailCodeResent: false,
    refusedCode: false,
  };
};

/** `refreshStep`: while a decision is pending, reads bring its outcome nearer. */
export const readStep = (state: PrototypeScriptState): PrototypeScriptState => {
  if (state.vendor.step !== 'decision' || state.vendor.status !== 'pending') {
    return state;
  }
  const decisionReads = state.decisionReads + 1;
  const outcome = PROTOTYPE_SCENARIO_SPECS[state.scenario].decisionOutcome;
  const settled =
    outcome !== undefined && decisionReads >= DECISION_READS_BEFORE_OUTCOME;
  return {
    ...state,
    decisionReads,
    vendor: settled ? { ...state.vendor, status: outcome } : state.vendor,
  };
};

/** `recordMfaCompleted`: the phone told kyc-api MFA is done; terms follow. */
export const recordMfa = (
  state: PrototypeScriptState,
): PrototypeScriptState => ({
  ...state,
  vendor: { ...state.vendor, mfaCompleted: true, step: 'terms' },
});

/** `submitTerms`: the vendor terms were recorded; the email link follows. */
export const acceptTerms = (
  state: PrototypeScriptState,
): PrototypeScriptState => ({
  ...state,
  vendor: { ...state.vendor, step: 'kalshi_email_link' },
});

/** `startSession`: the relay opened (or picked up) the UKYC session. */
export const openSession = (
  state: PrototypeScriptState,
): PrototypeScriptState => ({
  ...state,
  vendor: { ...state.vendor, sessionId: PROTOTYPE_SESSION_ID },
});

/** `sendEmailOtp`: a new code went out, so an expired one works again. */
export const resendEmailCode = (
  state: PrototypeScriptState,
): PrototypeScriptState => ({ ...state, emailCodeResent: true });

/**
 * `sendPhoneOtp`: the phone step sent its code, so the code screen shows.
 * kyc-api cannot tell the two screens apart, so only the phone knows.
 */
export const sendPhone = (
  state: PrototypeScriptState,
): PrototypeScriptState => ({ ...state, phoneCodeSent: true });

/**
 * `verifyEmailOtp`: the correct code moves the flow to the phone; a wrong
 * one, a scripted wrong-code run, and an expired one are refused.
 */
export const checkEmailCode = (
  state: PrototypeScriptState,
  code: string,
): PrototypeScriptState => {
  assertCode(code);
  const script = PROTOTYPE_SCENARIO_SPECS[state.scenario].emailCodeScript;
  if (script === 'wrongOnce' && state.emailCodeFailures === 0) {
    return { ...state, emailCodeFailures: 1, refusedCode: true };
  }
  if (script === 'expiredUntilResent' && !state.emailCodeResent) {
    return { ...state, refusedCode: true };
  }
  return {
    ...state,
    refusedCode: false,
    vendor: { ...state.vendor, step: 'kalshi_phone_link' },
  };
};

/**
 * `verifyPhoneOtp`: the correct code moves to Sumsub, or straight to the
 * decision when the scenario starts with an idOS identity.
 */
export const checkPhoneCode = (
  state: PrototypeScriptState,
  code: string,
): PrototypeScriptState => {
  assertCode(code);
  if (PROTOTYPE_SCENARIO_SPECS[state.scenario].hasIdosIdentity) {
    return {
      ...state,
      refusedCode: false,
      decisionReads: 0,
      vendor: { ...state.vendor, step: 'decision', status: 'pending' },
    };
  }
  return {
    ...state,
    refusedCode: false,
    vendor: { ...state.vendor, step: 'sumsub' },
  };
};

/** The Sumsub presentation was left; the decision is pending from here. */
export const finishSumsub = (
  state: PrototypeScriptState,
): PrototypeScriptState => ({
  ...state,
  decisionReads: 0,
  vendor: { ...state.vendor, step: 'decision', status: 'pending' },
});

/** The fake MFA went through, so it never asks again this run. */
export const completeMfa = (
  state: PrototypeScriptState,
): PrototypeScriptState => ({
  ...state,
  hasValidMfaSession: true,
  vendor: { ...state.vendor, mfaCompleted: true },
});

/** The verified MetaMask email the relay links the Kalshi account with. */
export const prototypePartnerEmail = PROTOTYPE_EMAIL;

/** The phone number the fake echoes back. */
export const prototypePartnerPhone = PROTOTYPE_PHONE;

/** The country the fakes answer with. */
export const prototypeGeoCountry = PROTOTYPE_GEO_COUNTRY;

/**
 * The idOS and SumSub documents for the first two terms pages. A scenario
 * that starts with an idOS identity has already consented to them, so its
 * catalog is empty and the terms show the vendor's page alone.
 */
export const prototypeSessionCatalog = (
  state: PrototypeScriptState,
): KycDisclaimersCatalog =>
  PROTOTYPE_SCENARIO_SPECS[state.scenario].isSessionCatalogEmpty
    ? { idOS: [], kycProvider: [] }
    : SESSION_CATALOG;

/** The Kalshi documents for the vendor terms page. */
export const prototypeVendorDisclaimers = (): KycDisclaimer[] =>
  VENDOR_DISCLAIMERS;
