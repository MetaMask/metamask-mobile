import { NetworksChainId } from '@metamask/controller-utils';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import isUrl from 'is-url';
import { isEqual } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Keyboard, Platform, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import URL from 'url-parse';
import TabBar from '../../../component-library/components/Navigation/TabBar';
import { TabBarIconKey } from '../../../component-library/components/Navigation/TabBar/TabBar.types';
import AmountToBuy from '../../../components/UI/FiatOnRampAggregator/Views/AmountToBuy';
import GetQuotes from '../../../components/UI/FiatOnRampAggregator/Views/GetQuotes';
import GetStarted from '../../../components/UI/FiatOnRampAggregator/Views/GetStarted';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { getPermittedAccountsByHostname } from '../../../core/Permissions';
import { selectProviderConfig } from '../../../selectors/networkController';
import { colors as importedColors } from '../../../styles/common';
import Logger from '../../../util/Logger';
import AnalyticsV2 from '../../../util/analyticsV2';
import { getActiveTabUrl } from '../../../util/transactions';
import CollectiblesDetails from '../../UI/CollectibleModal';
import Drawer from '../../UI/Drawer';
import CheckoutWebView from '../../UI/FiatOnRampAggregator/Views/Checkout';
import OrderDetails from '../../UI/FiatOnRampAggregator/Views/OrderDetails';
import PaymentMethods from '../../UI/FiatOnRampAggregator/Views/PaymentMethods/PaymentMethods';
import Regions from '../../UI/FiatOnRampAggregator/Views/Regions';
import OnRampSettings from '../../UI/FiatOnRampAggregator/Views/Settings';
import OnrampAddActivationKey from '../../UI/FiatOnRampAggregator/Views/Settings/AddActivationKey';
import { FiatOnRampSDKProvider } from '../../UI/FiatOnRampAggregator/sdk';
import OptinMetrics from '../../UI/OptinMetrics';
import PaymentRequest from '../../UI/PaymentRequest';
import PaymentRequestSuccess from '../../UI/PaymentRequestSuccess';
import SwapsAmountView from '../../UI/Swaps';
import SwapsQuotesView from '../../UI/Swaps/QuotesView';
import AccountBackupStep1 from '../../Views/AccountBackupStep1';
import AccountBackupStep1B from '../../Views/AccountBackupStep1B';
import ActivityView from '../../Views/ActivityView';
import AddAsset from '../../Views/AddAsset';
import AddBookmark from '../../Views/AddBookmark';
import Asset from '../../Views/Asset';
import AssetDetails from '../../Views/AssetDetails';
import Browser from '../../Views/Browser';
import BrowserUrlModal from '../../Views/BrowserUrlModal';
import ChoosePassword from '../../Views/ChoosePassword';
import Collectible from '../../Views/Collectible';
import EnterPasswordSimple from '../../Views/EnterPasswordSimple';
import LockScreen from '../../Views/LockScreen';
import ManualBackupStep1 from '../../Views/ManualBackupStep1';
import ManualBackupStep2 from '../../Views/ManualBackupStep2';
import ManualBackupStep3 from '../../Views/ManualBackupStep3';
import OfflineMode from '../../Views/OfflineMode';
import QrScanner from '../../Views/QRScanner';
import ResetPassword from '../../Views/ResetPassword';
import { RevealPrivateCredential } from '../../Views/RevealPrivateCredential';
import SDKSessionsManager from '../../Views/SDKSessionsManager/SDKSessionsManager';
import Send from '../../Views/Send';
import Amount from '../../Views/SendFlow/Amount';
import Confirm from '../../Views/SendFlow/Confirm';
import SendTo from '../../Views/SendFlow/SendTo';
import Settings from '../../Views/Settings';
import AdvancedSettings from '../../Views/Settings/AdvancedSettings';
import AppInformation from '../../Views/Settings/AppInformation';
import Contacts from '../../Views/Settings/Contacts';
import ContactForm from '../../Views/Settings/Contacts/ContactForm';
import ExperimentalSettings from '../../Views/Settings/ExperimentalSettings';
import GeneralSettings from '../../Views/Settings/GeneralSettings';
import NetworksSettings from '../../Views/Settings/NetworksSettings';
import NetworkSettings from '../../Views/Settings/NetworksSettings/NetworkSettings';
import SecuritySettings from '../../Views/Settings/SecuritySettings';
import SimpleWebview from '../../Views/SimpleWebview';
import { SnapsSettingsList } from '../../Views/Snaps';
import { SnapSettings } from '../../Views/Snaps/SnapSettings';
import ThemeSettings from '../../Views/ThemeSettings';
import Wallet from '../../Views/Wallet';
import WalletConnectSessions from '../../Views/WalletConnectSessions';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const styles = StyleSheet.create({
  headerLogo: {
    width: 125,
    height: 50,
  },
});

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
    cardStyleInterpolator: () => ({
      overlayStyle: {
        opacity: 0,
      },
    }),
  },
  animationEnabled: false,
};

