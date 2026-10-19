import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { isMfaKitEnabled, useMfa } from '../../../../util/identity/mfa';
import type { MfaMethod } from '../../../../util/identity/mfa/engine/types';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import { selectMoneyEnableMfaFlag } from '../selectors/featureFlags';
import { moneyMfaStore } from './moneyMfaStore';
import { createMfaMoneyAccount } from './createMfaMoneyAccount';

const MONEY_MFA_METHODS: MfaMethod[] = ['passkey', 'email_otp'];

export type MoneyMfaStatus =
  | 'unavailable'
  | 'not_set_up'
  | 'setting_up'
  | 'failed'
  | 'enabled'
  | 'off';

const getReason = () => ({
  operation: 'money.mfa.setup',
  enrollDescription: strings('money.mfa.setup_operation_description'),
});

const getTurnOffReason = () => ({
  operation: 'money.mfa.turnOff',
  verifyDescription: strings('money.mfa.turn_off_verify_description'),
});

/**
 * Money 2-step verification: whether it is on, and the actions that turn it
 * on (passkey via the MFA kit, then the MPC Money account) or off.
 *
 * @returns The current status and its actions.
 */
export const useMoneyMfa = () => {
  const isFlagEnabled = useSelector(selectMoneyEnableMfaFlag);
  const { credentials, enroll, verifyOrEnroll } = useMfa();
  const { phase, isTurnedOff } = useSyncExternalStore(
    moneyMfaStore.subscribe,
    moneyMfaStore.getState,
  );

  const activeMethods = useMemo(
    () =>
      MONEY_MFA_METHODS.filter((method) =>
        credentials.some(
          ({ type, status: credentialStatus }) =>
            type === method && credentialStatus === 'active',
        ),
      ),
    [credentials],
  );
  const hasPasskey = activeMethods.includes('passkey');

  let status: MoneyMfaStatus;
  if (!isFlagEnabled || !isMfaKitEnabled()) {
    status = 'unavailable';
  } else if (phase === 'setting_up' || phase === 'failed') {
    status = phase;
  } else if (hasPasskey) {
    status = isTurnedOff ? 'off' : 'enabled';
  } else {
    status = 'not_set_up';
  }

  // The flow can outlive the screen that started it (the home prompt closes
  // first), so the result goes through the app-wide navigator.
  const showEnabledSheet = useCallback(() => {
    NavigationService.navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.MFA_ENABLED_SHEET,
    });
  }, []);

  const createAccount = useCallback(async () => {
    moneyMfaStore.setState({ phase: 'setting_up' });
    try {
      await createMfaMoneyAccount();
    } catch {
      moneyMfaStore.setState({ phase: 'failed' });
      return;
    }
    moneyMfaStore.setState({ phase: 'idle', isTurnedOff: false });
    showEnabledSheet();
  }, [showEnabledSheet]);

  const turnOn = useCallback(async () => {
    if (moneyMfaStore.getState().phase === 'setting_up') {
      return;
    }
    try {
      if (hasPasskey) {
        await verifyOrEnroll({
          methods: activeMethods,
          verifyWith: activeMethods,
          maxSessionAgeMs: 0,
          reason: getReason(),
        });
      } else {
        await enroll({ method: 'passkey', reason: getReason() });
      }
    } catch {
      // The kit has already shown any error; backing out leaves 2FA as it was.
      return;
    }
    if (hasPasskey) {
      moneyMfaStore.setState({ isTurnedOff: false });
      showEnabledSheet();
      return;
    }
    await createAccount();
  }, [
    hasPasskey,
    activeMethods,
    enroll,
    verifyOrEnroll,
    createAccount,
    showEnabledSheet,
  ]);

  const turnOff = useCallback(async () => {
    try {
      await verifyOrEnroll({
        methods: activeMethods,
        verifyWith: activeMethods,
        maxSessionAgeMs: 0,
        reason: getTurnOffReason(),
      });
    } catch {
      return;
    }
    moneyMfaStore.setState({ isTurnedOff: true });
  }, [activeMethods, verifyOrEnroll]);

  const dismissFailure = useCallback(() => {
    moneyMfaStore.setState({ phase: 'idle' });
  }, []);

  const refreshCredentials = useCallback(() => {
    if (status === 'unavailable') {
      return;
    }
    mobileMfaControllerAdapter
      .refreshEnrolledCredentials()
      .catch(() => undefined);
  }, [status]);

  return {
    status,
    turnOn,
    retry: createAccount,
    turnOff,
    dismissFailure,
    refreshCredentials,
  };
};
