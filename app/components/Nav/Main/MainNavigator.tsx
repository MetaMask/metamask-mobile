import React, { useState, useEffect, useMemo } from 'react';
import { Keyboard, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Browser from '../../Views/Browser';
import { ChainId } from '@metamask/controller-utils';
import AddBookmark from '../../Views/AddBookmark';
import SimpleWebview from '../../Views/SimpleWebview';
import Settings from '../../Views/Settings';
import GeneralSettings from '../../Views/Settings/GeneralSettings';
import AdvancedSettings from '../../Views/Settings/AdvancedSettings';
import BackupAndSyncSettings from '../../Views/Settings/Identity/BackupAndSyncSettings';
import SecuritySettings from '../../Views/Settings/SecuritySettings';
import ExperimentalSettings from '../../Views/Settings/ExperimentalSettings';
import NetworksSettings from '../../Views/Settings/NetworksSettings';
import NotificationsSettings from '../../Views/Settings/NotificationsSettings';
import NotificationsView from '../../Views/Notifications';
import NotificationsDetails from '../../Views/Notifications/Details';
import OptIn from '../../Views/Notifications/OptIn';
import AppInformation from '../../Views/Settings/AppInformation';
import DeveloperOptions from '../../Views/Settings/DeveloperOptions';
import Contacts from '../../Views/Settings/Contacts';
import Wallet from '../../Views/Wallet';
import Asset from '../../Views/Asset';
import AssetDetails from '../../Views/AssetDetails';
import AddAsset from '../../Views/AddAsset';
import Collectible from '../../Views/Collectible';
import SendLegacy from '../../Views/confirmations/legacy/Send';
import SendTo from '../../Views/confirmations/legacy/SendFlow/SendTo';
import { RevealPrivateCredential } from '../../Views/RevealPrivateCredential';
import WalletConnectSessions from '../../Views/WalletConnectSessions';
import OfflineMode from '../../Views/OfflineMode';
import QRTabSwitcher from '../../Views/QRTabSwitcher';
import EnterPasswordSimple from '../../Views/EnterPasswordSimple';
import ChoosePassword from '../../Views/ChoosePassword';
import ResetPassword from '../../Views/ResetPassword';
import AccountBackupStep1 from '../../Views/AccountBackupStep1';
import AccountBackupStep1B from '../../Views/AccountBackupStep1B';
import ManualBackupStep1 from '../../Views/ManualBackupStep1';
import ManualBackupStep2 from '../../Views/ManualBackupStep2';
import ManualBackupStep3 from '../../Views/ManualBackupStep3';
import PaymentRequest from '../../UI/PaymentRequest';
import PaymentRequestSuccess from '../../UI/PaymentRequestSuccess';
import Amount from '../../Views/confirmations/legacy/SendFlow/Amount';
import Confirm from '../../Views/confirmations/legacy/SendFlow/Confirm';
import { Confirm as RedesignedConfirm } from '../../Views/confirmations/components/confirm';
import ContactForm from '../../Views/Settings/Contacts/ContactForm';
import ActivityView from '../../Views/ActivityView';
import SwapsAmountView from '../../UI/Swaps';
import SwapsQuotesView from '../../UI/Swaps/QuotesView';
import CollectiblesDetails from '../../UI/CollectibleModal';
import OptinMetrics from '../../UI/OptinMetrics';

import RampRoutes from '../../UI/Ramp/Aggregator/routes';
import { RampType } from '../../UI/Ramp/Aggregator/types';
import RampSettings from '../../UI/Ramp/Aggregator/Views/Settings';
import RampActivationKeyForm from '../../UI/Ramp/Aggregator/Views/Settings/ActivationKeyForm';

import DepositOrderDetails from '../../UI/Ramp/Deposit/Views/DepositOrderDetails/DepositOrderDetails';
import DepositRoutes from '../../UI/Ramp/Deposit/routes';

import { colors as importedColors } from '../../../styles/common';
import OrderDetails from '../../UI/Ramp/Aggregator/Views/OrderDetails';
import SendTransaction from '../../UI/Ramp/Aggregator/Views/SendTransaction';
import TabBar from '../../../component-library/components/Navigation/TabBar';
///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
import { SnapsSettingsList } from '../../Views/Snaps/SnapsSettingsList';
import { SnapSettings } from '../../Views/Snaps/SnapSettings';
///: END:ONLY_INCLUDE_IF
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  CustomTabBarProps,
  TabBarIconKey,
} from '../../../component-library/components/Navigation/TabBar/TabBar.types';
import { selectProviderConfig } from '../../../selectors/networkController';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';
import SDKSessionsManager from '../../Views/SDK/SDKSessionsManager/SDKSessionsManager';
import PermissionsManager from '../../Views/Settings/PermissionsSettings/PermissionsManager';
import { getDecimalChainId } from '../../../util/networks';
import { useMetrics } from '../../hooks/useMetrics';
import DeprecatedNetworkDetails from '../../UI/DeprecatedNetworkModal';
import ConfirmAddAsset from '../../UI/ConfirmAddAsset';
import { AesCryptoTestForm } from '../../Views/AesCryptoTestForm';
import { isTest } from '../../../util/test/utils';
import NftDetails from '../../Views/NftDetails';
import NftDetailsFullImage from '../../Views/NftDetails/NFtDetailsFullImage';
import AccountPermissions from '../../Views/AccountPermissions';
import { AccountPermissionsScreens } from '../../Views/AccountPermissions/AccountPermissions.types';
import { StakeScreenStack, StakeModalStack } from '../../UI/Stake/routes';
import { AssetLoader } from '../../Views/AssetLoader';
import { EarnScreenStack, EarnModalStack } from '../../UI/Earn/routes';
import { BridgeTransactionDetails } from '../../UI/Bridge/components/TransactionDetails/TransactionDetails';
import { BridgeModalStack, BridgeScreenStack } from '../../UI/Bridge/routes';
import {
  PerpsScreenStack,
  PerpsModalStack,
  selectPerpsEnabledFlag,
} from '../../UI/Perps';
import { selectRewardsEnabledFlag } from '../../../selectors/featureFlagController/rewards';
import PerpsPositionTransactionView from '../../UI/Perps/Views/PerpsTransactionsView/PerpsPositionTransactionView';
import PerpsOrderTransactionView from '../../UI/Perps/Views/PerpsTransactionsView/PerpsOrderTransactionView';
import PerpsFundingTransactionView from '../../UI/Perps/Views/PerpsTransactionsView/PerpsFundingTransactionView';
import TurnOnBackupAndSync from '../../Views/Identity/TurnOnBackupAndSync/TurnOnBackupAndSync';
import DeFiProtocolPositionDetails from '../../UI/DeFiPositions/DeFiProtocolPositionDetails';
import WalletRecovery from '../../Views/WalletRecovery';
import CardRoutes from '../../UI/Card/routes';
import { Send } from '../../Views/confirmations/components/send';
import { selectSendRedesignFlags } from '../../../selectors/featureFlagController/confirmations';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import RewardsView from '../../UI/Rewards/Views/RewardsView';
import ReferralRewardsView from '../../UI/Rewards/Views/RewardsReferralView';
import { TransactionDetails } from '../../Views/confirmations/components/activity/transaction-details/transaction-details';
import type { RootParamList } from '../../../util/navigation/types';
import type { RootState } from '../../../reducers';

