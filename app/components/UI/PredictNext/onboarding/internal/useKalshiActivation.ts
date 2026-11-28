import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';
import type { KalshiOnboardingClient } from '../../adapters/remote/KalshiOnboardingClient';
import type { KalshiOnboardingState } from '../../contracts/v1/onboarding';
import {
  describeOnboardingFailure,
  type OnboardingFailure,
  type OnboardingMessage,
} from './kalshiDemoOnboardingMachine';

/** Poll budget for Kalshi to move off `approved` after wallet registration. */
export const ACTIVATION_POLL_LIMIT_MS = 60_000;

export type KalshiActivationApi = Pick<
  KalshiOnboardingClient,
  'getStatus' | 'activate' | 'getIdentity'
>;

interface RegisterAttempt {
  /** The key of a register that may already be on the wire. */
  key?: string;
  accepted: boolean;
}

/**
 * Outlives the screen. Home unmounts on navigation and lock while the
 * register may still be landing, so a fresh mount must neither mint a second
 * key nor offer the write again. Keyed by the device identity the A2T is
 * issued to, which wallet reset deletes, and the register target.
 */
const registerAttempts = new Map<string, RegisterAttempt>();

const attemptKey = (
  identity: string,
  walletAddress: string,
  network: string,
): string => `${identity}:${network}:${walletAddress.toLowerCase()}`;

/**
 * What the user can do after a failure. `none` means the failure is final for
 * this visit: the sheet only offers Close / Not now.
 */
export type KalshiActivationAction = 'activate' | 'checkAgain' | 'none';

export interface KalshiActivationFailure {
  message: OnboardingMessage;
  action: KalshiActivationAction;
  cooldownSec?: number;
}

export interface KalshiActivation {
  /** Last server state, or `undefined` before the first read. */
  status?: KalshiOnboardingState;
  /** KYC is approved and the withdrawal address is not registered yet. */
  requiresActivation: boolean;
  /** The register landed and Kalshi confirmed `active` this visit. */
  completed: boolean;
  /**
   * Kalshi accepted the register but has not confirmed `active` yet. Survives
   * `dismiss`, so the next attempt re-reads status instead of writing again.
   */
  registerAccepted: boolean;
  busy: boolean;
  failure?: KalshiActivationFailure;
  /** Reads status without a write. The trigger decides when to refresh. */
  refresh: () => void;
  /** Registers the withdrawal address, then waits for `active`. */
  activate: () => void;
  /** Re-reads status after a register that the client could not confirm. */
  checkAgain: () => void;
  /** Cancels polling and closes the terminal sheet. */
  dismiss: () => void;
}

export interface UseKalshiActivationOptions {
  client?: KalshiActivationApi;
  /** Only read status and activate while the KYC flow says approved. */
  enabled: boolean;
  walletAddress?: string;
  network: string;
  pollIntervalMs: number;
  canPoll?: () => boolean;
  onActivated: () => void;
  now?: () => number;
  newKey?: () => string;
}

const toActivationFailure = (
  failure: OnboardingFailure,
): KalshiActivationFailure => {
  let action: KalshiActivationAction;
  switch (failure.next) {
    case 'status':
      action = 'checkAgain';
      break;
    case 'close':
    case 'email':
      // Activation cannot restart the KYC flow; the prompt agrees with the
      // KYC banner on what happens next.
      action = 'none';
      break;
    case 'stay':
    case 'retry':
    default:
      action = 'activate';
  }
  return {
    message: failure.message,
    action,
    cooldownSec: failure.cooldownSec,
  };
};

/**
 * The last step of the Kalshi demo onboarding, separated from the trigger
 * that opens it. Home currently opens the sheet automatically; a future card
 * can use this hook and `KalshiActivationModal` while changing only its own
 * trigger.
 *
 * The register is idempotent through one key per attempt. Once Kalshi accepts
 * it, a retry only re-reads status: minting a second key would conflict with
 * the register that may already have landed. The attempt, pending or accepted,
 * is remembered across unmounts by the A2T device identity and the register
 * target, so leaving and re-entering Home cannot write twice.
 */
