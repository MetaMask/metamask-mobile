import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import Login from '../../Views/Login';
import OAuthRehydration from '../../Views/OAuthRehydration';
import QRTabSwitcher from '../../Views/QRTabSwitcher';
import VerificationCodeBottomSheet from '../../Views/AddDeviceToWallet/VerificationCodeBottomSheet';
import DataCollectionModal from '../../Views/DataCollectionModal';
import Onboarding from '../../Views/Onboarding';
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
import OnboardingInterestQuestionnaire from '../../Views/OnboardingInterestQuestionnaire';
import OnboardingCryptoExperienceQuestionnaire from '../../Views/OnboardingCryptoExperienceQuestionnaire/OnboardingCryptoExperienceQuestionnaire';
import SimpleWebview from '../../Views/SimpleWebview';
import AgenticCliDashboardWebview from '../../Views/AgenticCliDashboardWebview';
import Logger from '../../../util/Logger';
import { useSelector } from 'react-redux';
import {
  CURRENT_APP_VERSION,
  LAST_APP_VERSION,
} from '../../../constants/storage';
import { getVersion } from 'react-native-device-info';
import { Authentication } from '../../../core/';
import { colors as importedColors } from '../../../styles/common';
import Routes from '../../../constants/navigation/Routes';
import {
  addDeviceVerificationCodeScreenOptions,
  clearNativeStackNavigatorOptions,
  slideFromRightNativeOptions,
} from '../../../constants/navigation/clearStackNavigatorOptions';
import ModalConfirmation from '../../../component-library/components/Modals/ModalConfirmation';
import Toast, {
  ToastContext,
} from '../../../component-library/components/Toast';
import AgentStepHud from '../../../dev-tools/AgenticService/AgentStepHud';
import PerpsWebSocketHealthToast, {
  WebSocketHealthToastProvider,
} from '../../UI/Perps/components/PerpsWebSocketHealthToast';
import { ControllerEventToastBridge } from './ControllerEventToastBridge';
import { usePredictToastRegistrations } from '../../UI/Predict/hooks/usePredictToastRegistrations';
import { usePerpsWithdrawToastRegistrations } from '../../UI/Perps/hooks/usePerpsWithdrawToastRegistrations';
import { useQuickBuyToastRegistrations } from '../../Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/hooks/useQuickBuyToastRegistrations';
import AccountSelector from '../../../components/Views/AccountSelector';
import AddressSelector from '../../../components/Views/AddressSelector';
import AddWallet from '../../../components/Views/AddWallet';
import { TokenSortBottomSheet } from '../../UI/Tokens/TokenSortBottomSheet/TokenSortBottomSheet';
import ProfilerManager from '../../../components/UI/ProfilerManager';
import NetworkManager from '../../../components/UI/NetworkManager';
import { AccountPermissionsScreens } from '../../../components/Views/AccountPermissions/AccountPermissions.types';
import AccountPermissionsConfirmRevokeAll from '../../../components/Views/AccountPermissions/AccountPermissionsConfirmRevokeAll';
import ConnectionDetails from '../../../components/Views/AccountPermissions/ConnectionDetails';
import { SRPQuiz } from '../../Views/Quiz';
import { TurnOffRememberMeModal } from '../../../components/UI/TurnOffRememberMeModal';
import AssetHideConfirmation from '../../Views/AssetHideConfirmation';
import ImportPrivateKey from '../../Views/ImportPrivateKey';
import ImportPrivateKeySuccess from '../../Views/ImportPrivateKeySuccess';
import ConnectQRHardware from '../../Views/ConnectQRHardware';
import SelectHardwareWallet from '../../Views/ConnectHardware/SelectHardware';
import { UpdateNeeded } from '../../../components/UI/UpdateNeeded';
import { OTAUpdatesModal } from '../../UI/OTAUpdatesModal';
import NetworkDetailsView from '../../Views/NetworksManagement/NetworkDetailsView';
import ModalMandatory from '../../../component-library/components/Modals/ModalMandatory';
import { RestoreWallet } from '../../Views/RestoreWallet';
import WalletRestored from '../../Views/RestoreWallet/WalletRestored';
import WalletResetNeeded from '../../Views/RestoreWallet/WalletResetNeeded';
import SDKLoadingModal from '../../Views/SDK/SDKLoadingModal/SDKLoadingModal';
import SDKFeedbackModal from '../../Views/SDK/SDKFeedbackModal/SDKFeedbackModal';
import SDKConnectV2OtpModal from '../../Views/SDK/SDKConnectV2OtpModal';
import LedgerMessageSignModal from '../../UI/LedgerModals/LedgerMessageSignModal';
import LedgerTransactionModal from '../../UI/LedgerModals/LedgerTransactionModal';
import QRSigningTransactionModal from '../../UI/QRHardware/QRSigningTransactionModal';
import AccountActions from '../../../components/Views/AccountActions';
import FiatOnTestnetsFriction from '../../../components/Views/Settings/AdvancedSettings/FiatOnTestnetsFriction';
import WalletActions from '../../Views/WalletActions';
import FundActionMenu from '../../UI/FundActionMenu';
import MoreTokenActionsMenu from '../../UI/TokenDetails/components/MoreTokenActionsMenu';
import MAPickerSheet from '../../UI/Charts/AdvancedChart/MAPickerSheet';
import SecurityBadgeBottomSheet from '../../UI/TokenDetails/components/SecurityBadgeBottomSheet';
import NetworkSelector from '../../../components/Views/NetworkSelector';
import ReturnToAppNotification from '../../Views/ReturnToAppNotification';
import EditAccountName from '../../Views/EditAccountName/EditAccountName';
import LegacyEditMultichainAccountName from '../../Views/MultichainAccounts/sheets/EditAccountName';
import { EditMultichainAccountName } from '../../Views/MultichainAccounts/sheets/EditMultichainAccountName';
import LockScreen from '../../Views/LockScreen';
import StorageWrapper from '../../../store/storage-wrapper';
import ShowIpfsGatewaySheet from '../../Views/ShowIpfsGatewaySheet/ShowIpfsGatewaySheet';
import ShowDisplayNftMediaSheet from '../../Views/ShowDisplayMediaNFTSheet/ShowDisplayNFTMediaSheet';
import AmbiguousAddressSheet from '../../../../app/components/Views/Settings/Contacts/AmbiguousAddressSheet/AmbiguousAddressSheet';
import SDKDisconnectModal from '../../Views/SDK/SDKDisconnectModal/SDKDisconnectModal';
import SDKSessionModal from '../../Views/SDK/SDKSessionModal/SDKSessionModal';
import ExperienceEnhancerModal from '../../../../app/components/Views/ExperienceEnhancerModal';
import LedgerSelectAccount from '../../Views/LedgerSelectAccount';
import OnboardingSuccess from '../../Views/OnboardingSuccess';
import WalletCreationError from '../../Views/WalletCreationError';
import DefaultSettings from '../../Views/OnboardingSuccess/DefaultSettings';
import OnboardingGeneralSettings from '../../Views/OnboardingSuccess/OnboardingGeneralSettings';
import OnboardingAssetsSettings from '../../Views/OnboardingSuccess/OnboardingAssetsSettings';
import OnboardingSecuritySettings from '../../Views/OnboardingSuccess/OnboardingSecuritySettings';
import BasicFunctionalityModal from '../../UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal';
import PermittedNetworksInfoSheet from '../../Views/AccountPermissions/PermittedNetworksInfoSheet/PermittedNetworksInfoSheet';
import NFTAutoDetectionModal from '../../../../app/components/Views/NFTAutoDetectionModal/NFTAutoDetectionModal';
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
import { endTrace, TraceName } from '../../../util/trace';
import { selectExistingUser } from '../../../reducers/user/selectors';
import { useTheme } from '../../../util/theme';
import { Confirm } from '../../Views/confirmations/components/confirm';
import { HardwareWalletsSwaps } from '../../UI/HardwareWallet/Swaps/HardwareWalletsSwaps';
import { HwQrScanner } from '../../UI/HardwareWallet/Swaps/HwQrScanner';
import ImportNewSecretRecoveryPhrase from '../../Views/ImportNewSecretRecoveryPhrase';
import { SelectSRPBottomSheet } from '../../Views/SelectSRP/SelectSRPBottomSheet';
import AccountStatus from '../../Views/AccountStatus';
import OnboardingSheet from '../../Views/OnboardingSheet';
import SeedphraseModal from '../../UI/SeedphraseModal';
import SkipAccountSecurityModal from '../../UI/SkipAccountSecurityModal';
import SuccessErrorSheet from '../../Views/SuccessErrorSheet';
import ConfirmTurnOnBackupAndSyncModal from '../../UI/Identity/ConfirmTurnOnBackupAndSyncModal/ConfirmTurnOnBackupAndSyncModal';
import EligibilityFailedModal from '../../UI/Ramp/components/EligibilityFailedModal';
import RampUnsupportedModal from '../../UI/Ramp/components/RampUnsupportedModal';
import RampsServiceDisruptionModal from '../../UI/Ramp/components/RampsServiceDisruptionModal';
import RampsBootstrap from '../../UI/Ramp/RampsBootstrap';
import SwitchAccountTypeModal from '../../Views/confirmations/components/modals/switch-account-type-modal';
import { AccountDetails } from '../../Views/MultichainAccounts/AccountDetails/AccountDetails';
import { AccountGroupDetails } from '../../Views/MultichainAccounts/AccountGroupDetails/AccountGroupDetails';
import ShareAddress from '../../Views/MultichainAccounts/sheets/ShareAddress';
import { ShareAddressQR } from '../../Views/MultichainAccounts/sheets/ShareAddressQR/ShareAddressQR';
import DeleteAccount from '../../Views/MultichainAccounts/sheets/DeleteAccount';
import RevealPrivateKey from '../../Views/MultichainAccounts/sheets/RevealPrivateKey';
import RevealSRP from '../../Views/MultichainAccounts/sheets/RevealSRP';
import { RevealPrivateCredential } from '../../Views/RevealPrivateCredential';
import { DeepLinkModal } from '../../UI/DeepLinkModal';
import MultichainAccountsIntroModal from '../../Views/MultichainAccounts/IntroModal';
import LearnMoreBottomSheet from '../../Views/MultichainAccounts/IntroModal/LearnMoreBottomSheet';
import { WalletDetails } from '../../Views/MultichainAccounts/WalletDetails/WalletDetails';
import Pna25BottomSheet from '../../Views/Pna25BottomSheet';
import { AddressList as MultichainAccountAddressList } from '../../Views/MultichainAccounts/AddressList';
import { PrivateKeyList as MultichainAccountPrivateKeyList } from '../../Views/MultichainAccounts/PrivateKeyList';
import MultichainAccountActions from '../../Views/MultichainAccounts/sheets/MultichainAccountActions/MultichainAccountActions';
import useInterval from '../../hooks/useInterval';
import { Duration } from '@metamask/utils';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';
import { PayWithModal } from '../../Views/confirmations/components/modals/pay-with-modal/pay-with-modal';
import { PayWithBottomSheet } from '../../Views/confirmations/components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet';
import MultichainAccountConnect from '../../Views/MultichainAccounts/MultichainAccountConnect/MultichainAccountConnect';
import { SmartAccountModal } from '../../Views/MultichainAccounts/AccountDetails/components/SmartAccountModal/SmartAccountModal';
import TradeWalletActions from '../../Views/TradeWalletActions';
import { MultichainAccountPermissions } from '../../Views/MultichainAccounts/MultichainAccountPermissions/MultichainAccountPermissions';
import SocialLoginIosUser from '../../Views/SocialLoginIosUser';
import AgenticCliApproval from '../../Views/AgenticCliApproval';
import { useOTAUpdates } from '../../hooks/useOTAUpdates';
import MultichainTransactionDetailsSheet from '../../UI/MultichainTransactionDetailsModal/MultichainTransactionDetailsSheet';
import TransactionDetailsSheet from '../../UI/TransactionElement/TransactionDetailsSheet';
import ImportWalletTipBottomSheet from '../../UI/TransactionElement/ImportWalletTipBottomSheet';
import { AccessRestrictedProvider } from '../../UI/Compliance';
import AddDeviceToWallet from '../../Views/AddDeviceToWallet';

