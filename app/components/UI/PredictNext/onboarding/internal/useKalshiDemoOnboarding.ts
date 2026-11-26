import { useEffect, useReducer, useRef, useState, type Dispatch } from 'react';
import { AppState } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

import Logger from '../../../../../util/Logger';
import type { KalshiOnboardingClient } from '../../adapters/remote/KalshiOnboardingClient';
import type { AccountSetupIntent } from '../accountReadiness.types';
import type { KalshiWalletNetwork } from './demoOnboardingConfig';
import type {
  KalshiOnboardingState,
  KalshiOnboardingStatus,
} from '../../contracts/v1/onboarding';
import {
  describeOnboardingFailure,
  initialOnboardingState,
  onboardingReducer,
  type OnboardingEvent,
  type OnboardingFailure,
  type OnboardingViewState,
} from './kalshiDemoOnboardingMachine';

/** Poll budget after demo KYC returns `kyc_pending`. */
export const KYC_PENDING_POLL_LIMIT_MS = 60_000;
/** Poll budget for Kalshi to move the intent off `link_pending` after verify. */
export const LINK_VERIFY_POLL_LIMIT_MS = 60_000;
/** Poll budget for an intent already in `kyc_review`. */
export const KYC_REVIEW_POLL_LIMIT_MS = 120_000;
/** Poll budget for Kalshi to move the intent off `approved` after activate. */
export const ACTIVATE_POLL_LIMIT_MS = 60_000;

export type KalshiOnboardingApi = Pick<
  KalshiOnboardingClient,
  | 'getStatus'
  | 'createIntent'
  | 'submitEmail'
  | 'verifyCode'
  | 'runDemoKyc'
  | 'activate'
>;

export interface UseKalshiDemoOnboardingOptions {
  client: KalshiOnboardingApi;
  /** The withdrawal address shown on the wallet step. */
  walletAddress?: string;
  network: KalshiWalletNetwork;
  pollIntervalMs: number;
  /** False while the device has no usable network. Unknown stays true. */
  canPoll?: () => boolean;
  /** Called when the flow observes activation after it was open. */
  onActivated?: () => void;
  /** What the opening card asked for. Every intent reads status first. */
  initialIntent?: AccountSetupIntent;
  /** Publishes every status the flow reads or writes. */
  onStatus?: (state: KalshiOnboardingState) => void;
  /** Publishes classified failures to the surrounding readiness projection. */
  onFailure?: (failure: OnboardingFailure) => void;
  /** Called after the sheet is dismissed, once the flow is cancelled. */
  onClose?: () => void;
  newKey?: () => string;
  now?: () => number;
}

export interface KalshiDemoOnboardingActions {
  start: () => void;
  submitEmail: (email: string) => void;
  verifyCode: (code: string) => void;
  resendCode: () => void;
  activate: () => void;
  retry: () => void;
  dismiss: () => void;
  cancel: () => void;
}

export type KalshiOnboardingController = KalshiDemoOnboardingActions & {
  pause: () => void;
  resume: () => void;
};

export type KalshiDemoOnboarding = Omit<
  KalshiDemoOnboardingActions,
  'start' | 'cancel'
> & { state: OnboardingViewState };

type Inputs = Omit<
  Required<UseKalshiDemoOnboardingOptions>,
  | 'walletAddress'
  | 'canPoll'
  | 'onActivated'
  | 'onStatus'
  | 'onFailure'
  | 'onClose'
> &
  Pick<
    UseKalshiDemoOnboardingOptions,
    | 'walletAddress'
    | 'canPoll'
    | 'onActivated'
    | 'onStatus'
    | 'onFailure'
    | 'onClose'
  >;

class Cancelled extends Error {}

/** The flow stopped reading because it was dismissed or backgrounded. */
class Paused extends Error {}

/**
 * Stable actions over the latest inputs. Exported for the reducer-level
 * tests. Components use `useKalshiDemoOnboarding`.
 */
