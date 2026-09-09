import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Hex } from '@metamask/utils';
import type { AccountsApiActivity } from './moneyActivity';
import type { CardTransaction } from '../../../../core/Engine/controllers/card-controller/provider-types';
import type {
  ConfirmationLaunchSource,
  ConfirmationParams,
} from '../../../Views/confirmations/components/confirm/confirm-component';
import type { NavigationAnalyticsRouteParams } from '../../../../util/analytics/navigationAnalyticsAttribution';

export enum MoneyPostOnboardingRedirectType {
  DEPOSIT = 'deposit',
}

export interface MoneyPreferredPaymentToken {
  address: Hex;
  chainId: Hex;
}

export interface MoneyOnboardingParams extends NavigationAnalyticsRouteParams {
  postOnboardingRedirect?: {
    type: MoneyPostOnboardingRedirectType;
    preferredPaymentToken?: MoneyPreferredPaymentToken;
  };
}

export interface MoneyHomeParams extends NavigationAnalyticsRouteParams {
  /**
   * Renders a back button on Money home. Set when the Money stack is pushed
   * over the stack that opened it (e.g. a Rewards campaign) instead of being
   * shown as the Money tab, where there is nothing to go back to.
   */
  showBackButton?: boolean;
  /**
   * What opened this Money home. Kept separate from `showBackButton`, which
   * only says a stack sits underneath and not whose it is. Forwarded to Add
   * Money so a further deposit lands back here rather than on the Money tab.
   */
  launchedFrom?: ConfirmationLaunchSource;
}

/**
 * Param list for screens inside the Money tab stack (`MoneyTabScreenStack`).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MoneyScreensStackParamList = {
  MoneyHome: MoneyHomeParams | undefined;
  MoneyActivity: undefined;
  MoneyHowItWorks: undefined;
};

/**
 * Param list for screens inside the Money confirmation stack
 * (`MoneyConfirmationScreenStack`). Deposit/withdraw navigate here via
 * `useConfirmNavigation()` with `ConfirmationParams`.
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MoneyConfirmationsNavigationParamList = {
  RedesignedConfirmations: ConfirmationParams | undefined;
};

export interface MoneyAddMoneySheetParams {
  /**
   * Forwarded to the deposit confirmation so it can land somewhere other than
   * the Money tab. Unset for the sheet's usual entry points on Money home.
   */
  launchedFrom?: ConfirmationLaunchSource;
}

/**
 * Param list for screens inside the Money modal stack (`MoneyModalStack`).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MoneyModalsNavigationParamList = {
  MoneyAddMoneySheet: MoneyAddMoneySheetParams | undefined;
  MoneyMoreSheet: undefined;
  MoneyTransferSheet: undefined;
  MoneyApyInfoSheet: { apy?: number; variant?: 'default' | 'deposit' };
  MoneyEarningsInfoSheet: { variant: 'monthly' | 'lifetime' };
  MoneyBalanceInfoSheet: undefined;
  MoneyLinkCardSheet: { entrypoint?: string } | undefined;
  MoneyEarnCryptoInfoSheet:
    | { variant?: 'default' | 'deposit'; showMoneyHomeCta?: boolean }
    | undefined;
  MoneyGeoBlockSheet: undefined;
};

interface MoneyPotentialEarningsParams {
  overrideToUsd?: boolean;
}

/**
 * Feature-level Money navigation params: nested stacks, flat root screens, and
 * typed `{ screen, params }` entry points for cross-stack navigation.
 */
// Intersection (`&`) requires `type`; `interface` cannot express this.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MoneyNavigationParamList = MoneyScreensStackParamList &
  MoneyModalsNavigationParamList &
  MoneyConfirmationsNavigationParamList & {
    MoneyOnboarding: MoneyOnboardingParams | undefined;
    MoneyFirstTimeDeposit: undefined;
    MoneyPotentialEarnings: MoneyPotentialEarningsParams | undefined;
    MoneyTransactionDetails: { transactionId: string };
    MoneyCardTransactionDetails:
      | {
          activity?: AccountsApiActivity;
          enrichment?: CardTransaction;
          cardTransaction?: CardTransaction;
        }
      | undefined;
    MoneyScreens: NavigatorScreenParams<MoneyScreensStackParamList> | undefined;
    MoneyModals:
      | NavigatorScreenParams<MoneyModalsNavigationParamList>
      | undefined;
    MoneyConfirmations:
      | NavigatorScreenParams<MoneyConfirmationsNavigationParamList>
      | undefined;
  };
