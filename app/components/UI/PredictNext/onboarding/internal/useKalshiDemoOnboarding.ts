import { useEffect, useReducer, useRef, useState, type Dispatch } from 'react';
import { AppState } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

import Logger from '../../../../../util/Logger';
import type { KalshiOnboardingClient } from '../../adapters/remote/KalshiOnboardingClient';
import type { KalshiWalletNetwork } from '../../auth/signing/kalshiOnboardingTemplates';
import type { KalshiOnboardingState } from '../../contracts/v1/onboarding';
import {
  describeOnboardingFailure,
  initialOnboardingState,
  onboardingReducer,
  type OnboardingEvent,
  type OnboardingViewState,
} from './kalshiDemoOnboardingMachine';

/** Poll budget after demo KYC returns `kyc_pending`. */
export const KYC_PENDING_POLL_LIMIT_MS = 60_000;
/** Poll budget for Kalshi to move the intent off `link_pending` after verify. */
export const LINK_VERIFY_POLL_LIMIT_MS = 60_000;
/** Poll budget for an intent already in `kyc_review`. */
export const KYC_REVIEW_POLL_LIMIT_MS = 120_000;

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
  onActivated: () => void;
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

export type KalshiDemoOnboarding = Omit<
  KalshiDemoOnboardingActions,
  'start' | 'cancel'
> & { state: OnboardingViewState };

type Inputs = Omit<
  Required<UseKalshiDemoOnboardingOptions>,
  'walletAddress' | 'canPoll'
> &
  Pick<UseKalshiDemoOnboardingOptions, 'walletAddress' | 'canPoll'>;

class Cancelled extends Error {}

/**
 * Stable actions over the latest inputs. Exported for the reducer-level
 * tests. Components use `useKalshiDemoOnboarding`.
 */
export const createOnboardingController = (
  inputs: () => Inputs,
  dispatch: Dispatch<OnboardingEvent>,
): KalshiDemoOnboardingActions => {
  let generation = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();
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

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        resolve();
      }, ms);
      timers.add(timer);
    });

  const poll = async (
    limitMs: number,
    pending: KalshiOnboardingState[] = ['kyc_pending', 'kyc_review'],
  ): Promise<void> => {
    const check = guard();
    const deadline = inputs().now() + limitMs;
    while (inputs().now() < deadline) {
      await wait(inputs().pollIntervalMs);
      check();
      if (inputs().canPoll && !inputs().canPoll()) {
        throw new Error('Kalshi onboarding poll paused: no network');
      }
      if (AppState.currentState !== 'active') {
        continue;
      }
      const status = await inputs().client.getStatus();
      check();
      if (!pending.includes(status.state)) {
        await route(status.state, false);
        return;
      }
    }
    dispatch({ type: 'review_timed_out' });
  };

  async function route(
    serverState: KalshiOnboardingState,
    initial: boolean,
  ): Promise<void> {
    const check = guard();
    dispatch({ type: 'status', state: serverState, initial });
    if (serverState === 'kyc_pending') {
      const result = await inputs().client.runDemoKyc();
      check();
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
      inputs().onActivated();
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
    const status = await inputs().client.getStatus();
    check();
    if (status.state !== 'link_pending') {
      await route(status.state, false);
      return;
    }
    await poll(LINK_VERIFY_POLL_LIMIT_MS, ['link_pending']);
  };

  const readStatus = async (initial: boolean) => {
    const check = guard();
    const status = await inputs().client.getStatus();
    check();
    await route(status.state, initial);
  };

  const perform = (action: () => Promise<void>) => {
    const gen = generation;
    lastAction = action;
    dispatch({ type: 'busy' });
    action().catch((error: unknown) => {
      if (error instanceof Cancelled || gen !== generation) {
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
      dispatch({ type: 'failed', failure });
    });
  };

  const cancel = () => {
    generation += 1;
    for (const timer of timers) {
      clearTimeout(timer);
    }
    timers.clear();
    lastEmail = undefined;
    lastAction = undefined;
  };

  return {
    start: () => {
      dispatch({ type: 'started' });
      perform(() => readStatus(true));
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
        perform(() => readStatus(false));
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
        await inputs().client.verifyCode(trimmed, key);
        check();
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
        await readStatus(false);
      });
    },
    retry: () => {
      perform(lastAction ?? (() => readStatus(false)));
    },
    dismiss: () => {
      cancel();
      dispatch({ type: 'dismissed' });
    },
    cancel,
  };
};

/**
 * The demo onboarding state machine (mobile plan §3). Flow state, the typed
 * email, and the idempotency keys live in this hook only and are dropped on
 * unmount or dismiss. Every mount resumes from the server status.
 */
export const useKalshiDemoOnboarding = ({
  newKey = uuidv4,
  now = Date.now,
  ...options
}: UseKalshiDemoOnboardingOptions): KalshiDemoOnboarding => {
  const [state, dispatch] = useReducer(
    onboardingReducer,
    initialOnboardingState,
  );
  const latest = useRef<Inputs>({ ...options, newKey, now });
  latest.current = { ...options, newKey, now };
  const [controller] = useState(() =>
    createOnboardingController(() => latest.current, dispatch),
  );

  useEffect(() => {
    controller.start();
    return controller.cancel;
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
