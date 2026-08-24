import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarAccount,
  AvatarAccountSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  IconName,
  MainActionButton,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { AccountGroupObject } from '@metamask/account-tree-controller';

import type { AppNavigationProp } from '../../../core/NavigationService/types';
import MultichainAccountSelectorList from '../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import { getAvatarAccountVariant } from '../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { useQRScanner } from '../../hooks/useQRScanner';
import { useAccountsOperationsLoadingStates } from '../../../util/accounts/useAccountsOperationsLoadingStates';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';
import { selectAvatarAccountType } from '../../../selectors/settings';
import {
  getMetamaskNotificationsUnreadCount,
  selectIsMetamaskNotificationsEnabled,
} from '../../../selectors/notifications';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';
import { AccountHubSelectorsIDs } from './AccountHub.testIds';

/**
 * Consolidated account and settings surface introduced by the Header & NavBar
 * refresh experiment (TMCU-1276). Reached from the wallet header avatar in the
 * treatment arm only — the caller owns the flag check.
 */
const AccountHub = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { openQRScanner } = useQRScanner();

  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const unreadNotificationCount = useSelector(
    getMetamaskNotificationsUnreadCount,
  );
  const { isAccountSyncingInProgress, loadingMessage } =
    useAccountsOperationsLoadingStates();

  const selectedAccountGroups = useMemo(
    () => (selectedAccountGroup ? [selectedAccountGroup] : []),
    [selectedAccountGroup],
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNotificationsPress = useCallback(() => {
    navigation.navigate(Routes.NOTIFICATIONS.VIEW);
    if (isNotificationEnabled && isNotificationsFeatureEnabled()) {
      trackEvent(
        createEventBuilder(EVENT_NAME.NOTIFICATIONS_MENU_OPENED)
          .addProperties({ unread_count: unreadNotificationCount })
          .build(),
      );
    }
  }, [
    navigation,
    isNotificationEnabled,
    unreadNotificationCount,
    trackEvent,
    createEventBuilder,
  ]);

  const handleMenuPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_SETTINGS)
        .addProperties({ action: 'Navigation Drawer', name: 'Settings' })
        .build(),
    );
    navigation.navigate(Routes.SETTINGS_VIEW);
  }, [navigation, trackEvent, createEventBuilder]);

  const handleInfoPress = useCallback(() => {
    if (!selectedAccountGroup) {
      return;
    }
    navigation.navigate(Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_GROUP_DETAILS, {
      accountGroup: selectedAccountGroup,
    });
  }, [navigation, selectedAccountGroup]);

  // `entryPoint` is intentionally omitted: the Activity event enum has no value
  // for this surface yet and adding one is a Segment schema change.
  const handleActivityPress = useCallback(() => {
    trackEvent(createEventBuilder(MetaMetricsEvents.ACTIVITY_CLICKED).build());
    navigation.navigate(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
    });
  }, [navigation, trackEvent, createEventBuilder]);

  const handleSelectAccount = useCallback(
    (accountGroup: AccountGroupObject) => {
      Engine.context.AccountTreeController.setSelectedAccountGroup(
        accountGroup.id,
      );
      navigation.goBack();
    },
    [navigation],
  );

  const handleAddWallet = useCallback(() => {
    navigation.navigate(Routes.SHEET.ADD_WALLET);
  }, [navigation]);

  const addWalletLabel = isAccountSyncingInProgress
    ? loadingMessage
    : strings('multichain_accounts.add_wallet');

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={AccountHubSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{ testID: AccountHubSelectorsIDs.BACK_BUTTON }}
        endButtonIconProps={[
          {
            iconName: IconName.Menu,
            onPress: handleMenuPress,
            testID: AccountHubSelectorsIDs.MENU_BUTTON,
          },
          {
            iconName: IconName.Notification,
            onPress: handleNotificationsPress,
            testID: AccountHubSelectorsIDs.NOTIFICATIONS_BUTTON,
          },
        ]}
        includesTopInset
      />

      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="px-4 pt-2 pb-6 gap-3"
      >
        {selectedInternalAccount ? (
          <AvatarAccount
            address={selectedInternalAccount.address}
            variant={getAvatarAccountVariant(avatarAccountType)}
            size={AvatarAccountSize.Xl}
            testID={AccountHubSelectorsIDs.ACCOUNT_AVATAR}
          />
        ) : null}
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          testID={AccountHubSelectorsIDs.ACCOUNT_NAME}
        >
          {selectedAccountGroup?.metadata.name ?? ''}
        </Text>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="px-4 pb-4 gap-4 justify-between"
      >
        <MainActionButton
          twClassName="flex-1"
          iconName={IconName.Info}
          label={strings('account_hub.info')}
          onPress={handleInfoPress}
          isDisabled={!selectedAccountGroup}
          testID={AccountHubSelectorsIDs.INFO_BUTTON}
        />
        <MainActionButton
          twClassName="flex-1"
          iconName={IconName.QrCode}
          label={strings('account_hub.scan')}
          onPress={openQRScanner}
          testID={AccountHubSelectorsIDs.SCAN_BUTTON}
        />
        <MainActionButton
          twClassName="flex-1"
          iconName={IconName.Clock}
          label={strings('account_hub.activity')}
          onPress={handleActivityPress}
          testID={AccountHubSelectorsIDs.ACTIVITY_BUTTON}
        />
      </Box>

      {selectedAccountGroup ? (
        <MultichainAccountSelectorList
          onSelectAccount={handleSelectAccount}
          selectedAccountGroups={selectedAccountGroups}
          hideSearch
          testID={AccountHubSelectorsIDs.ACCOUNT_LIST}
        />
      ) : (
        <ScrollView />
      )}

      <Box flexDirection={BoxFlexDirection.Row} twClassName="px-4 pt-6 pb-5">
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={handleAddWallet}
          isDisabled={isAccountSyncingInProgress}
          testID={AccountHubSelectorsIDs.ADD_WALLET_BUTTON}
          twClassName="flex-1"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            gap={2}
          >
            {isAccountSyncingInProgress ? (
              <ActivityIndicator size="small" />
            ) : null}
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {addWalletLabel}
            </Text>
          </Box>
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default AccountHub;
