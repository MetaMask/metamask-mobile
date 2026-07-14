import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AccountsApiActivity } from './moneyActivity';
import type { ConfirmationParams } from '../../../Views/confirmations/components/confirm/confirm-component';

/**
 * Param list for screens inside the Money tab stack (`MoneyTabScreenStack`).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MoneyScreensStackParamList = {
  MoneyHome: undefined;
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

/**
 * Param list for screens inside the Money modal stack (`MoneyModalStack`).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MoneyModalsNavigationParamList = {
  MoneyAddMoneySheet: undefined;
  MoneyMoreSheet: undefined;
  MoneyTransferSheet: undefined;
  MoneyApyInfoSheet: { apy: number; variant?: 'default' | 'deposit' };
  MoneyEarningsInfoSheet: undefined;
  MoneyBalanceInfoSheet: undefined;
  MoneyLinkCardSheet: { entrypoint?: string } | undefined;
  MoneyEarnCryptoInfoSheet: { variant?: 'default' | 'deposit' } | undefined;
  MoneyGeoBlockSheet: undefined;
};

/**
 * Feature-level Money navigation params: nested stacks, flat root screens, and
 * typed `{ screen, params }` entry points for cross-stack navigation.
 */
// Intersection (`&`) requires `type`; `interface` cannot express this.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MoneyNavigationParamList = MoneyScreensStackParamList &
  MoneyModalsNavigationParamList &
  MoneyConfirmationsNavigationParamList & {
    MoneyOnboarding: undefined;
    MoneyFirstTimeDeposit: undefined;
    MoneyPotentialEarnings: undefined;
    MoneyTransactionDetails: { transactionId: string };
    MoneyCardTransactionDetails: { activity?: AccountsApiActivity } | undefined;
    MoneyScreens: NavigatorScreenParams<MoneyScreensStackParamList> | undefined;
    MoneyModals:
      | NavigatorScreenParams<MoneyModalsNavigationParamList>
      | undefined;
    MoneyConfirmations:
      | NavigatorScreenParams<MoneyConfirmationsNavigationParamList>
      | undefined;
  };
