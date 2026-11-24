// PROTOTYPE-DO-NOT-MERGE
import type { KycStep, KycStepStatus } from '@metamask/kyc-controller';
import type { PrototypeScenarioId } from './prototypeConstants';
import {
  acceptTerms,
  enterScenario,
  finishSumsub,
  openSession,
  prototypeCodeError,
  prototypeGeoCountry,
  prototypePartnerEmail,
  prototypeSessionCatalog,
  prototypeVendorDisclaimers,
  readStep,
  recordMfa,
  resendEmailCode,
  sendPhone,
  checkEmailCode,
  checkPhoneCode,
  type PrototypeScriptState,
} from './prototypeScenarioEngine';
import {
  installPrototypeBackend,
  removePrototypeBackend,
} from './prototypeInjection';
/**
 * The prototype's runtime state. Replaced whole on every change, so it can
 * back `useSyncExternalStore` directly.
 */
export interface PrototypeRuntimeState {
  /** The runtime toggle is on. */
  active: boolean;
  /** The scenario, once the flow's UKYC check (or the picker) answered. */
  scenario: PrototypeScenarioId | null;
  script: PrototypeScriptState | null;
  /** The fake Sumsub presentation is open. */
  sumsubOpen: boolean;
  /**
   * The Predictions status card was dismissed and stays hidden until the
   * next scenario (or the reset) replaces the script.
   */
  cardDismissed: boolean;
}

const IDLE: PrototypeRuntimeState = {
  active: false,
  scenario: null,
  script: null,
  sumsubOpen: false,
  cardDismissed: false,
};

let runtime: PrototypeRuntimeState = IDLE;
const listeners = new Set<() => void>();
/** Resolves the pending fake Sumsub launch, like the SDK hand-off would. */
let pendingSumsubLaunch:
  | ((outcome: 'submitted' | 'abandoned') => void)
  | undefined;

const setRuntime = (next: PrototypeRuntimeState) => {
  runtime = next;
  listeners.forEach((listener) => listener());
};

/** The runtime toggle, including the `__DEV__` gate. */
export const isKalshiPrototypeActive = (): boolean =>
  Boolean(__DEV__) && runtime.active;

export const getKalshiPrototypeRuntime = (): PrototypeRuntimeState => runtime;

/**
 * What the Predictions status card shows, from the script the fake backend
 * is walking.
 */
export type KalshiPrototypeCardState =
  | 'getStarted'
  | 'needMoreInfo'
  | 'stepUp'
  | 'verifying'
  | 'cantVerify'
  | 'verified';

/**
 * The Predictions status card's state, from the script the fake backend is
 * walking.
 *
 * - `getStarted`: no scenario armed yet; the card is the entry point.
 * - `getStarted` also covers a scenario still at the terms step: a new or
 * returning user who has not started yet sees the same entry card.
 * - `needMoreInfo`: the flow was started and left part way through.
 * - `stepUp`: Kalshi asks for Level 2, so the card opens Sumsub.
 * - `verifying`: the KYC was submitted and its review is pending.
 * - `cantVerify`: the review came back rejected; terminal, no way back in.
 * - `verified`: the review approved.
 *
 * @param script - The fake script, or `null` before a scenario is armed.
 * @returns The card state.
 */
export const deriveKalshiPrototypeCardState = (
  script: PrototypeScriptState | null,
): KalshiPrototypeCardState => {
  if (!script || script.vendor.step === 'terms') {
    return 'getStarted';
  }
  if (script.scenario === 'stepUpRequired' && script.vendor.step === 'sumsub') {
    return 'stepUp';
  }
  if (script.vendor.step === 'decision') {
    switch (script.vendor.status) {
      case 'approved':
        return 'verified';
      case 'rejected':
        return 'cantVerify';
      default:
        return 'verifying';
    }
  }
  return 'needMoreInfo';
};

export const subscribeToKalshiPrototype = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The step a fake action answers with; the script always has one. */
const currentStep = (script: PrototypeScriptState): KycStep => {
  if (script.vendor.step === null) {
    throw new Error('Kalshi prototype: the script has no step.');
  }
  return script.vendor.step;
};

const requireScript = (): PrototypeScriptState => {
  if (!runtime.script) {
    throw new Error('Kalshi prototype is not active.');
  }
  return runtime.script;
};

/** Settles what the screens await, the way leaving a flow would. */
const settlePending = () => {
  const launch = pendingSumsubLaunch;
  pendingSumsubLaunch = undefined;
  launch?.('abandoned');
};

/**
 * Turns the prototype on without a scenario yet: the flow's UKYC check (or a
 * picker row) answers with one. No-op outside `__DEV__`.
 */
export const activateKalshiPrototype = () => {
  if (!__DEV__) {
    return;
  }
  settlePending();
  installPrototypeBackend(() => runtime.script);
  setRuntime({ ...IDLE, active: true });
};

/** Arms one scenario, restarting its script. No-op outside `__DEV__`. */
export const activateKalshiPrototypeScenario = (
  scenario: PrototypeScenarioId,
) => {
  if (!__DEV__) {
    return;
  }
  settlePending();
  installPrototypeBackend(() => runtime.script);
  setRuntime({
    active: true,
    scenario,
    script: enterScenario(scenario),
    sumsubOpen: false,
    cardDismissed: false,
  });
};