export const createOnboardingController = (
  inputs: () => Inputs,
  dispatch: Dispatch<OnboardingEvent>,
): KalshiOnboardingController => {
  let generation = 0;
  let paused = false;
  let needsResumeRead = false;
  let pollActive = false;
  let activeActions = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const waiters = new Map<ReturnType<typeof setTimeout>, () => void>();
  const reads = new Set<AbortController>();
  let lastEmail: string | undefined;
  let lastAction: (() => Promise<void>) | undefined;

  const guard = () => {
    const gen = generation;
    return () => {
      if (gen !== generation) {
        throw new Cancelled();
      }
    };
  };

  // ES2022 has no Promise.withResolvers, so the executor form is required.
  const wait = async (ms: number) =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        waiters.delete(timer);
        resolve();
      }, ms);
      timers.add(timer);
      waiters.set(timer, resolve);
    });

  const abortReads = () => {
    for (const controller of reads) {
      controller.abort();
    }
    reads.clear();
  };

  const clearTimers = () => {
    for (const [timer, resolve] of waiters) {
      clearTimeout(timer);
      resolve();
    }
    waiters.clear();
    timers.clear();
  };

  /** One status GET. The signal lets pause/dismiss abort it immediately. */
  const readServerStatus = async (): Promise<KalshiOnboardingStatus> => {
    const controller = new AbortController();
    reads.add(controller);
    try {
      const status = await inputs().client.getStatus({
        signal: controller.signal,
      });
      if (paused) {
        throw new Paused();
      }
      return status;
    } catch (error) {
      if (paused || (error instanceof Error && error.name === 'AbortError')) {
        throw new Paused();
      }
      throw error;
    } finally {
      reads.delete(controller);
    }
  };

  const poll = async (
    limitMs: number,
    pending: KalshiOnboardingState[] = ['kyc_pending', 'kyc_review'],
  ): Promise<void> => {
    const check = guard();
    pollActive = true;
    try {
      const deadline = inputs().now() + limitMs;
      while (inputs().now() < deadline) {
        await wait(inputs().pollIntervalMs);
        check();
        if (paused) {
          throw new Paused();
        }
        const { canPoll } = inputs();
        if (canPoll && !canPoll()) {
          throw new Error('Kalshi onboarding poll paused: no network');
        }
        if (AppState.currentState !== 'active') {
          continue;
        }
        const status = await readServerStatus();
        check();
        inputs().onStatus?.(status.state);
        Logger.log('PredictNext: Kalshi onboarding poll', {
          state: status.state,
          intentStatus: status.intentStatus,
          waitingFor: pending,
          remainingMs: deadline - inputs().now(),
        });
        if (!pending.includes(status.state)) {
          await route(status.state, false);
          return;
        }
      }
      Logger.log('PredictNext: Kalshi onboarding poll timed out', {
        limitMs,
        waitingFor: pending,
      });
      dispatch({ type: 'review_timed_out' });
    } finally {
      pollActive = false;
      if (paused) {
        needsResumeRead = true;
      }
    }
  };

  async function route(
    serverState: KalshiOnboardingState,
    initial: boolean,
    allowWrites = true,
  ): Promise<void> {
    const check = guard();
    dispatch({ type: 'status', state: serverState, initial });
    if (serverState === 'kyc_pending') {
      if (!allowWrites) {
        return;
      }
      const result = await inputs().client.runDemoKyc();
      check();
      inputs().onStatus?.(result.state);
      if (result.state === 'kyc_pending' || result.state === 'kyc_review') {
        await poll(KYC_PENDING_POLL_LIMIT_MS);
        return;
      }
      await route(result.state, false);
      return;
    }
    if (serverState === 'kyc_review') {
      await poll(KYC_REVIEW_POLL_LIMIT_MS);
      return;
    }
    if (serverState === 'active' && !initial) {
      inputs().onActivated?.();
    }
  }

  /**
   * Kalshi can lag behind a successful verify. Once the code is accepted we
   * know the link is going through, so show progress and keep checking
   * instead of sending the user back to the email step.
   */
  const readStatusAfterVerify = async () => {
    const check = guard();
    dispatch({ type: 'verifying' });
    const status = await readServerStatus();
    check();
    inputs().onStatus?.(status.state);
    Logger.log('PredictNext: Kalshi onboarding status after verify', {
      state: status.state,
      intentStatus: status.intentStatus,
    });
    if (status.state !== 'link_pending') {
      await route(status.state, false);
      return;
    }
    await poll(LINK_VERIFY_POLL_LIMIT_MS, ['link_pending']);
  };

  const readStatus = async (
    initial: boolean,
    allowWrites = true,
    intent: AccountSetupIntent = 'resume',
  ) => {
    const check = guard();
    const status = await readServerStatus();
    check();
    inputs().onStatus?.(status.state);
    // A restart always begins a fresh enrollment. Any authoritative state
    // still wins, so an account that is already through keeps its route.
    const next =
      intent === 'restart' && status.state === 'kyc_pending'
        ? 'none'
        : status.state;
    await route(next, initial, allowWrites);
  };

  const perform = (action: () => Promise<void>) => {
    const gen = generation;
    lastAction = action;
    activeActions += 1;
    dispatch({ type: 'busy' });
    action()
      .catch((error: unknown) => {
        if (
          error instanceof Cancelled ||
          error instanceof Paused ||
          gen !== generation
        ) {
          return;
        }
        const failure = describeOnboardingFailure(error);
        if (failure.report) {
          Logger.error(
            new Error(`Kalshi demo onboarding failed: ${failure.report}`),
            'PredictNext: Kalshi demo onboarding failed',
          );
        }
        if (failure.next === 'email' || failure.next === 'status') {
          lastAction = undefined;
        }
        inputs().onFailure?.(failure);
        dispatch({ type: 'failed', failure });
      })
      .finally(() => {
        activeActions -= 1;
      });
  };

  const cancel = () => {
    generation += 1;
    clearTimers();
    abortReads();
    needsResumeRead = false;
    lastEmail = undefined;
    lastAction = undefined;
  };

  const pause = () => {
    if (paused) {
      return;
    }
    paused = true;
    generation += 1;
    if (reads.size > 0 || pollActive || activeActions > 0) {
      needsResumeRead = true;
    }
    clearTimers();
    abortReads();
  };

  const resume = () => {
    if (!paused) {
      return;
    }
    paused = false;
    const shouldRead = needsResumeRead;
    needsResumeRead = false;
    // Foreground only re-reads status; it never replays createIntent,
    // verifyCode, runDemoKyc or activate.
    if (shouldRead) {
      perform(async () => readStatus(false, false));
    }
  };

  return {
    start: () => {
      dispatch({ type: 'started' });
      const intent = inputs().initialIntent ?? 'resume';
      // Retry follows the server route but never performs a setup write.
      perform(async () => readStatus(true, intent !== 'retry', intent));
    },
    submitEmail: (email) => {
      const trimmed = email.trim();
      const intentKey = inputs().newKey();
      const linkKey = inputs().newKey();
      lastEmail = trimmed;
      perform(async () => {
        const check = guard();
        await inputs().client.createIntent(intentKey);
        check();
        await inputs().client.submitEmail(trimmed, linkKey);
        check();
        dispatch({ type: 'link_sent' });
      });
    },
    resendCode: () => {
      const email = lastEmail;
      if (!email) {
        perform(async () => readStatus(false));
        return;
      }
      const linkKey = inputs().newKey();
      perform(async () => {
        const check = guard();
        await inputs().client.submitEmail(email, linkKey);
        check();
        dispatch({ type: 'link_sent' });
      });
    },
    verifyCode: (code) => {
      const trimmed = code.trim();
      const key = inputs().newKey();
      perform(async () => {
        const check = guard();
        const result = await inputs().client.verifyCode(trimmed, key);
        check();
        // Kalshi wants the account's second factor next. Ask for it and send
        // it to this same action; the link is not through yet.
        if (!result.verified && result.mfa) {
          dispatch({ type: 'mfa_required', mfa: result.mfa });
          return;
        }
        await readStatusAfterVerify();
      });
    },
    activate: () => {
      const { walletAddress, network } = inputs();
      const key = inputs().newKey();
      if (!walletAddress) {
        return;
      }
      perform(async () => {
        const check = guard();
        await inputs().client.activate(walletAddress, network, key);
        check();
        // Kalshi can lag behind a successful wallet register. One re-read
        // can drop the user back on the wallet step while the register went
        // through, and a second activate mints a new idempotency key that
        // conflicts. Poll through the lag instead, as verify does.
        await poll(ACTIVATE_POLL_LIMIT_MS, ['approved']);
      });
    },
    retry: () => {
      perform(lastAction ?? (async () => readStatus(false)));
    },
    dismiss: () => {
      cancel();
      dispatch({ type: 'dismissed' });
      inputs().onClose?.();
    },
    cancel,
    pause,
    resume,
  };
};

