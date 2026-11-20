import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { useMfa } from '../../../../util/identity/mfa';
import type {
  MfaMethod,
  MfaReason,
} from '../../../../util/identity/mfa/engine/types';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import { ToastContext } from '../../../../component-library/components/Toast';
import {
  ToastVariants,
  type ToastOptions,
} from '../../../../component-library/components/Toast/Toast.types';
import { IconName as ToastIconName } from '../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../util/theme';
import {
  selectMoneyEnableMfaFlag,
  selectMoneyEnableMoneyAccountFlag,
} from '../selectors/featureFlags';
import { selectMfaUiKitEnabled } from '../../../../selectors/featureFlagController/mfaUiKit';
import { moneyMfaStore } from '../../../../lib/Money/mfa/moneyMfaStore';
import { moneyAccountMigration } from '../../../../lib/Money/mfa/moneyAccountMigration';

export const MONEY_MFA_METHODS: MfaMethod[] = ['passkey', 'totp'];

export type MoneyMfaStatus =
  | 'unavailable'
  | 'not_set_up'
  | 'setting_up'
  | 'failed'
  | 'enabled'
  | 'off';

const getReason = (presentation?: MfaReason['presentation']): MfaReason => ({
  operation: 'money.mfa.setup',
  presentation,
});

const getAddPasskeyReason = (): MfaReason => ({
  operation: 'money.mfa.addPasskey',
});

const getTurnOffReason = (): MfaReason => ({
  operation: 'money.mfa.turnOff',
  verifyDescription: strings('money.mfa.turn_off_verify_description'),
});

let activeMigration: Promise<void> | undefined;

// The flow can outlive the screen that started it, so the result goes through the app-wide navigator.
const migrate = (): Promise<void> => {
  // A wallet reset clears `migrating`, so a run from the previous wallet is not reused.
  if (activeMigration && moneyAccountMigration.getStatus() === 'migrating') {
    return activeMigration;
  }
  const run: Promise<void> = (async () => {
    try {
      await moneyAccountMigration.start();
    } catch {
      return;
    }
    moneyMfaStore.setState({
      isMoneyAccountMfaEnabled: true,
      hasUnseenEnabledConfirmation: true,
    });
  })().finally(() => {
    if (activeMigration === run) {
      activeMigration = undefined;
    }
  });
  activeMigration = run;
  return run;
};

export const useMoneyMfa = () => {
  const isFlagEnabled = useSelector(selectMoneyEnableMfaFlag);
  const isKitEnabled = useSelector(selectMfaUiKitEnabled);
  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  const { credentials, enroll, verifyOrEnroll } = useMfa();
  const { toastRef } = useContext(ToastContext);
  const theme = useTheme();
  const {
    isMoneyAccountMfaEnabled,
    isMigrationBannerDismissed,
    hasUnseenEnabledConfirmation,
  } = useSyncExternalStore(moneyMfaStore.subscribe, moneyMfaStore.getState);
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
  if (!isFlagEnabled || !isKitEnabled || !isMoneyAccountEnabled) {
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

  const turnOn = useCallback(
    async (presentation?: MfaReason['presentation']) => {
      if (moneyAccountMigration.getStatus() === 'migrating') {
        return;
      }
      try {
        await verifyOrEnroll({
          methods: MONEY_MFA_METHODS,
          verifyWith: MONEY_MFA_METHODS,
          maxSessionAgeMs: 0,
          reason: getReason(presentation),
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
    },
    [verifyOrEnroll, showToast],
  );

  const addPasskey = useCallback(async () => {
    if (activeMethods.includes('passkey')) {
      return;
    }
    try {
      await enroll({ method: 'passkey', reason: getAddPasskeyReason() });
    } catch {
      // The kit has already shown any error.
    }
  }, [activeMethods, enroll]);

  const turnOff = useCallback(async () => {
    try {
      // The full list, so an empty or stale credential list can't skip the check.
      await verifyOrEnroll({
        methods: MONEY_MFA_METHODS,
        verifyWith: MONEY_MFA_METHODS,
        maxSessionAgeMs: 0,
        verifyOnly: true,
        reason: getTurnOffReason(),
      });
    } catch {
      return;
    }
    moneyMfaStore.setState({
      isMoneyAccountMfaEnabled: false,
      hasUnseenEnabledConfirmation: false,
    });
    showToast('money.mfa.toast_off');
  }, [verifyOrEnroll, showToast]);

  const retry = useCallback(() => {
    moneyMfaStore.setState({ isMigrationBannerDismissed: false });
    return migrate();
  }, []);

  const dismissSettingUpBanner = useCallback(() => {
    moneyMfaStore.setState({ isMigrationBannerDismissed: true });
  }, []);

  // Money home calls this when it's on screen, so the confirmation never shows on another tab.
  const showEnabledConfirmation = useCallback(() => {
    if (!moneyMfaStore.getState().hasUnseenEnabledConfirmation) {
      return false;
    }
    moneyMfaStore.setState({ hasUnseenEnabledConfirmation: false });
    showToast('money.mfa.toast_on');
    return true;
  }, [showToast]);

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
    addPasskey,
    retry,
    turnOff,
    isSettingUpBannerDismissed: isMigrationBannerDismissed,
    dismissSettingUpBanner,
    refreshCredentials,
    hasUnseenEnabledConfirmation,
    showEnabledConfirmation,
  };
};