const NativeStack = createNativeStackNavigator();

const accountSelectorTransitionOptions: NativeStackNavigationOptions = {
  animation: 'slide_from_right',
};

const tradeWalletActionsRootModalOptions: NativeStackNavigationOptions = {
  presentation: 'containedTransparentModal',
  animation: 'none',
  contentStyle: { backgroundColor: importedColors.transparent },
  gestureEnabled: false,
};

const isAccountSelectorRootModalRoute = (params: object | undefined) =>
  Boolean(
    params &&
      'screen' in params &&
      params.screen === Routes.SHEET.ACCOUNT_SELECTOR,
  );

const isTradeWalletActionsRootModalRoute = (params: object | undefined) =>
  Boolean(
    params &&
      'screen' in params &&
      params.screen === Routes.MODAL.TRADE_WALLET_ACTIONS,
  );

// Type helper for screen components that use v5 pattern of requiring route props
// In React Navigation v6, screen components should ideally use useRoute() hook,
// but for migration compatibility, we cast these components to satisfy the type checker.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScreenComponent = React.ComponentType<any>;

const SocialLoginSuccessNewUser = () => <SocialLoginIosUser type="new" />;

const SocialLoginSuccessExistingUser = () => (
  <SocialLoginIosUser type="existing" />
);

