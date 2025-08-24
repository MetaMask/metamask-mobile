import type { RewardsControllerMessengerActions } from '../../messengers/rewards-controller-messenger/types';

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
  startDate: string;
  endDate: string;
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

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RewardsControllerState = {
  lastAuthenticatedAccount: string | null;
  lastAuthTime: number;
  subscription: SubscriptionDto | null;
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
 * Actions that can be performed by the RewardsController
 */
export type RewardsControllerActions = RewardsControllerMessengerActions;