/**
 * The demo onboarding state machine (mobile plan §3). Flow state, the typed
 * email, and the idempotency keys live in this hook only and are dropped on
 * unmount or dismiss. Every mount resumes from the server status. Reads abort
 * when the app backgrounds; returning re-reads status without replaying writes.
 */
export const useKalshiDemoOnboarding = ({
  newKey = uuidv4,
  now = Date.now,
  initialIntent = 'resume',
  ...options
}: UseKalshiDemoOnboardingOptions): KalshiDemoOnboarding => {
  const [state, dispatch] = useReducer(
    onboardingReducer,
    initialOnboardingState,
  );
  const latest = useRef<Inputs>({ ...options, initialIntent, newKey, now });
  latest.current = { ...options, initialIntent, newKey, now };
  const [controller] = useState(() =>
    createOnboardingController(() => latest.current, dispatch),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        controller.resume();
      } else {
        controller.pause();
      }
    });
    controller.start();
    return () => {
      subscription.remove();
      controller.cancel();
    };
  }, [controller]);

  return {
    state,
    submitEmail: controller.submitEmail,
    verifyCode: controller.verifyCode,
    resendCode: controller.resendCode,
    activate: controller.activate,
    retry: controller.retry,
    dismiss: controller.dismiss,
  };
};
