import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AssetViewParams } from '../../../Views/Asset/Asset.types';
import type { TokenDetailsRouteParams } from '../../../UI/TokenDetails/constants/constants';
import type {
  CreatePriceAlertRouteParams,
  PriceAlertRouteParams,
} from '../../../UI/Assets/PriceAlerts/constants';
import type { RevealPrivateCredentialParams } from '../../../Views/RevealPrivateCredential/RevealPrivateCredential.types';
import type { NetworkDetailsViewParams } from '../../../Views/NetworksManagement/NetworkDetailsView/NetworkDetailsView.types';
import type { ContactFormParams } from '../../../Views/Settings/Contacts/ContactForm.types';
import type { NotificationSettingsSectionProps } from '../../../Views/Settings/NotificationsSettings/NotificationSettingsSection';
import type { RegionSelectorParams } from '../../../Views/Modals/Modals.types';
import type {
  ManualBackupStep1Params,
  ManualBackupStep2Params,
} from '../../../Views/ManualBackupStep1/ManualBackupStep1.types';
import type {
  AccountBackupParams,
  ManualBackupStep3Params,
} from '../../../Views/AccountBackup/AccountBackup.types';

/**
 * Param list for screens inside `AssetStackFlow` (token details + alerts).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type AssetStackParamList = {
  Asset: AssetViewParams | undefined;
  SecurityTrust: TokenDetailsRouteParams & {
    isPricePositive?: boolean;
    useAmbientColor?: boolean;
  };
  CreatePriceAlert: CreatePriceAlertRouteParams;
  ManagePriceAlerts: PriceAlertRouteParams;
};

/**
 * Param list for screens inside `WalletTabStackFlow`.
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type WalletTabStackParamList = {
  WalletView: undefined;
  RevealPrivateCredential: RevealPrivateCredentialParams | undefined;
};

/**
 * `WalletTabHome` is registered with component `WalletTabStackFlow`, but many
 * call sites still navigate with an intermediate `WalletTabStackFlow` screen.
 * Include both the real stack screens and that nested form.
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type WalletTabHomeParamList = WalletTabStackParamList & {
  WalletTabStackFlow:
    | NavigatorScreenParams<WalletTabStackParamList>
    | undefined;
};

/**
 * Param list for screens inside `SettingsFlow` (`SettingsView`).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SettingsStackParamList = {
  AccountsMenuView: undefined;
  Settings: undefined;
  GeneralSettings: undefined;
  AdvancedSettings: { scrollToBottom?: boolean } | undefined;
  NetworksManagement: undefined;
  NetworkDetails: NetworkDetailsViewParams | undefined;
  SDKSessionsManager: undefined;
  SecuritySettings: undefined;
  RampSettings: undefined;
  RampActivationKeyForm: undefined;
  RampHeadlessPlayground: undefined;
  AesCryptoTestForm: undefined;
  ExperimentalSettings: undefined;
  CompanySettings: undefined;
  DeveloperOptions: undefined;
  ContactsSettings: undefined;
  ContactForm: ContactFormParams | undefined;
  RevealPrivateCredentialView: RevealPrivateCredentialParams | undefined;
  WalletConnectSessionsView: undefined;
  ResetPassword: undefined;
  WalletRecovery: undefined;
  AccountBackupStep1B: AccountBackupParams | undefined;
  ManualBackupStep1: ManualBackupStep1Params | undefined;
  ManualBackupStep2: ManualBackupStep2Params | undefined;
  ManualBackupStep3: ManualBackupStep3Params;
  EnterPasswordSimple: undefined;
  NotificationsSettings: undefined;
  NotificationSettingsSection: NotificationSettingsSectionProps['route']['params'];
  BackupAndSyncSettings: undefined;
  SettingsRegionSelector: RegionSelectorParams | undefined;
  SnapsSettingsList: undefined;
};