const WalletModalFlow = () => (
  <Stack.Navigator mode={'modal'} screenOptions={clearStackNavigatorOptions}>
    <Stack.Screen
      name={'Wallet'}
      component={Wallet}
      options={{ headerShown: true, animationEnabled: false }}
    />
  </Stack.Navigator>
);

/* eslint-disable react/prop-types */
const AssetStackFlow = (props) => (
  <Stack.Navigator>
    <Stack.Screen
      name={'Asset'}
      component={Asset}
      initialParams={props.route.params}
    />
    <Stack.Screen
      name={'AssetDetails'}
      component={AssetDetails}
      initialParams={{ address: props.route.params?.address }}
    />
  </Stack.Navigator>
);

const AssetModalFlow = (props) => (
  <Stack.Navigator
    mode={'modal'}
    initialRouteName={'AssetStackFlow'}
    screenOptions={clearStackNavigatorOptions}
  >
    <Stack.Screen
      name={'AssetStackFlow'}
      component={AssetStackFlow}
      initialParams={props.route.params}
    />
  </Stack.Navigator>
);
/* eslint-enable react/prop-types */

const WalletTabStackFlow = () => (
  <Stack.Navigator initialRouteName={'WalletView'}>
    <Stack.Screen
      name="WalletView"
      component={WalletModalFlow}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Asset"
      component={AssetModalFlow}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="AddAsset"
      component={AddAsset}
      options={AddAsset.navigationOptions}
    />
    <Stack.Screen
      name="Collectible"
      component={Collectible}
      options={Collectible.navigationOptions}
    />
    <Stack.Screen
      name="RevealPrivateCredentialView"
      component={RevealPrivateCredential}
    />
  </Stack.Navigator>
);

const WalletTabModalFlow = () => (
  <Stack.Navigator mode={'modal'} screenOptions={clearStackNavigatorOptions}>
    <Stack.Screen
      name={Routes.WALLET.TAB_STACK_FLOW}
      component={WalletTabStackFlow}
    />
  </Stack.Navigator>
);

const TransactionsHome = () => (
  <Stack.Navigator>
    <Stack.Screen name={Routes.TRANSACTIONS_VIEW} component={ActivityView} />
    <Stack.Screen
      name={Routes.FIAT_ON_RAMP_AGGREGATOR.ORDER_DETAILS}
      component={OrderDetails}
    />
  </Stack.Navigator>
);

const BrowserFlow = () => (
  <Stack.Navigator
    initialRouteName={Routes.BROWSER.VIEW}
    mode={'modal'}
    screenOptions={{
      cardStyle: { backgroundColor: importedColors.transparent },
    }}
  >
    <Stack.Screen name={Routes.BROWSER.VIEW} component={Browser} />
    <Stack.Screen
      name={Routes.BROWSER.URL_MODAL}
      component={BrowserUrlModal}
      options={{ animationEnabled: false, headerShown: false }}
    />
  </Stack.Navigator>
);

export const DrawerContext = React.createContext({ drawerRef: null });

