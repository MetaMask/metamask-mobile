import {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import { CaipAccountId, CaipAssetType, type Json } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import type { RewardsControllerMethodActions } from './RewardsController-method-action-types';

/**
 * Crockford's Base32 alphabet — excludes I, L, O, U to avoid ambiguity.
 */
export const BASE32_REGEX = /^[0-9A-HJKMNP-TV-Z]+$/i;

export interface LoginResponseDto {
  sessionId: string;
  subscription: SubscriptionDto;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SubscriptionDto = {
  id: string;
  referralCode: string;
  accounts: {
    address: string;
    chainId: number;
  }[];
};

export interface MobileLoginDto {
  /**
   * The account of the user
   * @example '0x... or solana address.'
   */
  account: string;

  /**
   * The timestamp (epoch seconds) used in the signature.
   * @example 1
   */
  timestamp: number;

  /**
   * The signature of the login (hex encoded)
   * @example '0x...'
   */
  signature: `0x${string}`;
}

export interface MobileOptinDto {
  /**
   * The account of the user
   * @example '0x... or solana address.'
   */
  account: string;

  /**
   * The timestamp (epoch seconds) used in the signature.
   * @example 1
   */
  timestamp: number;

  /**
   * The signature of the login (hex encoded)
   * @example '0x...'
   */
  signature: `0x${string}`;

  /**
   * The referral code of the user
   * @example '123456'
   */
  referralCode?: string;
}

export interface ApplyReferralDto {
  /**
   * The referral code to apply
   * @example 'ABC123'
   */
  referralCode: string;
}

export interface ApplyBonusCodeDto {
  /**
   * The bonus code to apply
   * @example 'BNS123'
   */
  bonusCode: string;
}

/**
 * Campaign type enum matching the backend CampaignType
 */
export enum CampaignType {
  ONDO_HOLDING = 'ONDO_HOLDING',
  SEASON_1 = 'SEASON_1',
}

/**
 * DTO for campaign data from the backend
 */
export interface CampaignDto {
  /**
   * The unique identifier of the campaign
   * @example '123e4567-e89b-12d3-a456-426614174000'
   */
  id: string;

  /**
   * The type of campaign
   * @example CampaignType.ONDO_HOLDING
   */
  type: CampaignType;

  /**
   * The name of the campaign
   * @example 'ONDO Holding Campaign'
   */
  name: string;

  /**
   * The start date of the campaign
   * @example '2024-01-01T00:00:00.000Z'
   */
  startDate: string;

  /**
   * The end date of the campaign
   * @example '2024-12-31T23:59:59.999Z'
   */
  endDate: string;

  /**
   * Terms and conditions content from Contentful (may be null)
   */
  termsAndConditions: Json | null;

  /**
   * Regions excluded from this campaign
   * @example ['US', 'GB']
   */
  excludedRegions: string[];

  /**
   * Theme-aware background image for the campaign tile
   */
  image?: ThemeImage;

  /**
   * The details of the campaign
   * @example { howItWorks: { title: 'How it works', description: 'How it works', phases: [{ name: 'Phase 1', daysLabel: 'Days', sortOrder: 1, steps: [{ title: 'Step 1', description: 'Step 1', iconName: 'icon-name' }] }] } }
   */
  details: CampaignDetails | null;

  /**
   * Whether this campaign is featured (shown prominently in the UI)
   * @example true
   */
  featured: boolean;
}

/**
 * Serializable version of OndoCampaignStep for state storage.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OndoCampaignStepState = {
  title: string;
  description: Json | null;
  iconName: string;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OndoCampaignTourActionsState = {
  next?: boolean;
  skip?: boolean;
};

/**
 * Serializable version of OndoCampaignTourStepDto for state storage.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OndoCampaignTourStepDtoState = {
  title: string;
  description: string;
  image: ThemeImageState | null;
  actions: OndoCampaignTourActionsState | null;
};

/**
 * Serializable version of OndoCampaignHowItWorks for state storage.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OndoCampaignHowItWorksState = {
  title: string;
  description: string;
  steps: OndoCampaignStepState[];
  notes?: Json | null;
  tour?: OndoCampaignTourStepDtoState[];
};

/**
 * Serializable version of ThemeImage for state storage.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ThemeImageState = {
  lightModeUrl: string;
  darkModeUrl: string;
};

/**
 * Serializable version of CampaignDetails for state storage.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CampaignDetailsState = {
  howItWorks: OndoCampaignHowItWorksState;
  depositCutoffDate?: string;
};

/**
 * Serializable version of CampaignDto for state storage.
 * Uses plain string for type instead of CampaignType enum to satisfy StateConstraint.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CampaignDtoState = {
  id: string;
  type: string;
  name: string;
  startDate: string;
  endDate: string;
  termsAndConditions: Json | null;
  excludedRegions: string[];
  statusLabel: string;
  image: ThemeImageState | null;
  details: CampaignDetailsState | null;
  featured: boolean;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CampaignState = {
  campaigns: CampaignDtoState[];
  lastFetched: number;
};

/**
 * Response DTO for campaign participant status from the backend
 */
export interface CampaignParticipantStatusDto {
  /** Whether the subscription has opted into the campaign */
  optedIn: boolean;

  /**
   * The number of participants in the campaign
   * @example 100
   */
  participantCount: number;
}

/**
 * A single entry in the campaign leaderboard
 */
export interface CampaignLeaderboardEntry {
  /**
   * The rank of the participant within their tier
   * @example 1
   */
  rank: number;

  /**
   * The participant's referral code (used as identifier)
   * @example 'ABC123'
   */
  referralCode: string;

  /**
   * The rate of return as a decimal ratio (0.15 = 15%, -0.05 = -5%)
   * @example 0.15
   */
  rateOfReturn: number;
}

/**
 * Leaderboard data for a single tier
 */
export interface CampaignLeaderboardTier {
  /**
   * Top entries in the tier (up to 20)
   */
  entries: CampaignLeaderboardEntry[];

  /**
   * Total number of participants in this tier
   * @example 150
   */
  totalParticipants: number;
}

/**
 * Response DTO for GET /ondo-gm/:campaignId/leaderboard
 * Public endpoint returning top 20 per tier
 */
export interface CampaignLeaderboardDto {
  /**
   * The campaign ID
   * @example '123e4567-e89b-12d3-a456-426614174000'
   */
  campaignId: string;

  /**
   * When the leaderboard was last computed (ISO timestamp)
   * @example '2024-03-20T12:00:00.000Z'
   */
  computedAt: string;

  /**
   * Leaderboard data by tier name (e.g. STARTER, MID, UPPER)
   * Keys are dynamic based on campaign config
   */
  tiers: Record<string, CampaignLeaderboardTier>;
}

/**
 * Response DTO for GET /ondo-gm/:campaignId/leaderboard/me
 * Authenticated endpoint returning the current user's position
 */
export interface CampaignLeaderboardPositionDto {
  /**
   * The user's projected tier based on net deposit
   * @example 'MID'
   */
  projectedTier: string;

  /**
   * The user's rank within their tier
   * @example 5
   */
  rank: number;

  /**
   * Total number of participants in the user's tier
   * @example 150
   */
  totalInTier: number;

  /**
   * The user's rate of return as a decimal ratio
   * @example 0.15
   */
  rateOfReturn: number;

  /**
   * Current USD value of the user's positions
   * @example 12500.50
   */
  currentUsdValue: number;

  /**
   * Total USD deposited by the user
   * @example 10000.00
   */
  totalUsdDeposited: number;

  /**
   * Net deposit amount (deposits - withdrawals at cost basis)
   * @example 8500.00
   */
  netDeposit: number;

  /**
   * When the leaderboard was last computed (ISO timestamp)
   * @example '2024-03-20T12:00:00.000Z'
   */
  computedAt: string;
}

/**
 * Single position in GET /ondo-gm/:campaignId/portfolio/me
 */
export interface OndoGmPortfolioPositionDto {
  /**
   * @example 'AAPLon'
   */
  tokenSymbol: string;

  /**
   * @example 'Apple Inc.'
   */
  tokenName: string;

  /**
   * CAIP-19 asset type identifier for this position
   * @example 'eip155:1/erc20:0x14c3abf95cb9c93a8b82c1cdcb76d72cb87b2d4c'
   */
  tokenAsset: string;

  /**
   * @example '45.2'
   */
  units: string;

  /**
   * @example '9040.000000'
   */
  costBasis: string;

  /**
   * @example '200.000000'
   */
  avgCostPerUnit: string;

  /**
   * @example '215.500000'
   */
  currentPrice: string;

  /**
   * @example '9740.600000'
   */
  currentValue: string;

  /**
   * @example '700.600000'
   */
  unrealizedPnl: string;

  /**
   * @example '0.0775'
   */
  unrealizedPnlPercent: string;
}

/**
 * Portfolio summary in GET /ondo-gm/:campaignId/portfolio/me
 */
export interface OndoGmPortfolioSummaryDto {
  /**
   * @example '9740.600000'
   */
  totalCurrentValue: string;

  /**
   * @example '9040.000000'
   */
  totalCostBasis: string;

  /**
   * @example '9040.000000'
   */
  totalUsdDeposited: string;

  /**
   * @example '9040.000000'
   */
  netDeposit: string;

  /**
   * @example '700.600000'
   */
  portfolioPnl: string;

  /**
   * @example '0.0775'
   */
  portfolioPnlPercent: string;
}

/**
 * Response DTO for GET /ondo-gm/:campaignId/portfolio/me
 */
export interface OndoGmPortfolioDto {
  positions: OndoGmPortfolioPositionDto[];
  summary: OndoGmPortfolioSummaryDto;

  /**
   * @example '2026-03-20T12:00:00.000Z'
   */
  computedAt: string;
}

/**
 * Single cached portfolio row (mirrors {@link OndoGmPortfolioPositionDto}; explicit plain-object shape for cache / Json).
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OndoGmPortfolioPositionState = {
  tokenSymbol: string;
  tokenName: string;
  tokenAsset: string;
  units: string;
  costBasis: string;
  avgCostPerUnit: string;
  currentPrice: string;
  currentValue: string;
  unrealizedPnl: string;
  unrealizedPnlPercent: string;
};

/**
 * Cached portfolio summary (mirrors {@link OndoGmPortfolioSummaryDto}; explicit plain-object shape for cache / Json).
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OndoGmPortfolioSummaryState = {
  totalCurrentValue: string;
  totalCostBasis: string;
  totalUsdDeposited: string;
  netDeposit: string;
  portfolioPnl: string;
  portfolioPnlPercent: string;
};

/**
 * Cached portfolio payload (explicit shape for Json / StateConstraint compatibility).
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OndoGmPortfolioState = {
  positions: OndoGmPortfolioPositionState[];
  summary: OndoGmPortfolioSummaryState;
  computedAt: string;
  lastFetched: number;
};

/**
 * Activity entry type for Ondo GM campaign transactions.
 */
export type ActivityEntryType =
  | 'DEPOSIT'
  | 'REBALANCE'
  | 'WITHDRAW'
  | 'EXTERNAL_OUTFLOW';

/**
 * Token metadata within an activity entry.
 */
export interface ActivityTokenDto {
  /**
   * CAIP-19 asset type identifier
   * @example 'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da'
   */
  tokenAsset: string;

  /** @example 'AAPLon' */
  tokenSymbol: string;

  /** @example 'Apple Inc.' */
  tokenName: string;
}

/**
 * DTO for a single activity entry from GET /ondo-gm/:campaignId/activity/me
 */
export interface OndoGmActivityEntryDto {
  /** @example 'DEPOSIT' */
  type: ActivityEntryType;

  /** Source token */
  srcToken: ActivityTokenDto;

  /** Destination token, null for withdrawals */
  destToken: ActivityTokenDto | null;

  /**
   * Recipient wallet address (only set for EXTERNAL_OUTFLOW events)
   * @example '0x1234567890abcdef1234567890abcdef12345678'
   */
  destAddress: string | null;

  /**
   * Signed USD value (6 decimals). Positive for deposits, negative for withdrawals. Null for rebalances.
   * @example '125.000000'
   */
  usdAmount: string | null;

  /**
   * Block timestamp (ISO 8601 UTC)
   * @example '2026-03-28T14:30:00.000Z'
   */
  timestamp: string;
}

/**
 * Paginated response for Ondo GM campaign activity
 */
export interface PaginatedOndoGmActivityDto {
  has_more: boolean;
  cursor: string | null;
  results: OndoGmActivityEntryDto[];
}

/**
 * Serializable state for token metadata within an activity entry.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ActivityTokenState = {
  tokenAsset: string;
  tokenSymbol: string;
  tokenName: string;
};

/**
 * Serializable state for a single activity entry (mirrors {@link OndoGmActivityEntryDto}).
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OndoGmActivityEntryState = {
  type: string;
  srcToken: ActivityTokenState;
  destToken: ActivityTokenState | null;
  destAddress: string | null;
  usdAmount: string | null;
  timestamp: string;
};

/**
 * Cached activity page (explicit shape for Json / StateConstraint compatibility).
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OndoGmActivityState = {
  results: OndoGmActivityEntryState[];
  has_more: boolean;
  cursor: string | null;
  lastFetched: number;
};

/**
 * State for cached leaderboard data in the controller
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CampaignLeaderboardState = {
  campaignId: string;
  computedAt: string;
  tiers: {
    [tierName: string]: {
      entries: {
        rank: number;
        referralCode: string;
        rateOfReturn: number;
      }[];
      totalParticipants: number;
    };
  };
  lastFetched: number;
};

/**
 * State for cached leaderboard position in the controller
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CampaignLeaderboardPositionFoundState = {
  projectedTier: string;
  rank: number;
  totalInTier: number;
  rateOfReturn: number;
  currentUsdValue: number;
  totalUsdDeposited: number;
  netDeposit: number;
  computedAt: string;
  lastFetched: number;
};

/** Sentinel stored when the API returns null (user not on leaderboard), so the TTL is respected. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CampaignLeaderboardPositionNotFoundState = {
  notFound: true;
  lastFetched: number;
};

export type CampaignLeaderboardPositionState =
  | CampaignLeaderboardPositionFoundState
  | CampaignLeaderboardPositionNotFoundState;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CampaignParticipantStatusState = {
  optedIn: boolean;
  participantCount: number;
  lastFetched: number;
};

export interface OndoCampaignStep {
  title: string;
  description: Json | null;
  iconName: string;
}

export interface OndoCampaignTourActions {
  next?: boolean;
  skip?: boolean;
}

export interface OndoCampaignTourStepDto {
  title: string;
  description: string;
  image: ThemeImage | null;
  actions: OndoCampaignTourActions | null;
}

export interface OndoCampaignHowItWorks {
  title: string;
  description: string;
  steps: OndoCampaignStep[];
  notes?: Json | null;
  tour?: OndoCampaignTourStepDto[];
}

export interface OndoHoldingDetails {
  howItWorks: OndoCampaignHowItWorks;
  depositCutoffDate?: string;
}

export type CampaignDetails = OndoHoldingDetails;

/**
 * Campaign status derived from dates
 * - upcoming: now < startDate
 * - active: startDate <= now < endDate
 * - complete: now >= endDate
 */
export type CampaignStatus = 'upcoming' | 'active' | 'complete';

export interface EstimateAssetDto {
  /**
   * Asset identifier in CAIP-19 format
   * @example 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
   */
  id: CaipAssetType;
  /**
   * Amount of the asset as a string
   * @example '25739959426'
   */
  amount: string;
  /**
   * Asset price in USD PER TOKEN. Using ETH as an example, 1 ETH = 4493.23 USD at the time of writing. If provided, this will be used instead of doing a network call to get the current price.
   * @example '4512.34'
   */
  usdPrice?: string;
}

export interface EstimateSwapContextDto {
  /**
   * Source asset information, in caip19 format
   * @example {
   *   id: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
   *   amount: '25739959426'
   * }
   */
  srcAsset: EstimateAssetDto;

  /**
   * Destination asset information, in caip19 format.
   * @example {
   *   id: 'eip155:1/slip44:60',
   *   amount: '9912500000000000000'
   * }
   */
  destAsset: EstimateAssetDto;

  /**
   * Fee asset information, in caip19 format
   * @example {
   *   id: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
   *   amount: '100'
   * }
   */
  feeAsset: EstimateAssetDto;
}

export interface EstimatePerpsContextDto {
  /**
   * Type of the PERPS action (open position, close position, stop/loss, take profit, ...)
   * @example 'OPEN_POSITION'
   */
  type: 'OPEN_POSITION' | 'CLOSE_POSITION' | 'STOP_LOSS' | 'TAKE_PROFIT';

  /**
   * USD fee value
   * @example '12.34'
   */
  usdFeeValue: string;

  /**
   * Asset symbol (e.g., "ETH", "BTC")
   * @example 'ETH'
   */
  coin: string;
}

export interface EstimatePredictContextDto {
  /**
   * Fee asset information, in caip19 format
   * @example {
   *   id: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
   *   amount: '1000000'
   * }
   */
  feeAsset: EstimateAssetDto;
}

export interface EstimateShieldContextDto {
  /**
   * Fee asset information, in caip19 format
   * @example {
   *   id: 'eip155:1/slip44:60',
   *   amount: '1000000000000000'
   * }
   */
  feeAsset: EstimateAssetDto;
}

export interface EstimatePointsContextDto {
  /**
   * Swap context data, must be present for SWAP activity
   */
  swapContext?: EstimateSwapContextDto;

  /**
   * PERPS context data, must be present for PERPS activity.
   * Can be a single position or an array of positions for batch estimation.
   * When an array is provided, the backend returns aggregated points (sum) and average bonus.
   * @example Single position: { type: 'CLOSE_POSITION', coin: 'USDC', usdFeeValue: '1.00' }
   * @example Batch positions: [{ type: 'CLOSE_POSITION', coin: 'USDC', usdFeeValue: '1.00' }, ...]
   */
  perpsContext?: EstimatePerpsContextDto | EstimatePerpsContextDto[];

  /**
   * Predict context data, must be present for PREDICT activity
   */
  predictContext?: EstimatePredictContextDto;

  /**
   * Shield context data, must be present for SHIELD activity
   */
  shieldContext?: EstimateShieldContextDto;
}

/**
 * Type of point earning activity. Swap is for swaps and bridges. PERPS is for perps activities.
 * @example 'SWAP'
 */
export type PointsEventEarnType =
  | 'SWAP'
  | 'PERPS'
  | 'PREDICT'
  | 'REFERRAL'
  | 'SIGN_UP_BONUS'
  | 'LOYALTY_BONUS'
  | 'ONE_TIME_BONUS'
  | 'CARD'
  | 'MUSD_DEPOSIT'
  | 'SHIELD';

export interface GetPointsEventsDto {
  seasonId: string;
  subscriptionId: string;
  cursor: string | null;
  forceFresh?: boolean;
  type?: PointsEventEarnType;
}

export interface GetPointsEventsLastUpdatedDto {
  seasonId: string;
  subscriptionId: string;
  type?: PointsEventEarnType;
}

/**
 * Paginated list of points events
 */
export interface PaginatedPointsEventsDto {
  has_more: boolean;
  cursor: string | null;
  results: PointsEventDto[];
}

/**
 * Asset information for events
 */
export interface EventAssetDto {
  /**
   * Amount of the token as a string
   * @example '1000000000000000000'
   */
  amount: string;

  /**
   * CAIP-19 asset type
   * @example 'eip155:1/slip44:60'
   */
  type: string;

  /**
   * Decimals of the token
   * @example 18
   */
  decimals: number;

  /**
   * Name of the token
   * @example 'Ethereum'
   */
  name?: string;

  /**
   * Symbol of the token
   * @example 'ETH'
   */
  symbol?: string;
}

/**
 * Swap event payload
 */
export interface SwapEventPayload {
  /**
   * Source asset details
   */
  srcAsset: EventAssetDto;

  /**
   * Destination asset details
   */
  destAsset?: EventAssetDto;

  /**
   * Transaction hash
   * @example '0x.......'
   */
  txHash?: string;
}

/**
 * PERPS event payload
 */
export interface PerpsEventPayload {
  /**
   * Type of the PERPS event
   * @example 'OPEN_POSITION'
   */
  type: 'OPEN_POSITION' | 'CLOSE_POSITION' | 'TAKE_PROFIT' | 'STOP_LOSS';

  /**
   * Direction of the position
   * @example 'LONG'
   */
  direction?: 'LONG' | 'SHORT';

  /**
   * Asset information
   */
  asset: EventAssetDto;

  /**
   * PNL of the position
   * @example 10.0464
   */
  pnl?: string;
}

/**
 * Card event payload
 */
export interface CardEventPayload {
  /**
   * Asset information (contains amount, symbol, decimals, etc.)
   */
  asset: EventAssetDto;

  /**
   * Transaction hash
   * @example '0x.......'
   */
  txHash?: string;
}

/**
 * mUSD deposit event payload
 */
export interface MusdDepositEventPayload {
  /**
   * Date of the deposit
   * @example '2025-11-11'
   */
  date: string;
}

/**
 * Bonus code event payload
 */
export interface BonusCodeEventPayload {
  /**
   * Bonus code
   * @example 'BNS123'
   */
  code: string;
}

/**
 * Base points event interface
 */
interface BasePointsEventDto {
  /**
   * ID of the point earning activity
   * @example '01974010-377f-7553-a365-0c33c8130980'
   */
  id: string;

  /**
   * Timestamp of the point earning activity
   * @example '2021-01-01T00:00:00.000Z'
   */
  timestamp: Date;

  /**
   * Value of the point earning activity
   * @example 100
   */
  value: number;

  /**
   * Bonus of the point earning activity
   * @example {}
   */
  bonus: {
    bips?: number | null;
    bonusPoints?: number | null;
    bonuses?: string[] | null;
  } | null;

  /**
   * Account address of the point earning activity
   * @example '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
   */
  accountAddress: string | null;

  /**
   * Timestamp of the point earning activity
   * @example '2021-01-01T00:00:00.000Z'
   */
  updatedAt: Date;
}

/**
 * Points event with discriminated union for payloads
 */
export type PointsEventDto = BasePointsEventDto &
  (
    | {
        type: 'SWAP';
        payload: SwapEventPayload | null;
      }
    | {
        type: 'PERPS';
        payload: PerpsEventPayload | null;
      }
    | {
        type: 'CARD';
        payload: CardEventPayload | null;
      }
    | {
        type: 'PREDICT';
        payload: null;
      }
    | {
        type: 'MUSD_DEPOSIT';
        payload: MusdDepositEventPayload | null;
      }
    | {
        type: 'REFERRAL' | 'SIGN_UP_BONUS' | 'LOYALTY_BONUS' | 'ONE_TIME_BONUS';
        payload: null;
      }
    | { type: 'BONUS_CODE'; payload: BonusCodeEventPayload | null }
    | { type: string; payload: Record<string, string> | null }
  );

export interface EstimatePointsDto {
  /**
   * Type of point earning activity
   * @example 'SWAP'
   */
  activityType: PointsEventEarnType;

  /**
   * Account address performing the activity in CAIP-10 format
   * @example 'eip155:1:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
   */
  account: CaipAccountId;

  /**
   * Context data specific to the activity type
   */
  activityContext: EstimatePointsContextDto;
}

export interface EstimatedPointsDto {
  /**
   * Earnable for the activity
   * @example 100
   */
  pointsEstimate: number;

  /**
   * Bonus applied to the points estimate, in basis points. 100 = 1%
   * @example 200
   */
  bonusBips: number;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SeasonTierDto = {
  id: string;
  name: string;
  pointsNeeded: number;
  image: ThemeImage;
  levelNumber: string;
  rewards: SeasonRewardDto[];
};

export interface SeasonRewardDto {
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  shortUnlockedDescription: string;
  longUnlockedDescription: string;
  claimUrl?: string;
  iconName: string;
  rewardType: SeasonRewardType;
  isEndOfSeasonReward?: boolean;
  endOfSeasonName?: string;
  endOfSeasonShortDescription?: string;
  claimEndDate?: string;
}

/**
 * DTO for Linea token reward from Season 1
 */
export interface LineaTokenRewardDto {
  /**
   * The subscription ID
   * @example 'example-uuid'
   */
  subscriptionId: string;

  /**
   * The amount of Linea tokens as a string
   * @example '1000'
   */
  amount: string;
}

export enum SeasonRewardType {
  GENERIC = 'GENERIC',
  PERPS_DISCOUNT = 'PERPS_DISCOUNT',
  POINTS_BOOST = 'POINTS_BOOST',
  ALPHA_FOX_INVITE = 'ALPHA_FOX_INVITE',
  METAL_CARD = 'METAL_CARD',
  LINEA_TOKENS = 'LINEA_TOKENS',
  NANSEN = 'NANSEN',
  OTHERSIDE = 'OTHERSIDE',
}

export interface SeasonDto {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  tiers: SeasonTierDto[];
  activityTypes: SeasonActivityTypeDto[];
  waysToEarn: SeasonWayToEarnDto[];
  shouldInstallNewVersion?: string | undefined;
}

export interface SeasonStatusBalanceDto {
  total: number;
  updatedAt?: Date;
}

export interface SeasonStatusDto {
  season: SeasonDto;
  balance: SeasonStatusBalanceDto;
  currentTierId: string;
}

export interface SubscriptionSeasonReferralDetailsDto {
  referralCode: string;
  totalReferees: number;
  referredByCode: string;
  referralPoints: number;
}

export interface PointsBoostEnvelopeDto {
  boosts: PointsBoostDto[];
}

export interface PointsBoostDto {
  id: string;
  name: string;
  icon: ThemeImage;
  boostBips: number;
  seasonLong: boolean;
  startDate?: string;
  endDate?: string;
  backgroundColor: string;
  deeplink?: string;
}

export interface RewardDto {
  id: string;
  seasonRewardId: string;
  claimStatus: RewardClaimStatus;
  claim?: RewardClaim;
  createdAt?: string;
}

export type RewardClaimData =
  | PointsBoostRewardData
  | AlphaFoxInviteRewardData
  | EndOfSeasonUrlData
  | null;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PointsBoostRewardData = {
  seasonPointsBonusId: string;
  activeUntil: string; // reward expiration date
  activeFrom: string; // claim date
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type AlphaFoxInviteRewardData = {
  telegramHandle: string;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type EndOfSeasonUrlData = {
  url: string;
};

export interface RewardClaim {
  id: string;
  rewardId: string;
  accountId: string;
  data: RewardClaimData;
}

export enum RewardClaimStatus {
  UNCLAIMED = 'UNCLAIMED',
  CLAIMED = 'CLAIMED',
}

export interface ThemeImage {
  lightModeUrl: string;
  darkModeUrl: string;
}

export interface ClaimRewardDto {
  data?: Record<string, string>;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SubscriptionSeasonReferralDetailState = {
  referralCode: string;
  totalReferees: number;
  referredByCode: string;
  referralPoints: number;
  lastFetched?: number;
};

// Serializable versions for state storage (Date objects converted to timestamps)
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SeasonRewardDtoState = {
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  shortUnlockedDescription: string;
  longUnlockedDescription: string;
  claimUrl?: string;
  iconName: string;
  rewardType: SeasonRewardType;
  isEndOfSeasonReward?: boolean;
  endOfSeasonName?: string;
  endOfSeasonShortDescription?: string;
  claimEndDate?: string;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SeasonTierDtoState = {
  id: string;
  name: string;
  pointsNeeded: number;
  image: {
    lightModeUrl: string;
    darkModeUrl: string;
  };
  levelNumber: string;
  rewards: SeasonRewardDtoState[];
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SeasonDtoState = {
  id: string;
  name: string;
  startDate: number; // timestamp
  endDate: number; // timestamp
  tiers: SeasonTierDtoState[];
  activityTypes: SeasonActivityTypeDto[];
  waysToEarn: SeasonWayToEarnDto[];
  lastFetched?: number;
  shouldInstallNewVersion?: string | undefined;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SeasonStatusBalanceDtoState = {
  total: number;
  updatedAt?: number; // timestamp
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SeasonTierState = {
  currentTier: SeasonTierDtoState | null;
  nextTier: SeasonTierDtoState | null;
  nextTierPointsNeeded: number | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SeasonStatusState = {
  season: SeasonDtoState;
  balance: SeasonStatusBalanceDtoState;
  tier: SeasonTierState;
  lastFetched?: number;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ActiveBoostsState = {
  boosts: {
    id: string;
    name: string;
    icon: {
      lightModeUrl: string;
      darkModeUrl: string;
    };
    boostBips: number;
    seasonLong: boolean;
    startDate?: string;
    endDate?: string;
    backgroundColor: string;
  }[];
  lastFetched: number;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type UnlockedRewardsState = {
  rewards: {
    id: string;
    seasonRewardId: string;
    claimStatus: RewardClaimStatus;
    claim?: {
      id: string;
      rewardId: string;
      accountId: string; // Changed from bigint to string for JSON serialization
      data: RewardClaimData;
    };
  }[];
  lastFetched: number;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OffDeviceSubscriptionAccountsState = {
  accounts: string[];
  lastFetched: number;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PointsEventsDtoState = {
  results: {
    id: string;
    timestamp: number;
    value: number;
    bonus: { bips?: number | null; bonuses?: string[] | null } | null;
    accountAddress: string | null;
    type: string;
    updatedAt: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any;
  }[];
  has_more: boolean;
  cursor: string | null;
  lastFetched: number;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RewardsAccountState = {
  account: CaipAccountId;
  hasOptedIn?: boolean;
  subscriptionId: string | null;
  perpsFeeDiscount: number | null;
  lastPerpsDiscountRateFetched: number | null;
  lastFreshOptInStatusCheck?: number | null;
};

/**
 * A single entry in the points estimate history.
 * Used by Customer Support to verify points estimates shown to users.
 * Structure is intentionally flat to simplify debugging and log analysis.
 */
export interface PointsEstimateHistoryEntry {
  /**
   * Timestamp when the estimate was made (milliseconds since epoch)
   */
  timestamp: number;

  /**
   * Type of point earning activity (from request)
   * @example 'SWAP'
   */
  requestActivityType: PointsEventEarnType;

  /**
   * Account address performing the activity in CAIP-10 format (from request)
   * @example 'eip155:1:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
   */
  requestAccount: CaipAccountId;

  /**
   * Source asset ID for swap activity in CAIP-19 format (if applicable)
   * @example 'eip155:1/slip44:60'
   */
  requestSwapSrcAssetId?: CaipAssetType;

  /**
   * Source asset amount for swap activity (if applicable)
   * @example '1000000000000000000'
   */
  requestSwapSrcAssetAmount?: string;

  /**
   * Source asset USD price for swap activity (if applicable)
   * @example '4512.34'
   */
  requestSwapSrcAssetUsdPrice?: string;

  /**
   * Destination asset ID for swap activity in CAIP-19 format (if applicable)
   * @example 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
   */
  requestSwapDestAssetId?: CaipAssetType;

  /**
   * Destination asset amount for swap activity (if applicable)
   * @example '4500000000'
   */
  requestSwapDestAssetAmount?: string;

  /**
   * Destination asset USD price for swap activity (if applicable)
   * @example '1.00'
   */
  requestSwapDestAssetUsdPrice?: string;

  /**
   * Fee asset ID for swap activity in CAIP-19 format (if applicable)
   * @example 'eip155:1/slip44:60'
   */
  requestSwapFeeAssetId?: CaipAssetType;

  /**
   * Fee asset amount for swap activity (if applicable)
   * @example '5000000000000000'
   */
  requestSwapFeeAssetAmount?: string;

  /**
   * Fee asset USD price for swap activity (if applicable)
   * @example '4512.34'
   */
  requestSwapFeeAssetUsdPrice?: string;

  /**
   * Type of PERPS action (if applicable)
   * @example 'OPEN_POSITION'
   */
  requestPerpsType?: EstimatePerpsContextDto['type'];

  /**
   * USD fee value for PERPS activity (if applicable)
   * @example '12.34'
   */
  requestPerpsUsdFeeValue?: string;

  /**
   * Asset symbol for PERPS activity (if applicable)
   * @example 'ETH'
   */
  requestPerpsCoin?: string;

  /**
   * Predict fee asset ID in CAIP-19 format (if applicable)
   * @example 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
   */
  requestPredictFeeAssetId?: CaipAssetType;

  /**
   * Predict fee asset amount (if applicable)
   * @example '1000000000000000000'
   */
  requestPredictFeeAssetAmount?: string;

  /**
   * Predict fee asset USD price (if applicable)
   * @example '4512.34'
   */
  requestPredictFeeAssetUsdPrice?: string;

  /**
   * Shield fee asset ID in CAIP-19 format (if applicable)
   * @example 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
   */
  requestShieldFeeAssetId?: CaipAssetType;

  /**
   * Shield fee asset amount (if applicable)
   * @example '1000000000000000000'
   */
  requestShieldFeeAssetAmount?: string;

  /**
   * Shield fee asset USD price (if applicable)
   * @example '4512.34'
   */
  requestShieldFeeAssetUsdPrice?: string;

  /**
   * Estimated points earnable for the activity (from response)
   * @example 100
   */
  responsePointsEstimate: number;

  /**
   * Bonus applied to the points estimate, in basis points (from response)
   * 100 = 1%
   * @example 200
   */
  responseBonusBips: number;
}

/**
 * Serialized version of PointsEstimateHistoryEntry for state storage.
 * Uses plain strings instead of branded CAIP types to satisfy StateConstraint (Json-serializable).
 * This is the type stored in RewardsControllerState.pointsEstimateHistory.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PointsEstimateHistoryEntryState = {
  /**
   * Timestamp when the estimate was made (milliseconds since epoch)
   */
  timestamp: number;

  /**
   * Type of point earning activity (from request)
   * @example 'SWAP'
   */
  requestActivityType: string;

  /**
   * Account address performing the activity in CAIP-10 format (stored as plain string)
   * @example 'eip155:1:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
   */
  requestAccount: string;

  /**
   * Source asset ID for swap activity in CAIP-19 format (stored as plain string)
   * @example 'eip155:1/slip44:60'
   */
  requestSwapSrcAssetId?: string;

  /**
   * Source asset amount for swap activity (if applicable)
   * @example '1000000000000000000'
   */
  requestSwapSrcAssetAmount?: string;

  /**
   * Source asset USD price for swap activity (if applicable)
   * @example '4512.34'
   */
  requestSwapSrcAssetUsdPrice?: string;

  /**
   * Destination asset ID for swap activity in CAIP-19 format (stored as plain string)
   * @example 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
   */
  requestSwapDestAssetId?: string;

  /**
   * Destination asset amount for swap activity (if applicable)
   * @example '4500000000'
   */
  requestSwapDestAssetAmount?: string;

  /**
   * Destination asset USD price for swap activity (if applicable)
   * @example '1.00'
   */
  requestSwapDestAssetUsdPrice?: string;

  /**
   * Fee asset ID for swap activity in CAIP-19 format (stored as plain string)
   * @example 'eip155:1/slip44:60'
   */
  requestSwapFeeAssetId?: string;

  /**
   * Fee asset amount for swap activity (if applicable)
   * @example '5000000000000000'
   */
  requestSwapFeeAssetAmount?: string;

  /**
   * Fee asset USD price for swap activity (if applicable)
   * @example '4512.34'
   */
  requestSwapFeeAssetUsdPrice?: string;

  /**
   * Type of PERPS action (stored as plain string)
   * @example 'OPEN_POSITION'
   */
  requestPerpsType?: string;

  /**
   * USD fee value for PERPS activity (if applicable)
   * @example '12.34'
   */
  requestPerpsUsdFeeValue?: string;

  /**
   * Asset symbol for PERPS activity (if applicable)
   * @example 'ETH'
   */
  requestPerpsCoin?: string;

  /**
   * Predict fee asset ID in CAIP-19 format (stored as plain string)
   * @example 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
   */
  requestPredictFeeAssetId?: string;

  /**
   * Predict fee asset amount (if applicable)
   * @example '1000000000000000000'
   */
  requestPredictFeeAssetAmount?: string;

  /**
   * Predict fee asset USD price (if applicable)
   * @example '4512.34'
   */
  requestPredictFeeAssetUsdPrice?: string;

  /**
   * Shield fee asset ID in CAIP-19 format (stored as plain string)
   * @example 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
   */
  requestShieldFeeAssetId?: string;

  /**
   * Shield fee asset amount (if applicable)
   * @example '1000000000000000000'
   */
  requestShieldFeeAssetAmount?: string;

  /**
   * Shield fee asset USD price (if applicable)
   * @example '4512.34'
   */
  requestShieldFeeAssetUsdPrice?: string;

  /**
   * Estimated points earnable for the activity (from response)
   * @example 100
   */
  responsePointsEstimate: number;

  /**
   * Bonus applied to the points estimate, in basis points (from response)
   * 100 = 1%
   * @example 200
   */
  responseBonusBips: number;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RewardsControllerState = {
  activeAccount: RewardsAccountState | null;
  accounts: { [account: CaipAccountId]: RewardsAccountState };
  subscriptions: { [subscriptionId: string]: SubscriptionDto };
  seasons: { [seasonId: string]: SeasonDtoState };
  subscriptionReferralDetails: {
    [compositeId: string]: SubscriptionSeasonReferralDetailState;
  };
  seasonStatuses: { [compositeId: string]: SeasonStatusState };
  activeBoosts: { [compositeId: string]: ActiveBoostsState };
  unlockedRewards: { [compositeId: string]: UnlockedRewardsState };
  pointsEvents: { [compositeId: string]: PointsEventsDtoState };
  offDeviceSubscriptionAccounts: {
    [subscriptionId: string]: OffDeviceSubscriptionAccountsState;
  };
  /** Campaign data keyed by 'REWARDS_CAMPAIGNS' */
  campaigns: { [key: string]: CampaignState };
  campaignParticipantStatus: {
    [compositeId: string]: CampaignParticipantStatusState;
  };
  /** Ondo campaign leaderboard data keyed by campaignId */
  ondoCampaignLeaderboard: { [campaignId: string]: CampaignLeaderboardState };
  /** Ondo campaign leaderboard position keyed by compositeId (subscriptionId:campaignId) */
  ondoCampaignLeaderboardPositions: {
    [compositeId: string]: CampaignLeaderboardPositionState;
  };
  /**
   * Ondo campaign portfolio keyed by compositeId (subscriptionId:campaignId).
   * Each value is a cached successful GET /portfolio/me response plus {@link OndoGmPortfolioState.lastFetched}.
   * Null API responses are not cached (unlike leaderboard position, which uses a not-found sentinel).
   */
  ondoCampaignPortfolio: {
    [compositeId: string]: OndoGmPortfolioState;
  };
  /**
   * Ondo campaign activity keyed by compositeId (subscriptionId:campaignId).
   * First-page results are cached for 1 minute; pagination pages are not cached.
   */
  ondoCampaignActivity: {
    [compositeId: string]: OndoGmActivityState;
  };
  /**
   * History of points estimates for Customer Support diagnostics.
   * Stores the last N successful estimates to verify user-reported discrepancies.
   * Array is ordered by timestamp (most recent first)
   * Uses PointsEstimateHistoryEntryState (plain strings) to satisfy StateConstraint.
   */
  pointsEstimateHistory: PointsEstimateHistoryEntryState[];
  /** Manually selected rewards API URL override; null means use the build default */
  rewardsEnvUrl: string | null;
};

/**
 * Event emitted when an account is linked to a subscription
 */
export interface RewardsControllerAccountLinkedEvent {
  type: 'RewardsController:accountLinked';
  payload: [
    {
      subscriptionId: string;
      account: CaipAccountId;
    },
  ];
}

/**
 * Event emitted when a reward is claimed
 */
export interface RewardsControllerRewardClaimedEvent {
  type: 'RewardsController:rewardClaimed';
  payload: [
    {
      rewardId: string;
      subscriptionId: string;
    },
  ];
}

/**
 * Event emitted when balance data should be invalidated
 */
export interface RewardsControllerBalanceUpdatedEvent {
  type: 'RewardsController:balanceUpdated';
  payload: [
    {
      seasonId: string;
      subscriptionId: string;
    },
  ];
}

/**
 * Event emitted when points events should be invalidated
 */
export interface RewardsControllerPointsEventsUpdatedEvent {
  type: 'RewardsController:pointsEventsUpdated';
  payload: [
    {
      seasonId: string;
      subscriptionId: string;
    },
  ];
}

/**
 * Event emitted when a user opts into a campaign, invalidating any cached
 * participant status so hooks can refetch fresh data.
 */
export interface RewardsControllerCampaignOptedInEvent {
  type: 'RewardsController:campaignOptedIn';
  payload: [
    {
      campaignId: string;
      subscriptionId: string;
    },
  ];
}

/**
 * Event emitted when a user opts into a campaign, invalidating the cached
 * leaderboard position so hooks can refetch fresh data.
 */
export interface RewardsControllerLeaderboardPositionInvalidatedEvent {
  type: 'RewardsController:leaderboardPositionInvalidated';
  payload: [
    {
      campaignId: string;
      subscriptionId: string;
    },
  ];
}

/**
 * Event emitted when a user opts into a campaign, invalidating the cached
 * portfolio so hooks can refetch fresh data.
 */
export interface RewardsControllerPortfolioPositionInvalidatedEvent {
  type: 'RewardsController:portfolioPositionInvalidated';
  payload: [
    {
      campaignId: string;
      subscriptionId: string;
    },
  ];
}

/**
 * Events that can be emitted by the RewardsController
 */
export type RewardsControllerEvents =
  | ControllerStateChangeEvent<'RewardsController', RewardsControllerState>
  | RewardsControllerAccountLinkedEvent
  | RewardsControllerRewardClaimedEvent
  | RewardsControllerBalanceUpdatedEvent
  | RewardsControllerPointsEventsUpdatedEvent
  | RewardsControllerCampaignOptedInEvent
  | RewardsControllerLeaderboardPositionInvalidatedEvent
  | RewardsControllerPortfolioPositionInvalidatedEvent;

/**
 * Patch type for state changes
 */
export interface Patch {
  op: 'replace' | 'add' | 'remove';
  path: string[];
  value?: unknown;
}

/**
 * Request for getting Perps discount
 */
export interface GetPerpsDiscountDto {
  /**
   * Account address in CAIP-10 format
   * @example 'eip155:1:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
   */
  account: CaipAccountId;
}

/**
 * Parsed response for Perps discount data
 */
export interface PerpsDiscountData {
  /**
   * Whether the account has opted in (0 = not opted in, 1 = opted in)
   */
  hasOptedIn: boolean;
  /**
   * The discount percentage in basis points
   * @example 550
   */
  discountBips: number;
}

/**
 * Geo rewards metadata containing location and support info
 */
export interface GeoRewardsMetadata {
  /**
   * The geographic location string (e.g., 'US', 'CA-ON', 'FR')
   */
  geoLocation: string;
  /**
   * Whether the location is allowed for opt-in
   */
  optinAllowedForGeo: boolean;
}

/**
 * Response DTO for the client version requirements endpoint.
 */
export interface ClientVersionRequirementDto {
  minimumMobileVersion?: string;
  minimumExtensionVersion?: string;
}

/**
 * The action which can be used to retrieve the state of the RewardsController.
 */
export type RewardsControllerGetStateAction = ControllerGetStateAction<
  'RewardsController',
  RewardsControllerState
>;

/**
 * Actions that can be performed by the RewardsController
 */
export type RewardsControllerActions =
  | RewardsControllerGetStateAction
  | RewardsControllerMethodActions;

/**
 * Input DTO for getting opt-in status of multiple addresses
 */
export interface OptInStatusInputDto {
  /**
   * The addresses to check opt-in status for
   * @example [
   *   '0xDE37C32E8dbD1CD325B8023a00550a5beA97eF13',
   *   '0xDE37C32E8dbD1CD325B8023a00550a5beA97eF14',
   *   '0xDE37C32E8dbD1CD325B8023a00550a5beA97eF15'
   * ]
   */
  addresses: string[];
}

/**
 * Response DTO for opt-in status of multiple addresses
 */
export interface OptInStatusDto {
  /**
   * The opt-in status of the addresses in the same order as the input
   * @example [true, true, false]
   */
  ois: boolean[];

  /**
   * The subscription IDs of the addresses in the same order as the input
   * @example ['sub_123', 'sub_456', null]
   */
  sids: (string | null)[];
}

/**
 * Response DTO for opt-out operation
 */
export interface OptOutDto {
  /**
   * Whether the opt-out operation was successful
   * @example true
   */
  success: boolean;
}

/**
 * Season info for discover seasons endpoint
 */
export interface SeasonInfoDto {
  /**
   * The ID of the season
   * @example '7444682d-9050-43b8-9038-28a6a62d6264'
   */
  id: string;

  /**
   * The start date of the season
   * @example '2025-09-01T04:00:00.000Z'
   */
  startDate: Date;

  /**
   * The end date of the season
   * @example '2025-11-30T04:00:00.000Z'
   */
  endDate: Date;
}

/**
 * Response DTO for discover seasons endpoint
 */
export interface DiscoverSeasonsDto {
  /**
   * Previous season information
   */
  previous: SeasonInfoDto | null;

  /**
   * Current season information
   */
  current: SeasonInfoDto | null;

  /**
   * Next season information
   */
  next: SeasonInfoDto | null;
}

/**
 * Response DTO for season metadata endpoint
 */
export interface SeasonMetadataDto {
  /**
   * The ID of the season
   * @example '7444682d-9050-43b8-9038-28a6a62d6264'
   */
  id: string;

  /**
   * The name of the season
   * @example 'Season 1'
   */
  name: string;

  /**
   * The start date of the season
   * @example '2025-09-01T04:00:00.000Z'
   */
  startDate: Date;

  /**
   * The end date of the season
   * @example '2025-11-30T04:00:00.000Z'
   */
  endDate: Date;

  /**
   * The tiers for the season
   */
  tiers: SeasonTierDto[];

  /**
   * Activity types for the season
   */
  activityTypes: SeasonActivityTypeDto[];

  /**
   * Ways to earn for the season
   */
  waysToEarn: SeasonWayToEarnDto[];

  /**
   * Optional version requirements for mobile and extension
   */
  shouldInstallNewVersion?: {
    mobile: string | undefined;
    extension: string | undefined;
  };
}

/**
 * Response DTO for season state endpoint (new getSeasonStatus)
 */
export interface SeasonStateDto {
  /**
   * The balance for the season
   * @example 0
   */
  balance: number;

  /**
   * The current tier ID
   * @example '555260e8-d88b-4196-adb1-0844807bddc3'
   */
  currentTierId: string;

  /**
   * When the season state was last updated
   * @example '2025-10-21T16:45:50.732Z'
   */
  updatedAt: Date;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SeasonWayToEarnButtonActionDto = {
  /**
   * Route for in-app navigation
   * @example { root: 'RewardsView', screen: 'RewardsReferralView' }
   */
  route?: {
    root: string;
    screen: string;
  };

  /**
   * Deep link URL
   * @example 'metamask://swap'
   */
  deeplink?: string;

  /**
   * External URL
   * @example 'https://metamask.io'
   */
  url?: string;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SeasonWayToEarnSpecificSwapDto = {
  /**
   * Title for the supported networks section
   * @example 'Supported Networks'
   */
  supportedNetworksTitle: string;

  /**
   * List of supported networks
   * @example [{ chainId: '1', name: 'Ethereum', boost: '2x' }]
   */
  supportedNetworks: { chainId: string; name: string; boost?: string }[];
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SeasonWayToEarnSpecificReferralDto = {
  /**
   * Title for the referral points section
   * @example 'Referral Points'
   */
  referralPointsTitle: string;

  /**
   * Title for the total referrals section
   * @example 'Total Referrals'
   */
  totalReferralsTitle: string;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SeasonWayToEarnDto = {
  /**
   * The unique identifier of the way to earn
   * @example '123e4567-e89b-12d3-a456-426614174000'
   */
  id: string;

  /**
   * The activity type
   * @example 'SWAP'
   */
  type: string;

  /**
   * The name of the activity type
   * @example 'Swap'
   */
  title: string;

  /**
   * The icon for the activity type
   * @example 'Rocket'
   */
  icon: string;

  /**
   * Short description of the way to earn
   * @example 'Earn points by swapping tokens'
   */
  shortDescription: string;

  /**
   * Title for the bottom sheet
   * @example 'How to earn points'
   */
  bottomSheetTitle: string;

  /**
   * Rule for earning points
   * @example '1 point per $1 swapped'
   */
  pointsEarningRule: string;

  /**
   * Detailed description
   * @example 'Swap tokens on any supported network to earn points'
   */
  description: string;

  /**
   * Label for the action button
   * @example 'Start Swapping'
   */
  buttonLabel: string;

  /**
   * Button action configuration
   */
  buttonAction?: SeasonWayToEarnButtonActionDto;

  /**
   * Specific content for swap or referral ways to earn
   */
  specificContent?:
    | SeasonWayToEarnSpecificSwapDto
    | SeasonWayToEarnSpecificReferralDto;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SeasonActivityTypeDto = {
  /**
   * The unique identifier of the activity type
   * @example '123e4567-e89b-12d3-a456-426614174000'
   */
  id: string;

  /**
   * The activity type
   * @example 'SWAP'
   */
  type: string;

  /**
   * The name of the activity type
   * @example 'Swap'
   */
  title: string;

  /**
   * The icon for the activity type
   * @example 'Rocket'
   */
  icon: string;
};