const Stack = createStackNavigator<RootParamList>();
const Tab = createBottomTabNavigator();

const AssetStack = () => (
  <Stack.Navigator>
    <Stack.Screen name={'Asset'} component={Asset} />
    <Stack.Screen name={'AssetDetails'} component={AssetDetails} />
  </Stack.Navigator>
);
/* eslint-enable react/prop-types */

const WalletTabStackFlow = () => (
  <Stack.Navigator initialRouteName={'WalletView'}>
    <Stack.Screen name="WalletView" component={Wallet} />
    <Stack.Screen name="AddAsset" component={AddAsset} />
    <Stack.Screen name="Collectible" component={Collectible} />
    <Stack.Screen name="ConfirmAddAsset" component={ConfirmAddAsset} />
    <Stack.Screen
      name={Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL}
      component={RevealPrivateCredential}
    />
  </Stack.Navigator>
);

const TransactionsHome = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.TRANSACTIONS_VIEW}
      component={ActivityView}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name={Routes.TRANSACTION_DETAILS}
      component={TransactionDetails}
    />
    <Stack.Screen name={Routes.RAMP.ORDER_DETAILS} component={OrderDetails} />
    <Stack.Screen
      name={Routes.DEPOSIT.ORDER_DETAILS}
      component={DepositOrderDetails}
    />
    <Stack.Screen
      name={Routes.RAMP.SEND_TRANSACTION}
      component={SendTransaction}
    />
    <Stack.Screen
      name={Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS}
      component={BridgeTransactionDetails}
    />
  </Stack.Navigator>
);

