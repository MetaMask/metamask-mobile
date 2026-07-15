/**
 * Canonical PredictNext domain types. See `docs/adapters.md` for the full
 * documentation. The POC ships a minimal subset; only the types the five
 * Predict flows actually touch are declared.
 */

export type PredictVenueId = 'polymarket' | 'kalshi';

export type DecimalString = string;

export type ChainNamespace = 'eip155' | 'solana';

export type FundingOperation = 'deposit' | 'withdraw' | 'claim';

export interface PaginatedResult<T> {
  items: T[];
  cursor?: string | null;
  totalResults?: number;
}

export interface PredictOutcome {
  id: string;
  label: string;
  shortLabel?: string;
  price: DecimalString;
}

export interface PredictMarket {
  id: string;
  venueId: PredictVenueId;
  eventId: string;
  title: string;
  description?: string;
  image?: string;
  status: 'upcoming' | 'open' | 'paused' | 'closed' | 'resolved' | 'settled';
  outcomes: PredictOutcome[];
  volume: DecimalString;
  liquidity?: DecimalString;
  acceptingOrders?: boolean;
  tickSize?: string;
  negRisk?: boolean;
}

export interface PredictEvent {
  id: string;
  venueId: PredictVenueId;
  slug: string;
  title: string;
  description?: string;
  image?: string;
  status: 'upcoming' | 'live' | 'open' | 'paused' | 'closed' | 'resolved' | 'settled';
  category?: string;
  tags: string[];
  markets: PredictMarket[];
  liquidity: DecimalString;
  volume: DecimalString;
  startsAt?: string;
  endsAt?: string;
}

export interface PredictBalance {
  venueId: PredictVenueId;
  ownerAddress: string;
  amount: DecimalString;
}

export interface PredictPosition {
  id: string;
  venueId: PredictVenueId;
  eventId: string;
  marketId: string;
  outcomeId: string;
  outcomeLabel: string;
  currentValue: DecimalString;
  title: string;
  icon: string;
  amount: DecimalString;
  price: DecimalString;
  status: 'open' | 'redeemable' | 'won' | 'lost';
  size: DecimalString;
  outcomeIndex: number;
  realizedPnl?: DecimalString;
  percentPnl: DecimalString;
  cashPnl: DecimalString;
  claimable: boolean;
  initialValue: DecimalString;
  averageEntryPrice: DecimalString;
  endDate: string;
  negRisk?: boolean;
  optimistic?: boolean;
}

export interface ActivityItem {
  id: string;
  venueId: PredictVenueId;
  type: 'buy' | 'sell' | 'claim' | 'settlement' | 'deposit' | 'withdrawal';
  timestamp: number;
  eventId?: string;
  marketId?: string;
  outcomeId?: string;
  amount?: DecimalString;
  price?: DecimalString;
  txHash?: string;
  title?: string;
  outcomeLabel?: string;
  icon?: string;
}

export interface PriceQuery {
  eventId: string;
  marketId: string;
  outcomeId: string;
}

export interface PriceResult {
  eventId: string;
  marketId: string;
  outcomeId: string;
  buy: DecimalString;
  sell: DecimalString;
}

export interface MarketPrices {
  venueId: PredictVenueId;
  results: PriceResult[];
}

export interface OrderPreview {
  eventId: string;
  marketId: string;
  outcomeId: string;
  timestamp: number;
  side: 'buy' | 'sell';
  sharePrice: DecimalString;
  maxAmountSpent: DecimalString;
  minAmountReceived: DecimalString;
  slippage: DecimalString;
  tickSize: DecimalString;
  minOrderSize: DecimalString;
  negRisk: boolean;
  feeRateBps?: string;
  fees?: {
    metamaskFee: DecimalString;
    venueFee: DecimalString;
    marketFee?: DecimalString;
    totalFee: DecimalString;
    totalFeePercentage: DecimalString;
  };
  rateLimited?: boolean;
  positionId?: string;
  orderType?: 'FOK' | 'FAK';
}

export interface OrderReceipt {
  orderId: string;
  status: 'submitted' | 'filled' | 'partially_filled';
  venueOrderId?: string;
  spentAmount: DecimalString;
  receivedAmount: DecimalString;
  txHashes: string[];
}