const OnboardingSuccessFlow = () => {
  const { colors } = useTheme();

  return (
    <NativeStack.Navigator
      initialRouteName={Routes.ONBOARDING.SUCCESS}
      screenOptions={{
        contentStyle: { backgroundColor: colors.background.default },
        headerStyle: { backgroundColor: colors.background.default },
        headerShadowVisible: false,
      }}
    >
      <NativeStack.Screen
        name={Routes.ONBOARDING.SUCCESS}
        component={OnboardingSuccess}
        options={{
          headerShown: false,
        }}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.DEFAULT_SETTINGS}
        component={DefaultSettings}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.GENERAL_SETTINGS}
        component={OnboardingGeneralSettings}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.ASSETS_SETTINGS}
        component={OnboardingAssetsSettings}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.SECURITY_SETTINGS}
        component={OnboardingSecuritySettings}
        options={{ headerShown: false }}
      />
    </NativeStack.Navigator>
  );
};

/**
 * Stack navigator responsible for the onboarding process
 * Create Wallet and Import from Secret Recovery Phrase
 */
const OnboardingNav = () => {
  const { colors } = useTheme();

  return (
    <NativeStack.Navigator
      initialRouteName={'Onboarding'}
      screenOptions={{
        contentStyle: { backgroundColor: colors.background.default },
      }}
    >
      <NativeStack.Screen name="Onboarding" component={Onboarding} />
      <NativeStack.Screen
        name={Routes.ONBOARDING.SOCIAL_LOGIN_SUCCESS_NEW_USER}
        component={SocialLoginSuccessNewUser}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name="ChoosePassword"
        component={ChoosePassword}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name="AccountBackupStep1"
        component={AccountBackupStep1}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <NativeStack.Screen
        name="AccountBackupStep1B"
        component={AccountBackupStep1B}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.SUCCESS_FLOW}
        component={OnboardingSuccessFlow}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.SUCCESS}
        component={OnboardingSuccess}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name="ManualBackupStep1"
        component={ManualBackupStep1}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name="ManualBackupStep2"
        component={ManualBackupStep2}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name="ManualBackupStep3"
        component={ManualBackupStep3}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE}
        component={ImportFromSecretRecoveryPhrase}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.ADD_DEVICE_TO_WALLET}
        component={AddDeviceToWallet}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name="OptinMetrics"
        component={OptinMetrics}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.INTEREST_QUESTIONNAIRE}
        component={OnboardingInterestQuestionnaire}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.CRYPTO_EXPERIENCE_QUESTIONNAIRE}
        component={OnboardingCryptoExperienceQuestionnaire}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <NativeStack.Screen
        name="AccountStatus"
        component={AccountStatus as ScreenComponent}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.SOCIAL_LOGIN_SUCCESS_EXISTING_USER}
        component={SocialLoginSuccessExistingUser}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name="AccountAlreadyExists"
        component={AccountStatus}
        initialParams={{ type: 'found' }}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name="AccountNotFound"
        component={AccountStatus}
        initialParams={{ type: 'not_exist' }}
        options={{ headerShown: false }}
      />
      {/* OAuth rehydration inside onboarding stack (distinct route name from AppFlow). */}
      <NativeStack.Screen
        name={Routes.ONBOARDING.ONBOARDING_OAUTH_REHYDRATE}
        component={OAuthRehydration}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.WALLET_CREATION_ERROR}
        component={WalletCreationError}
        options={{ headerShown: false }}
      />
    </NativeStack.Navigator>
  );
};

/**
 * Parent Stack navigator that allows the
 * child OnboardingNav navigator to push modals on top of it
 */
const SimpleWebviewScreen = () => (
  <NativeStack.Navigator screenOptions={{ headerShown: false }}>
    <NativeStack.Screen
      name={Routes.WEBVIEW.SIMPLE}
      component={SimpleWebview}
    />
  </NativeStack.Navigator>
);