const RewardsHome = () => {
  const isRewardsEnabled = useSelector(selectRewardsEnabledFlag);

  if (!isRewardsEnabled) {
    return null;
  }
  return (
    <Stack.Navigator>
      <Stack.Screen
        name={Routes.REWARDS_VIEW}
        component={RewardsView}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={Routes.REFERRAL_REWARDS_VIEW}
        component={ReferralRewardsView}
        options={{ headerShown: true }}
      />
    </Stack.Navigator>
  );
};

/* eslint-disable react/prop-types */
const BrowserFlow = () => (
  <Stack.Navigator
    initialRouteName={Routes.BROWSER.VIEW}
    screenOptions={{
      cardStyle: { backgroundColor: importedColors.transparent },
      presentation: 'modal',
    }}
  >
    <Stack.Screen
      name={Routes.BROWSER.VIEW}
      component={Browser}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name={Routes.BROWSER.ASSET_LOADER}
      component={AssetLoader}
      options={{ headerShown: false, animationEnabled: false }}
    />
    <Stack.Screen name="SwapsAmountView" component={SwapsAmountView} />
    <Stack.Screen name="SwapsQuotesView" component={SwapsQuotesView} />
  </Stack.Navigator>
);

///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
const SnapsSettingsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.SNAPS.SNAPS_SETTINGS_LIST}
      component={SnapsSettingsList}
    />
    <Stack.Screen name={Routes.SNAPS.SNAP_SETTINGS} component={SnapSettings} />
  </Stack.Navigator>
);
///: END:ONLY_INCLUDE_IF

const NotificationsOptInStack = () => (
  <Stack.Navigator initialRouteName={Routes.NOTIFICATIONS.OPT_IN}>
    <Stack.Screen
      name={Routes.NOTIFICATIONS.OPT_IN}
      component={OptIn}
      options={{ headerShown: false, presentation: 'modal' }}
    />
    <Stack.Screen
      name={Routes.SETTINGS.NOTIFICATIONS}
      component={NotificationsSettings}
    />
  </Stack.Navigator>
);

const SettingsFlow = () => (
  <Stack.Navigator initialRouteName={'Settings'}>
    <Stack.Screen name="Settings" component={Settings} />
    <Stack.Screen name="GeneralSettings" component={GeneralSettings} />
    <Stack.Screen name="AdvancedSettings" component={AdvancedSettings} />
    <Stack.Screen name="SDKSessionsManager" component={SDKSessionsManager} />
    <Stack.Screen name="PermissionsManager" component={PermissionsManager} />
    <Stack.Screen name="SecuritySettings" component={SecuritySettings} />

    <Stack.Screen name={Routes.RAMP.SETTINGS} component={RampSettings} />
    <Stack.Screen
      name={Routes.RAMP.ACTIVATION_KEY_FORM}
      component={RampActivationKeyForm}
    />
    {
      /**
       * This screen should only accessed in test mode.
       * It is used to test the AES crypto functions.
       *
       * If this is in production, it is a bug.
       */
      isTest && (
        <Stack.Screen name="AesCryptoTestForm" component={AesCryptoTestForm} />
      )
    }
    <Stack.Screen
      name="ExperimentalSettings"
      component={ExperimentalSettings}
    />
    <Stack.Screen name="NetworksSettings" component={NetworksSettings} />
    <Stack.Screen name="CompanySettings" component={AppInformation} />
    {process.env.MM_ENABLE_SETTINGS_PAGE_DEV_OPTIONS === 'true' && (
      <Stack.Screen
        name={Routes.SETTINGS.DEVELOPER_OPTIONS}
        component={DeveloperOptions}
      />
    )}

    <Stack.Screen name="ContactsSettings" component={Contacts} />
    <Stack.Screen name="ContactForm" component={ContactForm} />
    <Stack.Screen
      name="AccountPermissionsAsFullScreen"
      component={AccountPermissions}
      options={{ headerShown: false }}
      initialParams={{
        initialScreen: AccountPermissionsScreens.PermissionsSummary,
      }}
    />
    <Stack.Screen
      name={Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL}
      component={RevealPrivateCredential}
    />
    <Stack.Screen
      name={Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW}
      component={WalletConnectSessions}
    />
    <Stack.Screen name="ResetPassword" component={ResetPassword} />
    <Stack.Screen name="WalletRecovery" component={WalletRecovery} />
    <Stack.Screen name="AccountBackupStep1B" component={AccountBackupStep1B} />
    <Stack.Screen name="ManualBackupStep1" component={ManualBackupStep1} />
    <Stack.Screen name="ManualBackupStep2" component={ManualBackupStep2} />
    <Stack.Screen name="ManualBackupStep3" component={ManualBackupStep3} />
    <Stack.Screen name="EnterPasswordSimple" component={EnterPasswordSimple} />
    <Stack.Screen
      name={Routes.SETTINGS.NOTIFICATIONS}
      component={NotificationsSettings}
    />
    <Stack.Screen
      name={Routes.SETTINGS.BACKUP_AND_SYNC}
      component={BackupAndSyncSettings}
    />
    {
      ///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
    }
    <Stack.Screen
      name={Routes.SNAPS.SNAPS_SETTINGS_LIST}
      component={SnapsSettingsStack}
      options={{ headerShown: false }}
    />
    {
      ///: END:ONLY_INCLUDE_IF
    }
  </Stack.Navigator>
);

