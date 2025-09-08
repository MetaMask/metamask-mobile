import React, { useContext, useEffect, useRef } from 'react';
import {
  useNavigation,
  useRoute,
  useNavigationState,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Login from '../../Views/Login';
import QRTabSwitcher from '../../Views/QRTabSwitcher';
import DataCollectionModal from '../../Views/DataCollectionModal';
import Onboarding from '../../Views/Onboarding';
import OnboardingCarousel from '../../Views/OnboardingCarousel';
import ChoosePassword from '../../Views/ChoosePassword';
import AccountBackupStep1 from '../../Views/AccountBackupStep1';
import AccountBackupStep1B from '../../Views/AccountBackupStep1B';
import ManualBackupStep1 from '../../Views/ManualBackupStep1';
import ManualBackupStep2 from '../../Views/ManualBackupStep2';
import ManualBackupStep3 from '../../Views/ManualBackupStep3';
import ImportFromSecretRecoveryPhrase from '../../Views/ImportFromSecretRecoveryPhrase';
import DeleteWalletModal from '../../../components/UI/DeleteWalletModal';
import Main from '../Main';
import OptinMetrics from '../../UI/OptinMetrics';
import SimpleWebview from '../../Views/SimpleWebview';
import Logger from '../../../util/Logger';
import { useSelector } from 'react-redux';
import {
  CURRENT_APP_VERSION,
  LAST_APP_VERSION,
  OPTIN_META_METRICS_UI_SEEN,
} from '../../../constants/storage';
import { getVersion } from 'react-native-device-info';
import { Authentication } from '../../../core/';
import { colors as importedColors } from '../../../styles/common';
import Routes from '../../../constants/navigation/Routes';
import ModalConfirmation from '../../../component-library/components/Modals/ModalConfirmation';
import Toast, {
  ToastContext,
} from '../../../component-library/components/Toast';
import AccountSelector from '../../../components/Views/AccountSelector';
import AddressSelector from '../../../components/Views/AddressSelector';
import { TokenSortBottomSheet } from '../../../components/UI/Tokens/TokensBottomSheet/TokenSortBottomSheet';
import ProfilerManager from '../../../components/UI/ProfilerManager';
import { TokenFilterBottomSheet } from '../../../components/UI/Tokens/TokensBottomSheet/TokenFilterBottomSheet';
import NetworkManager from '../../../components/UI/NetworkManager';
import AccountConnect from '../../../components/Views/AccountConnect';
import AccountPermissions from '../../../components/Views/AccountPermissions';
import { AccountPermissionsScreens } from '../../../components/Views/AccountPermissions/AccountPermissions.types';
import AccountPermissionsConfirmRevokeAll from '../../../components/Views/AccountPermissions/AccountPermissionsConfirmRevokeAll';
import ConnectionDetails from '../../../components/Views/AccountPermissions/ConnectionDetails';
import { SRPQuiz } from '../../Views/Quiz';
import { TurnOffRememberMeModal } from '../../../components/UI/TurnOffRememberMeModal';
import AssetHideConfirmation from '../../Views/AssetHideConfirmation';
import DetectedTokens from '../../Views/DetectedTokens';
import DetectedTokensConfirmation from '../../Views/DetectedTokensConfirmation';
import AssetOptions from '../../Views/AssetOptions';
import ImportPrivateKey from '../../Views/ImportPrivateKey';
import ImportPrivateKeySuccess from '../../Views/ImportPrivateKeySuccess';
import ConnectQRHardware from '../../Views/ConnectQRHardware';
import SelectHardwareWallet from '../../Views/ConnectHardware/SelectHardware';
import { AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS } from '../../../constants/error';
import { UpdateNeeded } from '../../../components/UI/UpdateNeeded';
import NetworkSettings from '../../Views/Settings/NetworksSettings/NetworkSettings';
import ModalMandatory from '../../../component-library/components/Modals/ModalMandatory';
import { RestoreWallet } from '../../Views/RestoreWallet';
import WalletRestored from '../../Views/RestoreWallet/WalletRestored';
import WalletResetNeeded from '../../Views/RestoreWallet/WalletResetNeeded';
import SDKLoadingModal from '../../Views/SDK/SDKLoadingModal/SDKLoadingModal';
import SDKFeedbackModal from '../../Views/SDK/SDKFeedbackModal/SDKFeedbackModal';
import LedgerMessageSignModal from '../../UI/LedgerModals/LedgerMessageSignModal';
import LedgerTransactionModal from '../../UI/LedgerModals/LedgerTransactionModal';
import AccountActions from '../../../components/Views/AccountActions';
import FiatOnTestnetsFriction from '../../../components/Views/Settings/AdvancedSettings/FiatOnTestnetsFriction';
import WalletActions from '../../Views/WalletActions';
import FundActionMenu from '../../UI/FundActionMenu';
import NetworkSelector from '../../../components/Views/NetworkSelector';
import ReturnToAppModal from '../../Views/ReturnToAppModal';
import EditAccountName from '../../Views/EditAccountName/EditAccountName';
import LegacyEditMultichainAccountName from '../../Views/MultichainAccounts/sheets/EditAccountName';
import { EditMultichainAccountName } from '../../Views/MultichainAccounts/sheets/EditMultichainAccountName';
import { PPOMView } from '../../../lib/ppom/PPOMView';
import LockScreen from '../../Views/LockScreen';
import StorageWrapper from '../../../store/storage-wrapper';
import ShowIpfsGatewaySheet from '../../Views/ShowIpfsGatewaySheet/ShowIpfsGatewaySheet';
import ShowDisplayNftMediaSheet from '../../Views/ShowDisplayMediaNFTSheet/ShowDisplayNFTMediaSheet';
import AmbiguousAddressSheet from '../../../../app/components/Views/Settings/Contacts/AmbiguousAddressSheet/AmbiguousAddressSheet';
import SDKDisconnectModal from '../../Views/SDK/SDKDisconnectModal/SDKDisconnectModal';
import SDKSessionModal from '../../Views/SDK/SDKSessionModal/SDKSessionModal';
import ExperienceEnhancerModal from '../../../../app/components/Views/ExperienceEnhancerModal';
import { MetaMetrics } from '../../../core/Analytics';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import LedgerSelectAccount from '../../Views/LedgerSelectAccount';
import OnboardingSuccess from '../../Views/OnboardingSuccess';
import DefaultSettings from '../../Views/OnboardingSuccess/DefaultSettings';
import OnboardingGeneralSettings from '../../Views/OnboardingSuccess/OnboardingGeneralSettings';
import OnboardingAssetsSettings from '../../Views/OnboardingSuccess/OnboardingAssetsSettings';
import OnboardingSecuritySettings from '../../Views/OnboardingSuccess/OnboardingSecuritySettings';
import BasicFunctionalityModal from '../../UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal';
import PermittedNetworksInfoSheet from '../../Views/AccountPermissions/PermittedNetworksInfoSheet/PermittedNetworksInfoSheet';
import ResetNotificationsModal from '../../UI/Notification/ResetNotificationsModal';
import NFTAutoDetectionModal from '../../../../app/components/Views/NFTAutoDetectionModal/NFTAutoDetectionModal';
import WhatsNewModal from '../../UI/WhatsNewModal';
import NftOptions from '../../../components/Views/NftOptions';
import ShowTokenIdSheet from '../../../components/Views/ShowTokenIdSheet';
import OriginSpamModal from '../../Views/OriginSpamModal/OriginSpamModal';
import MaxBrowserTabsModal from '../../Views/Browser/MaxBrowserTabsModal';
import { isNetworkUiRedesignEnabled } from '../../../util/networks/isNetworkUiRedesignEnabled';
import ChangeInSimulationModal from '../../Views/ChangeInSimulationModal/ChangeInSimulationModal';
import TooltipModal from '../../../components/Views/TooltipModal';
import OptionsSheet from '../../UI/SelectOptionSheet/OptionsSheet';
import FoxLoader from '../../../components/UI/FoxLoader';
import MultiRpcModal from '../../../components/Views/MultiRpcModal/MultiRpcModal';
import Engine from '../../../core/Engine';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { PopularList } from '../../../util/networks/customNetworks';
import { RpcEndpointType } from '@metamask/network-controller';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../util/trace';
import getUIStartupSpan from '../../../core/Performance/UIStartup';
import {
  selectUserLoggedIn,
  selectExistingUser,
} from '../../../reducers/user/selectors';
import { Confirm } from '../../Views/confirmations/components/confirm';
import ImportNewSecretRecoveryPhrase from '../../Views/ImportNewSecretRecoveryPhrase';
import { SelectSRPBottomSheet } from '../../Views/SelectSRP/SelectSRPBottomSheet';
import AccountStatus from '../../Views/AccountStatus';
import OnboardingSheet from '../../Views/OnboardingSheet';
import SeedphraseModal from '../../UI/SeedphraseModal';
import SkipAccountSecurityModal from '../../UI/SkipAccountSecurityModal';
import SuccessErrorSheet from '../../Views/SuccessErrorSheet';
import ConfirmTurnOnBackupAndSyncModal from '../../UI/Identity/ConfirmTurnOnBackupAndSyncModal/ConfirmTurnOnBackupAndSyncModal';
import AddNewAccountBottomSheet from '../../Views/AddNewAccount/AddNewAccountBottomSheet';
import SwitchAccountTypeModal from '../../Views/confirmations/components/modals/switch-account-type-modal';
import { AccountDetails } from '../../Views/MultichainAccounts/AccountDetails/AccountDetails';
import { AccountGroupDetails } from '../../Views/MultichainAccounts/AccountGroupDetails/AccountGroupDetails';
import ShareAddress from '../../Views/MultichainAccounts/sheets/ShareAddress';
import { ShareAddressQR } from '../../Views/MultichainAccounts/sheets/ShareAddressQR/ShareAddressQR';
import DeleteAccount from '../../Views/MultichainAccounts/sheets/DeleteAccount';
import RevealPrivateKey from '../../Views/MultichainAccounts/sheets/RevealPrivateKey';
import RevealSRP from '../../Views/MultichainAccounts/sheets/RevealSRP';
import { DeepLinkModal } from '../../UI/DeepLinkModal';
import { WalletDetails } from '../../Views/MultichainAccounts/WalletDetails/WalletDetails';
import { AddressList as MultichainAccountAddressList } from '../../Views/MultichainAccounts/AddressList';
import { PrivateKeyList as MultichainAccountPrivateKeyList } from '../../Views/MultichainAccounts/PrivateKeyList';
import MultichainAccountActions from '../../Views/MultichainAccounts/sheets/MultichainAccountActions/MultichainAccountActions';
import useInterval from '../../hooks/useInterval';
import { Duration } from '@metamask/utils';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';
import { SmartAccountUpdateModal } from '../../Views/confirmations/components/smart-account-update-modal';
import { PayWithModal } from '../../Views/confirmations/components/modals/pay-with-modal/pay-with-modal';
import { PayWithNetworkModal } from '../../Views/confirmations/components/modals/pay-with-network-modal/pay-with-network-modal';
import { useMetrics } from '../../hooks/useMetrics';
import { SmartAccountModal } from '../../Views/MultichainAccounts/AccountDetails/components/SmartAccountModal/SmartAccountModal';

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

const Stack = createStackNavigator();

const AccountAlreadyExists = () => <AccountStatus type="found" />;

const AccountNotFound = () => <AccountStatus type="not_exist" />;

const OnboardingSuccessFlow = () => (
  <Stack.Navigator initialRouteName={Routes.ONBOARDING.SUCCESS}>
    <Stack.Screen
      name={Routes.ONBOARDING.SUCCESS}
      component={OnboardingSuccess} // Used in SRP flow
    />
    <Stack.Screen
      name={Routes.ONBOARDING.DEFAULT_SETTINGS} // This is being used in import wallet flow
      component={DefaultSettings}
    />
    <Stack.Screen
      name={Routes.ONBOARDING.GENERAL_SETTINGS}
      component={OnboardingGeneralSettings}
    />
    <Stack.Screen
      name={Routes.ONBOARDING.ASSETS_SETTINGS}
      component={OnboardingAssetsSettings}
    />
    <Stack.Screen
      name={Routes.ONBOARDING.SECURITY_SETTINGS}
      component={OnboardingSecuritySettings}
    />
  </Stack.Navigator>
);

/**
 * Stack navigator responsible for the onboarding process
 * Create Wallet and Import from Secret Recovery Phrase
 */
const OnboardingNav = () => (
  <Stack.Navigator initialRouteName="OnboardingCarousel">
    <Stack.Screen name="Onboarding" component={Onboarding} />
    <Stack.Screen name="OnboardingCarousel" component={OnboardingCarousel} />
    <Stack.Screen name="ChoosePassword" component={ChoosePassword} />
    <Stack.Screen
      name="AccountBackupStep1"
      component={AccountBackupStep1}
      options={{ headerShown: false, gestureEnabled: false }}
    />
    <Stack.Screen name="AccountBackupStep1B" component={AccountBackupStep1B} />
    <Stack.Screen
      name={Routes.ONBOARDING.SUCCESS_FLOW}
      component={OnboardingSuccessFlow}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name={Routes.ONBOARDING.SUCCESS}
      component={OnboardingSuccess} // Used in SRP flow
    />
    <Stack.Screen
      name={Routes.ONBOARDING.DEFAULT_SETTINGS} // This is being used in import wallet flow
      component={DefaultSettings}
    />
    <Stack.Screen name="ManualBackupStep1" component={ManualBackupStep1} />
    <Stack.Screen name="ManualBackupStep2" component={ManualBackupStep2} />
    <Stack.Screen name="ManualBackupStep3" component={ManualBackupStep3} />
    <Stack.Screen
      name={Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE}
      component={ImportFromSecretRecoveryPhrase}
    />
    <Stack.Screen
      name="OptinMetrics"
      component={OptinMetrics}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="AccountStatus"
      component={AccountStatus}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="AccountAlreadyExists"
      component={AccountAlreadyExists}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="AccountNotFound"
      component={AccountNotFound}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Rehydrate"
      component={Login}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

/**
 * Parent Stack navigator that allows the
 * child OnboardingNav navigator to push modals on top of it
 */
const SimpleWebviewScreen = () => (
  <Stack.Navigator mode={'modal'}>
    <Stack.Screen name={Routes.WEBVIEW.SIMPLE} component={SimpleWebview} />
  </Stack.Navigator>
);

const OnboardingRootNav = () => (
  <Stack.Navigator
    initialRouteName={Routes.ONBOARDING.NAV}
    mode="modal"
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen name="OnboardingNav" component={OnboardingNav} />
    <Stack.Screen name={Routes.QR_TAB_SWITCHER} component={QRTabSwitcher} />
    <Stack.Screen name={Routes.WEBVIEW.MAIN} component={SimpleWebviewScreen} />
  </Stack.Navigator>
);

const VaultRecoveryFlow = () => (
  <Stack.Navigator
    initialRouteName={Routes.VAULT_RECOVERY.RESTORE_WALLET}
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen
      name={Routes.VAULT_RECOVERY.RESTORE_WALLET}
      component={RestoreWallet}
    />
    <Stack.Screen
      name={Routes.VAULT_RECOVERY.WALLET_RESTORED}
      component={WalletRestored}
    />
    <Stack.Screen
      name={Routes.VAULT_RECOVERY.WALLET_RESET_NEEDED}
      component={WalletResetNeeded}
    />
  </Stack.Navigator>
);

const AddNetworkFlow = () => {
  const route = useRoute();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AddNetwork"
        component={NetworkSettings}
        initialParams={route?.params}
      />
    </Stack.Navigator>
  );
};

const DetectedTokensFlow = () => (
  <Stack.Navigator
    mode={'modal'}
    screenOptions={clearStackNavigatorOptions}
    initialRouteName={'DetectedTokens'}
  >
    <Stack.Screen name={'DetectedTokens'} component={DetectedTokens} />
    <Stack.Screen
      name={'DetectedTokensConfirmation'}
      component={DetectedTokensConfirmation}
    />
  </Stack.Navigator>
);

interface RootModalFlowProps {
  route: {
    params: Record<string, unknown>;
  };
}
const RootModalFlow = (props: RootModalFlowProps) => (
  <Stack.Navigator mode={'modal'} screenOptions={clearStackNavigatorOptions}>
    <Stack.Screen
      name={Routes.MODAL.WALLET_ACTIONS}
      component={WalletActions}
    />
    <Stack.Screen
      name={Routes.MODAL.FUND_ACTION_MENU}
      component={FundActionMenu}
    />
    <Stack.Screen
      name={Routes.MODAL.DELETE_WALLET}
      component={DeleteWalletModal}
    />
    <Stack.Screen
      name={Routes.MODAL.MODAL_CONFIRMATION}
      component={ModalConfirmation}
    />
    <Stack.Screen
      name={Routes.MODAL.MODAL_MANDATORY}
      component={ModalMandatory}
    />
    <Stack.Screen
      name={Routes.SHEET.ONBOARDING_SHEET}
      component={OnboardingSheet}
    />
    <Stack.Screen
      name={Routes.SHEET.SEEDPHRASE_MODAL}
      component={SeedphraseModal}
    />
    <Stack.Screen
      name={Routes.SHEET.SKIP_ACCOUNT_SECURITY_MODAL}
      component={SkipAccountSecurityModal}
    />
    <Stack.Screen
      name={Routes.SHEET.SUCCESS_ERROR_SHEET}
      component={SuccessErrorSheet}
    />
    <Stack.Screen
      name={Routes.SHEET.ACCOUNT_SELECTOR}
      component={AccountSelector}
    />
    <Stack.Screen
      name={Routes.SHEET.ADDRESS_SELECTOR}
      component={AddressSelector}
    />
    <Stack.Screen
      name={Routes.SHEET.ADD_ACCOUNT}
      component={AddNewAccountBottomSheet}
    />
    <Stack.Screen name={Routes.SHEET.SDK_LOADING} component={SDKLoadingModal} />
    <Stack.Screen
      name={Routes.SHEET.SDK_FEEDBACK}
      component={SDKFeedbackModal}
    />
    <Stack.Screen
      name={Routes.SHEET.SDK_MANAGE_CONNECTIONS}
      component={SDKSessionModal}
    />
    <Stack.Screen
      name={Routes.SHEET.EXPERIENCE_ENHANCER}
      component={ExperienceEnhancerModal}
    />
    <Stack.Screen
      name={Routes.SHEET.DATA_COLLECTION}
      component={DataCollectionModal}
    />
    <Stack.Screen
      name={Routes.SHEET.SDK_DISCONNECT}
      component={SDKDisconnectModal}
    />
    <Stack.Screen
      name={Routes.SHEET.ACCOUNT_CONNECT}
      component={AccountConnect}
    />
    <Stack.Screen
      name={Routes.SHEET.ACCOUNT_PERMISSIONS}
      component={AccountPermissions}
      initialParams={{ initialScreen: AccountPermissionsScreens.Connected }}
    />
    <Stack.Screen
      name={Routes.SHEET.REVOKE_ALL_ACCOUNT_PERMISSIONS}
      component={AccountPermissionsConfirmRevokeAll}
    />
    <Stack.Screen
      name={Routes.SHEET.CONNECTION_DETAILS}
      component={ConnectionDetails}
    />
    <Stack.Screen
      name={Routes.SHEET.PERMITTED_NETWORKS_INFO_SHEET}
      component={PermittedNetworksInfoSheet}
    />
    <Stack.Screen
      name={Routes.SHEET.NETWORK_SELECTOR}
      component={NetworkSelector}
    />
    <Stack.Screen
      name={Routes.SHEET.TOKEN_SORT}
      component={TokenSortBottomSheet}
    />
    <Stack.Screen
      name={Routes.SHEET.TOKEN_FILTER}
      component={TokenFilterBottomSheet}
    />
    <Stack.Screen
      name={Routes.SHEET.NETWORK_MANAGER}
      component={NetworkManager}
    />
    <Stack.Screen
      name={Routes.SHEET.BASIC_FUNCTIONALITY}
      component={BasicFunctionalityModal}
    />
    <Stack.Screen
      name={Routes.SHEET.CONFIRM_TURN_ON_BACKUP_AND_SYNC}
      component={ConfirmTurnOnBackupAndSyncModal}
    />
    <Stack.Screen
      name={Routes.SHEET.RESET_NOTIFICATIONS}
      component={ResetNotificationsModal}
    />
    <Stack.Screen
      name={Routes.SHEET.RETURN_TO_DAPP_MODAL}
      component={ReturnToAppModal}
    />
    <Stack.Screen
      name={Routes.SHEET.AMBIGUOUS_ADDRESS}
      component={AmbiguousAddressSheet}
    />
    <Stack.Screen
      name={Routes.MODAL.TURN_OFF_REMEMBER_ME}
      component={TurnOffRememberMeModal}
    />
    <Stack.Screen
      name={'AssetHideConfirmation'}
      component={AssetHideConfirmation}
    />
    <Stack.Screen name={'DetectedTokens'} component={DetectedTokensFlow} />
    <Stack.Screen name={'AssetOptions'} component={AssetOptions} />
    <Stack.Screen name={'NftOptions'} component={NftOptions} />
    <Stack.Screen name={Routes.MODAL.UPDATE_NEEDED} component={UpdateNeeded} />
    {
      <Stack.Screen
        name={Routes.SHEET.SELECT_SRP}
        component={SelectSRPBottomSheet}
      />
    }
    <Stack.Screen
      name={Routes.MODAL.SRP_REVEAL_QUIZ}
      component={SRPQuiz}
      initialParams={{ ...props.route.params }}
    />
    <Stack.Screen
      name={Routes.SHEET.ACCOUNT_ACTIONS}
      component={AccountActions}
    />
    <Stack.Screen
      name={Routes.SHEET.FIAT_ON_TESTNETS_FRICTION}
      component={FiatOnTestnetsFriction}
    />
    <Stack.Screen
      name={Routes.SHEET.SHOW_IPFS}
      component={ShowIpfsGatewaySheet}
    />
    <Stack.Screen
      name={Routes.SHEET.SHOW_NFT_DISPLAY_MEDIA}
      component={ShowDisplayNftMediaSheet}
    />
    <Stack.Screen
      name={Routes.MODAL.NFT_AUTO_DETECTION_MODAL}
      component={NFTAutoDetectionModal}
    />
    <Stack.Screen name={Routes.MODAL.WHATS_NEW} component={WhatsNewModal} />
    {isNetworkUiRedesignEnabled() ? (
      <Stack.Screen
        name={Routes.MODAL.MULTI_RPC_MIGRATION_MODAL}
        component={MultiRpcModal}
      />
    ) : null}
    <Stack.Screen
      name={Routes.SHEET.SHOW_TOKEN_ID}
      component={ShowTokenIdSheet}
    />
    <Stack.Screen
      name={Routes.SHEET.ORIGIN_SPAM_MODAL}
      component={OriginSpamModal}
    />
    <Stack.Screen
      name={Routes.SHEET.CHANGE_IN_SIMULATION_MODAL}
      component={ChangeInSimulationModal}
    />
    <Stack.Screen name={Routes.SHEET.TOOLTIP_MODAL} component={TooltipModal} />
    <Stack.Screen
      name={Routes.MODAL.DEEP_LINK_MODAL}
      component={DeepLinkModal}
    />
  </Stack.Navigator>
);

const ImportPrivateKeyView = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="ImportPrivateKey" component={ImportPrivateKey} />
    <Stack.Screen
      name="ImportPrivateKeySuccess"
      component={ImportPrivateKeySuccess}
    />
    <Stack.Screen name={Routes.QR_TAB_SWITCHER} component={QRTabSwitcher} />
  </Stack.Navigator>
);