export const useKalshiActivation = (
  options: UseKalshiActivationOptions,
): KalshiActivation => {
  const { enabled } = options;
  const [status, setStatus] = useState<KalshiOnboardingState>();
  const [completed, setCompleted] = useState(false);
  const [registerAccepted, setRegisterAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<KalshiActivationFailure>();

  const latest = useRef(options);
  latest.current = options;

  const statusRef = useRef<KalshiOnboardingState | undefined>(undefined);
  const keyRef = useRef<string | undefined>(undefined);
  const runRef = useRef(0);
  const busyRef = useRef(false);
  const pendingRead = useRef<Promise<KalshiOnboardingState | undefined> | null>(
    null,
  );
  const identityRef = useRef<string | undefined>(undefined);
  const identityFlight = useRef<Promise<string | undefined> | null>(null);

  useEffect(
    () => () => {
      // A late read or poll must not write into a dead screen.
      runRef.current += 1;
      busyRef.current = false;
    },
    [],
  );

  /** The A2T device identity, read once per enabled visit. */
  const resolveIdentity = useCallback(async (): Promise<string | undefined> => {
    if (identityRef.current) {
      return identityRef.current;
    }
    identityFlight.current ??= (async () => {
      const { client } = latest.current;
      if (!client) {
        return undefined;
      }
      try {
        const identity = await client.getIdentity();
        identityRef.current = identity;
        return identity;
      } catch (error) {
        Logger.error(
          ensureError(error, 'KalshiActivation.resolveIdentity'),
          'PredictNext: Kalshi activation identity read failed',
        );
        return undefined;
      }
    })().finally(() => {
      identityFlight.current = null;
    });
    return identityFlight.current;
  }, []);

  /** Records the attempt once the device identity is known. */
  const rememberAttempt = useCallback(
    (walletAddress: string, network: string, attempt: RegisterAttempt) => {
      void resolveIdentity().then((identity) => {
        if (identity) {
          registerAttempts.set(
            attemptKey(identity, walletAddress, network),
            attempt,
          );
        }
      });
    },
    [resolveIdentity],
  );

  /** The register landed or the account is active: nothing left to remember. */
  const forgetAttempt = useCallback(() => {
    const { walletAddress, network } = latest.current;
    if (!walletAddress) {
      return;
    }
    void resolveIdentity().then((identity) => {
      if (identity) {
        registerAttempts.delete(attemptKey(identity, walletAddress, network));
      }
    });
  }, [resolveIdentity]);

  const readStatus = useCallback(async (): Promise<
    KalshiOnboardingState | undefined
  > => {
    const { client, enabled: isEnabled } = latest.current;
    if (!client || !isEnabled) {
      return undefined;
    }
    if (pendingRead.current) {
      return pendingRead.current;
    }
    const run = runRef.current;
    const read = (async () => {
      try {
        const next = await client.getStatus();
        if (run !== runRef.current || !latest.current.enabled) {
          return undefined;
        }
        statusRef.current = next.state;
        setStatus(next.state);
        if (next.state === 'active') {
          forgetAttempt();
        }
        return next.state;
      } catch (error) {
        if (run !== runRef.current || !latest.current.enabled) {
          return undefined;
        }
        Logger.error(
          ensureError(error, 'KalshiActivation.readStatus'),
          'PredictNext: Kalshi activation status read failed',
        );
        // A failed read is not a state. Keep the last answer so the sheet and
        // its retry stay on screen instead of unmounting on a network blip.
        return undefined;
      }
    })().finally(() => {
      pendingRead.current = null;
    });
    pendingRead.current = read;
    return read;
  }, [forgetAttempt]);

  const refresh = useCallback(() => {
    if (busyRef.current) {
      return;
    }
    const previous = statusRef.current;
    void readStatus().then((next) => {
      if (next === 'active' && previous === 'approved') {
        latest.current.onActivated();
      }
    });
  }, [readStatus]);

  useEffect(() => {
    if (!enabled) {
      runRef.current += 1;
      statusRef.current = undefined;
      keyRef.current = undefined;
      busyRef.current = false;
      pendingRead.current = null;
      identityRef.current = undefined;
      identityFlight.current = null;
      setStatus(undefined);
      setCompleted(false);
      setRegisterAccepted(false);
      setFailure(undefined);
      setBusy(false);
    }
  }, [enabled]);

  // A fresh mount rebuilds the attempt the previous screen may have left.
  const {
    client: seedClient,
    walletAddress: seedWallet,
    network: seedNetwork,
  } = options;
  useEffect(() => {
    if (!enabled || !seedClient || !seedWallet) {
      return undefined;
    }
    let cancelled = false;
    void (async () => {
      const identity = await resolveIdentity();
      if (cancelled || !identity) {
        return;
      }
      const remembered = registerAttempts.get(
        attemptKey(identity, seedWallet, seedNetwork),
      );
      if (!remembered) {
        return;
      }
      setRegisterAccepted(remembered.accepted);
      keyRef.current ??= remembered.key;
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, resolveIdentity, seedClient, seedWallet, seedNetwork]);

  const wait = async (ms: number): Promise<void> => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  };

  const pollForActivation = useCallback(
    async (run: number): Promise<boolean> => {
      const deadline = latest.current.now?.() ?? Date.now();
      const limit = deadline + ACTIVATION_POLL_LIMIT_MS;
      const currentTime = () => latest.current.now?.() ?? Date.now();

      while (currentTime() < limit) {
        await wait(latest.current.pollIntervalMs);
        if (run !== runRef.current) {
          return false;
        }
        const { client, canPoll } = latest.current;
        if (!client) {
          return false;
        }
        if (canPoll && !canPoll()) {
          continue;
        }
        if (AppState.currentState !== 'active') {
          continue;
        }
        try {
          const next = await client.getStatus();
          if (run !== runRef.current) {
            return false;
          }
          statusRef.current = next.state;
          setStatus(next.state);
          Logger.log('PredictNext: Kalshi activation poll', {
            state: next.state,
          });
          if (next.state === 'active') {
            forgetAttempt();
            return true;
          }
          if (next.state !== 'approved') {
            setFailure({
              message:
                next.state === 'unsupported' || next.state === 'inconsistent'
                  ? 'unsupported'
                  : 'generic',
              action: 'checkAgain',
            });
            return false;
          }
        } catch (error) {
          if (run !== runRef.current) {
            return false;
          }
          Logger.error(
            ensureError(error, 'KalshiActivation.pollForActivation'),
            'PredictNext: Kalshi activation status poll failed',
          );
          // The register may have landed. Only a re-read is safe now.
          setFailure({ message: 'generic', action: 'checkAgain' });
          return false;
        }
      }
      return false;
    },
    [forgetAttempt],
  );

  const activate = useCallback(async () => {
    const {
      client,
      enabled: isEnabled,
      walletAddress,
      network,
      canPoll,
      newKey = uuidv4,
      onActivated: notifyActivated,
    } = latest.current;
    if (!client || !isEnabled || !walletAddress || busyRef.current) {
      return;
    }
    if (canPoll && !canPoll()) {
      setFailure({ message: 'generic', action: 'activate' });
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setFailure(undefined);
    const run = runRef.current;

    const identity = identityRef.current;
    const remembered = identity
      ? registerAttempts.get(attemptKey(identity, walletAddress, network))
      : undefined;
    if (remembered?.accepted) {
      // An earlier screen's register landed; only a re-read is safe.
      setRegisterAccepted(true);
      busyRef.current = false;
      setBusy(false);
      return;
    }
    keyRef.current ??= remembered?.key ?? newKey();
    const key = keyRef.current;
    rememberAttempt(walletAddress, network, { key, accepted: false });

    try {
      await client.activate(walletAddress, network, key);
    } catch (error) {
      if (run !== runRef.current) {
        return;
      }
      const registerFailure = describeOnboardingFailure(error);
      if (registerFailure.report) {
        Logger.error(
          new Error(`Kalshi demo onboarding failed: ${registerFailure.report}`),
          'PredictNext: Kalshi activation register failed',
        );
      }
      setFailure(toActivationFailure(registerFailure));
      busyRef.current = false;
      setBusy(false);
      return;
    }
    if (run !== runRef.current) {
      return;
    }

    // Kalshi accepted the register. Drop the key so no path can send a
    // second, conflicting register for this attempt, and remember the write
    // landed so a later visit only re-reads status.
    keyRef.current = undefined;
    setRegisterAccepted(true);
    rememberAttempt(walletAddress, network, { accepted: true });
    let active = false;
    try {
      active = await pollForActivation(run);
    } finally {
      if (run === runRef.current) {
        busyRef.current = false;
        setBusy(false);
      }
    }
    if (run !== runRef.current) {
      return;
    }
    if (active) {
      setFailure(undefined);
      setCompleted(true);
      notifyActivated();
      return;
    }
    setFailure(
      (current) =>
        current ?? { message: 'activation_timeout', action: 'checkAgain' },
    );
  }, [pollForActivation, rememberAttempt]);

  const checkAgain = useCallback(async () => {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setFailure(undefined);
    const run = runRef.current;
    try {
      const next = await readStatus();
      if (run !== runRef.current) {
        return;
      }
      if (next === 'active') {
        setCompleted(true);
        latest.current.onActivated();
        return;
      }
      if (next === 'approved' || next === undefined) {
        setFailure({
          message: next === undefined ? 'generic' : 'activation_timeout',
          action: 'checkAgain',
        });
      }
      // Any other state means KYC or the venue owns the next step, so
      // `requiresActivation` turns false and the sheet closes.
    } finally {
      if (run === runRef.current) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }, [readStatus]);

  const dismiss = useCallback(() => {
    // Stop the poll: the register may already be on the wire, so a later visit
    // re-reads status instead of waiting here. The key and the accepted flag
    // stay for the same reason: a retry must not become a second write.
    runRef.current += 1;
    pendingRead.current = null;
    busyRef.current = false;
    setBusy(false);
    setFailure(undefined);
    setCompleted(false);
  }, []);

  return {
    status,
    requiresActivation: enabled && status === 'approved',
    completed,
    registerAccepted,
    busy,
    failure,
    refresh,
    activate: () => {
      void activate();
    },
    checkAgain: () => {
      void checkAgain();
    },
    dismiss,
  };
};