const HomeTabs = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isKeyboardHidden, setIsKeyboardHidden] = useState(true);

  const accountsLength = useSelector(selectAccountsLength);
  const isRewardsEnabled = useSelector(selectRewardsEnabledFlag);

  const chainId = useSelector((state: RootState) => {
    const providerConfig = selectProviderConfig(state);
    return ChainId[providerConfig.type as keyof typeof ChainId];
  });

  const amountOfBrowserOpenTabs = useSelector(
    (state: RootState) => state.browser.tabs.length,
  );

  const options: Record<
    string,
    CustomTabBarProps['descriptors'][string]['options']
  > = {
    home: {
      tabBarIconKey: TabBarIconKey.Wallet,
      callback: () => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.WALLET_OPENED)
            .addProperties({
              number_of_accounts: accountsLength,
              chain_id: getDecimalChainId(chainId),
            })
            .build(),
        );
      },
      rootScreenName: Routes.WALLET_VIEW,
    },
    actions: {
      tabBarIconKey: TabBarIconKey.Actions,
      rootScreenName: Routes.MODAL.WALLET_ACTIONS,
    },
    browser: {
      tabBarIconKey: TabBarIconKey.Browser,
      callback: () => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.BROWSER_OPENED)
            .addProperties({
              number_of_accounts: accountsLength,
              chain_id: getDecimalChainId(chainId),
              source: 'Navigation Tab',
              number_of_open_tabs: amountOfBrowserOpenTabs,
            })
            .build(),
        );
      },
      rootScreenName: Routes.BROWSER_VIEW,
      unmountOnBlur: true,
    },
    activity: {
      tabBarIconKey: TabBarIconKey.Activity,
      callback: () => {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.NAVIGATION_TAPS_TRANSACTION_HISTORY,
          ).build(),
        );
      },
      rootScreenName: Routes.TRANSACTIONS_VIEW,
      unmountOnBlur: true,
    },
    rewards: {
      tabBarIconKey: TabBarIconKey.Rewards,
      callback: () => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_REWARDS).build(),
        );
      },
      rootScreenName: Routes.REWARDS_VIEW,
      unmountOnBlur: true,
    },
    settings: {
      tabBarIconKey: TabBarIconKey.Setting,
      callback: () => {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.NAVIGATION_TAPS_SETTINGS,
          ).build(),
        );
      },
      rootScreenName: Routes.SETTINGS_VIEW,
      unmountOnBlur: true,
    },
  };

  useEffect(() => {
    // Hide keyboard on Android when keyboard is visible.
    // Better solution would be to update android:windowSoftInputMode in the AndroidManifest and refactor pages to support it.
    if (Platform.OS === 'android') {
      const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
        setIsKeyboardHidden(false);
      });
      const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
        setIsKeyboardHidden(true);
      });

      return () => {
        showSubscription.remove();
        hideSubscription.remove();
      };
    }
  }, []);

  const renderTabBar = ({
    state,
    descriptors,
    navigation,
    insets,
  }: CustomTabBarProps) => {
    if (isKeyboardHidden) {
      return (
        <TabBar
          state={state}
          descriptors={descriptors}
          navigation={navigation}
          insets={insets}
        />
      );
    }
    return null;
  };

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={Routes.WALLET.HOME}
      tabBar={(props) => renderTabBar(props as CustomTabBarProps)}
    >
      <Tab.Screen
        name={Routes.WALLET.HOME}
        options={options.home}
        component={WalletTabStackFlow}
      />
      <Tab.Screen
        name={Routes.BROWSER.HOME}
        options={options.browser}
        component={BrowserFlow}
      />
      {/* This is a placeholder screen to allow the WalletActions to be displayed in the tab bar */}
      <Tab.Screen
        name="WalletActionsTab"
        options={options.actions}
        component={() => null}
      />
      <Tab.Screen
        name={Routes.TRANSACTIONS_VIEW}
        options={options.activity}
        component={TransactionsHome}
      />
      {isRewardsEnabled ? (
        <Tab.Screen
          name={Routes.REWARDS_VIEW}
          options={options.rewards}
          component={RewardsHome}
        />
      ) : (
        <Tab.Screen
          name={Routes.SETTINGS_VIEW}
          options={options.settings}
          component={SettingsFlow}
        />
      )}
    </Tab.Navigator>
  );
};