const ImportSRPView = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen
      name={Routes.MULTI_SRP.IMPORT}
      component={ImportNewSecretRecoveryPhrase}
    />
  </Stack.Navigator>
);

const ConnectQRHardwareFlow = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="ConnectQRHardware" component={ConnectQRHardware} />
  </Stack.Navigator>
);

const LedgerConnectFlow = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
    initialRouteName={Routes.HW.LEDGER_CONNECT}
  >
    <Stack.Screen
      name={Routes.HW.LEDGER_CONNECT}
      component={LedgerSelectAccount}
    />
  </Stack.Navigator>
);

const ConnectHardwareWalletFlow = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.HW.SELECT_DEVICE}
      component={SelectHardwareWallet}
    />
  </Stack.Navigator>
);

const MultichainAccountDetails = () => {
  const route = useRoute();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: false,
      }}
    >
      <Stack.Screen
        name={Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_DETAILS}
        component={AccountDetails}
        initialParams={route?.params}
      />
      <Stack.Screen
        name="SmartAccountDetails"
        component={SmartAccountModal}
        options={{
          headerShown: false,
          animationEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
};

const MultichainAccountGroupDetails = () => {
  const route = useRoute();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: false,
      }}
    >
      <Stack.Screen
        name={Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_GROUP_DETAILS}
        component={AccountGroupDetails}
        initialParams={route?.params}
      />
      <Stack.Screen
        name="SmartAccountDetails"
        component={SmartAccountModal}
        options={{
          headerShown: false,
          animationEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
};

const MultichainAccountDetailsActions = () => {
  const route = useRoute();

  // Configure transparent background to show AccountDetails screen beneath modal overlays
  const commonScreenOptions = {
    //Refer to - https://reactnavigation.org/docs/stack-navigator/#animations
    cardStyle: { backgroundColor: importedColors.transparent },
    cardStyleInterpolator: () => ({
      overlayStyle: {
        opacity: 0,
      },
    }),
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: false,
      }}
    >
      <Stack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.ACCOUNT_ACTIONS}
        component={MultichainAccountActions}
        initialParams={route?.params}
        options={commonScreenOptions}
      />
      <Stack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.EDIT_ACCOUNT_NAME}
        component={EditMultichainAccountName}
        initialParams={route?.params}
        options={commonScreenOptions}
      />
      <Stack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.LEGACY_EDIT_ACCOUNT_NAME}
        component={LegacyEditMultichainAccountName}
        initialParams={route?.params}
        options={commonScreenOptions}
      />
      <Stack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS}
        component={ShareAddress}
        initialParams={route?.params}
        options={commonScreenOptions}
      />
      <Stack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR}
        component={ShareAddressQR}
        initialParams={route?.params}
        options={commonScreenOptions}
      />
      <Stack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.DELETE_ACCOUNT}
        component={DeleteAccount}
        initialParams={route?.params}
        options={commonScreenOptions}
      />
      <Stack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SRP_REVEAL_QUIZ}
        component={SRPQuiz}
        initialParams={route?.params}
        options={commonScreenOptions}
      />
      <Stack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.REVEAL_PRIVATE_CREDENTIAL}
        component={RevealPrivateKey}
        initialParams={route?.params}
      />
      <Stack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.REVEAL_SRP_CREDENTIAL}
        component={RevealSRP}
        initialParams={route?.params}
      />
    </Stack.Navigator>
  );
};