const OnboardingRootNav = () => (
  <NativeStack.Navigator
    initialRouteName={Routes.ONBOARDING.NAV}
    screenOptions={{ headerShown: false }}
  >
    <NativeStack.Screen name="OnboardingNav" component={OnboardingNav} />
    <NativeStack.Screen
      name={Routes.QR_TAB_SWITCHER}
      component={QRTabSwitcher}
      options={{ presentation: 'modal' }}
    />
    <NativeStack.Screen
      name={Routes.SHEET.ADD_DEVICE_VERIFICATION_CODE}
      component={VerificationCodeBottomSheet}
      options={addDeviceVerificationCodeScreenOptions}
    />
    <NativeStack.Screen
      name={Routes.WEBVIEW.MAIN}
      component={SimpleWebviewScreen}
      options={{ presentation: 'modal' }}
    />
  </NativeStack.Navigator>
);

const VaultRecoveryFlow = () => {
  const { colors } = useTheme();

  return (
    <NativeStack.Navigator
      initialRouteName={Routes.VAULT_RECOVERY.RESTORE_WALLET}
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        contentStyle: { backgroundColor: colors.background.default },
      }}
    >
      <NativeStack.Screen
        name={Routes.VAULT_RECOVERY.RESTORE_WALLET}
        component={RestoreWallet}
      />
      <NativeStack.Screen
        name={Routes.VAULT_RECOVERY.WALLET_RESTORED}
        component={WalletRestored}
      />
      <NativeStack.Screen
        name={Routes.VAULT_RECOVERY.WALLET_RESET_NEEDED}
        component={WalletResetNeeded}
      />
    </NativeStack.Navigator>
  );
};

const AddNetworkFlow = () => {
  const route = useRoute();

  return (
    <NativeStack.Navigator screenOptions={{ headerShown: false }}>
      <NativeStack.Screen
        name="AddNetwork"
        component={NetworkDetailsView}
        initialParams={route?.params}
      />
    </NativeStack.Navigator>
  );
};

