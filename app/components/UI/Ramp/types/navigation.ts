import type { V2EnterEmailParams } from '../Views/NativeFlow/EnterEmail';
import type { V2OtpCodeParams } from '../Views/NativeFlow/OtpCode';
import type { V2BasicInfoParams } from '../Views/NativeFlow/BasicInfo';
import type { V2EnterAddressParams } from '../Views/NativeFlow/EnterAddress';
import type { V2VerifyIdentityParams } from '../Views/NativeFlow/VerifyIdentity';
import type { BankDetailsParams } from '../Views/NativeFlow/BankDetails';
import type { OrderProcessingParams } from '../Views/NativeFlow/OrderProcessing';
import type { V2KycProcessingParams } from '../Views/NativeFlow/KycProcessing';
import type { V2AdditionalVerificationParams } from '../Views/NativeFlow/AdditionalVerification';
import type { KycWebviewParams } from '../Views/NativeFlow/KycWebview';
import type { HeadlessHostParams } from '../Views/HeadlessHost/HeadlessHost';
import type { RampsOrderDetailsParams } from '../utils/rampsNavigation';

// Modal params.
import type { PaymentSelectionModalParams } from '../Views/Modals/PaymentSelectionModal/PaymentSelectionModal';
import type { TokenNotAvailableModalParams } from '../Views/Modals/TokenNotAvailableModal/TokenNotAvailableModal';
import type { ProviderSelectionModalParams } from '../Views/Modals/ProviderSelectionModal/ProviderSelectionModal';
import type { ErrorDetailsModalParams } from '../Views/Modals/ErrorDetailsModal/ErrorDetailsModal';
import type { ProcessingInfoModalParams } from '../Views/Modals/ProcessingInfoModal/ProcessingInfoModal';
import type { StateSelectorModalParams } from '../Views/Modals/StateSelectorModal/StateSelectorModal';
import type { UnsupportedStateModalParams } from '../Views/Modals/UnsupportedStateModal/UnsupportedStateModal';

/**
 * Nested-navigation params for the Ramp container stacks (e.g. the
 * `RampTokenSelectionRoot` nested navigator), navigated via
 * `navigate(container, { screen, params })`.
 *
 * Kept local to avoid a circular import with NavigationService/types.
 */
interface RampNestedNavigationParams {
  screen?: string;
  params?: object;
}

/**
 * Param list for the Ramp native (V2) buy/sell flow registered across the
 * Ramp navigators (`routes.tsx` nested stacks + the flat screens registered
 * on the root `MainNavigator`).
 *
 * Param shapes mirror what each screen reads via `useParams` / `useRoute`.
 * Routes already covered elsewhere in `RootStackParamList` (e.g. `RampBuy`,
 * `RampSell`, `BuildQuote`, the token/region modals) are intentionally not
 * duplicated here.
 */
export interface RampNavigationParamList {
  // Native flow screens
  RampTokenSelectionRoot: RampNestedNavigationParams | undefined;
  RampsOrderDetails: RampsOrderDetailsParams | undefined;
  RampHeadlessHost: HeadlessHostParams;
  RampEnterEmail: V2EnterEmailParams | undefined;
  RampOtpCode: V2OtpCodeParams;
  RampBasicInfo: V2BasicInfoParams;
  RampEnterAddress: V2EnterAddressParams;
  RampVerifyIdentity: V2VerifyIdentityParams | undefined;
  RampBankDetails: BankDetailsParams;
  RampBankDetailsStandalone: BankDetailsParams;
  RampOrderProcessing: OrderProcessingParams;
  RampKycProcessing: V2KycProcessingParams | undefined;
  RampAdditionalVerification: V2AdditionalVerificationParams;
  RampKycWebview: KycWebviewParams;

  // Modals
  RampPaymentSelectionModal: PaymentSelectionModalParams | undefined;
  RampTokenNotAvailableModal: TokenNotAvailableModalParams;
  RampProviderSelectionModal: ProviderSelectionModalParams | undefined;
  RampErrorDetailsModal: ErrorDetailsModalParams;
  RampProcessingInfoModal: ProcessingInfoModalParams;
  RampSsnInfoModal: undefined;
  RampStateSelectorModal: StateSelectorModalParams;
  RampUnsupportedStateModal: UnsupportedStateModalParams;
}
