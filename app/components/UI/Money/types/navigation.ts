import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Hex } from '@metamask/utils';
import type { AccountsApiActivity } from './moneyActivity';
import type { ConfirmationParams } from '../../../Views/confirmations/components/confirm/confirm-component';

export enum MoneyPostOnboardingRedirectType {
  DEPOSIT = 'deposit',
}

export type MoneyPasskeysEntryPoint = 'finish_setup' | 'security';
export type MoneyAuthenticatorEntryPoint = 'finish_setup' | 'security';

export interface MoneyPreferredPaymentToken {
  address: Hex;
  chainId: Hex;
}

export interface MoneyOnboardingParams {
  postOnboardingRedirect?: {
    type: MoneyPostOnboardingRedirectType;
    preferredPaymentToken?: MoneyPreferredPaymentToken;
  };
}

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
  MoneyApyInfoSheet: { apy?: number; variant?: 'default' | 'deposit' };
  MoneyEarningsInfoSheet: { variant: 'monthly' | 'lifetime' };
  MoneyBalanceInfoSheet: undefined;
  MoneyLinkCardSheet: { entrypoint?: string } | undefined;
  MoneyEarnCryptoInfoSheet:
    | { variant?: 'default' | 'deposit'; showMoneyHomeCta?: boolean }
    | undefined;
  MoneyGeoBlockSheet: undefined;
  MoneyFinishSetupSheet: undefined;
  MoneyProtectWalletSheet: undefined;
  MoneyAddPasskeySheet: { returnToMoneyHome?: boolean } | undefined;
  MoneySecurityInfoSheet:
    | {
        defaultMethod?: string;
        variant?: 'info' | 'disable-transaction-verification';
      }
    | undefined;
  MoneyDeletePasskeySheet: { passkeyIndex: number };
  MoneyRemoveAuthenticatorSheet: undefined;
  MoneyAuthenticatorKeySheet: { entryPoint: MoneyAuthenticatorEntryPoint };
  MoneyRemoveSmsSheet: undefined;
  MoneyAddSocialSheet:
    | {
        returnToMoneyHome?: boolean;
        showAuthenticatorAlternative?: boolean;
      }
    | undefined;
  MoneyRemoveSocialSheet: undefined;
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
    MoneyOnboarding: MoneyOnboardingParams | undefined;
    MoneyFirstTimeDeposit: undefined;
    MoneyPotentialEarnings: undefined;
    MoneyManageSecurity: { successToast?: string } | undefined;
    MoneyPasskeys: { entryPoint: MoneyPasskeysEntryPoint };
    MoneyPasskeyDetails: { passkeyIndex: number };
    MoneyAuthenticator: {
      entryPoint: MoneyAuthenticatorEntryPoint;
      initialStep?: 'setup' | 'verify';
    };
    MoneyAuthenticatorDetails: undefined;
    MoneySmsSetup: { returnToMoneyHome?: boolean } | undefined;
    MoneySmsDetails: undefined;
    MoneySocialDetails: undefined;
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
