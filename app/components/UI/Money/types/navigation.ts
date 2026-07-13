import type { AccountsApiActivity } from './moneyActivity';
import type { Hex } from '@metamask/utils';

/**
 * Nested-navigation params for the Money container stacks (MoneyScreens /
 * MoneyModals / MoneyConfirmations), which are navigated via
 * `navigate(container, { screen, params })`.
 *
 * Kept local to avoid a circular import with NavigationService/types.
 */
interface MoneyNestedNavigationParams {
  screen?: string;
  params?: object;
}

export interface MoneyOnboardingParams {
  preferredPaymentToken?: {
    address: Hex;
    chainId: Hex;
  };
}

/**
 * Param list for the screens registered across the Money navigators
 * (`MoneyTabScreenStack`, `MoneyModalStack`, `MoneyConfirmationScreenStack`)
 * and the flat Money screens registered on the root MainNavigator.
 *
 * Param shapes mirror what each screen reads via `useParams` / `useRoute`.
 */
export interface MoneyNavigationParamList {
  // MoneyScreens tab stack
  MoneyHome: undefined;
  MoneyActivity: undefined;
  MoneyHowItWorks: undefined;

  // Flat screens registered on the root MainNavigator
  MoneyOnboarding: MoneyOnboardingParams | undefined;
  MoneyFirstTimeDeposit: undefined;
  MoneyPotentialEarnings: undefined;
  MoneyTransactionDetails: { transactionId: string };
  MoneyCardTransactionDetails: { activity?: AccountsApiActivity } | undefined;

  // Confirmation stack (nested navigator)
  MoneyConfirmations: MoneyNestedNavigationParams | undefined;

  // MoneyModals modal stack
  MoneyAddMoneySheet: undefined;
  MoneyMoreSheet: undefined;
  MoneyTransferSheet: undefined;
  MoneyApyInfoSheet: { apy: number; variant?: 'default' | 'deposit' };
  MoneyEarningsInfoSheet: undefined;
  MoneyBalanceInfoSheet: undefined;
  MoneyLinkCardSheet: { entrypoint?: string } | undefined;
  MoneyEarnCryptoInfoSheet: { variant?: 'default' | 'deposit' } | undefined;
  MoneyGeoBlockSheet: undefined;
}
