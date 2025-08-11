import { ControllerGetStateAction } from '@metamask/base-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';

export interface LoginResponseDto {
  sessionId: string;
  subscription: SubscriptionDto;
}

export interface SubscriptionDto {
  id: string;
  referralCode: string;
  accounts: {
    address: string;
    chainId: number;
  }[];
  [key: string]: string | { address: string; chainId: number }[];
}

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

export interface JoinSubscriptionDto {
  challengeId: string;
  signature: string;
}

export interface DevOnlyLoginDto {
  address: string;
}

export interface PointsEventDto {
  id: string;
  timestamp: string;
  type: string;
  payload?: SwapEventPayloadDto | BridgeEventPayloadDto;
  value?: number;
  accountAddress?: `0x${string}`;
  accountId?: string;
  subscriptionId?: string;
}

export interface ValueTransferDto {
  contractAddress?: string;
  decimal?: number;
  amount: string;
  name?: string;
  symbol?: string;
  iconUrl?: string;
}
export interface SwapEventPayloadDto extends BaseOnChainEventPayloadDto {
  toToken?: ValueTransferDto;
}

export interface BaseOnChainEventPayloadDto {
  chainId: number;
  txHash: string;
  fromToken: ValueTransferDto;
}

export interface BridgeEventPayloadDto extends BaseOnChainEventPayloadDto {
  destChainId: number;
  toToken: ValueTransferDto;
}

export interface CursorPaginatedResultsDto<T> {
  results: T[];
  cursor?: string;
  has_more: boolean;
  total_results?: number;
}

export interface AccountLifeTimeSpendDto {
  tier: string;
  pointsMultiplier: number;
}

export interface SeasonTierDto {
  id: string;
  type: string;
  pointsNeeded: number;
  seasonId: string;
}

export interface SeasonDto {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  tiers: SeasonTierDto[];
}

export interface SeasonStatusDto {
  season: SeasonDto;
  balance: SeasonStatusBalanceDto;
  currentTierId: string;
}

export interface SeasonStatusBalanceDto {
  total: number;
  refereePortion: number;
  updatedAt: Date;
}

export interface SeasonRewardCatalogDto {
  id: string;
  seasonTierId: string;
  seasonTierType: string;
  name: string;
  description: string;
  imageUri: string;
  animationUri?: string;
  rewardType: SeasonRewardType;
  unlockType: UnlockType;
}

export interface SeasonRewardsCatalogDto {
  seasonId: string;
  seasonName: string;
  seasonRewards: SeasonRewardCatalogDto[];
}

export enum SeasonRewardType {
  TOKEN_ALLOCATION_CLAIM = 'TOKEN_ALLOCATION_CLAIM',
  ITEM_VOUCHER = 'ITEM_VOUCHER',
  POINTS_BONUS = 'POINTS_BONUS',
}

export enum UnlockType {
  IMMEDIATE = 'IMMEDIATE',
  SEASON_ENDS = 'SEASON_ENDS',
}

export interface SubscriptionReferralDetailsDto {
  referralCode: string;
  totalReferees: number;
}

export interface RewardDto {
  id: string;
  seasonRewardId: string;
  claimStatus: RewardClaimStatus;
  claim?: RewardClaim;
  createdAt: string;
}

export interface RewardClaim {
  id: string;
  rewardId: string;
  accountId: bigint;
  createdAt: Date;
  data: PointsBonusRewardData | null;
}

export interface ClaimRewardDto {
  address: string;
}

export interface PointsBonusRewardData {
  seasonPointsBonusId: string;
  activeUntil: string; // reward expiration date
  activeFrom: string; // claim date
}

export enum RewardClaimStatus {
  UNCLAIMED = 'UNCLAIMED',
  CLAIMED = 'CLAIMED',
  CLAIM_IN_PROGRESS = 'CLAIM_IN_PROGRESS',
  CLAIM_FAILED = 'CLAIM_FAILED',
}

export interface EstimateAssetDto {
  /**
   * Asset identifier in CAIP-19 format
   * @example 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
   */
  id: string;
  /**
   * Amount of the asset as a string
   * @example '25739959426'
   */
  amount: string;
  /**
   * Asset price in USD. Using ETH as an example, 4493.23 at the time of writing. If provided, this will be used instead of doing a network call to get the current price.
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
export type PointsEventEarnType = 'SWAP' | 'PERPS';

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
  account: string;

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

export interface SeasonTierDto {
  id: string;
  name: string;
  // Add other tier properties as needed
}

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
  updatedAt: Date;
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
export type RewardsControllerState = {
  lastAuthenticatedAccount: string | null;
  lastAuthTime: number;
  subscription: SubscriptionDto | null;
};

/**
 * Event emitted when silent authentication succeeds or fails
 */
export interface RewardsControllerSelectedAccountAuthChangeEvent {
  type: 'RewardsController:selectedAccountAuthChange';
  payload: [
    { account: InternalAccount; subscriptionId: string | null; error: boolean },
  ];
}

/**
 * Events that can be emitted by the RewardsController
 */
export type RewardsControllerEvents =
  | {
      type: 'RewardsController:stateChange';
      payload: [RewardsControllerState, Patch[]];
    }
  | RewardsControllerSelectedAccountAuthChangeEvent;

/**
 * Patch type for state changes
 */
export interface Patch {
  op: 'replace' | 'add' | 'remove';
  path: string[];
  value?: unknown;
}

/**
 * Response type for getting last authenticated account info
 */
export interface LastAuthenticatedAccountDto {
  /**
   * The last authenticated account address
   */
  address: string | null;
  /**
   * The subscription ID for the last authenticated account, null if not authenticated
   */
  subscriptionId: string | null;
  /**
   * The timestamp of the last authentication
   */
  lastAuthTime: number;
}

/**
 * Action for getting last authenticated account info
 */
export interface RewardsControllerGetLastAuthenticatedAccountAction {
  type: 'RewardsController:getLastAuthenticatedAccount';
  handler: () => Promise<LastAuthenticatedAccountDto>;
}

/**
 * Request for getting Perps discount
 */
export interface GetPerpsDiscountDto {
  /**
   * Account address in CAIP-10 format
   * @example 'eip155:1:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
   */
  address: string;
}

/**
 * Actions that can be performed by the RewardsController
 */
export type RewardsControllerActions =
  | ControllerGetStateAction<'RewardsController', RewardsControllerState>
  | RewardsControllerGetLastAuthenticatedAccountAction;
