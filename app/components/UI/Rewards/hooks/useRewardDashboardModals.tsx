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
import { selectBulkLinkIsRunning } from '../../../../reducers/rewards/selectors';
import DontMissOutIcon from '../../../../images/rewards/dont-miss-out.png';
import { useLinkAccountGroup } from './useLinkAccountGroup';
import { isHardwareAccount } from '../../../../util/address';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsByGroupId } from '../../../../selectors/multichainAccounts/accounts';

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
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const sessionTracker = useRef(ModalSessionTracker.getInstance());
  const { linkAccountGroup, isLoading: isLinking } = useLinkAccountGroup();
  const getAccountsByGroupId = useSelector(selectInternalAccountsByGroupId);
  const isBulkLinkRunning = useSelector(selectBulkLinkIsRunning);

  // Shared tracking key for session management
  const trackingKey = useMemo(
    () => selectedAccountGroup?.id || 'unknown',
    [selectedAccountGroup?.id],
  );

  // Shared icon element for consistency across modals
  const dontMissOutIcon = useMemo(() => <DontMissOutIconComponent />, []);

  /**
   * Shows modal encouraging users to link unlinked accounts.
   * Navigates to rewards settings when confirmed.
   * Does not show if bulk linking process is running.
   */
  const showUnlinkedAccountsModal = useCallback(() => {
    if (
      !selectedAccountGroup ||
      isBulkLinkRunning ||
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
          navigation.navigate(Routes.REWARDS_SETTINGS_VIEW);
        },
        variant: ButtonVariant.Primary,
      },

      onCancel: () => {
        dispatch(setHideUnlinkedAccountsBanner(true));
        navigation.navigate(Routes.REWARDS_DASHBOARD);
      },
      type: ModalType.Confirmation,
      showCancelButton: true,
      cancelMode: 'top-right-cross-icon',
    });

    sessionTracker.current.markModalAsShown(
      'unlinked-accounts',
      'unlinked-accounts',
    );
  }, [
    navigation,
    dispatch,
    dontMissOutIcon,
    selectedAccountGroup,
    isBulkLinkRunning,
  ]);

  /**
   * Shows modal encouraging the current account to opt into rewards.
   * Provides link account functionality when confirmed.
   */
  const showNotOptedInModal = useCallback(() => {
    if (
      !selectedAccountGroup?.id ||
      sessionTracker.current.hasShownModal(trackingKey, 'not-opted-in')
    ) {
      return;
    }

    const handleDismissCurrentAccountBanner = () => {
      if (selectedAccountGroup?.id) {
        dispatch(
          setHideCurrentAccountNotOptedInBanner({
            accountGroupId: selectedAccountGroup.id,
            hide: true,
          }),
        );
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
        loadOnPress: true,
        onPress: async () => {
          if (!isLinking) {
            const linkSuccess = await linkAccountGroup(selectedAccountGroup.id);
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
    selectedAccountGroup?.id,
    trackingKey,
    navigation,
    dontMissOutIcon,
    isLinking,
    dispatch,
    linkAccountGroup,
  ]);

  /**
   * Shows modal informing user that their account type is not supported.
   * Provides different messaging for hardware wallets vs other account types.
   */
  const showNotSupportedModal = useCallback(() => {
    if (!selectedAccountGroup?.id) {
      return;
    }
    const accountsForGroup = getAccountsByGroupId(selectedAccountGroup.id);
    const hasHardwareAccounts = accountsForGroup.some((account) =>
      isHardwareAccount(account.address),
    );

    navigation.navigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
      title: strings(
        'rewards.dashboard_modal_info.account_not_supported.title',
      ),
      description: hasHardwareAccounts
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
  }, [getAccountsByGroupId, navigation, selectedAccountGroup?.id]);

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
      if (!selectedAccountGroup?.id) {
        return false;
      }
      return sessionTracker.current.hasShownModal(trackingKey, modalType);
    },
    [selectedAccountGroup?.id, trackingKey],
  );

  /**
   * Resets session tracking for the current account group.
   * Useful when you want to allow modals to be shown again for the current account group.
   */
  const resetSessionTrackingForCurrentAccountGroup = useCallback(() => {
    if (selectedAccountGroup?.id) {
      sessionTracker.current.resetForAccountGroup(trackingKey);
    }
  }, [selectedAccountGroup?.id, trackingKey]);

  const resetAllSessionTracking = useCallback(() => {
    sessionTracker.current.reset();
  }, []);

  return {
    showUnlinkedAccountsModal,
    showNotOptedInModal,
    showNotSupportedModal,
    resetSessionTracking,
    resetSessionTrackingForCurrentAccountGroup,
    hasShownModal,
    resetAllSessionTracking,
  };
};
