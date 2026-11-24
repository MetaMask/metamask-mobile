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
import { useMfa } from '../../../util/identity/mfa';
import { mobileMfaControllerAdapter } from '../../../util/identity/mfa/bindings';
import type {
  MfaMethod,
  MfaReason,
} from '../../../util/identity/mfa/engine/types';
import { isMfaDevRecoveryBuild } from '../../../core/MfaRecovery/isMfaDevRecoveryBuild';
import {
  removePasskeyFromRecovery,
  syncRecoveryAfterEnroll,
} from '../../../core/MfaRecovery/syncRecoveryIdentifiers';
import Logger from '../../../util/Logger';
import { strings } from '../../../../locales/i18n';
import RecoverySetupProgressBottomSheet from '../shared/RecoverySetupProgressBottomSheet';
import SocialLinkEmailBottomSheet from './SocialLinkEmailBottomSheet';

type RecoverySyncPhase = 'idle' | 'running' | 'hidden' | 'linking';
type RecoveryProgressCopy = 'setup' | 'update';

// iOS drops a modal presented while another one is still being dismissed.
const MODAL_SETTLE_MS = 300;

const waitForModalsToSettle = async (): Promise<void> =>
  Platform.OS === 'ios'
    ? new Promise<void>((resolve) => setTimeout(resolve, MODAL_SETTLE_MS))
    : Promise.resolve();

interface RecoverySync {
  /** Runs best-effort recovery sync for a newly enrolled method; logs failures. */
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
  const { verifyOrEnroll } = useMfa();
  const [phase, setPhase] = useState<RecoverySyncPhase>('idle');
  const [progressCopy, setProgressCopy] =
    useState<RecoveryProgressCopy>('setup');
  const isMounted = useRef(true);
  const pendingShowTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const pendingResolve = useRef<((email?: string) => void) | undefined>(
    undefined,
  );

  const clearPendingShow = useCallback(() => {
    if (pendingShowTimer.current !== undefined) {
      clearTimeout(pendingShowTimer.current);
      pendingShowTimer.current = undefined;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return (): void => {
      isMounted.current = false;
      clearPendingShow();
      pendingResolve.current?.(undefined);
      pendingResolve.current = undefined;
    };
  }, [clearPendingShow]);

  const showPhase = useCallback(
    (next: RecoverySyncPhase) => {
      clearPendingShow();
      if (isMounted.current) {
        setPhase(next);
      }
    },
    [clearPendingShow],
  );

  const startProgress = useCallback(
    (copy: RecoveryProgressCopy) => {
      clearPendingShow();
      if (isMounted.current) {
        setProgressCopy(copy);
      }
      if (Platform.OS === 'ios') {
        // The MFA flow modal that just finished may still be dismissing;
        // presenting our Modal immediately causes UIKit to drop it.
        pendingShowTimer.current = setTimeout(() => {
          pendingShowTimer.current = undefined;
          if (isMounted.current) {
            setPhase('running');
          }
        }, MODAL_SETTLE_MS);
      } else {
        showPhase('running');
      }
    },
    [clearPendingShow, showPhase],
  );

  const stepAsideWhile = useCallback(
    <Result,>(fn: () => Promise<Result>) =>
      async (): Promise<Result> => {
        showPhase('hidden');
        await waitForModalsToSettle();
        try {
          const result = await fn();
          showPhase('hidden');
          await waitForModalsToSettle();
          showPhase('running');
          return result;
        } catch (error) {
          showPhase('hidden');
          throw error;
        }
      },
    [showPhase],
  );

  const verifyIfNeeded = useCallback(
    (verify: () => Promise<unknown>) => async (): Promise<void> => {
      if (await mobileMfaControllerAdapter.getVerificationToken()) {
        return;
      }
      await stepAsideWhile(verify)();
    },
    [stepAsideWhile],
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
          verifyMfa: verifyIfNeeded(async () => {
            await verifyOrEnroll({
              methods: [method],
              verifyWith: [method],
              reason,
            });
          }),
          getSocialLinkEmail: isMfaDevRecoveryBuild()
            ? stepAsideWhile(askSocialLinkEmail)
            : undefined,
        });
      } catch (error) {
        Logger.error(
          error instanceof Error ? error : new Error('Recovery sync failed'),
          { tags: { feature: 'mfa', operation: reason.operation } },
        );
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
      verifyIfNeeded,
      verifyOrEnroll,
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
          verifyMfa: verifyIfNeeded(verifyMfa),
        });
      } finally {
        showPhase('idle');
      }
    },
    [isMfaRecoveryEnabled, showPhase, startProgress, verifyIfNeeded],
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
        onClose={() => closeSocialLinkPrompt()}
      />
    );
  }

  return { syncRecovery, removeRecoveryPasskey, recoverySheets };
};

export default useRecoverySync;