const MultichainWalletDetails = () => {
  const route = useRoute();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: false,
      }}
    >
      <Stack.Screen
        name={Routes.MULTICHAIN_ACCOUNTS.WALLET_DETAILS}
        component={WalletDetails}
        initialParams={route?.params}
      />
    </Stack.Navigator>
  );
};

const MultichainAddressList = () => {
  const route = useRoute();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: false,
      }}
    >
      <Stack.Screen
        name={Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST}
        component={MultichainAccountAddressList}
        initialParams={route?.params}
      />
    </Stack.Navigator>
  );
};

const MultichainPrivateKeyList = () => {
  const route = useRoute();

  return (
    <Stack.Navigator screenOptions={clearStackNavigatorOptions} mode={'modal'}>
      <Stack.Screen
        name={Routes.MULTICHAIN_ACCOUNTS.PRIVATE_KEY_LIST}
        component={MultichainAccountPrivateKeyList}
        initialParams={route?.params}
      />
    </Stack.Navigator>
  );
};

const ModalConfirmationRequest = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: importedColors.transparent },
    }}
    mode={'modal'}
  >
    <Stack.Screen
      name={Routes.CONFIRMATION_REQUEST_MODAL}
      component={Confirm}
    />
  </Stack.Navigator>
);

const ModalSwitchAccountType = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: importedColors.transparent },
    }}
    mode={'modal'}
  >
    <Stack.Screen
      name={Routes.CONFIRMATION_SWITCH_ACCOUNT_TYPE}
      component={SwitchAccountTypeModal}
    />
  </Stack.Navigator>
);