const HomeTabs = () => {
  const drawerRef = useRef(null);
  const [isKeyboardHidden, setIsKeyboardHidden] = useState(true);

  const accountsLength = useSelector(
    (state) =>
      Object.keys(
        state.engine.backgroundState.AccountTrackerController.accounts || {},
      ).length,
  );

  const chainId = useSelector((state) => {
    const provider = selectProviderConfig(state);
    return NetworksChainId[provider.type];
  });

  const amountOfBrowserOpenTabs = useSelector(
    (state) => state.browser.tabs.length,
  );

  /* tabs: state.browser.tabs, */
  /* activeTab: state.browser.activeTab, */
  const activeConnectedDapp = useSelector((state) => {
    const activeTabUrl = getActiveTabUrl(state);
    if (!isUrl(activeTabUrl)) return [];
    try {
      const permissionsControllerState =
        state.engine.backgroundState.PermissionController;
      const hostname = new URL(activeTabUrl).hostname;
      const permittedAcc = getPermittedAccountsByHostname(
        permissionsControllerState,
        hostname,
      );
      return permittedAcc;
    } catch (error) {
      Logger.error(error, {
        message: 'ParseUrl::MainNavigator error while parsing URL',
      });
    }
  }, isEqual);

  const options = {
    home: {
      tabBarIconKey: TabBarIconKey.Wallet,
      callback: () => {
        AnalyticsV2.trackEvent(MetaMetricsEvents.WALLET_OPENED, {
          number_of_accounts: accountsLength,
          chain_id: chainId,
        });
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
        AnalyticsV2.trackEvent(MetaMetricsEvents.BROWSER_OPENED, {
          number_of_accounts: accountsLength,
          chain_id: chainId,
          source: 'Navigation Tab',
          active_connected_dapp: activeConnectedDapp,
          number_of_open_tabs: amountOfBrowserOpenTabs,
        });
      },
      rootScreenName: Routes.BROWSER_VIEW,
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

  return (
    <DrawerContext.Provider value={{ drawerRef }}>
      <Drawer ref={drawerRef}>
        <Tab.Navigator
          initialRouteName={Routes.WALLET.HOME}
          tabBar={({ state, descriptors, navigation }) =>
            isKeyboardHidden ? (
              <TabBar
                state={state}
                descriptors={descriptors}
                navigation={navigation}
              />
            ) : null
          }
        >
          <Tab.Screen
            name={Routes.WALLET.HOME}
            options={options.home}
            component={WalletTabModalFlow}
          />
          <Tab.Screen
            name={Routes.MODAL.WALLET_ACTIONS}
            options={options.actions}
            component={WalletTabModalFlow}
          />
          <Tab.Screen
            name={Routes.BROWSER.HOME}
            options={options.browser}
            component={BrowserFlow}
          />
        </Tab.Navigator>
      </Drawer>
    </DrawerContext.Provider>
  );
};

const Webview = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="SimpleWebview"
      component={SimpleWebview}
      mode={'modal'}
      options={SimpleWebview.navigationOptions}
    />
  </Stack.Navigator>
);

const SnapsSettingsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.SNAPS.SNAPS_SETTINGS_LIST}
      component={SnapsSettingsList}
      options={SnapsSettingsList.navigationOptions}
    />
    <Stack.Screen
      name={Routes.SNAPS.SNAP_SETTINGS}
      component={SnapSettings}
      options={SnapSettings.navigationOptions}
    />
  </Stack.Navigator>
);

