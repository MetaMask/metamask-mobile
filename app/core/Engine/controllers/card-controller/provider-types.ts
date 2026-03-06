import type { CaipChainId } from '@metamask/utils';
import { CardStatus, CardType } from '../../../../components/UI/Card/types';

export { CardStatus, CardType };

// -- Provider Identity --

export type CardProviderId = string;

export type CardAuthMethod = 'email_password' | 'siwe';

// -- Auth Tokens --

export interface CardAuthTokens {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt?: number;
  location: string;
}

export type AuthTokenValidity = 'valid' | 'needs_refresh' | 'expired';

export interface CardAuthResult {
  done: boolean;
  tokenSet?: CardAuthTokens;
  nextStep?: CardAuthStep;
  onboardingRequired?: {
    sessionId: string;
    phase: string;
  };
}

// -- Auth Flow --

export type CardAuthStep =
  | { type: 'email_password' }
  | { type: 'otp'; destination: string }
  | { type: 'siwe'; message: string }
  | { type: 'complete' };

export interface CardAuthSession {
  id: string;
  currentStep: CardAuthStep;
  _metadata: Record<string, unknown>;
}

export type CardCredentials =
  | { type: 'email_password'; email: string; password: string }
  | { type: 'otp'; code: string }
  | { type: 'siwe'; signature: string };

// -- Capabilities --

export type CardOnboardingCapability =
  | { type: 'steps'; steps: string[]; kycProvider: string | null }
  | { type: 'webview'; url: string }
  | { type: 'none' };

export interface CardProviderCapabilities {
  authMethod: CardAuthMethod;
  supportsOTP: boolean;
  supportsFundingApproval: boolean;
  supportsFundingLimits: boolean;
  fundingChains: CaipChainId[];
  supportsFreeze: boolean;
  supportsPushProvisioning: boolean;
  onboarding: CardOnboardingCapability;
}

// -- Funding Asset (provider-agnostic) --

export enum FundingAssetStatus {
  Active = 'active',
  Limited = 'limited',
  Inactive = 'inactive',
}

export interface CardFundingAsset {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  chainId: CaipChainId;
  balance: string;
  status: FundingAssetStatus;
}

// -- Card Details --

export interface CardDetails {
  id: string;
  status: CardStatus;
  type: CardType;
  lastFour: string;
  holderName?: string;
  isFreezable?: boolean;
}

export interface CardSecureViewParams {
  customCss?: string;
}

export interface CardSecureView {
  url: string;
  token: string;
}

// -- Account --

export interface CardShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface CardAccountStatus {
  verificationStatus: string | null;
  provisioningEligible: boolean;
  holderName: string | null;
  shippingAddress: CardShippingAddress | null;
}

// -- Alerts & Actions --

export type CardAlertType =
  | 'kyc_pending'
  | 'card_provisioning'
  | 'close_to_spending_limit'
  | 'limited_allowance';

export interface CardAlertAction {
  type: 'navigate';
  route: string;
  params?: Record<string, unknown>;
}

export interface CardAlert {
  type: CardAlertType;
  dismissable: boolean;
  action?: CardAlertAction;
}

export type CardAction =
  | { type: 'add_funds'; enabled: boolean }
  | { type: 'change_asset' }
  | { type: 'enable_card' };

// -- Card Home Data --

export interface CardHomeData {
  primaryAsset: CardFundingAsset | null;
  assets: CardFundingAsset[];
  card: CardDetails | null;
  account: CardAccountStatus | null;
  alerts: CardAlert[];
  actions: CardAction[];
}

export const EMPTY_CARD_HOME_DATA: CardHomeData = {
  primaryAsset: null,
  assets: [],
  card: null,
  account: null,
  alerts: [],
  actions: [],
};

// -- Funding --

export interface WalletOperations {
  signMessage(address: string, message: string): Promise<string>;
  submitTransaction(
    params: { to: string; data: string; from: string },
    chainId: CaipChainId,
  ): Promise<string>;
}

export interface FundingApprovalParams {
  address: string;
  amount: string;
  currency: string;
  network: string;
  faucet?: boolean;
}

export interface CardFundingOption {
  symbol: string;
  asset: CardFundingAsset | null;
}

export interface CardFundingConfig {
  maxLimit: string;
  fundingOptions: CardFundingOption[];
  supportedChains: CaipChainId[];
}

// -- Onboarding --

export interface OnboardingStep {
  type: string;
  data: Record<string, unknown>;
  country: string;
  sessionId?: string;
}

export interface OnboardingStepResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface RegistrationSettings {
  countries: string[];
  data: Record<string, unknown>;
}

export interface RegistrationStatus {
  status: string;
  verificationState?: string;
  data?: Record<string, unknown>;
}

// -- Provider Interface --

export interface ICardProvider {
  readonly id: CardProviderId;
  readonly capabilities: CardProviderCapabilities;

  initiateAuth(country: string): Promise<CardAuthSession>;
  submitCredentials(
    session: CardAuthSession,
    credentials: CardCredentials,
  ): Promise<CardAuthResult>;
  refreshTokens(tokens: CardAuthTokens): Promise<CardAuthTokens>;
  validateTokens(tokens: CardAuthTokens): AuthTokenValidity;
  logout(tokens: CardAuthTokens): Promise<void>;

  getCardHomeData(
    address: string,
    tokens: CardAuthTokens,
  ): Promise<CardHomeData>;

  getCardDetails(tokens: CardAuthTokens): Promise<CardDetails>;
  freezeCard(cardId: string, tokens: CardAuthTokens): Promise<void>;
  unfreezeCard(cardId: string, tokens: CardAuthTokens): Promise<void>;
  getCardSecureView?(
    tokens: CardAuthTokens,
    params: CardSecureViewParams,
  ): Promise<CardSecureView>;

  updateAssetPriority?(
    asset: CardFundingAsset,
    allAssets: CardFundingAsset[],
    tokens: CardAuthTokens,
  ): Promise<void>;
  getFundingConfig?(tokens: CardAuthTokens): Promise<CardFundingConfig>;

  approveFunding?(
    params: FundingApprovalParams,
    tokens: CardAuthTokens,
    wallet: WalletOperations,
  ): Promise<void>;

  getRegistrationSettings?(country: string): Promise<RegistrationSettings>;
  getRegistrationStatus?(
    sessionId: string,
    country: string,
  ): Promise<RegistrationStatus>;
  submitOnboardingStep?(step: OnboardingStep): Promise<OnboardingStepResult>;

  getOnChainAssets?(address: string): Promise<CardHomeData>;
}
