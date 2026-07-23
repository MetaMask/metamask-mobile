import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AddFundsModalNavigationDetails } from '../components/AddFundsBottomSheet/AddFundsBottomSheet';
import type { AssetSelectionModalNavigationDetails } from '../components/AssetSelectionBottomSheet/AssetSelectionBottomSheet';
import type { RegionSelectorModalParams } from '../components/Onboarding/RegionSelectorModal';
import type { ConfirmModalParams } from '../components/Onboarding/ConfirmModal';
import type { PasswordBottomSheetParams } from '../components/PasswordBottomSheet/PasswordBottomSheet';
import type { DaimoPayModalParams } from '../components/DaimoPayModal/DaimoPayModal';
import type { CreditBalanceTooltipParams } from '../components/CreditBalanceTooltipSheet/CreditBalanceTooltipSheet';
import type { MoneyUnlinkCardSheetRouteParams } from '../components/MoneyUnlinkCardSheet/MoneyUnlinkCardSheet';
import type { ChooseYourCardParams } from '../Views/ChooseYourCard/ChooseYourCard';
import type { ReviewOrderParams } from '../Views/ReviewOrder/ReviewOrder';
import type { OrderCompletedParams } from '../Views/OrderCompleted/OrderCompleted';
import type { CardFundingToken, CardUserPhase } from '../types';

/**
 * Nested-navigation params for Card container screens navigated via
 * `navigate(container, { screen, params })`.
 *
 * Kept local to avoid a circular import with NavigationService/types.
 */
interface CardNestedNavigationParams {
  screen?: string;
  params?: object;
}

/**
 * Post-auth redirect target. Matches `LinkFlowOrigin` (Money link flow) plus
 * plain `{ screen, params }` redirects used elsewhere in Card.
 */
export interface CardPostAuthRedirect {
  screen?: string;
  params?: object;
  /** Money-account link entrypoint when redirecting from that flow. */
  entrypoint?: string;
}

/**
 * Param list for screens inside the Card main stack (`MainRoutes`).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CardScreensStackParamList = {
  CardHome: undefined;
  CardWelcome: undefined;
  ChooseYourCard: ChooseYourCardParams | undefined;
  ReviewOrder: ReviewOrderParams | undefined;
  OrderCompleted: OrderCompletedParams | undefined;
  CardCashback: undefined;
  CardCreditRedeem: undefined;
  CardAuthentication:
    | {
        showAuthPrompt?: boolean;
        postAuthRedirect?: CardPostAuthRedirect;
      }
    | undefined;
  CardSpendingLimit:
    | {
        flow?: 'manage' | 'enable' | 'onboarding' | 'enable_card';
        selectedToken?: CardFundingToken;
      }
    | undefined;
  CardOnboarding:
    | (CardNestedNavigationParams & {
        cardUserPhase?: CardUserPhase;
        postAuthRedirect?: CardPostAuthRedirect;
      })
    | undefined;
  CardOnboardingKYCProcessing:
    | { countryKey?: string; kycUrl?: string }
    | undefined;
  CardOnboardingFundingApproval: { countryKey?: string } | undefined;
};

/**
 * Onboarding leaf screens registered on the root stack / onboarding navigator.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CardOnboardingStackParamList = {
  CardOnboardingSignUp: undefined;
  CardOnboardingConfirmEmail:
    | {
        email: string;
        password: string;
        countryKey: string;
      }
    | undefined;
  CardOnboardingSetPhoneNumber: { countryKey?: string } | undefined;
  CardOnboardingConfirmPhoneNumber:
    | {
        phoneCountryCode: string;
        phoneNumber: string;
      }
    | undefined;
  CardOnboardingVerifyIdentity: undefined;
  CardOnboardingVerifyingVeriffKYC: undefined;
  CardOnboardingPersonalDetails: undefined;
  CardOnboardingPhysicalAddress: undefined;
  CardOnboardingComplete: undefined;
  CardOnboardingKYCFailed: undefined;
  CardOnboardingKYCPending: undefined;
};

/**
 * Param list for screens inside the Card modal stack (`CardModalsRoutes`).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CardModalsNavigationParamList = {
  CardAddFundsModal: AddFundsModalNavigationDetails | undefined;
  CardAssetSelectionModal: AssetSelectionModalNavigationDetails | undefined;
  CardRegionSelectionModal: RegionSelectorModalParams;
  CardConfirmModal: ConfirmModalParams;
  CardPasswordModal: PasswordBottomSheetParams;
  CardRecurringFeeModal: undefined;
  CardDaimoPayModal: DaimoPayModalParams;
  CardViewPinModal: { imageUrl: string };
  CardSpendingLimitOptionsModal: {
    currentLimitType: 'full' | 'restricted';
    currentCustomLimit: string;
    callerRoute: string;
    callerParams?: Record<string, unknown>;
  };
  CardWaitlistFormModal: { url: string };
  CardImmersveKYCModal: { url: string; redirectUrl: string };
  CardForgotPasswordModal: { location?: 'us' | 'international' } | undefined;
  CardCreditBalanceTooltipModal: CreditBalanceTooltipParams | undefined;
  CardCreditRefundTooltipModal: { isMoneyAccount?: boolean } | undefined;
  CardUnlinkMoneyAccountSheet: MoneyUnlinkCardSheetRouteParams | undefined;
};

/**
 * Param list for the outer Card root stack (`CardRoutes`): main screens + modals.
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CardRootParamList = {
  CardHome: NavigatorScreenParams<CardScreensStackParamList> | undefined;
  CardModals: NavigatorScreenParams<CardModalsNavigationParamList> | undefined;
};

/**
 * Feature-level Card navigation params for nested `CardScreens` / `CardModals` entry.
 */
// Intersection (`&`) requires `type`; `interface` cannot express this.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CardNavigationParamList = CardScreensStackParamList &
  CardModalsNavigationParamList & {
    CardScreens: NavigatorScreenParams<CardRootParamList> | undefined;
    CardModals:
      | NavigatorScreenParams<CardModalsNavigationParamList>
      | undefined;
  };