/**
 * Tears the prototype down: the toggle turns off and the fake state is
 * dropped. Pending fakes settle the way a user leaving would. No-op outside
 * `__DEV__`.
 */
export const resetKalshiPrototype = () => {
  if (!__DEV__) {
    return;
  }
  settlePending();
  setRuntime(IDLE);
  removePrototypeBackend();
};

/**
 * Hides the Predictions status card until the next scenario (or the reset)
 * replaces the script.
 */
export const dismissKalshiPrototypeCard = () => {
  setRuntime({ ...runtime, cardDismissed: true });
};

/**
 * The Developer Options control settles a pending review the way kyc-api
 * would answer its next poll. No-op while no review is pending.
 *
 * @param outcome - What the review settles on.
 */
export const resolveKalshiPrototypeDecision = (
  outcome: Extract<KycStepStatus, 'approved' | 'rejected'>,
) => {
  const script = runtime.script;
  if (
    !script ||
    script.vendor.step !== 'decision' ||
    script.vendor.status !== 'pending'
  ) {
    return;
  }
  setRuntime({
    ...runtime,
    script: {
      ...script,
      vendor: { ...script.vendor, status: outcome },
    },
  });
};

/** The Sumsub presentation's Continue. */
export const prototypeCompleteSumsub = (
  outcome: 'submitted' | 'abandoned' = 'submitted',
) => {
  const launch = pendingSumsubLaunch;
  pendingSumsubLaunch = undefined;
  if (runtime.script) {
    setRuntime({
      ...runtime,
      script: finishSumsub(runtime.script),
      sumsubOpen: false,
    });
  } else {
    setRuntime({ ...runtime, sumsubOpen: false });
  }
  launch?.(outcome);
};

/**
 * The fake `VendorOnboardingController` surface the prototype flow walks.
 * Each method takes the params the real controller would, moves the script
 * the way kyc-api would, and answers with the step it ended on.
 */
export const getKalshiPrototypeVendorOnboarding = () => ({
  getPartnerEmail: async (_params: { vendor: string }) => prototypePartnerEmail,

  refreshStep: async (_params: { vendor: string }): Promise<KycStep> => {
    const script = readStep(requireScript());
    setRuntime({ ...runtime, script });
    return currentStep(script);
  },

  recordMfaCompleted: async (_params: { vendor: string }): Promise<KycStep> => {
    const script = recordMfa(requireScript());
    setRuntime({ ...runtime, script });
    return currentStep(script);
  },

  submitTerms: async (_params: {
    vendor: string;
    country?: string;
    disclaimerIds?: string[];
  }): Promise<KycStep> => {
    const script = acceptTerms(requireScript());
    setRuntime({ ...runtime, script });
    return currentStep(script);
  },

  startSession: async (_params: {
    vendor: string;
    aal2Token?: string;
    email?: string;
    intentOpen?: boolean;
  }): Promise<KycStep> => {
    const script = openSession(requireScript());
    setRuntime({ ...runtime, script });
    return currentStep(script);
  },

  sendEmailOtp: async (_params: {
    vendor: string;
    email?: string;
  }): Promise<KycStep> => {
    const script = resendEmailCode(requireScript());
    setRuntime({ ...runtime, script });
    return currentStep(script);
  },

  verifyEmailOtp: async (params: {
    vendor: string;
    code: string;
  }): Promise<KycStep> => {
    const script = checkEmailCode(requireScript(), params.code);
    setRuntime({ ...runtime, script });
    if (script.refusedCode) {
      throw prototypeCodeError();
    }
    return currentStep(script);
  },

  sendPhoneOtp: async (_params: {
    vendor: string;
    phoneNumber?: string;
  }): Promise<KycStep> => {
    const script = sendPhone(requireScript());
    setRuntime({ ...runtime, script });
    return currentStep(script);
  },

  verifyPhoneOtp: async (params: {
    vendor: string;
    code: string;
  }): Promise<KycStep> => {
    const script = checkPhoneCode(requireScript(), params.code);
    setRuntime({ ...runtime, script });
    if (script.refusedCode) {
      throw prototypeCodeError();
    }
    return currentStep(script);
  },

  /** Opens the Sumsub presentation; the promise settles when it is left. */
  launchProviderFlow: (_params?: {
    vendor: string;
    locale?: string;
    debug?: boolean;
  }): Promise<'submitted' | 'abandoned'> => {
    requireScript();
    setRuntime({ ...runtime, sumsubOpen: true });
    return new Promise((resolve) => {
      pendingSumsubLaunch = resolve;
    });
  },
});

/** The fake `KycService` calls the terms screens make. */
export const getKalshiPrototypeKycService = () => ({
  getGeoCountry: async () => prototypeGeoCountry,
  fetchSessionDisclaimersByCountry: async (_params: { country: string }) =>
    prototypeSessionCatalog(requireScript()),
  fetchVendorDisclaimers: async (_params: {
    vendor: string;
    country: string;
  }) => prototypeVendorDisclaimers(),
});
