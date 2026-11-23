import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { selectMfaRecoveryEnabled } from '../../../selectors/featureFlagController/mfaRecovery';
import { isMfaDevBuild } from '../../../util/identity/mfa';
import { verifyOrEnroll } from '../../../util/identity/mfa/useMfa';
import type {
  MfaMethod,
  MfaReason,
} from '../../../util/identity/mfa/engine/types';
import {
  removePasskeyFromRecovery,
  syncRecoveryAfterEnroll,
} from '../../../core/MfaRecovery/syncRecoveryIdentifiers';
import { strings } from '../../../../locales/i18n';
import SocialLinkEmailBottomSheet from '../shared/SocialLinkEmailBottomSheet';
import RecoverySetupProgressBottomSheet from '../shared/RecoverySetupProgressBottomSheet';

type RecoverySyncPhase = 'idle' | 'running' | 'hidden' | 'linking';
type RecoveryProgressCopy = 'setup' | 'update';

// iOS drops a modal presented while another one is still being dismissed.
const MODAL_SETTLE_MS = 300;

const waitForModalsToSettle = async (): Promise<void> =>
  Platform.OS === 'ios'
    ? new Promise<void>((resolve) => setTimeout(resolve, MODAL_SETTLE_MS))
    : Promise.resolve();

interface RecoverySync {
  /** Runs recovery sync for a newly enrolled method; rejects on failure. */
  syncRecovery: (method: MfaMethod, reason: MfaReason) => Promise<void>;
  /**
   * Removes a passkey from recovery before it is removed from Auth; rejects on
   * failure, and the passkey must then be kept.
   */
  removeRecoveryPasskey: (
    credentialId: string,
    verifyMfa: () => Promise<unknown>,
  ) => Promise<void>;
  /** The progress and social link sheets; render them in the screen. */
  recoverySheets: ReactNode;
}

/**
 * Keeps passwordless recovery in step with enrolled and removed methods, behind
 * a progress sheet. The sheet steps aside while the user verifies or, in dev
 * builds, picks the social link email.
 */
const useRecoverySync = (): RecoverySync => {
  const isMfaRecoveryEnabled = useSelector(selectMfaRecoveryEnabled);
  const [phase, setPhase] = useState<RecoverySyncPhase>('idle');
  const [progressCopy, setProgressCopy] =
    useState<RecoveryProgressCopy>('setup');
  const isMounted = useRef(true);
  const pendingResolve = useRef<((email?: string) => void) | undefined>(
    undefined,
  );

  useEffect(() => {
    isMounted.current = true;
    return (): void => {
      isMounted.current = false;
      pendingResolve.current?.(undefined);
      pendingResolve.current = undefined;
    };
  }, []);

  const showPhase = useCallback((next: RecoverySyncPhase) => {
    if (isMounted.current) {
      setPhase(next);
    }
  }, []);

  const startProgress = useCallback(
    (copy: RecoveryProgressCopy) => {
      if (isMounted.current) {
        setProgressCopy(copy);
      }
      showPhase('running');
    },
    [showPhase],
  );

  const stepAsideWhile = useCallback(
    <Result,>(fn: () => Promise<Result>) =>
      async (): Promise<Result> => {
        showPhase('hidden');
        try {
          await waitForModalsToSettle();
          return await fn();
        } finally {
          showPhase('hidden');
          await waitForModalsToSettle();
          showPhase('running');
        }
      },
    [showPhase],
  );

  const askSocialLinkEmail = useCallback(async (): Promise<
    string | undefined
  > => {
    if (!isMounted.current) {
      return undefined;
    }
    showPhase('linking');
    return new Promise<string | undefined>((resolve) => {
      pendingResolve.current = resolve;
    });
  }, [showPhase]);

  const closeSocialLinkPrompt = useCallback((email?: string) => {
    pendingResolve.current?.(email);
    pendingResolve.current = undefined;
  }, []);

  const syncRecovery = useCallback(
    async (method: MfaMethod, reason: MfaReason): Promise<void> => {
      if (!isMfaRecoveryEnabled) {
        return;
      }
      startProgress('setup');
      try {
        await syncRecoveryAfterEnroll(method, {
          verifyMfa: stepAsideWhile(async () => {
            await verifyOrEnroll({
              methods: [method],
              verifyWith: [method],
              reason,
            });
          }),
          getSocialLinkEmail: isMfaDevBuild()
            ? stepAsideWhile(askSocialLinkEmail)
            : undefined,
        });
      } finally {
        showPhase('idle');
      }
    },
    [
      askSocialLinkEmail,
      isMfaRecoveryEnabled,
      showPhase,
      startProgress,
      stepAsideWhile,
    ],
  );

  const removeRecoveryPasskey = useCallback(
    async (
      credentialId: string,
      verifyMfa: () => Promise<unknown>,
    ): Promise<void> => {
      if (!isMfaRecoveryEnabled) {
        return;
      }
      startProgress('update');
      try {
        await removePasskeyFromRecovery(credentialId, {
          verifyMfa: stepAsideWhile(async () => {
            await verifyMfa();
          }),
        });
      } finally {
        showPhase('idle');
      }
    },
    [isMfaRecoveryEnabled, showPhase, startProgress, stepAsideWhile],
  );

  let recoverySheets: ReactNode = null;
  if (phase === 'running') {
    recoverySheets = (
      <RecoverySetupProgressBottomSheet
        title={
          progressCopy === 'update'
            ? strings('mfa.settings.recovery_update_in_progress_title')
            : undefined
        }
      />
    );
  } else if (phase === 'linking') {
    recoverySheets = (
      <SocialLinkEmailBottomSheet
        onSubmit={closeSocialLinkPrompt}
        onClose={() => closeSocialLinkPrompt(undefined)}
      />
    );
  }

  return { syncRecovery, removeRecoveryPasskey, recoverySheets };
};

export default useRecoverySync;