const Webview = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="SimpleWebview"
      component={SimpleWebview}
      options={{ presentation: 'modal' }}
    />
  </Stack.Navigator>
);

const SendView = () => (
  <Stack.Navigator>
    <Stack.Screen name="Send" component={SendLegacy} />
  </Stack.Navigator>
);

const NftDetailsStack = () => (
  <Stack.Navigator screenOptions={{ title: '' }}>
    <Stack.Screen name="NftDetails" component={NftDetails} />
  </Stack.Navigator>
);

const NftDetailsFullImageModeView = () => (
  <Stack.Navigator screenOptions={{ title: '' }}>
    <Stack.Screen name="NftDetailsFullImage" component={NftDetailsFullImage} />
  </Stack.Navigator>
);

const SendFlowView = () => (
  <Stack.Navigator screenOptions={{ headerMode: 'screen' }}>
    <Stack.Screen name="SendTo" component={SendTo} />
    <Stack.Screen name="Amount" component={Amount} />
    <Stack.Screen name={Routes.SEND_FLOW.CONFIRM} component={Confirm} />
    <Stack.Screen
      name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
      component={RedesignedConfirm}
    />
  </Stack.Navigator>
);

const AddBookmarkView = () => (
  <Stack.Navigator>
    <Stack.Screen name="AddBookmark" component={AddBookmark} />
  </Stack.Navigator>
);

const OfflineModeView = () => (
  <Stack.Navigator>
    <Stack.Screen name="OfflineMode" component={OfflineMode} />
  </Stack.Navigator>
);

const PaymentRequestView = () => (
  <Stack.Navigator>
    <Stack.Screen name="PaymentRequest" component={PaymentRequest} />
    <Stack.Screen
      name="PaymentRequestSuccess"
      component={PaymentRequestSuccess}
    />
  </Stack.Navigator>
);

const NotificationsModeView = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.NOTIFICATIONS.VIEW}
      component={NotificationsView}
    />
    <Stack.Screen
      name={Routes.SETTINGS.NOTIFICATIONS}
      component={NotificationsSettings}
    />
    <Stack.Screen
      name={Routes.NOTIFICATIONS.OPT_IN}
      component={OptIn}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen
      name={Routes.NOTIFICATIONS.DETAILS}
      component={NotificationsDetails}
    />
    <Stack.Screen name="ContactForm" component={ContactForm} />
  </Stack.Navigator>
);

const Swaps = () => (
  <Stack.Navigator>
    <Stack.Screen name="SwapsAmountView" component={SwapsAmountView} />
    <Stack.Screen name="SwapsQuotesView" component={SwapsQuotesView} />
  </Stack.Navigator>
);