interface RootModalFlowProps {
  route: {
    params: Record<string, unknown>;
  };
}
const RootModalFlow = (props: RootModalFlowProps) => (
  <NativeStack.Navigator
    screenOptions={{ ...clearNativeStackNavigatorOptions }}
  >
    <NativeStack.Screen
      name={Routes.MODAL.WALLET_ACTIONS}
      component={WalletActions}
    />
    <NativeStack.Screen
      name={Routes.MODAL.TRADE_WALLET_ACTIONS}
      component={TradeWalletActions}
    />
    <NativeStack.Screen
      name={Routes.MODAL.FUND_ACTION_MENU}
      component={FundActionMenu}
    />
    <NativeStack.Screen
      name={Routes.MODAL.MORE_TOKEN_ACTIONS_MENU}
      component={MoreTokenActionsMenu}
    />
    <NativeStack.Screen
      name={Routes.SHEET.MA_PICKER}
      component={MAPickerSheet}
    />
    <NativeStack.Screen
      name={Routes.MODAL.SECURITY_BADGE_BOTTOM_SHEET}
      component={SecurityBadgeBottomSheet}
    />
    <NativeStack.Screen
      name={Routes.MODAL.DELETE_WALLET}
      component={DeleteWalletModal}
    />
    <NativeStack.Screen
      name={Routes.MODAL.MODAL_CONFIRMATION}
      component={ModalConfirmation as ScreenComponent}
    />
    <NativeStack.Screen
      name={Routes.MODAL.MODAL_MANDATORY}
      component={ModalMandatory as ScreenComponent}
    />
    <NativeStack.Screen
      name={Routes.SHEET.ONBOARDING_SHEET}
      component={OnboardingSheet}
    />
    <NativeStack.Screen
      name={Routes.SHEET.SEEDPHRASE_MODAL}
      component={SeedphraseModal as ScreenComponent}
    />
    <NativeStack.Screen
      name={Routes.SHEET.SKIP_ACCOUNT_SECURITY_MODAL}
      component={SkipAccountSecurityModal as ScreenComponent}
    />
    <NativeStack.Screen
      name={Routes.SHEET.SUCCESS_ERROR_SHEET}
      component={SuccessErrorSheet as ScreenComponent}
    />
    <NativeStack.Screen
      name={Routes.SHEET.ELIGIBILITY_FAILED_MODAL}
      component={EligibilityFailedModal}
    />
    <NativeStack.Screen
      name={Routes.SHEET.UNSUPPORTED_REGION_MODAL}
      component={RampUnsupportedModal}
    />
    <NativeStack.Screen
      name={Routes.SHEET.RAMPS_SERVICE_DISRUPTION_MODAL}
      component={RampsServiceDisruptionModal}
    />
    <NativeStack.Screen
      name={Routes.SHEET.ACCOUNT_SELECTOR}
      component={AccountSelector}
      options={accountSelectorTransitionOptions}
    />
    <NativeStack.Screen name={Routes.SHEET.ADD_WALLET} component={AddWallet} />
    <NativeStack.Screen
      name={Routes.SHEET.ADDRESS_SELECTOR}
      component={AddressSelector}
    />
    <NativeStack.Screen
      name={Routes.SHEET.SDK_LOADING}
      component={SDKLoadingModal}
    />
    <NativeStack.Screen
      name={Routes.SHEET.SDK_FEEDBACK}
      component={SDKFeedbackModal}
    />
    <NativeStack.Screen
      name={Routes.SHEET.SDK_CONNECT_V2_OTP}
      component={SDKConnectV2OtpModal}
    />
    <NativeStack.Screen
      name={Routes.SHEET.SDK_MANAGE_CONNECTIONS}
      component={SDKSessionModal}
    />
    <NativeStack.Screen
      name={Routes.SHEET.EXPERIENCE_ENHANCER}
      component={ExperienceEnhancerModal}
    />
    <NativeStack.Screen
      name={Routes.SHEET.DATA_COLLECTION}
      component={DataCollectionModal}
    />
    <NativeStack.Screen
      name={Routes.SHEET.SDK_DISCONNECT}
      component={SDKDisconnectModal}
    />
    <NativeStack.Screen
      name={Routes.SHEET.ACCOUNT_CONNECT}
      component={MultichainAccountConnect as ScreenComponent}
    />
    <NativeStack.Screen
      name={Routes.SHEET.ACCOUNT_PERMISSIONS}
      component={MultichainAccountPermissions as ScreenComponent}
      initialParams={{ initialScreen: AccountPermissionsScreens.Connected }}
    />
    <NativeStack.Screen
      name={Routes.SHEET.REVOKE_ALL_ACCOUNT_PERMISSIONS}
      component={AccountPermissionsConfirmRevokeAll as ScreenComponent}
    />
    <NativeStack.Screen
      name={Routes.SHEET.CONNECTION_DETAILS}
      component={ConnectionDetails as ScreenComponent}
    />
    <NativeStack.Screen
      name={Routes.SHEET.PERMITTED_NETWORKS_INFO_SHEET}
      component={PermittedNetworksInfoSheet}
    />
    <NativeStack.Screen
      name={Routes.SHEET.NETWORK_SELECTOR}
      component={NetworkSelector as ScreenComponent}
    />
    <NativeStack.Screen
      name={Routes.SHEET.TOKEN_SORT}
      component={TokenSortBottomSheet}
    />
    <NativeStack.Screen
      name={Routes.SHEET.NETWORK_MANAGER}
      component={NetworkManager}
    />
    <NativeStack.Screen
      name={Routes.SHEET.BASIC_FUNCTIONALITY}
      component={BasicFunctionalityModal}
    />
    <NativeStack.Screen
      name={Routes.SHEET.CONFIRM_TURN_ON_BACKUP_AND_SYNC}
      component={ConfirmTurnOnBackupAndSyncModal}
    />
    <NativeStack.Screen
      name={Routes.SHEET.AMBIGUOUS_ADDRESS}
      component={AmbiguousAddressSheet}
    />
    <NativeStack.Screen
      name={Routes.MODAL.TURN_OFF_REMEMBER_ME}
      component={TurnOffRememberMeModal}
    />
    <NativeStack.Screen
      name={'AssetHideConfirmation'}
      component={AssetHideConfirmation}
    />
    <NativeStack.Screen name={'NftOptions'} component={NftOptions} />
    <NativeStack.Screen
      name={Routes.MODAL.UPDATE_NEEDED}
      component={UpdateNeeded}
    />
    <NativeStack.Screen
      name={Routes.MODAL.OTA_UPDATES_MODAL}
      component={OTAUpdatesModal}
    />
    {
      <NativeStack.Screen
        name={Routes.SHEET.SELECT_SRP}
        component={SelectSRPBottomSheet}
      />
    }
    <NativeStack.Screen
      name={Routes.SHEET.ADD_DEVICE_VERIFICATION_CODE}
      component={VerificationCodeBottomSheet}
      options={addDeviceVerificationCodeScreenOptions}
    />
    <NativeStack.Screen
      name={Routes.MODAL.SRP_REVEAL_QUIZ}
      component={SRPQuiz}
      initialParams={{ ...props.route.params }}
    />
    <NativeStack.Screen
      name={Routes.SHEET.ACCOUNT_ACTIONS}
      component={AccountActions}
    />
    <NativeStack.Screen
      name={Routes.SHEET.FIAT_ON_TESTNETS_FRICTION}
      component={FiatOnTestnetsFriction}
    />
    <NativeStack.Screen
      name={Routes.SHEET.SHOW_IPFS}
      component={ShowIpfsGatewaySheet}
    />
    <NativeStack.Screen
      name={Routes.SHEET.SHOW_NFT_DISPLAY_MEDIA}
      component={ShowDisplayNftMediaSheet}
    />
    <NativeStack.Screen
      name={Routes.MODAL.NFT_AUTO_DETECTION_MODAL}
      component={NFTAutoDetectionModal}
    />
    {isNetworkUiRedesignEnabled() ? (
      <NativeStack.Screen
        name={Routes.MODAL.MULTI_RPC_MIGRATION_MODAL}
        component={MultiRpcModal}
      />
    ) : null}
    <NativeStack.Screen
      name={Routes.SHEET.SHOW_TOKEN_ID}
      component={ShowTokenIdSheet}
    />
    <NativeStack.Screen
      name={Routes.SHEET.ORIGIN_SPAM_MODAL}
      component={OriginSpamModal}
    />
    <NativeStack.Screen
      name={Routes.SHEET.CHANGE_IN_SIMULATION_MODAL}
      component={ChangeInSimulationModal}
    />
    <NativeStack.Screen
      name={Routes.SHEET.TOOLTIP_MODAL}
      component={TooltipModal}
    />
    <NativeStack.Screen
      name={Routes.MODAL.DEEP_LINK_MODAL}
      component={DeepLinkModal}
    />
    <NativeStack.Screen
      name={Routes.MODAL.MULTICHAIN_ACCOUNTS_INTRO}
      component={MultichainAccountsIntroModal}
      options={{ headerShown: false }}
    />
    <NativeStack.Screen
      name={Routes.MODAL.MULTICHAIN_ACCOUNTS_LEARN_MORE}
      component={LearnMoreBottomSheet}
      options={{ headerShown: false }}
    />
    <NativeStack.Screen
      name={Routes.MODAL.PNA25_NOTICE_BOTTOM_SHEET}
      component={Pna25BottomSheet}
    />
    <NativeStack.Screen
      name={Routes.SDK.RETURN_TO_DAPP_NOTIFICATION}
      component={ReturnToAppNotification}
      initialParams={{ ...props.route.params }}
    />
    <NativeStack.Screen
      name={Routes.SHEET.MULTICHAIN_TRANSACTION_DETAILS}
      component={MultichainTransactionDetailsSheet}
    />
    <NativeStack.Screen
      name={Routes.SHEET.TRANSACTION_DETAILS}
      component={TransactionDetailsSheet}
    />
    <NativeStack.Screen
      name={Routes.SHEET.IMPORT_WALLET_TIP}
      component={ImportWalletTipBottomSheet}
    />
  </NativeStack.Navigator>
);