const ModalSmartAccountOptIn = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: importedColors.transparent },
    }}
    mode={'modal'}
  >
    <Stack.Screen
      name={Routes.SMART_ACCOUNT_OPT_IN}
      component={SmartAccountUpdateModal}
    />
  </Stack.Navigator>
);

const AppFlow = () => {
  const userLoggedIn = useSelector(selectUserLoggedIn);

  return (
    <>
      <Stack.Navigator
        initialRouteName={Routes.FOX_LOADER}
        mode={'modal'}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: importedColors.transparent },
          animationEnabled: false,
        }}
      >
        {userLoggedIn && (
          // Render only if wallet is unlocked
          // Note: This is probably not needed but nice to ensure that wallet isn't accessible when it is locked
          <Stack.Screen
            name={Routes.ONBOARDING.HOME_NAV}
            component={Main}
            options={{ headerShown: false }}
          />
        )}
        <Stack.Screen name={Routes.FOX_LOADER} component={FoxLoader} />
        <Stack.Screen
          name={Routes.ONBOARDING.LOGIN}
          component={Login}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.MODAL.MAX_BROWSER_TABS_MODAL}
          component={MaxBrowserTabsModal}
        />
        <Stack.Screen
          name="OnboardingRootNav"
          component={OnboardingRootNav}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.ONBOARDING.SUCCESS_FLOW}
          component={OnboardingSuccessFlow}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.VAULT_RECOVERY.RESTORE_WALLET}
          component={VaultRecoveryFlow}
        />
        <Stack.Screen
          name={Routes.MODAL.ROOT_MODAL_FLOW}
          component={RootModalFlow}
        />
        <Stack.Screen
          name="ImportPrivateKeyView"
          component={ImportPrivateKeyView}
          options={{ animationEnabled: true }}
        />
        {
          <Stack.Screen
            name="ImportSRPView"
            component={ImportSRPView}
            options={{ animationEnabled: true }}
          />
        }
        <Stack.Screen
          name="ConnectQRHardwareFlow"
          component={ConnectQRHardwareFlow}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen
          name={Routes.HW.CONNECT_LEDGER}
          component={LedgerConnectFlow}
        />
        <Stack.Screen
          name={Routes.HW.CONNECT}
          component={ConnectHardwareWalletFlow}
        />
        <Stack.Screen
          name={Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_DETAILS}
          component={MultichainAccountDetails}
        />
        <Stack.Screen
          name={Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_GROUP_DETAILS}
          component={MultichainAccountGroupDetails}
        />
        <Stack.Screen
          name={Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_CELL_ACTIONS}
          component={MultichainAccountActions}
        />
        <Stack.Screen
          name={Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS}
          component={MultichainAccountDetailsActions}
        />
        <Stack.Screen
          name={Routes.MULTICHAIN_ACCOUNTS.WALLET_DETAILS}
          component={MultichainWalletDetails}
        />
        <Stack.Screen
          name={Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST}
          component={MultichainAddressList}
        />
        <Stack.Screen
          name={Routes.MULTICHAIN_ACCOUNTS.PRIVATE_KEY_LIST}
          component={MultichainPrivateKeyList}
        />
        <Stack.Screen
          options={{
            //Refer to - https://reactnavigation.org/docs/stack-navigator/#animations
            cardStyle: { backgroundColor: importedColors.transparent },
            cardStyleInterpolator: () => ({
              overlayStyle: {
                opacity: 0,
              },
            }),
          }}
          name={Routes.LEDGER_TRANSACTION_MODAL}
          component={LedgerTransactionModal}
        />
        <Stack.Screen
          options={{
            //Refer to - https://reactnavigation.org/docs/stack-navigator/#animations
            cardStyle: { backgroundColor: importedColors.transparent },
            cardStyleInterpolator: () => ({
              overlayStyle: {
                opacity: 0,
              },
            }),
          }}
          name={Routes.LEDGER_MESSAGE_SIGN_MODAL}
          component={LedgerMessageSignModal}
        />
        <Stack.Screen name={Routes.OPTIONS_SHEET} component={OptionsSheet} />
        <Stack.Screen
          name={Routes.EDIT_ACCOUNT_NAME}
          component={EditAccountName}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen
          name={Routes.ADD_NETWORK}
          component={AddNetworkFlow}
          options={{ animationEnabled: true }}
        />
        {isNetworkUiRedesignEnabled() ? (
          <Stack.Screen
            name={Routes.EDIT_NETWORK}
            component={AddNetworkFlow}
            options={{ animationEnabled: true }}
          />
        ) : null}
        <Stack.Screen
          name={Routes.LOCK_SCREEN}
          component={LockScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name={Routes.CONFIRMATION_REQUEST_MODAL}
          component={ModalConfirmationRequest}
        />
        <Stack.Screen
          name={Routes.CONFIRMATION_SWITCH_ACCOUNT_TYPE}
          component={ModalSwitchAccountType}
        />
        <Stack.Screen
          name={Routes.SMART_ACCOUNT_OPT_IN}
          component={ModalSmartAccountOptIn}
        />
        <Stack.Screen
          name={Routes.CONFIRMATION_PAY_WITH_MODAL}
          component={PayWithModal}
        />
        <Stack.Screen
          name={Routes.CONFIRMATION_PAY_WITH_NETWORK_MODAL}
          component={PayWithNetworkModal}
        />
      </Stack.Navigator>
    </>
  );
};

