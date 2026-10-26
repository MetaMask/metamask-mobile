import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
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
import { selectSeedlessOnboardingLoginFlow } from '../../../../selectors/seedlessOnboardingController';
import { selectMoneyEnableMfaFlag } from '../selectors/featureFlags';
import { moneyMfaStore } from '../../../../lib/Money/mfa/moneyMfaStore';
import { moneyAccountMigration } from '../../../../lib/Money/mfa/moneyAccountMigration';

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

let activeMigration: Promise<void> | undefined;

/**
 * Runs the Money account migration once at a time, then turns 2-step
 * verification on. The flow can outlive the screen that started it, so the
 * result goes through the app-wide navigator.
 */
const migrate = (): Promise<void> => {
  activeMigration ??= (async () => {
    try {
      await moneyAccountMigration.start();
    } catch {
      return;
    }
    moneyMfaStore.setState({ isMoneyAccountMfaEnabled: true });
    NavigationService.navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.MFA_ENABLED_SHEET,
    });
  })().finally(() => {
    activeMigration = undefined;
  });
  return activeMigration;
};

/**
 * Money 2-step verification: whether it is on, and the actions that turn it
 * on (the MFA kit sets up passkey and email, then the MPC Money account is
 * created) or off.
 *
 * @returns The current status and its actions.
 */
export const useMoneyMfa = () => {
  const isFlagEnabled = useSelector(selectMoneyEnableMfaFlag);
  // A social login's inherited email can't be a second factor, so SRP only for now.
  const isSocialLogin = useSelector(selectSeedlessOnboardingLoginFlow);
  const { credentials, enroll, verifyOrEnroll } = useMfa();
  const { toastRef } = useContext(ToastContext);
  const theme = useTheme();
  const { isMoneyAccountMfaEnabled, isMigrationBannerDismissed } =
    useSyncExternalStore(moneyMfaStore.subscribe, moneyMfaStore.getState);
  const migrationStatus = useSyncExternalStore(
    moneyAccountMigration.subscribe,
    moneyAccountMigration.getStatus,
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
  if (!isFlagEnabled || !isMfaKitEnabled() || isSocialLogin) {
    status = 'unavailable';
  } else if (migrationStatus === 'migrating') {
    status = 'setting_up';
  } else if (migrationStatus === 'failed') {
    status = 'failed';
  } else if (isMoneyAccountMfaEnabled) {
    status = 'enabled';
  } else {
    status = migrationStatus === 'done' ? 'off' : 'not_set_up';
  }

  // Resumes a migration that the app was closed during.
  useEffect(() => {
    if (status === 'setting_up' && !activeMigration) {
      void migrate();
    }
  }, [status]);

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

  const turnOn = useCallback(async () => {
    if (moneyAccountMigration.getStatus() === 'migrating') {
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
    if (moneyAccountMigration.getStatus() === 'done') {
      moneyMfaStore.setState({ isMoneyAccountMfaEnabled: true });
      showToast('money.mfa.toast_on');
      return;
    }
    moneyMfaStore.setState({ isMigrationBannerDismissed: false });
    await migrate();
  }, [verifyOrEnroll, showToast]);

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
    moneyMfaStore.setState({ isMoneyAccountMfaEnabled: false });
    showToast('money.mfa.toast_off');
  }, [activeMethods, verifyOrEnroll, showToast]);

  const dismissSettingUpBanner = useCallback(() => {
    moneyMfaStore.setState({ isMigrationBannerDismissed: true });
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
    retry: migrate,
    turnOff,
    isSettingUpBannerDismissed: isMigrationBannerDismissed,
    dismissSettingUpBanner,
    refreshCredentials,
  };
};
