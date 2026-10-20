import { useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { isMfaKitEnabled, useMfa } from '../../../../util/identity/mfa';
import type { MfaMethod } from '../../../../util/identity/mfa/engine/types';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import { ToastContext } from '../../../../component-library/components/Toast';
import {
  ToastVariants,
  type ToastOptions,
} from '../../../../component-library/components/Toast/Toast.types';
import { IconName as ToastIconName } from '../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../util/theme';
import { selectMoneyEnableMfaFlag } from '../selectors/featureFlags';
import { moneyMfaStore } from './moneyMfaStore';
import { createMfaMoneyAccount } from './createMfaMoneyAccount';

/** Methods Money requires before 2-step verification turns on. */
export const MONEY_MFA_METHODS: MfaMethod[] = ['passkey', 'email_otp'];

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
 * on (the MFA kit sets up passkey and email, then the MPC Money account is
 * created) or off.
 *
 * @returns The current status and its actions.
 */
export const useMoneyMfa = () => {
  const isFlagEnabled = useSelector(selectMoneyEnableMfaFlag);
  const { credentials, enroll, verifyOrEnroll } = useMfa();
  const { toastRef } = useContext(ToastContext);
  const theme = useTheme();
  const { phase, isEnabled, hasBeenEnabled } = useSyncExternalStore(
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

  let status: MoneyMfaStatus;
  if (!isFlagEnabled || !isMfaKitEnabled()) {
    status = 'unavailable';
  } else if (phase === 'setting_up' || phase === 'failed') {
    status = phase;
  } else if (isEnabled) {
    status = 'enabled';
  } else {
    status = hasBeenEnabled ? 'off' : 'not_set_up';
  }

  const showToast = useCallback(
    (labelKey: string) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: ToastIconName.Confirmation,
        iconColor: theme.colors.success.default,
        labelOptions: [{ label: strings(labelKey) }],
        hasNoTimeout: false,
      } as ToastOptions);
    },
    [toastRef, theme],
  );

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
    moneyMfaStore.setState({
      phase: 'idle',
      isEnabled: true,
      hasBeenEnabled: true,
    });
    showEnabledSheet();
  }, [showEnabledSheet]);

  const turnOn = useCallback(async () => {
    if (moneyMfaStore.getState().phase === 'setting_up') {
      return;
    }
    try {
      await verifyOrEnroll({
        methods: MONEY_MFA_METHODS,
        verifyWith: MONEY_MFA_METHODS,
        maxSessionAgeMs: 0,
        reason: getReason(),
      });
    } catch {
      // The kit has already shown any error; backing out leaves 2FA as it was.
      return;
    }
    if (moneyMfaStore.getState().hasBeenEnabled) {
      moneyMfaStore.setState({ isEnabled: true });
      showToast('money.mfa.toast_on');
      return;
    }
    await createAccount();
  }, [verifyOrEnroll, createAccount, showToast]);

  const addPasskeyAndTurnOn = useCallback(async () => {
    if (!activeMethods.includes('passkey')) {
      try {
        await enroll({ method: 'passkey', reason: getReason() });
      } catch {
        return;
      }
    }
    await turnOn();
  }, [activeMethods, enroll, turnOn]);

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
    moneyMfaStore.setState({ isEnabled: false });
    showToast('money.mfa.toast_off');
  }, [activeMethods, verifyOrEnroll, showToast]);

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
    addPasskeyAndTurnOn,
    retry: createAccount,
    turnOff,
    dismissFailure,
    refreshCredentials,
  };
};