const SettingsFlow = () => (
  <Stack.Navigator initialRouteName={'Settings'}>
    <Stack.Screen
      name="Settings"
      component={Settings}
      options={Settings.navigationOptions}
    />
    <Stack.Screen
      name="GeneralSettings"
      component={GeneralSettings}
      options={GeneralSettings.navigationOptions}
    />
    <Stack.Screen
      name="AdvancedSettings"
      component={AdvancedSettings}
      options={AdvancedSettings.navigationOptions}
    />
    <Stack.Screen name="SDKSessionsManager" component={SDKSessionsManager} />
    <Stack.Screen
      name="SecuritySettings"
      component={SecuritySettings}
      options={SecuritySettings.navigationOptions}
    />
    <Stack.Screen
      name={Routes.FIAT_ON_RAMP_AGGREGATOR.SETTINGS}
      component={OnRampSettings}
    />
    <Stack.Screen
      name={Routes.FIAT_ON_RAMP_AGGREGATOR.ADD_ACTIVATION_KEY}
      component={OnrampAddActivationKey}
    />
    <Stack.Screen
      name="ExperimentalSettings"
      component={ExperimentalSettings}
      options={ExperimentalSettings.navigationOptions}
    />
    <Stack.Screen
      name="NetworksSettings"
      component={NetworksSettings}
      options={NetworksSettings.navigationOptions}
    />
    <Stack.Screen name="NetworkSettings" component={NetworkSettings} />
    <Stack.Screen
      name="CompanySettings"
      component={AppInformation}
      options={AppInformation.navigationOptions}
    />
    <Stack.Screen
      name="ContactsSettings"
      component={Contacts}
      options={Contacts.navigationOptions}
    />
    <Stack.Screen
      name="ContactForm"
      component={ContactForm}
      options={ContactForm.navigationOptions}
    />
    <Stack.Screen
      name="RevealPrivateCredentialView"
      component={RevealPrivateCredential}
    />
    <Stack.Screen
      name="WalletConnectSessionsView"
      component={WalletConnectSessions}
      options={WalletConnectSessions.navigationOptions}
    />
    <Stack.Screen
      name="ResetPassword"
      component={ResetPassword}
      options={ResetPassword.navigationOptions}
    />
    <Stack.Screen
      name="AccountBackupStep1B"
      component={AccountBackupStep1B}
      options={AccountBackupStep1B.navigationOptions}
    />
    <Stack.Screen
      name="ManualBackupStep1"
      component={ManualBackupStep1}
      options={ManualBackupStep1.navigationOptions}
    />
    <Stack.Screen
      name="ManualBackupStep2"
      component={ManualBackupStep2}
      options={ManualBackupStep2.navigationOptions}
    />
    <Stack.Screen
      name="ManualBackupStep3"
      component={ManualBackupStep3}
      options={ManualBackupStep3.navigationOptions}
    />
    <Stack.Screen
      name="EnterPasswordSimple"
      component={EnterPasswordSimple}
      options={EnterPasswordSimple.navigationOptions}
    />
    <Stack.Screen
      name={Routes.SNAPS.SNAPS_SETTINGS_LIST}
      component={SnapsSettingsStack}
    />
  </Stack.Navigator>
);

const SettingsModalStack = () => (
  <Stack.Navigator
    initialRouteName={'SettingsFlow'}
    mode={'modal'}
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: importedColors.transparent },
    }}
  >
    <Stack.Screen name={'SettingsFlow'} component={SettingsFlow} />
    <Stack.Screen
      name={'ThemeSettings'}
      component={ThemeSettings}
      options={{ animationEnabled: false }}
    />
  </Stack.Navigator>
);

const SendView = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Send"
      component={Send}
      options={Send.navigationOptions}
    />
  </Stack.Navigator>
);

const SendFlowView = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="SendTo"
      component={SendTo}
      options={SendTo.navigationOptions}
    />
    <Stack.Screen
      name="Amount"
      component={Amount}
      options={Amount.navigationOptions}
    />
    <Stack.Screen
      name={Routes.SEND_FLOW.CONFIRM}
      component={Confirm}
      options={Confirm.navigationOptions}
    />
  </Stack.Navigator>
);

const AddBookmarkView = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="AddBookmark"
      component={AddBookmark}
      options={AddBookmark.navigationOptions}
    />
  </Stack.Navigator>
);

const OfflineModeView = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="OfflineMode"
      component={OfflineMode}
      options={OfflineMode.navigationOptions}
    />
  </Stack.Navigator>
);

const PaymentRequestView = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="PaymentRequest"
      component={PaymentRequest}
      options={PaymentRequest.navigationOptions}
    />
    <Stack.Screen
      name="PaymentRequestSuccess"
      component={PaymentRequestSuccess}
      options={PaymentRequestSuccess.navigationOptions}
    />
  </Stack.Navigator>
);

