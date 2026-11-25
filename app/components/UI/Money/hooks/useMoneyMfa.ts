import { MFA_CREDENTIAL_TYPES } from '@metamask/profile-sync-controller/sdk';
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
import { isMpcMoneyKeyringBuildEnabled } from '../../../../constants/featureFlags';
import { selectMfaUiKitEnabled } from '../../../../selectors/featureFlagController/mfaUiKit';
import { moneyMfaStore } from '../../../../lib/Money/mfa/moneyMfaStore';
import { moneyAccountMigration } from '../../../../lib/Money/mfa/moneyAccountMigration';
import type { MoneyMfaSetupTrigger } from '../../../../util/analytics/moneyMfaTracking';
import { moneyAccountRestore } from '../../../../lib/Money/mfa/moneyAccountRestore';
import { selectMfaMoneyAccountLifecycle } from '../../../../selectors/moneyAccountLifecycleController';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';

export const MONEY_MFA_METHODS: MfaMethod[] = ['passkey', 'totp'];

export type MoneyMfaStatus =
  | 'unavailable'
  | 'not_set_up'
  | 'sign_in_required'
  | 'signing_in'
  | 'sign_in_failed'
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
const migrate = async (trigger: MoneyMfaSetupTrigger): Promise<void> => {
  // A wallet reset clears `migrating`, so a run from the previous wallet is not reused.
  if (activeMigration && moneyAccountMigration.getStatus() === 'migrating') {
    return activeMigration;
  }
  const run: Promise<void> = (async () => {
    try {
      await moneyAccountMigration.start(trigger);
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
  const restoreStatus = useSyncExternalStore(
    moneyAccountRestore.subscribe,
    moneyAccountRestore.getStatus,
  );
  const mfaLifecycle = useSelector(selectMfaMoneyAccountLifecycle);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const hasRestoredMpcAccount =
    mfaLifecycle?.identity.currentAddress.toLowerCase() ===
    primaryMoneyAccount?.address.toLowerCase();

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
  // Turning it on creates the MPC Money account, which needs the MPC keyring.
  if (
    !isFlagEnabled ||
    !isKitEnabled ||
    !isMoneyAccountEnabled ||
    !isMpcMoneyKeyringBuildEnabled()
  ) {
    status = 'unavailable';
  } else if (mfaLifecycle && !hasRestoredMpcAccount) {
    // 'restored' covers the moment before the new default Money account reaches the store.
    if (restoreStatus === 'restoring' || restoreStatus === 'restored') {
      status = 'signing_in';
    } else {
      status =
        restoreStatus === 'failed' ? 'sign_in_failed' : 'sign_in_required';
    }
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
      void migrate('resume');
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
      });
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
      await migrate('turn_on');
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
    // Every method type, so a stale credential list can't leave one out.
    const verifyWith = [...MFA_CREDENTIAL_TYPES];
    try {
      await verifyOrEnroll({
        methods: verifyWith,
        verifyWith,
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

  const currentMpcAddress = mfaLifecycle?.identity.currentAddress;
  const signIn = useCallback(async () => {
    if (!currentMpcAddress || !moneyAccountRestore.begin()) {
      return;
    }
    try {
      // The keyring's restore prompt reuses this verification.
      await verifyOrEnroll({
        methods: MONEY_MFA_METHODS,
        verifyWith: MONEY_MFA_METHODS,
        maxSessionAgeMs: 0,
        reason: {
          operation: 'money.mpcRestore',
          verifyDescription: strings('money.mfa.sign_in_verify_description'),
        },
      });
    } catch {
      moneyAccountRestore.end();
      return;
    }
    if ((await moneyAccountRestore.restore(currentMpcAddress)) === 'restored') {
      moneyMfaStore.setState({ isMoneyAccountMfaEnabled: true });
      showToast('money.mfa.sign_in_toast');
    }
  }, [currentMpcAddress, verifyOrEnroll, showToast]);

  const retry = useCallback(async () => {
    moneyMfaStore.setState({ isMigrationBannerDismissed: false });
    return migrate('retry');
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

  const isAvailable = status !== 'unavailable';
  const refreshCredentials = useCallback(() => {
    if (!isAvailable) {
      return;
    }
    mobileMfaControllerAdapter
      .refreshEnrolledCredentials()
      .catch(() => undefined);
  }, [isAvailable]);

  return {
    status,
    turnOn,
    addPasskey,
    retry,
    turnOff,
    signIn,
    isSettingUpBannerDismissed: isMigrationBannerDismissed,
    dismissSettingUpBanner,
    refreshCredentials,
    hasUnseenEnabledConfirmation,
    showEnabledConfirmation,
  };
};