export interface PredictSettlementCurrency {
  symbol: string;
  decimals: number;
  tokenAddress?: string;
  chainId?: string;
}

export interface VenueCapabilities {
  supportsDeposits: boolean;
  supportsWithdrawals: boolean;
  supportsClaims: boolean;
  supportsAutomaticSettlement: boolean;
  supportsAccountSetup: boolean;
  supportsLivePrices: boolean;
  supportsOrderbook: boolean;
  supportsCryptoReferencePrices: boolean;
}

export interface PredictVenueInfo {
  venueId: PredictVenueId;
  name: string;
  settlementCurrency: PredictSettlementCurrency;
  capabilities: VenueCapabilities;
}

export type PredictAccountReadinessStatus =
  | 'ready'
  | 'setup_required'
  | 'setup_pending'
  | 'restricted'
  | 'unavailable';

export type PredictAccountReadinessBlockerCode =
  | 'account_setup_required'
  | 'account_setup_pending'
  | 'kyc_required'
  | 'kyc_pending'
  | 'kyc_rejected'
  | 'jurisdiction_restricted'
  | 'geo_blocked'
  | 'venue_unavailable'
  | 'unknown';

export interface PredictAccountReadinessBlocker {
  code: PredictAccountReadinessBlockerCode;
  message?: string;
  action?: 'complete_setup' | 'complete_kyc' | 'retry';
}

export interface PredictAccountReadiness {
  venueId: PredictVenueId;
  ownerAddress: string;
  canTrade: boolean;
  status: PredictAccountReadinessStatus;
  blockers?: PredictAccountReadinessBlocker[];
}

export type ChainTransactionRequest =
  | {
      namespace: 'eip155';
      chainId: string;
      to: string;
      data: string;
      value?: string;
      gas?: string;
      type?: string;
    }
  | {
      namespace: 'solana';
      cluster: 'mainnet' | 'devnet';
      to: string;
      tokenMint: string;
      amount: DecimalString;
      instructions?: unknown[];
    };

export type FundingPlan =
  | {
      kind: 'wallet_transfer';
      venueId: PredictVenueId;
      operation: FundingOperation;
      network: ChainNamespace;
      amount: DecimalString;
      settlementCurrency: PredictSettlementCurrency;
      request: ChainTransactionRequest;
      venueReference?: string;
      afterSubmit?: { type: 'deposit_indication'; required: true };
    }
  | {
      kind: 'venue_api';
      venueId: PredictVenueId;
      operation: FundingOperation;
      amount?: DecimalString;
      requestPreview: Record<string, unknown>;
      venueReference?: string;
    }
  | {
      kind: 'unsupported';
      venueId: PredictVenueId;
      operation: FundingOperation;
      reason: 'UNSUPPORTED_VENUE_CAPABILITY';
    };

export interface FundingReceipt {
  venueId: PredictVenueId;
  operation: FundingOperation;
  status: 'submitted' | 'confirmed' | 'processing' | 'prefunded' | 'failed';
  amount?: DecimalString;
  txHash?: string;
  venueReference?: string;
}

export interface PredictSigner {
  readonly address: string;
  signTypedMessage(...args: unknown[]): Promise<string>;
  signPersonalMessage(...args: unknown[]): Promise<string>;
}

export interface PredictVenueSession {
  venueId: PredictVenueId;
  ownerAddress: string;
  expiresAt?: number;
  data: unknown;
}

export type PredictAccountSetupStep =
  | 'email_otp'
  | 'profile_form'
  | 'phone_otp'
  | 'link_verify'
  | 'kyc'
  | 'complete';

export interface PredictAccountSetupState {
  setupStep: PredictAccountSetupStep;
  kycApproved: boolean;
  kalshiUserId?: string;
  path?: 'A' | 'B';
  linkId?: string;
  obfuscatedDestination?: string;
}

export interface ProfileInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  ssn: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export type AccountSetupStepPayload =
  | { step: 'email_otp'; code: string }
  | { step: 'phone_otp'; code: string }
  | { step: 'link_verify'; code: string }
  | { step: 'profile_form'; profile: ProfileInput }
  | { step: 'resend_email' }
  | { step: 'resend_phone' };

export * from './errors';