const App: React.FC = () => {
  const navigation = useNavigation();
  const routes = useNavigationState((state) => state.routes);
  const { toastRef } = useContext(ToastContext);
  const isFirstRender = useRef(true);

  const { isEnabled: checkMetricsEnabled } = useMetrics();

  const isSeedlessOnboardingLoginFlow = useSelector(
    selectSeedlessOnboardingLoginFlow,
  );

  if (isFirstRender.current) {
    trace({
      name: TraceName.NavInit,
      parentContext: getUIStartupSpan(),
      op: TraceOperation.NavInit,
    });

    isFirstRender.current = false;
  }

  useEffect(() => {
    // End trace when first render is complete
    endTrace({ name: TraceName.UIStartup });
  }, []);

  const firstLoad = useRef(true);
  // periodically check seedless password outdated when app UI is open
  useInterval(
    async () => {
      if (isSeedlessOnboardingLoginFlow) {
        await Authentication.checkIsSeedlessPasswordOutdated(
          firstLoad.current,
        ).catch((error) => {
          Logger.error(error, 'App: Error in checkIsSeedlessPasswordOutdated');
        });
        firstLoad.current = false;
      }
    },
    {
      delay: Duration.Minute * 5,
      immediate: true,
    },
  );
  const existingUser = useSelector(selectExistingUser);

  useEffect(() => {
    const appTriggeredAuth = async () => {
      try {
        if (existingUser) {
          // Check if we came from Settings screen to skip auto-authentication
          const previousRoute = routes[routes.length - 2]?.name;

          if (previousRoute === Routes.SETTINGS_VIEW) {
            return;
          }

          // This should only be called if the auth type is not password, which is not the case so consider removing it
          await trace(
            {
              name: TraceName.AppStartBiometricAuthentication,
              op: TraceOperation.BiometricAuthentication,
            },
            async () => {
              await Authentication.appTriggeredAuth();
            },
          );

          const isOptinMetaMetricsUISeen = await StorageWrapper.getItem(
            OPTIN_META_METRICS_UI_SEEN,
          );

          if (!isOptinMetaMetricsUISeen && !checkMetricsEnabled()) {
            const resetParams = {
              routes: [
                {
                  name: Routes.ONBOARDING.ROOT_NAV,
                  params: {
                    screen: Routes.ONBOARDING.NAV,
                    params: {
                      screen: Routes.ONBOARDING.OPTIN_METRICS,
                    },
                  },
                },
              ],
            };
            navigation.reset(resetParams);
          } else {
            navigation.reset({
              routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
            });
          }
        } else {
          navigation.reset({ routes: [{ name: Routes.ONBOARDING.ROOT_NAV }] });
        }
      } catch (error) {
        const errorMessage = (error as Error).message;
        // if there are no credentials, then they were cleared in the last session and we should not show biometrics on the login screen
        const locked =
          errorMessage === AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS;

        // Only call lockApp if there is an existing user to prevent unnecessary calls
        await Authentication.lockApp({ reset: false, locked });
        trackErrorAsAnalytics(
          'App: Max Attempts Reached',
          errorMessage,
          `Unlock attempts: 1`,
        );
        if (locked) {
          Logger.error(
            new Error(errorMessage),
            'Nav/App: Error in appTriggeredAuth:',
          );
        }
        // We are not logging when it's a keychain error
      }
    };
    appTriggeredAuth().catch((error) => {
      Logger.error(error, 'App: Error in appTriggeredAuth');
    });
    // existingUser and isMetaMetricsUISeen are not present in the dependency array because they are not needed to re-run the effect when they change and it will cause a bug.
  }, [navigation]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const initMetrics = async () => {
      await MetaMetrics.getInstance().configure();
    };

    initMetrics().catch((err) => {
      Logger.error(err, 'Error initializing MetaMetrics');
    });
  }, []);

  useEffect(() => {
    async function startApp() {
      if (!existingUser) {
        // List of chainIds to add (as hex strings)
        const chainIdsToAdd: `0x${string}`[] = [
          CHAIN_IDS.ARBITRUM,
          CHAIN_IDS.BASE,
          CHAIN_IDS.BSC,
          CHAIN_IDS.OPTIMISM,
          CHAIN_IDS.POLYGON,
        ];

        // Filter the PopularList to get only the specified networks based on chainId
        const selectedNetworks = PopularList.filter((network) =>
          chainIdsToAdd.includes(network.chainId),
        );
        const { NetworkController } = Engine.context;

        // Loop through each selected network and call NetworkController.addNetwork
        for (const network of selectedNetworks) {
          try {
            await NetworkController.addNetwork({
              chainId: network.chainId,
              blockExplorerUrls: [network.rpcPrefs.blockExplorerUrl],
              defaultRpcEndpointIndex: 0,
              defaultBlockExplorerUrlIndex: 0,
              name: network.nickname,
              nativeCurrency: network.ticker,
              rpcEndpoints: [
                {
                  url: network.rpcUrl,
                  failoverUrls: network.failoverRpcUrls,
                  name: network.nickname,
                  type: RpcEndpointType.Custom,
                },
              ],
            });
          } catch (error) {
            Logger.error(error as Error);
          }
        }
      }

      try {
        const currentVersion = getVersion();
        const savedVersion = await StorageWrapper.getItem(CURRENT_APP_VERSION);

        if (currentVersion !== savedVersion) {
          if (savedVersion)
            await StorageWrapper.setItem(LAST_APP_VERSION, savedVersion);
          await StorageWrapper.setItem(CURRENT_APP_VERSION, currentVersion);
        }
        const lastVersion = await StorageWrapper.getItem(LAST_APP_VERSION);
        if (!lastVersion) {
          if (existingUser) {
            // Setting last version to first version if user exists and lastVersion does not, to simulate update
            await StorageWrapper.setItem(LAST_APP_VERSION, '0.0.1');
          } else {
            // Setting last version to current version so that it's not treated as an update
            await StorageWrapper.setItem(LAST_APP_VERSION, currentVersion);
          }
        }
      } catch (error) {
        Logger.error(error as Error);
      }
    }

    startApp().catch((error) => {
      Logger.error(error, 'Error starting app');
    });
    // existingUser is not present in the dependency array because it is not needed to re-run the effect when it changes and it will cause a bug.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PPOMView />
      <AppFlow />
      <Toast ref={toastRef} />
      <ProfilerManager />
    </>
  );
};

export default App;
