import React, { useCallback, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarAccount,
  AvatarAccountSize,
  BadgeStatus,
  BadgeStatusStatus,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  HeaderStandard,
  IconName,
  MainActionButton,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { AccountGroupObject } from '@metamask/account-tree-controller';

import type { AppNavigationProp } from '../../../core/NavigationService/types';
import MultichainAccountSelectorList from '../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import AddWalletButton from '../../../component-library/components-temp/MultichainAccounts/AddWalletButton';
import { getAvatarAccountVariant } from '../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { useQRScanner } from '../../hooks/useQRScanner';
import { useSyncSRPs } from '../../hooks/useSyncSRPs';
import { useHasUnreadNotifications } from '../../hooks/useHasUnreadNotifications';
import {
  selectInternalAccounts,
  selectSelectedInternalAccount,
} from '../../../selectors/accountsController';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';
import { selectAvatarAccountType } from '../../../selectors/settings';
import {
  getMetamaskNotificationsReadCount,
  getMetamaskNotificationsUnreadCount,
  selectIsMetamaskNotificationsEnabled,
} from '../../../selectors/notifications';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';
import { AccountHubSelectorsIDs } from './AccountHub.testIds';

const AccountHub = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { openQRScanner } = useQRScanner();

  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const internalAccounts = useSelector(selectInternalAccounts);
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const unreadNotificationCount = useSelector(
    getMetamaskNotificationsUnreadCount,
  );
  const readNotificationCount = useSelector(getMetamaskNotificationsReadCount);
  const hasUnreadNotifications = useHasUnreadNotifications();

  useSyncSRPs();

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
          .addProperties({
            unread_count: unreadNotificationCount,
            read_count: readNotificationCount,
          })
          .build(),
      );
    }
  }, [
    navigation,
    isNotificationEnabled,
    unreadNotificationCount,
    readNotificationCount,
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
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWITCHED_ACCOUNT)
          .addProperties({
            source: 'Account Hub',
            number_of_accounts: internalAccounts?.length,
          })
          .build(),
      );
      navigation.goBack();
    },
    [navigation, trackEvent, createEventBuilder, internalAccounts?.length],
  );

  const handleAddWallet = useCallback(() => {
    navigation.navigate(Routes.SHEET.ADD_WALLET);
  }, [navigation]);

  const listHeader = useMemo(
    () => (
      <>
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="px-4 pt-8 pb-6 gap-3"
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
            numberOfLines={1}
            testID={AccountHubSelectorsIDs.ACCOUNT_NAME}
          >
            {selectedAccountGroup?.metadata.name ?? ''}
          </Text>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          twClassName="px-4 pb-4 gap-2 justify-between"
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
      </>
    ),
    [
      selectedInternalAccount,
      avatarAccountType,
      selectedAccountGroup,
      handleInfoPress,
      openQRScanner,
      handleActivityPress,
    ],
  );

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={AccountHubSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{ testID: AccountHubSelectorsIDs.BACK_BUTTON }}
        endAccessory={
          <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2">
            {isNotificationsFeatureEnabled() && (
              <BadgeWrapper
                position={BadgeWrapperPosition.TopRight}
                positionAnchorShape={BadgeWrapperPositionAnchorShape.Circular}
                badge={
                  hasUnreadNotifications ? (
                    <BadgeStatus
                      status={BadgeStatusStatus.Attention}
                      testID={AccountHubSelectorsIDs.NOTIFICATIONS_BADGE}
                    />
                  ) : null
                }
              >
                <ButtonIcon
                  iconName={IconName.Notification}
                  size={ButtonIconSize.Md}
                  onPress={handleNotificationsPress}
                  testID={AccountHubSelectorsIDs.NOTIFICATIONS_BUTTON}
                />
              </BadgeWrapper>
            )}
            <ButtonIcon
              iconName={IconName.Menu}
              size={ButtonIconSize.Md}
              onPress={handleMenuPress}
              testID={AccountHubSelectorsIDs.MENU_BUTTON}
            />
          </Box>
        }
        includesTopInset
      />

      {selectedAccountGroup ? (
        <MultichainAccountSelectorList
          onSelectAccount={handleSelectAccount}
          selectedAccountGroups={selectedAccountGroups}
          hideSearch
          ListHeaderComponent={listHeader}
          testID={AccountHubSelectorsIDs.ACCOUNT_LIST}
        />
      ) : (
        <ScrollView style={tw.style('flex-1')}>{listHeader}</ScrollView>
      )}
      <AddWalletButton
        onPress={handleAddWallet}
        testID={AccountHubSelectorsIDs.ADD_WALLET_BUTTON}
      />
    </SafeAreaView>
  );
};

export default AccountHub;
