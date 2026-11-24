// PROTOTYPE-DO-NOT-MERGE
import type { KycStep } from '@metamask/kyc-controller';
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
}

const IDLE: PrototypeRuntimeState = {
  active: false,
  scenario: null,
  script: null,
  sumsubOpen: false,
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
