import React, { useCallback, useRef, useMemo } from 'react';
import { Image } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  ButtonVariant,
  IconSize,
  IconName,
  Icon,
  IconColor,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { ModalType } from '../components/RewardsBottomSheetModal';
import { setHideUnlinkedAccountsBanner } from '../../../../actions/rewards';
import { setHideCurrentAccountNotOptedInBanner } from '../../../../reducers/rewards';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { convertInternalAccountToCaipAccountId } from '../utils';
import { CaipAccountId } from '@metamask/utils';
import DontMissOutIcon from '../../../../images/rewards/dont-miss-out.png';
import { useLinkAccount } from './useLinkAccount';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';
import { isHardwareAccount } from '../../../../util/address';

/**
 * Session tracking singleton to prevent multiple modal shows per app session per account group.
 * This ensures that once a user has seen a modal type for a specific account group (or account ID as fallback)
 * during their current app session, it won't be shown again for that tracking key, but will be shown again
 * if they switch to a different account group or account.
 */
class ModalSessionTracker {
  private static instance: ModalSessionTracker;
  private shownModalsByTrackingKey: Map<string, Set<string>> = new Map();

  static getInstance(): ModalSessionTracker {
    if (!ModalSessionTracker.instance) {
      ModalSessionTracker.instance = new ModalSessionTracker();
    }
    return ModalSessionTracker.instance;
  }

  hasShownModal(trackingKey: string, modalType: string): boolean {
    const trackingKeyModals = this.shownModalsByTrackingKey.get(trackingKey);
    return trackingKeyModals ? trackingKeyModals.has(modalType) : false;
  }

  markModalAsShown(trackingKey: string, modalType: string): void {
    if (!this.shownModalsByTrackingKey.has(trackingKey)) {
      this.shownModalsByTrackingKey.set(trackingKey, new Set());
    }
    const trackingKeyModals = this.shownModalsByTrackingKey.get(trackingKey);
    if (trackingKeyModals) {
      trackingKeyModals.add(modalType);
    }
  }

  reset(): void {
    this.shownModalsByTrackingKey.clear();
  }

  resetForAccountGroup(trackingKey: string): void {
    this.shownModalsByTrackingKey.delete(trackingKey);
  }
}

// Shared modal icon component for the "Don't Miss Out" messaging
const DontMissOutIconComponent: React.FC = () => {
  const tw = useTailwind();

  return (
    <Image
      source={DontMissOutIcon}
      style={tw.style('w-24 h-26')}
      resizeMode="contain"
    />
  );
};

export type RewardsDashboardModalType =
  | 'unlinked-accounts'
  | 'not-opted-in'
  | 'not-supported';