const ImportPrivateKeyView = () => {
  const { colors } = useTheme();

  return (
    <NativeStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.default },
      }}
    >
      <NativeStack.Screen
        name="ImportPrivateKey"
        component={ImportPrivateKey}
      />
      <NativeStack.Screen
        name="ImportPrivateKeySuccess"
        component={ImportPrivateKeySuccess}
      />
      <NativeStack.Screen
        name={Routes.QR_TAB_SWITCHER}
        component={QRTabSwitcher}
      />
    </NativeStack.Navigator>
  );
};

const ImportSRPView = () => (
  <NativeStack.Navigator
    screenOptions={{
      headerShown: false,
      presentation: 'transparentModal',
    }}
  >
    <NativeStack.Screen
      name={Routes.MULTI_SRP.IMPORT}
      component={ImportNewSecretRecoveryPhrase}
    />
    <NativeStack.Screen
      name={Routes.QR_TAB_SWITCHER}
      component={QRTabSwitcher}
      options={{ presentation: 'modal' }}
    />
    <NativeStack.Screen
      name={Routes.SHEET.SEEDPHRASE_MODAL}
      component={SeedphraseModal}
      options={{
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  </NativeStack.Navigator>
);

const ConnectQRHardwareFlow = ({
  route,
}: {
  route: { params?: { hideMarketingContent?: boolean } };
}) => {
  const { colors } = useTheme();
  return (
    <NativeStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.default },
      }}
    >
      <NativeStack.Screen
        name="ConnectQRHardware"
        component={ConnectQRHardware}
        initialParams={route?.params}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </NativeStack.Navigator>
  );
};

const LedgerConnectFlow = () => {
  const { colors } = useTheme();
  return (
    <NativeStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.default },
      }}
      initialRouteName={Routes.HW.LEDGER_CONNECT}
    >
      <NativeStack.Screen
        name={Routes.HW.LEDGER_CONNECT}
        component={LedgerSelectAccount}
      />
    </NativeStack.Navigator>
  );
};

const ConnectHardwareWalletFlow = () => {
  const { colors } = useTheme();
  return (
    <NativeStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.background.default },
      }}
    >
      <NativeStack.Screen
        name={Routes.HW.SELECT_DEVICE}
        component={SelectHardwareWallet}
      />
    </NativeStack.Navigator>
  );
};

const MultichainAccountDetails = () => {
  const route = useRoute();

  return (
    <NativeStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <NativeStack.Screen
        name={Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_DETAILS}
        component={AccountDetails}
        initialParams={route?.params}
      />
      <NativeStack.Screen
        name="SmartAccountDetails"
        component={SmartAccountModal}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </NativeStack.Navigator>
  );
};

const MultichainAddressList = () => {
  const route = useRoute();

  return (
    <NativeStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <NativeStack.Screen
        name={Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST}
        component={MultichainAccountAddressList}
        initialParams={route?.params}
      />
    </NativeStack.Navigator>
  );
};

const MultichainAccountGroupDetails = () => {
  const route = useRoute();
  const { colors } = useTheme();

  return (
    <NativeStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <NativeStack.Screen
        name={Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_GROUP_DETAILS}
        component={AccountGroupDetails}
        initialParams={route?.params}
      />
      <NativeStack.Screen
        name="SmartAccountDetails"
        component={SmartAccountModal}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <NativeStack.Screen
        name={Routes.MULTICHAIN_ACCOUNTS.WALLET_DETAILS}
        component={WalletDetails}
        initialParams={route?.params}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />

      <NativeStack.Screen
        name={Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST}
        component={MultichainAddressList}
        options={{
          ...slideFromRightNativeOptions,
          presentation: 'card',
          contentStyle: { backgroundColor: colors.background.default },
        }}
      />
      <NativeStack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.EDIT_ACCOUNT_NAME}
        component={EditMultichainAccountName}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </NativeStack.Navigator>
  );
};

const MultichainAccountDetailsActions = () => {
  const route = useRoute();

  // Configure transparent background to show AccountDetails screen beneath modal overlays.
  // Native stack keeps the presenting screen mounted for transparentModal, so the
  // sheet's own backdrop shows the AccountDetails screen underneath.
  const commonScreenOptions: NativeStackNavigationOptions = {
    presentation: 'transparentModal',
    contentStyle: { backgroundColor: importedColors.transparent },
  };

  return (
    <NativeStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <NativeStack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.ACCOUNT_ACTIONS}
        component={MultichainAccountActions}
        initialParams={route?.params}
        options={commonScreenOptions}
      />
      <NativeStack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.LEGACY_EDIT_ACCOUNT_NAME}
        component={LegacyEditMultichainAccountName}
        initialParams={route?.params}
        options={commonScreenOptions}
      />
      <NativeStack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS}
        component={ShareAddress}
        initialParams={route?.params}
        options={commonScreenOptions}
      />
      <NativeStack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR}
        component={ShareAddressQR}
        initialParams={route?.params}
        options={commonScreenOptions}
      />
      <NativeStack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.DELETE_ACCOUNT}
        component={DeleteAccount}
        initialParams={route?.params}
        options={commonScreenOptions}
      />
      <NativeStack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SRP_REVEAL_QUIZ}
        component={SRPQuiz as ScreenComponent}
        initialParams={route?.params}
        options={commonScreenOptions}
      />
      <NativeStack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.REVEAL_PRIVATE_CREDENTIAL}
        component={RevealPrivateKey}
        initialParams={route?.params}
      />
      <NativeStack.Screen
        name={Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.REVEAL_SRP_CREDENTIAL}
        component={RevealSRP}
        initialParams={route?.params}
      />
    </NativeStack.Navigator>
  );
};