const SetPasswordFlow = () => (
  <Stack.Navigator>
    <Stack.Screen name="ChoosePassword" component={ChoosePassword} />
    <Stack.Screen
      name="AccountBackupStep1"
      component={AccountBackupStep1}
      options={{ headerShown: false }}
    />
    <Stack.Screen name="AccountBackupStep1B" component={AccountBackupStep1B} />
    <Stack.Screen name="ManualBackupStep1" component={ManualBackupStep1} />
    <Stack.Screen name="ManualBackupStep2" component={ManualBackupStep2} />
    <Stack.Screen name="ManualBackupStep3" component={ManualBackupStep3} />
    <Stack.Screen
      name="OptinMetrics"
      component={OptinMetrics}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const MainNavigator = () => {
  // Get feature flag state for conditional Perps screen registration
  const perpsEnabledFlag = useSelector(selectPerpsEnabledFlag);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const isPerpsEnabled = useMemo(
    () => perpsEnabledFlag && isEvmSelected,
    [perpsEnabledFlag, isEvmSelected],
  );
  const { enabled: isSendRedesignEnabled } = useSelector(
    selectSendRedesignFlags,
  );
  const isRewardsEnabled = useSelector(selectRewardsEnabledFlag);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
      }}
      initialRouteName={'Home'}
    >
      <Stack.Screen name="Home" component={HomeTabs} />
      <Stack.Screen name="AssetStack" component={AssetStack} />
      <Stack.Screen name="Webview" component={Webview} />
      <Stack.Screen name="SendView" component={SendView} />
      <Stack.Screen
        name="Send"
        component={Send}
        //Disabling swipe down on IOS
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="SendFlowView"
        component={isSendRedesignEnabled ? Send : SendFlowView}
        //Disabling swipe down on IOS
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="AddBookmarkView" component={AddBookmarkView} />
      <Stack.Screen name="OfflineModeView" component={OfflineModeView} />
      <Stack.Screen
        name={Routes.NOTIFICATIONS.VIEW}
        component={NotificationsModeView}
      />
      <Stack.Screen name={Routes.QR_TAB_SWITCHER} component={QRTabSwitcher} />
      <Stack.Screen name="NftDetailsStack" component={NftDetailsStack} />
      <Stack.Screen
        name="NftDetailsFullImageStack"
        component={NftDetailsFullImageModeView}
      />
      <Stack.Screen name="PaymentRequestView" component={PaymentRequestView} />
      <Stack.Screen name={Routes.RAMP.BUY}>
        {() => <RampRoutes rampType={RampType.BUY} />}
      </Stack.Screen>
      <Stack.Screen name={Routes.RAMP.SELL}>
        {() => <RampRoutes rampType={RampType.SELL} />}
      </Stack.Screen>
      <Stack.Screen name={Routes.DEPOSIT.ID} component={DepositRoutes} />
      <Stack.Screen name="Swaps" component={Swaps} />
      <Stack.Screen name={Routes.BRIDGE.ROOT} component={BridgeScreenStack} />
      <Stack.Screen name="StakeScreens" component={StakeScreenStack} />
      <Stack.Screen name={Routes.EARN.ROOT} component={EarnScreenStack} />
      {/* Modal Routes */}
      {BridgeModalStack()}
      {EarnModalStack()}
      {/* This can be flattened in RN V7 with the use of layouts */}
      <Stack.Screen name="StakeModalStack" component={StakeModalStack} />
      {isPerpsEnabled ? PerpsModalStack() : null}
      <Stack.Group screenOptions={{ presentation: 'transparentModal' }}>
        <Stack.Screen
          name="CollectiblesDetails"
          component={CollectiblesDetails}
        />
        <Stack.Screen
          name={Routes.DEPRECATED_NETWORK_DETAILS}
          component={DeprecatedNetworkDetails}
        />
      </Stack.Group>
      {isRewardsEnabled && (
        <Stack.Screen
          name={Routes.SETTINGS_VIEW}
          component={SettingsFlow}
          options={{ headerShown: false }}
        />
      )}
      <Stack.Screen name="SetPasswordFlow" component={SetPasswordFlow} />
      {/* TODO: This is added to support slide 4 in the carousel - once changed this can be safely removed*/}
      <Stack.Screen
        name="GeneralSettings"
        component={GeneralSettings}
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen
        name={Routes.NOTIFICATIONS.OPT_IN_STACK}
        component={NotificationsOptInStack}
      />
      <Stack.Screen
        name={Routes.IDENTITY.TURN_ON_BACKUP_AND_SYNC}
        component={TurnOnBackupAndSync}
      />
      <Stack.Screen
        name="DeFiProtocolPositionDetails"
        component={DeFiProtocolPositionDetails}
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen name={Routes.CARD.ROOT} component={CardRoutes} />
      {isPerpsEnabled && (
        <>
          <Stack.Screen name={Routes.PERPS.ROOT} component={PerpsScreenStack} />
          <Stack.Screen
            name={Routes.PERPS.POSITION_TRANSACTION}
            component={PerpsPositionTransactionView}
            options={{
              title: 'Position Transaction',
              headerShown: true,
            }}
          />
          <Stack.Screen
            name={Routes.PERPS.ORDER_TRANSACTION}
            component={PerpsOrderTransactionView}
            options={{
              title: 'Order Transaction',
              headerShown: true,
            }}
          />
          <Stack.Screen
            name={Routes.PERPS.FUNDING_TRANSACTION}
            component={PerpsFundingTransactionView}
            options={{
              title: 'Funding Transaction',
              headerShown: true,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default MainNavigator;