export const useRewardDashboardModals = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const accountGroupId = useSelector(selectSelectedAccountGroupId);
  const sessionTracker = useRef(ModalSessionTracker.getInstance());
  const { linkAccount, isLoading: isLinking } = useLinkAccount();

  // Shared tracking key for session management
  const trackingKey = useMemo(
    () => accountGroupId || selectedAccount?.id || 'unknown',
    [accountGroupId, selectedAccount?.id],
  );

  // Shared icon element for consistency across modals
  const dontMissOutIcon = useMemo(() => <DontMissOutIconComponent />, []);

  /**
   * Shows modal encouraging users to link unlinked accounts.
   * Navigates to rewards settings when confirmed.
   */
  const showUnlinkedAccountsModal = useCallback(() => {
    if (
      !selectedAccount ||
      sessionTracker.current.hasShownModal(
        'unlinked-accounts',
        'unlinked-accounts',
      )
    ) {
      return;
    }

    navigation.navigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
      title: strings(
        'rewards.dashboard_modal_info.multiple_unlinked_accounts.title',
      ),
      description: strings(
        'rewards.dashboard_modal_info.multiple_unlinked_accounts.description',
      ),
      customIcon: dontMissOutIcon,
      confirmAction: {
        label: strings(
          'rewards.dashboard_modal_info.multiple_unlinked_accounts.confirm',
        ),
        onPress: () => {
          dispatch(setHideUnlinkedAccountsBanner(true));
          navigation.goBack();
          navigation.navigate(Routes.REWARDS_SETTINGS_VIEW);
        },
        variant: ButtonVariant.Primary,
      },

      onCancel: () => {
        dispatch(setHideUnlinkedAccountsBanner(true));
        navigation.goBack();
      },
      type: ModalType.Confirmation,
      showCancelButton: true,
      cancelMode: 'top-right-cross-icon',
    });

    sessionTracker.current.markModalAsShown(
      'unlinked-accounts',
      'unlinked-accounts',
    );
  }, [navigation, dispatch, dontMissOutIcon, selectedAccount]);

  /**
   * Shows modal encouraging the current account to opt into rewards.
   * Provides link account functionality when confirmed.
   */
  const showNotOptedInModal = useCallback(() => {
    if (
      !selectedAccount ||
      sessionTracker.current.hasShownModal(trackingKey, 'not-opted-in')
    ) {
      return;
    }

    const handleDismissCurrentAccountBanner = () => {
      if (selectedAccount) {
        const caipAccountId =
          convertInternalAccountToCaipAccountId(selectedAccount);
        if (caipAccountId) {
          dispatch(
            setHideCurrentAccountNotOptedInBanner({
              accountId: caipAccountId as CaipAccountId,
              hide: true,
            }),
          );
        }
      }
    };

    navigation.navigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
      title: strings('rewards.dashboard_modal_info.active_account.title'),
      description: strings(
        'rewards.dashboard_modal_info.active_account.description',
      ),
      customIcon: dontMissOutIcon,
      confirmAction: {
        label: strings('rewards.dashboard_modal_info.active_account.confirm'),
        isLoading: isLinking,
        onPress: async () => {
          if (!isLinking) {
            const linkSuccess = await linkAccount(
              selectedAccount as InternalAccount,
            );
            navigation.navigate(Routes.REWARDS_DASHBOARD);
            if (linkSuccess) {
              handleDismissCurrentAccountBanner();
            }
          }
        },
        variant: ButtonVariant.Primary,
      },
      type: ModalType.Confirmation,
      showCancelButton: true,
      cancelMode: 'top-right-cross-icon',
    });

    sessionTracker.current.markModalAsShown(trackingKey, 'not-opted-in');
  }, [
    navigation,
    dontMissOutIcon,
    isLinking,
    selectedAccount,
    dispatch,
    linkAccount,
    trackingKey,
  ]);

  /**
   * Shows modal informing user that their account type is not supported.
   * Provides different messaging for hardware wallets vs other account types.
   */
  const showNotSupportedModal = useCallback(() => {
    if (!selectedAccount) {
      return;
    }

    navigation.navigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
      title: strings(
        'rewards.dashboard_modal_info.account_not_supported.title',
      ),
      description: isHardwareAccount(selectedAccount?.address as string)
        ? strings(
            'rewards.dashboard_modal_info.account_not_supported.description_hardware',
          )
        : strings(
            'rewards.dashboard_modal_info.account_not_supported.description_general',
          ),
      type: ModalType.Confirmation,
      customIcon: (
        <Icon
          name={IconName.Danger}
          size={IconSize.Xl}
          color={IconColor.WarningDefault}
        />
      ),
      confirmAction: {
        label: strings(
          'rewards.dashboard_modal_info.account_not_supported.confirm',
        ),
        onPress: () => {
          navigation.navigate(Routes.WALLET_VIEW);
        },
        variant: ButtonVariant.Primary,
      },
      showCancelButton: true,
      cancelMode: 'top-right-cross-icon',
    });
  }, [navigation, selectedAccount]);

  /**
   * Resets session tracking for all modal types.
   * Useful for testing or when you want to allow modals to be shown again.
   */
  const resetSessionTracking = useCallback(() => {
    sessionTracker.current.reset();
  }, []);

  /**
   * Checks if a specific modal type has been shown in the current session for the selected account group.
   *
   * @param modalType - The type of modal to check
   * @returns Whether the modal has been shown for the current account group
   */
  const hasShownModal = useCallback(
    (modalType: RewardsDashboardModalType) => {
      if (!selectedAccount) {
        return false;
      }
      return sessionTracker.current.hasShownModal(trackingKey, modalType);
    },
    [selectedAccount, trackingKey],
  );

  /**
   * Resets session tracking for the current account group.
   * Useful when you want to allow modals to be shown again for the current account group.
   */
  const resetSessionTrackingForCurrentAccountGroup = useCallback(() => {
    if (selectedAccount) {
      sessionTracker.current.resetForAccountGroup(trackingKey);
    }
  }, [selectedAccount, trackingKey]);

  return {
    showUnlinkedAccountsModal,
    showNotOptedInModal,
    showNotSupportedModal,
    resetSessionTracking,
    resetSessionTrackingForCurrentAccountGroup,
    hasShownModal,
  };
};
