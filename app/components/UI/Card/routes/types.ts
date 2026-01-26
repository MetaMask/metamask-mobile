import type { NavigatorScreenParams } from '@react-navigation/native';
import type {
  CardTokenAllowance,
  DelegationSettingsResponse,
  CardExternalWalletDetailsResponse,
} from '../types';

/**
 * Route params for the Spending Limit screen.
 */
export interface SpendingLimitRouteParams {
  flow?: 'manage' | 'enable' | 'onboarding';
  selectedToken?: CardTokenAllowance;
  priorityToken?: CardTokenAllowance | null;
  allTokens?: CardTokenAllowance[];
  delegationSettings?: DelegationSettingsResponse | null;
  walletDetails?: CardExternalWalletDetailsResponse | null;
}

/**
 * Param list for Card onboarding navigator.
 */
export interface CardOnboardingParamList {
  CardOnboardingSignUp: undefined;
  CardOnboardingConfirmEmail: { email: string; password: string };
  CardOnboardingSetPhoneNumber: undefined;
  CardOnboardingConfirmPhoneNumber: {
    phoneCountryCode: string;
    phoneNumber: string;
  };
  CardOnboardingVerifyIdentity: undefined;
  CardOnboardingVerifyingVeriffKYC: undefined;
  CardOnboardingPersonalDetails: undefined;
  CardOnboardingPhysicalAddress: undefined;
  CardOnboardingMailingAddress: undefined;
  CardOnboardingComplete: undefined;
  CardOnboardingKYCFailed: undefined;
  CardOnboardingWebview: { url: string };
}

/**
 * Param list for the Card main stack navigator.
 */
export interface CardMainParamList {
  CardHome: undefined;
  CardWelcome: undefined;
  CardAuthentication: undefined;
  CardSpendingLimit: SpendingLimitRouteParams | undefined;
  CardOnboarding: NavigatorScreenParams<CardOnboardingParamList>;
}

/**
 * Param list for the Card modals stack navigator.
 */
export interface CardModalsParamList {
  CardAddFundsModal: undefined;
  CardAssetSelectionModal: undefined;
  CardRegionSelectionModal: undefined;
  CardConfirmModal: undefined;
}

/**
 * Combined param list for all Card-related navigation.
 */
export type CardParamList = CardMainParamList & CardModalsParamList;