const MultichainPrivateKeyList = () => {
  const route = useRoute();

  return (
    <NativeStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <NativeStack.Screen
        name={Routes.MULTICHAIN_ACCOUNTS.PRIVATE_KEY_LIST}
        component={MultichainAccountPrivateKeyList}
        initialParams={route?.params}
      />
    </NativeStack.Navigator>
  );
};

const ModalSwitchAccountType = () => (
  <NativeStack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: importedColors.transparent },
    }}
  >
    <NativeStack.Screen
      name={Routes.CONFIRMATION_SWITCH_ACCOUNT_TYPE}
      component={SwitchAccountTypeModal as ScreenComponent}
    />
  </NativeStack.Navigator>
);

const AppFlow = () => {
  const { colors } = useTheme();

  return (
    <NativeStack.Navigator
      initialRouteName={Routes.FOX_LOADER}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        presentation: 'transparentModal',
      }}
    >
      <NativeStack.Screen name={Routes.ONBOARDING.HOME_NAV} component={Main} />
      <NativeStack.Screen name={Routes.FOX_LOADER} component={FoxLoader} />
      <NativeStack.Screen
        name={Routes.ONBOARDING.LOGIN}
        component={Login}
        options={{
          contentStyle: { backgroundColor: colors.background.default },
        }}
      />
      {/* Same screen as ONBOARDING_OAUTH_REHYDRATE but registered on root AppFlow for post-login unlock. */}
      <NativeStack.Screen
        name={Routes.ONBOARDING.REHYDRATE}
        component={OAuthRehydration}
      />
      <NativeStack.Screen
        name={Routes.MODAL.MAX_BROWSER_TABS_MODAL}
        component={MaxBrowserTabsModal}
      />
      <NativeStack.Screen
        name="OnboardingRootNav"
        component={OnboardingRootNav}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.SUCCESS_FLOW}
        component={OnboardingSuccessFlow}
        // Opaque, full-screen flow: present as a card so safe-area insets resolve
        // correctly (the inherited `transparentModal` reports a 0 bottom inset on iOS).
        options={{ presentation: 'card' }}
      />
      <NativeStack.Screen
        name={Routes.VAULT_RECOVERY.RESTORE_WALLET}
        component={VaultRecoveryFlow}
      />
      <NativeStack.Screen
        name={Routes.MODAL.ROOT_MODAL_FLOW}
        component={RootModalFlow as ScreenComponent}
        options={({ route }) => {
          if (isAccountSelectorRootModalRoute(route.params)) {
            return accountSelectorTransitionOptions;
          }
          if (isTradeWalletActionsRootModalRoute(route.params)) {
            return tradeWalletActionsRootModalOptions;
          }
          return {
            presentation: 'transparentModal',
            animation: 'none',
            contentStyle: { backgroundColor: importedColors.transparent },
          };
        }}
      />
      <NativeStack.Screen
        name={Routes.IMPORT_PRIVATE_KEY_VIEW}
        component={ImportPrivateKeyView}
        options={{
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background.default },
        }}
      />
      {
        <NativeStack.Screen
          name="ImportSRPView"
          component={ImportSRPView}
          options={{ animation: 'slide_from_right' }}
        />
      }
      <NativeStack.Screen
        name="ConnectQRHardwareFlow"
        component={ConnectQRHardwareFlow}
      />
      <NativeStack.Screen
        name={Routes.HW.CONNECT_LEDGER}
        component={LedgerConnectFlow}
      />
      <NativeStack.Screen
        name={Routes.HW.CONNECT}
        component={ConnectHardwareWalletFlow}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.ADD_DEVICE_TO_WALLET}
        component={AddDeviceToWallet}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.SHEET.ADD_DEVICE_VERIFICATION_CODE}
        component={VerificationCodeBottomSheet}
        options={addDeviceVerificationCodeScreenOptions}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE}
        component={ImportFromSecretRecoveryPhrase}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_DETAILS}
        component={MultichainAccountDetails}
      />
      <NativeStack.Screen
        name={Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_GROUP_DETAILS}
        component={MultichainAccountGroupDetails}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <NativeStack.Screen
        name={Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL}
        component={RevealPrivateCredential}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <NativeStack.Screen
        name={Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_CELL_ACTIONS}
        component={MultichainAccountActions}
      />
      <NativeStack.Screen
        name={Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS}
        component={MultichainAccountDetailsActions}
      />
      <NativeStack.Screen
        name={Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST}
        component={MultichainAddressList}
        options={{
          ...slideFromRightNativeOptions,
          presentation: 'card',
          contentStyle: { backgroundColor: colors.background.default },
        }}
      />
      <NativeStack.Screen
        name={Routes.MULTICHAIN_ACCOUNTS.PRIVATE_KEY_LIST}
        component={MultichainPrivateKeyList}
        options={{
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background.default },
        }}
      />
      <NativeStack.Screen
        name={Routes.LEDGER_TRANSACTION_MODAL}
        component={LedgerTransactionModal}
      />
      <NativeStack.Screen
        name={Routes.QR_SIGNING_TRANSACTION_MODAL}
        component={QRSigningTransactionModal}
      />
      <NativeStack.Screen
        name={Routes.LEDGER_MESSAGE_SIGN_MODAL}
        component={LedgerMessageSignModal}
      />
      <NativeStack.Screen
        name={Routes.OPTIONS_SHEET}
        component={OptionsSheet}
      />
      <NativeStack.Screen
        name={Routes.EDIT_ACCOUNT_NAME}
        component={EditAccountName}
        options={{ animation: 'slide_from_right' }}
      />
      <NativeStack.Screen
        name={Routes.ADD_NETWORK}
        component={AddNetworkFlow}
        options={{
          animation: 'slide_from_right',
          contentStyle: {
            flex: 1,
            backgroundColor: importedColors.transparent,
          },
          gestureEnabled: true,
        }}
      />
      {isNetworkUiRedesignEnabled() ? (
        <NativeStack.Screen
          name={Routes.EDIT_NETWORK}
          component={AddNetworkFlow}
          options={{
            animation: 'slide_from_right',
            contentStyle: {
              flex: 1,
              backgroundColor: importedColors.transparent,
            },
            gestureEnabled: true,
          }}
        />
      ) : null}
      <NativeStack.Screen
        name={Routes.LOCK_SCREEN}
        component={LockScreen}
        options={{ gestureEnabled: false }}
      />
      <NativeStack.Screen
        name={Routes.CONFIRMATION_REQUEST_MODAL}
        options={{
          headerShown: false,
          gestureEnabled: true,
          presentation: 'containedTransparentModal',
          contentStyle: { backgroundColor: importedColors.transparent },
        }}
        component={Confirm}
      />

      {/* HW signing progress — 2nd registration (1st is in Bridge/routes.tsx)
          so the send origin can reach it in the main modal stack. Same route
          constant + same component; `flow` route param selects send vs bridge
          behavior. React Navigation resolves within the active stack, so
          `goBack()` from send lands on send confirm; bridge is unaffected. */}
      <NativeStack.Screen
        name={Routes.BRIDGE.HARDWARE_WALLETS_SWAPS}
        component={HardwareWalletsSwaps}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.BRIDGE.HW_QR_SCANNER}
        component={HwQrScanner}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.CONFIRMATION_SWITCH_ACCOUNT_TYPE}
        component={ModalSwitchAccountType}
      />
      <NativeStack.Screen
        name={Routes.CONFIRMATION_PAY_WITH_MODAL}
        component={PayWithModal}
      />
      <NativeStack.Screen
        name={Routes.AGENTIC_CLI_APPROVAL.CONFIRM}
        component={AgenticCliApproval}
        options={{
          // Header is wired from inside AgenticCliApproval via navigation.setOptions
          // (mirrors SimpleWebview's pattern for title + back button).
          // Overrides clearStackNavigatorOptions defaults from the parent stack.
          headerShown: false,
          gestureEnabled: true,
          presentation: 'modal',
          contentStyle: { backgroundColor: importedColors.white },
        }}
      />
      <NativeStack.Screen
        name={Routes.CONFIRMATION_PAY_WITH_BOTTOM_SHEET}
        component={PayWithBottomSheet}
      />
      <NativeStack.Screen
        name={Routes.AGENTIC_CLI_DASHBOARD_WEBVIEW.CONFIRM}
        component={AgenticCliDashboardWebview}
        options={{
          headerShown: true,
          gestureEnabled: true,
          presentation: 'modal',
          contentStyle: { backgroundColor: importedColors.white },
        }}
      />
    </NativeStack.Navigator>
  );
};

