import { ControllerGetStateAction } from '@metamask/base-controller';
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

export interface GenerateChallengeDto {
  address: string;
}

export interface ChallengeResponseDto {
  id: string;
  message: string;
  domain?: string;
  address?: string;
  issuedAt?: string;
  expirationTime?: string;
  nonce?: string;
}

export interface LoginDto {
  challengeId: string;
  signature: string;
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

export interface EstimatePointsContextDto {
  /**
   * Swap context data, must be present for SWAP activity
   */
  swapContext?: EstimateSwapContextDto;

  /**
   * PERPS context data, must be present for PERPS activity
   */
  perpsContext?: EstimatePerpsContextDto;
}

/**
 * Type of point earning activity. Swap is for swaps and bridges. PERPS is for perps activities.
 * @example 'SWAP'
 */
export type PointsEventEarnType =
  | 'SWAP'
  | 'PERPS'
  | 'REFERRAL'
  | 'SIGN_UP_BONUS'
  | 'LOYALTY_BONUS'
  | 'ONE_TIME_BONUS';

export interface GetPointsEventsDto {
  seasonId: string;
  subscriptionId: string;
  cursor: string | null;
}

/**
 * Paginated list of points events
 */
export interface PaginatedPointsEventsDto {
  has_more: boolean;
  cursor: string | null;
  total_results: number;
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

  /**
   * Icon URL of the token
   * @example 'https://example.com/icon.png'
   */
  iconUrl?: string;
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
  bonus?: {
    bips?: number | null;
    bonuses?: string[] | null;
  } | null;

  /**
   * Account address of the point earning activity
   * @example '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
   */
  accountAddress: string | null;
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
        type: 'REFERRAL' | 'SIGN_UP_BONUS' | 'LOYALTY_BONUS' | 'ONE_TIME_BONUS';
        payload: null;
      }
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
  // Add other tier properties as needed
};

export interface SeasonDto {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  tiers: SeasonTierDto[];
}

export interface SeasonStatusBalanceDto {
  total: number;
  refereePortion: number;
  updatedAt?: Date;
}

export interface SeasonStatusDto {
  season: SeasonDto;
  balance: SeasonStatusBalanceDto;
  currentTierId: string;
}

export interface SubscriptionReferralDetailsDto {
  referralCode: string;
  totalReferees: number;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SubscriptionReferralDetailsState = {
  referralCode: string;
  totalReferees: number;
  lastFetched?: number;
};

// Serializable versions for state storage (Date objects converted to timestamps)
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SeasonDtoState = {
  id: string;
  name: string;
  startDate: number; // timestamp
  endDate: number; // timestamp
  tiers: SeasonTierDto[];
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SeasonStatusBalanceDtoState = {
  total: number;
  refereePortion: number;
  updatedAt?: number; // timestamp
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SeasonTierState = {
  currentTier: SeasonTierDto;
  nextTier: SeasonTierDto | null;
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
export type RewardsAccountState = {
  account: CaipAccountId;
  hasOptedIn?: boolean;
  subscriptionId: string | null;
  lastCheckedAuth: number;
  lastCheckedAuthError: boolean;
  perpsFeeDiscount: number | null;
  lastPerpsDiscountRateFetched: number | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RewardsControllerState = {
  activeAccount: RewardsAccountState | null;
  accounts: { [account: CaipAccountId]: RewardsAccountState };
  subscriptions: { [subscriptionId: string]: SubscriptionDto };
  seasons: { [seasonId: string]: SeasonDtoState };
  subscriptionReferralDetails: {
    [subscriptionId: string]: SubscriptionReferralDetailsState;
  };
  seasonStatuses: { [compositeId: string]: SeasonStatusState };
};

/**
 * Events that can be emitted by the RewardsController
 */
export interface RewardsControllerEvents {
  type: 'RewardsController:stateChange';
  payload: [RewardsControllerState, Patch[]];
}

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
  handler: (account: InternalAccount, referralCode?: string) => Promise<void>;
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
   * The discount percentage as a number
   * @example 5.5
   */
  discount: number;
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
 * Action for getting perps fee discount for an account
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
 * Action for getting season status with caching
 */
export interface RewardsControllerGetSeasonStatusAction {
  type: 'RewardsController:getSeasonStatus';
  handler: (
    seasonId: string,
    subscriptionId: string,
  ) => Promise<SeasonStatusState | null>;
}

/**
 * Action for getting referral details with caching
 */
export interface RewardsControllerGetReferralDetailsAction {
  type: 'RewardsController:getReferralDetails';
  handler: (
    subscriptionId: string,
  ) => Promise<SubscriptionReferralDetailsState | null>;
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
 * Actions that can be performed by the RewardsController
 */
export type RewardsControllerActions =
  | ControllerGetStateAction<'RewardsController', RewardsControllerState>
  | RewardsControllerGetHasAccountOptedInAction
  | RewardsControllerGetPointsEventsAction
  | RewardsControllerEstimatePointsAction
  | RewardsControllerGetPerpsDiscountAction
  | RewardsControllerIsRewardsFeatureEnabledAction
  | RewardsControllerGetSeasonStatusAction
  | RewardsControllerGetReferralDetailsAction
  | RewardsControllerOptInAction
  | RewardsControllerLogoutAction
  | RewardsControllerGetGeoRewardsMetadataAction
  | RewardsControllerValidateReferralCodeAction;
