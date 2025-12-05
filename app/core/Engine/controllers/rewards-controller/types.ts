import {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import { CaipAccountId, CaipAssetType } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';

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
  | 'ONE_TIME_BONUS';

export interface GetPointsEventsDto {
  seasonId: string;
  subscriptionId: string;
  cursor: string | null;
  forceFresh?: boolean;
}

export interface GetPointsEventsLastUpdatedDto {
  seasonId: string;
  subscriptionId: string;
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
}

export enum SeasonRewardType {
  GENERIC = 'GENERIC',
  PERPS_DISCOUNT = 'PERPS_DISCOUNT',
  POINTS_BOOST = 'POINTS_BOOST',
  ALPHA_FOX_INVITE = 'ALPHA_FOX_INVITE',
}

export interface SeasonDto {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  tiers: SeasonTierDto[];
  activityTypes: SeasonActivityTypeDto[];
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
  currentTier: SeasonTierDtoState;
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
 * Events that can be emitted by the RewardsController
 */
export type RewardsControllerEvents =
  | ControllerStateChangeEvent<'RewardsController', RewardsControllerState>
  | RewardsControllerAccountLinkedEvent
  | RewardsControllerRewardClaimedEvent
  | RewardsControllerBalanceUpdatedEvent
  | RewardsControllerPointsEventsUpdatedEvent;

/**
 * Patch type for state changes
 */
export interface Patch {
  op: 'replace' | 'add' | 'remove';
  path: string[];
  value?: unknown;
}

/**
 * Action for updating state with opt-in response
 */
export interface RewardsControllerOptInAction {
  type: 'RewardsController:optIn';
  handler: (
    accounts: InternalAccount[],
    referralCode?: string,
  ) => Promise<string | null>;
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
 * Action for getting whether the account (caip-10 format) has opted in
 */
export interface RewardsControllerGetHasAccountOptedInAction {
  type: 'RewardsController:getHasAccountOptedIn';
  handler: (account: CaipAccountId) => Promise<boolean>;
}

/**
 * Action for getting opt-in status of multiple addresses with feature flag check
 */
export interface RewardsControllerGetOptInStatusAction {
  type: 'RewardsController:getOptInStatus';
  handler: (params: OptInStatusInputDto) => Promise<OptInStatusDto>;
}

/**
 * Action for getting points events for a given season
 */
export interface RewardsControllerGetPointsEventsAction {
  type: 'RewardsController:getPointsEvents';
  handler: (params: GetPointsEventsDto) => Promise<PaginatedPointsEventsDto>;
}

/**
 * Action for estimating points for a given activity
 */
export interface RewardsControllerEstimatePointsAction {
  type: 'RewardsController:estimatePoints';
  handler: (request: EstimatePointsDto) => Promise<EstimatedPointsDto>;
}

/**
 * Action for getting perps fee discount in bips for an account
 */
export interface RewardsControllerGetPerpsDiscountAction {
  type: 'RewardsController:getPerpsDiscountForAccount';
  handler: (account: CaipAccountId) => Promise<number>;
}

/**
 * Action for checking if rewards feature is enabled via feature flag
 */
export interface RewardsControllerIsRewardsFeatureEnabledAction {
  type: 'RewardsController:isRewardsFeatureEnabled';
  handler: () => boolean;
}

/**
 * Action for checking if there is an active season
 */
export interface RewardsControllerHasActiveSeasonAction {
  type: 'RewardsController:hasActiveSeason';
  handler: () => Promise<boolean>;
}

/**
 * Action for getting season metadata with caching
 */
export interface RewardsControllerGetSeasonMetadataAction {
  type: 'RewardsController:getSeasonMetadata';
  handler: (type?: 'current' | 'previous') => Promise<SeasonDtoState | null>;
}

/**
 * Action for getting season status with caching
 */
export interface RewardsControllerGetSeasonStatusAction {
  type: 'RewardsController:getSeasonStatus';
  handler: (
    subscriptionId: string,
    seasonId: string,
  ) => Promise<SeasonStatusState | null>;
}

/**
 * Action for getting referral details with caching
 */
export interface RewardsControllerGetReferralDetailsAction {
  type: 'RewardsController:getReferralDetails';
  handler: (
    subscriptionId: string,
    seasonId: string,
  ) => Promise<SubscriptionSeasonReferralDetailState | null>;
}

/**
 * Action for logging out a user
 */
export interface RewardsControllerLogoutAction {
  type: 'RewardsController:logout';
  handler: () => Promise<void>;
}

/**
 * Action for getting geo rewards metadata
 */
export interface RewardsControllerGetGeoRewardsMetadataAction {
  type: 'RewardsController:getGeoRewardsMetadata';
  handler: () => Promise<GeoRewardsMetadata>;
}

/**
 * Action for validating referral codes
 */
export interface RewardsControllerValidateReferralCodeAction {
  type: 'RewardsController:validateReferralCode';
  handler: (code: string) => Promise<boolean>;
}

/**
 * Action for checking if an account supports opt-in
 */
export interface RewardsControllerIsOptInSupportedAction {
  type: 'RewardsController:isOptInSupported';
  handler: (account: InternalAccount) => boolean;
}

/**
 * Action for getting the actual subscription ID for a CAIP account ID
 */
export interface RewardsControllerGetActualSubscriptionIdAction {
  type: 'RewardsController:getActualSubscriptionId';
  handler: (account: CaipAccountId) => string | null;
}

/**
 * Action for getting the first subscription ID from the subscriptions map
 */
export interface RewardsControllerGetFirstSubscriptionIdAction {
  type: 'RewardsController:getFirstSubscriptionId';
  handler: () => string | null;
}

/**
 * Action for linking an account to a subscription
 */
export interface RewardsControllerLinkAccountToSubscriptionAction {
  type: 'RewardsController:linkAccountToSubscriptionCandidate';
  handler: (account: InternalAccount) => Promise<boolean>;
}

/**
 * Action for linking multiple accounts to a subscription candidate
 */
export interface RewardsControllerLinkAccountsToSubscriptionCandidateAction {
  type: 'RewardsController:linkAccountsToSubscriptionCandidate';
  handler: (
    accounts: InternalAccount[],
  ) => Promise<{ account: InternalAccount; success: boolean }[]>;
}

/**
 * Action for getting candidate subscription ID
 */
export interface RewardsControllerGetCandidateSubscriptionIdAction {
  type: 'RewardsController:getCandidateSubscriptionId';
  handler: () => Promise<string | null>;
}

/**
 * Action for opting out of rewards program
 */
export interface RewardsControllerOptOutAction {
  type: 'RewardsController:optOut';
  handler: (subscriptionId: string) => Promise<boolean>;
}

/**
 * Action for getting active points boosts
 */
export interface RewardsControllerGetActivePointsBoostsAction {
  type: 'RewardsController:getActivePointsBoosts';
  handler: (
    seasonId: string,
    subscriptionId: string,
  ) => Promise<PointsBoostDto[]>;
}

/**
 * Action for getting unlocked rewards for a season
 */
export interface RewardsControllerGetUnlockedRewardsAction {
  type: 'RewardsController:getUnlockedRewards';
  handler: (seasonId: string, subscriptionId: string) => Promise<RewardDto[]>;
}

/**
 * Action for claiming a reward
 */
export interface RewardsControllerClaimRewardAction {
  type: 'RewardsController:claimReward';
  handler: (
    rewardId: string,
    subscriptionId: string,
    dto?: ClaimRewardDto,
  ) => Promise<void>;
}

/**
 * Action for resetting controller state
 */
export interface RewardsControllerResetAllAction {
  type: 'RewardsController:resetAll';
  handler: () => Promise<void>;
}

/**
 * Actions that can be performed by the RewardsController
 */
export type RewardsControllerActions =
  | ControllerGetStateAction<'RewardsController', RewardsControllerState>
  | RewardsControllerGetHasAccountOptedInAction
  | RewardsControllerGetOptInStatusAction
  | RewardsControllerGetPointsEventsAction
  | RewardsControllerEstimatePointsAction
  | RewardsControllerGetPerpsDiscountAction
  | RewardsControllerIsRewardsFeatureEnabledAction
  | RewardsControllerHasActiveSeasonAction
  | RewardsControllerGetSeasonMetadataAction
  | RewardsControllerGetSeasonStatusAction
  | RewardsControllerGetReferralDetailsAction
  | RewardsControllerOptInAction
  | RewardsControllerLogoutAction
  | RewardsControllerGetGeoRewardsMetadataAction
  | RewardsControllerValidateReferralCodeAction
  | RewardsControllerIsOptInSupportedAction
  | RewardsControllerGetActualSubscriptionIdAction
  | RewardsControllerGetFirstSubscriptionIdAction
  | RewardsControllerLinkAccountToSubscriptionAction
  | RewardsControllerLinkAccountsToSubscriptionCandidateAction
  | RewardsControllerGetCandidateSubscriptionIdAction
  | RewardsControllerOptOutAction
  | RewardsControllerGetActivePointsBoostsAction
  | RewardsControllerGetUnlockedRewardsAction
  | RewardsControllerClaimRewardAction
  | RewardsControllerResetAllAction;

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
export type SeasonActivityTypeDto = {
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
   * The description of the activity type
   * @example 'Stake your M$D to earn points'
   */
  description: string;

  /**
   * The icon for the activity type
   * @example 'Rocket'
   */
  icon: string;
};