// DEV-ONLY: flip to `true` to jump straight to the Assets settings screen a few
// seconds after launch for quick visual testing. Set back to `false` (and remove
// this block) before committing.
const DEV_JUMP_TO_ASSETS_SETTINGS = false;

const App: React.FC = () => {
  const { toastRef } = useContext(ToastContext);
  const isSeedlessOnboardingLoginFlow = useSelector(
    selectSeedlessOnboardingLoginFlow,
  );

  useOTAUpdates();
  const predictRegistrations = usePredictToastRegistrations();
  const perpsWithdrawRegistrations = usePerpsWithdrawToastRegistrations();
  const quickBuyRegistrations = useQuickBuyToastRegistrations();
  const toastRegistrations = useMemo(
    () => [
      ...predictRegistrations,
      ...perpsWithdrawRegistrations,
      ...quickBuyRegistrations,
    ],
    [predictRegistrations, perpsWithdrawRegistrations, quickBuyRegistrations],
  );

  useEffect(() => {
    // End trace when first render is complete
    endTrace({ name: TraceName.UIStartup });
  }, []);

  const firstLoad = useRef(true);
  // periodically check seedless password outdated when app UI is open
  useInterval(
    async () => {
      if (isSeedlessOnboardingLoginFlow) {
        await Authentication.checkIsSeedlessPasswordOutdated({
          skipCache: firstLoad.current,
          captureSentryError: false,
        }).catch((error) => {
          Logger.error(error, 'App: Error in checkIsSeedlessPasswordOutdated');
        });
        firstLoad.current = false;
      }
    },
    {
      delay: Duration.Minute * 10,
      immediate: true,
    },
  );
  const existingUser = useSelector(selectExistingUser);

  useEffect(() => {
    async function startApp() {
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
    // (exhaustive-deps disabled for this file via .eslintrc.js override.)
  }, []);

  return (
    <AccessRestrictedProvider>
      <WebSocketHealthToastProvider>
        {/* TODO: Temporary fix for non-V2 Buy token selection; remove RampsBootstrap once V2 flag is on for all users. */}
        <RampsBootstrap />
        <AppFlow />
        <Toast ref={toastRef} />
        <PerpsWebSocketHealthToast />
        {__DEV__ && <AgentStepHud />}
        <ControllerEventToastBridge registrations={toastRegistrations} />
        <ProfilerManager />
      </WebSocketHealthToastProvider>
    </AccessRestrictedProvider>
  );
};

export default App;