const FiatOnRampAggregator = () => (
  <FiatOnRampSDKProvider>
    <Stack.Navigator
      initialRouteName={Routes.FIAT_ON_RAMP_AGGREGATOR.GET_STARTED}
    >
      <Stack.Screen
        name={Routes.FIAT_ON_RAMP_AGGREGATOR.GET_STARTED}
        component={GetStarted}
      />
      <Stack.Screen
        name={Routes.FIAT_ON_RAMP_AGGREGATOR.PAYMENT_METHOD}
        component={PaymentMethods}
      />
      <Stack.Screen
        name={Routes.FIAT_ON_RAMP_AGGREGATOR.PAYMENT_METHOD_HAS_STARTED}
        component={PaymentMethods}
        options={{ animationEnabled: false }}
      />
      <Stack.Screen
        name={Routes.FIAT_ON_RAMP_AGGREGATOR.AMOUNT_TO_BUY}
        component={AmountToBuy}
      />
      <Stack.Screen
        name={Routes.FIAT_ON_RAMP_AGGREGATOR.GET_QUOTES}
        component={GetQuotes}
      />
      <Stack.Screen
        name={Routes.FIAT_ON_RAMP_AGGREGATOR.CHECKOUT}
        component={CheckoutWebView}
      />
      <Stack.Screen
        name={Routes.FIAT_ON_RAMP_AGGREGATOR.REGION}
        component={Regions}
      />
      <Stack.Screen
        name={Routes.FIAT_ON_RAMP_AGGREGATOR.REGION_HAS_STARTED}
        component={Regions}
        options={{ animationEnabled: false }}
      />
    </Stack.Navigator>
  </FiatOnRampSDKProvider>
);

const Swaps = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="SwapsAmountView"
      component={SwapsAmountView}
      options={SwapsAmountView.navigationOptions}
    />
    <Stack.Screen
      name="SwapsQuotesView"
      component={SwapsQuotesView}
      options={SwapsQuotesView.navigationOptions}
    />
  </Stack.Navigator>
);

const SetPasswordFlow = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="ChoosePassword"
      component={ChoosePassword}
      options={ChoosePassword.navigationOptions}
    />
    <Stack.Screen
      name="AccountBackupStep1"
      component={AccountBackupStep1}
      options={AccountBackupStep1.navigationOptions}
    />
    <Stack.Screen
      name="AccountBackupStep1B"
      component={AccountBackupStep1B}
      options={AccountBackupStep1B.navigationOptions}
    />
    <Stack.Screen
      name="ManualBackupStep1"
      component={ManualBackupStep1}
      options={ManualBackupStep1.navigationOptions}
    />
    <Stack.Screen
      name="ManualBackupStep2"
      component={ManualBackupStep2}
      options={ManualBackupStep2.navigationOptions}
    />
    <Stack.Screen
      name="ManualBackupStep3"
      component={ManualBackupStep3}
      options={ManualBackupStep3.navigationOptions}
    />
    <Stack.Screen
      name="OptinMetrics"
      component={OptinMetrics}
      options={OptinMetrics.navigationOptions}
    />
  </Stack.Navigator>
);

const MainNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
    mode={'modal'}
    initialRouteName={'Home'}
  >
    <Stack.Screen
      name="CollectiblesDetails"
      component={CollectiblesDetails}
      options={{
        //Refer to - https://reactnavigation.org/docs/stack-navigator/#animations
        cardStyle: { backgroundColor: importedColors.transparent },
        cardStyleInterpolator: () => ({
          overlayStyle: {
            opacity: 0,
          },
        }),
      }}
    />
    <Stack.Screen name="Home" component={HomeTabs} />
    <Stack.Screen name="Webview" component={Webview} />
    <Stack.Screen name="SettingsView" component={SettingsModalStack} />
    <Stack.Screen name="TransactionsHome" component={TransactionsHome} />
    <Stack.Screen name="SendView" component={SendView} />
    <Stack.Screen name="SendFlowView" component={SendFlowView} />
    <Stack.Screen name="AddBookmarkView" component={AddBookmarkView} />
    <Stack.Screen name="OfflineModeView" component={OfflineModeView} />
    <Stack.Screen name={Routes.QR_SCANNER} component={QrScanner} />
    <Stack.Screen name="LockScreen" component={LockScreen} />
    <Stack.Screen name="PaymentRequestView" component={PaymentRequestView} />
    <Stack.Screen
      name={Routes.FIAT_ON_RAMP_AGGREGATOR.ID}
      component={FiatOnRampAggregator}
    />
    <Stack.Screen name="Swaps" component={Swaps} />
    <Stack.Screen
      name="SetPasswordFlow"
      component={SetPasswordFlow}
      headerTitle={() => (
        <Image
          style={styles.headerLogo}
          source={require('../../../images/metamask-name.png')}
          resizeMode={'contain'}
        />
      )}
      // eslint-disable-next-line react-native/no-inline-styles
      headerStyle={{ borderBottomWidth: 0 }}
    />
  </Stack.Navigator>
);

export default MainNavigator;
