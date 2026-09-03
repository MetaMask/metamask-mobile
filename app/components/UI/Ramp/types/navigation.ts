import type { NavigatorScreenParams } from '@react-navigation/native';
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
import type { SimpleRampBuildQuoteParams } from '../Aggregator/types/navigation';
import type { BuildQuoteParams as RampAggregatorBuildQuoteParams } from '../Aggregator/Views/BuildQuote/BuildQuote';

// Modal params.
import type { PaymentSelectionModalParams } from '../Views/Modals/PaymentSelectionModal/PaymentSelectionModal';
import type { TokenNotAvailableModalParams } from '../Views/Modals/TokenNotAvailableModal/TokenNotAvailableModal';
import type { ProviderSelectionModalParams } from '../Views/Modals/ProviderSelectionModal/ProviderSelectionModal';
import type { ErrorDetailsModalParams } from '../Views/Modals/ErrorDetailsModal/ErrorDetailsModal';
import type { ProcessingInfoModalParams } from '../Views/Modals/ProcessingInfoModal/ProcessingInfoModal';
import type { StateSelectorModalParams } from '../Views/Modals/StateSelectorModal/StateSelectorModal';
import type { UnsupportedStateModalParams } from '../Views/Modals/UnsupportedStateModal/UnsupportedStateModal';

/**
 * Param list for screens inside the Ramp unified (V2) main stack
 * (`MainRoutes` in `routes.tsx`).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RampScreensStackParamList = {
  RampTokenSelection: undefined;
  RampAmountInput:
    | (SimpleRampBuildQuoteParams & { nativeFlowError?: string })
    | undefined;
  RampEnterEmail: V2EnterEmailParams | undefined;
  RampOtpCode: V2OtpCodeParams;
  RampBasicInfo: V2BasicInfoParams;
  RampEnterAddress: V2EnterAddressParams;
  RampVerifyIdentity: V2VerifyIdentityParams | undefined;
  RampBankDetails: BankDetailsParams;
  RampOrderProcessing: OrderProcessingParams;
  RampKycProcessing: V2KycProcessingParams | undefined;
  RampAdditionalVerification: V2AdditionalVerificationParams;
  Checkout: undefined;
  RampKycWebview: KycWebviewParams;
  RampsOrderDetails: RampsOrderDetailsParams | undefined;
  RampHeadlessHost: HeadlessHostParams;
};

/**
 * Param list for screens inside the `RampModals` stack.
 *
 * Includes both unified (V2) and Aggregator modal screens because both
 * navigators register under the same `RampModals` route name.
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RampModalsNavigationParamList = {
  // Unified (V2) modals
  RampUnsupportedTokenModal: undefined;
  RampBuildQuoteSettingsModal: undefined;
  RampPaymentSelectionModal: PaymentSelectionModalParams | undefined;
  RampTokenNotAvailableModal: TokenNotAvailableModalParams;
  RampProviderSelectionModal: ProviderSelectionModalParams | undefined;
  RampErrorDetailsModal: ErrorDetailsModalParams;
  RampProcessingInfoModal: ProcessingInfoModalParams;
  RampSsnInfoModal: undefined;
  RampPhoneCountrySelectorModal: undefined;
  RampStateSelectorModal: StateSelectorModalParams;
  RampUnsupportedStateModal: UnsupportedStateModalParams;

  // Aggregator modals
  RampTokenSelectorModal: undefined;
  RampFiatSelectorModal: undefined;
  RampIncompatibleAccountTokenModal: undefined;
  RampRegionSelectorModal: undefined;
  RampUnsupportedRegionModal: undefined;
  RampPaymentMethodSelectorModal: undefined;
  RampSettingsModal: undefined;
};

/**
 * Param list for the outer TokenListRoutes root stack that hosts the V2
 * screen stack and modal stack.
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RampTokenListRootParamList = {
  RampTokenSelectionRoot:
    | NavigatorScreenParams<RampScreensStackParamList>
    | undefined;
  RampModals: NavigatorScreenParams<RampModalsNavigationParamList> | undefined;
};

/**
 * Param list for Aggregator main screens (`MainRoutes` in Aggregator/routes).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RampAggregatorScreensStackParamList = {
  BuildQuote: RampAggregatorBuildQuoteParams | undefined;
  BuildQuoteHasStarted: RampAggregatorBuildQuoteParams | undefined;
  Quotes: undefined;
  Checkout: undefined;
};

/**
 * Param list for the outer Aggregator `RampRoutes` stack (`Ramp` + `RampModals`).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RampAggregatorRootParamList = {
  Ramp: NavigatorScreenParams<RampAggregatorScreensStackParamList> | undefined;
  RampModals: NavigatorScreenParams<RampModalsNavigationParamList> | undefined;
};

/**
 * Feature-level Ramp navigation params: V2 screens, shared modals, flat root
 * screens, and typed `{ screen, params }` entry points.
 */
// Intersection (`&`) requires `type`; `interface` cannot express this.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RampNavigationParamList = RampScreensStackParamList &
  RampModalsNavigationParamList & {
    RampBankDetailsStandalone: BankDetailsParams;
    RampTokenSelectionRoot:
      | NavigatorScreenParams<RampScreensStackParamList>
      | undefined;
    RampModals:
      | NavigatorScreenParams<RampModalsNavigationParamList>
      | undefined;
  };
